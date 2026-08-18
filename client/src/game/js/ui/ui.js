import { initClick } from './input/click.js';
import { initKeybinds } from './input/keybinds.js';
import { initOverlays } from './overlays/overlays.js';
import { initRender } from './render.js';

export function initUI() {
  initRender();
  initOverlays();
  initClick();
  initKeybinds();
}
