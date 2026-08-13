import { initDeckActions } from "./gameboard/logic/loader.js";
import { initUI } from "./gameboard/ui/ui.js";

import { initPileBrowser } from "./menu/pileBrowser.js";

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initDeckActions();
    initPileBrowser();
});