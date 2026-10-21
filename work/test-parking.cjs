const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');let game;
const noop=()=>{},element=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const context={document:{getElementById:get,querySelector:element,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8').replace('parkingFree,parkingSpace,','newCitizen,parkingFree,parkingSpace,'),context);
function step(n){for(let i=0;i<n;i++){game.state.time+=.04;game.advanceVehicles(.05,.04);}}
function build(key,x){const t=game.CATALOG[key];game.state.money=1e8;const y=148-t.plotHeight;const check=game.checkBuilding(key,x,y);assert(!check.error,JSON.stringify({key,x,y,check}));const b=game.buildBuilding(key,x,y,true);assert(b);return b;}
game.reset();const home=build('home_large',160),office=build('office_large',180);
assert.equal(game.lotSlots(home).length,30);assert.equal(game.lotSlots({key:'mall_large'}).length,245);
const targeted=['office_large','factory_medium','shop_medium','shop_large','restaurant_medium','mall_small','mall_large','park_medium','park_large','pub_large'];
for(const t of Object.values(game.CATALOG)){const oldColumns=t.parkingCapacity<=40?Math.ceil(t.parkingCapacity/2):Math.ceil(Math.sqrt(t.parkingCapacity*3.4));const oldWidth=Math.ceil(Math.max(t.size+1,oldColumns*.38+2));const oldDepth=Math.ceil(t.size+.3+Math.ceil(t.parkingCapacity/(2*oldColumns))*2.5+.35);if(targeted.includes(t.key)){assert(t.plotHeight<oldDepth,'compact depth for '+t.key);assert(t.plotWidth<=oldWidth,'compact width for '+t.key);assert(t.plotHeight*t.plotWidth<oldWidth*oldDepth,'compact footprint for '+t.key);}else{assert.equal(t.plotHeight,oldDepth,'unchanged depth for '+t.key);assert.equal(t.plotWidth,oldWidth,'unchanged width for '+t.key);}}



for(const t of Object.values(game.CATALOG))for(let rotation=0;rotation<4;rotation++){
 const b={key:t.key,x:20,y:20,rotation},bounds=game.buildingBounds(b),slots=game.lotSlots(b);assert.equal(slots.length,t.parkingCapacity);const poses=slots.map(s=>game.parkingSlotPose(b,s.index));for(const p of poses){assert(p.x>20&&p.x<20+bounds.w+.5);assert(p.y>20&&p.y<20+bounds.h+.5);}for(let i=0;i<poses.length;i++)for(let j=0;j<i;j++)assert(Math.hypot(poses[i].x-poses[j].x,poses[i].y-poses[j].y)>.37);
}
const bounds=game.buildingBounds(home);assert.equal(game.state.buildGrid[game.id(home.x+bounds.w-1,home.y+bounds.h-1)],home.id);assert(game.checkRoad([game.id(home.x+1,home.y+bounds.h-2)],'small').error);assert(game.checkBuilding('home_small',home.x+1,home.y+2).error);
const citizens=[];for(let i=0;i<10;i++){const c=game.newCitizen(home);citizens.push(c);assert(game.createTrip(c,'moveIn',null,home.id,game.id(155,150),null,null));}
assert.equal(game.parkingFree(home),20);assert.equal(home.parkingSlots.filter(x=>x!==null).length,0,'slots assigned only when entering');step(5000);
assert.equal(home.parked.size,10,'all ten cars park visibly');assert.equal(home.parkingSlots.filter(x=>x!==null).length,10);assert.equal(new Set(home.parkingSlots.filter(x=>x!==null)).size,10);assert.equal(game.state.vehicles.size,0);
const c=citizens[0];assert(game.createTrip(c,'work',home.id,office.id,null,null,null));const v=game.state.vehicles.get(c.vehicleId),start=v.path[0],d=game.dir(start,v.path[1]),lane=game.plannedLane(v,0),key=`${start}:${d}:${lane}`;game.state.occ.set(key,99999);
step(168);
assert.equal(v.phase,'parking_out','car should already be exiting despite a blocked street lane');
assert.equal(v.mergeCommitted,true);
assert.equal(v.occKey,null,'do not steal road occupancy from stopped cars');
assert.equal(game.state.occ.get(key),99999);
assert(home.parked.has(c.id));
const snapshot=game.snapshot();assert.equal(JSON.parse(snapshot).parkingVersion,5);
assert(game.loadGame(true,null,snapshot));
const restored=game.state.vehicles.get(v.id);assert.equal(restored.phase,'parking_out');assert(restored.lotPath);
assert.deepEqual(Array.from(game.state.buildings.get(home.id).parkingSlots),Array.from(home.parkingSlots));
const obsolete=JSON.parse(snapshot);obsolete.parkingVersion=4;assert.equal(game.loadGame(true,null,JSON.stringify(obsolete)),false);
const old=JSON.parse(snapshot);old.format=1;delete old.parkingVersion;assert.equal(game.loadGame(true,null,JSON.stringify(old)),false);
const c2=game.state.citizens.get(citizens[1].id);
assert(game.createTrip(c2,'work',home.id,office.id,null,null,null));
game.state.speed=1;step(6000);
assert.equal(game.state.buildings.get(office.id).parked.size,2,'both cars should reach work even when road lane was occupied');
assert.equal(game.state.buildings.get(home.id).parked.size,8);

const full=game.state.buildings.get(office.id);for(let i=0;i<game.CATALOG[full.key].parkingCapacity;i++)full.parked.add(9000+i);assert.equal(game.parkingFree(full),0);assert.equal(game.createTrip(citizens[2],'work',home.id,full.id,null,null,null),false);
console.log(JSON.stringify({passed:true,catalogTypes:24,rotations:4,homeSpaces:30,mallSpaces:245,coverage:['whole plot footprint','automatic slot allocation','10 real parked cars','blocked exit continues without stealing road occupancy','physical departure queue','road-to-lot continuity','capacity reservation','save moving cars','reject old compact cities']}));
