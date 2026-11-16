/**
 * KitchenCare Server
 * Combines Node.js Native HTTP Static File Server + SQLite REST API Backend
 * Serves on Port 5050 with zero external npm dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleApiRequest } = require('./backend/routes.js');

const PORT = process.env.PORT || 5050;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // 1. Check if request is for the backend REST API (/api/...)
  if (req.url.startsWith('/api/')) {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 2. Serve static frontend assets
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Sanitize path to prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(BASE_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for client-side routing
      const indexPath = path.join(BASE_DIR, 'index.html');
      fs.readFile(indexPath, (err2, data) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found: ' + reqPath);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('🍳 KitchenCare Full-Stack Restaurant Management POS');
  console.log(`🚀 Server & REST API: http://localhost:${PORT}/`);
  console.log('💾 Database Engine: SQLite (node:sqlite native)');
  console.log('====================================================');
});
