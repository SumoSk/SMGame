const fs=require('node:fs');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
new Function('require',fixture+`
// A stranded car retries without any road edit, retaining its exact pose.
let v=install(Array.from({length:16},(_,k)=>[140+k,100]),'large');v.pos=3;v.progress=.4;v.toGate=v.path.at(-1);game.strandVehicle(v,'ทดสอบไม่มีเส้นทาง');const held=game.vehiclePosition(v);game.advanceVehicles(.01,.02);assert.equal(v.phase,'driving');const restored=game.vehiclePosition(v);assert(Math.hypot(held.x-restored.x,held.y-restored.y)<1e-8);assert(Math.abs(delta(angle(held),angle(restored)))<1e-6);for(let k=0;k<4000&&game.state.vehicles.size;k++){game.state.time+=.032;game.advanceVehicles(.016,.032);}assert.equal(game.state.vehicles.size,0);
// Recovery partway through a curve keeps the position and steering tangent.
for(const sign of [-1,1])for(let rotation=0;rotation<4;rotation++){const car=install(turnPath(sign,rotation),'large');car.pos=7;car.progress=.4;car.toGate=car.path.at(-1);game.strandVehicle(car,'ทดสอบโค้ง');const p=game.vehiclePosition(car);assert(game.recoverVehicle(car,true));const q=game.vehiclePosition(car);assert(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);assert(Math.abs(delta(angle(p),angle(q)))<1e-5,'recovery preserves curve heading');}
// No legal path: retries are throttled, no reversing and no silent teleport.
v=install(Array.from({length:10},(_,k)=>[140+k,100]),'large');v.pos=4;v.progress=.3;v.toGate=v.path[0];v.noUTurnPolicy=1;game.strandVehicle(v,'ไม่มีทางวน');game.advanceVehicles(.01,.02);assert.equal(v.phase,'stuck');const nextRetry=v.nextRouteRetry,stopped=game.vehiclePosition(v);for(let k=0;k<20;k++)game.advanceVehicles(.01,.02);assert.equal(v.nextRouteRetry,nextRetry);assert.deepEqual(game.vehiclePosition(v),stopped);game.state.time=nextRetry+.1;game.advanceVehicles(.01,.02);assert(v.nextRouteRetry>nextRetry);assert.equal(v.phase,'stuck');
// Towing releases occupancy, every junction pass and downstream lease.
const follower={...v,id:901,noUTurnPolicy:1,path:[...v.path],pathSet:new Set(v.path),pos:2,progress:0,phase:'driving',heldPose:null,motionStartPose:null,speed:0,wait:0,turnLanes:{},junctionPasses:[]};follower.toGate=follower.path.at(-1);game.state.vehicles.set(follower.id,follower);follower.occKey=follower.path[2]+':0:'+game.plannedLane(follower,2);game.state.occ.set(follower.occKey,follower.id);v.junctionPasses=[{node:v.path[4],pos:4}];game.state.reservations.set('junction:'+v.path[4],{id:v.id,passes:[{id:v.id,pos:4,until:game.state.time+30},{id:999,pos:4,until:game.state.time+30}]});game.state.reservations.set('lease:test',{id:v.id,until:game.state.time+30});game.openCityReport();assert(get('dialogContent').innerHTML.includes('bugTow0'));get('bugTow0').onclick();assert(!game.state.vehicles.has(v.id));assert(![...game.state.occ.values()].includes(v.id));assert(![...game.state.reservations.values()].some(r=>r.passes?r.passes.some(p=>p.id===v.id):r.id===v.id));assert.equal(game.state.reservations.get('junction:'+v.path[4]).passes[0].id,999);assert(!game.towVehicle(v.id),'idempotent repeated tow');const start=game.motionDistance(follower);for(let k=0;k<80;k++)game.advanceVehicles(.016,.032);assert(game.motionDistance(follower)>start,'following car can use the cleared lane');
// A route removed while queued never admits the vehicle onto the street.
v=install(Array.from({length:12},(_,k)=>[140+k,100]),'large');const path=[...v.path];game.state.vehicles.clear();game.state.occ.clear();game.state.nextId=100;
function building(id,key,node,prev,next){return{id,key,x:140,y:98,access:[{node,prev:[prev],next:[next]}],queue:[],residents:new Set(),workers:new Set(),visitors:new Set(),parked:new Set(),reservedService:0,reservedResidents:0,arrivals:0};}
const home=building(1,'home_small',path[0],path[1],path[1]),shop=building(2,'shop_small',path.at(-1),path.at(-2),path.at(-2)),nearShop=building(3,'shop_small',path[2],path[1],path[3]);game.state.buildings.set(1,home);game.state.buildings.set(2,shop);game.state.buildings.set(3,nearShop);
function citizen(id){const c={id,resident:true,homeId:1,locationId:1,location:'home',vehicleId:null,state:'อยู่บ้าน',happy:80,workId:null,profile:{trait:0,leave:400,end:1000,leisure:null},pain:0,history:[],scheduled:new Set(),failKinds:new Set(),pending:null,queued:null};game.state.citizens.set(id,c);home.residents.add(id);home.parked.add(id);return c;}
const c=citizen(10),other=citizen(11);assert(game.createTrip(c,'leisure',1,2,null,null,null));const waiting=game.state.vehicles.get(c.vehicleId);assert(home.parked.has(c.id));assert(game.createTrip(other,'leisure',1,3,null,null,null));const valid=game.state.vehicles.get(other.vehicleId);game.state.roads.get(path[6]).links.delete(path[7]);game.state.roads.get(path[7]).links.delete(path[6]);game.state.version++;game.state.routeCache.clear();game.advanceVehicles(.01,.02);assert(waiting.departureNoRoute);assert.equal(waiting.phase,'departing');assert(!waiting.occKey);assert(home.parked.has(c.id));assert.equal(valid.phase,'driving','unreachable departure must not block another valid trip from the building');assert(!home.parked.has(other.id));
// Cancel a resident trip without counting an arrival/reward or leaving reservations.
const happiness=c.happy,arrivals=shop.arrivals;assert.equal(shop.reservedService,1);assert(game.towVehicle(waiting.id));assert.equal(c.vehicleId,null);assert.equal(c.locationId,home.id);assert(home.parked.has(c.id));assert.equal(shop.reservedService,0);assert.equal(shop.arrivals,arrivals);assert.equal(c.happy,happiness);assert(!shop.parked.has(c.id));assert(!home.queue.includes(waiting.id));assert(c.history.at(-1).includes('ยกเลิก'));
// A parked car whose route disappears gets a red marker and is auto-cancelled with reservation cleanup.
game.state.roads.get(path[6]).links.add(path[7]);game.state.roads.get(path[7]).links.add(path[6]);game.state.version++;game.state.routeCache.clear();
assert(game.createTrip(c,'leisure',1,2,null,null,null));const timedOut=game.state.vehicles.get(c.vehicleId);
game.state.roads.get(path[6]).links.delete(path[7]);game.state.roads.get(path[7]).links.delete(path[6]);game.state.version++;game.state.routeCache.clear();
game.advanceVehicles(.01,.02);assert(timedOut.departureNoRoute&&game.missingRoute(timedOut));assert(game.routeWarningPosition(timedOut),'parked car has a visible warning position');
timedOut.routeMissingSince=game.state.time-121;game.advanceVehicles(.01,.02);
assert(!game.state.vehicles.has(timedOut.id));assert.equal(c.vehicleId,null);assert(home.parked.has(c.id));assert.equal(shop.reservedService,0);assert(!home.queue.includes(timedOut.id));
// Waiting status and retry timestamps survive a named browser save/load.
valid.phase='stuck';valid.stopReason='ไม่มีทาง';valid.nextRouteRetry=game.state.time+9;valid.heldPose=game.vehiclePosition(valid);valid.routeMissing=true;valid.routeMissingSince=game.state.time-17;game.saveGame(true,'recovery','recovery');assert(game.loadGame(true,'recovery'));assert.equal(game.state.vehicles.get(valid.id).nextRouteRetry,valid.nextRouteRetry);assert.equal(game.state.vehicles.get(valid.id).routeMissingSince,valid.routeMissingSince,'save/load preserves the original timeout start');assert(game.canTowVehicle(game.state.vehicles.get(valid.id)));
// A cancelled incoming resident never becomes population or consumes a home slot.
v=install(Array.from({length:12},(_,k)=>[140+k,100]),'large');const incomingPath=[...v.path];game.state.vehicles.clear();game.state.occ.clear();const incomingHome=building(5,'home_small',incomingPath.at(-1),incomingPath.at(-2),incomingPath.at(-2));game.state.buildings.set(5,incomingHome);const newcomer={id:42,resident:false,homeId:5,vehicleId:null,history:[],scheduled:new Set(),failKinds:new Set()};game.state.citizens.set(42,newcomer);assert(game.createTrip(newcomer,'moveIn',null,5,incomingPath[0],null,null));const incomingCar=game.state.vehicles.get(newcomer.vehicleId);incomingCar.wait=48;assert.equal(incomingHome.reservedResidents,1);assert(game.towVehicle(incomingCar.id));assert.equal(incomingHome.reservedResidents,0);assert.equal(incomingHome.arrivals,0);assert.equal(incomingHome.residents.size,0);assert(!game.state.citizens.has(42));
// A large blocked fleet cannot run all route searches in the same frame.
v=install(Array.from({length:10},(_,k)=>[140+k,100]),'large');const fleetBase={...v,pos:4,progress:.3,toGate:v.path[0],noUTurnPolicy:1};game.state.vehicles.clear();game.state.occ.clear();for(let i=0;i<6;i++){const car={...fleetBase,id:1000+i,junctionPasses:[],junctionQueueSince:{}};game.state.vehicles.set(car.id,car);game.strandVehicle(car,'ไม่มีทางวน');}game.advanceVehicles(.01,.02);assert.equal([...game.state.vehicles.values()].filter(c=>c.recoveryVersion===game.state.version).length,2);game.state.time+=20;game.advanceVehicles(.01,.02);game.state.time+=20;game.advanceVehicles(.01,.02);assert.equal([...game.state.vehicles.values()].filter(c=>c.recoveryVersion===game.state.version).length,6);
// Missing-route markers persist only for truly route-less cars; removal is strictly after 120 game minutes.
{
 const car=install(Array.from({length:10},(_,k)=>[140+k,100]),'large');car.pos=4;car.progress=.3;car.toGate=car.path[0];car.noUTurnPolicy=1;
 game.strandVehicle(car,'ไม่มีทางวน');const started=game.state.time,indicator=game.routeWarningPosition(car);
 assert(game.missingRoute(car));assert(indicator&&indicator.every(Number.isFinite),'red marker can be placed over stranded vehicle');
 game.state.time=started+120;game.advanceVehicles(.01,.02);assert(game.state.vehicles.has(car.id),'a car at exactly 120 minutes is not yet overdue');
 game.state.time=started+120.01;game.advanceVehicles(.01,.02);assert(!game.state.vehicles.has(car.id),'overdue route-less car removed automatically');
 assert(![...game.state.occ.values()].includes(car.id),'automatic removal clears road occupancy');
 const recovered=install(Array.from({length:12},(_,k)=>[140+k,100]),'large');recovered.pos=3;recovered.toGate=recovered.path.at(-1);
 game.strandVehicle(recovered,'เส้นทางเดิมขาด');assert(game.recoverVehicle(recovered,true));assert(!game.missingRoute(recovered));assert.equal(recovered.routeMissingSince,null);
 game.state.time+=121;game.advanceVehicles(.01,.02);assert(game.state.vehicles.has(recovered.id),'recovered car is not removed by its old timer');
 const queued=install(turnPath(-1),'large',true);queued.wait=180;queued.stopReason='ไฟแดง';game.state.time+=121;game.advanceVehicles(.01,.02);
 assert(game.state.vehicles.has(queued.id)&&!game.missingRoute(queued),'ordinary traffic-light wait never starts the route timeout');
 // Actual overlay: the visible red exclamation follows the car and disappears when its route recovers.
 const tagged=install(Array.from({length:12},(_,k)=>[140+k,150]),'large');tagged.pos=4;tagged.toGate=tagged.path.at(-1);
 const node=()=>({style:{},children:[],append(...els){this.children.push(...els);},replaceChildren(){this.children=[];},setAttribute(){},remove(){this.removed=true;}});
 let overlay;context.document.createElement=node;get('world').insertAdjacentElement=(_where,el)=>{overlay=el;};
 game.strandVehicle(tagged,'เส้นทางเดิมขาด');game.updatePlaceLabels();game.updateRouteWarnings();
 const warning=overlay.children.find(el=>el.textContent==='!');assert(warning&&warning.style.background==='#df3543'&&warning.style.left&&warning.style.top,'visible route-less car gets a red exclamation above it');
 assert(game.recoverVehicle(tagged,true));game.updateRouteWarnings();assert(warning.removed,'warning vanishes immediately when a route returns');
}
// Exactly 200 game minutes must not move a car; the next instant sends that
// very same car back to a connected city gate, preserving its trip and seats.
{
 const car=install(Array.from({length:20},(_,i)=>[280+i,150]),'large');
 const entry=game.state.gates[1],destination=building(700,'shop_small',car.path[5],car.path[6],car.path[6]);
 const origin=building(701,'home_small',car.path[0],car.path[1],car.path[1]);
 game.state.buildings.set(destination.id,destination);game.state.buildings.set(origin.id,origin);
 const passenger={id:702,resident:true,homeId:origin.id,locationId:origin.id,workId:null,profile:{trait:0,end:1050},happy:80,pain:0,vehicleId:car.id,location:'travel',state:'กำลังเดินทาง',history:[],scheduled:new Set(),failKinds:new Set()};
 game.state.citizens.set(passenger.id,passenger);
 car.citizenId=passenger.id;car.kind='leisure';car.fromId=origin.id;car.toId=destination.id;
 car.serviceReservation=true;destination.reservedService=1;origin.queue.push(car.id);origin.parked.add(passenger.id);
 game.release(car);car.pos=4;car.progress=.2;car.occKey=car.path[car.pos]+':'+game.dir(car.path[car.pos],car.path[car.pos+1])+':'+game.plannedLane(car,car.pos);
 game.state.occ.set(car.occKey,car.id);game.state.reservations.set('test-lease',{id:car.id,until:999999});
 car.lastMovedAt=game.state.time-200;car.wait=200;
 game.advanceVehicles(0,0);assert.equal(car.phase,'driving','exactly 200 minutes cannot respawn');
 game.state.time+=.01;game.advanceVehicles(0,0);
 assert.equal(car.phase,'gate_waiting');assert.equal(car.path[0],entry,'respawn at real road-connected city gate');
 assert(car.path.length>1&&!car.departureNoRoute,'new trip can still reach the original destination');
 assert.equal(car.id,passenger.vehicleId,'citizen keeps the same car');assert.equal(game.state.vehicles.size,1,'no duplicate cars');
 assert.equal(car.toId,destination.id);assert.equal(destination.reservedService,1,'destination booking retained');
 assert(!origin.queue.includes(car.id)&&!origin.parked.has(passenger.id),'abandoned origin no longer blocked');
 assert(![...game.state.occ.values()].includes(car.id),'old road occupancy removed');
 assert(![...game.state.reservations.values()].some(r=>r.id===car.id),'old junction leases removed');
 assert.equal(car.wait,0);assert.equal(car.lastMovedAt,game.state.time);assert.equal(car.respawns,1);
 assert(game.saveGame(true,'respawn','respawn'));assert(game.loadGame(true,'respawn'));
 const loaded=game.state.vehicles.get(car.id);assert.equal(loaded.lastMovedAt,car.lastMovedAt);assert.equal(loaded.respawns,1);
 assert.equal(game.state.buildings.get(destination.id).reservedService,1,'saving/loading keeps booking');
}
// A car that moves before the threshold starts a fresh inactivity timer.
{
 const moving=install(Array.from({length:25},(_,i)=>[100+i,130]),'small');
 moving.lastMovedAt=game.state.time-199;game.state.speed=1;
 const before=game.motionDistance(moving);game.advanceVehicles(1,2);
 assert(game.motionDistance(moving)>before,'moving car advances');
 assert.equal(moving.lastMovedAt,game.state.time,'movement resets inactivity');
 game.state.time+=3;game.advanceVehicles(0,0);assert.equal(moving.phase,'driving','moving car is not respawned');
}
console.log(JSON.stringify({passed:true,coverage:['automatic periodic retry','same pose and heading','no U-turn or teleport','bounded retry interval','red marker on missing route','automatic removal strictly after 120 game minutes','traffic-light waits never auto-removed','recovery resets timeout','parked route-less vehicles auto-cancel cleanly','tow releases all leases','other junction users preserved','following traffic moves','queued route validation','unreachable queue head bypass','cancel without arrival or reward','save/load recovery state','respawn only after 200 game minutes','same car and destination booking','old occupancy and reservations removed','respawn persisted in saves','movement resets inactivity timer']}));
`)(require);
