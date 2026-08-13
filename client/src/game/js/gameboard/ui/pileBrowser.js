// gameboard/pilebrowser.js — the full-screen grid overlay, shared by
// the pile browser (deck/discard/lost-zone View buttons) and View
// Attached. renderBrowserGrid takes sections so both callers can use
// it: pile browser passes one unlabeled section, View Attached passes
// three labeled ones. Clicking a thumbnail does NOT close this overlay
// — #browser-menu is a small floating panel that opens on top of it,
// so canceling out of that panel naturally reveals the grid again.

import { gameState, clientState } from '../logic/state.js';
import { ZONE_LABELS } from '../../utils.js';
//import { openBrowserMenu } from '../../menu/browserMenu.js';

const browserEl = document.getElementById('pile-browser');
const titleEl = document.getElementById('pile-browser-title');
const countEl = document.getElementById('pile-browser-count');
const gridEl = document.getElementById('pile-browser-grid');

let currentZone = null;

// sections: [{ label: string|null, cards: [] }, ...]. Empty sections
// are skipped entirely rather than rendered as an empty labeled group.
export function renderBrowserGrid(title, count, sections, onCardClick) {
    titleEl.textContent = title;
    countEl.textContent = count;
    gridEl.innerHTML = '';
    sections.forEach(section => {
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
        section.cards.forEach(card => {
            const img = document.createElement('img');
            img.className = 'pile-browser-thumbnail';
            img.src = card.imageUrl;
            img.alt = card.name;
            img.draggable = false;
            img.addEventListener('click', () => onCardClick(card));
            grid.appendChild(img);
        });
        wrap.appendChild(grid);
        gridEl.appendChild(wrap);
    });
}

function renderGrid() {
    if (!currentZone) return;
    const cards = [...(gameState.zones[currentZone] || [])].reverse(); // top-first, LIFO
    renderBrowserGrid(
        ZONE_LABELS[currentZone] || currentZone,
        `${cards.length} card${cards.length === 1 ? '' : 's'}`,
        [{ label: null, cards }],
        openInPileCardMenu
    );
}

function openInPileCardMenu(card) {
    clientState.selectedInstanceId = card.instanceId;
    clientState.selectedZone = currentZone;
    clientState.selectedKind = 'card';
    clientState.selectedParentId = null;
    //openBrowserMenu('in-pile-card-menu', reopenIfActive);
}

function reopenIfActive() {
    if (currentZone) renderGrid();
}

export function openPileBrowser(zone) {
    currentZone = zone;
    renderGrid();
    browserEl.classList.remove('collapsed');
}

export function closePileBrowser() {
    browserEl.classList.add('collapsed');
    currentZone = null;
}

export function initPileBrowser() {
    document.getElementById('btn-pile-browser-close').addEventListener('click', closePileBrowser);
}