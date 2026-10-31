const fs=require('node:fs'),assert=require('node:assert/strict');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
assert(/^\d+\.\d+\.\d+$/.test(pkg.version),'release must use semantic versioning');
const releaseLabel=pkg.version.replace(/\.0$/,'');
assert.equal(lock.version,pkg.version,'lockfile must match release version');
assert.equal(lock.packages[''].version,pkg.version,'lockfile root package must match release');
assert(fs.existsSync('assets/smcity-welcome.webp'),'original poster should remain available');
for(const path of ['index.html','dist/index.html']){
 const html=fs.readFileSync(path,'utf8');
 assert(html.includes('<title>SMCITY เมืองที่การเดินทางมีความหมาย'),'published title preserves the game brand');
 assert(html.includes('<small>v'+releaseLabel+'</small>'),'in-game dashboard must show release');
 const css=html.match(/<style id="smcity-welcome-style">([\s\S]*?)<\/style>/);
 assert(css, path+' welcome style exists');
 const style=css[1];
 assert(style.includes('#smcityWelcome::before{content:none!important;display:none!important}'),path+' no dark game overlay');
 assert(style.includes('background:transparent;box-shadow:none;overflow:visible;pointer-events:auto'),path+' has no opaque poster underlay');
 assert(style.includes('height:auto;max-height:100%;object-fit:contain'),path+' follows intrinsic photo ratio without dark bars');
 assert(!/background:rgba\(4,18,36/.test(style),path+' must not dim the actual game');
 assert(!/background:#063565/.test(style),path+' must not draw dark blue card behind welcome');
 assert(html.includes('id="smcityWelcomeImage"')&&html.includes('smcity-welcome-image'),path+' keep poster image');
 assert(html.includes('id="smcityWelcomeClose"'),path+' keep × button');
 assert(html.includes("image.addEventListener('click',closeWelcome)"),path+' tap poster dismisses');
 assert(html.includes("window.addEventListener('resize',updateWelcome"),path+' poster responsive');
}
console.log('SMCITY welcome poster transparent-background checks passed');
