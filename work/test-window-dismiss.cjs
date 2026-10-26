'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('id="dialogCloseTop"'),'game dialog needs a permanent close button');
assert(html.includes('id="memberClose"'),'account form needs a permanent close button');
const handlers=new Map(),nodes=new Map(),noop=()=>{};
const body={
 appendChild(el){nodes.set(el.id,el);el.parentNode=body;},
 removeChild(el){assert.equal(nodes.get(el.id),el);nodes.delete(el.id);el.parentNode=null;},
};
const get=id=>{
 if(id==='missionDailyAuto'&&!nodes.has(id))return null;
 if(!nodes.has(id)){
  const flags=new Set(['hidden']);
  const el={id,textContent:'',innerHTML:'',value:'',scrollTop:0,children:[],style:{},dataset:{},
   classList:{add:x=>flags.add(x),remove:x=>flags.delete(x),contains:x=>flags.has(x),toggle:noop},
   setAttribute:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop,focus:noop,
   addEventListener(name,fn){handlers.set(id+':'+name,fn);},
   showModal(){this.open=true;},close(){this.open=false;},
   getBoundingClientRect(){return{left:150,right:600,top:100,bottom:560,width:450,height:460};},
   querySelectorAll:()=>[],
   contains(target){for(let p=target;p;p=p.parentNode)if(p===this)return true;return false;},
  };
  nodes.set(id,el);
 }
 return nodes.get(id);
};
const document={
 getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[],
 addEventListener(name,fn){handlers.set('document:'+name,fn);},body,
 createElement(tag){const el={id:'',tagName:tag,parentNode:null,className:'',innerHTML:'',buttons:new Map(),
  contains(target){for(let p=target;p;p=p.parentNode)if(p===this)return true;return false;},
  querySelector(sel){if(!this.buttons.has(sel))this.buttons.set(sel,{onclick:null,parentNode:this});return this.buttons.get(sel);},
 };return el;},
};
let game;
const context={document,window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:api=>game=api},innerWidth:1440,innerHeight:900,devicePixelRatio:1,
 requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
const dialog=get('dialog'),dialogClick=handlers.get('dialog:click'),outside=handlers.get('document:pointerdown');
assert.equal(typeof dialogClick,'function','dialog should register backdrop event');
assert.equal(typeof outside,'function','floating panels should register outside-pointer event');
assert.equal(typeof get('dialogCloseTop').onclick,'function','top-right button must be wired');
get('menu').onclick();assert(dialog.open);
dialogClick({target:get('dialogContent'),clientX:50,clientY:150});
assert(dialog.open,'click on dialog contents must not close');
dialogClick({target:dialog,clientX:300,clientY:220});
assert(dialog.open,'click in dialog padding must not close');
dialogClick({target:dialog,clientX:60,clientY:220});
assert(!dialog.open,'backdrop outside actual dialog rectangle must close');
get('menu').onclick();assert(dialog.open);
get('dialogCloseTop').onclick();assert(!dialog.open,'close button works for dynamically generated menu');
const inside=panel=>({parentNode:panel});
const inspector=get('inspector');inspector.classList.remove('hidden');
outside({target:inside(inspector)});assert(!inspector.classList.contains('hidden'),'inspector content stays open');
outside({target:get('canvas')});assert(inspector.classList.contains('hidden'),'outside tap closes inspector');
game.selectTool('citizenDashboard');const citizen=get('citizensDashboard');assert(!citizen.classList.contains('hidden'));
outside({target:inside(citizen)});assert(!citizen.classList.contains('hidden'),'dashboard content stays open');
outside({target:get('canvas')});assert(citizen.classList.contains('hidden'),'outside tap closes citizen dashboard');
game.selectTool('touristDashboard');const tourist=get('touristsDashboard');assert(!tourist.classList.contains('hidden'));
outside({target:get('canvas')});assert(tourist.classList.contains('hidden'),'outside tap closes tourist dashboard');
game.state.time=1440;game.daily();game.state.time=1800;game.missionAutoPulse();
const morning=get('missionDailyAuto');assert(morning,'daily report appears at 06:00');
outside({target:inside(morning)});assert(get('missionDailyAuto'),'daily report interior click stays open');
outside({target:get('canvas')});assert.equal(get('missionDailyAuto'),null,'outside tap closes daily report');
assert.equal(game.state.missionStats.dismissedDay,0,'daily report does not reopen when dismissed');
game.missionAutoPulse();assert.equal(get('missionDailyAuto'),null);
console.log('Window dismissal passed: persistent X, backdrop only, panel clicks, outside taps, 06:00 report.');
