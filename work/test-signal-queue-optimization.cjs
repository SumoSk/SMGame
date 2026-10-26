// The signal optimization must not change admissions, head-of-line fairness,
// turn conflict reservations, or vehicles' rights after entering an intersection.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elements=new Map(),storage={};let game;
const get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal:noop,close:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});return elements.get(id)};
const ctx={document:{getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{setItem:(k,v)=>storage[k]=v,getItem:k=>storage[k]},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),ctx);
game.reset();
const center=game.id(150,150),slots=game.signalSlots(center),cycle=game.signalCycle(center);
assert.equal(slots.length,4);
game.state.time=cycle*20-(center%17)*cycle/24+.1;
const active=game.signalStatus(center).incoming;
assert.equal(active,slots[0].incoming);
const pathOf=d=>{
 const dir=[[1,0],[0,1],[-1,0],[0,-1]][d],node=(n)=>game.id(150+dir[0]*n,150+dir[1]*n);
 return Array.from({length:25},(_,k)=>node(k-12));
};
function car(id,d,seed=0){
 const path=pathOf(d),v={id,path,pathSet:new Set(path),phase:'driving',kind:'pass',pos:0,progress:0,speed:0,laneSeed:seed,motionSeedLane:seed,lane:seed,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{},wait:0,stopReason:'',lastMovedAt:game.state.time,noUTurnPolicy:1};
 game.state.vehicles.set(id,v);
 const p=game.motionPlan(v);
 assert.equal(p.junctions.length,1);
 const guard=p.junctions[0],approaches=[];
 for(let pos=0;pos<guard.pos;pos++){
  v.pos=pos;v.progress=0;
  const dist=game.motionDistance(v,p);
  if(dist<guard.entry&&guard.stop-dist<=2.5)approaches.push(pos);
 }
 assert(approaches.length,'fixture needs a car queued before a real approach stop line');
 v.pos=approaches[0];v.progress=0;return v;
}
const green=car(901,active,0),red=car(902,slots[1].incoming,0);
const greenPlan=game.motionPlan(green),redPlan=game.motionPlan(red);
assert.equal(greenPlan.junctions[0].connector,undefined);
assert.equal(redPlan.junctions[0].connector,undefined);
game.prepareJunctionQueues();
const current=game.state.junctionQueues.get(center);
assert(current&&current.some(q=>q.id===green.id),'green approach has active queue request');
assert(!current.some(q=>q.id===red.id),'red approach skips intersection conflict sampling');
assert(greenPlan.junctions[0].connector,'green approach connector computed');
assert.equal(redPlan.junctions[0].connector,undefined,'red approach does not sample connector geometry');
const pos=greenPlan.junctions[0].pos,key=pos+':'+center,waitingSince=red.junctionQueueSince[key];
assert.equal(waitingSince,game.state.time,'red vehicle still receives its original arrival timestamp');
assert(!game.intersectionAllowed(red,pos),'red car remains behind stop line');
const originalGreen=game.junctionConnector(green,pos);
assert.equal(game.junctionConnector(green,pos),originalGreen,'connector geometry is reused by motion plan');
game.state.time+=8; // Next approach green; former green is now red.
assert.equal(game.signalStatus(center).incoming,slots[1].incoming);
game.prepareJunctionQueues();
const switched=game.state.junctionQueues.get(center);
assert(switched&&switched.some(q=>q.id===red.id),'former red joins queue as soon as it becomes green');
assert(!switched.some(q=>q.id===green.id),'former green stops competing');
assert.equal(red.junctionQueueSince[key],waitingSince,'waiting priority survives the red phase');
assert.equal(game.junctionConnector(red,pos),redPlan.junctions[0].connector);
assert(!game.intersectionAllowed(green,pos),'previous approach now red');
assert(game.intersectionAllowed(red,pos),'previously red approach proceeds when allowed and clear');
game.reserveIntersection(red,pos);
game.state.time+=8; // Signal switches again while the car holds a valid pass.
assert(game.intersectionAllowed(red,pos),'a granted junction pass survives signal changes');
game.release(red);
assert(!game.intersectionAllowed(red,pos),'after relinquishing pass, new red blocks entry');
game.roadChanged([center]);
assert.notEqual(game.junctionConnector(green,pos),originalGreen,'geometry must rebuild after road layout changes');
console.log(JSON.stringify({passed:true,redQueueSkipped:true,waitTimestampPreserved:true,liveExitChecked:true,insidePassKept:true,geometryInvalidated:true}));
