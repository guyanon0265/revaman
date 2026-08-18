import { runtimeState } from '../../../logic/state.js';
import { openDemoDecks } from '../../../ui/overlays/demoSelector.js';
import { renderEntireBoard } from '../../../ui/render.js';
import { promptForCSV } from './deckActions.js';

export function initSoloActions() {
  const btnLoadOppDeck = document.getElementById('btn-load-opp-deck');
  const btnLoadOppDemoDeck = document.getElementById('btn-load-opp-demo-deck');
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
