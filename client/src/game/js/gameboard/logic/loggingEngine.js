// loggingEngine.js — thin wrapper around engine.js that adds GameLogger
// calls without touching engine.js itself (engine.js's own header says
// "pure, DOM-free ... no document/window access, ever" — GameLogger
// reaches into the DOM, so it can't live inside engine.js).
//
// Every exported function here has the exact same name and signature
// as its engine.js counterpart. Callers only need to change their
// import path from './engine.js' (or '../gameboard/engine.js') to
// this file — no call-site logic changes required.
//
// This is also the seam Task 3 (Undo/Redo) will want for its
// before/after gameState snapshots — same call sites, same wrapper.

import * as engine from './engine.js';
import { gameState, runtimeState } from './state.js';
import { classifyType } from '../../utils.js';
import { GameLogger } from '../../sidebar/chat/chatlog.js';

// ---------------------------------------------------------------------
// Zone/slot helpers. GameLogger's API is slot-based ('p1' | 'p2') and
// resolves the real username + player/opp styling itself, so these only
// need to say *whose* card an action touched — not how to label them.
// Perspective-aware via runtimeState.mySlot, so this stays correct once
// Task 1 (switch seat) and Task 7 (multiplayer) are wired in.
// ---------------------------------------------------------------------

const ZONE_SUFFIX_LABELS = {
  deck: 'Deck',
  hand: 'Hand',
  active: 'Active',
  bench: 'Bench',
  discard: 'Discard',
  prizes: 'Prizes',
};

const SHARED_ZONE_LABELS = {
  stadium: 'Stadium',
  'lost-zone': 'Lost Zone',
  'table-left': 'Table (Left)',
  'table-right': 'Table (Right)',
};

// Logs an action, always attributed to the local acting viewer
// (runtimeState.mySlot) — NOT derived from the zone a card happens to be
// in. A card's zone changes as it moves; the actor performing the click
// doesn't. Attributing by zone caused moves into/out of the opponent's
// zone to flip-flop between Player/Opponent on successive moves of the
// same card — this fixes that. Matches the client-authoritative model:
// a client only ever logs its own actions.
function logAction(actionText) {
  GameLogger.logAction(runtimeState.mySlot, actionText);
}

