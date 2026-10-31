const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
// The playable page is the single UI source for hosted and downloadable builds.
fs.writeFileSync(path.join(root,'dist/index.html'),read('index.html').replace(/\b(src|href)="dist\//g,'$1="').replace(/src="assets\/smcity-welcome\.webp"/g,'src="../assets/smcity-welcome.webp"'));
const hash=source=>crypto.createHash('sha256').update(source).digest('hex').slice(0,12);
const game=read('dist/game.js'),renderer=read('dist/renderer3d.js'),member=read('dist/member.js'),simple=read('dist/simple-account.js'),saveStorage=read('dist/save-storage.js');
const gameVersion=hash(game),rendererVersion=hash(renderer),memberVersion=hash(member),simpleVersion=hash(simple),saveStorageVersion=hash(saveStorage);
const bootstrap=`import { TrafficRenderer } from './renderer3d.js?v=${rendererVersion}';\nwindow.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);\nawait import('./game.js?v=${gameVersion}');\nawait import('./member.js?v=${memberVersion}');\n`+
 `await import('./simple-account.js?v=${simpleVersion}');\n`+
 `await import('./save-storage.js?v=${saveStorageVersion}');\n`;
fs.writeFileSync(path.join(root,'dist/bootstrap.js'),bootstrap);
const version=hash(bootstrap);
for(const name of ['index.html','dist/index.html','dist/qa.html','dist/qa-tourism.html']){
 const file=path.join(root,name);
 fs.writeFileSync(file,read(name).replace(/bootstrap\.js(?:\?v=[^"\s]+)?"/g,'bootstrap.js?v='+version+'"'));
}

// Escape script-closing text inside vendor strings and use replacement callbacks
// so minified JavaScript containing "$&" is embedded literally.
const quote=source=>JSON.stringify(source).replace(/</g,'\\u003c');
const core=read('dist/vendor/three.core.js'),three=read('dist/vendor/three.module.js');
if(!three.includes('./three.core.js')||!renderer.includes('./vendor/three.module.js'))throw new Error('Unexpected module imports');
const inline=`\nconst makeModule=source=>URL.createObjectURL(new Blob([source],{type:'text/javascript'}));\n`+
 `const coreURL=makeModule(${quote(core)});\n`+
 `const threeURL=makeModule(${quote(three)}.replaceAll('./three.core.js',coreURL));\n`+
 `const rendererURL=makeModule(${quote(renderer)}.replaceAll('./vendor/three.module.js',threeURL));\n`+
 `const {TrafficRenderer}=await import(rendererURL);\nwindow.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);\n`+
 `const gameScript=document.createElement('script');gameScript.textContent=${quote(game)};document.body.appendChild(gameScript);\n`+
 `const memberScript=document.createElement('script');memberScript.textContent=${quote(member)};document.body.appendChild(memberScript);\n`+
 `const simpleScript=document.createElement('script');simpleScript.textContent=${quote(simple)};document.body.appendChild(simpleScript);\n`+
 `const saveScript=document.createElement('script');saveScript.textContent=${quote(saveStorage)};document.body.appendChild(saveScript);\n`;
const welcomeAsset=path.join(root,'assets/smcity-welcome.webp');
const welcomeData=fs.existsSync(welcomeAsset)?'data:image/webp;base64,'+fs.readFileSync(welcomeAsset).toString('base64'):null;
const html=read('dist/index.html')
 .replace(/<link rel="stylesheet" href="style\.css[^"\s]*">/,()=>'<style>\n'+read('dist/style.css')+'</style>')
 .replace(/<link rel="stylesheet" href="modal-system\.css[^"\s]*">/,()=>'<style>\n'+read('dist/modal-system.css')+'</style>')
 .replace(/<script type="module" src="bootstrap\.js[^"\s]*"><\/script>/,()=>'<script type="module">'+inline+'</script>')
 .replace(/src="\.\.\/assets\/smcity-welcome\.webp"/g,()=>welcomeData||'../assets/smcity-welcome.webp');
// Theme initialization and its toggle are separate inline scripts in v2.4.3.
// Embedding the module must preserve that template's script boundaries.
if((html.match(/<\/script>/g)||[]).length!==(read('dist/index.html').match(/<\/script>/g)||[]).length)throw new Error('Unsafe standalone script content');
fs.writeFileSync(path.join(root,'outputs/Traffic-Fixer-Thailand-3D.html'),html);
console.log(JSON.stringify({gameVersion,memberVersion,simpleVersion,bootstrapVersion:version,standaloneBytes:Buffer.byteLength(html)}));
