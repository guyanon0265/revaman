import {
  undoAction,
  redoAction,
  shuffleDeck,
  toggleOpponentHand,
  openDeckBuilder,
  loadPlayerDeck,
  loadOpponentDeck,
  switchSeatView,
  flipCoin,
  setupBoard,
  discardHand,
} from './actions.js';

const buttons = {
  'btn-flip-coin': flipCoin,
  'btn-setup': setupBoard,
  'btn-mulligan': null,
  'btn-discard-hand': discardHand,

  'btn-shuffle-deck': shuffleDeck,
  'btn-shuffle-discard': null,
  'btn-deck-move-mode': null,

  'btn-show-opp-hand': toggleOpponentHand,
  'btn-switch-seat': switchSeatView,
  'btn-hide-lost-zone': null,

  'gx-btn': null,
  'vstar-btn': null,

  'btn-load-deck': loadPlayerDeck,
  'btn-load-opp-deck': loadOpponentDeck,
  'btn-load-demo-deck': () => loadPlayerDeck('demo'),
  'btn-load-opp-demo-deck': () => loadOpponentDeck('demo'),
  'btn-open-builder': openDeckBuilder,

  'btn-load-state': null,
  'btn-export-state': null,
  'btn-export-log': null,

  'btn-undo': undoAction,
  'btn-redo': redoAction,
  'btn-end-turn': null,

  'btn-reset-board': null,
  'btn-reset-game': null,
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
