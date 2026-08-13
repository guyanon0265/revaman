// menu/cardview.js — the View Card zoom overlay. Read-only: never
// mutates gameState, only displays. Selection is deliberately left
// intact when this opens (see actionmenu.js's btn-view-card handler)
// so the card stays selected underneath the overlay, same pattern as
// Attach — closing the overlay returns you to a state where the card
// is still clickable to reopen the action-menu.

import { getSelectedCard } from '../logic/state.js';

const overlayEl = document.getElementById('card-view-overlay');
const imgEl = document.getElementById('card-view-img');

export function openCardView() {
    const card = getSelectedCard();
    if (!card) return;

    imgEl.classList.remove('break-rotated');

    imgEl.src = card.imageUrl;
    imgEl.alt = card.name;
    if (card.isBreakActive) imgEl.classList.add('break-rotated');

    overlayEl.style.display = 'flex';
}

function closeCardView() {
    overlayEl.style.display = 'none';
}

function handleOverlayClick(e) {
    if (e.target === overlayEl || e.target.id === 'btn-close-card-view') {
        closeCardView();
    }
}

export function initCardView() {
    overlayEl.addEventListener('click', handleOverlayClick);
}