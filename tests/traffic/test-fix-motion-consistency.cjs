'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
function fixture(type='large',length=261){
 const {game:g}=boot('occupy,roadCellKey,beginTrafficSpatial,updateTrafficSpatial,set testTrafficSpatial(x){trafficSpatial=x;}');
 g.reset();g.state.roads.clear();g.state.buildings.clear();g.state.vehicles.clear();g.state.citizens.clear();g.state.occ.clear();g.state.reservations.clear();g.state.gates=[];
 const p=Array.from({length},(_,i)=>g.id(20+i,100));
 for(const n of p)g.state.roads.set(n,{type,main:false,links:new Set(),load:0,wait:0});
 for(let i=1;i<p.length;i++){g.state.roads.get(p[i-1]).links.add(p[i]);g.state.roads.get(p[i]).links.add(p[i-1]);}
 function car(id,pos,tech='normal'){
  const v={id,path:p,pathSet:new Set(p),pos,progress:0,laneSeed:0,lane:0,phase:'driving',kind:'pass',trafficModel:2,noUTurnPolicy:1,routeCheckedVersion:g.state.version,vehicleTech:tech,speed:2.7,wait:0,lastMovedAt:g.state.time,turnLanes:{},junctionPasses:[],junctionQueueSince:{}};
  g.state.vehicles.set(id,v);assert(g.occupy(v,v.pos));return v;
 }
 return {g,p,car};
}
function locate(g,v,s){const p=g.motionPlan(v);let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=s)i++;v.pos=i;v.progress=(s-p.nodes[i])/Math.max(1e-10,(p.nodes[i+1]??p.nodes[i])-p.nodes[i]);g.occupy(v,v.pos);}
const heading=[];
for(const d of [.1,.2,.3,.5,.7]){
 const {g,car}=fixture(),v=car(900,10);v.progress=.2;g.testTrafficSpatial=g.beginTrafficSpatial();g.updateTrafficSpatial(v);
 assert(g.commitSafeLaneChange(v,1,'regression'));locate(g,v,d);const before=g.vehiclePosition(v);g.roadChanged([]);const after=g.vehiclePosition(v),yaw=Math.atan2(Math.sin(after.angle-before.angle),Math.cos(after.angle-before.angle)),positionJump=Math.hypot(after.x-before.x,after.y-before.y);
 assert(positionJump<1e-8);assert(Math.abs(yaw)<1e-8);assert.equal(v.occKey,g.roadCellKey(v,v.pos));
 const p=g.motionPlan(v),s=g.motionDistance(v,p),ahead=g.positionOnMotion(p,s+1e-5),tangent=Math.atan2(ahead.y-after.y,ahead.x-after.x),actual=Math.atan2(after.dy,after.dx);
 assert(Math.abs(Math.atan2(Math.sin(tangent-actual),Math.cos(tangent-actual)))<.002);
 heading.push({distance:d,positionJump,yawDegrees:yaw*180/Math.PI,heldClaimMatches:true});
}
const following=[];
for(const step of [.05,.1,.4])for(const tech of ['normal','speed'])for(const idsSwapped of [false,true])for(const frontFirst of [false,true]){
 const {g,car}=fixture('small');g.state.speed=5;const ids=idsSwapped?[901,900]:[900,901];let front,back;
 if(frontFirst){front=car(ids[0],12,tech);back=car(ids[1],11,tech);}else{back=car(ids[1],11,tech);front=car(ids[0],12,tech);}
 let minGap=Infinity,maxGap=-Infinity,wrongClaims=0;
 for(let k=0;k<Math.round(20/step);k++){g.state.time+=step*.8;g.advanceVehicles(step/g.state.speed,step*.8);const gap=g.motionDistance(front)-g.motionDistance(back);minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);for(const v of [front,back])if(v.occKey&&g.state.occ.get(v.occKey)!==v.id)wrongClaims++;}
 assert(g.state.vehicles.has(front.id)&&g.state.vehicles.has(back.id));assert.equal(wrongClaims,0);assert(minGap>=1-1e-8);assert(!g.capsulesOverlap(g.vehiclePosition(front),g.vehiclePosition(back)));
 following.push({step,tech,idsSwapped,frontFirst,gameMinutes:16,front:g.motionDistance(front),back:g.motionDistance(back),gap:g.motionDistance(front)-g.motionDistance(back),minGap,maxGap,wrongClaims});
}
for(const a of following)for(const b of following)if(a.step===b.step&&a.tech===b.tech){assert(Math.abs(a.front-b.front)<1e-8);assert(Math.abs(a.back-b.back)<1e-8);}
console.log(JSON.stringify({source:process.env.SMCITY_SOURCE,passed:true,heading,following},null,2));
