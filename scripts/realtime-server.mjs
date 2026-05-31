import express from 'express';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const stateFile = path.join(rootDir, 'data', 'realtime-state.json');
const PORT = Number(process.env.PORT || 4173);
const ALLOWED_ORIGINS = new Set(
  String(process.env.ALLOWED_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
let REALTIME_AUTH_TOKEN = String(process.env.REALTIME_AUTH_TOKEN || '');

if (!REALTIME_AUTH_TOKEN) {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  REALTIME_AUTH_TOKEN = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  console.warn('[realtime] No REALTIME_AUTH_TOKEN set. Generated a temporary token for this session.');
  console.warn('[realtime] Set REALTIME_AUTH_TOKEN in .env for a persistent token.');
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * Middleware that blocks access to sensitive files and directories.
 * Covers .env variants, hidden dot-files, the .git directory, and the
 * runtime data directory.  Any matching request receives a 403 so that
 * the static handler below never gets a chance to serve the file.
 */
function blockSensitiveFiles(req, res, next) {
  const urlPath = req.path || '';

  // Normalise away query strings and decode percent-encoding before matching
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    decoded = urlPath;
  }

  // Split into segments; filter empty strings that result from leading slash
  const segments = decoded.split('/').filter(Boolean);

  // Block if any path segment looks like a sensitive artifact
  const blocked = segments.some((seg) => {
    // .env, .env.local, .env.production, .env.* etc.
    if (/^\.env(\..*)?$/i.test(seg)) return true;
    // .git directory and any files within it
    if (/^\.git(\/.*)?$/i.test(seg)) return true;
    // Any other hidden dot-file at the top level
    if (seg.startsWith('.')) return true;
    // data directory contains the runtime state file
    if (seg === 'data') return true;
    return false;
  });

  if (blocked) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by realtime server CORS policy'));
    },
    credentials: true
  }
});

io.use((socket, next) => {
  if (!REALTIME_AUTH_TOKEN) {
    next(new Error('Realtime authentication is not configured'));
    return;
  }

  const authToken =
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.['x-realtime-token'];

  if (authToken !== REALTIME_AUTH_TOKEN) {
    next(new Error('Unauthorized realtime connection'));
    return;
  }

  next();
});

const initialState = {
  version: 1,
  records: {}
};

let state = { ...initialState };

async function loadState() {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.records) {
      state = {
        version: Number(parsed.version || 1),
        records: parsed.records
      };
    }
  } catch {
    state = { ...initialState };
  }
}

async function persistState() {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

function broadcastToRooms(payload) {
  const rooms = Array.from(new Set([...(payload.rooms || []), 'network_room']));
  rooms.forEach((room) => {
    io.to(room).emit('sync:patch', payload);
  });
}

function applyUpdates(updates = []) {
  updates.forEach((update) => {
    if (!update || !update.key) return;
    if (update.action === 'remove' || typeof update.value === 'undefined') {
      delete state.records[update.key];
      return;
    }
    state.records[update.key] = update.value;
  });
  state.version += 1;
}

// Block sensitive files before any static or API handler
app.use(blockSensitiveFiles);

// Safe public configuration endpoint.
// Returns only the values the browser SDK needs to connect to Appwrite.
// Server-side secrets (APPWRITE_API_KEY, REALTIME_AUTH_TOKEN) are never
// included in this response.
app.get('/api/public-config', (_req, res) => {
  res.json({
    endpoint: process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '',
    databaseId: process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || '',
    ordersCollectionId: process.env.VITE_APPWRITE_COLLECTION_ID_ORDERS || process.env.APPWRITE_COLLECTION_ID_ORDERS || '',
    accountsCollectionId: process.env.VITE_APPWRITE_COLLECTION_ID_ACCOUNTS || process.env.APPWRITE_COLLECTION_ID_ACCOUNTS || ''
  });
});

app.use(express.static(rootDir, { extensions: ['html'] }));

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.__REALTIME_CONFIG__ = ${JSON.stringify({ token: REALTIME_AUTH_TOKEN })};`);
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, version: state.version });
});

io.on('connection', (socket) => {
  socket.emit('sync:snapshot', { version: state.version, records: state.records });

  socket.on('session:join', ({ session, rooms = [] } = {}) => {
    const joinedRooms = new Set(['network_room', ...(rooms || [])]);
    if (session?.role) joinedRooms.add(`${session.role}s_room`);
    if (session?.role) joinedRooms.add(`${session.role}_room`);
    if (session?.id) joinedRooms.add(`session:${session.id}`);
    joinedRooms.forEach((room) => socket.join(room));
  });

  socket.on('session:leave', () => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });
  });

  socket.on('snapshot:request', () => {
    socket.emit('sync:snapshot', { version: state.version, records: state.records });
  });

  socket.on('operational:event', async (payload = {}) => {
    const updates = Array.isArray(payload.updates) ? payload.updates : [];
    if (!updates.length) {
      broadcastToRooms({
        ...payload,
        sourceId: socket.id,
        version: state.version,
        ts: Date.now()
      });
      return;
    }

    applyUpdates(updates);
    await persistState();

    const response = {
      ...payload,
      sourceId: socket.id,
      version: state.version,
      ts: Date.now()
    };
    broadcastToRooms(response);
  });

  socket.on('disconnect', () => {
    socket.removeAllListeners();
  });
});

await loadState();

httpServer.listen(PORT, () => {
  console.log(`ReGenX realtime server listening on http://localhost:${PORT}`);
});
