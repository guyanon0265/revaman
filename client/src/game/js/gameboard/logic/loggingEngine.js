// loggingEngine.js — thin wrapper around engine.js that adds GameLogger
// calls, undo/redo snapshotting, and multiplayer broadcast, without
// touching engine.js itself (engine.js's own header says "pure,
// DOM-free ... no document/window access, ever" — none of those three
// belong there).
//
// Every exported function here has the exact same name and signature
// as its engine.js counterpart. Callers only need to change their
// import path from './engine.js' (or '../gameboard/engine.js') to
// this file — no call-site logic changes required.
//
// Three DIFFERENT granularities live in this file, and they're not the
// same thing even though they look related:
//   - pushSnapshot() fires once per logical action (a whole run of
//     batched delta clicks = one snapshot), so undo matches log-line
//     granularity.
//   - logAction() also fires once per logical action, debounce-flushed
//     for deltas.
//   - emitStateChanged() (multiplayer broadcast) fires on EVERY
//     successful mutation, including every individual delta click —
//     broadcasting only once a batch finishes would mean the opponent
//     watches damage numbers jump in a delayed lump instead of ticking
//     up live as you click.

import * as engine from './engine.js';
import { gameState, runtimeState, DEFAULT_CARDBACK } from './state.js';
import {
  classifyType,
  SHARED_ZONE_LABELS,
  OWNED_ZONE_SUFFIX_LABELS,
} from '../../utils.js';
import { GameLogger } from '../../sidebar/chat/chatlog.js';
import { pushSnapshot } from './undoManager.js';
import { emitStateChanged } from './stateChangeBus.js';
import { parseDeckCSV } from './parser.js';
import { emitLogChanged } from './logChangeBus.js'; // new — see chat/log section below

export { undo, redo, canUndo, canRedo } from './undoManager.js';

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
// Damage / overheal / counter deltas — batched. Consecutive clicks on
// the SAME stat of the SAME card accumulate into one pending entry,
// which is also one undo step: pushSnapshot() fires once, when the
// batch STARTS (before that first mutation), not on every click that
// extends it.
//
// The batch flushes (logs + clears) via a short timer after the last
// click, rather than waiting for some other action to trigger it. That
// used to be lazy-flush-on-next-action, which meant a damage log line
// could sit invisible for an arbitrarily long time and then appear
// bundled together with an unrelated later action's log line the
// moment ANYTHING else happened — or, if nothing else ever happened in
// the session, never appear at all. The timer fixes both: the log
// appears promptly on its own once clicking stops, independent of
// whatever else does or doesn't happen afterward.
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
  emitStateChanged(); // every click, not batched — see file header
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
// Everything else — logs immediately, one line per call, and each is
// its own undo step: pushSnapshot() fires before the mutation, right
// after flushing whatever delta batch was pending (a non-delta action
// always ends a batch — it can't be folded into one).
// ---------------------------------------------------------------------

export function moveCardToZone(instanceId, fromZone, toZone, position = 'top') {
  if (!findCard(fromZone, instanceId)) return null; // nothing to move — don't waste an undo step
  flushPendingBatch();
  pushSnapshot();
  const card = engine.moveCardToZone(instanceId, fromZone, toZone, position);
  if (card) {
    logAction(
      `moved ${card.name} from ${zoneLabel(fromZone)} to ${zoneLabel(toZone)}.`
    );
    emitStateChanged();
  }
  return card;
}

export function moveToTopOfDeck(instanceId, fromZone, toZone) {
  if (!findCard(fromZone, instanceId)) return null;
  flushPendingBatch();
  pushSnapshot();
  const card = engine.moveToTopOfDeck(instanceId, fromZone, toZone);
  if (card) {
    logAction(
      `put ${card.name} on top of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
    );
    emitStateChanged();
  }
  return card;
}

export function moveToBottomOfDeck(instanceId, fromZone, toZone) {
  if (!findCard(fromZone, instanceId)) return null;
  flushPendingBatch();
  pushSnapshot();
  const card = engine.moveToBottomOfDeck(instanceId, fromZone, toZone);
  if (card) {
    logAction(
      `put ${card.name} on the bottom of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
    );
    emitStateChanged();
  }
  return card;
}

export function drawTopCard(fromZone, toZone) {
  if (!gameState.zones[fromZone]?.length) return null; // deck empty — nothing to draw
  flushPendingBatch();
  pushSnapshot();
  const card = engine.drawTopCard(fromZone, toZone);
  if (card) {
    logAction(`drew ${card.name}.`);
    emitStateChanged();
  }
  return card;
}

export function drawCards(fromZone, toZone, count) {
  if (!gameState.zones[fromZone]?.length) return; // deck empty — nothing to draw
  flushPendingBatch();
  pushSnapshot();
  const before = gameState.zones[toZone]?.length ?? 0;
  engine.drawCards(fromZone, toZone, count);
  const actualDrawn = (gameState.zones[toZone]?.length ?? 0) - before;
  if (actualDrawn > 0) {
    logAction(
      `drew ${actualDrawn} card${actualDrawn === 1 ? '' : 's'} into ${zoneLabel(toZone)}.`
    );
    emitStateChanged();
  }
}

export function shuffleZone(zoneId) {
  flushPendingBatch();
  pushSnapshot();
  engine.shuffleZone(zoneId);
  logAction(`shuffled ${zoneLabel(zoneId)}.`);
  emitStateChanged();
}

