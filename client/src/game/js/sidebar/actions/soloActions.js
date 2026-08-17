import { clientState, runtimeState } from '../../gameboard/logic/state.js';
import { openDemoDecks } from '../../gameboard/ui/overlays/demoSelector.js';
import { renderEntireBoard } from '../../gameboard/ui/render.js';
import { promptForCSV } from './deckActions.js';

export function initSoloActions() {
  const btnLoadOppDeck = document.getElementById('btn-load-opp-deck');
  const btnLoadOppDemoDeck = document.getElementById('btn-load-opp-demo-deck');
  const btnShowOppHand = document.getElementById('btn-show-opp-hand');
  const btnSwitchSeat = document.getElementById('btn-switch-seat');

  if (btnLoadOppDeck) {
    btnLoadOppDeck.addEventListener('click', () => {
      promptForCSV(runtimeState.oppSlot);
    });
  }

  if (btnLoadOppDemoDeck) {
    btnLoadOppDemoDeck.addEventListener('click', () => {
      openDemoDecks(runtimeState.oppSlot);
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

  if (btnSwitchSeat) {
    btnSwitchSeat.addEventListener('click', () => {
      if (runtimeState.mode !== 'solo') return;

      const oldMySlot = runtimeState.mySlot;

      runtimeState.mySlot = runtimeState.oppSlot;
      runtimeState.oppSlot = oldMySlot;

      renderEntireBoard();
    });
  }
}
