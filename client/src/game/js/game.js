import { initUI } from './ui/ui.js';
import { initNetworkSync } from './networkSync.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initNetworkSync();
});
