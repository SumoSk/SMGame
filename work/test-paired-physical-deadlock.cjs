const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game:g,install}=new Function('require',prefix+'return {game,install};')(require);
function makePair(){
 const points=Array.from({length:28},(_,i)=>[135+i,100]);
 const a=install(points,'medium',false,1);
 a.pos=11;a.progress=.4;a.noUTurnPolicy=1;a.toGate=a.path.at(-1);
 const b={...a,id:901,path:[...a.path],pathSet:new Set(a.path),laneSeed:0,motionSeedLane:0,progress:.2,turnLanes:{},junctionPasses:[],junctionQueueSince:{},noUTurnPolicy:1};
 g.state.vehicles.set(b.id,b);g.state.occ.clear();g.state.gates=[a.path[0]];
 return [a,b];
}
function obstruct(a,b,mutual=true,stale=false){
 a.wait=b.wait=7;a.speed=b.speed=0;
 a.stopReason=b.stopReason='เว้นระยะรถ';
 const at=g.state.time;
 a.lastPhysicalBlock={gameTime:at,ownerId:b.id,reason:'physical_capsule_overlap'};
 b.lastPhysicalBlock={gameTime:stale?at-2:at,ownerId:mutual?a.id:999,reason:'physical_capsule_overlap'};
}
{
 const [a,b]=makePair();obstruct(a,b);
 g.advanceVehicles(0,0);
 assert.equal(a.phase,'driving','the winner remains at the exact road location');
 assert.equal(b.phase,'gate_waiting','only the yielding car recovers through its existing trip');
 assert.equal(b.respawns,1,'exactly one recovery');
 assert.equal(b.toGate,a.path.at(-1),'destination remains intact');
 assert(![...g.state.occ.values()].includes(b.id),'old road ownership cleared');
 assert(![...g.state.reservations.values()].some(r=>r.passes?r.passes.some(p=>p.id===b.id):r.id===b.id),'old reservations cleared');
}
for(const [mutual,stale] of [[false,false],[true,true]]){
 const [a,b]=makePair();obstruct(a,b,mutual,stale);
 g.advanceVehicles(0,0);
 assert.equal(a.phase,'driving');
 assert.equal(b.phase,'driving','a one-way or stale block must not trigger recovery');
}
console.log('PASS: one-time O(1) mutual deadlock recovery, no ghost collision, no false recovery');
