// loggingEngine.js — thin wrapper around engine.js that adds GameLogger
// calls, undo/redo snapshotting, and multiplayer broadcast, without
// touching engine.js itself.
//
// Every exported function here has the exact same name and signature as
// its engine.js counterpart. Callers only need to change their import path
// from './engine.js' (or '../gameboard/engine.js') to this file — no
// call-site logic changes required.

import * as engine from './engine.js';
import { gameState, runtimeState, DEFAULT_CARDBACK } from './state.js';
import {
  classifyType,
  SHARED_ZONE_LABELS,
  OWNED_ZONE_SUFFIX_LABELS,
} from '../../utils.js';
import { GameLogger } from '../../sidebar/chat/chatlog.js';
import { pushSnapshot } from './undoManager.js';
import { emitStateChanged } from './network/stateChangeBus.js';
import { emitLogChanged } from './network/logChangeBus.js';
import { parseDeckCSV } from './parser.js';

export { undo, redo, canUndo, canRedo } from './undoManager.js';

// ---------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------

// Logs an action, always attributed to the local acting viewer
// (runtimeState.mySlot) — NOT derived from the zone a card happens to be
// in. A card's zone changes as it moves; the actor performing the click
// doesn't. Attributing by zone caused moves into/out of the opponent's
// zone to flip-flop between Player/Opponent on successive moves of the
// same card — this fixes that. Matches the client-authoritative model:
// a client only ever logs its own actions.
function logAction(actionText) {
  GameLogger.logAction(runtimeState.mySlot, actionText);
  emitLogChanged(actionText);
}

function zoneLabel(zoneId) {
  if (zoneId.endsWith('table-half')) return `Board`;
  if (zoneId.startsWith('p1-') || zoneId.startsWith('p2-')) {
    const slot = zoneId.slice(0, 2);
    const suffix = zoneId.slice(3);
    const base = OWNED_ZONE_SUFFIX_LABELS[suffix] || suffix;
    return slot === runtimeState.mySlot ? base : `Opponent's ${base}`;
  }
  return SHARED_ZONE_LABELS[zoneId] || zoneId;
}

function findCard(zoneId, instanceId) {
  return (
    gameState.zones[zoneId]?.find((c) => c.instanceId === instanceId) || null
  );
}

// ---------------------------------------------------------------------
// Common mutation lifecycle
//
// Normal mutations all follow the same sequence:
//
//   1. Validate that the mutation is applicable.
//   2. Flush any pending delta batch.
//   3. Snapshot the pre-mutation state.
//   4. Execute the engine mutation.
//   5. Log the successful mutation.
//   6. Broadcast the resulting state.
//
// The individual wrappers only need to provide the operation-specific
// validation, engine call, and log message.
// ---------------------------------------------------------------------

function mutate({ validate = () => true, mutation, log }) {
  if (!validate()) return null;

  flushPendingBatch();
  pushSnapshot();

  const result = mutation();

  if (result) {
    log?.(result);
    emitStateChanged();
  }

  return result;
}

// ---------------------------------------------------------------------
// Damage / overheal / counter deltas — batched.
//
// Consecutive clicks on the SAME stat of the SAME card accumulate into
// one pending entry, which is also one undo step: pushSnapshot() fires
// once, when the batch STARTS (before that first mutation), not on every
// click that extends it.
//
// The batch flushes (logs + clears) via a short timer after the last
// click. Broadcasting remains unbatched so the opponent sees every
// individual delta live.
// ---------------------------------------------------------------------

const BATCH_FLUSH_DELAY_MS = 600;

let pendingBatch = null;
let pendingBatchTimer = null;

function formatDamageValue(value) {
  if (value > 0) return `${value} damage`;
  if (value < 0) return `${Math.abs(value)} overheal`;
  return '0 damage';
}

function flushPendingBatch() {
  if (pendingBatchTimer) {
    clearTimeout(pendingBatchTimer);
    pendingBatchTimer = null;
  }
  if (!pendingBatch) return;
  const { cardName, statLabel, netDelta, finalValue } = pendingBatch;
  const sign = netDelta > 0 ? '+' : '';
  const finalText =
    statLabel === 'damage' ? formatDamageValue(finalValue) : `${finalValue}`;
  logAction(
    `changed ${statLabel} on ${cardName} by ${sign}${netDelta} (now ${finalText}).`
  );
  pendingBatch = null;
}

