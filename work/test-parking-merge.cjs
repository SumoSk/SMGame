const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elem=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true},close(){this.open=false},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)},storage={};
const ctx={document:{getElementById:get,querySelector:elem,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:v=>game=v},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),ctx);
function setup(){
 game.reset();game.state.money=1e8;
 const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
 const office=game.buildBuilding('office_large',180,148-game.CATALOG.office_large.plotHeight,true);
 assert(home&&office);
 return {home,office};
}
const step=n=>{for(let i=0;i<n;i++){game.state.time+=.04;game.advanceVehicles(.05,.04);}};
function exitCar(home,office){
 const c=game.newCitizen(home);home.parked.add(c.id);game.parkingSpace(home,c.id,true);
 assert(game.createTrip(c,'work',home.id,office.id,null,null,null));
 return {c,v:game.state.vehicles.get(c.vehicleId)};
}
// ROAD MERGE: intentional arcade priority crosses stopped road vehicles
// but preserves the ownership of the road lane.
let {home,office}=setup();
let {c,v}=exitCar(home,office),from=v.path[0],next=v.path[1],lane=game.plannedLane(v,0),
    key=from+':'+game.dir(from,next)+':'+lane;
game.state.occ.set(key,87654321);
step(168);
assert.equal(v.phase,'parking_out','car should be crossing the road boundary');
assert.equal(v.mergeCommitted,true,'committed exit must not return to waiting');
assert.equal(v.occKey,null,'do not register on top of an occupied lane');
assert.equal(game.state.occ.get(key),87654321,'existing road occupancy is never overwritten');
step(150);
assert.notEqual(v.phase,'parking_out','committed merge should finish despite the occupied road');
assert.equal(game.state.occ.get(key),87654321,'same road car must keep its occupancy');
assert.equal(v.respawns||0,0,'no recovery should be needed before 60 minutes');
step(2500);
assert(office.parked.has(c.id),'parking car should complete its trip through stationary road traffic');
assert(!home.parked.has(c.id),'parking departure must release its original space');

// The road obstruction is a real stationary vehicle, not just a mocked
// occupancy map. A departing car may visually pass through this specific
// stopped road vehicle during its committed merge, without stealing its lane.
({home,office}=setup());
({c,v}=exitCar(home,office));
const exitStart=game.positionOnMotion(game.motionPlan(v),0);
assert(game.createTrip(null,'pass',null,null,game.id(168,150),game.id(194,150),null));
const roadCar=[...game.state.vehicles.values()].find(other=>other.id!==v.id);
assert(roadCar);
roadCar.phase='stuck';roadCar.heldPose={...exitStart};
roadCar.routeMissing=false;roadCar.recoveryVersion=game.state.version;roadCar.nextRouteRetry=Infinity;
const occupiedExit=v.path[0]+':'+game.dir(v.path[0],v.path[1])+':'+game.plannedLane(v,0);
roadCar.occKey=occupiedExit;game.state.occ.set(occupiedExit,roadCar.id);
let physicalCrossing=false;
for(let i=0;i<580;i++){
 step(1);
 if(game.state.vehicles.has(v.id)){
  const p=game.vehiclePosition(v);
  if(p&&game.lotCarsOverlap(p,roadCar.heldPose,0))physicalCrossing=true;
 }
}
assert(physicalCrossing,'forced departure should be able to pass physically stopped road traffic');
assert(office.parked.has(c.id),'departing car must still finish journey past stopped road car');
assert.equal(game.state.occ.get(occupiedExit),roadCar.id,'road vehicle keeps its original lane ownership');

// ALL PARKING PHASES must be eligible for recovery after 60 game minutes.
let phases=[];
for(const phase of ['departing','parking_in','parking_out','driving','stuck']){
 ({home,office}=setup());
 let car;
 if(phase==='parking_in'){
  const citizen=game.newCitizen(home);
  assert(game.createTrip(citizen,'moveIn',null,home.id,game.id(155,150),null,null));
  car=game.state.vehicles.get(citizen.vehicleId);
  const space=game.parkingSpace(home,citizen.id,true);
  car.lotBuilding=home.id;car.lotPath=[game.lotPoint(home,.45,game.CATALOG.home_large.plotHeight-.4),game.parkingSlotPose(home,space)];
  car.lotDistance=0;car.phase='parking_in';
 }else if(phase==='driving'||phase==='stuck'){
  assert(game.createTrip(null,'pass',null,null,game.state.gates[0],game.state.gates[2],null));
  car=[...game.state.vehicles.values()][0];car.phase=phase;
  if(phase==='stuck')car.routeMissing=true;
 }else{
  car=exitCar(home,office).v;
  if(phase==='parking_out'){
   const slot=game.parkingSpace(home,car.citizenId,true);
   car.lotBuilding=home.id;car.lotPath=[game.parkingSlotPose(home,slot),game.lotPoint(home,game.CATALOG.home_large.plotWidth-.45,game.CATALOG.home_large.plotHeight-.4)];
   car.lotDistance=.2;car.mergeCommitted=false;car.phase='parking_out';
  }
 }
 car.lastMovedAt=0;game.state.time=59.99;
 game.advanceVehicles(0,0);
 assert.equal(car.respawns||0,0,'premature restart: '+phase);
 car.lastMovedAt=0;game.state.time=60;
 game.advanceVehicles(0,0);
 assert.equal(car.respawns,1,'missing 60-minute recovery: '+phase);
 assert.equal(car.phase,'gate_waiting','new trip must begin at city gate: '+phase);
 assert.equal(car.lotPath,null,'old parking motion must be reset: '+phase);
 assert.equal(car.occKey,null,'old road occupancy must be released: '+phase);
 assert(game.state.vehicles.has(car.id),'recovery cannot delete the journey: '+phase);
 if(phase==='parking_in')assert(!home.parkingSlots.includes(car.citizenId),'arrival parking reservation must be cleared');
 if(phase==='departing'||phase==='parking_out')assert(!home.parkingSlots.includes(car.citizenId),'departure parking reservation must be cleared');
 phases.push(phase);
}
// DENSE DEPARTURE: all 30 cars leave the same lot, eventually merge, and reach the destination.
({home,office}=setup());
let residents=[];
for(let i=0;i<30;i++)residents.push(exitCar(home,office).c);
let peak=0;
for(let i=0;i<8500&&game.state.vehicles.size;i++){
 step(1);peak=Math.max(peak,[...game.state.vehicles.values()].filter(car=>car.phase==='parking_out').length);
 if(i%15===0){
  const moving=[...game.state.vehicles.values()].filter(car=>car.lotPath);
  for(let a=0;a<moving.length;a++)for(let b=0;b<a;b++)if(moving[a].lotBuilding===moving[b].lotBuilding)
   assert(!game.lotCarsOverlap(game.parkingPose(moving[a]),game.parkingPose(moving[b]),0),'lot collision during mass departure');
 }
}
assert.equal(game.state.vehicles.size,0,'30-way exit deadlock');
assert.equal(office.parked.size,30,'all departing cars must reach the office');
assert.equal(home.parked.size,0,'all cars must leave home');
assert(peak<=1,'only one car should actively merge from the same lot at a time');
console.log(JSON.stringify({passed:true,recoveryMinutes:60,recoveryPhases:phases,blockedRoadAllowsArcadeExit:true,denseDepartures:30,peakSimultaneousMerges:peak}));
