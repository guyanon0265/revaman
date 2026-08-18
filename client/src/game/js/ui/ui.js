import { initInput } from './input/input.js';
import { initOverlays } from './overlays/overlays.js';
import { initRender } from './render.js';
import { initSidebar } from './sidebar/sidebar.js';

export function initUI() {
  initRender();
  initOverlays();
  initInput();
  initSidebar();
}
