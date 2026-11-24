'use strict';
const assert=require('node:assert/strict');
const {boot}=require('./audit-harness.cjs');
function fixture(counts) {
 const {game:g}=boot('installAISignal,occupy');
 const s=g.state;
 for(const k of ['roads','vehicles','buildings','citizens','signals','occ','reservations','junctionCache','junctionLayoutCache','signalSlotCache'])s[k]?.clear();
 s.gates=[];s.version++;s.speed=1;s.time=400;s.signalDefaults={eastWest:6,northSouth:6};
 const node=g.id(140,140);
 const paths=[
  Array.from({length:65},(_,i)=>g.id(108+i,140)),
  Array.from({length:65},(_,i)=>g.id(172-i,140)),
  Array.from({length:65},(_,i)=>g.id(140,108+i))];
 for(const path of paths){
  for(const [i,n] of path.entries()){
   if(!s.roads.has(n))s.roads.set(n,{type:'large',main:false,links:new Set(),load:0,wait:0});
   if(i){s.roads.get(n).links.add(path[i-1]);s.roads.get(path[i-1]).links.add(n);}
  }
 }
 g.installAISignal(node);
 const routes=paths.map((path,side)=>Array.from({length:counts[side]},(_,j)=>{
  const lane=j%4,v={id:1+side*100+j,path,pathSet:new Set(path),phase:'driving',pos:0,progress:0,lane,laneSeed:lane,
   wait:2,speed:0,kind:'pass',lastMovedAt:s.time,noUTurnPolicy:1,trafficModel:2,turnLanes:{},junctionPasses:[],routeCheckedVersion:s.version};
  s.vehicles.set(v.id,v);
  const p=g.motionPlan(v),guard=p.junctions.find(q=>q.node===node);
  const d=guard.stop-.08-Math.floor(j/4)*1.01;
  let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=d)i++;
  v.pos=i;v.progress=(d-p.nodes[i])/(p.nodes[i+1]-p.nodes[i]);assert(g.occupy(v,i));
  return {v,guard,p,side};
 }));
 return {g,s,node,routes,st:g.signalSettings(node)};
}
function run(counts,limit=50){
 const {g,s,node,routes,st}=fixture(counts),cars=routes.flat(),exited=new Set(),trace=[];
 let phase=st.smartPhase,lost=0,at25=null;
 for(let i=1;i<=Math.ceil(limit/.04);i++){
  s.time=400+i*.04;g.smartSignalStep();
  if(phase!==st.smartPhase){
   trace.push([+((s.time-400).toFixed(2)),st.smartPhase,st.smartIncoming[st.smartSlot],exited.size]);
   phase=st.smartPhase;
  }
  if(phase!=='green')lost+=.04;
  g.advanceVehicles(.05,.04);
  for(const {v,p,guard} of cars)if(g.motionDistance(v,p)>=guard.clear)exited.add(v.id);
  if(i===625)at25=exited.size;
  if(exited.size===cars.length)break;
 }
 return {total:cars.length,at25,exits:exited.size,changes:trace.filter(x=>x[1]==='yellow').length,
   clearanceMinutes:+lost.toFixed(2),elapsed:+((s.time-400).toFixed(2)),trace};
}
const balanced=run([20,19,5]);
assert.equal(balanced.exits,44);
assert.equal(balanced.changes,2,'each of the three approaches gets one continuous green');
assert(balanced.at25>=40);
assert(balanced.elapsed<30);
assert(balanced.trace.find(q=>q[1]==='yellow')[3]>=10,'at least half the first queue must really clear on a productive green');

{
 const {g,s,st,routes}=fixture([20,4,0]);
 const blockers=[];
 for(const {v,guard} of routes[0].slice(0,4)){
  const stop={...v,id:900+v.lane,phase:'delivery_unload',pos:guard.pos+1,progress:0,junctionPasses:[],occKey:null};
  s.vehicles.set(stop.id,stop);
  assert(g.occupy(stop,stop.pos));
  blockers.push(stop);
 }
 let yielded=false,restored=false;
 for(let i=1;i<=1000;i++){
  s.time=400+i*.04;
  g.smartSignalStep();
  g.advanceVehicles(.05,.04);
  if(st.smartPhase==='green'&&st.smartIncoming[st.smartSlot]===0&&i<300){
   if(st.smartBatch)assert.equal(st.smartBatch.passed,0,'occupancy or a reservation is not a discharge');
   if(!restored){
    delete st.smartBatch;
    restored=true; // An existing 6.2 save can resume in an active green.
   }
  }
  if(i<300&&st.smartPhase==='green'&&st.smartIncoming[st.smartSlot]===2)yielded=true;
  if(i===300)for(const v of blockers){s.occ.delete(v.occKey);s.vehicles.delete(v.id);}
 }
 assert(yielded,'a blocked dominant queue must let a free approach run');
 for(const {v,p,guard} of routes.flat())assert(g.motionDistance(v,p)>=guard.clear,'both sides recover after the exit reopens');
}
console.log(JSON.stringify(balanced));
