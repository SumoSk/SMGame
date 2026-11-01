'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const gameSource=fs.readFileSync('dist/game.js','utf8');
const rendererSource=fs.readFileSync('dist/renderer3d.js','utf8');
const noop=()=>{},nodes=new Map(),storage={};
function makeNode(){
 const classes=new Set(['hidden']);
 return{hidden:false,innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],open:false,
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>{if(on)classes.add(x);else classes.delete(x)}},
 setAttribute:noop,addEventListener:noop,querySelectorAll:()=>[],querySelector:()=>null,
 getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},
 setPointerCapture:noop,getBoundingClientRect:()=>({left:0,top:0,width:390,height:840}),
 appendChild:noop,insertAdjacentElement:noop,remove:noop};
}
function get(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id)}
let game;
const ctx={document:{getElementById:get,querySelector:()=>makeNode(),querySelectorAll:()=>[],addEventListener:noop,activeElement:null,createElement:makeNode},
 window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},
 innerWidth:390,innerHeight:840,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,
 localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v}},crypto:{randomUUID:crypto.randomUUID},console};
vm.createContext(ctx);vm.runInContext(gameSource,ctx,{timeout:30000});
assert(game,'test harness boots');
assert(gameSource.includes("state.citizens.get(v?.citizenId??cid)?.tourist"),'2D suppresses tourist status emojis');
assert(rendererSource.includes("!state.citizens.get(v?.citizenId??id)?.tourist"),'3D suppresses tourist status emojis');
assert.equal(game.cityNextLevelTarget(1),20);
assert.equal(game.cityNextLevelTarget(2),40);
assert.equal(game.cityNextLevelTarget(3),60);
const p=game.ensurePerformance();p.current.total=10;p.current.ontime=7;
assert.equal(game.updateCityLevel(100),0,'70% cannot level up');
p.current.ontime=8;
assert.equal(game.updateCityLevel(100),5,'20/40/60/80/100 unlock at 80%');
assert.equal(game.cityLevelStatus().level,6);
assert.equal(game.cityLevelStatus().pending.length,5);
const previousLevel=game.cityLevelStatus().level,previousPeak=game.cityLevelStatus().peakPopulation;
const save=game.snapshot();
assert(game.loadGame(true,null,save));
assert.equal(game.cityLevelStatus().level,previousLevel,'save preserves level');
assert.equal(game.cityLevelStatus().peakPopulation,previousPeak,'save preserves peak');
assert.equal(game.cityLevelStatus().pending.length,5,'save preserves unused crates');
function seedQueue(stoppedMinutes){
 game.reset();const st=game.state;
 const path=Array.from({length:19},(_,i)=>game.id(140+i,100));
 st.roads.clear();st.junctionCache.clear();
 for(let k=0;k<path.length;k++)st.roads.set(path[k],{type:'large',main:false,
  links:new Set([...(k>0?[path[k-1]]:[]),...(k+1<path.length?[path[k+1]]:[])]),load:0,wait:0});
 st.time=500;st.speed=1;
 for(let j=0;j<10;j++){
  const v={id:900+j,path,pathSet:new Set(path),pos:10-j,progress:0,lane:0,kind:'pass',phase:'driving',
   speed:0,wait:stoppedMinutes,lastMovedAt:st.time-stoppedMinutes,stopReason:j?'รถคันหน้าขวาง':'ไม่มีเส้นทาง',
   routeMissing:j===0?true:false,turnLanes:{},junctionPasses:[],toGate:j?path.at(-1):path[0],noUTurnPolicy:1};
  v.lane=game.plannedLane(v,v.pos);
  if(j===0){v.heldPose=game.vehiclePosition(v);v.phase='stuck'}
  st.vehicles.set(v.id,v);
 }
 return st;
}
let st=seedQueue(120);
game.scanIncidents(true);
assert.equal(game.incidentCases.size,1,'one actual root, not ten queue incidents');
assert.deepEqual([...game.incidentCases.values()][0].vehicles,[900]);
game.tick(0);
assert(!st.vehicles.has(900),'root automatically rescued at 120 game minutes');
for(let i=901;i<910;i++)assert(st.vehicles.has(i),'queued follower '+i+' must remain');
assert.equal(st.vehicles.size,9);
assert.equal(game.incidentCases.size,0,'followers do not become new incidents after root rescue');
game.tick(0);
assert.equal(st.vehicles.size,9,'second tick must not cascade tow the queue');
st=seedQueue(12);
game.scanIncidents(true);
assert.equal(game.incidentCases.size,1);
assert(game.resolveIncident(900),'player can help before 120 minutes');
assert.equal(st.vehicles.size,9,'manual rescue affects only root car');
for(let i=901;i<910;i++)assert(st.vehicles.has(i));
st=seedQueue(150);
const root=st.vehicles.get(900);
st.vehicles.delete(root.id);
for(const car of st.vehicles.values())car.stopReason='รถคันหน้าขวาง';
game.scanIncidents(true);
assert.equal(game.incidentCases.size,0,'normal waiting cars are not breakdowns');
game.advanceVehicles(0,0);
assert.equal(st.vehicles.size,9,'150-minute fallback never respawns normal queue');
console.log(JSON.stringify({passed:true,version:'5.3.1',levelStep:20,missionGate80:true,touristEmojiHidden:true,rootOnly:true,automaticAfter120:true,manualRescue:true,noQueueCascade:true}));
