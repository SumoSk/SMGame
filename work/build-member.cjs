const path = require('node:path');
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
