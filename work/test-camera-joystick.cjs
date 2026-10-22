const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const noop=()=>{};
const buttons=new Map(),elements=new Map();
let game,cameraUpdates=0;
const dirs=['up','down','left','right'];
function element(){
 const events=new Map(), attrs={};
 const el={style:{},dataset:{},textContent:'',innerHTML:'',open:false,hidden:false,events,attrs,
  classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
  addEventListener:(name,fn)=>events.set(name,fn),
  setAttribute:(key,val)=>{attrs[key]=val;},getAttribute:(key)=>attrs[key],
  setPointerCapture:noop,
  getContext:()=>new Proxy({}, {get:()=>noop}),
  showModal(){this.open=true;},close(){this.open=false;},
  setPointerCapture:noop,hasPointerCapture:()=>false,releasePointerCapture:noop
 };
 return el;
}
for(const dir of dirs){const btn=element();btn.dataset.cameraDirection=dir;buttons.set(dir,btn);}
const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const document={getElementById:get,querySelector:()=>element(),
 querySelectorAll:q=>q==='[data-camera-direction]'?[...buttons.values()]:[],
 addEventListener:noop};
const renderer={resize:noop,updateCamera(){cameraUpdates++;}};
const context={document,window:{addEventListener:noop,createTrafficRenderer:()=>renderer,__TRAFFIC_TEST_HARNESS__:x=>{game=x;}},
 innerWidth:1280,innerHeight:800,devicePixelRatio:1,requestAnimationFrame:noop,
 setTimeout:()=>1,clearTimeout:noop,localStorage:{setItem:noop,getItem:()=>null},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
assert.ok(game,'Game harness should initialize');
const initialAngle=game.cam.angle,initialElevation=game.cam.elevation;
assert.ok(get('resetCameraAngle').onclick,'Center reset is interactive');
for(const dir of dirs)assert.ok(buttons.get(dir).events.has('pointerdown'),dir+' pointer event missing');
const before=game.state.roads.size;
const down=dir=>buttons.get(dir).events.get('pointerdown')({button:0,pointerId:1,preventDefault:noop});
const up=dir=>buttons.get(dir).events.get('pointerup')({pointerId:1});
down('left');up('left');
assert.ok(game.cam.angle<initialAngle,'Left joystick rotates camera counterclockwise');
down('right');up('right');
assert.ok(Math.abs(game.cam.angle-initialAngle)<1e-9,'Right joystick reverses left rotation');
down('up');up('up');
assert.ok(game.cam.elevation>initialElevation,'Up joystick raises camera elevation');
down('down');up('down');
assert.ok(Math.abs(game.cam.elevation-initialElevation)<1e-9,'Down joystick reverses up elevation');
for(let i=0;i<100;i++)game.nudgeCamera('up');
assert.ok(game.cam.elevation<=Math.PI*78/180+1e-9,'Elevation has safe upper bound');
for(let i=0;i<150;i++)game.nudgeCamera('down');
assert.ok(game.cam.elevation>=Math.PI*22/180-1e-9,'Elevation has safe lower bound');
get('resetCameraAngle').onclick();
assert.ok(Math.abs(game.cam.angle-initialAngle)<1e-9,'Center restores default yaw');
assert.ok(Math.abs(game.cam.elevation-initialElevation)<1e-9,'Center restores default elevation');
assert.equal(game.state.roads.size,before,'Orbit must not affect roads');
assert.ok(cameraUpdates>10,'The camera is updated when joystick is used');
for(const page of ['index.html','dist/index.html']){
 const html=fs.readFileSync(page,'utf8');
 assert.ok(html.includes('id="cameraJoystick"'),'Joystick markup missing '+page);
 assert.ok(html.includes('data-camera-direction="left"'),'Left button missing '+page);
 assert.ok(html.includes('data-camera-direction="right"'),'Right button missing '+page);
 assert.ok(html.includes('data-camera-direction="up"'),'Up button missing '+page);
 assert.ok(html.includes('data-camera-direction="down"'),'Down button missing '+page);
 assert.ok(html.includes('id="resetCameraAngle"'),'Center reset missing '+page);
 assert.ok(html.includes('bootstrap.js?v=camerastick-v24-20261023'),'Stale bootstrap cache '+page);
}
const rendererText=fs.readFileSync('dist/renderer3d.js','utf8');
assert.ok(rendererText.includes('cam.elevation??Math.atan2(86,90)'),'Renderer must apply joystick elevation');
console.log('Camera joystick: 4 directions, live 3D updates, pitch limits, reset, markup and cache passed.');
