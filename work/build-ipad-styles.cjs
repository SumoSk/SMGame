const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const stylesheet = path.join(root, 'dist/style.css');
const marker = '/* iPad native-size compatibility */';
const existing = fs.readFileSync(stylesheet, 'utf8');
let tail = '';
const markerAt = existing.indexOf(marker);
if (markerAt >= 0) {
 const open = existing.indexOf('{', markerAt); let depth = 1, end = open + 1;
 for (; end < existing.length && depth; end++) { if (existing[end] === '{') depth++; else if (existing[end] === '}') depth--; }
 if (depth) throw new Error('Unclosed iPad compatibility block');
 tail = existing.slice(end).trim();
}
const base = existing.split(marker)[0].trimEnd() + '\n';
const overlays = 'body > :is(.hud,.city-panel,.inspector,.map-tools,.map-caption,.bottom,#toast,dialog)';
const scale = Number(base.match(/--ui-scale\s*:\s*([.\d]+)/)?.[1]);
if (!(scale > 0 && scale <= 1)) throw new Error('Missing interface scale');

// iPad WebKit can counter-scale explicit fonts inside CSS zoom. Use native
// dimensions there instead, keeping desktop rules and viewport breakpoints intact.
const nativeSource = base
  .replace(/@import[^;]+;\s*/g, '')
  .replace(/:root\{--ui-scale:[.\d]+\}/, '')
  .replace(/\/\* Scale every interface overlay[^]*?\*\//, '')
  .replace(overlays + '{zoom:var(--ui-scale)}', '');
const native = nativeSource.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector, declarations) => {
  if (selector.trim() === 'canvas' || selector.includes('.member-')) return rule;
  // WebKit's native iPad override must scale rem-based typography as well as
  // pixel dimensions. Otherwise 13-20px text overflows the half-size panels.
  const compact = declarations.replace(/(-?(?:\d*\.\d+|\d+))(rem|px|dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/g,
    (_, value, unit) => Number((Number(value) * scale * (unit === 'rem' ? 16 : 1)).toFixed(6)) + (unit === 'rem' ? 'px' : unit));
  return selector + '{' + compact + '}';
});
if (/zoom:var\(--ui-scale\)/.test(native)) throw new Error('iPad must not use CSS zoom');
if (/\d(?:\.\d+)?rem\b/.test(native)) throw new Error('Unscaled rem typography in iPad styles');
const canvasRule = text => text.match(/(?:^|\})canvas\{[^}]+\}/)?.[0].replace(/^\}/, '');
if (!canvasRule(base) || canvasRule(base) !== canvasRule(native)) throw new Error('World canvas changed');
const mediaQueries = text => JSON.stringify(text.match(/@media[^{}]+/g));
if (mediaQueries(base) !== mediaQueries(native)) throw new Error('Responsive breakpoints changed');

const css = base + '\n' + marker + '\n' +
  '@supports (-webkit-touch-callout:none){\n' +
  'html{-webkit-text-size-adjust:none;text-size-adjust:none}\n' +
  overlays + '{zoom:1}\n' + native.trim() + '\n}\n' + (tail ? '\n' + tail + '\n' : '');
fs.writeFileSync(stylesheet, css);

const standalone = path.join(root, 'outputs/Traffic-Fixer-Thailand-3D.html');
const html = fs.readFileSync(standalone, 'utf8');
if (!/<style[^>]*>[^]*?<\/style>/.test(html)) throw new Error('Standalone stylesheet missing');
fs.writeFileSync(standalone, html.replace(/(<style[^>]*>)[^]*?(<\/style>)/,
  (_, open, close) => open + '\n' + css + close));

const version = crypto.createHash('sha256').update(css).digest('hex').slice(0, 12);
for (const relative of ['index.html', 'dist/index.html', 'dist/qa.html','dist/qa-tourism.html']) {
  const file = path.join(root, relative);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
    .replace(/style\.css(?:\?v=[^"\s]+)?"/g, 'style.css?v=' + version + '"'));
}
console.log(JSON.stringify({ version, nativeCanvasPreserved: true, desktopRulesPreserved: true }));
