'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE||=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
const extra='isAirTraffic,cellAvailable,trafficCellKey,occupyParkingExit,activeOppositeExit,rebuildFootprint,lotPathLength,physicalTrafficLimit,beginTrafficSpatial,updateTrafficSpatial,get testTrafficSpatial(){return trafficSpatial;},set testTrafficSpatial(value){trafficSpatial=value;}';
const output={};
function fresh(){const {game:g}=boot(extra);g.reset();g.state.money=1e9;g.state.buildingQuota=Object.fromEntries(Object.keys(g.CATALOG).map(k=>[k,1000]));g.state.speed=1;return g;}
{
 const g=fresh(),from=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true),to=g.buildBuilding('office_large',180,148-g.CATALOG.office_large.plotHeight,true);
 assert(from&&to);const c=g.newCitizen(from);c.resident=true;c.vehicleTech='fly';from.parked.add(c.id);g.parkingSpace(from,c.id,true);assert(g.createTrip(c,'work',from.id,to.id,null,null,null));const v=g.state.vehicles.get(c.vehicleId);
 for(let k=0;k<10000&&v.phase!=='driving';k++){g.state.time+=.04;g.advanceVehicles(.05,.04);}
 assert.equal(v.phase,'driving');const n=v.path[v.pos],d=g.dir(n,v.path[v.pos+1]),l=g.plannedLane(v,v.pos),airKey=g.trafficCellKey(v,n,d,l),groundKey=n+':'+d+':'+l;
 assert.equal(g.vehiclePosition(v).altitude,5);assert.equal(v.occKey,airKey);assert.equal(g.state.occ.get(airKey),v.id);assert.notEqual(g.state.occ.get(groundKey),v.id);assert(g.cellAvailable(n,d,l,999999));
 output.naturalFlyExit={phase:v.phase,altitude:g.vehiclePosition(v).altitude,occKey:v.occKey,groundAvailable:true};
 // Failure to acquire the air layer must preserve the still-ground exit and
 // its bay. The other car/lease must never be overwritten during the attempt.
 g.state.occ.delete(airKey);v.phase='parking_out';v.lotPath=[g.positionOnMotion(g.motionPlan(v),0),g.positionOnMotion(g.motionPlan(v),0)];v.lotDistance=0;v.occKey=groundKey;g.state.occ.set(groundKey,v.id);from.parked.add(c.id);g.parkingSpace(from,c.id,true);
 const blocker={id:9999,fromId:v.fromId,toId:v.toId,vehicleTech:'fly',phase:'driving',path:[...v.path],pathSet:new Set(v.path),pos:0,progress:0,lane:v.lane,laneSeed:v.laneSeed,trafficModel:2,speed:0};g.state.vehicles.set(blocker.id,blocker);g.state.occ.set(airKey,blocker.id);
 assert.equal(g.occupyParkingExit(v),false);assert.equal(v.phase,'parking_out');assert.equal(v.occKey,groundKey);assert.equal(g.state.occ.get(groundKey),v.id);assert.equal(g.state.occ.get(airKey),blocker.id);assert(from.parked.has(c.id));assert(g.parkingSpace(from,c.id)>=0);
 g.state.occ.delete(airKey);g.state.reservations.set(airKey,{id:blocker.id,until:g.state.time+10});assert.equal(g.occupyParkingExit(v),false);assert.equal(v.phase,'parking_out');assert.equal(g.state.occ.get(groundKey),v.id);assert.equal(g.state.reservations.get(airKey).id,blocker.id);
 g.state.reservations.delete(airKey);blocker.progress=.5;g.testTrafficSpatial=g.beginTrafficSpatial();g.updateTrafficSpatial(v);g.updateTrafficSpatial(blocker);assert.equal(g.occupyParkingExit(v),false,'airborne physical leader must block takeoff even without an occupancy claim');assert.equal(v.phase,'parking_out');assert.equal(g.state.occ.get(groundKey),v.id);g.state.vehicles.delete(blocker.id);g.updateTrafficSpatial(blocker);assert(g.occupyParkingExit(v));assert.equal(v.phase,'driving');assert.equal(v.occKey,airKey);assert.equal(g.state.occ.get(airKey),v.id);assert.equal(g.state.occ.has(groundKey),false);
 output.airEntryRollback={occupiedAirPreserved:true,reservedAirPreserved:true,groundAndBayRetainedUntilSuccess:true,physicalAirLeaderChecked:true};
}
{
 const g=fresh(),make=(id,rotation)=>({id,key:'home_large',x:160,y:130,rotation,parked:new Set(),parkingSlots:Array(20).fill(null),queue:[],visitors:new Set(),residents:new Set(),workers:new Set(),access:[]});g.state.buildings.set(10,make(10,0));g.state.buildings.set(20,make(20,2));
 const a={id:101,fromId:10,phase:'parking_out',lotReady:false,lastMovedAt:0,lotBuilding:10,lotPath:[{x:160,y:150},{x:161,y:150}],lotDistance:0,path:[g.id(160,150),g.id(161,150)],pos:0,progress:0};
 const b={id:102,fromId:20,phase:'parking_out',lotReady:false,lastMovedAt:0,lotBuilding:20,lotPath:[{x:160.5,y:150},{x:159.5,y:150}],lotDistance:0,path:[g.id(161,150),g.id(160,150)],pos:0,progress:0};g.state.vehicles.set(a.id,a);g.state.vehicles.set(b.id,b);g.state.time=10;g.state.roads.get(a.path[0]).type='small';g.state.roads.get(b.path[0]).type='small';
 assert(g.activeOppositeExit(a));assert(g.activeOppositeExit(b));assert.equal(g.oppositeExitAdmissionBlocker(b)?.id,a.id);g.rescueOppositeExitPairs();assert.equal(g.oppositeExitPairSince.size,1);
 assert(!g.activeOppositeExit({...a,lotPath:null}));output.oppositeGuard={unreadyCorridorRecognized:true,olderExitWins:true,reciprocalPairObserved:true};
}
{
 const g=fresh();for(const [i,r]of g.state.roads)if(Math.floor(i/300)===150&&i%300>152)r.type='small';g.rebuildFootprint();const t=g.CATALOG.home_large,a=g.buildBuilding('home_large',160,149-t.plotHeight,true,0),b=g.buildBuilding('home_large',164,151,true,2);assert(a&&b);
 function trip(origin,gate){const c=g.newCitizen(origin);c.resident=true;origin.parked.add(c.id);g.parkingSpace(origin,c.id,true);assert(g.createTrip(c,'moveOut',origin.id,null,null,gate,10000));return g.state.vehicles.get(c.vehicleId);}
 const va=trip(a,g.id(205,150)),vb=trip(b,g.id(155,150));let seenActive=false,bothCommitted=false,observedBlocker=false;
 for(let k=0;k<6000&&(g.state.vehicles.has(va.id)||g.state.vehicles.has(vb.id));k++){g.state.time+=.04;g.advanceVehicles(.05,.04);if(va.phase==='parking_out'&&vb.phase==='parking_out'){seenActive||=g.activeOppositeExit(va)&&g.activeOppositeExit(vb);bothCommitted||=!!(va.mergeCommitted&&vb.mergeCommitted);observedBlocker||=!!g.oppositeExitAdmissionBlocker(vb);}}
 assert(seenActive);assert(observedBlocker);assert(!bothCommitted,'opposing corridors must serialize admission');assert(!g.state.vehicles.has(va.id)&&!g.state.vehicles.has(vb.id),'both natural trips must finish');output.naturalOppositeExit={seenActive,observedBlocker,bothCommitted,bothTripsFinished:true};
}
{
 const g=fresh();let bays=0;const lots=[];
 for(const key of ['home_large','home_dual','home_grand','home_mahanakhon','home_mahanakhon_compact','office_small','office_medium','office_large','home_starter']){
  g.reset();g.state.speed=1;g.state.money=1e9;g.state.buildings.clear();g.state.vehicles.clear();g.state.citizens.clear();g.state.occ.clear();g.state.reservations.clear();const b={id:10,key,x:160,y:130,rotation:0,parked:new Set(),parkingSlots:Array(g.CATALOG[key].parkingCapacity).fill(null),queue:[],visitors:new Set(),residents:new Set(),workers:new Set(),access:[]};g.state.buildings.set(b.id,b);
  for(let i=0;i<b.parkingSlots.length;i++){const cid=100+i;b.parkingSlots[i]=cid;b.parked.add(cid);g.state.citizens.set(cid,{id:cid});}
  for(let i=0;i<b.parkingSlots.length;i++){const cid=b.parkingSlots[i],v={id:1000+i,citizenId:cid,fromId:b.id,toId:null,phase:'departing',path:[g.id(160,150),g.id(161,150)],pos:0,progress:0};g.state.vehicles.set(v.id,v);g.state.citizens.get(cid).vehicleId=v.id;for(let k=0;k<300;k++)g.prepareLotDeparture(v,.03);assert(v.lotDistance>=.03,`${key} slot ${i} cannot begin departure: ${v.stopReason}`);g.state.vehicles.delete(v.id);g.state.citizens.get(cid).vehicleId=null;bays++;}lots.push({key,bays:b.parkingSlots.length});
 }
 assert.equal(bays,391);output.fullOccupiedLots={bays,lots:lots.length,allCanBeginDeparture:true};
}
console.log(JSON.stringify({passed:true,source:process.env.SMCITY_SOURCE,...output},null,2));
