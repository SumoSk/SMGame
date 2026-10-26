const fs=require('node:fs'),assert=require('node:assert/strict');
const harness=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',harness+';return boot();')(require);
g.state.money=1e9;
const t=g.CATALOG.home_grand;
const home=g.buildBuilding('home_grand',160,148-t.plotHeight,true);
const office=g.buildBuilding('office_large',197,148-g.CATALOG.office_large.plotHeight,true);
assert(home&&office);
const exiting=[];
for(let i=0;i<40;i++){
 const c=g.newCitizen(home);c.resident=true;c.location='home';c.locationId=home.id;c.state='อยู่บ้าน';
 home.residents.add(c.id);home.parked.add(c.id);home.parkingSlots[i]=c.id;
 if(i%2===0)exiting.push(c);
}
const departureVehicles=[];
for(const c of exiting){
 assert(g.createTrip(c,'work',home.id,office.id,null,null,null));
 departureVehicles.push(g.state.vehicles.get(c.vehicleId));
}
const incoming=[];
for(let i=0;i<8;i++){
 const c=g.newCitizen(home);incoming.push(c);
 assert(g.createTrip(c,'moveIn',null,home.id,g.id(155,150),null,null),'new resident should have a route into occupied grand home');
}
let overlap=0,maxWait=0,green={front:0,rear:0},out=0,arrived=0;
for(let step=0;step<12000;step++){
 g.state.time+=.04;g.advanceVehicles(.05,.04);
 const held=departureVehicles.filter(v=>v.grandCrossing?.granted&&!v.grandCrossing.cleared);
 overlap=Math.max(overlap,held.length);
 if(held[0])green[held[0].grandCrossing.approach]++;
 const nOut=exiting.filter(c=>!home.parked.has(c.id)).length;
 const nArrived=incoming.filter(c=>home.parked.has(c.id)).length;
 out=Math.max(out,nOut);arrived=Math.max(arrived,nArrived);
 if(out===20&&arrived===8)break;
}
const dead=departureVehicles.filter(v=>home.parked.has(v.citizenId))
 .map(v=>({id:v.id,phase:v.phase,reason:v.stopReason,slot:home.parkingSlots.indexOf(v.citizenId),
  lotDistance:v.lotDistance,grandCrossing:v.grandCrossing,respawns:v.respawns}));
const absent=incoming.filter(c=>!home.parked.has(c.id)).map(c=>({id:c.id,vehicle:g.state.vehicles.get(c.vehicleId)?.phase,reason:g.state.vehicles.get(c.vehicleId)?.stopReason}));
console.log(JSON.stringify({out,arrived,green,overlap,dead:dead.slice(0,7),absent:absent.slice(0,7)}));
assert.equal(overlap,1,'no overlapping greens at crossing');
assert.equal(out,20,'all cars must EXIT under simultaneous 40 parked + incoming traffic');
assert.equal(arrived,8,'arrivals must PARK while cars are departing');
assert(departureVehicles.every(v=>(v.respawns||0)===0),'no respawn as deadlock workaround');
