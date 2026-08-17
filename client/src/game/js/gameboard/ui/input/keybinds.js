import { shuffleZone } from '../../logic/loggingEngine.js';
import { getSelectedCard, runtimeState } from '../../logic/state.js';

export function initKeybinds() {
  window.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  const card = getSelectedCard();

  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();

    shuffleZone(`${runtimeState.mySlot}-deck`);
  }

  if (e.key === 'Delete') {
    //TODO: Need to abstract click.js to have both options
  }
}
