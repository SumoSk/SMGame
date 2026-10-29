// Regression: one-lane approaches should release on green when only distant
// downstream cells are occupied. Never enter a claimed first exit cell.
const fs=require('node:fs'),assert=require('node:assert/strict');
const setup=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game,install,turnPath}=new Function('require',setup+'return {game,install,turnPath};')(require);
const v=install(turnPath(-1),'small',true);
const st=game.state,plan=game.motionPlan(v),guard=plan.junctions[0],node=guard.node;
assert(guard&&st.roads.get(v.path[guard.pos+1]).type==='small');
const incoming=game.dir(v.path[guard.pos-1],node);
for(let n=0;n<200&&!game.signalAllows(node,incoming);n++)st.time+=.25;
assert(game.signalAllows(node,incoming),'fixture must use green');
const keyAt=(car,pos)=>car.path[pos]+':'+game.dir(car.path[pos],car.path[pos+1])+':'+game.plannedLane(car,pos);
function locate(car,at){
 const p=game.motionPlan(car);let k=0;while(k+1<p.nodes.length&&p.nodes[k+1]<=at)k++;
 if(car.occKey)st.occ.delete(car.occKey);
 car.pos=k;car.progress=(at-p.nodes[k])/Math.max(1e-9,(p.nodes[k+1]??p.nodes[k])-p.nodes[k]);
 car.lane=game.plannedLane(car,k);car.occKey=keyAt(car,k);st.occ.set(car.occKey,car.id);
}
locate(v,guard.stop);v.speed=0;v.wait=10;v.noUTurnPolicy=1;
const head={...v,id:991,path:[...v.path],pathSet:new Set(v.path),phase:'stuck',
 turnLanes:{},junctionPasses:[],junctionQueueSince:{},stopReason:'ไม่มีเส้นทาง',
 routeMissing:false,nextRouteRetry:st.time+999,lastMovedAt:st.time,noUTurnPolicy:1,occKey:null};
st.vehicles.set(head.id,head);
locate(head,plan.nodes[guard.pos+3]+.2);
head.heldPose=game.positionOnMotion(game.motionPlan(head),game.motionDistance(head));
assert.equal(game.intersectionAllowed(v,guard.pos),false,'legacy three-tile logical check denies distant occupancy outside simulation');
const initial=game.motionDistance(v);
for(let n=0;n<20;n++){st.time+=.032;game.advanceVehicles(.016,.032);}
const moved=game.motionDistance(v)-initial;
assert(moved>.001,'small-road car should start moving on green despite an occupied third downstream cell');
assert(!game.capsulesOverlap(game.vehiclePosition(v),game.vehiclePosition(head)),'moving vehicle must never overlap downstream traffic');
game.release(v);locate(v,guard.stop);v.speed=0;v.wait=10;
locate(head,plan.nodes[guard.pos+1]);head.heldPose=game.positionOnMotion(game.motionPlan(head),game.motionDistance(head));
const blockedAt=game.motionDistance(v);
for(let n=0;n<10;n++){st.time+=.032;game.advanceVehicles(.016,.032);}
assert(Math.abs(game.motionDistance(v)-blockedAt)<1e-7,'immediate downstream lane occupancy must still prevent unsafe departure');
console.log(JSON.stringify({passed:true,smallGreenMoved:moved,nearExitProtected:true}));