function scheduleBatchFlush() {
  if (pendingBatchTimer) clearTimeout(pendingBatchTimer);
  pendingBatchTimer = setTimeout(() => {
    pendingBatchTimer = null;
    flushPendingBatch();
  }, BATCH_FLUSH_DELAY_MS);
}

function applyDelta(statLabel, engineFn, instanceId, zone, delta) {
  const before = findCard(zone, instanceId);
  if (!before) return null;

  const key = `${instanceId}:${statLabel}`;
  const isNewBatch = !(pendingBatch && pendingBatch.key === key);

  // Must be decided BEFORE the mutation below — pushSnapshot() has to
  // fire pre-mutation, and whether this is a new batch is exactly what
  // determines whether a snapshot is needed at all.
  if (isNewBatch) {
    flushPendingBatch();
    pushSnapshot();
  }

  const card = engineFn(instanceId, zone, delta);
  if (!card) return card;

  const finalValue = statLabel === 'damage' ? card.damage : card.counter;

  if (isNewBatch) {
    pendingBatch = {
      key,
      zone,
      cardName: card.name,
      statLabel,
      netDelta: delta,
      finalValue,
    };
  } else {
    pendingBatch.netDelta += delta;
    pendingBatch.finalValue = finalValue;
  }

  scheduleBatchFlush();

  // Every individual delta is broadcast immediately.
  emitStateChanged();

  return card;
}

export function applyDamageDelta(instanceId, zone, delta) {
  return applyDelta('damage', engine.applyDamageDelta, instanceId, zone, delta);
}

export function applyCounterDelta(instanceId, zone, delta) {
  return applyDelta(
    'counter',
    engine.applyCounterDelta,
    instanceId,
    zone,
    delta
  );
}

// ---------------------------------------------------------------------
// Normal mutations
// ---------------------------------------------------------------------

export function moveCardToZone(instanceId, fromZone, toZone, position = 'top') {
  return mutate({
    validate: () => findCard(fromZone, instanceId),
    mutation: () =>
      engine.moveCardToZone(instanceId, fromZone, toZone, position),
    log: (card) =>
      logAction(
        `moved ${card.name} from ${zoneLabel(fromZone)} to ${zoneLabel(toZone)}.`
      ),
  });
}

export function moveToTopOfDeck(instanceId, fromZone, toZone) {
  return mutate({
    validate: () => findCard(fromZone, instanceId),
    mutation: () => engine.moveToTopOfDeck(instanceId, fromZone, toZone),
    log: (card) =>
      logAction(
        `put ${card.name} on top of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
      ),
  });
}

export function moveToBottomOfDeck(instanceId, fromZone, toZone) {
  return mutate({
    validate: () => findCard(fromZone, instanceId),
    mutation: () => engine.moveToBottomOfDeck(instanceId, fromZone, toZone),
    log: (card) =>
      logAction(
        `put ${card.name} on the bottom of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
      ),
  });
}

export function drawTopCard(fromZone, toZone) {
  return mutate({
    validate: () => !!gameState.zones[fromZone]?.length,
    mutation: () => engine.drawTopCard(fromZone, toZone),
    log: (card) => logAction(`drew ${card.name}.`),
  });
}

export function drawCards(fromZone, toZone, count) {
  const before = gameState.zones[toZone]?.length ?? 0;

  return mutate({
    validate: () => !!gameState.zones[fromZone]?.length,
    mutation: () => {
      engine.drawCards(fromZone, toZone, count);

      const actualDrawn = (gameState.zones[toZone]?.length ?? 0) - before;

      return actualDrawn;
    },
    log: (actualDrawn) => {
      if (actualDrawn <= 0) return;

      logAction(
        `drew ${actualDrawn} card${actualDrawn === 1 ? '' : 's'} into ${zoneLabel(toZone)}.`
      );
    },
  });
}

export function shuffleZone(zoneId) {
  return mutate({
    mutation: () => engine.shuffleZone(zoneId),
    log: () => logAction(`shuffled ${zoneLabel(zoneId)}.`),
  });
}

