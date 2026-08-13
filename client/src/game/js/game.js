import { initDeckActions } from "./gameboard/logic/loader.js";
import { initUI } from "./gameboard/ui/ui.js";

import { initPileBrowser } from "./gameboard/ui/pileBrowser.js";
import { initCardView } from "./gameboard/ui/cardZoom.js";

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initDeckActions();
    initPileBrowser();
    initCardView();
});