/**
 * Security regression tests for the realtime server.
 *
 * Covers:
 *  1. Normal server startup and health check
 *  2. /api/public-config returns safe values only
 *  3. GET /.env is blocked (403)
 *  4. GET /.env.local is blocked (403)
 *  5. GET /.env.production is blocked (403)
 *  6. GET /.git/config is blocked (403)
 *  7. GET /data/realtime-state.json is blocked (403)
 *  8. Other hidden dot-files are blocked (403)
 *  9. Public static assets are still served
 * 10. Regression: public config response never contains API key or auth token
 */

import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────────

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

async function get(url) {
  const response = await fetch(url);
  let body = '';
  try { body = await response.text(); } catch { /* ignore */ }
  return { status: response.status, body };
}

// ── server bootstrap ─────────────────────────────────────────────────────────

// Temporarily set a known auth token so the server starts deterministically
process.env.REALTIME_AUTH_TOKEN = 'test-token-do-not-use';
// Use a high port that is unlikely to conflict
const TEST_PORT = 14173;
process.env.PORT = String(TEST_PORT);

// Dynamically import the server module which starts listening as a side-effect.
// We redirect stdout/stderr to suppress startup noise during tests.
const origLog  = console.log;
const origWarn = console.warn;
const origInfo = console.info;
console.log  = () => {};
console.warn = () => {};
console.info = () => {};

// Create a placeholder .env file in the project root so we can verify it is
// blocked even when a real file exists.
const envPath = path.join(rootDir, '.env');
let createdTestEnv = false;
try {
  await fs.access(envPath);
} catch {
  // File does not exist – create a harmless placeholder so the block test is
  // meaningful regardless of whether contributors have a real .env present.
  await fs.writeFile(envPath, 'APPWRITE_API_KEY=test-secret-key\nAPPWRITE_PROJECT_ID=test-project\n', 'utf8');
  createdTestEnv = true;
}

await import('./realtime-server.mjs');

// Restore console
console.log  = origLog;
console.warn = origWarn;
console.info = origInfo;

// Give the server a moment to start
await new Promise((r) => setTimeout(r, 300));

const BASE = `http://127.0.0.1:${TEST_PORT}`;

// ── test suite ────────────────────────────────────────────────────────────────

console.log('\nRunning server security tests…\n');

// 1. Health check — server is up
console.log('1. Server startup and health check');
{
  const { status, body } = await get(`${BASE}/healthz`);
  assert(status === 200, `GET /healthz returns 200 (got ${status})`);
  const json = JSON.parse(body);
  assert(json.ok === true, 'health response has { ok: true }');
}

// 2. /api/public-config returns a valid JSON object with expected shape
console.log('\n2. Public configuration endpoint');
{
  const { status, body } = await get(`${BASE}/api/public-config`);
  assert(status === 200, `GET /api/public-config returns 200 (got ${status})`);
  let cfg;
  try { cfg = JSON.parse(body); } catch { cfg = null; }
  assert(cfg !== null, 'Response is valid JSON');
  assert(typeof cfg === 'object', 'Response is an object');
  assert('endpoint'            in cfg, 'Response contains endpoint key');
  assert('projectId'           in cfg, 'Response contains projectId key');
  assert('databaseId'          in cfg, 'Response contains databaseId key');
  assert('ordersCollectionId'  in cfg, 'Response contains ordersCollectionId key');
  assert('accountsCollectionId' in cfg, 'Response contains accountsCollectionId key');
}

// 3–5. .env variants are blocked
console.log('\n3. .env file access is blocked');
{
  const { status } = await get(`${BASE}/.env`);
  assert(status === 403, `GET /.env returns 403 (got ${status})`);
}

console.log('\n4. .env.local file access is blocked');
{
  const { status } = await get(`${BASE}/.env.local`);
  assert(status === 403, `GET /.env.local returns 403 (got ${status})`);
}

console.log('\n5. .env.production file access is blocked');
{
  const { status } = await get(`${BASE}/.env.production`);
  assert(status === 403, `GET /.env.production returns 403 (got ${status})`);
}

// 6. .git directory is blocked
console.log('\n6. .git directory access is blocked');
{
  const { status } = await get(`${BASE}/.git/config`);
  assert(status === 403, `GET /.git/config returns 403 (got ${status})`);
}

// 7. Runtime data directory is blocked
console.log('\n7. Runtime data directory access is blocked');
{
  const { status } = await get(`${BASE}/data/realtime-state.json`);
  assert(status === 403, `GET /data/realtime-state.json returns 403 (got ${status})`);
}

// 8. Arbitrary hidden dot-files are blocked
console.log('\n8. Hidden dot-files are blocked');
{
  const { status } = await get(`${BASE}/.gitignore`);
  assert(status === 403, `GET /.gitignore returns 403 (got ${status})`);
}

// 9. Normal static assets still load
console.log('\n9. Public static assets are served normally');
{
  const { status } = await get(`${BASE}/`);
  assert(status === 200, `GET / returns 200 (got ${status})`);
}

// 10. Regression: public config never leaks server-side secrets
console.log('\n10. Regression — public config does not expose secrets');
{
  const { body } = await get(`${BASE}/api/public-config`);
  // The response body must not contain anything that looks like an API key.
  // We specifically look for the placeholder written in the test .env above.
  assert(
    !body.includes('test-secret-key'),
    'Response does not contain APPWRITE_API_KEY value'
  );
  assert(
    !body.includes('APPWRITE_API_KEY'),
    'Response does not contain the APPWRITE_API_KEY field name'
  );
  assert(
    !body.includes('REALTIME_AUTH_TOKEN'),
    'Response does not contain the REALTIME_AUTH_TOKEN field name'
  );
  assert(
    !body.includes('test-token-do-not-use'),
    'Response does not contain the REALTIME_AUTH_TOKEN value'
  );
}

// ── cleanup ───────────────────────────────────────────────────────────────────

// Remove the placeholder .env file if we created it
if (createdTestEnv) {
  try { await fs.unlink(envPath); } catch { /* ignore */ }
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);
