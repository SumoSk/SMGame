import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadNetwork, TrafficEngine } from '../traffic-core.mjs';
import { ParkingController } from '../parking-controller.mjs';
import { TripManager } from '../trip-manager.mjs';

function setup(capacity=1) {
  const n=new RoadNetwork(); n.addNode('home'); n.addNode('mall');
  n.addEdge({id:'road',from:'home',to:'mall',length:3,speed:2,lanes:2});
  const engine=new TrafficEngine(n);
  const parking=new ParkingController(); parking.register('mall',capacity);
  const trips=new TripManager(engine,{parking});
  return {engine,parking,trips};
}

test('destination parking must be reserved before a trip is dispatched', () => {
  const {engine,parking,trips}=setup(1);
  assert.equal(trips.schedule({tripId:'a',citizenId:1,originNode:'home',
    destinationNode:'mall',destinationBuildingId:'mall'}).status,'scheduled');
  assert.equal(trips.schedule({tripId:'b',citizenId:2,originNode:'home',
    destinationNode:'mall',destinationBuildingId:'mall'}).status,'waiting_parking');
  engine.runSteps(10);
  assert.equal(parking.isReserved('mall','a'),true);
  assert.equal(engine.vehicles.has('b'),false);
  assert.equal(engine.pending.has('b'),false);
  engine.runSteps(18);
  assert.equal(trips.get('a').status,'completed');
  assert.equal(parking.isReserved('mall','a'),true);
  assert.equal(trips.get('b').status,'waiting_parking');
  assert.equal(trips.releaseParking('a'),true);
  assert.equal(trips.get('b').status,'scheduled');
  engine.runSteps(20);
  assert.equal(trips.get('b').status,'completed');
  assert.equal(parking.isReserved('mall','b'),true);
});

test('cancel a waiting parking request frees actor without creating any vehicle', () => {
  const {engine,parking,trips}=setup(1);
  trips.schedule({tripId:'a',citizenId:1,originNode:'home',destinationNode:'mall',
    destinationBuildingId:'mall'});
  trips.schedule({tripId:'b',citizenId:2,originNode:'home',destinationNode:'mall',
    destinationBuildingId:'mall'});
  assert.equal(trips.cancelCitizen(2),true);
  assert.equal(trips.get('b').status,'canceled');
  trips.releaseParking('a');
  engine.runSteps(10);
  assert.equal(engine.issuedIds.has('b'),false);
  assert.equal(parking.snapshot()[0].occupied,0);
});

test('demolition fails queued and active destination trips without stale reservations', () => {
  const {engine,parking,trips}=setup(1);
  trips.schedule({tripId:'a',citizenId:1,originNode:'home',destinationNode:'mall',
    destinationBuildingId:'mall'});
  trips.schedule({tripId:'b',citizenId:2,originNode:'home',destinationNode:'mall',
    destinationBuildingId:'mall'});
  engine.runSteps(2);
  parking.remove('mall');
  assert.equal(trips.get('a').status,'failed');
  assert.equal(trips.get('b').status,'failed');
  assert.equal(trips.activeByCitizen.size,0);
  assert.equal(engine.vehicles.size,0);
});