export function shuffleDiscardIntoDeck(discardZone, deckZone) {
  const count = gameState.zones[discardZone]?.length ?? 0;

  return mutate({
    mutation: () => engine.shuffleDiscardIntoDeck(discardZone, deckZone),
    log: () => {
      if (count <= 0) return;

      logAction(
        `shuffled ${count} card${count === 1 ? '' : 's'} from ${zoneLabel(discardZone)} into ${zoneLabel(deckZone)}.`
      );
    },
  });
}

export function loadDeck(csvText, slot) {
  const { cards, cardback } = parseDeckCSV(csvText, slot);

  if (!cards.length && !cardback) return;

  return mutate({
    mutation: () => {
      runtimeState.cardbacks[slot] = cardback || DEFAULT_CARDBACK;

      return engine.loadDeckIntoZone(cards, `${slot}-deck`);
    },
    log: (count) =>
      logAction(
        `loaded a ${count}-card deck into ${zoneLabel(`${slot}-deck`)}.`
      ),
  });
}

export function attachCardToTarget(selectedId, fromZone, targetId, targetZone) {
  const selectedBefore = findCard(fromZone, selectedId);
  const targetBefore = findCard(targetZone, targetId);

  if (!selectedBefore || !targetBefore) return null;

  const kind = classifyType(selectedBefore.type);

  return mutate({
    mutation: () =>
      engine.attachCardToTarget(selectedId, fromZone, targetId, targetZone),
    log: (result) => {
      if (kind === 'energy') {
        logAction(`attached ${result.name} to ${targetBefore.name} as energy.`);
      } else if (kind === 'trainer') {
        logAction(`attached ${result.name} to ${targetBefore.name}.`);
      } else {
        logAction(`evolved ${targetBefore.name} into ${result.name}.`);
      }
    },
  });
}

export function detachCard(
  parentId,
  parentZone,
  attachmentId,
  attachmentKind,
  toHandZone
) {
  const parent = findCard(parentZone, parentId);
  if (!parent) return null;

  return mutate({
    mutation: () =>
      engine.detachCard(
        parentId,
        parentZone,
        attachmentId,
        attachmentKind,
        toHandZone
      ),
    log: (card) =>
      logAction(
        `detached ${card.name} from ${parent.name}, returning it to hand.`
      ),
  });
}

export function devolveCard(cardId, zone, targetInstanceId) {
  const current = findCard(zone, cardId);
  if (!current) return null;

  return mutate({
    mutation: () => engine.devolveCard(cardId, zone, targetInstanceId),
    log: (previous) =>
      logAction(
        `devolved ${current.name} back into ${previous.name}, returning it to hand.`
      ),
  });
}

export function toggleStatus(instanceId, zone, status) {
  const before = findCard(zone, instanceId);
  if (!before) return null;

  const wasActive = before.statuses.includes(status);

  return mutate({
    mutation: () => engine.toggleStatus(instanceId, zone, status),
    log: (card) =>
      logAction(
        `${wasActive ? 'removed' : 'added'} ${status} on ${card.name}.`
      ),
  });
}

export function toggleAbility(instanceId, zone) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.toggleAbility(instanceId, zone),
    log: (card) =>
      logAction(
        `marked ${card.name}'s ability as ${card.abilityUsed ? 'used' : 'ready'}.`
      ),
  });
}

export function toggleFlip(instanceId, zone) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.toggleFlip(instanceId, zone),
    log: (card) =>
      logAction(`turned ${card.name} face ${card.isFaceDown ? 'down' : 'up'}.`),
  });
}

export function setRotation(instanceId, zone, degrees) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.setRotation(instanceId, zone, degrees),
    log: (card) => logAction(`rotated ${card.name} to ${degrees}°.`),
  });
}

export function setUpright(instanceId, zone) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.setUpright(instanceId, zone),
    log: (card) => logAction(`reset ${card.name} to upright.`),
  });
}

export function toggleBreak(instanceId, zone) {
  const before = findCard(zone, instanceId);

  // Mirrors engine.js's guard: BREAK requires evolution history.
  if (!before || !before.evolutionStack.length) return null;

  return mutate({
    mutation: () => engine.toggleBreak(instanceId, zone),
    log: (card) =>
      logAction(
        `${card.isBreakActive ? 'activated' : 'deactivated'} BREAK on ${card.name}.`
      ),
  });
}
