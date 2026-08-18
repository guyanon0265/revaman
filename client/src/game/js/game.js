import { initUI } from './ui/ui.js';
import { initNetworkSync } from './networkSync.js';
import { initSidebar } from './ui/sidebar/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initSidebar();
  initNetworkSync();
});
