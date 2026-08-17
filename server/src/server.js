// server.js — RevaMan multiplayer relay.
//
// Game-rule-agnostic: never imports or runs engine.js. Per-room state is
// limited to what the RELAY itself needs — a sequence counter, undo/redo
// history, and the current snapshot — never anything engine.js would
// recognize as game logic. Clients always push full { zones, cardbacks }
// snapshots; this server never diffs or validates them, just orders and
// stores them.
//
// UNDO/REDO IS NOW SERVER-AUTHORITATIVE (previously client-local, which
// caused each client to accumulate a different history and let a local
// undo silently discard the other client's actions). The server holds
// ONE undo/redo stack per room; clients request 'undo'/'redo' and wait
// for the resulting 'state' broadcast rather than computing anything
// locally. See undoManager.js on the client — pushSnapshot() is a no-op
// whenever runtimeState.mode === 'multiplayer'.
//
// Clients discard any incoming 'state' whose seq isn't greater than the
// last one they've applied. This guarantees every client applies
// concurrent pushes in the same relative order as each other — it does
// NOT prevent a slightly-stale remote push from overwriting a
// not-yet-broadcast local mutation (an accepted tradeoff, not an
// oversight; see the client-side networkSync module for the longer
// explanation of why full server-authoritative GAME STATE, as opposed to
// just history/sequence, was deliberately not chosen here).
//
// No reconnect/resume support and no room persistence beyond the life of
// the room: a room's state lives only as long as at least one client
// holds the connection alive server-side. If a room empties out, it's
// forgotten entirely — the next join to that same room id starts fresh.
// Manual export/import is the accepted fallback for state loss, not
// something this relay tries to solve. (Note: this could change now
// that the server holds real state in memory — see the ongoing
// discussion on room preservation before building anything here.)

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import bcrypt from 'bcryptjs';
import { PORT } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.join(__dirname, '../../client/src/game');
const ASSETS_DIR = path.join(__dirname, '../../client/src/assets');

const MAX_CLIENTS_PER_ROOM = 2; // this is a 2-player game; a 3rd join attempt is rejected, not queued as a spectator

// ---------------------------------------------------------------------
// CORS — two distinct origins need access, for two distinct reasons:
//  1. https://admin.socket.io — the hosted Admin UI dashboard. Fixed,
//     required exactly as-is by the Admin UI itself.
//  2. wherever the actual game client is served from. CLIENT_ORIGIN
//     below is a placeholder — set it via env var to match your real
//     frontend's origin (or extend the array if you need more than one,
//     e.g. a local dev origin AND a deployed one).
// credentials: true is required for the Admin UI's auth to work, which
// means origin can't be '*' (the CORS spec disallows combining a
// wildcard origin with credentials) — hence an explicit array instead.
// ---------------------------------------------------------------------
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const app = express();
const server = http.createServer(app);

app.use(express.static(CLIENT_DIR));
app.use('/assets', express.static(ASSETS_DIR));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (origin === 'https://admin.socket.io') return callback(null, true);
      // No CLIENT_ORIGIN configured -> reflect back whatever origin
      // asked. Convenient for local dev regardless of which port/tool
      // you're serving game.html from, but NOT safe for production —
      // set CLIENT_ORIGIN before deploying anywhere real, which locks
      // this down to that one exact origin instead.
      if (!CLIENT_ORIGIN) return callback(null, true);
      if (origin === CLIENT_ORIGIN) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

// ---------------------------------------------------------------------
// Admin UI (https://admin.socket.io) — lets you watch rooms/connections
// live while testing. Password is bcrypt-hashed rather than stored in
// plaintext, per the Admin UI's own documented setup.
//
// Set ADMIN_UI_PASSWORD_HASH in the environment to the OUTPUT of:
//   node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
// Run that once, offline, and put the resulting hash string in the env
// var — never the plaintext password itself.
//
// Falls back to a hash of a clearly-fake placeholder password if unset,
// purely so this doesn't crash on a first run with no env configured.
// Replace ADMIN_UI_PASSWORD_HASH before deploying anywhere real; the
// fallback below is not a real credential, it's a "you forgot to set
// this" tripwire.
// ---------------------------------------------------------------------
const ADMIN_UI_USERNAME = process.env.ADMIN_UI_USERNAME || 'admin';
const ADMIN_UI_PASSWORD_HASH =
  process.env.ADMIN_UI_PASSWORD_HASH ||
  bcrypt.hashSync('change-me-before-deploying', 10);

