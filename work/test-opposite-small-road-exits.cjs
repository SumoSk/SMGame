const assert=require('node:assert/strict'),fs=require('node:fs');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot}=new Function('require',fixture+'return {boot};')(require);
const {game:g,get}=boot();
g.state.money=1e9;g.state.roads.clear();g.state.buildings.clear();
g.state.citizens.clear();g.state.vehicles.clear();g.state.buildGrid.fill(-1);
g.state.gates=[];g.roadChanged([]);
const road=g.lineCells(g.id(60,100),g.id(150,100));
assert.equal(g.buildRoad(road,'small',true),true);
const a=g.buildBuilding('home_starter',90,96,true,0);
const b=g.buildBuilding('home_starter',90,101,true,2);
assert(a&&b,'opposing frontages must build on one small road');
function car(building,fromY,toY,index){
 const citizen=g.newCitizen(building);
 citizen.resident=true;citizen.locationId=building.id;citizen.location='home';
 building.parked.add(citizen.id);
 assert(g.parkingSpace(building,citizen.id,true)>=0);
 const v={id:g.state.nextId++,citizenId:citizen.id,fromId:building.id,toId:building.id,
  kind:'home',path:[g.id(91,100),g.id(92,100)],pathSet:new Set([g.id(91,100),g.id(92,100)]),
  pos:0,progress:0,phase:'parking_out',trafficModel:2,noUTurnPolicy:1,
  lotPath:[{x:91.25,y:fromY},{x:91.25,y:toY}],lotDistance:.4,lotReady:true,
  lotBuilding:building.id,mergeCommitted:false,mergeExitActive:false,
  speed:0,wait:0,stopReason:'รอรถข้างหน้าในลานจอด',
  lastMovedAt:490,startedAt:480,deadline:520,life:null,respawns:0,waitSeconds:0};
 g.state.vehicles.set(v.id,v);citizen.vehicleId=v.id;
 building.queue.push(v.id);
 return {v,citizen};
}
const p=car(a,99.2,100.6,0),q=car(b,100.7,99.3,1);
const va=p.v,vb=q.v;
assert(g.oppositeSmallRoadExit(va,vb),'opposing exit detection');
assert.equal(g.oppositeExitAdmissionBlocker(vb)?.id,va.id,'later opposite exit must yield');
assert.equal(g.oppositeExitAdmissionBlocker(va),null,'first exit has priority');
g.state.time=500;
assert.equal(g.rescueOppositeExitPairs(),0,'no rescue before pair timer has elapsed');
assert.equal(g.oppositeExitPairSince.size,1,'a genuine mutual obstruction is tracked');
g.state.time=505.9;
assert.equal(g.rescueOppositeExitPairs(),0,'no premature rescue at 5.9 game minutes');
g.state.time=506.1;
assert.equal(g.rescueOppositeExitPairs(),2,'both opposing cars rescued after 6 game minutes');
assert.equal(va.phase,'departing');assert.equal(vb.phase,'departing');
assert.equal(va.lotPath,null);assert.equal(vb.lotPath,null);
assert(va.oppositeExitRetryAt<vb.oppositeExitRetryAt,'retries are staggered');
assert(a.parked.has(p.citizen.id)&&b.parked.has(q.citizen.id),'cars are returned to their own origins');
assert.equal(p.citizen.vehicleId,va.id);assert.equal(q.citizen.vehicleId,vb.id);
assert(Math.abs(va.deadline-(520+18.1))<1e-6);assert(Math.abs(vb.deadline-(520+24.1))<1e-6);
assert.equal(g.state.missionStats.current.total,0,'bug recovery does not create mission outcomes');
assert.equal(g.oppositeExitPairSince.size,0,'pair timer is cleared after rescue');
g.state.time=506.2;
assert.equal(g.rescueOppositeExitPairs(),0,'no repeated rescue of parked cars');
const outside={...va,id:g.state.nextId++,fromId:null,phase:'driving',mergeExitActive:false};
assert.equal(g.oppositeSmallRoadExit(va,outside),false,'unrelated road traffic is excluded');
console.log('PASS: opposing small-road exit priority; six game-minute paired rescue; no performance penalty; staggered retry');
