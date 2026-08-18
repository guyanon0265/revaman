import { initButtons } from './buttons.js';
import { initClicks } from './clicks.js';
import { initKeybinds } from './keybinds.js';

export function initInput() {
  initClicks();
  initKeybinds();
  initButtons();
}
