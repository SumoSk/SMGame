import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadNetwork, TrafficEngine } from '../traffic-core.mjs';

function assertLanes(engine) {
  const state=engine.snapshot();
  const groups=new Map();
  for(const v of state.vehicles) if(v.status==='moving') {
    const key=v.edgeId+':'+v.lane;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(v);
  }
  for(const [key,cars] of groups) {
    cars.sort((a,b)=>b.distance-a.distance);
    for(let i=1;i<cars.length;i++)
      assert.ok(cars[i-1].distance-cars[i].distance>=1.05-1e-8,
        'overlap on '+key);
  }
}

test('two approaching flows wait for their respective green phases without overlap', () => {
  const road=new RoadNetwork();
  for(const node of ['W','N','X','E','S'])road.addNode(node);
  for(const [id,from,to,length,lanes] of [
    ['wx','W','X',150,2],['nx','N','X',150,2],
    ['xe','X','E',250,2],['xs','X','S',250,2]
  ])road.addEdge({id,from,to,length,lanes,speed:5});
  const engine=new TrafficEngine(road);
  engine.configureSignal('X',[
    {incomingEdges:['wx'],duration:5},
    {incomingEdges:['nx'],duration:5}
  ]);
  for(let i=0;i<100;i++){
    engine.planTrip({id:'w'+i,from:'W',to:'E'});
    engine.planTrip({id:'n'+i,from:'N',to:'S'});
  }
  for(let i=0;i<300;i++) {
    engine.runSteps(1);
    if(i%5===0)assertLanes(engine);
  }
  assert.equal(engine.metrics.failed,0);
  assert.ok(engine.junctions.metrics.entered>0);
  assert.ok(engine.junctions.metrics.deniedSignal>0);
});

test('five to two lane merge maintains gap while cars transfer at bottleneck',()=>{
  const road=new RoadNetwork();
  for(const node of ['A','B','C'])road.addNode(node);
  road.addEdge({id:'ab',from:'A',to:'B',length:300,speed:3,lanes:5});
  road.addEdge({id:'bc',from:'B',to:'C',length:300,speed:3,lanes:2});
  const engine=new TrafficEngine(road);
  for(let i=0;i<120;i++)engine.planTrip({id:i,from:'A',to:'C'});
  for(let i=0;i<650;i++){
    engine.runSteps(1);
    if(i%10===0)assertLanes(engine);
  }
  assert.equal(engine.metrics.failed,0);
  assert.ok(engine.junctions.metrics.entered>0);
});

test('a newly forbidden turn is never used; vehicle fails safely if no alternative',()=>{
  const road=new RoadNetwork();
  for(const node of ['A','X','B'])road.addNode(node);
  road.addEdge({id:'ax',from:'A',to:'X',length:2,speed:1});
  road.addEdge({id:'xb',from:'X',to:'B',length:2,speed:1});
  const failures=[];
  const engine=new TrafficEngine(road,{onFailure:(_,reason)=>failures.push(reason)});
  engine.planTrip({id:'v',from:'A',to:'B'});
  engine.runSteps(2);
  road.forbidTurn('ax','xb');
  engine.runSteps(30);
  assert.equal(engine.vehicles.size,0);
  assert.deepEqual(failures,['route_invalidated']);
});
