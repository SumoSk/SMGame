'use strict';
const assert = require('node:assert/strict');
const { boot } = require('./audit-harness.cjs');

function fixture(gap, lastDirection = 1) {
  const { game: g } = boot('occupy,parallelBendProfile,physicalTrafficLimit,beginTrafficSpatial,updateTrafficSpatial,refreshMotionReservations,set spatialForTest(value){trafficSpatial=value;}');
  const s = g.state;
  for (const key of ['roads','vehicles','buildings','occ','reservations','signals','junctionCache','junctionLayoutCache','signalSlotCache']) s[key]?.clear();
  s.version++;
  s.time = 400;
  const path = [];
  function add(x, y, previous) {
    const node = g.id(x,y);
    if (!s.roads.has(node)) s.roads.set(node,{type:'large',main:false,links:new Set(),load:0,wait:0});
    if (previous != null) {
      s.roads.get(previous).links.add(node);
      s.roads.get(node).links.add(previous);
    }
    return node;
  }
  function extend(x, y) { path.push(add(x,y,path.at(-1))); }
  for (let x=100; x<=120; x++) extend(x,100);
  for (let y=1; y<=(gap || 20); y++) extend(120,100+y);
  if (gap) for (let x=1; x<=20; x++) extend(120+lastDirection*x,100+gap);
  function car(id,lane,reverse=false) {
    const route = reverse ? [...path].reverse() : path;
    const v = {id,path:route,pathSet:new Set(route),phase:'driving',pos:0,progress:0,lane,laneSeed:lane,
      wait:0,speed:2,kind:'pass',lastMovedAt:s.time,noUTurnPolicy:1,trafficModel:2,
      turnLanes:{},junctionPasses:[],junctionQueueSince:{},routeCheckedVersion:s.version};
    s.vehicles.set(id,v);
    return v;
  }
  function locate(v,distance) {
    const { nodes } = g.motionPlan(v);
    let i=0;
    while (i+1<nodes.length && nodes[i+1]<=distance) i++;
    v.pos=i;
    v.progress=(distance-nodes[i])/(nodes[i+1]-nodes[i]);
    assert(g.occupy(v,i));
  }
  return {g,s,path,add,car,locate};
}

for (const [gap,direction] of [[0,1],[3,1],[3,-1],[4,1],[4,-1],[8,1]]) {
  const {g,s,car,locate} = fixture(gap,direction);
  const cars = Array.from({length:8},(_,i)=>car(40+i,i%4,i>=4));
  const seen = new Set();
  let together=0;
  for (const v of cars) {
    const p=g.motionPlan(v);
    assert.equal(p.junctions.length,0,'clear bends must not enter intersection arbitration');
    locate(v,p.turns[0].startDistance-2);
  }
  for (let tick=0; tick<1600 && seen.size<cars.length; tick++) {
    s.time+=.016;
    g.advanceVehicles(.01,.016);
    const poses=[];
    let inCurve=0;
    for (const v of cars) {
      if (!s.vehicles.has(v.id)) continue;
      const p=g.motionPlan(v),d=g.motionDistance(v,p),pose=g.vehiclePosition(v);
      for (const other of poses) assert(!g.capsulesOverlap(pose,other),'cars must remain physically disjoint');
      poses.push(pose);
      if (d<p.turns.at(-1).endDistance+.5) {
        assert(v.speed>0,'clear lanes must not stop');
        assert(!v.lastJunctionDenial && !v.lastPhysicalBlock,'clear lanes must not queue or brake for a neighbor');
      } else seen.add(v.id);
      if (p.turns.some(t=>d>=t.startDistance && d<t.endDistance)) inCurve++;
    }
    together=Math.max(together,inCurve);
  }
  assert.equal(together,8);
  assert.equal(seen.size,8);
}

{
  const {g,s,path,car,locate}=fixture(4);
  const front=car(60,2), back=car(61,2), neighbor=car(62,1);
  const p=g.motionPlan(front),turn=p.turns[0];
  assert.equal(g.motionPlan(back).pieces.find(piece=>piece.turn).arc,p.pieces.find(piece=>piece.turn).arc);
  const start=turn.startDistance+.1;
  locate(front,start+1.2);
  locate(back,start);
  locate(neighbor,g.motionPlan(neighbor).turns[0].startDistance+.1);
  g.spatialForTest=g.beginTrafficSpatial();
  for (const v of s.vehicles.values()) g.updateTrafficSpatial(v);
  assert(Number.isFinite(g.physicalTrafficLimit(back,g.motionPlan(back),start,2)));
  assert.equal(back.lastPhysicalBlock.ownerId,front.id);
  assert.equal(g.physicalTrafficLimit(neighbor,g.motionPlan(neighbor),g.motionDistance(neighbor),2),Infinity);
  const key='junction:'+path[20];
  back.junctionPasses=[{node:path[20],pos:20}];
  s.reservations.set(key,{id:back.id,passes:[{id:back.id,pos:20}]});
  g.refreshMotionReservations(back,g.motionPlan(back),start);
  assert.equal(back.junctionPasses.length,0);
  assert(!s.reservations.has(key),'release a pre-fix bend pass');
}

{
  const {g,s,path,add,car}=fixture(0);
  assert(g.parallelBendProfile(path[20]));
  const junction=path[23];
  let previous=junction;
  for (let x=1;x<=12;x++) previous=add(120+x,103,previous);
  g.roadChanged([junction]);
  assert(!g.parallelBendProfile(path[20]),'a nearby junction invalidates the cached free bend');
  const v=car(81,0);
  assert(g.motionPlan(v).junctions.some(j=>j.node===junction));
  const slots=g.signalSlots(junction),slot=slots.findIndex(x=>x.incoming!==1);
  assert(slot>=0);
  s.signals.set(junction,{mode:'manual',slot,axis:slots[slot].axis,eastWest:6,northSouth:6,holdUntil:0,phaseModel:'approach'});
  assert(!g.signalAllows(junction,1));
  assert(!g.intersectionAllowed(v,23));
  assert.equal(v.lastJunctionDenial.code,'red_signal');
}
{
  const {g,path}=fixture(2);
  assert(!g.parallelBendProfile(path[20]),'keep conflict checks when adjacent lanes cannot fit');
}
console.log('PASS parallel bend geometry, eight simultaneous lanes, same-lane spacing, legacy leases and adjacent red light');