instrument(io, {
  auth: {
    type: 'basic',
    username: ADMIN_UI_USERNAME,
    password: ADMIN_UI_PASSWORD_HASH,
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
});

// ---------------------------------------------------------------------
// Room bookkeeping — roomId -> { seq, size, currentState, undoStack,
// redoStack }. Still not "gameState" in the engine.js sense — currentState
// is just the last { zones, cardbacks } payload a client pushed, stored
// opaquely; this server never looks inside it. undoStack/redoStack hold
// the SAME kind of opaque payloads, one per prior state. seq orders
// everything (pushes AND undo/redo results) on one shared per-room
// counter. size enforces the 2-client cap. Actual message routing (who's
// in which room) is handled by Socket.io's own room feature
// (socket.join / io.to), not tracked here separately.
// ---------------------------------------------------------------------
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      seq: 0,
      size: 0,
      currentState: null,
      undoStack: [],
      redoStack: [],
    });
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  let joinedRoomId = null;

  socket.on('join', ({ room, username } = {}) => {
    if (!room) return;
    if (joinedRoomId) return;

    const roomState = getRoom(room);
    if (roomState.size >= MAX_CLIENTS_PER_ROOM) {
      socket.emit('join-error', { message: 'Room is full.' });
      return;
    }

    const slot = roomState.size === 0 ? 'p1' : 'p2';
    roomState.size += 1;
    joinedRoomId = room;

    socket.join(room);
    socket.data.room = room;
    socket.data.slot = slot;
    socket.data.username = username;

    // Hand the newcomer everyone already in the room, by slot — the
    // newcomer's own 'joined' response is the only place this info can
    // travel, since 'peer-joined' only ever reaches EXISTING members.
    const peers = [];
    for (const socketId of io.sockets.adapter.rooms.get(room) || []) {
      const peerSocket = io.sockets.sockets.get(socketId);
      if (peerSocket && peerSocket !== socket) {
        peers.push({
          slot: peerSocket.data.slot,
          username: peerSocket.data.username,
        });
      }
    }

    // Also hand the newcomer the room's CURRENT state directly, plus the
    // seq it's at — this replaces the old design where an existing
    // client had to notice 'peer-joined' and manually re-broadcast its
    // own state as a catch-up. That was only ever a workaround for the
    // server holding nothing; now that it holds currentState, handing
    // it over here is simpler and doesn't depend on the other client
    // being responsive.
    socket.emit('joined', {
      slot,
      peers,
      seq: roomState.seq,
      current: roomState.currentState,
    });
    socket.to(room).emit('peer-joined', { username, slot });
  });

  socket.on('state', (payload) => {
    if (!joinedRoomId) return;
    const room = getRoom(joinedRoomId);

    if (room.currentState) room.undoStack.push(room.currentState);
    room.redoStack = []; // a real new action invalidates any pending redo
    room.currentState = payload;
    room.seq += 1;

    socket.to(joinedRoomId).emit('state', { seq: room.seq, ...payload });
  });

  socket.on('undo', () => {
    if (!joinedRoomId) return;
    const room = getRoom(joinedRoomId);

    if (room.undoStack.length === 0) {
      socket.emit('undo-error', { message: 'Nothing to undo.' });
      return;
    }

    room.redoStack.push(room.currentState);
    room.currentState = room.undoStack.pop();
    room.seq += 1;

    // Unlike 'state', this goes to EVERYONE including the requester —
    // the requester doesn't already know what the prior state was, the
    // server had to compute that for them.
    io.to(joinedRoomId).emit('state', { seq: room.seq, ...room.currentState });
  });

  socket.on('redo', () => {
    if (!joinedRoomId) return;
    const room = getRoom(joinedRoomId);

    if (room.redoStack.length === 0) {
      socket.emit('redo-error', { message: 'Nothing to redo.' });
      return;
    }

    room.undoStack.push(room.currentState);
    room.currentState = room.redoStack.pop();
    room.seq += 1;

    io.to(joinedRoomId).emit('state', { seq: room.seq, ...room.currentState });
  });

  socket.on('chat', (payload) => {
    if (!joinedRoomId) return;
    socket.to(joinedRoomId).emit('chat', payload);
  });

  socket.on('log', (payload) => {
    if (!joinedRoomId) return;
    socket.to(joinedRoomId).emit('log', payload);
  });

  socket.on('disconnect', () => {
    if (!joinedRoomId) return;
    const roomState = rooms.get(joinedRoomId);
    if (!roomState) return;

    roomState.size = Math.max(0, roomState.size - 1);
    if (roomState.size === 0) rooms.delete(joinedRoomId); // no persistence — the room is fully forgotten once empty

    socket.to(joinedRoomId).emit('peer-left', { slot: socket.data.slot });
  });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'game.html'));
});

server.listen(PORT, () => {
  console.log(`RevaMan relay listening on port ${PORT}`);
});
