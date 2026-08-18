// menu/cardview.js — the View Card zoom overlay.
// Read-only: never mutates gameState or clientState.
// The caller explicitly supplies the card to display.
//
// Card View owns only its own display state. It does not infer the card
// from game selection, and it does not clear or modify any selection when
// opened or closed.

const overlayEl = document.getElementById('card-view-overlay');
const imgEl = document.getElementById('card-view-img');

let viewedCard = null;

export function openCardView(card) {
  if (!card) return;

  viewedCard = card;

  imgEl.classList.remove('break-rotated');

  imgEl.src = viewedCard.imageUrl;
  imgEl.alt = viewedCard.name;

  if (viewedCard.isBreakActive) {
    imgEl.classList.add('break-rotated');
  }

  overlayEl.style.display = 'flex';
}

export function closeCardView() {
  viewedCard = null;
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
