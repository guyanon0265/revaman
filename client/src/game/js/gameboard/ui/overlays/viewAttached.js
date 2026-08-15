// gameboard/ui/overlays/viewAttached.js
//
// View Attached is a specialized grid, living inside #action-menu's own
// view-attached-tab, showing the attachments of one root card.
//
// The root card id/zone are passed in explicitly by actionmenu.js (which
// captures them from clientState exactly once when the Action Menu opens)
// rather than read from clientState here. This module has no dependency
// on clientState at all.
//
// Attachment thumbnails behave like pile browser thumbnails: click to
// select (temporarily swaps Card View to that attachment), click again
// to deselect. The difference from the standalone pile browser is what
// deselecting does — here it REVERTS Card View back to the root card
// rather than closing it, since the Action Menu keeps Card View open for
// as long as the menu itself is open.

import { gameState } from '../../logic/state.js';
import { renderBrowserGrid } from './pileBrowser.js';
import { openCardView } from './cardView.js';

const gridEl = document.getElementById('view-attached-grid');

let parentId = null;
let parentZone = null;
let overrideActive = false; // true while an attachment is temporarily shown in Card View

function getParentCard() {
  if (!parentId || !parentZone) return null;

  return gameState.zones[parentZone]?.find((card) => card.instanceId === parentId) || null;
}

function getAttachedCards() {
  const card = getParentCard();

  if (!card) {
    return {
      evolution: [],
      trainers: [],
      energy: [],
    };
  }

  return {
    evolution: card.evolutionStack || [],
    trainers: card.trainerAttachments || [],
    energy: card.energyAttachments || [],
  };
}

function renderAttachedGrid() {
  const attachments = getAttachedCards();

  renderBrowserGrid(
    gridEl,
    [
      { label: 'Evolutions', cards: attachments.evolution },
      { label: 'Trainers', cards: attachments.trainers },
      { label: 'Energy', cards: attachments.energy },
    ],
    {
      onSelect: (card) => {
        overrideActive = true;
        openCardView(card);
      },
      onDeselect: () => {
        overrideActive = false;
        const root = getParentCard();
        if (root) openCardView(root);
      },
      // No onContextMenu — View Attached does not support moving
      // attachments to hand.
    }
  );
}

export function openViewAttached(cardId, zone) {
  parentId = cardId;
  parentZone = zone;

  if (!parentId || !parentZone) return;

  const card = getParentCard();

  if (!card) {
    parentId = null;
    parentZone = null;
    return;
  }

  overrideActive = false;
  renderAttachedGrid();
}

export function refreshViewAttached() {
  if (!parentId || !parentZone) return;

  const card = getParentCard();

  if (!card) {
    closeViewAttached();
    return;
  }

  renderAttachedGrid();
}

// Called when navigating away from the View Attached tab back to
// Controls, while the Action Menu itself stays open. If an attachment
// was temporarily overriding Card View, this puts the root card back.
export function revertViewAttachedSelection() {
  if (!overrideActive) return;

  overrideActive = false;
  const root = getParentCard();
  if (root) openCardView(root);
}

export function closeViewAttached() {
  parentId = null;
  parentZone = null;
  overrideActive = false;
}
