import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../demo/server-lib.mjs';

test('server exposes only allowed routes and returns exact safe response shape', async t => {
  const server = await startServer({ port: 0 });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(`${base}/api/products?color=blue`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['items', 'page', 'pages', 'total']);
  assert.ok(body.items.every(item => Object.keys(item).sort().join(',') === 'color,id,name,price,size'));
  assert.equal((await fetch(`${base}/secret`)).status, 404);
  assert.equal((await fetch(`${base}/api/products`, { method: 'POST' })).status, 405);
});
