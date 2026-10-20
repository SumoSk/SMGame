const fs=require('node:fs');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const cases=`
function addCar(base,path,seed,id){const v={...base,id,trafficModel:2,path:[...path],pathSet:new Set(path),turnLanes:undefined,turnLaneVersion:undefined,laneSeed:seed,pos:0,progress:0,speed:0,wait:0,junctionPasses:[],junctionQueueSince:{}};game.state.vehicles.set(id,v);v.lane=game.plannedLane(v,0);v.occKey=v.path[0]+':'+game.dir(v.path[0],v.path[1])+':'+v.lane;game.state.occ.set(v.occKey,id);return v;}
function locate(v,s){const p=game.motionPlan(v);let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=s)i++;if(v.occKey)game.state.occ.delete(v.occKey);v.pos=i;v.progress=(s-p.nodes[i])/Math.max(1e-9,(p.nodes[i+1]??p.nodes[i])-p.nodes[i]);v.lane=p.lanes[i];v.occKey=v.path[i]+':'+game.dir(v.path[i],v.path[Math.min(i+1,v.path.length-1)])+':'+v.lane;game.state.occ.set(v.occKey,v.id);}
for(const sign of [-1,1]){
 const first=install(turnPath(sign),i=>i<=8?'large':'medium',true);
 const second=addCar(first,first.path,0,901),a=game.motionPlan(first),b=game.motionPlan(second);
 assert.notEqual(a.lanes[7],b.lanes[7],'choose the less queued turn lane');assert.notEqual(a.lanes[11],b.lanes[11],'distinct target lanes');
 const ca=game.junctionConnector(first,8),cb=game.junctionConnector(second,8);
 assert(!game.connectorsConflict(ca,cb),'paired turn lanes must not cross');
 phase(game.id(150,150),0);game.reserveIntersection(first,8);assert(game.intersectionAllowed(second,8),'second safe lane can enter occupied junction');game.release(first);game.reserveIntersection(second,8);assert.equal(game.state.reservations.get('junction:'+game.id(150,150)).passes.length,1);game.release(second);
 let parallel=false;
 for(let k=0;k<2400&&game.state.vehicles.size;k++){game.advanceVehicles(.016,.032);const active=[...game.state.vehicles.values()];if(active.length===2){assert(!game.capsulesOverlap(game.vehiclePosition(active[0]),game.vehiclePosition(active[1])),'no overlapping cars');if(active.every(v=>v.junctionPasses?.length))parallel=true;}}
 assert(parallel,'two turn lanes must actually move through the junction together');assert.equal(game.state.vehicles.size,0,'both lanes must clear');
}
// U-turns use the median lane for every initial seed.
for(let seed=0;seed<4;seed++){const base=install([[146,150],[147,150],[148,150],[149,150],[150,150],[149,150],[148,150],[147,150],[146,150]],'large',true);const v=addCar(base,base.path,seed,1000+seed),p=game.motionPlan(v);assert.equal(p.lanes[3],0);assert.equal(p.lanes[5],0);}
// Opposing straight traffic can coexist; perpendicular traffic cannot.
{
 const path=Array.from({length:17},(_,i)=>[142+i,150]),first=install(path,'large',true),opposite=addCar(first,[...first.path].reverse(),0,901),crossing=addCar(first,Array.from({length:17},(_,i)=>game.id(150,142+i)),0,902);
 const a=game.junctionConnector(first,8),b=game.junctionConnector(opposite,8),c=game.junctionConnector(crossing,8);assert(!game.connectorsConflict(a,b));assert(game.connectorsConflict(a,c));phase(game.id(150,150),0);game.reserveIntersection(first,8);assert(game.intersectionAllowed(opposite,8));assert(!game.intersectionAllowed(crossing,8));
}
// Right turn yields to an opposing straight car, regardless of creation order.
{
 const right=install(turnPath(1),'large',true),straight=addCar(right,Array.from({length:17},(_,i)=>game.id(158-i,150)),0,901);for(const v of [right,straight])locate(v,game.motionPlan(v).junctions[0].stop-.05);
 phase(game.id(150,150),0);game.prepareJunctionQueues();assert(!game.intersectionAllowed(right,8));assert(game.intersectionAllowed(straight,8));
}
// Arrival order overrides insertion order for conflicting equal-priority movements.
{
 const first=install(turnPath(1),'large',true),second={...first,id:901,path:[...first.path],turnLanes:{...first.turnLanes},junctionQueueSince:{}};game.state.vehicles.set(second.id,second);for(const v of [first,second])locate(v,game.motionPlan(v).junctions[0].stop-.05);phase(game.id(150,150),0);const key='8:'+game.id(150,150);first.junctionQueueSince={[key]:game.state.time};second.junctionQueueSince={[key]:game.state.time-1};game.prepareJunctionQueues();assert(!game.intersectionAllowed(first,8));assert(game.intersectionAllowed(second,8));
}
console.log(JSON.stringify({passed:true,coverage:['queue-aware paired turn lanes','parallel turns and physical clearance','U-turn median lane','opposing straight concurrency','crossing path exclusion','right turn yields','arrival order over insertion order']}));
`;
new Function('require',fixture+cases)(require);
