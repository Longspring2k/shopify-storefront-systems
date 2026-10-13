import { startServer } from './server-lib.mjs';
const port = Number(process.env.PORT || 4176);
const server = await startServer({ port });
console.log(`Collection demo listening on http://127.0.0.1:${server.address().port}`);
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
