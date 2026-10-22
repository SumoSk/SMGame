const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const hash=source=>crypto.createHash('sha256').update(source).digest('hex').slice(0,12);
const game=read('dist/game.js'),renderer=read('dist/renderer3d.js'),member=read('dist/member.js');
const gameVersion=hash(game),rendererVersion=hash(renderer),memberVersion=hash(member);
const bootstrap=`import { TrafficRenderer } from './renderer3d.js?v=${rendererVersion}';\nwindow.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);\nawait import('./game.js?v=${gameVersion}');\nawait import('./member.js?v=${memberVersion}');\n`;
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
 `const memberScript=document.createElement('script');memberScript.textContent=${quote(member)};document.body.appendChild(memberScript);\n`;
const html=read('dist/index.html')
 .replace(/<link rel="stylesheet" href="style\.css[^"\s]*">/,()=>'<style>\n'+read('dist/style.css')+'</style>')
 .replace(/<script type="module" src="bootstrap\.js[^"\s]*"><\/script>/,()=>'<script type="module">'+inline+'</script>');
if((html.match(/<\/script>/g)||[]).length!==2)throw new Error('Unsafe standalone script content');
fs.writeFileSync(path.join(root,'outputs/Traffic-Fixer-Thailand-3D.html'),html);
console.log(JSON.stringify({gameVersion,memberVersion,bootstrapVersion:version,standaloneBytes:Buffer.byteLength(html)}));
