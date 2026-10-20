const fs=require('node:fs');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const cases=`
function setup(inType,outType,centerType,rotation,missing,seed,turn=0){
 const rotate=([x,y])=>{for(let r=0;r<rotation;r++)[x,y]=[-y,x];return [150+x,150+y];};
 const points=[];for(let x=-8;x<=0;x++)points.push(rotate([x,0]));
 for(let n=1;n<=8;n++)points.push(rotate(turn===0?[n,0]:[0,turn===1?n:-n]));
 const v=install(points,i=>i<8?inType:i===8?centerType:outType,false,seed);
 const center=game.id(150,150);
 for(const local of [0,1,2,3]){
  if(local===missing||(Array.isArray(missing)&&missing.includes(local)))continue;
  const d=(local+rotation)%4;
  const delta=[[1,0],[0,1],[-1,0],[0,-1]][d];let prev=center;
  const type=local===2?inType:local===turn?outType:'medium';
  for(let k=1;k<=8;k++){
   const node=game.id(150+delta[0]*k,150+delta[1]*k);
   if(!game.state.roads.has(node))game.state.roads.set(node,{type,main:false,links:new Set(),load:0,wait:0});
   game.state.roads.get(prev).links.add(node);game.state.roads.get(node).links.add(prev);prev=node;
  }
 }
 game.state.junctionCache.clear();game.state.junctionLayoutCache?.clear();game.state.version++;
 return v;
}
let checks=0;
for(const incoming of ['small','medium','large'])for(const outgoing of ['small','medium','large'])
for(let rotation=0;rotation<4;rotation++)for(const missing of [-1,1,3])for(let seed=0;seed<game.ROADS[incoming].lanes/2;seed++){
 let baseline;
 for(const center of ['small','medium','large']){
  const v=setup(incoming,outgoing,center,rotation,missing,seed),p=game.motionPlan(v);
  assert.equal(game.junction(v.path[8]),missing===-1?4:3);
  const samples=Array.from({length:101},(_,k)=>game.positionOnMotion(p,p.total*k/100));
  const actual={lanes:Array.from(p.lanes),samples};
  if(baseline){
   assert.deepEqual(actual.lanes,baseline.lanes,'center tile must not collapse straight lanes');
   actual.samples.forEach((q,k)=>assert(Math.hypot(q.x-baseline.samples[k].x,q.y-baseline.samples[k].y)<1e-8,'center tile must not deflect straight cars'));
  }else baseline=actual;
  if(incoming===outgoing)assert(p.lanes.every(l=>l===seed),'equal-width arms preserve every lane');
  const targetCap=game.ROADS[outgoing].lanes/2;assert(p.lanes[8]<targetCap);
  for(const q of samples)assert(Number.isFinite(q.x)&&Number.isFinite(q.y));
  // A single car must clear a permanently green junction without recovery.
  const node=v.path[8];for(let k=0;k<10000&&!game.signalAllows(node,rotation);k++)game.state.time+=.1;
  const frozen=game.state.time;
  for(let k=0;k<1800&&game.state.vehicles.size;k++)game.advanceVehicles(1/60,0);
  assert.equal(game.state.time,frozen);assert.equal(game.state.vehicles.size,0,'straight car must clear mixed-width junction');checks++;
 }
}
let turnChecks=0;
for(const turn of [1,3])for(const incoming of ['small','medium','large'])for(const outgoing of ['small','medium','large'])for(let rotation=0;rotation<4;rotation++)for(const missing of [-1,0,[0,turn===1?3:1]]){
 let baseline;
 for(const center of ['small','medium','large']){
  const v=setup(incoming,outgoing,center,rotation,missing,0,turn),p=game.motionPlan(v);
  const samples=Array.from({length:101},(_,k)=>game.positionOnMotion(p,p.total*k/100));
  if(baseline)samples.forEach((q,k)=>assert(Math.hypot(q.x-baseline[k].x,q.y-baseline[k].y)<1e-8,'center tile must not deflect turns'));else baseline=samples;
  const node=v.path[8];for(let k=0;k<10000&&!game.signalAllows(node,rotation);k++)game.state.time+=.1;
  for(let k=0;k<2400&&game.state.vehicles.size;k++)game.advanceVehicles(1/60,0);
  assert.equal(game.state.vehicles.size,0,'turn must clear');turnChecks++;
 }
}
// Four lanes in both directions: the small center tile must admit all lanes.
for(const center of ['small','medium','large']){
 const base=setup('large','large',center,0,-1,0);
 game.state.vehicles.clear();game.state.occ.clear();
 for(let lane=0;lane<4;lane++)for(const reverse of [false,true]){
  const path=reverse?[...base.path].reverse():[...base.path],id=900+lane*2+Number(reverse);
  const v={...base,id,path,pathSet:new Set(path),laneSeed:lane,motionSeedLane:lane,turnLanes:{},pos:0,progress:0,phase:'driving',speed:0,junctionPasses:[],junctionQueueSince:{}};
  game.state.vehicles.set(id,v);v.lane=game.plannedLane(v,0);v.occKey=path[0]+':'+(reverse?2:0)+':'+v.lane;game.state.occ.set(v.occKey,id);
 }
 const node=base.path[8];for(let k=0;k<10000&&!game.signalAllows(node,0);k++)game.state.time+=.1;
 let parallel=0;
 for(let k=0;k<2400&&game.state.vehicles.size;k++){
  game.advanceVehicles(1/60,0);
  const cars=[...game.state.vehicles.values()];
  parallel=Math.max(parallel,cars.filter(v=>v.junctionPasses?.length).length);
  for(let a=0;a<cars.length;a++)for(let b=a+1;b<cars.length;b++)assert(!game.capsulesOverlap(game.vehiclePosition(cars[a]),game.vehiclePosition(cars[b])),'parallel vehicles must not collide');
 }
 assert.equal(game.state.vehicles.size,0);assert(parallel>=4,'wide road must retain concurrent lanes through a narrow center tile');
}
console.log(JSON.stringify({passed:true,straightCases:checks,turnCases:turnChecks,parallelCases:3}));
`;
new Function('require',fixture+cases)(require);
