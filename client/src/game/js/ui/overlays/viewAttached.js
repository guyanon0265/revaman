import { gameState } from '../../logic/state.js';
import { renderBrowserGrid } from '../../utils.js';
import { openCardView } from './cardView.js';
import { detachCard, devolveCard } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';

const gridEl = document.getElementById('view-attached-grid');

let parentId = null;
let parentZone = null;
let overrideActive = false;
let onRootChanged = null;

function getParentCard() {
  if (!parentId || !parentZone) return null;

  return (
    gameState.zones[parentZone]?.find((card) => card.instanceId === parentId) ||
    null
  );
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

export function handleAttachedCardAction(card, section) {
  if (!parentId || !parentZone) return;

  if (section.kind === 'evolution') {
    const promoted = devolveCard(parentId, parentZone, card.instanceId);

    if (promoted) {
      parentId = promoted.instanceId;
      onRootChanged?.(promoted);
    }
  } else {
    const handZone = parentZone.split('-')[0] + '-hand';

    detachCard(parentId, parentZone, card.instanceId, section.kind, handZone);
  }

  overrideActive = false;
  renderAttachedGrid();
  renderEntireBoard();

  const root = getParentCard();
  if (root) openCardView(root);
}

function renderAttachedGrid() {
  const attachments = getAttachedCards();

  renderBrowserGrid(
    gridEl,
    [
      {
        label: 'Evolutions',
        kind: 'evolution',
        cards: attachments.evolution,
      },
      {
        label: 'Trainers',
        kind: 'trainer',
        cards: attachments.trainers,
      },
      {
        label: 'Energy',
        kind: 'energy',
        cards: attachments.energy,
      },
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

      onContextMenu: handleAttachedCardAction,
      onLongPress: handleAttachedCardAction,
    }
  );
}

export function openViewAttached(cardId, zone, rootChangedCallback) {
  parentId = cardId;
  parentZone = zone;
  onRootChanged = rootChangedCallback || null;

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

export function revertViewAttachedSelection() {
  if (!overrideActive) return;

  overrideActive = false;
  const root = getParentCard();
  if (root) openCardView(root);
}

export function syncRootIdentity(oldId, zone, newCard) {
  if (!newCard) return;
  if (parentId === oldId && parentZone === zone) {
    parentId = newCard.instanceId;
  }
}

export function closeViewAttached() {
  parentId = null;
  parentZone = null;
  overrideActive = false;
  onRootChanged = null;
}
