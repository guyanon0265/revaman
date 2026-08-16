// gameboard/logic/stateChangeBus.js — minimal pub-sub between "something
// mutated gameState" (loggingEngine.js, undoManager.js) and "something
// wants to know" (currently: multiplayer/networkSync.js).
//
// Deliberately dependency-free — a leaf module. loggingEngine.js and
// undoManager.js both import from here; neither needs to know WHO's
// listening or why. This is what keeps multiplayer entirely optional/
// pluggable rather than baked into the dispatch layer itself — in
// solo mode, nothing ever calls onStateChanged(), so emitStateChanged()
// just iterates an empty array and does nothing.

const listeners = [];

export function onStateChanged(callback) {
  listeners.push(callback);
}

export function emitStateChanged() {
  listeners.forEach((cb) => cb());
}
