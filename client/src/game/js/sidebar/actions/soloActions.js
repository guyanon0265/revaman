import { clientState, runtimeState } from '../../gameboard/logic/state.js';
import { renderEntireBoard } from '../../gameboard/ui/render.js';
import { promptForCSVAndParse } from './deckActions.js';

export function initSoloActions() {
  const btnLoadOppDeck = document.getElementById('btn-load-opp-deck');
  const btnShowOppHand = document.getElementById('btn-show-opp-hand');
  // Switch Seat

  if (btnLoadOppDeck) {
    btnLoadOppDeck.addEventListener('click', () => {
      promptForCSVAndParse(runtimeState.oppSlot);
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
}
