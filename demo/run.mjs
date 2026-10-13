import { startServer } from './server-lib.mjs';
const server = await startServer({ port: Number(process.env.PORT || 4176) });
const port = server.address().port;
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/products?color=blue&sort=price-desc`);
  const body = await response.json();
  console.log(JSON.stringify({ url:`http://127.0.0.1:${port}`, status:response.status, total:body.total, first:body.items[0]?.name }, null, 2));
} finally { await new Promise(resolve => server.close(resolve)); }
