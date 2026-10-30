const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elements=new Map(),handlers=new Map(),timers=new Map();let game,updates=0,nextTimer=1;
const get=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',open:false,
 classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},setAttribute:noop,
 addEventListener(name,fn){this.events.set(name,fn);if(id==='world')handlers.set(name,fn);},getBoundingClientRect:()=>({top:100,bottom:300,height:200}),events:new Map(),getContext:()=>new Proxy({},{get:()=>noop}),
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
near(game.cam.angle,Math.PI/4,'default yaw');near(game.cam.elevation,Math.PI*50/180,'default elevation');
let b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',10,400,200);near(game.cam.z,b.z,'rotation locks scale even when finger spacing changes');touch('pointermove',11,400,400);
near(game.cam.angle,b.angle+Math.PI/2,'two-finger twist rotates actual camera continuously');near(game.cam.z,b.z,'twisting preserves zoom');near(game.cam.elevation,b.elevation,'twisting does not tilt');
touch('pointerup',10,400,200);const after=baseline();touch('pointermove',11,700,600);near(game.cam.angle,after.angle,'remaining finger cannot start another action');touch('pointerup',11,700,600);
assert.equal(game.state.roads.size,roads);assert.equal(game.state.money,money);assert(!get('dialog').open);assert.match(get('hint').textContent,/ลากจากถนนเดิม/,'construction tool survives orbit');
b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',10,350,340);touch('pointermove',11,550,340);near(game.cam.angle,b.angle-50*.0085,'faster left-right orbit');near(game.cam.elevation,b.elevation+.16,'parallel vertical drag tilts');near(game.cam.z,b.z,'parallel drag preserves zoom');release();
// Two fingers dragging together rotate; spreading and squeezing zoom.
b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);
touch('pointermove',10,270,300);near(game.cam.z,b.z,'async first pointer does not zoom');
touch('pointermove',11,470,300);
near(game.cam.angle,b.angle+30*.0085,'leftward gesture rotates left');
near(game.cam.z,b.z,'drag never zooms');release();
b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);
touch('pointermove',10,270,300);touch('pointermove',11,530,300);
near(game.cam.z,b.z*1.3,'pinch spread zooms in');
near(game.cam.angle,b.angle,'pinch does not rotate');
near(game.cam.elevation,b.elevation,'pinch does not tilt');
touch('pointermove',10,330,300);touch('pointermove',11,470,300);
near(game.cam.z,b.z*.7,'pinch squeeze zooms out');release();
b=baseline();touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);
touch('pointermove',11,600,300);near(game.cam.z,b.z*1.5,'intentional anchored pinch zooms');release();
// Right slider controls tilt and leaves pinch zoom untouched.
b=baseline();const rail=get('cameraPitchTrack');
const gesture=y=>({clientY:y,pointerId:25,button:0,preventDefault:noop,stopPropagation:noop});
assert.equal(get('cameraPitchRail').hidden,false,'pitch slider active');
rail.events.get('pointerdown')(gesture(116));
near(game.cam.elevation,Math.PI*78/180,'slider up raises camera');
rail.events.get('pointermove')(gesture(284));
near(game.cam.elevation,Math.PI*35/180,'slider down lowers camera');
rail.events.get('pointerup')(gesture(284));
near(game.cam.z,b.z,'pitch slider leaves zoom alone');
get('cameraPitchReset').onclick();
near(game.cam.angle,Math.PI/4,'right reset restores yaw');
near(game.cam.elevation,Math.PI*50/180,'right reset restores pitch');
near(game.cam.z,b.z,'right reset keeps zoom');
// All touch IDs remain latched until released, including extra fingers/cancellation.
touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointerdown',12,600,300);touch('pointerup',12,600,300);touch('pointercancel',10,300,300);touch('pointerup',11,500,300);assert.equal(game.state.roads.size,roads);
// Native mice emit mousedown/up for chord changes, not a second pointerdown.
game.resetCameraAngle();b=baseline();send('pointerdown',{buttons:1});send('mousedown',{buttons:1});send('mousedown',{button:2,buttons:3});send('pointermove',{clientX:440,clientY:320,buttons:3});near(game.cam.angle,b.angle-40*.0085,'faster mouse chord orbit');near(game.cam.elevation,b.elevation+.08,'chord tilts');near(game.cam.z,b.z,'mouse rotation never changes scale');
send('mouseup',{button:0,buttons:2});const held=baseline();send('pointermove',{clientX:500,buttons:2});near(game.cam.angle,held.angle,'one released mouse button ends rotation');send('pointerup',{button:2,buttons:0});send('mouseup',{button:2,buttons:0});send('contextmenu');assert.match(get('hint').textContent,/ลากจากถนนเดิม/,'chord context menu cannot cancel selected construction tool');assert(!get('dialog').open);
b=baseline();send('pointerdown',{button:2,buttons:2});send('mousedown',{button:2,buttons:2});send('contextmenu');send('mousedown',{button:0,buttons:3});send('pointermove',{clientX:420,clientY:310,buttons:3});near(game.cam.angle,b.angle-20*.0085,'right-first chord');send('mouseup',{button:2,buttons:1});send('pointerup',{button:0,buttons:0});send('mouseup',{button:0,buttons:0});assert.match(get('hint').textContent,/ลากจากถนนเดิม/);
send('pointerdown',{button:2,buttons:2});send('pointerup',{button:2,buttons:0});assert.match(get('hint').textContent,/ลากแผนที่เพื่อเลื่อน/,'right-only click still cancels on release');
const x=game.cam.x;send('pointerdown',{buttons:1});send('pointermove',{clientX:450,buttons:1});send('pointerup');assert(game.cam.x!==x,'ordinary left drag still pans');
// Safe tilt and zoom bounds; a zero-length pinch never produces NaN.
touch('pointerdown',10,300,300);touch('pointerdown',11,500,300);touch('pointermove',10,300,10000);touch('pointermove',11,500,10000);assert(game.cam.elevation<=Math.PI*78/180);release();
game.resetCameraAngle();for(let i=0;i<150;i++)game.nudgeCamera('down');assert(game.cam.elevation>=Math.PI*35/180-1e-9,'minimum tilt prevents severely flattened ground');game.resetCameraAngle();
touch('pointerdown',10,300,300);touch('pointerdown',11,300,300);touch('pointermove',11,300,300);assert(Number.isFinite(game.cam.z)&&game.cam.z>=.22);release();
assert.equal(game.state.roads.size,roads);assert.equal(game.state.money,money);assert(updates>10);assert.equal([...timers.values()].filter(t=>t.delay===320).length,0,'gestures never schedule construction taps');
console.log('PASS: 45/50 default view, high-speed orbit, pinch zoom, pitch slider, reset and mouse chords');

