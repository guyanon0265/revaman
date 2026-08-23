import { initUI } from './ui/ui.js';
import { initNetworkSync } from './networkSync.js';
import { initPersistence, loadPersistedState } from './logic/persistence.js';

document.addEventListener('DOMContentLoaded', () => {
  loadPersistedState();
  initUI();
  initNetworkSync();
  initPersistence();
});
