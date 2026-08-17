import { loadDeck } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';

const menuEl = document.getElementById('demo-deck-selector');

let targetSlot = null;

export function openDemoDecks(slot) {
  targetSlot = slot;
  menuEl.style.display = 'flex';
}

export function closeDemoDecks() {
  menuEl.style.display = 'none';
  targetSlot = null;
}

async function loadDemoDeck(deckId) {
  const response = await fetch(`../assets/demo_decks/${deckId}.csv`);

  if (!response.ok) {
    throw new Error(`Failed to load demo deck: ${deckId}`);
  }

  return response.text();
}

function handleDeckSelectorClick(e) {
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
  menuEl.addEventListener('click', handleDeckSelectorClick);
}
