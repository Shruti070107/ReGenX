import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { escapeHTML } from '../src/html-utils.js';

const source = readFileSync('src/app.js', 'utf8');

assert.match(source, /import\s+\{\s*escapeHTML\s*\}\s+from\s+['"]\.\/html-utils\.js['"]/);
assert.equal(
  escapeHTML(`<img src=x onerror="alert('xss')"> & waste`),
  '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt; &amp; waste',
);
assert.equal(escapeHTML(null), '');
assert.equal(escapeHTML(undefined), '');
assert.equal(escapeHTML(42), '42');
assert.equal(escapeHTML('Safe Provider'), 'Safe Provider');

console.log('escapeHTML regression check passed');
