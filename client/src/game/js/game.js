import { initDeckActions } from "./gameboard/logic/loader.js";
import { initUI } from "./gameboard/ui/render.js";

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    initDeckActions();
});