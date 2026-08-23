import * as ovactions from '../overlays/overlayActions.js';
import * as actions from './actions.js';

const keybinds = {
  'Mod+S': actions.shuffleDeck,
  'Mod+D': () => actions.drawCardFromPile('deck'),
  'Mod+P': () => actions.drawCardFromPile('prizes'),
  'Mod+L': actions.loadPlayerDeck,
  'Alt+L': () => actions.loadPlayerDeck('demo'),
  'Mod+X': actions.setupBoard,
  'Mod+M': actions.mulligan,
  'Mod+C': actions.flipCoin,
  'Mod+Z': actions.undoAction,
  'Mod+Y': actions.redoAction,
  ESCAPE: actions.closeAllPanels,
  ENTER: actions.openSidebarPanel,
};

const actionMenuKeybinds = {
  'Mod+ARROWUP': () => ovactions.applyDamage(10),
  'Mod+ARROWDOWN': () => ovactions.applyDamage(-10),
  'Mod+ARROWRIGHT': () => ovactions.applyCounter(1),
  'Mod+ARROWLEFT': () => ovactions.applyCounter(-1),
  'Mod+1': () => ovactions.applyStatus('BRN'),
  'Mod+2': () => ovactions.applyStatus('PAR'),
  'Mod+3': () => ovactions.applyStatus('PSN'),
  'Mod+4': () => ovactions.applyStatus('FRZ'),
  'Mod+5': () => ovactions.applyStatus('SLP'),
  'Mod+6': () => ovactions.applyStatus('CON'),
  'Mod+0': ovactions.applyAbilityUsed,
  'Mod+R': ovactions.cycleRotation,
  'Mod+B': ovactions.applyBreak,
  'Mod+F': ovactions.applyFlip,
  'Mod+V': ovactions.toggleViewCard,
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

function bindKeybinds(bindMap) {
  document.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;

    const key = getKeybind(event);
    const action = bindMap[key];

    if (!action) return;

    event.preventDefault();
    action();
  });
}

export function initKeybinds() {
  bindKeybinds(keybinds);
  bindKeybinds(actionMenuKeybinds);
}
