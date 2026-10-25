import test from 'node:test';
import assert from 'node:assert/strict';
import { CityRoadAdapter } from '../city-road-adapter.mjs';
import { CitizenTripAdapter } from '../citizen-trip-adapter.mjs';
import { ParkingController } from '../parking-controller.mjs';
import { TrafficEngine } from '../traffic-core.mjs';
import { TripManager } from '../trip-manager.mjs';

const makeCity=()=>{
  const roads=new Map();
  for(let i=0;i<=4;i++)roads.set(i,{
    type:'small',links:new Set([i-1,i+1].filter(x=>x>=0&&x<=4))
  });
  const buildings=new Map([
    ['home',{access:[{node:0,exit:true,next:[1]}]}],
    ['shop',{access:[{node:4,entry:true,prev:[3]}]}]
  ]);
  return {roads,buildings};
};
const setup=()=>{
  const city=makeCity(),roadAdapter=new CityRoadAdapter({gridWidth:300});
  roadAdapter.sync(city.roads);
  const engine=new TrafficEngine(roadAdapter.network);
  const parking=new ParkingController();parking.register('shop',1);
  const trips=new TripManager(engine,{parking});
  const citizens=new CitizenTripAdapter({trips,city});
  return {city,roadAdapter,engine,parking,trips,citizens};
};

test('intention -> legal road path -> parking reservation -> arrival',()=>{
  const {engine,parking,trips,citizens}=setup();
  const first=citizens.request({tripId:'m1',citizenId:'c1',
    fromBuildingId:'home',toBuildingId:'shop',purpose:'leisure'});
  assert.equal(first.accepted,true);
  assert.equal(first.plannedEdges[0],'0>1');
  assert.equal(first.plannedEdges.at(-1),'3>4');
  const second=citizens.request({tripId:'m2',citizenId:'c2',
    fromBuildingId:'home',toBuildingId:'shop'});
  assert.equal(second.accepted,true);
  assert.equal(second.trip.status,'waiting_parking');
  engine.runSteps(70);
  assert.equal(trips.get('m1').status,'completed');
  assert.equal(trips.get('m2').status,'waiting_parking');
  assert.equal(parking.isReserved('shop','m1'),true);
  trips.releaseParking('m1');
  engine.runSteps(70);
  assert.equal(trips.get('m2').status,'completed');
  assert.equal(engine.metrics.failed,0);
});

test('illegal destination approach is rejected, not silently bypassed',()=>{
  const {city,citizens}=setup();
  city.buildings.get('shop').access[0].prev=[99];
  const result=citizens.request({tripId:'m1',citizenId:'c1',
    fromBuildingId:'home',toBuildingId:'shop'});
  assert.deepEqual(result,{accepted:false,reason:'no_legal_access'});
});

test('access constraints are independently cached and enforced',()=>{
  const {roadAdapter}=setup(), network=roadAdapter.network;
  assert.ok(network.route(0,4,null,{firstEdgeIds:['0>1'],
    lastEdgeIds:['3>4']}));
  assert.equal(network.route(0,4,null,{firstEdgeIds:['1>0'],
    lastEdgeIds:['3>4']}),null);
});
