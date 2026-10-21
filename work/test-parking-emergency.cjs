const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elem=()=>({textContent:'',innerHTML:'',value:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true},close(){this.open=false},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)},storage={};
const context={document:{getElementById:get,querySelector:elem,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:v=>game=v},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
const step=n=>{for(let i=0;i<n;i++){game.state.time+=.04;game.advanceVehicles(.05,.04);}};
function setup(){
 game.reset();game.state.money=1e8;
 const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
 const office=game.buildBuilding('office_large',180,148-game.CATALOG.office_large.plotHeight,true);
 assert(home&&office);return {home,office};
}
function parkedCar(home,office){
 const c=game.newCitizen(home);
 home.parked.add(c.id);game.parkingSpace(home,c.id,true);
 assert(game.createTrip(c,'work',home.id,office.id,null,null,null));
 return game.state.vehicles.get(c.vehicleId);
}
function roadDriver(seed=3){
 assert(game.createTrip(null,'pass',null,null,game.id(166,150),game.id(194,150),null));
 const v=[...game.state.vehicles.values()].at(-1);
 v.laneSeed=seed;v.motionSeedLane=seed;
 return v;
}
function activeExit(home,office){
 const car=parkedCar(home,office);
 const t=game.CATALOG[home.key],p=game.lotPoint(home,t.plotWidth-.45,t.plotHeight-.4);
 car.phase='parking_out';car.lotBuilding=home.id;car.lotPath=[p,{x:p.x+.35,y:p.y+.7}];car.lotDistance=0;car.mergeCommitted=false;
 return car;
}
// The car must not wait half-turned on the street while the merge is occupied.
let {home,office}=setup(),car=parkedCar(home,office);
const first=car.path[0],next=car.path[1],d=game.dir(first,next),lane=game.plannedLane(car,0),roadKey=first+':'+d+':'+lane;
game.state.occ.set(roadKey,987654);
step(220);
assert.equal(car.phase,'parking_out');
assert.equal(car.mergeCommitted,false);
assert.equal(car.occKey,null);
assert.equal(car.lotDistance,0,'vehicle must wait before turning');
const p=game.vehiclePosition(car),end=car.lotPath[0];
assert(Math.hypot(p.x-end.x,p.y-end.y)<.00001,'vehicle must be inside lot, not partially across the street');
assert(p.y<home.y+game.CATALOG[home.key].plotHeight+.5-.28,'entire car length must remain in lot');
// Emergency right shift WITH a new route from the shifted location.
({home,office}=setup());activeExit(home,office);
let driver=roadDriver(3);
const oldPath=Array.from(driver.path);
step(3);
assert.equal(driver.phase,'driving');
assert.equal(driver.emergencyInitialLane,2,'must move one lane to the right');
assert.equal(driver.lane,2);
assert.equal(driver.occKey,driver.path[0]+':0:2','occupancy must change with the actual lane');
assert(driver.emergencyRightUntil>game.state.time-1);
assert.equal(driver.path[0],oldPath[0],'reroute must preserve the current road');
assert.equal(driver.path[1],oldPath[1],'reroute must not drive backwards');
assert(game.vehiclePosition(driver).y>149.1,'physical car position must move right with its lane');
// Full lane: don't teleport into a reserved or occupied right lane.
({home,office}=setup());activeExit(home,office);
const occupied=game.id(166,150)+':0:2';
game.state.occ.set(occupied,876543);
driver=roadDriver(3);step(3);
assert.notEqual(driver.emergencyInitialLane,2,'occupied right lane must not be used');
assert.equal(game.state.occ.get(occupied),876543,'never steal the right lane occupancy');
// If the vehicle is already on the farthest right lane, don't jump into oncoming traffic.
({home,office}=setup());activeExit(home,office);
driver=roadDriver(0);step(3);
assert(!Number.isFinite(driver.emergencyInitialLane),'rightmost lane cannot shift right again');
// When traffic resumes, preserve the normal parking trip.
({home,office}=setup());parkedCar(home,office);
step(2400);
assert.equal(office.parked.size,1,'parking departure should still complete');
assert.equal(game.state.vehicles.size,0);
console.log(JSON.stringify({passed:true,deepHold:true,rightShiftAndReroute:true,occupancyUpdated:true,occupiedRightLaneRejected:true,noOncomingLane:false===false,normalParkingTrip:true}));
