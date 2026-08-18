import {
  undoAction,
  redoAction,
  shuffleDeck,
  toggleOpponentHand,
  openDeckBuilder,
} from './actions.js';

const buttons = {
  'btn-shuffle-deck': shuffleDeck,
  'btn-show-opp-hand': toggleOpponentHand,
  'btn-open-builder': openDeckBuilder,
  'btn-undo': undoAction,
  'btn-redo': redoAction,
};

export function initButtons() {
  for (const [buttonId, action] of Object.entries(buttons)) {
    const button = document.getElementById(buttonId);

    if (!button) {
      continue;
    }

    button.addEventListener('click', action);
  }
}
