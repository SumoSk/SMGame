'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs'),results=[];
// Controlled motion-plan states exercise the existing reciprocal-swap policy;
// this does not claim that commitSafeLaneChange admits simultaneous swaps.
for(const reverseMap of [false,true])for(const swapIds of [false,true]){
 const {game:g}=boot('occupy,reciprocalLaneSwap');g.reset();g.state.roads.clear();g.state.buildings.clear();g.state.vehicles.clear();g.state.citizens.clear();g.state.occ.clear();g.state.reservations.clear();g.state.gates=[];g.state.speed=1;
 const p=Array.from({length:220},(_,i)=>g.id(30+i,100));for(const n of p)g.state.roads.set(n,{type:'large',main:false,links:new Set(),load:0,wait:0});for(let i=1;i<p.length;i++){g.state.roads.get(p[i-1]).links.add(p[i]);g.state.roads.get(p[i]).links.add(p[i-1]);}
 const cars=[];
 for(let pair=0;pair<8;pair++)for(let lane=0;lane<2;lane++){
  const id=1000+pair*2+(swapIds?1-lane:lane),route=p.slice(4+pair*4),v={id,path:route,pathSet:new Set(route),pos:0,progress:0,lane,laneSeed:lane,motionSeedLane:lane,phase:'driving',kind:'pass',trafficModel:2,noUTurnPolicy:1,routeCheckedVersion:g.state.version,speed:2.7,wait:0,lastMovedAt:g.state.time,turnLanes:{},junctionPasses:[],junctionQueueSince:{}};
  const before=g.positionOnMotion(g.motionPlan(v),0);v.path=[...route];v.motionStartPose=before;v.motionSeedLane=1-lane;v.emergencyInitialLane=1-lane;v.lane=1-lane;cars.push(v);
 }
 for(const v of reverseMap?[...cars].reverse():cars){g.state.vehicles.set(v.id,v);assert(g.occupy(v,0));}
 let allowedOverlapSamples=0,wrongClaims=0;
 for(let k=0;k<120;k++){
  g.state.time+=.04;g.advanceVehicles(.05,.04);
  for(const v of cars)if(v.occKey&&g.state.occ.get(v.occKey)!==v.id)wrongClaims++;
  for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
   const a=cars[i],b=cars[j],pa=g.vehiclePosition(a),pb=g.vehiclePosition(b);if(!g.capsulesOverlap(pa,pb))continue;
   assert(g.reciprocalLaneSwap(a,b,g.motionPlan(a),g.motionDistance(a),pb,pa),'only the existing reciprocal exception may overlap');allowedOverlapSamples++;
  }
 }
 assert(allowedOverlapSamples>0);assert.equal(wrongClaims,0);assert.equal(g.state.vehicles.size,16);assert(cars.every(v=>(v.respawns||0)===0&&g.motionDistance(v)>10));
 const a={direction:0,start:0,end:1,side:1},b={direction:0,start:1,end:1,side:0};assert(!g.laneSwapClearance(a,b,0),'one-sided cut-in must remain solid');
 results.push({reverseMap,swapIds,cars:16,allowedOverlapSamples,wrongClaims,allPastManoeuvre:true,noRespawns:true,oneSidedCutInStillRejected:true});
}
console.log(JSON.stringify({source:process.env.SMCITY_SOURCE,passed:true,syntheticPolicyStates:true,results},null,2));
