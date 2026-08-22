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
} from '../utils.js';
import { GameLogger } from '../ui/sidebar/chat/chatlog.js';
import {
  pushSnapshot,
  undo as _undo,
  redo as _redo,
  canUndo,
  canRedo,
} from './undoManager.js';
import { emitStateChanged } from './network/stateChangeBus.js';
import { emitLogChanged } from './network/logChangeBus.js';
import { parseDeckCSV } from './parser.js';

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
export function logAction(actionText) {
  GameLogger.logAction(runtimeState.mySlot, actionText);
  emitLogChanged(actionText);
}

export function logSystem(systemText) {
  GameLogger.logSystem(systemText);
  emitLogChanged(systemText);
}

function zoneLabel(zoneId) {
  if (zoneId.endsWith('table-half')) return 'Board';
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

const EXPECTED_ZONE_KEYS = Object.keys(gameState.zones);

function sanitizeZones(rawZones) {
  const clean = {};
  for (const key of EXPECTED_ZONE_KEYS) {
    const value = rawZones[key];
    clean[key] = Array.isArray(value) ? value : [];
  }
  return clean;
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
// `success` exists because some legitimate engine functions return
// undefined or zero on success (for example shuffleZone/loadDeck),
// while card mutations use null to indicate failure.
// ---------------------------------------------------------------------

function mutate({
  validate = () => true,
  mutation,
  log,
  success = (result) => result !== null,
}) {
  if (!validate()) return null;

  flushPendingBatch();
  pushSnapshot();

  const result = mutation();

  if (success(result)) {
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

// ---------------------------------------------------------------------
// Actual mutation implementations
//
// These are intentionally NOT exported. The public exports at the
// bottom of the file pass through guarded(), which prevents spectators
// from reaching any mutation logic at all.
// ---------------------------------------------------------------------

function _applyDamageDelta(instanceId, zone, delta) {
  return applyDelta('damage', engine.applyDamageDelta, instanceId, zone, delta);
}

function _applyCounterDelta(instanceId, zone, delta) {
  return applyDelta(
    'counter',
    engine.applyCounterDelta,
    instanceId,
    zone,
    delta
  );
}

function _moveCardToZone(instanceId, fromZone, toZone, position = 'top') {
  return mutate({
    validate: () => fromZone !== toZone && findCard(fromZone, instanceId),
    mutation: () =>
      engine.moveCardToZone(instanceId, fromZone, toZone, position),
    log: (card) =>
      logAction(
        `moved ${card.name} from ${zoneLabel(fromZone)} to ${zoneLabel(toZone)}.`
      ),
  });
}

function _moveToTopOfDeck(instanceId, fromZone, toZone) {
  return mutate({
    validate: () => findCard(fromZone, instanceId),
    mutation: () => engine.moveToTopOfDeck(instanceId, fromZone, toZone),
    log: (card) =>
      logAction(
        `put ${card.name} on top of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
      ),
  });
}

function _moveToBottomOfDeck(instanceId, fromZone, toZone) {
  return mutate({
    validate: () => findCard(fromZone, instanceId),
    mutation: () => engine.moveToBottomOfDeck(instanceId, fromZone, toZone),
    log: (card) =>
      logAction(
        `moved ${card.name} to the bottom of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
      ),
  });
}

function _drawCards(fromZone, toZone, count) {
  return mutate({
    validate: () => !!gameState.zones[fromZone]?.length,
    mutation: () => {
      const before = gameState.zones[toZone]?.length ?? 0;

      engine.moveCards(fromZone, toZone, count);

      return (gameState.zones[toZone]?.length ?? 0) - before;
    },
    success: (actualDrawn) => actualDrawn > 0,
    log: (actualDrawn) =>
      logAction(
        `drew ${actualDrawn} card${actualDrawn === 1 ? '' : 's'} from ${zoneLabel(fromZone)} into ${zoneLabel(toZone)}.`
      ),
  });
}

function _drawTopCard(fromZone, toZone) {
  return mutate({
    validate: () => !!gameState.zones[fromZone]?.length,
    mutation: () => engine.drawTopCard(fromZone, toZone),
    log: (card) => logAction(`drew ${card.name}.`),
  });
}

function _setup(deckZone, handZone, prizesZone) {
  return mutate({
    validate: () => !!gameState.zones[deckZone]?.length,
    mutation: () => {
      engine.shuffleZone(deckZone);
      engine.moveCards(deckZone, handZone, 7);
      engine.moveCards(deckZone, prizesZone, 6);
    },
    log: () => logAction(`set up.`),
  });
}

function _mulligan(deckZone, handZone) {
  return mutate({
    mutation: () => {
      engine.moveCards(handZone, deckZone, handZone.length);
      engine.shuffleZone(deckZone);
      engine.moveCards(deckZone, handZone, 7);
    },
    log: () => logAction(`mulliganed.`),
  });
}

function _discardHand(handZone, discardZone) {
  return mutate({
    validate: () => !!gameState.zones[handZone]?.length,
    mutation: () => {
      engine.moveCards(handZone, discardZone, handZone.length);
    },
    log: () => logAction(`discarded their hand.`),
  });
}

function _shuffleZone(zoneId) {
  return mutate({
    mutation: () => engine.shuffleZone(zoneId),
    log: () => logAction(`shuffled ${zoneLabel(zoneId)}.`),
  });
}

function _shuffleDiscardIntoDeck(discardZone, deckZone) {
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

function _loadDeck(csvText, slot) {
  const { cards, cardback } = parseDeckCSV(csvText, slot);

  if (!cards.length && !cardback) return null;

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

function _importState(payload) {
  return mutate({
    validate: () =>
      payload &&
      typeof payload === 'object' &&
      payload.zones &&
      typeof payload.zones === 'object',
    mutation: () => {
      gameState.zones = sanitizeZones(payload.zones);
      if (payload.cardbacks && typeof payload.cardbacks === 'object') {
        runtimeState.cardbacks = {
          p1: payload.cardbacks.p1 || DEFAULT_CARDBACK,
          p2: payload.cardbacks.p2 || DEFAULT_CARDBACK,
        };
      }
      return true;
    },
    log: () => logAction('imported a game state.'),
  });
}

function _attachCardToTarget(selectedId, fromZone, targetId, targetZone) {
  const selectedBefore = findCard(fromZone, selectedId);
  const targetBefore = findCard(targetZone, targetId);

  if (!selectedBefore || !targetBefore) return null;

  const kind = classifyType(selectedBefore.type);

  return mutate({
    mutation: () =>
      engine.attachCardToTarget(selectedId, fromZone, targetId, targetZone),
    log: (result) => {
      if (kind === 'energy' || kind === 'trainer') {
        logAction(`attached ${selectedBefore.name} to ${targetBefore.name}.`);
      } else {
        logAction(`evolved ${targetBefore.name} into ${result.name}.`);
      }
    },
  });
}

function _detachCard(
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
    log: (card) => logAction(`detached ${card.name} from ${parent.name}.`),
  });
}

function _devolveCard(cardId, zone, targetInstanceId) {
  const current = findCard(zone, cardId);
  if (!current) return null;

  return mutate({
    mutation: () => engine.devolveCard(cardId, zone, targetInstanceId),
    log: (previous) =>
      logAction(`devolved ${current.name} back into ${previous.name}.`),
  });
}

function _toggleStatus(instanceId, zone, status) {
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

function _toggleAbility(instanceId, zone) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.toggleAbility(instanceId, zone),
    log: (card) =>
      logAction(
        `marked ${card.name}'s ability as ${card.abilityUsed ? 'used' : 'ready'}.`
      ),
  });
}

function _toggleFlip(instanceId, zone) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.toggleFlip(instanceId, zone),
    log: (card) =>
      logAction(`turned ${card.name} face ${card.isFaceDown ? 'down' : 'up'}.`),
  });
}

