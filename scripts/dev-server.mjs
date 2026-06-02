import { createServer } from 'vite';

const server = await createServer({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();

async function close() {
  await server.close();
  process.exit(0);
}

process.on('SIGINT', close);
process.on('SIGTERM', close);

setInterval(() => {}, 1 << 30);
