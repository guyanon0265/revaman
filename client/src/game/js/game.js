import { initUI } from './ui/ui.js';
import { initNetworkSync } from './networkSync.js';
import { initPersistence } from './logic/persistence.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initNetworkSync();
  initPersistence();
});