function _setRotation(instanceId, zone, degrees) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.setRotation(instanceId, zone, degrees),
    log: (card) => logAction(`rotated ${card.name} to ${degrees}°.`),
  });
}

function _setUpright(instanceId, zone) {
  return mutate({
    validate: () => findCard(zone, instanceId),
    mutation: () => engine.setUpright(instanceId, zone),
    log: (card) => logAction(`reset ${card.name} to upright.`),
  });
}

function _toggleBreak(instanceId, zone) {
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

function _resetBoard() {
  return mutate({
    mutation: () => {
      for (const zoneId of Object.keys(gameState.zones)) {
        if (zoneId.endsWith('-deck')) {
          continue;
        }

        const cards = [...gameState.zones[zoneId]];

        for (const card of cards) {
          _moveCardToZone(card.instanceId, zoneId, `${card.owner}-deck`);
        }
      }
    },
    log: () => logAction('reset the board.'),
  });
}

function _resetGame() {
  return mutate({
    mutation: () => engine.resetGame(),
    log: () => logAction(`reset the game.`),
  });
}

function _flipCoin() {
  const result = engine.flipCoin();
  logAction(`flipped ${result}.`);
}

// ---------------------------------------------------------------------
// Spectator guard
//
// This is deliberately applied at the public API boundary. A spectator
// therefore cannot reach mutate(), applyDelta(), engine.js, snapshotting,
// logging, or broadcasting.
// ---------------------------------------------------------------------

function guarded(fn) {
  return (...args) => {
    if (runtimeState.isSpectator) {
      GameLogger.logSystem('Spectators cannot affect the game.');
      return null;
    }

    return fn(...args);
  };
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

export const flipCoin = guarded(_flipCoin);

export const applyDamageDelta = guarded(_applyDamageDelta);
export const applyCounterDelta = guarded(_applyCounterDelta);

export const moveCardToZone = guarded(_moveCardToZone);
export const moveToTopOfDeck = guarded(_moveToTopOfDeck);
export const moveToBottomOfDeck = guarded(_moveToBottomOfDeck);

export const drawTopCard = guarded(_drawTopCard);
export const drawCards = guarded(_drawCards);
export const setup = guarded(_setup);
export const mulligan = guarded(_mulligan);
export const discardHand = guarded(_discardHand);

export const shuffleZone = guarded(_shuffleZone);
export const shuffleDiscardIntoDeck = guarded(_shuffleDiscardIntoDeck);

export const loadDeck = guarded(_loadDeck);
export const importState = guarded(_importState);

export const attachCardToTarget = guarded(_attachCardToTarget);
export const detachCard = guarded(_detachCard);
export const devolveCard = guarded(_devolveCard);

export const toggleStatus = guarded(_toggleStatus);
export const toggleAbility = guarded(_toggleAbility);
export const toggleFlip = guarded(_toggleFlip);

export const setRotation = guarded(_setRotation);
export const setUpright = guarded(_setUpright);
export const toggleBreak = guarded(_toggleBreak);

export const resetBoard = guarded(_resetBoard);
export const resetGame = guarded(_resetGame);

export const undo = guarded(_undo);
export const redo = guarded(_redo);

export { canUndo, canRedo };
