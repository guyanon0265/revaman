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

function handleBoardClick(e) {
  if (e.target.closest('.click-handling')) return; // menu clicks are a different domain entirely

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
  // normally mean to click a card. Checked first, before anything else.
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
      // attachCardToTarget now returns whatever actually occupies
      // targetZone post-mutation: the same card for energy/trainer
      // attaches (occupant.instanceId === targetInstanceId, a no-op
      // below), or the newly-evolved card for an evolution attach.
      const occupant = attachCardToTarget(
        clientState.selectedInstanceId,
        clientState.selectedZone,
        targetInstanceId,
        cardEl.dataset.zone
      );

      clearSelection();
      renderEntireBoard();

      // Must run BEFORE refreshViewAttached() below — this is what
      // syncs viewAttached.js's parentId on an evolution attach. If the
      // grid refreshes first, it's still looking up the old id, which
      // no longer exists at the top level (it's nested inside the new
      // card's evolutionStack now), and silently closes instead of
      // showing the updated attachments.
      if (occupant) notifyCardReplaced(targetInstanceId, targetZone, occupant);

      refreshViewAttached();

      return;
    }
  }

  // 1. If a card is already selected and we click a DIFFERENT zone (or a card inside a different zone)
  if (clientState.selectedInstanceId && zoneEl) {
    const targetZone = domIdToStateZone(zoneEl.id);

    // Only move if it's a different zone than where the card currently is
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

    clientState.selectedInstanceId = cardEl.dataset.instanceId;
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
    clientState.selectedInstanceId = cardEl.dataset.instanceId;
    clientState.selectedZone = cardEl.dataset.zone;
    clientState.selectedKind = 'card';

    renderEntireBoard();
    openActionMenu(cardEl.dataset.instanceId, cardEl.dataset.zone);
  }
}

export function initClick() {
  document.addEventListener('click', handleBoardClick);
  document.addEventListener('contextmenu', handleContextMenu);
}
