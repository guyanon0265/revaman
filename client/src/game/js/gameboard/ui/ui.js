import { initClick } from './click.js';
import { initOverlays } from './overlays/overlays.js';
import { initRender } from './render.js';

export function initUI() {
  initRender();
  initOverlays();
  initClick();
}
