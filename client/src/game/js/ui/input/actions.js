import * as lengine from '../../logic/loggingEngine.js';
import { clearSelection, runtimeState } from '../../logic/state.js';
import { refreshPileBrowser } from '../overlays/pileBrowser.js';
import { renderEntireBoard } from '../render.js';

export function drawCardFromZone(zone) {
  lengine.drawCards(zone, `${runtimeState.mySlot}-hand`, 1);

  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}
