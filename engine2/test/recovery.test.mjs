import test from 'node:test';
import assert from 'node:assert/strict';
import { DeadlockMonitor } from '../deadlock-monitor.mjs';
import { RoadNetwork, TrafficEngine } from '../traffic-core.mjs';

test('only dependency cycles persisting past threshold generate gridlock reports', () => {
  const m=new DeadlockMonitor({thresholdSeconds:5});
  m.waiting('red-light','signal',0); // signal is not a car
  m.waiting('a','b',0);
  m.waiting('b','c',0);
  m.waiting('c','a',0);
  assert.equal(m.inspect(4).length,0);
  const reports=m.inspect(6);
  assert.equal(reports.length,1);
  assert.deepEqual(reports[0].vehicles,['a','b','c']);
  assert.equal(m.inspect(7).length,0);
  m.forget('a');
  assert.equal(m.inspect(20).length,0);
});

test('road demolition respawns vehicle from configured city gate when viable', () => {
  const n=new RoadNetwork();
  n.addNode('A',{x:0,y:0});n.addNode('B',{x:1,y:0});
  n.addNode('C',{x:2,y:0});n.addNode('GATE',{x:0,y:2});
  n.addEdge({id:'ab',from:'A',to:'B',length:10,speed:1});
  n.addEdge({id:'bc',from:'B',to:'C',length:10,speed:1});
  n.addEdge({id:'gate-c',from:'GATE',to:'C',length:20,speed:1});
  const restored=[];
  const engine=new TrafficEngine(n,{gateNodes:['GATE'],
    onRecovery:(v,reason,gate)=>restored.push({id:v.id,reason,gate})});
  engine.planTrip({id:'v',from:'A',to:'C'});
  engine.runSteps(2);
  assert.equal(engine.vehicles.get('v').route[0],'ab');
  n.removeEdge('ab');
  engine.runSteps(1);
  assert.equal(engine.vehicles.has('v'),true);
  assert.deepEqual(restored,[{id:'v',reason:'edge_removed',gate:'GATE'}]);
  assert.equal(engine.vehicles.get('v').route[0],'gate-c');
});

test('after graph version change, an alternative is selected at a node, not each frame', () => {
  const n=new RoadNetwork();
  for (const id of ['A','B','C','D']) n.addNode(id);
  for (const spec of [
    ['ab','A','B',1], ['bc','B','C',8],['bd','B','D',1],
    ['dc','D','C',20]
  ]) n.addEdge({id:spec[0],from:spec[1],to:spec[2],
    length:spec[3],speed:1});
  const engine=new TrafficEngine(n);
  engine.planTrip({id:'v',from:'A',to:'C'});
  engine.runSteps(2);
  const car=engine.vehicles.get('v');
  assert.deepEqual(car.route,['ab','bc']);
  const priorPlans=engine.metrics.routePlans;
  n.removeEdge('dc');
  // An unrelated graph change is assessed once when this car arrives at B.
  engine.runSteps(8);
  assert.ok(engine.metrics.routePlans <= priorPlans + 1);
  assert.deepEqual(engine.vehicles.get('v').route,['ab','bc']);
});

test('canceled future ID can be reused without running a stale scheduled event', () => {
  const n=new RoadNetwork();
  ['A','B','C'].forEach(id=>n.addNode(id));
  n.addEdge({id:'ab',from:'A',to:'B',length:10,speed:1});
  n.addEdge({id:'ac',from:'A',to:'C',length:10,speed:1});
  const engine=new TrafficEngine(n);
  engine.planTrip({id:'reused',from:'A',to:'B',at:1});
  engine.cancelTrip('reused');
  engine.planTrip({id:'reused',from:'A',to:'C',at:6});
  engine.runSteps(10);
  assert.equal(engine.vehicles.size,0);
  engine.runSteps(21);
  assert.deepEqual(engine.vehicles.get('reused').route,['ac']);
});