export function shuffleDiscardIntoDeck(discardZone, deckZone) {
  flushPendingBatch();
  pushSnapshot();
  const count = gameState.zones[discardZone]?.length ?? 0;
  engine.shuffleDiscardIntoDeck(discardZone, deckZone);
  if (count > 0) {
    logAction(
      `shuffled ${count} card${count === 1 ? '' : 's'} from ${zoneLabel(discardZone)} into ${zoneLabel(deckZone)}.`
    );
    emitStateChanged();
  }
}

export function loadDeck(csvText, slot) {
  const { cards, cardback } = parseDeckCSV(csvText, slot);
  if (!cards.length && !cardback) return; // nothing parsed — don't waste an undo step or a broadcast

  flushPendingBatch();
  pushSnapshot();

  runtimeState.cardbacks[slot] = cardback || DEFAULT_CARDBACK; // reset-to-default-if-absent, matching the old scan-before-reset behavior
  const count = engine.loadDeckIntoZone(cards, `${slot}-deck`);

  logAction(`loaded a ${count}-card deck into ${zoneLabel(`${slot}-deck`)}.`);
  emitStateChanged();
}

export function attachCardToTarget(selectedId, fromZone, targetId, targetZone) {
  const selectedBefore = findCard(fromZone, selectedId);
  const targetBefore = findCard(targetZone, targetId);
  if (!selectedBefore || !targetBefore) return null; // one side missing — nothing to attach

  flushPendingBatch();
  pushSnapshot();

  const kind = classifyType(selectedBefore.type);
  const result = engine.attachCardToTarget(
    selectedId,
    fromZone,
    targetId,
    targetZone
  );
  if (!result) return result;

  if (kind === 'energy') {
    logAction(`attached ${result.name} to ${targetBefore.name} as energy.`);
  } else if (kind === 'trainer') {
    logAction(`attached ${result.name} to ${targetBefore.name}.`);
  } else {
    logAction(`evolved ${targetBefore.name} into ${result.name}.`);
  }
  emitStateChanged();
  return result;
}

export function detachCard(
  parentId,
  parentZone,
  attachmentId,
  attachmentKind,
  toHandZone
) {
  const parent = findCard(parentZone, parentId);
  if (!parent) return null; // parent gone — nothing to detach from

  flushPendingBatch();
  pushSnapshot();

  const card = engine.detachCard(
    parentId,
    parentZone,
    attachmentId,
    attachmentKind,
    toHandZone
  );
  if (card) {
    logAction(
      `detached ${card.name} from ${parent.name}, returning it to hand.`
    );
    emitStateChanged();
  }
  return card;
}

export function devolveCard(cardId, zone, targetInstanceId) {
  const current = findCard(zone, cardId);
  if (!current) return null; // card gone — nothing to devolve

  flushPendingBatch();
  pushSnapshot();

  const previous = engine.devolveCard(cardId, zone, targetInstanceId);
  if (previous) {
    logAction(
      `devolved ${current.name} back into ${previous.name}, returning it to hand.`
    );
    emitStateChanged();
  }
  return previous;
}

export function toggleStatus(instanceId, zone, status) {
  const before = findCard(zone, instanceId);
  if (!before) return null;

  flushPendingBatch();
  pushSnapshot();

  const wasActive = before.statuses.includes(status);
  const card = engine.toggleStatus(instanceId, zone, status);
  if (card) {
    logAction(`${wasActive ? 'removed' : 'added'} ${status} on ${card.name}.`);
    emitStateChanged();
  }
  return card;
}

export function toggleAbility(instanceId, zone) {
  if (!findCard(zone, instanceId)) return null;

  flushPendingBatch();
  pushSnapshot();

  const card = engine.toggleAbility(instanceId, zone);
  if (card) {
    logAction(
      `marked ${card.name}'s ability as ${card.abilityUsed ? 'used' : 'ready'}.`
    );
    emitStateChanged();
  }
  return card;
}

export function toggleFlip(instanceId, zone) {
  if (!findCard(zone, instanceId)) return null;

  flushPendingBatch();
  pushSnapshot();

  const card = engine.toggleFlip(instanceId, zone);
  if (card) {
    logAction(`turned ${card.name} face ${card.isFaceDown ? 'down' : 'up'}.`);
    emitStateChanged();
  }
  return card;
}

export function setRotation(instanceId, zone, degrees) {
  if (!findCard(zone, instanceId)) return null;

  flushPendingBatch();
  pushSnapshot();

  const card = engine.setRotation(instanceId, zone, degrees);
  if (card) {
    logAction(`rotated ${card.name} to ${degrees}°.`);
    emitStateChanged();
  }
  return card;
}

export function setUpright(instanceId, zone) {
  if (!findCard(zone, instanceId)) return null;

  flushPendingBatch();
  pushSnapshot();

  const card = engine.setUpright(instanceId, zone);
  if (card) {
    logAction(`reset ${card.name} to upright.`);
    emitStateChanged();
  }
  return card;
}

export function toggleBreak(instanceId, zone) {
  // Mirrors engine.js's own guard (card must exist AND have evolution
  // history) so a click on a non-BREAK-eligible card doesn't waste an
  // undo step either. This one's simple enough to safely mirror; keep
  // it in sync if engine.js's own toggleBreak guard ever changes.
  const before = findCard(zone, instanceId);
  if (!before || !before.evolutionStack.length) return null;

  flushPendingBatch();
  pushSnapshot();

  const card = engine.toggleBreak(instanceId, zone);
  if (card) {
    logAction(
      `${card.isBreakActive ? 'activated' : 'deactivated'} BREAK on ${card.name}.`
    );
    emitStateChanged();
  }
  return card;
}
