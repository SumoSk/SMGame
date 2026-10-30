'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game:g,install,turnPath}=new Function('require',prefix+'return {game,install,turnPath};')(require);
const points=Array.from({length:30},(_,i)=>[130+i,100]);
function pair(leaderTech,flightFollower){
 const leader=install(points,'medium',false,0),st=g.state;
 leader.pos=12;leader.progress=0;leader.phase='stuck';leader.speed=0;leader.noUTurnPolicy=1;
 leader.vehicleTech=leaderTech;leader.heldPose=g.positionOnMotion(g.motionPlan(leader),g.motionPlan(leader).nodes[12]);
 leader.recoveryVersion=st.version;leader.nextRouteRetry=st.time+999;leader.routeMissing=false;leader.lastMovedAt=st.time;
 const follower={...leader,id:901,pos:9,progress:0,phase:'driving',heldPose:null,
  vehicleTech:flightFollower?'fly':'normal',wait:0,stopReason:'',speed:0,lastMovedAt:st.time,
  path:[...leader.path],pathSet:new Set(leader.path),junctionPasses:[],junctionQueueSince:{},
  turnLanes:{},laneSeed:0,motionSeedLane:0,routeCheckedVersion:st.version};
 st.vehicles.set(follower.id,follower);
 st.occ.clear();
 const lane1=g.plannedLane(leader,leader.pos),lane2=g.plannedLane(follower,follower.pos);
 const first=(leaderTech==='fly'?'air:':'')+leader.path[leader.pos]+':0:'+lane1;
 const second=(flightFollower?'air:':'')+follower.path[follower.pos]+':0:'+lane2;
 leader.occKey=first;st.occ.set(first,leader.id);follower.occKey=second;st.occ.set(second,follower.id);
 return {st,leader,follower};
}
// Ground vehicles cannot stop an airborne car even when their 2-D paths overlap.
{
 const {st,leader,follower}=pair('normal',true);
 const start=g.motionDistance(follower);
 assert(follower.occKey?.startsWith('air:'),'airborne occupation must have independent namespace');
 for(let k=0;k<350;k++){st.time+=.032;g.advanceVehicles(.016,.032);}
 assert.equal(leader.phase,'stuck','stationary ground blocker must remain');
 assert(g.motionDistance(follower)>g.motionDistance(leader)+.5,'air car should fly past ground blocker');
 assert(g.motionDistance(follower)>start+3,'air traffic must actually move');
}
// Normal cars must also pass through an airborne car without seeing a ground obstacle.
{
 const {st,leader,follower}=pair('fly',false);
 const start=g.motionDistance(follower);
 for(let k=0;k<350;k++){st.time+=.032;g.advanceVehicles(.016,.032);}
 assert.equal(leader.phase,'stuck');
 assert(g.motionDistance(follower)>g.motionDistance(leader)+.5,'ground traffic must ignore airborne blockers');
 assert(g.motionDistance(follower)>start+3);
}
// Airborne cars still stop for other airborne vehicles in the same lane.
{
 const {st,leader,follower}=pair('fly',true);
 const start=g.motionDistance(follower),leaderPose=g.vehiclePosition(leader);
 for(let k=0;k<400;k++){
  st.time+=.032;g.advanceVehicles(.016,.032);
  if(st.vehicles.has(follower.id))assert(!g.capsulesOverlap(g.vehiclePosition(follower),leaderPose),'two airborne bodies must never overlap');
 }
 assert(g.motionDistance(follower)>start+.1,'air follower may approach its leader');
 assert(g.motionDistance(follower)<g.motionDistance(leader)-.2,'air follower must remain behind air leader');
 assert.equal(leader.phase,'stuck');
}
// The sky owns separate junction leases and is not controlled by the ground light.
{
 const v=install(turnPath(-1),'large',true),st=g.state,node=g.id(150,150),pos=v.path.indexOf(node);
 assert(pos>0&&pos<v.path.length-1&&g.junction(node)>=3);
 v.vehicleTech='fly';v.phase='driving';v.noUTurnPolicy=1;
 st.occ.clear();v.occKey=null;
 const entering=g.dir(v.path[pos-1],node),slots=g.signalSlots(node),ownSlot=slots.findIndex(x=>x.incoming===entering),redSlot=slots.findIndex(x=>x.incoming!==entering);
 assert(ownSlot>=0&&redSlot>=0);
 st.signals.set(node,{mode:'manual',phaseModel:'approach',axis:slots[redSlot].axis,slot:redSlot,eastWest:6,northSouth:6,holdUntil:0});
 assert(!g.signalAllows(node,entering,0),'this ground approach is red');
 assert.equal(g.intersectionAllowed(v,pos),true,'air car ignores ground red light');
 g.reserveIntersection(v,pos);
 const airLease=st.reservations.get('air:junction:'+node);
 assert(airLease&&airLease.id===v.id);
 assert(!st.reservations.has('junction:'+node),'flying must not steal ground junction lease');
 const otherFly={...v,id:902,path:[...v.path],pathSet:new Set(v.path),junctionPasses:[],turnLanes:{},junctionQueueSince:{},committedJunction:null};
 st.vehicles.set(otherFly.id,otherFly);
 assert.equal(g.intersectionAllowed(otherFly,pos),false,'conflicting flying cars must respect each other junction leases');
 const ground={...v,id:903,vehicleTech:'normal',path:[...v.path],pathSet:new Set(v.path),junctionPasses:[],turnLanes:{},junctionQueueSince:{},committedJunction:null};
 st.vehicles.set(ground.id,ground);
 assert.equal(g.intersectionAllowed(ground,pos),false,'ground car still obeys its red light');
 st.signals.set(node,{mode:'manual',phaseModel:'approach',axis:slots[ownSlot].axis,slot:ownSlot,eastWest:6,northSouth:6,holdUntil:0});
 assert.equal(g.intersectionAllowed(ground,pos),true,'ground green light works independently of air junction lease');
 g.reserveIntersection(ground,pos);
 assert.equal(st.reservations.get('junction:'+node)?.id,ground.id);
 assert.equal(st.reservations.get('air:junction:'+node)?.id,v.id);
 const saved=g.snapshot();
 assert.equal(g.loadGame(true,null,saved),true,'save/load must support two levels on one road');
 const restoredAir=g.state.vehicles.get(v.id),restoredGround=g.state.vehicles.get(ground.id);
 assert.equal(restoredAir.vehicleTech,'fly');
 assert(g.state.reservations.has('air:junction:'+node),'air lease rebuilt from active air turn');
 assert(g.state.reservations.has('junction:'+node),'ground lease rebuilt from active ground turn');
 assert.equal(restoredGround.vehicleTech,'normal');
}
// A flying car in a parking driveway is still on the ground until takeoff.
{
 const {st,follower}=pair('normal',true);
 follower.phase='parking_out';
 assert.equal(g.intersectionAllowed(follower,follower.pos+1),true,'non-junction remains traversable');
 assert(!g.state.occ.has('air:junction:'+follower.path[follower.pos+1]));
}
console.log('PASS: air layer ignores ground queues/lights/vehicles; aircraft block each other; save/load and junction leases remain isolated');
