import { initActionMenu, closeActionMenu } from './actionMenu.js';
import { initPileBrowser, closePileBrowser } from './pileBrowser.js';
import { initCardView, closeCardView } from './cardView.js';
import { initDemoDecks, closeDemoDecks } from './demoSelector.js';
import { closeViewAttached } from './viewAttached.js';

export function closeAllOverlays() {
  closeDemoDecks();
  closeActionMenu();
  closePileBrowser();
  closeCardView();
  closeViewAttached();
}

export function initOverlays() {
  initCardView();
  initPileBrowser();
  initActionMenu();
  initDemoDecks();
}
