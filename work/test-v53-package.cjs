const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('outputs/Traffic-Fixer-Thailand-3D.html','utf8');
const start=html.indexOf('gameScript.textContent=')+'gameScript.textContent='.length,end=html.indexOf(';document.body.appendChild(gameScript)',start);
assert(start>20&&end>start);assert.equal(JSON.parse(html.slice(start,end)),game);
assert(html.includes('>v5.3<'));assert(html.includes('data:image/webp;base64,'));
const hash=crypto.createHash('sha256').update(game).digest('hex').slice(0,12);
assert(fs.readFileSync('dist/bootstrap.js','utf8').includes('game.js?v='+hash));
assert.equal(JSON.parse(fs.readFileSync('package.json')).version,'5.3.0');
assert.equal(JSON.parse(fs.readFileSync('package-lock.json')).version,'5.3.0');
console.log(JSON.stringify({passed:true,version:'5.3.0',gameHash:hash,standaloneBytes:Buffer.byteLength(html),embeddedSourceMatches:true}));

