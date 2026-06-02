import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPublicPostgresStatus } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(__dirname, '../public/app');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);

const mimeTypes = new Map([
  ['.bin', 'application/octet-stream'],
  ['.css', 'text/css; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
]);

const server = createServer(async (request, response) => {
  try {
    addBaseHeaders(response);

    if (request.url?.startsWith('/api/')) {
      await handleApiRequest(request, response);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { ok: false, error: 'method_not_allowed' });
      return;
    }

    await serveFrontend(request, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { ok: false, error: 'internal_server_error' });
  }
});

server.listen(port, host, () => {
  console.log(`Asseto server listening on http://${host}:${port}`);
});

async function handleApiRequest(request, response) {
  const url = new URL(request.url, getRequestBaseUrl(request));

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'asseto-api',
      environment: process.env.NODE_ENV || 'development',
      uptime: Number(process.uptime().toFixed(2)),
      postgres: getPublicPostgresStatus(),
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/config') {
    sendJson(response, 200, {
      ok: true,
      postgres: getPublicPostgresStatus(),
      frontendServedBy: 'node',
    });
    return;
  }

  sendJson(response, 404, { ok: false, error: 'api_route_not_found' });
}

async function serveFrontend(request, response) {
  const url = new URL(request.url, getRequestBaseUrl(request));
  const pathname = decodeURIComponent(url.pathname);
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const requestedFile = resolve(appDirectory, `.${normalizedPath}`);

  if (!requestedFile.startsWith(appDirectory)) {
    sendJson(response, 403, { ok: false, error: 'forbidden' });
    return;
  }

  let filePath = requestedFile;
  let fileStat = await getFileStat(filePath);

  if (!fileStat || fileStat.isDirectory()) {
    filePath = join(appDirectory, 'index.html');
    fileStat = await getFileStat(filePath);
  }

  if (!fileStat || !fileStat.isFile()) {
    sendJson(response, 503, {
      ok: false,
      error: 'frontend_build_missing',
      message: 'Run yarn build before starting the Node server.',
    });
    return;
  }

  sendFile(request, response, filePath, fileStat);
}

function sendFile(request, response, filePath, fileStat) {
  const extension = extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension) || 'application/octet-stream';
  const cacheControl = extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';

  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': fileStat.size,
    'Cache-Control': cacheControl,
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

async function getFileStat(filePath) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  response.end(JSON.stringify(body));
}

function addBaseHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function getRequestBaseUrl(request) {
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const hostHeader = request.headers['x-forwarded-host'] || request.headers.host || `localhost:${port}`;
  return `${protocol}://${hostHeader}`;
}
