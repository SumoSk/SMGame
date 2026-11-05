const fs=require('node:fs'),assert=require('node:assert/strict');
const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',base+';return boot();')(require);
g.state.money=1e9;
const t=g.CATALOG.home_mahanakhon;
const home=g.buildBuilding('home_mahanakhon',160,148-t.plotHeight,true);
const office=g.buildBuilding('office_medium',195,148-g.CATALOG.office_medium.plotHeight,true);
assert(home&&office,'the home and office must be connected to actual roads');
assert.deepEqual([t.plotWidth,t.plotHeight],[8,6]);
assert.equal(home.access.filter(a=>a.entry).length,1);
assert.equal(home.access.filter(a=>a.exit).length,1);
const occupied=[...Array(64).keys()];
const departingSlots=[0,2,5,9,12,16,20,22,25,29,32,36,40,42,45,49,52,56,60,62];
const departSet=new Set(departingSlots),departures=[];
for(const i of occupied){
 const c=g.newCitizen(home);c.resident=true;c.location='home';c.locationId=home.id;c.state='อยู่บ้าน';
 home.residents.add(c.id);home.parked.add(c.id);home.parkingSlots[i]=c.id;
 if(departSet.has(i))departures.push(c);
}
const cars=[];
for(const c of departures){
 assert(g.createTrip(c,'work',home.id,office.id,null,null,null),'resident trip should start');
 cars.push(g.state.vehicles.get(c.vehicleId));
}
const incoming=[];
for(let i=0;i<8;i++){
 const c=g.newCitizen(home);incoming.push(c);
 assert(g.createTrip(c,'moveIn',null,home.id,g.id(155,150),null,null),'resident should have an incoming trip');
}
let out=0,arrived=0,maxCrossing=0,seen={front:false,rear:false};
for(let tick=0;tick<14000;tick++){
 g.state.time+=.04;g.advanceVehicles(.05,.04);
 const active=cars.filter(v=>v.grandCrossing?.granted&&!v.grandCrossing.cleared);
 maxCrossing=Math.max(maxCrossing,active.length);
 if(active[0])seen[active[0].grandCrossing.approach]=true;
 out=Math.max(out,departures.filter(c=>!home.parked.has(c.id)).length);
 arrived=Math.max(arrived,incoming.filter(c=>home.parked.has(c.id)).length);
 if(out===departures.length&&arrived===incoming.length)break;
}
const pending=departures.filter(c=>home.parked.has(c.id)).map(c=>{
 const v=g.state.vehicles.get(c.vehicleId);
 return {id:c.id,phase:v?.phase,slot:home.parkingSlots.indexOf(c.id),reason:v?.stopReason,lotDistance:v?.lotDistance,signal:v?.grandCrossing};
});
const incomingPending=incoming.filter(c=>!home.parked.has(c.id)).map(c=>{
 const v=g.state.vehicles.get(c.vehicleId);
 return {id:c.id,phase:v?.phase,reason:v?.stopReason,lotDistance:v?.lotDistance};
});
console.log(JSON.stringify({out,arrived,maxCrossing,seen,pending:pending.slice(0,10),incomingPending:incomingPending.slice(0,5)}));
assert(maxCrossing<=1,'only one car may hold the parking T-junction');
assert.equal(out,departures.length,'all cars must drive OUT through center-front gate');
assert.equal(arrived,incoming.length,'inbound cars must park while others leave');
assert(cars.every(v=>(v.respawns||0)===0),'no teleport/recovery');
assert(seen.front&&seen.rear,'both parking aisles must receive exit priority');
