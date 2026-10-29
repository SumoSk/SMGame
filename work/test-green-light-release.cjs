// SMCITY 4.4.6 — a green signal has exactly one veto: a truly full
// outgoing LANE for the chosen route. Queue, stale claims and
// competing intersection leases are not green-light blockers.
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game,install,turnPath}=new Function('require',prefix+'return {game,install,turnPath};')(require);
function test(type){
 const v=install(turnPath(-1),type,true),plan=game.motionPlan(v),g=plan.junctions[0],node=g.node;
 assert(g&&g.pos>=1,'signalized intersection required');
 const desired=g.stop-.09;
 let k=0;
 while(k+1<plan.nodes.length&&plan.nodes[k+1]<=desired)k++;
 if(v.occKey)game.state.occ.delete(v.occKey);
 v.pos=k;v.progress=(desired-plan.nodes[k])/Math.max(1e-9,(plan.nodes[k+1]??plan.nodes[k])-plan.nodes[k]);
 v.lane=game.plannedLane(v,k);v.occKey=null;
 const heading=game.dir(v.path[g.pos-1],node);
 function setSignal(green){
  for(let n=0;n<250;n++){game.state.time+=.25;if(game.signalAllows(node,heading)===green)return;}
  throw Error('signal not in requested state');
 }
 setSignal(true);game.prepareJunctionQueues();
 const own=game.state.junctionQueues.get(node)?.find(q=>q.id===v.id);
 assert(own,'car should be queued on green');
 const ghost={...v,id:991,phase:'delivery_unload',delivery:{until:Infinity},junctionPasses:[],turnLanes:{...v.turnLanes}};
 game.state.vehicles.set(ghost.id,ghost);
 game.state.junctionQueues.set(node,[{...own,id:ghost.id,distance:own.distance-.2,at:own.at-8},own]);
 v.wait=0;
 assert.equal(game.intersectionAllowed(v,g.pos),true,'green must bypass leader and priority queue');
 const reservation={id:992,pos:g.pos,until:game.state.time+30};
 game.state.reservations.set('junction:'+node,{id:992,passes:[reservation],until:reservation.until});
 assert.equal(game.intersectionAllowed(v,g.pos),true,'green must ignore opposing junction reservation');
 game.state.reservations.delete('junction:'+node);
 // Other lanes can be full; the target lane determines admission.
 const out=v.path[g.pos+1],direction=game.dir(v.path[g.pos],out);
 const capacity=game.ROADS[type].lanes/2,target=game.plannedLane(v,g.pos+1);
 const others=[];
 for(let lane=0;lane<capacity;lane++){
  if(lane===target)continue;
  const id=997+lane;
  game.state.vehicles.set(id,{...v,id,phase:'driving',pos:g.pos+1,progress:0,occKey:null});
  game.state.occ.set(out+':'+direction+':'+lane,id);
  others.push({id,lane});
 }
 assert.equal(game.intersectionAllowed(v,g.pos),true,'full adjacent lane must never block a free destination lane');
 // A car occupying exactly the assigned target lane must stop green release.
 const occupiedId=997+target;
 game.state.vehicles.set(occupiedId,{...v,id:occupiedId,phase:'driving',pos:g.pos+1,progress:0,occKey:null});
 game.state.occ.set(out+':'+direction+':'+target,occupiedId);
 assert.equal(game.intersectionAllowed(v,g.pos),false,'occupied target lane must stop green release even when other lanes are free');
 game.reserveIntersection(v,g.pos);
 assert.equal(game.intersectionAllowed(v,g.pos),false,'already granted junction pass cannot override a full target lane');
 game.state.occ.delete(out+':'+direction+':'+target);
 game.state.vehicles.delete(occupiedId);
 assert.equal(game.intersectionAllowed(v,g.pos),true,'target lane open: green resumes despite neighboring full lanes');
 for(const other of others){
  game.state.occ.delete(out+':'+direction+':'+other.lane);
  game.state.vehicles.delete(other.id);
 }
 game.release(v);
 setSignal(false);assert.equal(game.intersectionAllowed(v,g.pos),false,'red still blocks new entries');
 setSignal(true);game.state.vehicles.delete(ghost.id);
 const start=game.motionDistance(v);
 for(let n=0;n<16;n++)game.advanceVehicles(.016,.032);
 assert(game.motionDistance(v)>start+1e-5,'free green car must move');
 return type;
}
const passed=['small','medium','large'].map(test);
console.log(JSON.stringify({version:'4.4.6',passed:true,roadTypes:passed,soleGreenVeto:'occupied assigned outbound lane'}));
