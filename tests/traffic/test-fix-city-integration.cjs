'use strict';
const assert=require('node:assert/strict'),path=require('node:path');process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs'),{game:g}=boot('startLondonShowcase');
const began=performance.now();g.startLondonShowcase();g.state.speed=5;let checks=0,peakCars=0;
function invariants(){
 const citizenVehicles=new Map();for(const v of g.state.vehicles.values()){
  if(v.citizenId!=null){const c=g.state.citizens.get(v.citizenId);assert(c,'vehicle owner must exist');assert.equal(c.vehicleId,v.id);citizenVehicles.set(c.id,(citizenVehicles.get(c.id)||0)+1);}
  if(v.occKey!=null)assert.equal(g.state.occ.get(v.occKey),v.id,'held occupancy must belong to the vehicle');
  if(v.phase!=='gate_waiting'){const p=g.vehiclePosition(v);if(p)assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle));}
 }
 for(const count of citizenVehicles.values())assert.equal(count,1);for(const c of g.state.citizens.values())if(c.vehicleId!=null)assert.equal(g.state.vehicles.get(c.vehicleId)?.citizenId,c.id);
 for(const [key,id]of g.state.occ)assert(g.state.vehicles.has(id),'occupancy owner must still exist '+key);
 for(const b of g.state.buildings.values()){const arrivals=[...g.state.vehicles.values()].filter(v=>v.toId===b.id);assert.equal(b.reservedResidents,arrivals.filter(v=>v.residentReservation).length);assert.equal(b.reservedService,arrivals.filter(v=>v.serviceReservation).length);}
 checks++;peakCars=Math.max(peakCars,g.state.vehicles.size);
}
const initial=g.computeStats();assert.equal(initial.pop,1000);invariants();const end=g.state.time+240;
while(g.state.time<end){g.tick(.05);if(Math.floor(g.state.time*10)%100<4)invariants();}
const livePoses=new Map([...g.state.vehicles.values()].filter(v=>v.phase==='driving').map(v=>[v.id,g.vehiclePosition(v)]));g.roadChanged([]);
for(const [id,p]of livePoses){const v=g.state.vehicles.get(id);if(v?.phase==='driving'){const q=g.vehiclePosition(v);assert(Math.hypot(p.x-q.x,p.y-q.y)<1e-7,'rebuild must preserve every live world pose');}}
for(let i=0;i<40;i++)g.tick(.05);invariants();const preLoad={time:g.state.time,population:g.computeStats().pop,vehicles:g.state.vehicles.size,money:g.state.money};assert(g.loadGame(true,null,g.snapshot()));invariants();assert.equal(g.state.money,preLoad.money);assert.equal(g.computeStats().pop,preLoad.population);
console.log(JSON.stringify({passed:true,scenario:'1000-resident London showcase over 4 game hours, road rebuild, and save/load',checks,peakCars,preLoad,postLoad:{time:g.state.time,population:g.computeStats().pop,vehicles:g.state.vehicles.size},elapsedMs:Math.round(performance.now()-began)},null,2));
