import { initGameActions } from "./gameActions.js"
import { initDeckActions } from "./deckActions.js"; 
import { initSoloActions } from "./soloActions.js";
import { initStateActions } from "./stateActions.js";
import { initResetActions } from "./resetActions.js"

export function initActions() {
    initGameActions();
    initDeckActions();
    initSoloActions();
    initStateActions();
    initResetActions();
}