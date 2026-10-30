'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game:g,install}=new Function('require',fixture+'return {game,install};')(require);
function scene(blockBeyond){
 const points=[];
 for(let x=170;x>=164;x--)points.push([x,136]);
 for(let y=135;y>=125;y--)points.push([164,y]);
 const v=install(points,i=>i<6?'small':'medium',false,0),st=g.state;
 const center=g.id(164,136),spur=g.id(164,137);
 st.roads.set(spur,{type:'medium',main:false,links:new Set([center]),load:0,wait:0});
 st.roads.get(center).links.add(spur);
 st.junctionCache.clear();st.junctionLayoutCache?.clear();st.version++;
 const plan=g.motionPlan(v),guard=plan.junctions.find(t=>t.node===center);
 assert(guard,'must be a three-arm signalized right turn');
 const incoming=g.dir(points[4]&&g.id(...points[4]),g.id(...points[5]));
 const slot=g.signalSlots(center).findIndex(x=>x.incoming===incoming);
 assert(slot>=0,'incoming approach not present');
 const slots=g.signalSlots(center);
 st.signals.set(center,{mode:'manual',phaseModel:'approach',slot,axis:slots[slot].axis,eastWest:6,northSouth:6,holdUntil:0});
 assert(g.signalAllows(center,incoming,0),'approach must be green for regression');
 let k=0;while(k+1<plan.nodes.length&&plan.nodes[k+1]<guard.stop-1e-8)k++;
 v.pos=k;v.progress=(guard.stop-plan.nodes[k])/(plan.nodes[k+1]-plan.nodes[k]);
 v.wait=30;v.noUTurnPolicy=1;v.toGate=v.path.at(-1);v.lastMovedAt=st.time;
 const obstacle=g.positionOnMotion(plan,Math.min(plan.total,guard.clear+blockBeyond));
 const b={...v,id:901,phase:'stuck',pos:0,progress:0,wait:0,speed:0,stopReason:'no-route',
  heldPose:obstacle,lastMovedAt:st.time,recoveryVersion:st.version,nextRouteRetry:st.time+999,
  noUTurnPolicy:1,junctionPasses:[],junctionQueueSince:{},toGate:v.path.at(-1)};
 st.vehicles.set(b.id,b);
 st.occ.clear();v.lane=g.plannedLane(v,v.pos);
 v.occKey=`${v.path[v.pos]}:${g.dir(v.path[v.pos],v.path[v.pos+1])}:${v.lane}`;
 st.occ.set(v.occKey,v.id);
 return {v,b,guard,plan,st};
}
{
 const {v,b,guard,plan,st}=scene(1.25);
 assert(g.capsulesOverlap(g.positionOnMotion(plan,guard.clear+1.05),b.heldPose),
  'legacy 1.05 sample rejects this clearable turn');
 for(const d of [.12,.35])assert(!g.capsulesOverlap(g.positionOnMotion(plan,guard.clear+d),b.heldPose),
  'safe clearance buffer must be free');
 const start=g.motionDistance(v);
 for(let i=0;i<200;i++){
  st.time+=.032;g.advanceVehicles(.016,.032);
  if(st.vehicles.has(v.id))assert(!g.capsulesOverlap(g.vehiclePosition(v),b.heldPose),
   'physical body spacing must never be bypassed');
 }
 assert(g.motionDistance(v)>guard.stop+.5,'right turn must progress despite a stopped car farther down the exit');
 assert(st.vehicles.has(b.id)&&b.phase==='stuck','downstream blocker remains untouched');
}
{
 const {v,b,guard,plan,st}=scene(.25);
 assert(g.capsulesOverlap(g.positionOnMotion(plan,guard.clear+.12),b.heldPose),
  'near obstacle occupies required junction clearance');
 for(let i=0;i<30;i++){st.time+=.032;g.advanceVehicles(.016,.032);}
 assert(g.motionDistance(v)<=guard.stop+1e-5,'an unsafe turn must remain stopped outside the junction');
 assert(!v.junctionPasses?.length,'no junction lease over a real near obstacle');
}
console.log('PASS: far stopped car no longer starves a right turn; near obstacle blocks; live body collision remains enforced');
