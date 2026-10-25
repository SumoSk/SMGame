import test from 'node:test';
import assert from 'node:assert/strict';
import { LaneController, laneForMerge } from '../lane-controller.mjs';
import { JunctionController } from '../junction-controller.mjs';
import { ParkingController } from '../parking-controller.mjs';
import { RoadNetwork, TrafficEngine } from '../traffic-core.mjs';

const moving = (id, lane, distance) => ({
  id, lane, distance, length:0.45, route:['road'], edgeIndex:0,status:'moving'
});

test('lane-count narrowing maps to actual downstream lanes', () => {
  assert.deepEqual([0,1,2,3,4].map(i => laneForMerge(i,5,2)),[0,0,1,1,1]);
  assert.deepEqual([0,1].map(i => laneForMerge(i,2,5)),[1,3]);
  assert.throws(() => laneForMerge(6,5,2));
});

test('lane change requires front and rear clearance; indexes only the adjacent lane', () => {
  const lanes = new LaneController({gap:0.6,cooldown:1});
  const subject=moving('subject',0,5), front=moving('front',1,5.5),
    back=moving('back',1,3.8);
  lanes.beginStep([subject,front,back]);
  assert.equal(lanes.tryChange(subject,1,{now:0,edgeLength:30,speed:1}),false);
  front.distance=9; back.distance=1;
  lanes.beginStep([subject,front,back]);
  assert.equal(lanes.tryChange(subject,1,{now:0,edgeLength:30,speed:1}),true);
  assert.equal(subject.lane,1);
  assert.equal(lanes.tryChange(subject,0,{now:0.5,edgeLength:30,speed:1}),false);
});

test('lane entry reservation respects preferred merge lane and available gap', () => {
  const lanes = new LaneController({gap:0.6});
  const positions = new Map([['next:1',0.2], ['next:0',5]]);
  assert.equal(lanes.chooseDownstreamLane({id:'next',lanes:2},4,5,positions,0.45),0);
  positions.set('next:0',0);
  assert.equal(lanes.chooseDownstreamLane({id:'next',lanes:2},4,5,positions,0.45),null);
});

test('yellow/clear are all-red, with same-direction parallel lanes accepted', () => {
  const j = new JunctionController({crossingSeconds:.15,yellowSeconds:.2,clearSeconds:.2});
  const queue=[];
  const schedule=(at,data)=>queue.push({at,data});
  j.configure('X', [
    { incomingEdges:['west'],duration:2 },
    { incomingEdges:['north'],duration:2 }
  ],0,schedule);
  const west1={nodeId:'X',incomingId:'west',outgoingId:'east',incomingLane:0,outgoingLane:0,now:1};
  const west2={...west1,incomingLane:1,outgoingLane:1};
  const north={...west1,incomingId:'north',outgoingId:'south'};
  assert.equal(j.enter(west1),true);
  assert.equal(j.enter(west2),true);
  assert.equal(j.enter(north),false);
  j.onTimer({nodeId:'X',token:1,state:'yellow'},2,schedule);
  assert.equal(j.enter({...west1,now:2.02}),false);
  j.onTimer({nodeId:'X',token:1,state:'clear'},2.2,schedule);
  assert.equal(j.enter({...west1,now:2.25}),false);
  j.onTimer({nodeId:'X',token:1,state:'next'},2.4,schedule);
  assert.equal(j.enter({...north,now:2.41}),true);
  assert.equal(j.enter({...west1,now:2.41}),false);
});

test('parking admits only free slots, then wakes a waiting trip on release', () => {
  const admitted=[],rejected=[];
  const parking=new ParkingController({onAdmitted:e=>admitted.push(e),
    onRejected:e=>rejected.push(e)});
  parking.register('mall',2);
  assert.equal(parking.request('mall','a').status,'reserved');
  assert.equal(parking.request('mall','b').status,'reserved');
  assert.equal(parking.request('mall','c').status,'queued');
  assert.equal(parking.snapshot()[0].occupied,2);
  assert.equal(parking.release('mall','a'),true);
  assert.equal(parking.isReserved('mall','c'),true);
  assert.equal(admitted.length,3);
  assert.equal(parking.remove('mall'),true);
  assert.equal(parking.snapshot().length,0);
  assert.equal(rejected.length,2);
  assert.equal(admitted.length,3);
});

test('capacity queue is event-woken, not polling every fixed step', () => {
  const road=new RoadNetwork(); road.addNode('A'); road.addNode('B');
  road.addEdge({id:'road',from:'A',to:'B',length:2,speed:2});
  const engine=new TrafficEngine(road,{maxVehicles:1});
  for (const id of ['first','second','third'])
    engine.planTrip({id,from:'A',to:'B'});
  engine.runSteps(8);
  assert.equal(engine.vehicles.size,1);
  assert.equal(engine.deferred.length,1);
  assert.equal(engine.events.queue.size,0);
  engine.runSteps(20);
  assert.equal(engine.metrics.completed,3);
  assert.equal(engine.deferred.length,0);
  assert.equal(engine.events.queue.size,0);
});
