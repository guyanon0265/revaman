import { initClick } from './click.js';
import { initRender } from './render.js';
import { initActionMenu } from './overlays/actionMenu.js';
import { initCardView } from './overlays/cardView.js';
import { initPileBrowser } from './overlays/pileBrowser.js';
import { initDemoSelector } from './overlays/demoSelector.js';

export function initUI() {
  initRender();
  initCardView();
  initPileBrowser();
  initActionMenu();
  initDemoSelector();
  initClick();
}
