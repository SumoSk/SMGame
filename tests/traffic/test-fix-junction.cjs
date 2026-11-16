'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE ||=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
const {game:g}=boot('installAISignal,processTrafficDeadlocks,trafficWaits,trafficCycleSince');
function cross(arms=[0,1,2,3]){
 const s=g.state;s.roads.clear();s.vehicles.clear();s.occ.clear();s.reservations.clear();s.signals.clear();s.signalDefaults={eastWest:6,northSouth:6};s.junctionCache.clear();s.junctionLayoutCache?.clear();s.signalSlotCache?.clear();s.version++;
 const n=g.id(150,150);s.roads.set(n,{type:'large',main:false,links:new Set(),load:0,wait:0});
 for(const d of arms){let p=n;for(let k=1;k<=12;k++){const v=[[1,0],[0,1],[-1,0],[0,-1]][d],next=g.id(150+v[0]*k,150+v[1]*k);s.roads.set(next,{type:'large',main:false,links:new Set([p]),load:0,wait:0});s.roads.get(p).links.add(next);p=next;}}
 return n;
}
function car(id,points){const v={id,path:points,pathSet:new Set(points),phase:'driving',pos:0,progress:0,wait:0,speed:0,kind:'pass',noUTurnPolicy:1,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{},routeCheckedVersion:g.state.version};g.state.vehicles.set(id,v);v.lane=g.plannedLane(v,0);return v;}
function locate(v,distance){const p=g.motionPlan(v);let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=distance)i++;v.pos=i;v.progress=(distance-p.nodes[i])/Math.max(1e-9,(p.nodes[i+1]??p.nodes[i])-p.nodes[i]);v.lane=g.plannedLane(v,i);}
const result={source:process.env.SMCITY_SOURCE,passed:[]};
{
 const n=cross();g.state.time=360;const before=g.signalStatus(n);assert(before.phase>=0&&!before.yellow);
 assert(g.editSignal(n,{eastWest:11,northSouth:11}));assert.equal(g.signalStatus(n).phase,-1);assert.equal(g.signalSettings(n).holdUntil,361);
 g.state.time=360.99;assert.equal(g.signalStatus(n).phase,-1);g.state.time=361;assert(g.signalStatus(n).phase>=0);
 g.editSignal(n,{eastWest:11,northSouth:11});assert.equal(g.signalSettings(n).holdUntil,361,'unchanged durations must not add another pause');
 g.state.signals.get(n).holdUntil=370;g.editSignal(n,{eastWest:12});assert.equal(g.signalSettings(n).holdUntil,370,'existing clearance must not be shortened');
 result.passed.push('single auto duration edit clears before a new approach and retains longer existing holds');
}
{
 const n=cross();g.state.time=400;assert(!g.state.signals.has(n));g.setSignalDefaults(11,11,true);assert.equal(g.signalStatus(n).phase,-1);assert.equal(g.signalSettings(n).holdUntil,401);
 g.state.time=401;assert(g.signalStatus(n).phase>=0);g.setSignalDefaults(11,11,true);assert.equal(g.signalSettings(n).holdUntil,401);
 g.controlSignal(n,'manual');g.state.time=402;const manual=g.signalStatus(n).incoming;g.setSignalDefaults(12,12,true);assert.equal(g.signalStatus(n).incoming,manual);assert.equal(g.signalStatus(n).yellow,false);
 const m=cross();g.state.time=500;g.installAISignal(m);const smart={...g.signalSettings(m)};g.setSignalDefaults(9,9,true);assert.equal(g.signalSettings(m).mode,'smart');assert.equal(g.signalSettings(m).smartUntil,smart.smartUntil);
 cross();g.state.time=600;const implicit=cross();g.setSignalDefaults(9,10,false);assert.equal(g.signalSettings(implicit).eastWest,6);assert.equal(g.signalSettings(implicit).northSouth,6);assert.equal(g.state.signalDefaults.eastWest,9);
 result.passed.push('global edits cover implicit signals, preserve manual/smart behavior and respect applyExisting=false');
}
{
 const n=cross();g.state.time=360;const owner=car(100,Array.from({length:25},(_,i)=>g.id(150,138+i))),waiter=car(101,Array.from({length:25},(_,i)=>g.id(138+i,150)));
 const a=g.motionPlan(owner).junctions.find(j=>j.node===n),b=g.motionPlan(waiter).junctions.find(j=>j.node===n);locate(owner,a.entry+.1);locate(waiter,b.stop-.01);
 assert.equal(g.signalStatus(n).incoming,1);assert(g.reserveIntersection(owner,a.pos));g.editSignal(n,{eastWest:11,northSouth:11});assert.equal(g.signalStatus(n).phase,-1);
 g.state.time=361;assert.equal(g.signalStatus(n).incoming,0);assert.equal(g.intersectionAllowed(waiter,b.pos),false);assert.equal(waiter.lastJunctionDenial.code,'conflicting_junction_lease');
 result.passed.push('live junction leases still protect an admitted car after duration edits');
}
{
 const n=cross();g.state.time=400;g.installAISignal(n);
 const ways=[Array.from({length:25},(_,i)=>g.id(138+i,150)),Array.from({length:25},(_,i)=>g.id(150,138+i)),Array.from({length:25},(_,i)=>g.id(162-i,150))];let vid=1;
 for(let d=0;d<3;d++)for(let k=0;k<(d===2?1:20);k++){const v=car(vid++,ways[d]);v.pos=8;v.wait=2;}
 const served={0:[],1:[],2:[]};let phase='clear',slot=-1,changedAt=400;
 for(let k=0;k<1600;k++){
  g.state.time=400+k*.7;g.smartSignalStep();const st=g.signalSettings(n),status=g.signalStatus(n);
  const colors=[0,1,2,3].map(d=>g.signalColor(n,d));assert(colors.filter(c=>c==='green').length<=1);
  if(st.smartPhase!==phase||st.smartSlot!==slot){
   const elapsed=g.state.time-changedAt;if(phase==='green')assert(elapsed>=5-1e-6&&elapsed<=18.7+1e-6);if(phase==='yellow'||phase==='clear')assert(elapsed>=1-1e-6);
   if(st.smartPhase==='green')served[status.incoming].push(g.state.time);
   phase=st.smartPhase;slot=st.smartSlot;changedAt=g.state.time;
  }
 }
 const gaps={};for(const d of [0,1,2]){assert(served[d].length>10,'every demanded approach must repeatedly receive green');const times=served[d];gaps[d]=Math.max(times[0]-400,...times.slice(1).map((t,i)=>t-times[i]));assert(gaps[d]<90,'maximum observed service interval must stay bounded');}
 result.fairness={minutes:1120,greenCounts:Object.fromEntries(Object.entries(served).map(([d,t])=>[d,t.length])),largestServiceIntervals:gaps};result.passed.push('sustained demand 20/20/1 gives every approach repeated green and preserves minimum/yellow/clear phases');
}
{
 const n=cross();for(let k=0;k<320;k++){g.state.time=360+k*.1;const colors=[0,1,2,3].map(d=>g.signalColor(n,d));assert(colors.filter(c=>c==='green').length<=1);for(let d=0;d<4;d++)for(let l=0;l<4;l++)assert.equal(g.signalColor(n,d,l),colors[d]);}
 result.passed.push('split-approach green still applies to all lanes with at most one approach green');
}
{
 const cycles={};
 for(const size of [2,31,32,33,40,5000]){
  cross();g.state.time=500;const cars=[];
  for(let k=0;k<size;k++){const v={id:k+1,path:[k,k+1],phase:'driving',pos:0,progress:0,wait:7,speed:0,lastMovedAt:490};g.state.vehicles.set(v.id,v);cars.push(v);}
  for(let k=0;k<size;k++){const v=cars[k],plan={nodes:[10,20],junctions:[{entry:0,clear:30}]};g.trafficWaits.set(v,{state:g.state,version:g.state.version,path:v.path,plan,distance:10,ownerId:cars[(k+1)%size].id,serial:0,at:500,reason:'เว้นระยะรถ'});}
  const start=performance.now();g.processTrafficDeadlocks(.1);cycles[size]={detected:g.trafficCycleSince.size,ms:Math.round((performance.now()-start)*100)/100};assert.equal(cycles[size].detected,1);
 }
 cross();g.state.time=500;for(let k=0;k<40;k++){const v={id:k+1,path:[k,k+1],phase:'driving',pos:0,progress:0,wait:7,speed:0,lastMovedAt:490};g.state.vehicles.set(v.id,v);const plan={nodes:[10,20],junctions:[{entry:0,clear:30}]};g.trafficWaits.set(v,{state:g.state,version:g.state.version,path:v.path,plan,distance:10,ownerId:k+2,serial:0,at:500,reason:'เว้นระยะรถ'});}g.processTrafficDeadlocks(.1);assert.equal(g.trafficCycleSince.size,0,'open queues must not be diagnosed as cycles');
 result.cycles=cycles;result.passed.push('closed cycles up to 5000 members are detected, while a 40-car open queue is not');
}
console.log(JSON.stringify(result,null,2));
