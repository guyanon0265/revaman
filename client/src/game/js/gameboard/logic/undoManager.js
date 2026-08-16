// gameboard/logic/undoManager.js — snapshot-based undo/redo.
//
// pushSnapshot() deep-clones gameState.zones and pushes it onto the undo
// stack. It's called by loggingEngine.js immediately before each logical
// action's first mutation — see loggingEngine.js for exactly where. Any
// code that calls engine.js functions directly, bypassing
// loggingEngine.js, will not be captured by undo. There should be no
// such call sites; if one appears later, it needs a pushSnapshot() too.
//
// undo()/redo() replace the CONTENTS of gameState.zones (gameState.zones
// = snapshot) rather than reassigning gameState itself. Every module
// that reads game state imports the `gameState` binding and reads
// `gameState.zones[...]` fresh on each access — nothing caches a
// separate reference to the zones object — so this is safe.
//
// A no-op action (e.g. clicking a card that's already gone) still pushes
// a snapshot before finding out it was a no-op, since success isn't
// known until after the mutation attempt. This leaves a harmless
// "undoes to an identical state" entry on the stack rather than nothing
// — a minor accepted tradeoff, not a correctness issue.
//
// undo()/redo() also emit through stateChangeBus.js on a successful
// restore — if I undo locally and never tell the other client, my
// gameState.zones has now diverged from theirs, with nothing to correct
// that until some unrelated future action's own broadcast silently
// overwrote their view with my already-rewound state anyway.
// Broadcasting the rewind explicitly is both more correct and more
// honest about what actually happened.

import { gameState } from './state.js';
import { emitStateChanged } from './stateChangeBus.js';

const undoStack = [];
const redoStack = [];

export function pushSnapshot() {
  undoStack.push(structuredClone(gameState.zones));
  redoStack.length = 0;
}

export function undo() {
  if (undoStack.length === 0) return false;

  redoStack.push(structuredClone(gameState.zones));
  gameState.zones = undoStack.pop();
  emitStateChanged(); // a local rewind is shared-state-worthy too — see file header
  return true;
}

export function redo() {
  if (redoStack.length === 0) return false;

  undoStack.push(structuredClone(gameState.zones));
  gameState.zones = redoStack.pop();
  emitStateChanged();
  return true;
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}
