import { emitChatChanged } from '../../../logic/network/chatChangeBus.js';
import { runtimeState } from '../../../logic/state.js';

const logEntries = [];

function appendLogEntry(
  logDisplay,
  usernameText,
  usernameClass,
  messageText,
  typeClass
) {
  logEntries.push({
    username: usernameText,
    text: messageText,
    type: typeClass,
  });

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

  entry.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function usernameForSlot(slot) {
  return (
    (runtimeState.usernames && runtimeState.usernames[slot]) ||
    (slot === 'p1' ? 'Player 1' : 'Player 2')
  );
}

function styleClassForSlot(slot) {
  return slot === runtimeState.mySlot ? 'player' : 'opp';
}

function sendPlayerMessage(chatInput) {
  if (!chatInput) return;

  const messageText = chatInput.value.trim();

  if (messageText === '') return;

  if (runtimeState.isSpectator) {
    GameLogger.logSpectatorChat(
      runtimeState.myUsername || 'Spectator',
      messageText
    );
  } else {
    GameLogger.logChat(runtimeState.mySlot, messageText);
  }
  emitChatChanged(messageText);

  chatInput.value = '';
}

export function initChatlog() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const logDisplayElement = document.getElementById('log-display');

  GameLogger._element = logDisplayElement;

  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', () => sendPlayerMessage(chatInput));
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendPlayerMessage(chatInput);
      }
    });
  }
}

export const GameLogger = {
  _element: null,

  getEntries: function () {
    return logEntries.slice();
  },

  logSystem: function (text) {
    appendLogEntry(this._element, '[System]:', 'system', text, 'system');
  },
  logAction: function (slot, actionText) {
    const username = usernameForSlot(slot);
    const cls = styleClassForSlot(slot);
    appendLogEntry(this._element, `${username}`, cls, actionText, 'action');
  },
  logChat: function (slot, text) {
    const username = usernameForSlot(slot);
    const cls = styleClassForSlot(slot);
    appendLogEntry(this._element, `${username}:`, cls, text, 'chat');
  },
  logSpectatorChat: function (username, text) {
    appendLogEntry(
      this._element,
      `${username} (Spectator):`,
      'spectator',
      text,
      'chat'
    );
  },
};
