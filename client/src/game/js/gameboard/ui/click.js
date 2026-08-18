import { clientState, clearSelection } from '../logic/state.js';
import {
  moveCardToZone,
  attachCardToTarget,
  drawCards,
} from '../logic/loggingEngine.js';
import { isPileZone } from '../../utils.js';
import { domIdToStateZone, renderEntireBoard } from './render.js';
import { openPileBrowser, refreshPileBrowser } from './overlays/pileBrowser.js';
import { openActionMenu, notifyCardReplaced } from './overlays/actionMenu.js';
import { refreshViewAttached } from './overlays/viewAttached.js';

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
      const ownerSlot = targetZone.split('-')[0];

      drawCards(targetZone, `${ownerSlot}-hand`, 1);

      clearSelection();
      renderEntireBoard();
      refreshPileBrowser();
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
      moveCardToZone(
        clientState.selectedInstanceId,
        clientState.selectedZone,
        targetZone
      );
      clearSelection();
      renderEntireBoard();
      refreshPileBrowser();
      return;
    }

    if (targetInstanceId !== clientState.selectedInstanceId) {
      const occupant = attachCardToTarget(
        clientState.selectedInstanceId,
        clientState.selectedZone,
        targetInstanceId,
        cardEl.dataset.zone
      );

      clearSelection();
      renderEntireBoard();

      if (occupant) {
        notifyCardReplaced(targetInstanceId, targetZone, occupant);
      }

      refreshViewAttached();

      return;
    }
  }

  // 1. If a card is already selected and we click a DIFFERENT zone
  // (or a card inside a different zone)
  if (clientState.selectedInstanceId && zoneEl) {
    const targetZone = domIdToStateZone(zoneEl.id);

    if (targetZone !== clientState.selectedZone) {
      moveCardToZone(
        clientState.selectedInstanceId,
        clientState.selectedZone,
        targetZone
      );
      clearSelection();
      renderEntireBoard();
      refreshPileBrowser();
      return;
    }
  }

  // 2. Otherwise, treat clicking a card as a selection action
  if (cardEl) {
    const clickedInstanceId = cardEl.dataset.instanceId;

    if (clickedInstanceId === clientState.selectedInstanceId) {
      clearSelection();
      renderEntireBoard();
      return;
    }

    clientState.selectedInstanceId = clickedInstanceId;
    clientState.selectedZone = cardEl.dataset.zone;
    clientState.selectedKind = 'card';
    renderEntireBoard();
    return;
  }

  // 3. Clicked empty space — clear selection
  if (clientState.selectedInstanceId) {
    clearSelection();
    renderEntireBoard();
  }
}

function openContextMenuForCard(cardEl) {
  clientState.selectedInstanceId = cardEl.dataset.instanceId;
  clientState.selectedZone = cardEl.dataset.zone;
  clientState.selectedKind = 'card';

  renderEntireBoard();
  openActionMenu(cardEl.dataset.instanceId, cardEl.dataset.zone);
}

function handleContextMenu(e) {
  e.preventDefault();

  const cardEl = e.target.closest('.card');
  const zoneEl = e.target.closest('.zone, .hand, .table-half');

  if (zoneEl) {
    const zone = domIdToStateZone(zoneEl.id);

    if (isPileZone(zone)) {
      openPileBrowser(zone);
      return;
    }
  }

  if (cardEl) {
    openContextMenuForCard(cardEl);
  }
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

    if (zoneEl) {
      const zone = domIdToStateZone(zoneEl.id);

      if (isPileZone(zone)) {
        openPileBrowser(zone);
        return;
      }
    }

    if (cardEl) {
      openContextMenuForCard(cardEl);
    }
  }, 500);
}

function handleTouchMove() {
  cancelLongPress();
}

function handleTouchEnd() {
  cancelLongPress();
}

export function initClick() {
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
