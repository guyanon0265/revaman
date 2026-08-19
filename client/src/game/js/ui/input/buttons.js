import * as actions from './actions.js';

const buttons = {
  'btn-flip-coin': actions.flipCoin,
  'btn-setup': actions.setupBoard,
  'btn-mulligan': actions.mulligan,
  'btn-discard-hand': actions.discardHand,

  'btn-shuffle-deck': actions.shuffleDeck,
  'btn-shuffle-discard': actions.shuffleDiscardIntoDeck,
  'btn-move-deck-bottom': actions.moveToDeckBottom,

  'btn-show-opp-hand': actions.toggleOpponentHand,
  'btn-switch-seat': actions.switchSeatView,
  'btn-hide-lost-zone': actions.hideLostZone,

  'gx-btn': actions.tokenButton,
  'vstar-btn': actions.tokenButton,

  'btn-load-deck': actions.loadPlayerDeck,
  'btn-load-opp-deck': actions.loadOpponentDeck,
  'btn-load-demo-deck': () => actions.loadPlayerDeck('demo'),
  'btn-load-opp-demo-deck': () => actions.loadOpponentDeck('demo'),
  'btn-open-builder': actions.openDeckBuilder,

  'btn-load-state': null,
  'btn-export-state': null,
  'btn-export-log': null,

  'btn-undo': actions.undoAction,
  'btn-redo': actions.redoAction,
  'btn-end-turn': actions.endTurn,

  'btn-reset-board': actions.resetBoard,
  'btn-reset-game': actions.resetGame,
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
