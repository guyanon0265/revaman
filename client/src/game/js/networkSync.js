import { io } from 'socket.io-client';
import { gameState, runtimeState } from './logic/state.js';
import { onStateChanged } from './logic/network/stateChangeBus.js';
import { renderEntireBoard } from './ui/render.js';
import { closeAllOverlays } from './ui/overlays/overlays.js';
import { onLogChanged } from './logic/network/logChangeBus.js';
import { onChatChanged } from './logic/network/chatChangeBus.js';
import { GameLogger } from './ui/sidebar/chat/chatlog.js';
import { saveState } from './logic/persistence.js';

let initialized = false;
let lastAppliedSeq = 0;

function setStatus(text) {
  const statusEl = document.getElementById('mp-status');
  if (statusEl) statusEl.textContent = text;
}

function sendState() {
  if (
    runtimeState.mode !== 'multiplayer' ||
    !runtimeState.socket ||
    runtimeState.isSpectator
  )
    return;
  runtimeState.socket.emit('state', {
    zones: gameState.zones,
    cardbacks: runtimeState.cardbacks,
  });
}

function applyIncomingState({ seq, zones, cardbacks }) {
  if (seq <= lastAppliedSeq) return;
  lastAppliedSeq = seq;

  gameState.zones = zones;
  if (cardbacks) runtimeState.cardbacks = cardbacks;

  closeAllOverlays();
  renderEntireBoard();
  saveState();
}

export function requestUndo() {
  if (
    runtimeState.mode !== 'multiplayer' ||
    !runtimeState.socket ||
    runtimeState.isSpectator
  )
    return;
  runtimeState.socket.emit('undo');
}

export function requestRedo() {
  if (
    runtimeState.mode !== 'multiplayer' ||
    !runtimeState.socket ||
    runtimeState.isSpectator
  )
    return;
  runtimeState.socket.emit('redo');
}

export function joinRoom(room, username, allowSpectators = false) {
  if (runtimeState.socket) return;

  const socket = io();
  runtimeState.socket = socket;
  setStatus('Connecting…');

  let suppressDisconnectStatus = false;

  socket.on('connect', () => {
    socket.emit('join', { room, username, allowSpectators });
  });

  socket.on('joined', ({ slot, peers, seq, current }) => {
    runtimeState.mode = 'multiplayer';
    runtimeState.isSpectator = slot === 'spectator';
    runtimeState.mySlot = slot === 'p2' ? 'p2' : 'p1';
    runtimeState.oppSlot = runtimeState.mySlot === 'p1' ? 'p2' : 'p1';

    runtimeState.myUsername = username;
    if (slot === 'p1' || slot === 'p2') {
      runtimeState.usernames[slot] = username;
    }
    if (peers && Array.isArray(peers)) {
      peers.forEach((p) => {
        if (p.slot === 'p1' || p.slot === 'p2') {
          runtimeState.usernames[p.slot] = p.username;
        }
      });
    }

    lastAppliedSeq = seq;

    if (current) {
      gameState.zones = current.zones;
      if (current.cardbacks) runtimeState.cardbacks = current.cardbacks;
      closeAllOverlays();
      renderEntireBoard();
      saveState();
    }

    if (runtimeState.isSpectator) {
      setStatus(`Spectating room "${room}".`);
      GameLogger.logSystem('You are spectating this room.');
    } else {
      setStatus(
        `Connected as ${slot === 'p1' ? 'Player 1' : 'Player 2'} in room "${room}".`
      );
      GameLogger.logSystem(
        `You joined the room as ${slot === 'p1' ? 'Player 1' : 'Player 2'}.`
      );
    }
  });

  socket.on('join-error', ({ message }) => {
    setStatus(`Couldn't join: ${message}`);
    suppressDisconnectStatus = true;
    socket.disconnect();
    runtimeState.socket = null;
  });

  socket.on('peer-joined', ({ username: peerUsername, slot: peerSlot }) => {
    if (peerSlot === 'p1' || peerSlot === 'p2') {
      runtimeState.usernames[peerSlot] = peerUsername;
      setStatus('Opponent connected.');
      GameLogger.logSystem(`${peerUsername} joined the room.`);
    } else {
      GameLogger.logSystem(`${peerUsername} started spectating.`);
    }
  });

  socket.on('peer-left', ({ slot, username }) => {
    if (slot === 'p1' || slot === 'p2') {
      setStatus(`${username} disconnected.`);
      GameLogger.logSystem(`${username} left the room.`);
    } else {
      GameLogger.logSystem(`${username} stopped spectating.`);
    }
  });

  socket.on('state', applyIncomingState);

  socket.on('undo-error', ({ message }) => GameLogger.logSystem(message));
  socket.on('redo-error', ({ message }) => GameLogger.logSystem(message));
  socket.on('spectator-error', ({ message }) => GameLogger.logSystem(message));
  socket.on('log', ({ slot, text }) => GameLogger.logAction(slot, text));

  socket.on('chat', ({ slot, username, text }) => {
    if (slot === 'p1' || slot === 'p2') {
      GameLogger.logChat(slot, text);
    } else {
      GameLogger.logSpectatorChat(username, text);
    }
  });

  socket.on('disconnect', () => {
    runtimeState.socket = null;
    if (!suppressDisconnectStatus) {
      setStatus('Disconnected.');
    }
    suppressDisconnectStatus = false;
  });
}

export function leaveRoom() {
  if (!runtimeState.socket) return;
  GameLogger.logSystem('You left the room.');

  runtimeState.socket.disconnect();
  runtimeState.socket = null;
  runtimeState.mode = 'solo';
  runtimeState.mySlot = 'p1';
  runtimeState.oppSlot = 'p2';
  runtimeState.isSpectator = false;
  runtimeState.myUsername = null;
  setStatus('Not connected');
}

export function initNetworkSync() {
  if (initialized) return;
  initialized = true;

  onStateChanged(sendState);

  onLogChanged((text) => {
    if (
      runtimeState.mode !== 'multiplayer' ||
      !runtimeState.socket ||
      runtimeState.isSpectator
    )
      return;
    runtimeState.socket.emit('log', { text });
  });

  onChatChanged((text) => {
    if (runtimeState.mode !== 'multiplayer' || !runtimeState.socket) return;
    runtimeState.socket.emit('chat', { text });
  });
}
