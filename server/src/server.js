import dotenv from 'dotenv';
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

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CLIENT_DIR = path.join(__dirname, '../../client/src/game');
const ASSETS_DIR = path.join(__dirname, '../../client/src/assets');
const BUILDER_DIR = path.join(__dirname, '../../client/src/deck');

const MAX_PLAYERS_PER_ROOM = 2;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const app = express();
const server = http.createServer(app);

app.use(express.static(CLIENT_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/deck', express.static(BUILDER_DIR));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === 'https://admin.socket.io') return callback(null, true);
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

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      seq: 0,
      playerCount: 0,
      spectatorCount: 0,
      allowSpectators: false,
      currentState: null,
      undoStack: [],
      redoStack: [],
    });
  }
  return rooms.get(roomId);
}

function isPlayer(socket) {
  return socket.data.slot === 'p1' || socket.data.slot === 'p2';
}

io.on('connection', (socket) => {
  let joinedRoomId = null;

  socket.on('join', ({ room, username, allowSpectators } = {}) => {
    if (!room) return;
    if (joinedRoomId) return;

    const roomState = getRoom(room);

    if (roomState.playerCount === 0 && roomState.spectatorCount === 0) {
      roomState.allowSpectators = !!allowSpectators;
    }

    let slot;
    if (roomState.playerCount < MAX_PLAYERS_PER_ROOM) {
      slot = roomState.playerCount === 0 ? 'p1' : 'p2';
      roomState.playerCount += 1;
    } else if (roomState.allowSpectators) {
      slot = 'spectator';
      roomState.spectatorCount += 1;
    } else {
      socket.emit('join-error', { message: 'Room is full.' });
      return;
    }

    joinedRoomId = room;

    socket.join(room);
    socket.data.room = room;
    socket.data.slot = slot;
    socket.data.username = username;

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
    if (!isPlayer(socket)) {
      socket.emit('spectator-error', {
        message: 'Spectators cannot affect the game.',
      });
      return;
    }

    const room = getRoom(joinedRoomId);

    if (room.currentState) room.undoStack.push(room.currentState);
    room.redoStack = [];
    room.currentState = payload;
    room.seq += 1;

    socket.to(joinedRoomId).emit('state', { seq: room.seq, ...payload });
  });

  socket.on('undo', () => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) {
      socket.emit('spectator-error', {
        message: 'Spectators cannot affect the game.',
      });
      return;
    }

    const room = getRoom(joinedRoomId);

    if (room.undoStack.length === 0) {
      socket.emit('undo-error', { message: 'Nothing to undo.' });
      return;
    }

    room.redoStack.push(room.currentState);
    room.currentState = room.undoStack.pop();
    room.seq += 1;

    io.to(joinedRoomId).emit('state', { seq: room.seq, ...room.currentState });
  });

  socket.on('redo', () => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) {
      socket.emit('spectator-error', {
        message: 'Spectators cannot affect the game.',
      });
      return;
    }

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
    socket.to(joinedRoomId).emit('chat', {
      slot: socket.data.slot,
      username: socket.data.username,
      text: payload?.text,
    });
  });

  socket.on('log', (payload) => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) return;
    socket.to(joinedRoomId).emit('log', {
      slot: socket.data.slot,
      text: payload?.text,
    });
  });

  socket.on('disconnect', () => {
    if (!joinedRoomId) return;
    const roomState = rooms.get(joinedRoomId);
    if (!roomState) return;

    if (isPlayer(socket)) {
      roomState.playerCount = Math.max(0, roomState.playerCount - 1);
    } else {
      roomState.spectatorCount = Math.max(0, roomState.spectatorCount - 1);
    }

    if (roomState.playerCount === 0 && roomState.spectatorCount === 0) {
      rooms.delete(joinedRoomId);
    }

    socket.to(joinedRoomId).emit('peer-left', {
      slot: socket.data.slot,
      username: socket.data.username,
    });
  });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'game.html'));
});

server.listen(PORT, () => {
  console.log(`RevaMan relay listening on port ${PORT}`);
});
