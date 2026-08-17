import { loadDeck } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';

const overlayEl = document.getElementById('demo-deck-selector');

let targetSlot = null;

export function openDemoDecks(slot) {
  targetSlot = slot;
  overlayEl.style.display = 'flex';
}

export function closeDemoDecks() {
  overlayEl.style.display = 'none';
  targetSlot = null;
}

async function loadDemoDeck(deckId) {
  const response = await fetch(`../assets/demo_decks/${deckId}.csv`);

  if (!response.ok) {
    throw new Error(`Failed to load demo deck: ${deckId}`);
  }

  return response.text();
}

function handleOverlayClick(e) {
  if (e.target === overlayEl) {
    closeDemoDecks();
    return;
  }

  if (e.target.closest('#btn-demo-decks-close')) {
    closeDemoDecks();
    return;
  }

  const demoDeck = e.target.closest('.demo-card');

  if (!demoDeck) return;

  handleDemoDeckClick(demoDeck);
}

async function handleDemoDeckClick(demoDeck) {
  try {
    const csv = await loadDemoDeck(demoDeck.id);

    loadDeck(csv, targetSlot);
    renderEntireBoard();
    closeDemoDecks();
  } catch (err) {
    console.error('Failed to load demo deck:', err);
  }
}

export function initDemoSelector() {
  overlayEl.addEventListener('click', handleOverlayClick);
}
