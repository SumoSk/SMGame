const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',fixture+'return boot();')(require);
g.state.money=1e7;g.state.time=720;g.state.speed=1;
const type=g.CATALOG.home_starter;
assert.equal(type.plotWidth*type.plotHeight,20);
assert.equal(type.residents,6);
assert.equal(new Set(g.lotSlots({key:type.key}).map(s=>s.v)).size,1);
const home=g.buildBuilding(type.key,160,148-type.plotHeight,true);
assert(home);
function waitForSix(destination){
 for(let n=0;n<3000;n++){
  g.state.time+=.04;g.advanceVehicles(.05,.04);
  for(const v of g.state.vehicles.values())assert(!(v.respawns>0),'parking must finish without timeout recovery');
  if(destination.parked.size===6)return;
 }
 assert.fail('Only '+destination.parked.size+' of six cars parked: '+JSON.stringify([...g.state.vehicles.values()].map(v=>({phase:v.phase,reason:v.stopReason}))));
}
const residents=[];
for(let n=0;n<6;n++){
 const c=g.newCitizen(home);residents.push(c);
 assert(g.createTrip(c,'moveIn',null,home.id,g.id(155,150),null,null));
}
waitForSix(home);
assert.equal(new Set(home.parkingSlots).size,6,'all six distinct bays must be usable');
// Supply a real road loop so return journeys do not require a prohibited U-turn.
for(const [a,b] of [[[150,150],[150,180]],[[150,180],[210,180]],[[210,180],[210,150]]])
 assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'small',true));
const office=g.buildBuilding('office_small',180,148-g.CATALOG.office_small.plotHeight,true);
assert(office);
for(const c of residents)assert(g.createTrip(c,'work',home.id,office.id,null,null,null));
waitForSix(office);
for(const c of residents)assert(g.createTrip(c,'home',office.id,home.id,null,null,null));
waitForSix(home);
assert.equal(new Set(home.parkingSlots).size,6);
assert(g.parkingVisuals(home).some(r=>r.color==='#515f62'),'match existing asphalt');
console.log('Starter cottage: 4x5 plot, six single-row bays, six arrivals/departures/returns without recovery.');
