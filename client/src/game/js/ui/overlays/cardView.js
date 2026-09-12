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

export function toggleCardView(card) {
  const isOpen = overlayEl.style.display === 'flex';

  if (isOpen) {
    closeCardView();
  } else {
    openCardView(card);
  }
}

function handleOverlayClick(e) {
  if (e.target === overlayEl || e.target.id === 'btn-close-card-view') {
    closeCardView();
  }
}

export function initCardView() {
  overlayEl.addEventListener('click', handleOverlayClick);
}
