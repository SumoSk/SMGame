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
// ROAD MERGE: a busy road lane must not be reserved by cars still waiting in their lot.
let {home,office}=setup();
let {c,v}=exitCar(home,office),from=v.path[0],next=v.path[1],lane=game.plannedLane(v,0),
    key=from+':'+game.dir(from,next)+':'+lane;
game.state.occ.set(key,87654321);
step(600);
assert.equal(v.phase,'parking_out','car should queue at the actual road merge');
assert.equal(v.mergeCommitted,false,'blocked merge must not commit');
assert.equal(v.occKey,null,'blocked car must not occupy street cells');
assert.equal(game.state.occ.get(key),87654321,'existing street occupancy must remain unchanged');
assert(home.parked.has(c.id),'blocked departure must still be physically parked');
const holdDistance=v.lotDistance;
step(200);
assert.equal(v.lotDistance,holdDistance,'car must stop at merge line instead of sliding onto the road');
assert.equal(v.respawns||0,0,'do not recover a car before sixty game minutes have elapsed');
game.state.occ.delete(key);
step(2500);
assert(office.parked.has(c.id),'car must merge when road opens and complete its trip');
assert(!home.parked.has(c.id),'departure frees its original parking bay');
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
console.log(JSON.stringify({passed:true,recoveryMinutes:60,recoveryPhases:phases,blockedRoadKeepsCarInside:true,denseDepartures:30,peakSimultaneousMerges:peak}));
