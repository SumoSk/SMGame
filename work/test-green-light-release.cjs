// SMCITY 4.4.5 — green means a queued car may attempt to depart,
// but never bypasses a real reservation, red light or a blocked exit.
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game,install,turnPath}=new Function('require',prefix+'return {game,install,turnPath,phase};')(require);
const v=install(turnPath(-1),'large',true);
const plan=game.motionPlan(v),g=plan.junctions[0],node=g.node;
assert(g&&g.pos>=1,'a real signalized junction must exist');
function locate(car,distance){
 const p=game.motionPlan(car);let pos=0;
 while(pos+1<p.nodes.length&&p.nodes[pos+1]<=distance)pos++;
 if(car.occKey)game.state.occ.delete(car.occKey);
 car.pos=pos;car.progress=(distance-p.nodes[pos])/Math.max(1e-9,(p.nodes[pos+1]??p.nodes[pos])-p.nodes[pos]);
 car.lane=game.plannedLane(car,pos);car.occKey=null;
}
locate(v,g.stop-.09);
const incoming=game.dir(v.path[g.pos-1],node);
function setSignal(green){
 for(let k=0;k<160;k++){
  game.state.time+=.25;
  if(game.signalAllows(node,incoming)===green)return;
 }
 throw Error('signal did not enter requested color');
}
setSignal(true);
game.prepareJunctionQueues();
const current=game.state.junctionQueues.get(node).find(r=>r.id===v.id);
assert(current,'vehicle is registered at the stop line');
// This synthetic stale queue entry has no physical vehicle on the road.
// A stale ordering decision must never pin an old red-light waiter indefinitely.
const ghost={...v,id:991,phase:'delivery_unload',delivery:{until:Infinity},junctionPasses:[],turnLanes:{...v.turnLanes}};
game.state.vehicles.set(ghost.id,ghost);
game.state.junctionQueues.set(node,[{...current,id:ghost.id,distance:current.distance-.2,at:current.at-8},current]);
v.wait=0;
assert.equal(game.intersectionAllowed(v,g.pos),false,'normal queue head ordering still applies');
v.wait=10;
assert.equal(game.intersectionAllowed(v,g.pos),true,'long red-light wait does not inherit stale green queue denial');
const holder={...v,id:992,phase:'driving',junctionPasses:[],turnLanes:{...v.turnLanes}};
game.state.vehicles.set(holder.id,holder);
game.reserveIntersection(holder,g.pos);
assert.equal(game.intersectionAllowed(v,g.pos),false,'green priority cannot overtake a live conflicting intersection pass');
game.release(holder);game.state.vehicles.delete(holder.id);
const out=g.pos;
const key=v.path[out]+':'+game.dir(v.path[out],v.path[out+1])+':'+game.plannedLane(v,out);
game.state.occ.set(key,999);
assert.equal(game.intersectionAllowed(v,g.pos),false,'green priority cannot enter a claimed junction lane');
game.state.occ.delete(key);
setSignal(false);
assert.equal(game.intersectionAllowed(v,g.pos),false,'red remains binding after any amount of waiting');
setSignal(true);
game.state.vehicles.delete(ghost.id);
const start=game.motionDistance(v);
for(let k=0;k<12;k++)game.advanceVehicles(.016,.032);
assert(game.motionDistance(v)>start+1e-5,'previously stopped car starts moving during the green phase');
assert.notEqual(v.stopReason,'คิวแยก','unblocked green car must not remain in a queue');
console.log(JSON.stringify({passed:true,release:'green queued waiters',redSafe:true,conflictingPassSafe:true,claimedJunctionLaneSafe:true,movesOnGreen:true}));
