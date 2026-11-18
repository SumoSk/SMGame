'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const candidatePath=process.env.SMCITY_SOURCE||path.resolve(__dirname,'../../dist/game.js');
process.env.SMCITY_SOURCE=candidatePath;
const {queueFunctions:exactOldQueueFunctions}=require('./oracles/v603-queue-oracle.cjs');
const {boot}=require('./audit-harness.cjs');
const extra='queueVehicleApproaches,removeVehicleApproaches,queueHeadBlocker,queueIndex,junctionPriority,ownsJunctionPass,motionPlans,roadEditAnchors,'+
 'queueMembership:v=>junctionQueueMembership.get(v),reference:(()=>{'+exactOldQueueFunctions+
 'return {prepareJunctionQueues,removeVehicleApproaches,queueVehicleApproaches,membership:v=>junctionQueueMembership.get(v)};})(),'+
 'queueWorkProbe:(()=>{const original=ownsJunctionPass;let calls=0;ownsJunctionPass=(...args)=>{calls++;return original(...args)};return {reset(){calls=0},get calls(){return calls}};})()';
const current=boot(extra).game,reference=boot(extra).game;
function api(g){return g===reference?g.reference:{prepareJunctionQueues:g.prepareJunctionQueues,removeVehicleApproaches:g.removeVehicleApproaches,queueVehicleApproaches:g.queueVehicleApproaches,membership:g.queueMembership};}
const plain=value=>JSON.parse(JSON.stringify(value));
const result={candidate:candidatePath,reference:'exact baseline function source injected into candidate lexical scope',checkpoints:0,scenarios:[]};
function request(g,q){return {id:q.id,pos:q.pos,path:[...q.path],pathIsLive:g.state.vehicles.get(q.id)?.path===q.path,
 at:q.at,distance:q.distance,connector:q.connector&&{node:q.connector.node,incoming:q.connector.incoming,outgoing:q.connector.outgoing,
 laneIn:q.connector.laneIn,laneOut:q.connector.laneOut,turn:q.connector.turn,samples:q.connector.samples}};}
function snapshot(g){const s=g.state;return plain({time:s.time,version:s.version,
 queues:[...(s.junctionQueues||[])].map(([key,q])=>[key,{requests:q.map(x=>request(g,x)),index:q._index?{
 fronts:[...q._index.fronts],byId:[...q._index.byId].map(([key,value])=>[key,request(g,value)])}:q._index===null?null:'unset'}]),
 cars:[...s.vehicles.values()].map(v=>({id:v.id,path:[...(v.path||[])],pos:v.pos,progress:v.progress,phase:v.phase,
 sincePresent:Object.hasOwn(v,'junctionQueueSince'),since:v.junctionQueueSince,passes:v.junctionPasses,
 membership:(api(g).membership(v)||[]).map(({key,request:q})=>({key,request:request(g,q),queueIndex:s.junctionQueues?.get(key)?.indexOf(q)??-1})),
 denial:v.lastJunctionDenial,queueDenial:v.lastQueueDenial})),
 signals:[...s.signals],occ:[...s.occ],reservations:[...s.reservations]});}
