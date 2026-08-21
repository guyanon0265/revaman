import * as ovactions from '../overlays/overlayActions.js';
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

  'btn-load-state': actions.loadState,
  'btn-export-state': actions.exportState,
  'btn-export-log': actions.exportLog,

  'btn-undo': actions.undoAction,
  'btn-redo': actions.redoAction,
  'btn-end-turn': actions.endTurn,

  'btn-reset-board': actions.resetBoard,
  'btn-reset-game': actions.resetGame,
};

const actionMenuButtons = {
  'btn-dmg-up': () => ovactions.applyDamage(10, 'menu'),
  'btn-dmg-down': () => ovactions.applyDamage(-10, 'menu'),
  'btn-counter-up': () => ovactions.applyCounter(1, 'menu'),
  'btn-counter-down': () => ovactions.applyCounter(-1, 'menu'),
  'btn-ability': ovactions.applyAbilityUsed('menu'),
  'btn-rotate-left': () => ovactions.applyRotation(-90),
  'btn-rotate-right': () => ovactions.applyRotation(90),
  'btn-rotate-invert': () => ovactions.applyRotation(180),
  'btn-rotate-upright': () => ovactions.applyRotation(0),
  'btn-rotate-break': null,
  'btn-flip': () => ovactions.applyFlip('menu'),
};

function bindButtons(buttonMap) {
  for (const [buttonId, action] of Object.entries(buttonMap)) {
    const button = document.getElementById(buttonId);

    if (!button) continue;

    button.addEventListener('click', action);
  }
}

function bindStatusChips() {
  document.querySelectorAll('#markers-section .status-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      ovactions.applyStatus(chip.dataset.status, 'menu');
    });
  });
}

export function initButtons() {
  bindButtons(buttons);
  bindButtons(actionMenuButtons);
  bindStatusChips();
}
