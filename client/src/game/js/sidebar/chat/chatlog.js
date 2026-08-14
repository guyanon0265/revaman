import { runtimeState } from '../../gameboard/logic/state.js';

/* ==========================================================================
    1. CHAT & LOG HANDLING FUNCTIONS
    ========================================================================== */

// Core function to add any entry to the log display. Builds real DOM nodes
// via createElement/textContent instead of an HTML string assigned to
// innerHTML — every value passed in here may originate from user-controlled
// input (chat text, or a card name imported from a deck CSV), so nothing
// here may ever be interpreted as markup.
//
// logDisplay: the log container element, passed in explicitly rather than
//   closed over — this function has no module-level state of its own.
// usernameText: display text for the leading "[Name]:" / "Name:" tag, or
//   null to omit it entirely (e.g. system messages with no per-player tag).
// usernameClass: 'player' | 'opp' | 'system' — CSS modifier for the tag.
// messageText: the body of the entry.
// typeClass: 'system' | 'action' | 'chat' — CSS modifier for the row.
function appendLogEntry(logDisplay, usernameText, usernameClass, messageText, typeClass) {
  if (!logDisplay) return;

  const entry = document.createElement('div');
  entry.className = `log-entry ${typeClass}`;

  if (usernameText !== null) {
    const usernameSpan = document.createElement('span');
    usernameSpan.className = `username ${usernameClass}`;
    usernameSpan.textContent = usernameText;
    entry.appendChild(usernameSpan);
    entry.appendChild(document.createTextNode(' ' + messageText));
  } else {
    entry.appendChild(document.createTextNode(messageText));
  }

  logDisplay.appendChild(entry);

  // Auto-scroll to the bottom
  entry.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Resolve a slot ('p1' | 'p2') to its display username. Falls back to the
// runtimeState defaults ('Player 1' / 'Player 2') until Task 7 wires a
// real value in via the multiplayer room-join handshake.
function usernameForSlot(slot) {
  return (runtimeState.usernames && runtimeState.usernames[slot]) || (slot === 'p1' ? 'Player 1' : 'Player 2');
}

// Resolve a slot to its styling class relative to the local viewer.
function styleClassForSlot(slot) {
  return slot === runtimeState.mySlot ? 'player' : 'opp';
}

// Public helper for sending player chat messages
function sendPlayerMessage(chatInput) {
  if (!chatInput) return;

  const messageText = chatInput.value.trim();

  // Block empty submissons
  if (messageText === '') return;

  GameLogger.logChat(runtimeState.mySlot, messageText);

  // Clear user input text box
  chatInput.value = '';
}

/* ==========================================================================
    2. INIT
    ========================================================================== */
export function initChatlog() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const logDisplayElement = document.getElementById('log-display');

  // Owned by GameLogger itself, since its methods are called from other
  // modules well after this function returns — a local here wouldn't
  // survive to be read later.
  GameLogger._element = logDisplayElement;

  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', () => sendPlayerMessage(chatInput));
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (event) => {
      // Check if Enter key was pressed without Shift
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Stop standard line break behavior
        sendPlayerMessage(chatInput);
      }
    });
  }
}

/* ==========================================================================
    3. GLOBAL GAME API (For connecting your game board events)
    ========================================================================== */

export const GameLogger = {
  _element: null, // Populated by initChatlog()

  // System messages — no per-player attribution.
  logSystem: function (text) {
    appendLogEntry(this._element, '[System]:', 'system', text, 'system');
  },
  // Gameplay action log line, attributed to a slot ('p1' | 'p2'). Resolves
  // the real username and player/opp styling internally, so callers never
  // need to know or format a display label themselves.
  logAction: function (slot, actionText) {
    const username = usernameForSlot(slot);
    const cls = styleClassForSlot(slot);
    appendLogEntry(this._element, `${username}`, cls, actionText, 'action');
  },
  // Chat message from a slot ('p1' | 'p2').
  logChat: function (slot, text) {
    const username = usernameForSlot(slot);
    const cls = styleClassForSlot(slot);
    appendLogEntry(this._element, `${username}:`, cls, text, 'chat');
  },
};