function both(label,action){const a=action(current),b=action(reference);assert.deepEqual(plain(a??null),plain(b??null),label+' return');assert.deepEqual(snapshot(current),snapshot(reference),label);result.checkpoints++;return a;}
function reset(g){const s=g.state;s.roads.clear();s.vehicles.clear();s.buildings.clear();s.occ.clear();s.reservations.clear();s.signals.clear();s.junctionCache.clear();s.junctionLayoutCache?.clear();s.signalSlotCache?.clear();s.signalDefaults={eastWest:6,northSouth:6};s.version++;s.time=400;api(g).prepareJunctionQueues();}
function add(g,x,y,type='large'){const n=g.id(x,y);if(!g.state.roads.has(n))g.state.roads.set(n,{type,main:false,links:new Set(),load:0,wait:0});return n;}
function link(g,a,b){g.state.roads.get(a).links.add(b);g.state.roads.get(b).links.add(a);}
function line(g,x,y,dx,dy,length,type='large'){const nodes=[];for(let k=0;k<length;k++){const n=add(g,x+dx*k,y+dy*k,type);if(nodes.length)link(g,nodes.at(-1),n);nodes.push(n);}return nodes;}
function install(g,dense=false){reset(g);line(g,110,150,1,0,41);line(g,125,138,0,1,25);if(dense)line(g,128,138,0,1,25);}
function car(g,id,points,extra={}){const v={id,path:points,pathSet:new Set(points),phase:'driving',pos:0,progress:0,lane:0,laneSeed:0,wait:0,speed:0,kind:'pass',noUTurnPolicy:1,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{},routeCheckedVersion:g.state.version,...extra};g.state.vehicles.set(id,v);v.lane=g.plannedLane(v,0);return v;}
function straight(g,reverse=false){return Array.from({length:41},(_,i)=>g.id(reverse?150-i:110+i,150));}
function vertical(g,reverse=false,x=125){return Array.from({length:25},(_,i)=>g.id(x,reverse?162-i:138+i));}
function turn(g,up=false){return [...Array.from({length:16},(_,i)=>g.id(110+i,150)),...Array.from({length:12},(_,i)=>g.id(125,150+(up?-1:1)*(i+1)))];}
function locate(g,v,s){const p=g.motionPlan(v);let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=s)i++;v.pos=i;v.progress=(s-p.nodes[i])/Math.max(1e-9,(p.nodes[i+1]??p.nodes[i])-p.nodes[i]);}
function guard(g,v,index=0){return g.motionPlan(v).junctions[index];}
function signal(g,node,incoming){const slots=g.signalSlots(node),slot=slots.findIndex(x=>x.incoming===incoming);assert(slot>=0);g.state.signals.set(node,{mode:'manual',slot,axis:slots[slot].axis,eastWest:6,northSouth:6,holdUntil:0,phaseModel:'approach'});assert(g.signalAllows(node,incoming));}
function queue(g,id){api(g).queueVehicleApproaches(g.state.vehicles.get(id));}
function prepare(g){api(g).prepareJunctionQueues();}
function indexQueues(g){for(const q of g.state.junctionQueues.values())g.queueIndex(q);}
function decisions(g){const out=[];for(const v of g.state.vehicles.values())for(const j of g.motionPlan(v).junctions){const c=g.junctionConnector(v,j.pos);out.push({id:v.id,pos:j.pos,head:g.queueHeadBlocker(v,j.pos,c),allows:g.queueAllows(v,j.pos,c),priority:g.junctionPriority({at:v.junctionQueueSince?.[j.pos+':'+j.node]??g.state.time,connector:c},j.node),intersection:g.intersectionAllowed(v,j.pos)});}return plain(out);}

both('initial real-road setup',g=>{install(g);const v=car(g,11,straight(g));signal(g,guard(g,v).node,0);});
both('far approach allocates no request and deletes obsolete since',g=>{const v=g.state.vehicles.get(11);v.junctionQueueSince.obsolete=10;queue(g,11);});
for(const offset of [-2.500001,-2.5,-2.499999,-.001,0,.001]){
 both('stop distance boundary '+offset,g=>{const v=g.state.vehicles.get(11),j=guard(g,v);g.state.time+=1;locate(g,v,j.stop+offset);queue(g,11);});
 both('index at stop boundary '+offset,indexQueues);
}
for(const offset of [-.000001,0,.000001]){
 both('entry boundary '+offset,g=>{const v=g.state.vehicles.get(11),j=guard(g,v);g.state.time+=1;locate(g,v,j.entry+offset);queue(g,11);});
}
result.scenarios.push('real generated geometry at 2.5 registration distance and exact entry boundary; waiting-age cleanup and queue-index invalidation');

