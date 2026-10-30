const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');

esbuild.buildSync({
  entryPoints: [path.join(root, 'work/member-entry.js')],
  outfile: path.join(root, 'dist/member.js'),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
});
// Keep the standalone simple game-account client in published builds.
fs.copyFileSync(path.join(root, 'work/simple-account.js'),path.join(root, 'dist/simple-account.js'));