(async()=>{
 const THREE=await import(require('node:url').pathToFileURL(require('node:path').resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8');
 const start=source.indexOf(' updateCamera(cam){'),end=source.indexOf('\n screen(',start);
 assert(start>=0&&end>start,'camera method is present');
 const updateCamera=new Function('return ({'+source.slice(start,end).trim()+'}).updateCamera')();
 const r={updateCamera};
 r.w=1280;r.h=800;r.camera=new THREE.PerspectiveCamera(35,1.6,.1,1500);r.light=new THREE.DirectionalLight();
 const cam={x:160,y:150,z:1.5,angle:0,elevation:.7};
 r.updateCamera(cam);
 const focus=new THREE.Vector3(cam.x,0,cam.y);
 const before=r.camera.position.clone(),radius=before.distanceTo(focus),fov=r.camera.fov;
 near(r.camera.aspect,1280/800,'perspective aspect follows viewport');
 r.updateCamera({...cam,angle:.01});
 near(r.camera.position.distanceTo(focus),radius,'yaw preserves perspective focus distance');
 near(r.camera.fov,fov,'yaw preserves field of view');
 assert(r.camera.position.distanceTo(before)>.1,'small drags orbit in real 3D');
 const center=focus.clone().project(r.camera);
 assert(Math.hypot(center.x,center.y)<1e-8,'orbit keeps city focus centered');
 r.updateCamera({...cam,elevation:1});
 near(r.camera.position.distanceTo(focus),radius,'pitch preserves camera distance');
 assert(r.camera.position.y>before.y,'tilt changes real 3D camera height');
 r.updateCamera({...cam,z:3});
 assert(r.camera.position.distanceTo(focus)<radius,'pinch zoom moves perspective camera closer');
 r.updateCamera({...cam,angle:0});
 const projectedWidth=z=>{
  const a=new THREE.Vector3(cam.x,0,z).project(r.camera);
  const b=new THREE.Vector3(cam.x+1,0,z).project(r.camera);
  return Math.abs(b.x-a.x);
 };
 assert(projectedWidth(cam.y+5)>projectedWidth(cam.y-5),'perspective near objects appear wider than distant objects');
 r.w=1024;r.h=768;r.updateCamera(cam);
 near(r.camera.aspect,1024/768,'resize refreshes perspective aspect');
 r.w=1280;r.h=800;r.updateCamera({...cam,elevation:Math.PI*22/180,angle:0});
 const alongRoad=new THREE.Vector3(cam.x,0,cam.y+1).project(r.camera),groundCenter=focus.clone().project(r.camera);
 assert(Number.isFinite(alongRoad.y-groundCenter.y),'clamped low pitch still projects the ground');
 const legacyCam={...cam,elevation:Math.PI*22/180};
 r.updateCamera(legacyCam);near(legacyCam.elevation,Math.PI*35/180,'legacy tilt normalized');
 // Preserve old orthographic rendering for an A/B comparison using ?camera=ortho.
 r.camera=new THREE.OrthographicCamera(-30,30,20,-20,.1,1500);r.updateCamera(cam);
 const oldWidth=r.camera.right-r.camera.left;
 r.updateCamera({...cam,angle:.4});
 near(r.camera.right-r.camera.left,oldWidth,'orthographic comparison retains fixed width');
 console.log('PASS: perspective orbit, depth/zoom, viewport aspect, safety, orthographic comparison');
})().catch(e=>{console.error(e);process.exitCode=1;});