both('red, green, air and several lane requests',g=>{install(g);const a=car(g,10,straight(g)),b=car(g,20,straight(g)),c=car(g,30,vertical(g)),d=car(g,40,straight(g),{vehicleTech:'fly'});for(const [v,delta]of [[a,-.3],[b,-1],[c,-.2],[d,-.4]])locate(g,v,guard(g,v).stop+delta);signal(g,guard(g,a).node,0);prepare(g);});
both('arbitration and first lane blocker match',decisions);
both('repeat queue moves own request behind peers',g=>{g.state.time+=2;queue(g,10);indexQueues(g);queue(g,20);});
both('red preserves since while removing request',g=>{const v=g.state.vehicles.get(10);signal(g,guard(g,v).node,1);g.state.time+=3;queue(g,10);queue(g,20);queue(g,30);queue(g,40);});
assert(Object.keys(current.state.vehicles.get(10).junctionQueueSince).length>0);
assert(![...current.state.junctionQueues.values()].flat().some(q=>q.id===10));
both('green restores original since; air queue remains separate',g=>{const v=g.state.vehicles.get(10);signal(g,guard(g,v).node,0);g.state.time+=20;queue(g,10);queue(g,20);queue(g,30);queue(g,40);});
both('oldest-first priority and all admission outputs',decisions);
result.scenarios.push('red-to-green transitions retain exact since values; air/ground queues; lane heads, stale indexes, repeated direct calls, oldest-first priority');

both('dense real junctions and multiple memberships',g=>{install(g,true);const a=car(g,3,straight(g)),b=car(g,2,turn(g)),c=car(g,1,turn(g,true));for(const v of [a,b,c]){const p=g.motionPlan(v);for(const j of p.junctions)signal(g,j.node,0);locate(g,v,p.junctions[0].entry-.000001);}prepare(g);indexQueues(g);});
both('partial removal leaves exact other membership and cached index state',g=>{const v=g.state.vehicles.get(3);api(g).removeVehicleApproaches(v,guard(g,v).pos);});
both('partial no-match removal',g=>{api(g).removeVehicleApproaches(g.state.vehicles.get(3),-100);});
both('full remove and restore request order',g=>{const v=g.state.vehicles.get(3);api(g).removeVehicleApproaches(v);api(g).queueVehicleApproaches(v);});
both('live lease adds/removes own membership exactly',g=>{const v=g.state.vehicles.get(3),j=guard(g,v);v.junctionPasses.push({pos:j.pos,node:j.node});queue(g,3);g.state.reservations.set('junction:'+j.node,{id:3,pos:j.pos,until:g.state.time+30});});
both('ownership cleanup and release requeues without keeping old age',g=>{const v=g.state.vehicles.get(3);v.junctionPasses=[];g.state.reservations.clear();g.state.time+=7;queue(g,3);});
both('foreign owners still deny live admissions',g=>{const v=g.state.vehicles.get(3),j=guard(g,v);g.state.occ.set(g.id(126,150)+':0:0',999);g.state.reservations.set(g.id(127,150)+':0:0',{id:999,until:g.state.time+10});return decisions(g);});
result.scenarios.push('nearby junctions and turns; partial/full/no-match removal; live pass and foreign occupancy/reservation changes; exact request order');

