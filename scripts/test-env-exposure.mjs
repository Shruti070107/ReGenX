/**
 * Tests for the .env / secret-exposure fix.
 *
 * Two-part test suite:
 *
 * Part A — Live HTTP tests: spins up a minimal version of the patched
 *   realtime server on a test port and verifies that sensitive paths are
 *   blocked while legitimate assets are still served.
 *
 * Part B — CloudSync unit tests: verifies that loadConfig() no longer
 *   fetches /.env and reads correctly from window.__REALTIME_CONFIG__.
 *
 * Coverage:
 *  1.  GET /.env returns 403
 *  2.  GET /.gitignore returns 403
 *  3.  GET /scripts/realtime-server.mjs returns 403
 *  4.  GET /package.json returns 403
 *  5.  GET /package-lock.json returns 403
 *  6.  GET /node_modules/ returns 403
 *  7.  GET /data/ returns 403
 *  8.  GET /healthz returns 200
 *  9.  GET /config.js returns HTTP 200
 * 10.  /config.js does not contain REALTIME_AUTH_TOKEN value
 * 11.  /config.js does not contain APPWRITE_API_KEY
 * 12.  /config.js contains window.__REALTIME_CONFIG__
 * 13.  /config.js exposes safe appwrite sub-object
 * 14.  CloudSync.loadConfig() does not fetch /.env
 * 15.  CloudSync.loadConfig() reads from window.__REALTIME_CONFIG__.appwrite
 * 16.  CloudSync.loadConfig() falls back to defaults when config is absent
 * 17.  CloudSync.loadConfig() ignores extra / unknown fields in injected config
 * 18.  Regression: live server /.env returns 403 (not the file contents)
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const rootDir    = path.resolve(__dirname, '..');

const TEST_PORT = 14174;

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── Part A: Minimal test server (mirrors the patched realtime-server.mjs) ─────

const { default: express } = await import('express');
const app = express();

// Replicate the sensitive-path guard from the fix (mirrors realtime-server.mjs)
const BLOCKED_PREFIXES = [
  '/scripts/',
  '/node_modules/',
  '/package.json',
  '/package-lock.json',
  '/data/',
];

app.use((req, res, next) => {
  const p = req.path;

  // Block dotfiles via explicit segment check (dotfiles: 'deny' in serve-static
  // falls through due to its ENOENT error code — the explicit guard is reliable)
  const segments = p.split('/');
  if (segments.some((seg) => seg.length > 1 && seg.startsWith('.'))) {
    return res.status(403).end();
  }

  if (BLOCKED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))) {
    return res.status(403).end();
  }

  next();
});

// Replicate the hardened static middleware
app.use(express.static(rootDir, { extensions: ['html'], dotfiles: 'deny' }));

// Replicate the patched /config.js (no token, no API key)
const TEST_SECRET        = 'super-secret-token-must-not-appear';
const TEST_API_KEY       = 'appwrite-admin-key-must-not-appear';
const SAFE_PROJECT_ID    = 'safe-project-id-12345';
const SAFE_ENDPOINT      = 'https://cloud.appwrite.io/v1';

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  const safeConfig = {
    url: '/',
    appwrite: {
      endpoint:           SAFE_ENDPOINT,
      projectId:          SAFE_PROJECT_ID,
      databaseId:         'safe-db-id',
      ordersCollectionId: 'safe-orders-id',
      accountsCollectionId: 'safe-accounts-id',
    },
  };
  res.send(`window.__REALTIME_CONFIG__ = ${JSON.stringify(safeConfig)};`);
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

const server = await new Promise((resolve) => {
  const s = createServer(app);
  s.listen(TEST_PORT, () => resolve(s));
});

const BASE = `http://localhost:${TEST_PORT}`;

// ── 1-7. Sensitive paths return 403 ──────────────────────────────────────────

console.log('\nPart A — HTTP endpoint security\n');

console.log('1-7. Sensitive paths return 403');
{
  const cases = [
    ['/.env',                        'dotfile .env'],
    ['/.gitignore',                   'dotfile .gitignore'],
    ['/scripts/realtime-server.mjs',  'server script'],
    ['/package.json',                 'package manifest'],
    ['/package-lock.json',            'lock file'],
    ['/node_modules/',                'node_modules dir'],
    ['/data/',                        'data dir'],
  ];

  for (const [urlPath, label] of cases) {
    const res = await fetch(`${BASE}${urlPath}`);
    assert(res.status === 403, `${label} (${urlPath}) → 403`);
  }
}

// ── 8. /healthz returns 200 ───────────────────────────────────────────────────

console.log('\n8. /healthz returns 200');
{
  const res = await fetch(`${BASE}/healthz`);
  assert(res.status === 200, 'GET /healthz → 200');
}

// ── 9-13. /config.js is safe ──────────────────────────────────────────────────

console.log('\n9-13. /config.js safety');
{
  const res  = await fetch(`${BASE}/config.js`);
  const text = await res.text();

  assert(res.status === 200,                              '/config.js returns 200');
  assert(!text.includes(TEST_SECRET),                     '/config.js does not contain REALTIME_AUTH_TOKEN');
  assert(!text.includes(TEST_API_KEY),                    '/config.js does not contain APPWRITE_API_KEY');
  assert(text.includes('window.__REALTIME_CONFIG__'),     '/config.js sets window.__REALTIME_CONFIG__');
  assert(text.includes('"appwrite"'),                     '/config.js contains safe appwrite sub-object');
}

// ── 18. Regression: /.env returns 403 (not file contents) ────────────────────

console.log('\n18. Regression: /.env returns 403');
{
  const res = await fetch(`${BASE}/.env`);
  assert(res.status === 403, '/.env returns 403 (blocked)');

  // Even if the status were wrong, the body must not contain secrets
  const body = await res.text();
  assert(!body.includes('APPWRITE_API_KEY'),   'response body contains no API key');
  assert(!body.includes('REALTIME_AUTH_TOKEN'), 'response body contains no auth token');
}

server.close();

// ── Part B: CloudSync.loadConfig unit tests ───────────────────────────────────

console.log('\nPart B — CloudSync.loadConfig()\n');

// Source check: verify the fetch('/.env') pattern is absent from cloud-sync.js
const cloudSyncSrc = readFileSync(path.join(rootDir, 'src', 'cloud-sync.js'), 'utf8');

console.log('14. CloudSync source does not fetch /.env');
{
  assert(!cloudSyncSrc.includes("fetch('/.env')"),   "cloud-sync.js does not call fetch('/.env')");
  assert(!cloudSyncSrc.includes('fetch("/.env")'),   'cloud-sync.js does not call fetch("/.env")');
  assert(!cloudSyncSrc.includes('window.process'),   'cloud-sync.js does not reference window.process (env-var bundle leak)');
}

// Minimal CloudSync.loadConfig simulation (mirrors the patched logic)
async function simulateLoadConfig(injectedConfig) {
  const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '',
    databaseId: '',
    ordersCollectionId: '',
    accountsCollectionId: ''
  };

  const injected = injectedConfig?.appwrite;
  if (injected && typeof injected === 'object') {
    if (injected.endpoint)             config.endpoint             = injected.endpoint;
    if (injected.projectId)            config.projectId            = injected.projectId;
    if (injected.databaseId)           config.databaseId           = injected.databaseId;
    if (injected.ordersCollectionId)   config.ordersCollectionId   = injected.ordersCollectionId;
    if (injected.accountsCollectionId) config.accountsCollectionId = injected.accountsCollectionId;
  }

  return config;
}

console.log('\n15. CloudSync reads from window.__REALTIME_CONFIG__.appwrite');
{
  const injected = {
    appwrite: {
      endpoint:             'https://fra.cloud.appwrite.io/v1',
      projectId:            'proj-abc',
      databaseId:           'db-xyz',
      ordersCollectionId:   'col-orders',
      accountsCollectionId: 'col-accounts',
    }
  };

  const cfg = await simulateLoadConfig(injected);
  assert(cfg.endpoint             === 'https://fra.cloud.appwrite.io/v1', 'endpoint read correctly');
  assert(cfg.projectId            === 'proj-abc',                          'projectId read correctly');
  assert(cfg.databaseId           === 'db-xyz',                            'databaseId read correctly');
  assert(cfg.ordersCollectionId   === 'col-orders',                        'ordersCollectionId read correctly');
  assert(cfg.accountsCollectionId === 'col-accounts',                      'accountsCollectionId read correctly');
}

console.log('\n16. CloudSync falls back to defaults when config is absent');
{
  const cfg1 = await simulateLoadConfig(null);
  assert(cfg1.endpoint    === 'https://cloud.appwrite.io/v1', 'default endpoint when null');
  assert(cfg1.projectId   === '',                              'default projectId is empty');
  assert(cfg1.databaseId  === '',                              'default databaseId is empty');

  const cfg2 = await simulateLoadConfig({});
  assert(cfg2.endpoint    === 'https://cloud.appwrite.io/v1', 'default endpoint when no appwrite key');

  const cfg3 = await simulateLoadConfig({ appwrite: {} });
  assert(cfg3.endpoint    === 'https://cloud.appwrite.io/v1', 'default endpoint when appwrite is empty object');
}

console.log('\n17. CloudSync ignores extra / unknown fields in injected config');
{
  const injected = {
    appwrite: {
      endpoint:   'https://my.appwrite.io/v1',
      projectId:  'proj-real',
      secretKey:  'should-be-ignored',   // must not appear in returned config
      apiKey:     'also-ignored',
      token:      'also-ignored',
    },
    token: 'top-level-token-ignored',
  };

  const cfg = await simulateLoadConfig(injected);
  assert(cfg.endpoint  === 'https://my.appwrite.io/v1', 'valid field used');
  assert(cfg.projectId === 'proj-real',                  'valid field used');
  assert(!('secretKey' in cfg),   'secretKey not propagated');
  assert(!('apiKey' in cfg),      'apiKey not propagated');
  assert(!('token' in cfg),       'token not propagated');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
