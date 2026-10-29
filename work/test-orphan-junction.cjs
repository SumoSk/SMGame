const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game:g,install,turnPath}=new Function('require',prefix+'return {game,install,turnPath};')(require);
let cases=0;
for(const type of ['small','medium','large'])for(const claimType of ['occupancy','reservation']){
 const v=install(turnPath(-1),type,true),p=g.motionPlan(v),guard=p.junctions[0],node=guard.node;
 g.state.occ.clear();let k=0;while(k+1<p.nodes.length&&p.nodes[k+1]<=guard.stop)k++;
 v.pos=k;v.progress=(guard.stop-p.nodes[k])/(p.nodes[k+1]-p.nodes[k]);v.occKey=null;v.speed=0;v.wait=10;
 const incoming=g.dir(v.path[guard.pos-1],node),slots=g.signalSlots(node);
 g.state.signals.set(node,{mode:'manual',phaseModel:'approach',slot:slots.findIndex(s=>s.incoming===incoming),eastWest:8,northSouth:8});
 const key=node+':'+g.dir(node,v.path[guard.pos+1])+':'+g.plannedLane(v,guard.pos);
 if(claimType==='occupancy')g.state.occ.set(key,999);else g.state.reservations.set(key,{id:999,until:g.state.time+30});
 assert(g.intersectionAllowed(v,guard.pos),'orphan claim must not pin green head');
 const holder={...v,id:999,junctionPasses:[]};g.state.vehicles.set(999,holder);
 if(claimType==='occupancy')g.state.occ.set(key,999);else g.state.reservations.set(key,{id:999,until:g.state.time-1});
 assert.equal(g.intersectionAllowed(v,guard.pos),false,'live owner remains binding even with old expiry');
 let checks=0;const originalHas=g.state.vehicles.has;
 g.state.vehicles.has=function(id){checks++;return originalHas.call(this,id);};
 for(let n=0;n<100;n++)assert.equal(g.intersectionAllowed(v,guard.pos),false);
 g.state.vehicles.has=originalHas;
 assert(checks<=2,'repeated attempts must not repeatedly scan claims during cooldown');
 g.state.vehicles.delete(999);g.state.occ.delete(key);g.state.reservations.delete(key);
 g.state.signals.set(node,{mode:'manual',phaseModel:'approach',slot:slots.findIndex(s=>s.incoming!==incoming),eastWest:8,northSouth:8});
 assert.equal(g.intersectionAllowed(v,guard.pos),false,'red remains binding');
 g.state.signals.set(node,{mode:'manual',phaseModel:'approach',slot:slots.findIndex(s=>s.incoming===incoming),eastWest:8,northSouth:8});
 const start=g.motionDistance(v);
 for(let n=0;n<12;n++){g.state.time+=.032;g.advanceVehicles(.016,.032);}
 assert(g.motionDistance(v)>start,'released green car must actually move');
 cases++;
}
console.log(JSON.stringify({passed:true,cases,liveOwnerProtected:true,redProtected:true}));