both('phase exit removes membership and retains since as original',g=>{const v=g.state.vehicles.get(3);v.phase='parking_in';queue(g,3);});
both('phase entry refreshes memberships',g=>{g.state.vehicles.get(3).phase='driving';queue(g,3);});
both('same-id object replacement rejects the removed object',g=>{const old=g.state.vehicles.get(3),replacement={...old,path:[...old.path],junctionQueueSince:{}};g.state.vehicles.set(3,replacement);api(g).queueVehicleApproaches(old);api(g).queueVehicleApproaches(replacement);});
both('deleted object direct calls remove its stale requests',g=>{const v=g.state.vehicles.get(2);g.state.vehicles.delete(2);api(g).queueVehicleApproaches(v);api(g).removeVehicleApproaches(v);});
both('empty path direct call and reenter preserve original since semantics',g=>{const v=g.state.vehicles.get(3);v.path=[];queue(g,3);});
both('path replacement builds a fresh plan and retires old since keys',g=>{const v=g.state.vehicles.get(3);v.path=vertical(g,true);v.pos=0;v.progress=0;g.state.time+=5;const j=guard(g,v);signal(g,j.node,3);locate(g,v,j.stop-.2);queue(g,3);});
both('in-place path mutation is observed identically to baseline',g=>{const v=g.state.vehicles.get(3),j=guard(g,v);v.path[j.pos]=g.id(128,150);queue(g,3);});
both('road-version rebuild invalidates geometry as original',g=>{const v=g.state.vehicles.get(3);v.path=straight(g);g.state.version++;v.pos=13;v.progress=.2;queue(g,3);});
both('prepare clears prior membership and rebuilds in vehicle insertion order',prepare);
result.scenarios.push('phase, identity replacement/removal, empty/replaced/in-place-mutated paths, road-version rebuild, and prepare reset');

both('empty-junction geometry cleans old since without replacing its object',g=>{install(g);const v=car(g,6,Array.from({length:7},(_,i)=>g.id(110+i,150)));assert.equal(g.motionPlan(v).junctions.length,0);v.junctionQueueSince={'old:node':12};const saved=v.junctionQueueSince;queue(g,6);assert.equal(v.junctionQueueSince,saved);assert.deepEqual(Object.keys(saved),[]);});
both('empty-junction geometry initializes absent and null since',g=>{const v=g.state.vehicles.get(6);delete v.junctionQueueSince;queue(g,6);assert(Object.hasOwn(v,'junctionQueueSince'));v.junctionQueueSince=null;queue(g,6);});
both('stale membership is removed before an empty-junction return',g=>{install(g);const v=car(g,7,straight(g)),j=guard(g,v);signal(g,j.node,0);locate(g,v,j.stop-.2);queue(g,7);indexQueues(g);const p=g.motionPlan(v);p.junctions.length=0;queue(g,7);assert.equal(g.state.junctionQueues.size,0);assert.deepEqual(Object.keys(v.junctionQueueSince),[]);});
result.scenarios.push('no junction plans initialize or clean since, preserve its object identity, and remove stale live queue memberships first');

both('deliberately mutable, unsorted plan scan retains source order',g=>{install(g,true);const v=car(g,8,straight(g)),p=g.motionPlan(v);locate(g,v,p.junctions[0].stop-.2);for(const j of p.junctions)signal(g,j.node,0);p.junctions[1].entry=p.junctions[0].entry+.1;p.junctions[1].stop=p.junctions[0].stop-.1;p.junctions.reverse();prepare(g);});
both('mutated geometry boundaries are live on every direct call',g=>{const v=g.state.vehicles.get(8),p=g.motionPlan(v);p.junctions[0].entry=0;p.junctions[1].stop=10000;g.state.time+=1;queue(g,8);});
both('mutated geometry restores age only for currently eligible keys',g=>{const v=g.state.vehicles.get(8),p=g.motionPlan(v);for(const j of p.junctions){j.entry=100;j.stop=0;}g.state.time+=1;queue(g,8);});
result.scenarios.push('mutated and deliberately unsorted live plan geometry has no bound/cache assumptions');

both('first qualifying priority blocker retains queue iteration order',g=>{install(g);for(const id of [9,8,2,10]){const v=car(g,id,straight(g)),j=guard(g,v);locate(g,v,j.stop-.2);signal(g,j.node,0);}prepare(g);const v=g.state.vehicles.get(10),j=guard(g,v);assert.equal(g.queueAllows(v,j.pos,g.junctionConnector(v,j.pos)),false);assert.equal(v.lastQueueDenial.blockerId,9);return decisions(g);});
result.scenarios.push('equal age/distance tie ordering and first qualifying priority blocker remain the original queue iteration order');

