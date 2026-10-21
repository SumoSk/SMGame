const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{};
const element=()=>({textContent:'',innerHTML:'',value:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const storage={},context={document:{getElementById:get,querySelector:element,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:key=>storage[key]??null,setItem:(key,value)=>storage[key]=value},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
const types=['office_large','factory_medium','shop_medium','shop_large','restaurant_medium','mall_small','mall_large','park_medium','park_large','pub_large'];
let plots=0,stalls=0;
for(const t of Object.values(game.CATALOG))for(let rotation=0;rotation<4;rotation++){
 const b={key:t.key,x:70,y:70,rotation},bounds=game.buildingBounds(b),slots=game.lotSlots(b);
 assert.equal(slots.length,t.parkingCapacity);
 const poses=slots.map(slot=>game.parkingSlotPose(b,slot.index));
 for(const p of poses){
  assert(p.x>70&&p.x<70+bounds.w+.5&&p.y>70&&p.y<70+bounds.h+.5,'vehicle out of building footprint');
  assert(Number.isFinite(p.angle),'invalid car angle');
 }
 for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++)assert(!game.lotCarsOverlap(poses[i],poses[j],0),'parked cars overlap: '+t.key);
 plots++;stalls+=slots.length;
}
for(const key of types){
 const t=game.CATALOG[key],b={key,x:90,y:90,rotation:0,parkingSlots:Array(t.parkingCapacity).fill(null)};
 const chosen=new Set(),banks=new Set();
 for(let cid=1;cid<=Math.min(32,t.parkingCapacity);cid++){
  const index=game.parkingSpace(b,cid,true);
  assert(!chosen.has(index),'allocated occupied parking bay '+key);
  chosen.add(index);banks.add(Math.floor(index/(t.parkingColumns*2)));
 }
 assert(banks.size>=Math.min(t.parkingRows,3),'allocation must distribute over banks: '+key);
}
const points=[{x:0,y:0},{x:2,y:0},{x:2,y:2}],heading=distance=>{
 const p=game.parkingPose({lotPath:points,lotDistance:distance});
 return Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle));
};
for(const distance of [1.94,1.98,2.02,2.06])assert(Number.isFinite(heading(distance)));
assert(heading(1.98)>0&&heading(1.98)<Math.PI/2,'parking corner must turn continuously');
assert(heading(2.02)>heading(1.98),'parking curve must have smooth orientation');
assert(heading(1.98)-heading(1.94)<.5&&heading(2.06)-heading(2.02)<.5,'corner heading jump');
// Simulate a vehicle stuck in its exit lane for over the long recovery grace period.
game.reset();game.state.money=1e8;
const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
const office=game.buildBuilding('office_large',180,148-game.CATALOG.office_large.plotHeight,true);
assert(home&&office);
const citizen=game.newCitizen(home);home.parked.add(citizen.id);
assert(game.createTrip(citizen,'work',home.id,office.id,null,null,null));
const car=game.state.vehicles.get(citizen.vehicleId),index=game.parkingSpace(home,citizen.id,true);
car.lotBuilding=home.id;
car.lotPath=[game.parkingSlotPose(home,index),game.lotPoint(home,.45,game.CATALOG.home_large.plotHeight-.4)];
car.lotDistance=.2;car.phase='departing';car.lastMovedAt=0;game.state.time=250;
game.advanceVehicles(.05,.04);
assert.equal(car.phase,'gate_waiting','vehicle should retry from the gate only after a long blocked interval');
assert.equal(car.respawns,1);
assert.equal(car.lotPath,null);
assert.equal(car.fromId,null);
assert(!home.parked.has(citizen.id),'old building must release the departing resident car');
assert(!home.parkingSlots.includes(citizen.id),'old parking bay must be released after recovery');
assert(game.state.vehicles.has(car.id),'recovery must not delete the journey');
console.log(JSON.stringify({passed:true,plotRotations:plots,parkedPoseChecks:stalls,distributedParkingTypes:types.length,coverage:['all parking footprints and parked-body overlaps','balanced parking banks','rounded parking steering','long-wait recovery preserves trip and frees old bay']}));
