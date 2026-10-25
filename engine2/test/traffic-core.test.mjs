import test from 'node:test';
import assert from 'node:assert/strict';
import { MinHeap, RoadNetwork, EventScheduler, TrafficEngine } from '../traffic-core.mjs';

const edge = (id, from, to, length, speed = 1, lanes = 1) =>
  ({ id, from, to, length, speed, lanes });
function network(nodes, edges) {
  const n = new RoadNetwork();
  nodes.forEach(id => n.addNode(id));
  edges.forEach(e => n.addEdge(e));
  return n;
}

test('heap and event scheduler are ordered', () => {
  const heap = new MinHeap();
  [4, 1, 3, 2].forEach(priority => heap.push({ priority }));
  assert.deepEqual([heap.pop(), heap.pop(), heap.pop(), heap.pop()]
    .map(x => x.priority), [1, 2, 3, 4]);
  const q = new EventScheduler(), events = [];
  q.schedule(20, 'late', {}); q.schedule(2, 'early', {});
  q.drain(3, e => events.push(e.type));
  assert.deepEqual(events, ['early']);
  q.drain(30, e => events.push(e.type));
  assert.deepEqual(events, ['early', 'late']);
});

test('least expected time routing, cache reuse, and congestion invalidation', () => {
  const n = network(['A','B','C','D'], [
    edge('ab','A','B',10), edge('bd','B','D',10),
    edge('ac','A','C',2), edge('cd','C','D',2)
  ]);
  assert.deepEqual(n.route('A','D').edges, ['ac','cd']);
  assert.equal(n.metrics.searches, 1);
  assert.deepEqual(n.route('A','D').nodes, ['A','C','D']);
  assert.equal(n.metrics.cacheHits, 1);
  n.setCongestion('ac', 30);
  assert.deepEqual(n.route('A','D').edges, ['ab','bd']);
  assert.equal(n.metrics.searches, 2);
  n.setCongestion('ac', 30.01); // Same traffic band, no replan.
  assert.equal(n.metrics.searches, 2);
  n.route('A','D');
  assert.equal(n.metrics.searches, 2);
});

test('turn bans and immediate U-turn ban are enforced', () => {
  const n = network(['A','B','C','D'], [
    edge('ab','A','B',1), edge('bc','B','C',1),
    edge('bd','B','D',2), edge('dc','D','C',2),
    edge('ba','B','A',1)
  ]);
  assert.deepEqual(n.route('A','C').edges, ['ab','bc']);
  n.forbidTurn('ab','bc');
  assert.deepEqual(n.route('A','C').edges, ['ab','bd','dc']);
  assert.equal(n.route('A','A').time, 0);
});

test('scheduled trips do not start early, duplicate ids are rejected', () => {
  const n = network(['A','B'], [edge('ab','A','B',100)]);
  const engine = new TrafficEngine(n);
  engine.planTrip({ id:'v1', from:'A', to:'B', at:10 });
  assert.throws(() => engine.planTrip({id:'v1', from:'A', to:'B', at:10}));
  engine.runSteps(49);
  assert.equal(engine.vehicles.size, 0);
  engine.runSteps(1);
  assert.equal(engine.vehicles.size, 1);
  assert.equal(engine.snapshot().activeVehicles, 1);
});

test('one direction receives green, another direction waits at junction', () => {
  const n = network(['A','X','B','C'], [
    edge('ab','A','B',0.8), edge('xb','X','B',0.8),
    edge('bc','B','C',4)
  ]);
  const engine = new TrafficEngine(n);
  engine.configureSignal('B', [
    { incomingEdges:['xb'], duration:3 },
    { incomingEdges:['ab'], duration:3 }
  ]);
  engine.planTrip({id:'test', from:'A', to:'C'});
  engine.runSteps(10);
  assert.equal(engine.vehicles.get('test').route[engine.vehicles.get('test').edgeIndex], 'ab');
  engine.runSteps(7);
  assert.equal(engine.vehicles.get('test').route[engine.vehicles.get('test').edgeIndex], 'bc');
});

test('cars on same lane preserve forward spacing and do not overlap', () => {
  const n = network(['A','B'], [edge('ab','A','B',120,5,2)]);
  const engine = new TrafficEngine(n, { gap:0.6 });
  for (let i=0;i<70;i++) engine.planTrip({id:i, from:'A', to:'B'});
  engine.runSteps(45);
  const s = engine.snapshot();
  assert.equal(s.metrics.failed, 0);
  for (let lane=0;lane<2;lane++) {
    const cars = s.vehicles.filter(v => v.status === 'moving' && v.lane === lane)
      .sort((a,b)=>b.distance-a.distance);
    for (let i=1;i<cars.length;i++)
      assert.ok(cars[i-1].distance - cars[i].distance >= 1.05 - 1e-9);
  }
});

test('1000 simultaneous trips reuse one route plan and remain under cap', () => {
  const n = network(['A','B'], [edge('ab','A','B',500,1,4)]);
  const engine = new TrafficEngine(n, { maxVehicles:1000 });
  for(let i=0;i<1000;i++) engine.planTrip({id:'car'+i,from:'A',to:'B'});
  engine.runSteps(15);
  assert.equal(engine.vehicles.size,1000);
  assert.equal(n.metrics.searches,1);
  assert.equal(engine.metrics.routePlans,1000);
  assert.equal(engine.metrics.failed,0);
});

test('removed road fails safely without a corrupt vehicle', () => {
  const n = network(['A','B'],[edge('ab','A','B',30)]);
  const failures = [];
  const engine = new TrafficEngine(n, { onFailure:(vehicle,reason)=>failures.push(reason) });
  engine.planTrip({id:'v',from:'A',to:'B'});
  engine.runSteps(3);
  n.removeEdge('ab');
  engine.runSteps(2);
  assert.equal(engine.vehicles.size,0);
  assert.deepEqual(failures,['edge_removed']);
});

test('fixed step yields same deterministic state from split frame durations', () => {
  const n1 = network(['A','B'], [edge('ab','A','B',20)]);
  const n2 = network(['A','B'], [edge('ab','A','B',20)]);
  const e1 = new TrafficEngine(n1), e2 = new TrafficEngine(n2);
  e1.planTrip({id:1,from:'A',to:'B'});
  e2.planTrip({id:1,from:'A',to:'B'});
  assert.equal(e1.advance(.1), 0);
  assert.equal(e1.advance(.3), 2);
  assert.equal(e2.advance(.4), 2);
  assert.deepEqual(e1.snapshot(), e2.snapshot());
});