both('long real route with over 90 junctions and many live pass records',g=>{reset(g);line(g,0,150,1,0,300);const points=Array.from({length:280},(_,i)=>g.id(10+i,150));for(let x=12;x<288;x+=3)line(g,x,144,0,1,13);const v=car(g,900,points),p=g.motionPlan(v);assert(p.junctions.length>90);for(const j of p.junctions)signal(g,j.node,0);v.junctionPasses=p.junctions.filter((_,i)=>i%2===1).map(j=>({pos:j.pos,node:j.node}));prepare(g);});
for(const fraction of [0,.01,.1,.25,.5,.75,.9,.99,1])both('long route movement and ownership exclusions '+fraction,g=>{const v=g.state.vehicles.get(900),p=g.motionPlan(v);locate(g,v,p.total*fraction);g.state.time+=1;queue(g,900);indexQueues(g);});
both('long route geometry replacement invalidates prior request indexes',g=>{const v=g.state.vehicles.get(900);v.path=[...v.path].reverse();v.junctionPasses=[];v.pos=10;v.progress=.5;g.state.version++;const p=g.motionPlan(v);for(const j of p.junctions)signal(g,j.node,2);queue(g,900);});
result.scenarios.push('long generated route with 92 junctions, many live passes, start-to-end movement, and version/path replacement');
result.workCounts={};
for(const [name,g]of [['candidate',current],['baseline',reference]]){const v=g.state.vehicles.get(900),p=g.motionPlan(v);locate(g,v,p.total*.5);g.queueWorkProbe.reset();queue(g,900);result.workCounts[name]={junctions:p.junctions.length,ownershipChecks:g.queueWorkProbe.calls};}
assert(result.workCounts.candidate.ownershipChecks<result.workCounts.baseline.ownershipChecks);
assert.deepEqual(snapshot(current),snapshot(reference),'work-count probe leaves identical live queue state');

// Small deterministic mutation sequence catches ordering/cleanup differences
// without advancing a city or running a performance workload.
let seed=603;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
both('mutation replay setup',g=>{install(g,true);for(let id=1;id<=8;id++){const v=car(g,id,id%3===0?vertical(g):id%3===1?straight(g):turn(g),{laneSeed:id%2});const j=guard(g,v);locate(g,v,j.stop-.1-id*.05);for(const j of g.motionPlan(v).junctions)signal(g,j.node,id%3===0?1:0);}prepare(g);});
for(let k=0;k<160;k++){
 const id=1+Math.floor(random()*8),op=Math.floor(random()*8),delta=random();
 both('deterministic mutation replay '+k,g=>{const v=g.state.vehicles.get(id),p=g.motionPlan(v),j=p.junctions[0];g.state.time+=.125;
  if(op===0){locate(g,v,j.stop-3+delta*4);queue(g,id);}
  else if(op===1){signal(g,j.node,Math.floor(delta*4));queue(g,id);}
  else if(op===2){v.junctionPasses=v.junctionPasses.length?[]:[{node:j.node,pos:j.pos}];queue(g,id);}
  else if(op===3){api(g).removeVehicleApproaches(v,delta<.5?j.pos:-1);}
  else if(op===4){v.phase=v.phase==='driving'?'parking_in':'driving';queue(g,id);}
  else if(op===5){indexQueues(g);queue(g,id);}
  else if(op===6){prepare(g);}
  else {queue(g,id);return decisions(g);}
 });
}
result.scenarios.push('160 deterministic mutations combining movement, signals, owners, phases, removals, rebuilds, cached indexes, and live admission decisions');
result.passed=true;
console.log(JSON.stringify(result,null,2));