function zoneLabel(zoneId) {
  if (zoneId.startsWith('p1-') || zoneId.startsWith('p2-')) {
    const slot = zoneId.slice(0, 2);
    const suffix = zoneId.slice(3);
    const base = ZONE_SUFFIX_LABELS[suffix] || suffix;
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
// the SAME stat of the SAME card accumulate into one pending entry.
// Any other logged call — a different stat, a different card, or any
// non-delta action — flushes the pending batch first, via
// flushPendingBatch() at the top of every other wrapped function.
//
// Known gap: if the very last action of a session is a delta with
// nothing logged after it, that final batch is never flushed (nothing
// ever triggers the flush). The underlying gameState mutation still
// happens correctly either way — only that log line would be missing.
// Acceptable for now; revisit with an idle-timer or beforeunload flush
// if it turns out to matter in practice.
// ---------------------------------------------------------------------

let pendingBatch = null;

function flushPendingBatch() {
  if (!pendingBatch) return;
  const { cardName, statLabel, netDelta, finalValue } = pendingBatch;
  const sign = netDelta > 0 ? '+' : '';
  logAction(
    `changed ${statLabel} on ${cardName} by ${sign}${netDelta} (now ${finalValue}).`
  );
  pendingBatch = null;
}

function applyDelta(statLabel, engineFn, instanceId, zone, delta) {
  const before = findCard(zone, instanceId);
  const card = engineFn(instanceId, zone, delta);
  if (!before || !card) return card;

  const key = `${instanceId}:${statLabel}`;
  const finalValue =
    statLabel === 'damage'
      ? card.damage
      : statLabel === 'overheal'
        ? card.overheal
        : card.counter;

  if (pendingBatch && pendingBatch.key === key) {
    pendingBatch.netDelta += delta;
    pendingBatch.finalValue = finalValue;
  } else {
    flushPendingBatch();
    pendingBatch = {
      key,
      zone,
      cardName: card.name,
      statLabel,
      netDelta: delta,
      finalValue,
    };
  }
  return card;
}

export function applyDamageDelta(instanceId, zone, delta) {
  return applyDelta('damage', engine.applyDamageDelta, instanceId, zone, delta);
}

export function applyOverhealDelta(instanceId, zone, delta) {
  return applyDelta(
    'overheal',
    engine.applyOverhealDelta,
    instanceId,
    zone,
    delta
  );
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
// Everything else — logs immediately, one line per call. Each of
// these flushes any pending delta batch first, since a non-delta
// action always ends whatever batch was in progress.
// ---------------------------------------------------------------------

export function moveCardToZone(instanceId, fromZone, toZone, position = 'top') {
  flushPendingBatch();
  const card = engine.moveCardToZone(instanceId, fromZone, toZone, position);
  if (card)
    logAction(
      `moved ${card.name} from ${zoneLabel(fromZone)} to ${zoneLabel(toZone)}.`
    );
  return card;
}

export function moveToTopOfDeck(instanceId, fromZone, toZone) {
  flushPendingBatch();
  const card = engine.moveToTopOfDeck(instanceId, fromZone, toZone);
  if (card)
    logAction(
      `put ${card.name} on top of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
    );
  return card;
}

export function moveToBottomOfDeck(instanceId, fromZone, toZone) {
  flushPendingBatch();
  const card = engine.moveToBottomOfDeck(instanceId, fromZone, toZone);
  if (card)
    logAction(
      `put ${card.name} on the bottom of the ${zoneLabel(toZone)} (from ${zoneLabel(fromZone)}).`
    );
  return card;
}

export function drawTopCard(fromZone, toZone) {
  flushPendingBatch();
  const card = engine.drawTopCard(fromZone, toZone);
  if (card) logAction(`drew ${card.name}.`);
  return card;
}

export function drawCards(fromZone, toZone, count) {
  flushPendingBatch();
  const before = gameState.zones[toZone]?.length ?? 0;
  engine.drawCards(fromZone, toZone, count);
  const actualDrawn = (gameState.zones[toZone]?.length ?? 0) - before;
  if (actualDrawn > 0) {
    logAction(
      `drew ${actualDrawn} card${actualDrawn === 1 ? '' : 's'} into ${zoneLabel(toZone)}.`
    );
  }
}

export function shuffleZone(zoneId) {
  flushPendingBatch();
  engine.shuffleZone(zoneId);
  logAction(`shuffled ${zoneLabel(zoneId)}.`);
}

export function shuffleDiscardIntoDeck(discardZone, deckZone) {
  flushPendingBatch();
  const count = gameState.zones[discardZone]?.length ?? 0;
  engine.shuffleDiscardIntoDeck(discardZone, deckZone);
  if (count > 0) {
    logAction(
      `shuffled ${count} card${count === 1 ? '' : 's'} from ${zoneLabel(discardZone)} into ${zoneLabel(deckZone)}.`
    );
  }
}

export function attachCardToTarget(selectedId, fromZone, targetId, targetZone) {
  flushPendingBatch();
  const selectedBefore = findCard(fromZone, selectedId);
  const targetBefore = findCard(targetZone, targetId);
  const kind = selectedBefore ? classifyType(selectedBefore.type) : null;
  const result = engine.attachCardToTarget(
    selectedId,
    fromZone,
    targetId,
    targetZone
  );
  if (!result || !targetBefore) return result;

  if (kind === 'energy') {
    logAction(`attached ${result.name} to ${targetBefore.name} as energy.`);
  } else if (kind === 'trainer') {
    logAction(`attached ${result.name} to ${targetBefore.name}.`);
  } else {
    logAction(`evolved ${targetBefore.name} into ${result.name}.`);
  }
  return result;
}

export function detachCard(
  parentId,
  parentZone,
  attachmentId,
  attachmentKind,
  toHandZone
) {
  flushPendingBatch();
  const parent = findCard(parentZone, parentId);
  const card = engine.detachCard(
    parentId,
    parentZone,
    attachmentId,
    attachmentKind,
    toHandZone
  );
  if (card) {
    logAction(
      `detached ${card.name} from ${parent ? parent.name : 'a card'}, returning it to hand.`
    );
  }
  return card;
}

export function devolveCard(cardId, zone, targetInstanceId) {
  flushPendingBatch();
  const current = findCard(zone, cardId);
  const previous = engine.devolveCard(cardId, zone, targetInstanceId);
  if (previous && current) {
    logAction(
      `devolved ${current.name} back into ${previous.name}, returning it to hand.`
    );
  }
  return previous;
}

export function toggleStatus(instanceId, zone, status) {
  flushPendingBatch();
  const before = findCard(zone, instanceId);
  const wasActive = before ? before.statuses.includes(status) : false;
  const card = engine.toggleStatus(instanceId, zone, status);
  if (card)
    logAction(`${wasActive ? 'removed' : 'added'} ${status} on ${card.name}.`);
  return card;
}

export function toggleAbility(instanceId, zone) {
  flushPendingBatch();
  const card = engine.toggleAbility(instanceId, zone);
  if (card)
    logAction(
      `marked ${card.name}'s ability as ${card.abilityUsed ? 'used' : 'ready'}.`
    );
  return card;
}

export function toggleFlip(instanceId, zone) {
  flushPendingBatch();
  const card = engine.toggleFlip(instanceId, zone);
  if (card)
    logAction(`turned ${card.name} face ${card.isFaceDown ? 'down' : 'up'}.`);
  return card;
}

export function setRotation(instanceId, zone, degrees) {
  flushPendingBatch();
  const card = engine.setRotation(instanceId, zone, degrees);
  if (card) logAction(`rotated ${card.name} to ${degrees}°.`);
  return card;
}

export function setUpright(instanceId, zone) {
  flushPendingBatch();
  const card = engine.setUpright(instanceId, zone);
  if (card) logAction(`reset ${card.name} to upright.`);
  return card;
}

export function toggleBreak(instanceId, zone) {
  flushPendingBatch();
  const card = engine.toggleBreak(instanceId, zone);
  if (card)
    logAction(
      `${card.isBreakActive ? 'activated' : 'deactivated'} BREAK on ${card.name}.`
    );
  return card;
}
