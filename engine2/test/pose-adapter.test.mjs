import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadNetwork } from '../traffic-core.mjs';
import { edgePose, vehiclePose } from '../pose-adapter.mjs';

const n=new RoadNetwork();
n.addNode('west',{x:0,y:0});
n.addNode('mid',{x:10,y:0});
n.addNode('north',{x:10,y:-10});
n.addEdge({id:'west-mid',from:'west',to:'mid',length:10,speed:1,lanes:2});
n.addEdge({id:'mid-north',from:'mid',to:'north',length:10,speed:1,lanes:2});

test('left-hand lane placement is parallel and respects route progress',()=>{
  const inner=edgePose(n,'west-mid',5,0);
  const outer=edgePose(n,'west-mid',5,1);
  assert.equal(inner.x,5);
  assert.ok(inner.y>0);
  assert.ok(outer.y>inner.y);
  assert.equal(inner.angle,0);
  assert.equal(edgePose(n,'absent',3,0),null);
});

test('turn visual transition smoothly connects incoming and outgoing lane positions',()=>{
  const v={route:['west-mid','mid-north'],edgeIndex:1,lane:0,
    distance:0,turnTransition:{fromEdgeId:'west-mid',fromLane:0,at:1}};
  const start=vehiclePose(n,v,1);
  const mid=vehiclePose(n,v,1.3);
  const end=vehiclePose(n,v,1.7);
  assert.ok(start.x<=10&&start.x>=9.99);
  assert.ok(mid.x<start.x);
  assert.ok(Math.abs(end.x-10.16)<.001);
  assert.notEqual(start.angle,end.angle);
});

test('pose adapter operates on lightweight snapshots as well as active objects',()=>{
  const snapshot={edgeId:'west-mid',lane:1,distance:2,turnTransition:null};
  const pose=vehiclePose(n,snapshot,10);
  assert.equal(pose.x,2);
  assert.ok(Number.isFinite(pose.y));
});
