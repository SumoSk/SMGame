'use strict';
// SMCITY PC: serve the packaged game over loopback HTTP.
// Supabase accepts http://127.0.0.1 origins; file:// has the opaque "null" origin
// and is intentionally rejected by the account, save and creator endpoints.
const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = 53118;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm'
};
let server = null;
let window = null;

async function serveGame(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  try {
    const root = path.resolve(app.getAppPath());
    const url = new URL(req.url || '/', 'http://' + HOST);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) {
      res.writeHead(400); res.end(); return;
    }
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403); res.end(); return;
    }
    const info = await fs.stat(file);
    if (info.isDirectory()) file = path.join(file, 'index.html');
    const bytes = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500);
    res.end();
  }
}
function bind(port) {
  return new Promise((resolve, reject) => {
    const candidate = http.createServer((req, res) => void serveGame(req, res));
    candidate.once('error', reject);
    candidate.listen(port, HOST, () => {
      candidate.off('error', reject);
      resolve(candidate);
    });
  });
}
async function createWindow() {
  try {
    try {
      server = await bind(PORT);
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      // A fallback port still uses a permitted localhost origin.
      server = await bind(0);
    }
    server.on('error', error => console.error('SMCITY local server:', error));
    const port = server.address().port;
    window = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      autoHideMenuBar: true,
      backgroundColor: '#111c27',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });
    await window.loadURL('http://' + HOST + ':' + port + '/index.html');
  } catch (error) {
    console.error('Failed to start SMCITY:', error);
    app.quit();
  }
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (window) { if (window.isMinimized()) window.restore(); window.focus(); }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (server) server.close(); });
}
