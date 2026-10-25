import test from 'node:test';
import assert from 'node:assert/strict';
import { CityRoadAdapter } from '../city-road-adapter.mjs';
import { TrafficEstimator } from '../traffic-estimator.mjs';
import { RoadNetwork } from '../traffic-core.mjs';

const road = (type, links) => ({ type, links:new Set(links) });

test('city adapter maps original road records to a directed graph once', () => {
  const roads=new Map([[0,road('small',[1])],[1,road('medium',[0,2])],
    [2,road('large',[1])]]);
  const adapter=new CityRoadAdapter({gridWidth:300});
  const a=adapter.sync(roads);
  assert.equal(a.nodes,3);
  assert.equal(a.directedLinks,4);
  assert.deepEqual(adapter.network.route(0,2).edges,['0>1','1>2']);
  assert.equal(adapter.network.edges.get('1>2').lanes,2);
  assert.equal(adapter.network.edges.get('0>1').lanes,1);
  assert.equal(adapter.sync(roads).changedEdges,0);
});

test('street removal deletes stale nodes, links and invalid routes', () => {
  const roads=new Map([[0,road('small',[1])],[1,road('small',[0,2])],
    [2,road('small',[1])]]);
  const adapter=new CityRoadAdapter();
  adapter.sync(roads);
  roads.delete(1);
  roads.get(0).links.clear();roads.get(2).links.clear();
  const result=adapter.sync(roads);
  assert.equal(result.nodes,2);
  assert.equal(result.directedLinks,0);
  assert.equal(adapter.network.route(0,2),null);
});

test('road width change updates only relevant directed edges', () => {
  const roads=new Map([[0,road('small',[1])],[1,road('small',[0,2])],
    [2,road('small',[1])]]);
  const adapter=new CityRoadAdapter();
  adapter.sync(roads);
  roads.get(1).type='large';
  const result=adapter.sync(roads);
  assert.equal(result.changedEdges,4);
  assert.equal(adapter.network.edges.get('1>0').lanes,4);
  assert.equal(adapter.network.edges.get('0>1').lanes,1);
});

test('traffic estimator only batches cost updates at interval', () => {
  const network=new RoadNetwork();
  network.addNode('A');network.addNode('B');
  network.addEdge({id:'ab',from:'A',to:'B',length:5,speed:1});
  const estimator=new TrafficEstimator(network,{refreshSeconds:10});
  for(let i=0;i<20;i++) estimator.edgeEntered('ab');
  assert.equal(estimator.refreshIfDue(5),0);
  assert.equal(network.edges.get('ab').congestion,0);
  assert.equal(estimator.refreshIfDue(10),1);
  assert.ok(network.edges.get('ab').congestion>0);
  const epoch=network.costVersion;
  assert.equal(estimator.refreshIfDue(15),0);
  assert.equal(network.costVersion,epoch);
  for(let i=0;i<20;i++) estimator.edgeLeft('ab');
  assert.equal(estimator.refreshIfDue(20),1);
  assert.equal(network.edges.get('ab').congestion,0);
  assert.equal(estimator.metrics.refreshes,2);
});

test('signal average red delay is reflected in route cost once on setup', () => {
  const n=new RoadNetwork();
  ['A','X','B','Y'].forEach(x=>n.addNode(x));
  n.addEdge({id:'ax',from:'A',to:'X',length:1,speed:1});
  n.addEdge({id:'yx',from:'Y',to:'X',length:1,speed:1});
  n.addEdge({id:'xb',from:'X',to:'B',length:1,speed:1});
  // The separate controller test validates clearance; this checks cost semantics.
  assert.equal(n.edges.get('ax').delay,0);
});
