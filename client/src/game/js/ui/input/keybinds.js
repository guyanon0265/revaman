import * as actions from './actions.js';

const keybinds = {
  'Mod+S': actions.shuffleDeck,
  'Mod+D': () => actions.drawCardFromPile('deck'),
  'Mod+P': () => actions.drawCardFromPile('prizes'),
  'Mod+L': actions.loadPlayerDeck,
  'Alt+L': () => actions.loadPlayerDeck('demo'),
  'Mod+X': actions.setupBoard,
  'Mod+M': actions.mulligan,
  'Mod+F': actions.flipCoin,
  'Mod+Z': actions.undoAction,
  'Mod+Y': actions.redoAction,
};

function getKeybind(event) {
  const parts = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('Mod');
  }
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');

  parts.push(event.key.toUpperCase());

  return parts.join('+');
}

function isTypingTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

export function initKeybinds() {
  document.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }

    const key = getKeybind(event);
    const action = keybinds[key];

    if (!action) {
      return;
    }

    event.preventDefault();
    action();
  });
}
