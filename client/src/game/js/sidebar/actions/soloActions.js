import { runtimeState } from '../../gameboard/logic/state.js';
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
      if (btnShowOppHand.textContent === 'Show Opponent Hand') {
        btnShowOppHand.textContent = 'Hide Opponent Hand';
      } else {
        btnShowOppHand.textContent = 'Show Opponent Hand';
      }
    });
  }
}
