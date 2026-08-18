import { initUI } from './gameboard/ui/ui.js';
import { initNetworkSync } from './networkSync.js';
import { initSidebar } from './sidebar/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initSidebar();
  initNetworkSync();
});
