import { undo, redo } from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';
import { shuffleZone } from '../../logic/loggingEngine.js';
import { clientState, runtimeState } from '../../logic/state.js';
import { requestRedo, requestUndo } from '../../networkSync.js';
import { closeAllOverlays } from '../overlays/overlays.js';

export function initButtons() {
  const btnShuffleDeck = document.getElementById('btn-shuffle-deck');
  const btnShuffleDiscard = document.getElementById('btn-shuffle-discard');
  const btnDeckMoveMode = document.getElementById('btn-deck-move-mode');
  const btnFlipCoin = document.getElementById('btn-flip-coin');
  const btnSetup = document.getElementById('btn-setup');
  const btnMulligan = document.getElementById('btn-mulligan');
  const btnShowOppHand = document.getElementById('btn-show-opp-hand');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  if (btnShuffleDeck) {
    btnShuffleDeck.addEventListener('click', () => {
      shuffleZone(`${runtimeState.mySlot}-deck`);
    });
  }

  if (btnSetup) {
    btnSetup.addEventListener('click', () => {
      console.log('Set Up clicked');
    });
  }

  if (btnShowOppHand) {
    btnShowOppHand.addEventListener('click', () => {
      clientState.showOpponentHand = !clientState.showOpponentHand;

      btnShowOppHand.textContent = clientState.showOpponentHand
        ? 'Hide Opponent Hand'
        : 'Show Opponent Hand';

      renderEntireBoard();
    });
  }

  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      if (runtimeState.mode === 'multiplayer') {
        requestUndo();
        return;
      }
      if (undo()) {
        closeAllOverlays();
        renderEntireBoard();
      }
    });
  }

  if (btnRedo) {
    btnRedo.addEventListener('click', () => {
      if (runtimeState.mode === 'multiplayer') {
        requestRedo();
        return;
      }
      if (redo()) {
        closeAllOverlays();
        renderEntireBoard();
      }
    });
  }
}
