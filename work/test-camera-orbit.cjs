const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elements=new Map(),handlers=new Map(),timers=new Map();let game,updates=0,nextTimer=1;
const get=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',open:false,
 classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,
 addEventListener:(name,fn)=>{if(id==='world')handlers.set(name,fn);},getContext:()=>new Proxy({},{get:()=>noop}),
 setPointerCapture:noop,hasPointerCapture:()=>false,releasePointerCapture:noop,showModal(){this.open=true},close(){this.open=false}});return elements.get(id);};
const renderer={setGraphicQuality:noop,resize:noop,updateCamera(){updates++;},world:(x,y)=>[x/26,y/26]};
const context={document:{getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[],addEventListener:noop},window:{addEventListener:noop,createTrafficRenderer:()=>renderer,__TRAFFIC_TEST_HARNESS__:g=>game=g},innerWidth:1280,innerHeight:800,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:(fn,delay)=>{const id=nextTimer++;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
const send=(name,extra={})=>handlers.get(name)({pointerId:1,pointerType:'mouse',button:0,buttons:0,clientX:400,clientY:300,shiftKey:false,preventDefault:noop,...extra});
const touch=(name,id,x,y)=>send(name,{pointerType:'touch',pointerId:id,clientX:x,clientY:y,buttons:name==='pointerup'?0:1});
const near=(a,b,msg)=>assert(Math.abs(a-b)<1e-8,msg+': '+a+' vs '+b);
const baseline=()=>({angle:game.cam.angle,elevation:game.cam.elevation,z:game.cam.z});
const release=()=>{touch('pointerup',10,300,300);touch('pointerup',11,500,300);};
game.selectTool('small');const roads=game.state.roads.size,money=game.state.money;
let b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',10,400,200);near(game.cam.z,b.z,'rotation locks scale even when finger spacing changes');touch('pointermove',11,400,400);
near(game.cam.angle,b.angle-Math.PI/2,'two-finger twist rotates actual camera continuously');near(game.cam.z,b.z,'twisting preserves zoom');near(game.cam.elevation,b.elevation,'twisting does not tilt');
touch('pointerup',10,400,200);const after=baseline();touch('pointermove',11,700,600);near(game.cam.angle,after.angle,'remaining finger cannot start another action');touch('pointerup',11,700,600);
assert.equal(game.state.roads.size,roads);assert.equal(game.state.money,money);assert(!get('dialog').open);assert.match(get('hint').textContent,/ลากจากถนนเดิม/,'construction tool survives orbit');
b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',10,350,340);touch('pointermove',11,550,340);near(game.cam.angle,b.angle-.3,'parallel horizontal drag orbits');near(game.cam.elevation,b.elevation+.16,'parallel vertical drag tilts');near(game.cam.z,b.z,'parallel drag preserves zoom');release();
b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',11,600,300);near(game.cam.z,b.z*1.5,'spread zooms');near(game.cam.angle,b.angle,'one-finger spread does not orbit');near(game.cam.elevation,b.elevation,'one-finger spread does not tilt');release();
// All touch IDs remain latched until released, including extra fingers/cancellation.
touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointerdown',12,600,300);touch('pointerup',12,600,300);touch('pointercancel',10,300,300);touch('pointerup',11,500,300);assert.equal(game.state.roads.size,roads);
// Native mice emit mousedown/up for chord changes, not a second pointerdown.
game.resetCameraAngle();b=baseline();send('pointerdown',{buttons:1});send('mousedown',{buttons:1});send('mousedown',{button:2,buttons:3});send('pointermove',{clientX:440,clientY:320,buttons:3});near(game.cam.angle,b.angle-.24,'left+right chord orbits');near(game.cam.elevation,b.elevation+.08,'chord tilts');near(game.cam.z,b.z,'mouse rotation never changes scale');
send('mouseup',{button:0,buttons:2});const held=baseline();send('pointermove',{clientX:500,buttons:2});near(game.cam.angle,held.angle,'one released mouse button ends rotation');send('pointerup',{button:2,buttons:0});send('mouseup',{button:2,buttons:0});send('contextmenu');assert.match(get('hint').textContent,/ลากจากถนนเดิม/,'chord context menu cannot cancel selected construction tool');assert(!get('dialog').open);
b=baseline();send('pointerdown',{button:2,buttons:2});send('mousedown',{button:2,buttons:2});send('contextmenu');send('mousedown',{button:0,buttons:3});send('pointermove',{clientX:420,clientY:310,buttons:3});near(game.cam.angle,b.angle-.12,'right-first chord also works');send('mouseup',{button:2,buttons:1});send('pointerup',{button:0,buttons:0});send('mouseup',{button:0,buttons:0});assert.match(get('hint').textContent,/ลากจากถนนเดิม/);
send('pointerdown',{button:2,buttons:2});send('pointerup',{button:2,buttons:0});assert.match(get('hint').textContent,/ลากแผนที่เพื่อเลื่อน/,'right-only click still cancels on release');
const x=game.cam.x;send('pointerdown',{buttons:1});send('pointermove',{clientX:450,buttons:1});send('pointerup');assert(game.cam.x!==x,'ordinary left drag still pans');
// Safe tilt and zoom bounds; a zero-length pinch never produces NaN.
touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',10,300,10000);touch('pointermove',11,500,10000);assert(game.cam.elevation<=Math.PI*78/180);release();
touch('pointerdown',10,300,300);touch('pointerdown',11,300,300);touch('pointermove',11,300,300);assert(Number.isFinite(game.cam.z)&&game.cam.z>=.22);release();
assert.equal(game.state.roads.size,roads);assert.equal(game.state.money,money);assert(updates>10);assert.equal([...timers.values()].filter(t=>t.delay===320).length,0,'gestures never schedule construction taps');
console.log('PASS: continuous touch twist/drag/zoom, mouse chord in either order, safe release/cancel, no accidental construction, right-click cancel, normal pan, bounded tilt and finite zoom');

(async()=>{
 const THREE=await import(require('node:url').pathToFileURL(require('node:path').resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer}=new Function('THREE',source+'return {TrafficRenderer};')(THREE),r=Object.create(TrafficRenderer.prototype);
 r.w=1280;r.h=800;r.camera=new THREE.OrthographicCamera();r.light=new THREE.DirectionalLight();
 const cam={x:160,y:150,z:1.5,angle:0,elevation:.7};r.updateCamera(cam);const before=r.camera.position.clone();
 const beforeWidth=r.camera.right-r.camera.left,beforeHeight=r.camera.top-r.camera.bottom;
 r.updateCamera({...cam,angle:.01});near(r.camera.right-r.camera.left,beforeWidth,'yaw preserves orthographic width');near(r.camera.top-r.camera.bottom,beforeHeight,'yaw preserves orthographic height');assert(r.camera.position.distanceTo(before)>.1,'small drags change the actual 3D camera position, with no preset angle snapping');
 const center=new THREE.Vector3(cam.x,0,cam.y).project(r.camera);assert(Math.hypot(center.x,center.y)<1e-8,'orbit keeps the city focus centered');
 r.updateCamera({...cam,elevation:1});near(r.camera.top-r.camera.bottom,beforeHeight,'pitch preserves projection scale');assert(r.camera.position.y>before.y,'tilt changes actual 3D camera height');
 near(r.camera.position.distanceTo(new THREE.Vector3(cam.x,0,cam.y)),before.distanceTo(new THREE.Vector3(cam.x,0,cam.y)),'camera orbits at fixed radius');
 console.log('PASS: real Three.js camera positions, continuous small-angle orbit, centered focus and physical height change');
})().catch(e=>{console.error(e);process.exitCode=1;});
