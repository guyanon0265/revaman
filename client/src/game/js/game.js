import { initDeckActions } from "./gameboard/logic/loader.js";
import { initUI } from "./gameboard/ui/ui.js";

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initDeckActions();
});