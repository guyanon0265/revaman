import { initUI } from './gameboard/ui/ui.js';
import { initMultiplayerPanel } from './sidebar/multiplayer/multiplayerEntry.js';
import { initSidebar } from './sidebar/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initSidebar();
  initMultiplayerPanel();
});
