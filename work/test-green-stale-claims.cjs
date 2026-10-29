// Regression: a visually clear green exit must not be blocked by a lease
// from a car that still exists but no longer occupies this junction.
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game,install,turnPath}=new Function('require',prefix+'return {game,install,turnPath};')(require);
let cases=0;
for(const roadType of ['small','medium','large']){
 const v=install(turnPath(-1),roadType,true);
 const plan=game.motionPlan(v),g=plan.junctions[0],node=g.node;
 assert(g&&g.pos>=1,'signalized turn is required');
 const s=g.stop-.09;let k=0;
 while(k+1<plan.nodes.length&&plan.nodes[k+1]<=s)k++;
 if(v.occKey)game.state.occ.delete(v.occKey);
 v.pos=k;v.progress=(s-plan.nodes[k])/Math.max(1e-9,(plan.nodes[k+1]??plan.nodes[k])-plan.nodes[k]);
 v.lane=game.plannedLane(v,k);v.occKey=null;v.wait=10;
 const incoming=game.dir(v.path[g.pos-1],node);
 let green=false;
 for(let i=0;i<180;i++){game.state.time+=.25;if(game.signalAllows(node,incoming)){green=true;break;}}
 assert(green,'green signal must occur');
 game.prepareJunctionQueues();
 assert.equal(game.intersectionAllowed(v,g.pos),true,'empty junction must permit green departure: '+roadType);
 const holder={...v,id:991,pos:g.pos,progress:0,wait:0,occKey:null,junctionPasses:[],turnLanes:{...v.turnLanes}};
 game.state.vehicles.set(holder.id,holder);
 game.reserveIntersection(holder,g.pos);
 assert.equal(game.intersectionAllowed(v,g.pos),false,'active lease must remain protected: '+roadType);
 // Simulate a live owner already beyond the exit which retained an obsolete
 // pass in its array. Position, not the stale flag, must decide validity.
 holder.pos=v.path.length-2;holder.progress=.85;
 assert(holder.junctionPasses.length,'stale owner still carries a pass');
 game.state.time+=1;
 assert.equal(game.intersectionAllowed(v,g.pos),true,'stale live-owner lease must not block: '+roadType);
 assert.equal(game.state.reservations.has('junction:'+node),false,'stale intersection lease removed');
 // Same failure mode for the tile occupancy map.
 const key=node+':'+game.dir(v.path[g.pos],v.path[g.pos+1])+':'+game.plannedLane(v,g.pos);
 game.state.occ.set(key,holder.id);game.state.time+=1;
 assert.equal(game.intersectionAllowed(v,g.pos),true,'stale live-owner occupancy must not block: '+roadType);
 assert.equal(game.state.occ.has(key),false,'stale tile occupancy removed');
 // A real vehicle at the intersection must never be deleted.
 const live={...holder,id:992,pos:g.pos,progress:0,junctionPasses:[]};
 game.state.vehicles.set(live.id,live);
 game.state.occ.set(key,live.id);game.state.time+=1;
 assert.equal(game.intersectionAllowed(v,g.pos),false,'physical occupant remains protected: '+roadType);
 assert.equal(game.state.occ.get(key),live.id,'real occupant preserved');
 cases++;
}
console.log(JSON.stringify({passed:true,roadTypes:cases,staleLiveLease:true,staleLiveOccupancy:true,physicalOccupantProtected:true}));
