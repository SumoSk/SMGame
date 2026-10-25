import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadNetwork, TrafficEngine } from '../traffic-core.mjs';
import { TripManager } from '../trip-manager.mjs';

function simple({ reachable = true } = {}) {
  const roads = new RoadNetwork();
  ['home','office','shop'].forEach(id => roads.addNode(id));
  roads.addEdge({id:'home-office',from:'home',to:'office',length:1,speed:2});
  if (reachable) roads.addEdge({id:'office-shop',from:'office',to:'shop',length:1,speed:2});
  return new TrafficEngine(roads);
}

test('one actor has one scheduled or driving trip; arrival frees the actor', () => {
  const engine = simple(), done = [];
  const trips = new TripManager(engine, { onCompleted: t => done.push(t) });
  trips.schedule({tripId:'morning',citizenId:11,originNode:'home',
    destinationNode:'office',departureAt:2,purpose:'work'});
  assert.throws(() => trips.schedule({tripId:'duplicate',citizenId:11,
    originNode:'home',destinationNode:'office',departureAt:2}));
  engine.runSteps(9);
  assert.equal(trips.get('morning').status,'scheduled');
  engine.runSteps(12);
  assert.equal(trips.get('morning').status,'completed');
  assert.equal(done.length,1);
  assert.equal(done[0].purpose,'work');
  assert.equal(trips.activeByCitizen.has(11),false);
  trips.schedule({tripId:'lunch',citizenId:11,originNode:'office',
    destinationNode:'shop',departureAt:engine.time});
  assert.equal(trips.get('lunch').status,'scheduled');
});

test('cancelling a future trip never spawns it after its scheduled time', () => {
  const engine = simple(), canceled = [];
  const trips = new TripManager(engine, {onCanceled: t => canceled.push(t)});
  trips.schedule({tripId:'future',citizenId:22,originNode:'home',
    destinationNode:'shop',departureAt:5});
  assert.equal(trips.cancelCitizen(22,'building_demolished'),true);
  engine.runSteps(100);
  assert.equal(engine.vehicles.size,0);
  assert.equal(trips.get('future').status,'canceled');
  assert.equal(canceled[0].error,'building_demolished');
  assert.equal(trips.cancelCitizen(22),false);
});

test('unreachable destination reports failure without retrying every frame', () => {
  const engine = simple({reachable:false}), failed = [];
  const trips = new TripManager(engine, {onFailed: t => failed.push(t)});
  trips.schedule({tripId:'lost',citizenId:1,originNode:'home',destinationNode:'shop'});
  engine.runSteps(10);
  assert.equal(engine.metrics.routePlans,1);
  assert.equal(failed.length,1);
  assert.equal(failed[0].error,'unreachable');
  assert.equal(trips.activeByCitizen.size,0);
});

test('cancelling moving trip clears the car and no stale departure occurs', () => {
  const engine = simple(), trips = new TripManager(engine);
  trips.schedule({tripId:'driving',citizenId:99,originNode:'home',destinationNode:'shop'});
  engine.runSteps(3);
  assert.equal(trips.get('driving').status,'driving');
  assert.equal(trips.cancel('driving'),true);
  assert.equal(engine.vehicles.size,0);
  engine.runSteps(10);
  assert.equal(engine.vehicles.size,0);
});

test('completed histories are bounded while active actors are never evicted', () => {
  const engine = simple(), trips = new TripManager(engine, {historyLimit:2});
  for(let i=0;i<4;i++) {
    trips.schedule({tripId:'trip'+i,citizenId:i,originNode:'home',destinationNode:'home'});
    engine.runSteps(1);
  }
  assert.equal(trips.trips.size,2);
  assert.equal(trips.activeByCitizen.size,0);
});
