import { gameState } from './state.js';
import {
  classifyType,
  isPileZone,
  OWNED_ZONE_SUFFIXES,
  SHARED_ZONE_IDS,
} from '../utils.js';

function removeFromZone(zoneId, instanceId) {
  const arr = gameState.zones[zoneId];
  if (!arr) return null;
  const idx = arr.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return null;
  return arr.splice(idx, 1)[0];
}

function resetToFresh(card) {
  card.damage = 0;
  card.counter = 0;
  card.statuses = [];
  card.abilityUsed = false;
  card.rotation = 0;
  card.isBreakActive = false;
  card.energyAttachments = [];
  card.trainerAttachments = [];
  card.evolutionStack = [];
}

export function moveCardToZone(instanceId, fromZone, toZone, position = 'top') {
  const card = removeFromZone(fromZone, instanceId);
  if (!card) return null;

  if (isPileZone(toZone) || toZone.endsWith('-hand')) {
    const toArr = gameState.zones[toZone];
    [
      ...card.trainerAttachments,
      ...card.energyAttachments,
      ...card.evolutionStack,
    ].forEach((att) => toArr.push(att));
    resetToFresh(card);
  }

  if (position === 'top') gameState.zones[toZone].push(card);
  else gameState.zones[toZone].unshift(card);
  return card;
}

export function moveToTopOfDeck(instanceId, fromZone, toZone) {
  return moveCardToZone(instanceId, fromZone, toZone, 'top');
}

export function moveToBottomOfDeck(instanceId, fromZone, toZone) {
  return moveCardToZone(instanceId, fromZone, toZone, 'bottom');
}

export function moveCards(fromZone, toZone, count) {
  const from = gameState.zones[fromZone];
  const to = gameState.zones[toZone];
  if (!from || !to) return;
  for (let i = 0; i < count && from.length > 0; i++) {
    to.push(from.pop());
  }
}

export function drawTopCard(fromZone, toZone) {
  const arr = gameState.zones[fromZone];
  if (!arr || !arr.length) return null;
  const card = arr.pop();
  gameState.zones[toZone].push(card);
  return card;
}

export function shuffleZone(zoneId) {
  const arr = gameState.zones[zoneId];
  if (!arr) return;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function shuffleDiscardIntoDeck(discardZone, deckZone) {
  const discard = gameState.zones[discardZone];
  const deck = gameState.zones[deckZone];
  if (!discard || !deck) return;
  while (discard.length > 0) {
    deck.push(discard.pop());
  }
  shuffleZone(deckZone);
}

export function attachCardToTarget(selectedId, fromZone, targetId, targetZone) {
  const selectedCard = removeFromZone(fromZone, selectedId);
  if (!selectedCard) return null;

  const targetArr = gameState.zones[targetZone];
  const targetIdx = targetArr.findIndex((c) => c.instanceId === targetId);
  if (targetIdx === -1) return null;
  const targetCard = targetArr[targetIdx];

  const previousCard = {
    ...targetCard,
    evolutionStack: [],
    energyAttachments: [],
    trainerAttachments: [],
  };

  const kind = classifyType(selectedCard.type);

  if (kind === 'energy') {
    targetCard.energyAttachments.push(selectedCard);
  } else if (kind === 'trainer') {
    targetCard.trainerAttachments.push(selectedCard);
  } else {
    selectedCard.energyAttachments = [
      ...selectedCard.energyAttachments,
      ...targetCard.energyAttachments,
    ];
    selectedCard.trainerAttachments = [
      ...selectedCard.trainerAttachments,
      ...targetCard.trainerAttachments,
    ];
    selectedCard.damage = targetCard.damage;
    selectedCard.statuses = targetCard.statuses;
    selectedCard.evolutionStack = [
      ...selectedCard.evolutionStack,
      ...targetCard.evolutionStack,
      previousCard,
    ];
    targetArr[targetIdx] = selectedCard;
  }

  return targetArr[targetIdx];
}

export function detachCard(
  parentId,
  parentZone,
  attachmentId,
  attachmentKind,
  toHandZone
) {
  const parent = gameState.zones[parentZone].find(
    (c) => c.instanceId === parentId
  );
  if (!parent) return null;
  const list =
    attachmentKind === 'energy'
      ? parent.energyAttachments
      : parent.trainerAttachments;
  const idx = list.findIndex((c) => c.instanceId === attachmentId);
  if (idx === -1) return null;
  const [card] = list.splice(idx, 1);
  gameState.zones[toHandZone].push(card);
  return card;
}

export function devolveCard(cardId, zone, targetInstanceId) {
  const arr = gameState.zones[zone];
  const idx = arr.findIndex((c) => c.instanceId === cardId);
  if (idx === -1) return null;

  const current = arr[idx];
  const targetIdx = current.evolutionStack.findIndex(
    (c) => c.instanceId === targetInstanceId
  );
  if (targetIdx === -1) return null;

  const previous = current.evolutionStack[targetIdx];
  const skippedStages = current.evolutionStack.slice(targetIdx + 1);

  previous.damage = current.damage;
  previous.counter = current.counter;
  previous.statuses = [...current.statuses];
  previous.abilityUsed = current.abilityUsed;
  previous.energyAttachments = current.energyAttachments;
  previous.trainerAttachments = current.trainerAttachments;

  arr[idx] = previous;

  resetToFresh(current);
  skippedStages.forEach(resetToFresh);

  const handZone = zone.split('-')[0] + '-hand';
  const hand = gameState.zones[handZone];
  hand.push(current);
  skippedStages.forEach((stage) => hand.push(stage));

  return previous;
}

export function applyDamageDelta(instanceId, zone, delta) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  card.damage += delta;
  return card;
}

export function applyCounterDelta(instanceId, zone, delta) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  card.counter = Math.max(0, card.counter + delta);
  return card;
}

export function toggleStatus(instanceId, zone, status) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  const idx = card.statuses.indexOf(status);
  if (idx === -1) card.statuses.push(status);
  else card.statuses.splice(idx, 1);
  return card;
}

export function toggleAbility(instanceId, zone) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  card.abilityUsed = !card.abilityUsed;
  return card;
}

export function toggleFlip(instanceId, zone) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  card.isFaceDown = !card.isFaceDown;
  return card;
}

export function setRotation(instanceId, zone, degrees) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  card.rotation = degrees;
  return card;
}

export function setUpright(instanceId, zone) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card) return null;
  card.rotation = 0;
  return card;
}

export function toggleBreak(instanceId, zone) {
  const card = gameState.zones[zone]?.find((c) => c.instanceId === instanceId);
  if (!card || !card.evolutionStack.length) return null;
  card.isBreakActive = !card.isBreakActive;
  return card;
}

export function loadDeckIntoZone(cards, zone) {
  const arr = gameState.zones[zone];
  if (!arr) return 0;
  cards.forEach((card) => arr.push(card));
  return cards.length;
}

export function resetGame() {
  for (const slot of ['p1', 'p2']) {
    for (const suffix of OWNED_ZONE_SUFFIXES) {
      gameState.zones[`${slot}-${suffix}`].length = 0;
    }
  }

  for (const zoneId of SHARED_ZONE_IDS) {
    gameState.zones[zoneId].length = 0;
  }
}

export function flipCoin() {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}
