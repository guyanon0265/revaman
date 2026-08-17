import { undo, redo } from '../../gameboard/logic/loggingEngine.js';
import { renderEntireBoard } from '../../gameboard/ui/render.js';
import { closeActionMenu } from '../../gameboard/ui/overlays/actionMenu.js';
import { closePileBrowser } from '../../gameboard/ui/overlays/pileBrowser.js';
import { closeCardView } from '../../gameboard/ui/overlays/cardView.js';
import { shuffleZone } from '../../gameboard/logic/loggingEngine.js';
import { clientState, runtimeState } from '../../gameboard/logic/state.js';
import { requestRedo, requestUndo } from '../../networkSync.js';

export function closeAllOverlays() {
  closeActionMenu();
  closePileBrowser();
  closeCardView();
}

export function initGameActions() {
  const btnShuffleDeck = document.getElementById('btn-shuffle-deck');
  const btnSetup = document.getElementById('btn-setup');
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
