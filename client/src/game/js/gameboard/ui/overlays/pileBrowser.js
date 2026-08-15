// gameboard/ui/overlays/pileBrowser.js — shared card-browser grid plus the
// standalone pile browser.
//
// renderBrowserGrid() is context-free: callers supply the target grid
// element, the sections to render, and onSelect/onDeselect/onContextMenu
// callbacks. It owns click-to-select/click-again-to-deselect highlighting
// internally (via the .selected class) but has no opinion on what select
// or deselect *means* — that's entirely up to the caller. This lets the
// standalone pile browser (deselect = close Card View) and View Attached
// (deselect = revert Card View to the root card) share the same grid and
// highlight mechanics while differing on what a deselect does.
//
// Neither this module nor its callers write to clientState. Card View
// takes its card as an explicit argument and moveCardToZone takes an
// explicit instanceId/zone, so nothing here needs — or should touch —
// the board's selection state.

import { gameState } from '../../logic/state.js';
import { renderBrowserGrid, PILE_ZONE_LABELS } from '../../../utils.js';
import { openCardView, closeCardView } from './cardView.js';
import { moveCardToZone } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';

const browserEl = document.getElementById('pile-browser');
const titleEl = document.getElementById('pile-browser-title');
const countEl = document.getElementById('pile-browser-count');
const gridEl = document.getElementById('pile-browser-grid');

let currentZone = null;

function renderPileGrid() {
  if (!currentZone) return;
  const cards = [...(gameState.zones[currentZone] || [])].reverse(); // top-first, LIFO

  titleEl.textContent = PILE_ZONE_LABELS[currentZone] || currentZone;
  countEl.textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;

  renderBrowserGrid(gridEl, [{ label: null, cards }], {
    onSelect: (card) => openCardView(card),
    onDeselect: () => closeCardView(),
    onContextMenu: (card) => {
      moveCardToZone(card.instanceId, currentZone, `${card.owner}-hand`);
      renderPileGrid();
      renderEntireBoard();
    },
  });
}

export function openPileBrowser(zone) {
  currentZone = zone;
  renderPileGrid();
  browserEl.classList.remove('collapsed');
}

export function closePileBrowser() {
  browserEl.classList.add('collapsed');
  currentZone = null;

  // Whatever Card View was showing (opened by selecting a thumbnail)
  // has nowhere left to hang once the browser it came from is gone.
  closeCardView();
}

export function refreshPileBrowser() {
  if (!currentZone) return;
  renderPileGrid();
}

export function initPileBrowser() {
  document
    .getElementById('btn-pile-browser-close')
    .addEventListener('click', closePileBrowser);
}
