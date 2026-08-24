import { initActionMenu, closeActionMenu } from './actionMenu.js';
import { initPileBrowser, closePileBrowser } from './pileBrowser.js';
import { initCardView, closeCardView } from './cardView.js';
import { initDemoDecks, closeDemoDecks } from './demoSelector.js';
import { closeViewAttached } from './viewAttached.js';
import {
  closeInformation,
  initInformationOverlay,
} from './informationPanel.js';

export function closeAllOverlays() {
  closeDemoDecks();
  closeActionMenu();
  closePileBrowser();
  closeCardView();
  closeViewAttached();
  closeInformation();
}

export function initOverlays() {
  initCardView();
  initPileBrowser();
  initActionMenu();
  initDemoDecks();
  initInformationOverlay();
}
