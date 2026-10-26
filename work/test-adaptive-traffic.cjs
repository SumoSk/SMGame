// Regression tests for the adaptive traffic policy and incident-aware reports.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elem=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)};
const store={},context={document:{getElementById:get,querySelector:elem,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
const snapshot=game.snapshot();const empty=game.cityBugReport();
assert.equal(empty.summary.vehicles,0);assert.equal(empty.summary.suspectedVehicles,0);
assert.equal(game.snapshot(),snapshot,'opening bug report must never alter saved city');

function roadScene(blockTarget=false,includeLeader=true){
 game.reset();const st=game.state;st.roads.clear();st.vehicles.clear();st.occ.clear();st.reservations.clear();st.junctionCache.clear();st.junctionLayoutCache?.clear();st.version++;
 const nodes=Array.from({length:24},(_,i)=>game.id(110+i,155));
 nodes.forEach(node=>st.roads.set(node,{type:'medium',main:false,links:new Set(),load:0,wait:0}));
 for(let i=1;i<nodes.length;i++){st.roads.get(nodes[i]).links.add(nodes[i-1]);st.roads.get(nodes[i-1]).links.add(nodes[i]);}
 const add=(id,pos,lane,phase='driving')=>{
  const car={id,kind:'pass',path:[...nodes],pathSet:new Set(nodes),pos,progress:0,speed:0,lane,laneSeed:lane,motionSeedLane:lane,phase,wait:0,stopReason:'',noUTurnPolicy:1,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{},routeCheckedVersion:st.version,version:st.version,lastMovedAt:st.time,nextRouteRetry:st.time+999};
  st.vehicles.set(id,car);car.occKey=nodes[pos]+':0:'+lane;st.occ.set(car.occKey,id);return car;
 };
 const car=add(310,5,1);car.wait=3;
 const leader=includeLeader?add(311,7,1,'stuck'):null;
 if(leader){leader.heldPose=game.vehiclePosition(leader);leader.stopReason='ไม่มีเส้นทาง';leader.routeMissing=true;leader.nextRouteRetry=st.time+999;}
 if(blockTarget)add(312,6,0);
 return {car,leader};
}
let {car}=roadScene(false);
const before=game.vehiclePosition(car);game.advanceVehicles(0,0);
assert.equal(game.plannedLane(car,car.pos),0,'safe adjacent lane should be selected');
const after=game.vehiclePosition(car);
assert(Math.hypot(before.x-after.x,before.y-after.y)<1e-8,'lane changes may not teleport the car');
assert(car.adaptiveLaneUntil>game.state.time,'prevent repeated lane zigzag');
const changed=game.cityBugReport();assert.equal(changed.summary.vehicles,2);
assert.equal(changed.vehicles.length,2);
({car}=roadScene(true));game.advanceVehicles(0,0);
assert.equal(game.plannedLane(car,car.pos),1,'cannot steal occupied target lane');
({car}=roadScene(false,false));game.advanceVehicles(0,0);
assert.equal(game.plannedLane(car,car.pos),1,'no gratuitous lane change on empty road');
const old=game.snapshot(),report=game.cityBugReport();
assert.equal(game.snapshot(),old,'report remains read-only after simulation');
assert(report.summary.categories&&report.summary.normalQueueVehicles>=0);
console.log(JSON.stringify({passed:true,checks:['no teleport','blocked lane rejected','unblocked lane selected','no gratuitous lane changes','read-only bug report']}));
