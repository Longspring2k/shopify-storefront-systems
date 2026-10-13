import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseQuery } from '../src/query-state.mjs';
import { selectProducts } from '../src/catalog.mjs';

const files = new Map([
  ['/', ['index.html','text/html; charset=utf-8']], ['/app.mjs',['app.mjs','text/javascript; charset=utf-8']], ['/styles.css',['styles.css','text/css; charset=utf-8']],
  ['/src/query-state.mjs',['../src/query-state.mjs','text/javascript; charset=utf-8']], ['/src/controller.mjs',['../src/controller.mjs','text/javascript; charset=utf-8']]
]);
const headers = { 'cache-control':'no-store', 'x-content-type-options':'nosniff' };
const send = (res, status, body, type='text/plain; charset=utf-8') => { res.writeHead(status, { ...headers, 'content-type': type }); res.end(body); };

export async function startServer({ port = 4176 } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
      if (url.pathname === '/api/products') {
        let state; try { state = parseQuery(url.search); } catch { return send(res, 400, JSON.stringify({ error:'Invalid query' }), 'application/json; charset=utf-8'); }
        return send(res, 200, JSON.stringify(selectProducts(state)), 'application/json; charset=utf-8');
      }
      const entry = files.get(url.pathname);
      if (!entry) return send(res, 404, 'Not found');
      const body = await readFile(fileURLToPath(new URL(entry[0], import.meta.url)));
      return send(res, 200, body, entry[1]);
    } catch { return send(res, 500, 'Internal error'); }
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  return server;
}
