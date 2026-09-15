const fs = require('fs');
const http = require('http');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.resolve(
  projectRoot,
  process.env.PLAYWRIGHT_WEB_OUTPUT_DIR || '.playwright-web',
);
const host = process.env.PLAYWRIGHT_WEB_HOST || '127.0.0.1';
const port = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.m4a', 'audio/mp4'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const isInsideOutputDir = candidate => {
  const relativePath = path.relative(outputDir, candidate);
  return !!relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const resolveAssetPath = requestPath => {
  const cleanPath = decodeURIComponent(String(requestPath || '/').split('?')[0].split('#')[0]);
  const normalizedPath = cleanPath === '/' ? '/index.html' : cleanPath;
  const candidatePath = path.resolve(outputDir, `.${normalizedPath}`);

  if (
    isInsideOutputDir(candidatePath) &&
    fs.existsSync(candidatePath) &&
    fs.statSync(candidatePath).isFile()
  ) {
    return candidatePath;
  }

  if (!path.extname(normalizedPath)) {
    const htmlCandidate = path.resolve(outputDir, `.${normalizedPath}/index.html`);
    if (
      isInsideOutputDir(htmlCandidate) &&
      fs.existsSync(htmlCandidate) &&
      fs.statSync(htmlCandidate).isFile()
    ) {
      return htmlCandidate;
    }
  }

  const fallback = path.join(outputDir, 'index.html');
  if (fs.existsSync(fallback) && fs.statSync(fallback).isFile()) {
    return fallback;
  }

  return null;
};

const sendFile = (response, filePath) => {
  const contentType = contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
  response.statusCode = 200;
  response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(filePath).pipe(response);
};

if (!fs.existsSync(path.join(outputDir, 'index.html'))) {
  throw new Error(
    `Playwright web output not found at ${outputDir}. Run \`npm run test:browser\` or \`node scripts/playwright-web-build.cjs\` first.`,
  );
}

const server = http.createServer((request, response) => {
  const filePath = resolveAssetPath(request.url);

  if (!filePath) {
    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Not found');
    return;
  }

  sendFile(response, filePath);
});

// Playwright keeps HTTP connections alive between smoke groups. Track and
// close them explicitly so the next group's webServer can reuse the port.
const sockets = new Set();
server.on('connection', socket => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});

server.listen(port, host, () => {
  console.log(`Playwright web server ready at http://${host}:${port}`);
});

const shutdown = signal => {
  for (const socket of sockets) {
    socket.destroy();
  }

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }

  server.close(() => {
    if (signal) {
      console.log(`Playwright web server stopped via ${signal}`);
    }

    process.exit(0);
  });

  // Do not leave the workflow waiting forever if a client does not release
  // its connection during shutdown.
  setTimeout(() => process.exit(0), 1000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
