import { initDeckActions } from "./gameboard/logic/loader.js";
import { initUI } from "./gameboard/ui/ui.js";

import { initPileBrowser } from "./gameboard/ui/overlays/pileBrowser.js";
import { initCardView } from "./gameboard/ui/overlays/cardZoom.js";
import { initSiderbar } from "./sidebar/sidebar.js";

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initDeckActions();
    initPileBrowser();
    initCardView();
    initSiderbar();
});