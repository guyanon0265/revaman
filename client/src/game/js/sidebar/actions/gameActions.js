import { undo, redo } from '../../gameboard/logic/loggingEngine.js';
import { renderEntireBoard } from '../../gameboard/ui/render.js';
import { closeActionMenu } from '../../gameboard/ui/overlays/actionMenu.js';
import { closePileBrowser } from '../../gameboard/ui/overlays/pileBrowser.js';
import { closeCardView } from '../../gameboard/ui/overlays/cardView.js';
import { shuffleZone } from '../../gameboard/logic/loggingEngine.js';
import { clientState, runtimeState } from '../../gameboard/logic/state.js';

// Undo/redo can jump gameState around far more drastically than any
// single action we sync incrementally elsewhere (devolve, evolve) — a
// snapshot restore isn't "one card changed," it can be an arbitrary
// prior moment. Any open overlay may now be bound to a card, zone, or
// board state that no longer exists or means something different.
// Rather than trying to re-resolve every open panel against that
// arbitrary prior state, close everything and let the board render
// fresh. Calling all three is deliberately redundant where they overlap
// (closeActionMenu() already closes Card View itself, closePileBrowser()
// does too) — each call is a cheap no-op if that overlay wasn't open.
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
      if (undo()) {
        closeAllOverlays();
        renderEntireBoard();
      }
    });
  }

  if (btnRedo) {
    btnRedo.addEventListener('click', () => {
      if (redo()) {
        closeAllOverlays();
        renderEntireBoard();
      }
    });
  }
}
