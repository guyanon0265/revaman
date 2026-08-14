// gameboard/pilebrowser.js — shared card-browser grid plus the standalone
// pile browser.
//
// The grid renderer is intentionally context-free: callers provide the
// sections and interaction handlers. The standalone pile browser owns its
// own title/count header. View Attached can reuse the same grid without
// inheriting pile-browser semantics.

import { gameState, clientState, clearSelection } from '../../logic/state.js';
import { ZONE_LABELS } from '../../../utils.js';
import { openCardView } from './cardView.js';
import { moveCardToZone } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';

const browserEl = document.getElementById('pile-browser');
const titleEl = document.getElementById('pile-browser-title');
const countEl = document.getElementById('pile-browser-count');
const gridEl = document.getElementById('pile-browser-grid');

let currentZone = null;

// ---------------------------------------------------------------------------
// Shared browser grid
// ---------------------------------------------------------------------------
//
// sections: [{ label: string|null, cards: [] }, ...]
//
// Empty sections are skipped entirely.
//
// This function deliberately knows nothing about whether the cards came from
// a pile, attachments, or anything else. The caller supplies the sections
// and interaction handlers.
export function renderBrowserGrid(sections, onCardClick, onCardContextMenu) {
  gridEl.innerHTML = '';
  sections.forEach((section) => {
    if (section.cards.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'pile-browser-section';

    if (section.label) {
      const heading = document.createElement('div');
      heading.className = 'pile-browser-section-label';
      heading.textContent = section.label;
      wrap.appendChild(heading);
    }

    const grid = document.createElement('div');
    grid.className = 'pile-browser-section-grid';
    section.cards.forEach((card) => {
      const img = document.createElement('img');
      img.className = 'pile-browser-thumbnail';
      img.src = card.imageUrl;
      img.alt = card.name;
      img.draggable = false;
      img.addEventListener('click', () => onCardClick(card));
      img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        onCardContextMenu(card);
      });
      grid.appendChild(img);
    });
    wrap.appendChild(grid);
    gridEl.appendChild(wrap);
  });
}

function renderPileGrid() {
  if (!currentZone) return;
  const cards = [...(gameState.zones[currentZone] || [])].reverse(); // top-first, LIFO

  titleEl.textContent = ZONE_LABELS[currentZone] || currentZone;
  countEl.textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;

  renderBrowserGrid([{ label: null, cards }], handleBrowserCardClick, handleBrowserCardContextMenu);
}

function selectBrowserCard(card) {
  clientState.selectedInstanceId = card.instanceId;
  clientState.selectedZone = currentZone;
  clientState.selectedKind = 'card';
  clientState.selectedParentId = null;
}

function handleBrowserCardClick(card) {
  selectBrowserCard(card);
  openCardView(card);
  clearSelection();
}

function handleBrowserCardContextMenu(card) {
  selectBrowserCard(card);
  moveCardToZone(card.instanceId, currentZone, `${card.owner}-hand`);
  clearSelection();
  renderPileGrid();
  renderEntireBoard();
}

export function openPileBrowser(zone) {
  currentZone = zone;
  renderPileGrid();
  browserEl.classList.remove('collapsed');
}

export function closePileBrowser() {
  browserEl.classList.add('collapsed');
  currentZone = null;
}

export function refreshPileBrowser() {
  if (!currentZone) return;
  renderPileGrid();
}

export function initPileBrowser() {
  document.getElementById('btn-pile-browser-close').addEventListener('click', closePileBrowser);
}
