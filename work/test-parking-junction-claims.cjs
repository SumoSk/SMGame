'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game:g,install,turnPath}=new Function('require',source+'return {game,install,turnPath};')(require);
const lead=install(turnPath(-1),'small',true),leadPlan=g.motionPlan(lead),guard=leadPlan.junctions[0];
assert(guard&&guard.pos>=2,'use a real signalized intersection');
const path=lead.path.slice(guard.pos-2);
const parking={...lead,id:1427,path,pathSet:new Set(path),pos:0,progress:0,phase:'driving',wait:46,speed:0,
  lane:0,motionSeedLane:0,laneSeed:0,motionStartPose:null,lotPath:null,
  mergeExitActive:true,mergeCommitted:true,mergePolicy:2,mergeWaitSeconds:46,
  mergeDrainStarted:true,mergeAdmitted:[],junctionPasses:[],junctionQueueSince:{},turnLanes:{},occKey:null};
g.state.vehicles.set(parking.id,parking);
const keys=g.mergeRoadKeys(parking),junctionKey=guard.node+':'+g.dir(guard.node,path[3])+':'+g.plannedLane(parking,2);
const mouthKey=path[0]+':'+g.dir(path[0],path[1])+':'+g.plannedLane(parking,0);
assert(!keys.includes(junctionKey),'parking exit must never claim the signalized junction');
assert(keys.includes(mouthKey),'parking exit still reserves its immediate road-merge tile');
g.prepareParkingMerges(0);
assert.equal(g.parkingClaimed(junctionKey,lead.id),false,'head vehicle must not be denied by downstream driveway claim');
assert.equal(g.parkingClaimed(mouthKey,lead.id),true,'driveway mouth protection stays active');
const p=g.motionPlan(lead),s=guard.stop-.06;
let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=s)i++;
if(lead.occKey)g.state.occ.delete(lead.occKey);
lead.occKey=null;lead.pos=i;lead.progress=(s-p.nodes[i])/Math.max(1e-9,p.nodes[i+1]-p.nodes[i]);lead.speed=0;lead.wait=46;
const incoming=g.dir(lead.path[guard.pos-1],guard.node),slots=g.signalSlots(guard.node);
const slot=slots.findIndex(x=>x.incoming===incoming);assert(slot>=0);
g.state.signals.set(guard.node,{mode:'manual',phaseModel:'approach',slot,eastWest:8,northSouth:8});
assert(g.signalAllows(guard.node,incoming),'approach must be green');
const admission=g.explainRoadTraversal(lead,guard.pos);
assert.equal(admission.allowed,true,'the empty intersection must be available to green lane head');
assert(!admission.blockers.some(x=>x.code==='parking_merge_claim'));
assert.equal(g.intersectionAllowed(lead,guard.pos),true,'green lead may enter despite committed parking car behind');
console.log(JSON.stringify({passed:true,checks:['junction not reserved by parking exit','driveway mouth remains guarded','green head admitted','parking owner behind cannot lock front'],keys,intersection:guard.node}));
