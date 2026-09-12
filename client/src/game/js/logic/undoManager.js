import { gameState, runtimeState } from './state.js';
import { emitStateChanged } from './network/stateChangeBus.js';

const undoStack = [];
const redoStack = [];

export function pushSnapshot() {
  if (runtimeState.mode === 'multiplayer') return;
  undoStack.push(structuredClone(gameState.zones));
  redoStack.length = 0;
}

export function undo() {
  if (undoStack.length === 0) return false;

  redoStack.push(structuredClone(gameState.zones));
  gameState.zones = undoStack.pop();
  emitStateChanged();
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
