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
import { ZONE_LABELS } from '../../../utils.js';
import { openCardView, closeCardView } from './cardView.js';
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
// options: { onSelect(card), onDeselect(card), onContextMenu(card) }
//
// Empty sections are skipped entirely. Selecting a thumbnail highlights it
// and deselects any previously-selected thumbnail in this grid; clicking
// the already-selected thumbnail deselects it.
export function renderBrowserGrid(targetGridEl, sections, options = {}) {
  const { onSelect, onDeselect, onContextMenu } = options;

  targetGridEl.innerHTML = '';

  let selectedImg = null;

  sections.forEach((section) => {
    if (section.cards.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'browser-section';

    if (section.label) {
      const heading = document.createElement('div');
      heading.className = 'browser-section-label';
      heading.textContent = section.label;
      wrap.appendChild(heading);
    }

    const grid = document.createElement('div');
    grid.className = 'browser-section-grid';

    section.cards.forEach((card) => {
      const img = document.createElement('img');
      img.className = 'browser-thumbnail';
      img.src = card.imageUrl;
      img.alt = card.name;
      img.draggable = false;

      img.addEventListener('click', () => {
        if (selectedImg === img) {
          img.classList.remove('selected');
          selectedImg = null;
          onDeselect?.(card);
          return;
        }

        if (selectedImg) selectedImg.classList.remove('selected');

        img.classList.add('selected');
        selectedImg = img;
        onSelect?.(card);
      });

      img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        onContextMenu?.(card);
      });

      grid.appendChild(img);
    });

    wrap.appendChild(grid);
    targetGridEl.appendChild(wrap);
  });
}

function renderPileGrid() {
  if (!currentZone) return;
  const cards = [...(gameState.zones[currentZone] || [])].reverse(); // top-first, LIFO

  titleEl.textContent = ZONE_LABELS[currentZone] || currentZone;
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
  document.getElementById('btn-pile-browser-close').addEventListener('click', closePileBrowser);
}
