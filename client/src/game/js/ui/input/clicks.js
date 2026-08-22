import { clientState } from '../../logic/state.js';
import { isPileZone } from '../../utils.js';
import { domIdToStateZone } from '../render.js';
import {
  attachCard,
  deselectCard,
  drawCardFromZone,
  moveSelectedCardToZone,
  openCardActions,
  openPile,
  selectCard,
} from './actions.js';

let longPressTimer = null;
let longPressTriggered = false;

function handleBoardClick(e) {
  // A long-press already opened the action menu. Ignore the synthetic
  // click that mobile browsers may generate afterward.
  if (longPressTriggered) {
    longPressTriggered = false;
    return;
  }

  if (e.target.closest('.click-handling')) return;

  const cardEl = e.target.closest('.card');
  const zoneEl = e.target.closest('.zone, .hand, .table-half');

  if (zoneEl) {
    const targetZone = domIdToStateZone(zoneEl.id);

    if (
      !clientState.selectedInstanceId &&
      (targetZone.endsWith('-deck') || targetZone.endsWith('-prizes'))
    ) {
      drawCardFromZone(targetZone);
      return;
    }
  }

  // 0. Attachment mode active — the NEXT card clicked (that isn't the
  // card being attached) is the target, regardless of what it would
  // normally mean to click a card.
  if (clientState.selectedInstanceId && cardEl) {
    const targetInstanceId = cardEl.dataset.instanceId;
    const targetZone = cardEl.dataset.zone;

    if (
      targetZone === 'stadium' ||
      targetZone.endsWith('-hand') ||
      isPileZone(targetZone)
    ) {
      moveSelectedCardToZone(targetZone);
      return;
    }

    if (targetInstanceId !== clientState.selectedInstanceId) {
      attachCard(targetInstanceId, targetZone);
      return;
    }
  }

  // 1. If a card is already selected and we click a DIFFERENT zone
  // (or a card inside a different zone)
  if (clientState.selectedInstanceId && zoneEl) {
    const targetZone = domIdToStateZone(zoneEl.id);

    if (targetZone !== clientState.selectedZone) {
      moveSelectedCardToZone(targetZone);
      return;
    }
  }

  // 2. Otherwise, treat clicking a card as a selection action
  if (cardEl) {
    const clickedInstanceId = cardEl.dataset.instanceId;
    const clickedCardZone = cardEl.dataset.zone;

    if (clickedInstanceId === clientState.selectedInstanceId) {
      deselectCard();
      return;
    }

    selectCard(clickedInstanceId, clickedCardZone);
    return;
  }

  // 3. Clicked empty space — clear selection
  if (clientState.selectedInstanceId) {
    deselectCard();
  }
}

function handleAlternateClick(zoneEl, cardEl) {
  if (zoneEl) {
    const zone = domIdToStateZone(zoneEl.id);

    if (isPileZone(zone)) {
      openPile(zone);
      return;
    }
  }

  if (cardEl) {
    const clickedInstanceId = cardEl.dataset.instanceId;
    const clickedCardZone = cardEl.dataset.zone;

    openCardActions(clickedInstanceId, clickedCardZone);
  }
}

function handleContextMenu(e) {
  e.preventDefault();

  const cardEl = e.target.closest('.card');
  const zoneEl = e.target.closest('.zone, .hand, .table-half');

  handleAlternateClick(zoneEl, cardEl);
}

function cancelLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function handleTouchStart(e) {
  if (e.touches.length !== 1) return;

  const cardEl = e.target.closest('.card');
  const zoneEl = e.target.closest('.zone, .hand, .table-half');

  if (!cardEl && !zoneEl) return;

  cancelLongPress();
  longPressTriggered = false;

  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    longPressTriggered = true;

    handleAlternateClick(zoneEl, cardEl);
  }, 500);
}

function handleTouchMove() {
  cancelLongPress();
}

function handleTouchEnd() {
  cancelLongPress();
}

export function initClicks() {
  document.addEventListener('click', handleBoardClick);
  document.addEventListener('contextmenu', handleContextMenu);

  document.addEventListener('touchstart', handleTouchStart, {
    passive: true,
  });
  document.addEventListener('touchmove', handleTouchMove, {
    passive: true,
  });
  document.addEventListener('touchend', handleTouchEnd);
  document.addEventListener('touchcancel', handleTouchEnd);
}
