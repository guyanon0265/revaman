import { initUI } from './gameboard/ui/ui.js';

import { initPileBrowser } from './gameboard/ui/overlays/pileBrowser.js';
import { initCardView } from './gameboard/ui/overlays/cardView.js';
import { initSidebar } from './sidebar/initSidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initPileBrowser();
  initCardView();
  initSidebar();
});
