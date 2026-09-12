import { gameState } from '../../logic/state.js';
import { renderBrowserGrid, PILE_ZONE_LABELS } from '../../utils.js';
import { openCardView, closeCardView } from './cardView.js';
import { moveCardToZone } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';

const browserEl = document.getElementById('pile-browser');
const titleEl = document.getElementById('pile-browser-title');
const countEl = document.getElementById('pile-browser-count');
const gridEl = document.getElementById('pile-browser-grid');

let currentZone = null;

export function handlePileCardAction(card) {
  moveCardToZone(card.instanceId, currentZone, `${card.owner}-hand`);
  closeCardView();
  renderPileGrid();
  renderEntireBoard();
}

function renderPileGrid() {
  if (!currentZone) return;
  const cards = [...(gameState.zones[currentZone] || [])].reverse();

  titleEl.textContent = PILE_ZONE_LABELS[currentZone] || currentZone;
  countEl.textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;

  renderBrowserGrid(gridEl, [{ label: null, cards }], {
    onSelect: (card) => openCardView(card),
    onDeselect: () => closeCardView(),
    onContextMenu: (card) => handlePileCardAction(card),
    onLongPress: (card) => handlePileCardAction(card),
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
