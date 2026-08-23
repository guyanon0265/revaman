// networkSync.js — client side of the state-push relay.
//
// This module's only job: turn local mutations into outgoing 'state'
// pushes, and turn incoming 'state' pushes into local gameState
// updates, matching server.js's event protocol exactly (join / joined /
// join-error / peer-joined / peer-left / state / undo / redo /
// undo-error / redo-error / spectator-error / chat / log). It has zero
// game-rule knowledge — engine.js/loggingEngine.js are the only things
// that ever construct or interpret game state; this module just moves
// gameState.zones over the wire.
//
// SPECTATORS: joinRoom() now takes an allowSpectators flag (read from
// the #spectators-switch checkbox by whoever calls this — see
// initMultiplayer.js), sent only meaningfully by whoever creates a
// room. On 'joined', a 'spectator' slot sets runtimeState.isSpectator
// but ALSO gets a real mySlot/oppSlot pair (defaulting to p1's-eye-view)
// — those two remain a pure rendering perspective, never a permission
// check. isSpectator is the only thing anything should gate an action
// on client-side; server.js enforces the same boundary authoritatively
// regardless of what this client does, via 'spectator-error' below.
//
// PROTOCOL: chat/log/peer-left now arrive with sender identity STAMPED
// BY THE SERVER (slot/username from socket.data), not sent by this
// client at all except for the raw text. This replaced the old
// "any incoming message is from runtimeState.oppSlot" assumption, which
// only worked because exactly 2 participants were ever possible.
//
// UNDO/REDO ARE SERVER-AUTHORITATIVE while connected. requestUndo() /
// requestRedo() just ask the server and wait for the resulting 'state'
// (or 'undo-error' / 'redo-error') — nothing is computed or guessed
// locally. See undoManager.js: pushSnapshot() is a no-op whenever
// runtimeState.mode === 'multiplayer', so the client-local undo/redo
// stacks stay empty for the duration of a multiplayer session and can't
// drift out of sync with the server's.
//
// KNOWN LIMITATION, not fixed by the sequence numbers below: they
// guarantee every client applies concurrent pushes in the SAME relative
// order as each other (an ordering guarantee). They do NOT prevent a
// remote push from silently overwriting a local mutation that hasn't
// been broadcast yet, if the remote push's snapshot was taken before
// that local mutation happened — a lost-update problem, a different
// failure mode than an ordering problem. Under normal two-person play
// this window is a single round-trip. This was an accepted tradeoff
// from the server-authoritative-vs-relay design discussion, not an
// oversight — full server-authoritative GAME STATE (not just
// history/sequence, which IS now server-authoritative) is the only way
// to close it completely, and was deliberately not chosen here.

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
    runtimeState.isSpectator // defensive — client-side interaction gating for spectators is separate/pending, this just makes sure a stray call here can never even try
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
  if (runtimeState.socket) return; // already connected — one connection per session

  const socket = io();
  runtimeState.socket = socket;
  setStatus('Connecting…');

  // True only for the brief window between join-error setting a
  // specific status message and the disconnect() call it triggers —
  // without this, the generic disconnect handler below unconditionally
  // overwrites that message with 'Disconnected.' immediately after,
  // since calling socket.disconnect() fires 'disconnect' regardless of
  // why the disconnect happened.
  let suppressDisconnectStatus = false;

  socket.on('connect', () => {
    socket.emit('join', { room, username, allowSpectators });
  });

  socket.on('joined', ({ slot, peers, seq, current }) => {
    runtimeState.mode = 'multiplayer';
    runtimeState.isSpectator = slot === 'spectator';

    // mySlot/oppSlot always resolve to a real 'p1'/'p2' pair, even for a
    // spectator — these two fields are purely a RENDERING perspective
    // (which board half is "bottom/mine" vs "top/opponent's"), never a
    // permission. A spectator defaults to seeing exactly what P1 would.
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
        // Spectator peers are deliberately not stored anywhere — chat
        // carries a sender's username inline, so there's no lookup that
        // would ever need it, and runtimeState.usernames only has room
        // for two fixed keys (p1/p2) in the first place.
      });
    }

    // Initialize to the room's ACTUAL current seq, not 0 — the server's
    // history didn't reset just because a new client joined.
    lastAppliedSeq = seq;

    // Apply whatever the server says the room's current state already
    // is — this is what replaced the old peer-joined -> sendState()
    // catch-up handshake.
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
    // No sendState() catch-up call here anymore — the server hands the
    // newcomer state directly via 'joined' (see above).
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

  // Server now stamps the acting slot itself — this is the fix for the
  // old "any incoming log must be from oppSlot" assumption, which broke
  // the moment a spectator (with no single "opponent") could receive
  // this event too.
  socket.on('log', ({ slot, text }) => GameLogger.logAction(slot, text));

  // Same fix, chat side — plus a spectator sender has no p1/p2 identity
  // to resolve a username/style through, so it gets its own display
  // path rather than being forced through the player-only one.
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
    // Deliberately NOT reverting runtimeState.mode/mySlot/oppSlot/
    // isSpectator here — matches server.js's own no-persistence stance.
    // Manual export/import is the accepted fallback for state loss, not
    // automatic reconnect/resume.
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

// Every successful gameState mutation (loggingEngine.js) and every
// undo/redo restore (undoManager.js, solo mode only now — see its own
// header) emits through this same bus — see stateChangeBus.js. This is
// the ONLY place those events turn into network traffic; loggingEngine.js
// and undoManager.js have no idea networking exists, and never need to.

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
    // No isSpectator guard here — spectators are explicitly allowed to
    // chat. Sender identity is added by the SERVER from socket.data, not
    // sent by this client at all.
    if (runtimeState.mode !== 'multiplayer' || !runtimeState.socket) return;
    runtimeState.socket.emit('chat', { text });
  });
}
