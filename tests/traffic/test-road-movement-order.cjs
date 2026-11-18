'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
const oracle=fs.readFileSync(path.join(__dirname,'roadMovementOrder.oracle.txt'),'utf8');
const extra='roadMovementOrder,roadCellKey,occupy,beginTrafficSpatial,updateTrafficSpatial,motionPlans,roadEditAnchors,motionDirection,oldRoadMovementOrder:'+oracle+',set auditOrder(fn){roadMovementOrder=fn;},set auditMotionPlan(fn){motionPlan=fn;},set auditMotionDirection(fn){motionDirection=fn;},set auditTrafficSpatial(value){trafficSpatial=value;}';
const candidate=boot(extra).game,reference=boot(extra).game;
const result={passed:true,oracle:'Exact original function injected into candidate lexical scope',orderChecks:0,stateChecks:0,traceSteps:0,permutations:0,contexts:[],mutations:[],instrumentation:null};
const plain=value=>JSON.parse(JSON.stringify(value,(_,v)=>Object.prototype.toString.call(v)==='[object Set]'?[...v]:v));
function polyline(points){
 const cells=[];
 for(let k=0;k<points.length-1;k++){
  const [x,y]=points[k],[xx,yy]=points[k+1],dx=Math.sign(xx-x),dy=Math.sign(yy-y),count=Math.max(Math.abs(xx-x),Math.abs(yy-y));
  assert(!(dx&&dy),'fixture segments must follow the road graph');
  for(let i=0;i<count;i++)cells.push((y+dy*i)*300+x+dx*i);
 }
 const last=points.at(-1);cells.push(last[1]*300+last[0]);return cells;
}
function fixture(g,description,permutation){
 g.reset('london');
 for(const key of ['roads','buildings','vehicles','citizens','occ','reservations','signals'])g.state[key].clear();
 g.state.gates=[];g.state.speed=1;g.state.time=420;g.state.nextId=10000;
 g.auditTrafficSpatial=null;
 const paths=Object.fromEntries(Object.entries(description.routes).map(([name,points])=>[name,polyline(points)]));
 for(const route of Object.values(paths)){
  for(const node of route)if(!g.state.roads.has(node))g.state.roads.set(node,{type:description.roadType||'large',main:false,links:new Set(),load:0,wait:0});
  for(let i=1;i<route.length;i++){g.state.roads.get(route[i-1]).links.add(route[i]);g.state.roads.get(route[i]).links.add(route[i-1]);}
 }
 if(description.mixedWidths)for(const [node,r]of g.state.roads)r.type=node%300<90?'small':node%300<110?'medium':'large';
 const cars=description.cars.map((spec,index)=>{
  const route=paths[spec.route||Object.keys(paths)[0]],v={id:1000+index,path:route,pathSet:new Set(route),pos:spec.pos??0,progress:spec.progress??0,laneSeed:spec.lane??0,lane:spec.lane??0,phase:'driving',kind:'pass',trafficModel:2,noUTurnPolicy:1,routeCheckedVersion:g.state.version,vehicleTech:'normal',speed:2,wait:0,lastMovedAt:g.state.time,startedAt:g.state.time,deadline:g.state.time+1000,turnLanes:{},junctionPasses:[],junctionQueueSince:{},...spec};
  delete v.route;return v;
 });
 for(const index of permutation||cars.map((_,i)=>i))g.state.vehicles.set(cars[index].id,cars[index]);
 if(description.spatial){g.auditTrafficSpatial=g.beginTrafficSpatial();for(const v of g.state.vehicles.values())g.updateTrafficSpatial(v);}
 return{g,cars,paths};
}
function fingerprint(f){
 const g=f.g;
 return plain({time:g.state.time,nextId:g.state.nextId,vehicles:[...g.state.vehicles],occ:[...g.state.occ],reservations:[...g.state.reservations],signals:[...g.state.signals],roads:[...g.state.roads],geometry:[...g.state.vehicles.values()].filter(v=>v.phase==='driving'&&v.path?.length).map(v=>{const p=g.motionPlan(v);return{id:v.id,lanes:[...p.lanes],nodes:[...p.nodes],turns:p.turns,junctions:p.junctions,pose:g.vehiclePosition(v)};})});
}
function compare(a,b,label){
 const inputA=[...a.g.state.vehicles.values()],inputB=[...b.g.state.vehicles.values()];
 const orderedA=a.g.roadMovementOrder(inputA),orderedB=b.g.oldRoadMovementOrder(inputB);
 assert.deepEqual(plain(orderedA.map(v=>v.id)),plain(orderedB.map(v=>v.id)),label+' ordered IDs');
 assert.equal(new Set(orderedA).size,inputA.length,label+' retain every input object exactly once');
 for(let i=0;i<inputA.length;i++)if(inputA[i].phase!=='driving'||!inputA[i].path?.length)assert.equal(orderedA[i],inputA[i],label+' nonroad slot '+i);
 assert.deepEqual(fingerprint(a),fingerprint(b),label+' states and geometry');
 result.orderChecks++;result.stateChecks++;
}
function permutations(n){
 const original=Array.from({length:n},(_,i)=>i),variants=[original,[...original].reverse(),original.filter(i=>i%2).concat(original.filter(i=>i%2===0))];
 for(const shift of [1,Math.floor(n/2),n-1])variants.push(original.slice(shift).concat(original.slice(0,shift)));
 return variants;
}
const descriptions=[
 {name:'straight-layers-phases-and-ties',routes:{east:[[60,100],[130,100]],west:[[130,100],[60,100]]},spatial:true,cars:[
  {pos:7,progress:.2},{pos:8,progress:.3},{pos:9,progress:.3},{pos:8,progress:.3},
  {pos:10,progress:0,lane:1},{pos:12,progress:.8,vehicleTech:'fly'},
  {pos:13,progress:.9,vehicleTech:'fly'},{pos:14,progress:.2,vehicleTech:'speed'},
  {pos:5,phase:'stuck',vehicleTech:'fly'},{pos:0,phase:'gate_waiting'},
  {pos:20,route:'west',lane:2},{pos:21,route:'west',lane:2},{pos:0,phase:'parking_out'},
  {pos:0,phase:'departing'},{pos:70,progress:1},{pos:69,progress:1},{pos:68,progress:0},
  {pos:17,progress:1e-7},{pos:17,progress:0},{pos:17,progress:1e-7+1e-12}
 ]},
 {name:'curves-shared-cells-and-u-turn',routes:{right:[[60,110],[100,110],[100,150]],left:[[60,110],[100,110],[100,70]],straight:[[60,110],[140,110]],reverse:[[60,110],[100,110],[60,110]]},cars:[
  {route:'right',pos:35,progress:.3,lane:0},{route:'right',pos:36,progress:.7,lane:1},
  {route:'right',pos:41,progress:.1,lane:0},{route:'left',pos:37,progress:.7,lane:3},
  {route:'left',pos:42,progress:0,lane:2},{route:'straight',pos:38,progress:.9,lane:1},
  {route:'reverse',pos:38,progress:.5,lane:0},{route:'right',pos:40,progress:0,vehicleTech:'fly'},
  {route:'left',pos:40,progress:1,vehicleTech:'fly'},{route:'straight',pos:0,phase:'parking_in'}
 ]},
 {name:'width-transitions-and-legacy-lanes',routes:{east:[[60,120],[140,120]],bends:[[60,120],[100,120],[100,150],[130,150]]},mixedWidths:true,cars:[
  {pos:26,progress:.99,lane:0},{pos:27,progress:1,lane:0},{pos:30,progress:0,lane:0},
  {pos:48,progress:.2,lane:1},{pos:49,progress:.9,lane:1},{pos:50,progress:0,lane:1},
  {route:'bends',pos:38,progress:.5,lane:3,trafficModel:1},{route:'bends',pos:42,progress:.5,lane:1,trafficModel:1},
  {pos:51,progress:.8,lane:3},{pos:80,progress:1,lane:0},{pos:79,progress:1,lane:0},
  {pos:31,progress:.1,lane:0,vehicleTech:'fly'}
 ]},
 {name:'leader-cycle-on-closed-loop',routes:{a:[[160,160],[162,160],[162,162],[160,162],[160,160],[162,160]],b:[[162,160],[162,162],[160,162],[160,160],[162,160],[162,162]],c:[[162,162],[160,162],[160,160],[162,160],[162,162],[160,162]],d:[[160,162],[160,160],[162,160],[162,162],[160,162],[160,160]]},cars:[{route:'a',pos:0,progress:.2},{route:'b',pos:0,progress:.2},{route:'c',pos:0,progress:.2},{route:'d',pos:0,progress:.2}]},
 {name:'empty-and-singleton',routes:{east:[[80,90],[81,90]]},cars:[{pos:0},{pos:0,phase:'departing'}]}
];
for(const description of descriptions){
 for(const permutation of permutations(description.cars.length)){
  const a=fixture(candidate,description,permutation),b=fixture(reference,description,permutation);result.permutations++;
  compare(a,b,description.name+' cold');compare(a,b,description.name+' cached');
  for(const f of [a,b]){f.cars[0].laneSeed=3;f.cars[0].lane=3;f.cars[0].emergencyInitialLane=1;}
  compare(a,b,description.name+' pending-seed-keeps-cached-plan');
  for(const f of [a,b])f.g.state.version++;
  compare(a,b,description.name+' rebuilt-lanes');
  for(const f of [a,b]){const v=f.cars[0];v.path=[...v.path];v.pathSet=new Set(v.path);}
  compare(a,b,description.name+' replaced-route');
  if(description.cars.length>2){
   for(const f of [a,b]){const v=f.cars[0],end=v.path.length-1;[v.path[end-1],v.path[end]]=[v.path[end],v.path[end-1]];}
   compare(a,b,description.name+' in-place-route-tail-edit');
  }
 }
 result.contexts.push(description.name);
}
// Exercise a live road upgrade, preservation of its anchor geometry, an actual
// committed lane change, and current occupancy/reservations between order calls.
{
 const d={name:'live-edits',spatial:true,routes:{east:[[50,130],[180,130]]},cars:[{pos:12,progress:.2,lane:0},{pos:16,progress:.5,lane:0},{pos:24,progress:.1,lane:2},{pos:26,progress:.5,lane:0,vehicleTech:'fly'}]};
 const a=fixture(candidate,d),b=fixture(reference,d);
 for(const f of [a,b])for(const v of f.cars)assert(f.g.occupy(v,v.pos));
 compare(a,b,'pre lane-change');
 for(const f of [a,b])assert(f.g.commitSafeLaneChange(f.cars[0],1,'differential lane change'));
 compare(a,b,'committed lane change with motionStartPose');result.mutations.push('actual-committed-lane-change');
 for(const f of [a,b]){const nodes=f.paths.east.slice(40,60);for(const node of nodes)f.g.state.roads.get(node).type='medium';f.g.roadChanged(nodes);}
 compare(a,b,'road class edit with preserved anchors');result.mutations.push('road-edit-anchors');
 for(const f of [a,b]){const v=f.cars[1];f.g.state.reservations.set(f.g.roadCellKey(v,v.pos+1),{id:99999,until:f.g.state.time+10});f.g.state.occ.set(f.g.roadCellKey(v,v.pos+2),99998);}
 compare(a,b,'live reservation and occupancy edits');result.mutations.push('live-claims');
 for(const f of [a,b]){const v=f.cars[3];v.phase='stuck';v.heldPose=f.g.vehiclePosition(v);}
 compare(a,b,'air driving to stuck keeps nonroad slot');
 for(const f of [a,b])f.cars[3].phase='driving';
 compare(a,b,'air returns to driving layer');result.mutations.push('air-phase-boundary');
}
// Full movement uses the original order function in the reference VM and
// compares every car, pose, lane key, reservation and road load after each step.
for(const curved of [false,true])for(const reverse of [false,true]){
 const d={name:'trace',roadType:curved?'large':'small',routes:curved?{east:[[60,100],[110,100],[110,155]]}:{east:[[60,100],[240,100]]},cars:[{pos:curved?45:15,progress:.1},{pos:curved?43:13,progress:.2},{pos:curved?40:10,progress:.3},{pos:curved?47:17,progress:.1,vehicleTech:'fly'}]};
 const permutation=reverse?[3,2,1,0]:[0,1,2,3],a=fixture(candidate,d,permutation),b=fixture(reference,d,permutation);
 b.g.auditOrder=b.g.oldRoadMovementOrder;
 for(const f of [a,b])for(const v of f.cars)assert(f.g.occupy(v,v.pos));
 for(let step=0;step<100;step++){
  for(const f of [a,b]){f.g.state.time+=.08;f.g.advanceVehicles(.1,.08);}
  assert.deepEqual(fingerprint(a),fingerprint(b),`movement trace curved=${curved} reverse=${reverse} step=${step}`);result.stateChecks++;result.traceSteps++;
 }
 for(const f of [a,b])for(const v of f.cars)assert(f.g.state.vehicles.has(v.id),'trace vehicles remain active');
 b.g.auditOrder=b.g.roadMovementOrder;
}
// Counts are semantic instrumentation, not a wall-clock benchmark.
{
 const d=descriptions[0],a=fixture(candidate,d),g=a.g,originalPlan=g.motionPlan,originalDirection=g.motionDirection;
 let plans=0,directions=0;g.auditMotionPlan=v=>{plans++;return originalPlan(v);};g.auditMotionDirection=(p,i)=>{directions++;return originalDirection(p,i);};
 for(const v of a.cars)if(v.phase==='driving')originalPlan(v);
 plans=0;directions=0;g.roadMovementOrder(a.cars);const optimized={plans,directions};
 plans=0;directions=0;g.oldRoadMovementOrder(a.cars);const old={plans,directions};
 const driving=a.cars.filter(v=>v.phase==='driving'&&v.path?.length),expectedPlanSavings=driving.reduce((n,v)=>n+1+Math.min(5,v.path.length-v.pos),0);
 assert.equal(old.plans-optimized.plans,expectedPlanSavings);assert.equal(old.directions-optimized.directions,driving.length);
 g.auditMotionPlan=originalPlan;g.auditMotionDirection=originalDirection;
 result.instrumentation={driving:driving.length,old,optimized,planCallsRemoved:old.plans-optimized.plans,directionCallsRemoved:old.directions-optimized.directions};
}
for(const cars of [[],[{id:1,phase:'departing'}]])assert.equal(candidate.roadMovementOrder(cars),cars,'fewer than two driving vehicles returns input array');
console.log(JSON.stringify(result));
