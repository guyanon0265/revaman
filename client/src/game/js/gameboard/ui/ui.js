import { initClick } from './click.js';
import { initRender } from './render.js';
import { initActionMenu } from './overlays/actionMenu.js';
import { initCardView } from './overlays/cardView.js';
import { initPileBrowser } from './overlays/pileBrowser.js';

export function initUI() {
  initRender();
  initCardView();
  initPileBrowser();
  initActionMenu();
  initClick();
}
