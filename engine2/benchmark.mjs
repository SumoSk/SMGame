// Node-only performance diagnostic; NOT a browser FPS benchmark.
import { performance } from 'node:perf_hooks';
import { RoadNetwork, TrafficEngine } from './traffic-core.mjs';

const network=new RoadNetwork();
for(let i=0;i<20;i++){
  network.addNode('from'+i,{x:0,y:i});
  network.addNode('to'+i,{x:500,y:i});
  network.addEdge({id:'road'+i,from:'from'+i,to:'to'+i,
    length:500,speed:1,lanes:4});
}
const engine=new TrafficEngine(network,{maxVehicles:1000});
for(let i=0;i<1000;i++){
  const road=i%20;
  engine.planTrip({id:'vehicle'+i,from:'from'+road,to:'to'+road});
}
engine.runSteps(100);
const samples=[];
for(let i=0;i<750;i++){
  const start=performance.now();
  engine.runSteps(1);
  samples.push(performance.now()-start);
}
samples.sort((a,b)=>a-b);
const result={
  totalCars:1000,active:engine.vehicles.size,completed:engine.metrics.completed,
  networkEdges:network.edges.size,stepsMeasured:samples.length,
  meanStepMs:samples.reduce((a,b)=>a+b,0)/samples.length,
  medianStepMs:samples[Math.floor(samples.length*.5)],
  p95StepMs:samples[Math.floor(samples.length*.95)],
  p99StepMs:samples[Math.floor(samples.length*.99)],
  routeSearches:network.metrics.searches,cacheHits:network.metrics.cacheHits,
  maxHeapUsedMb:process.memoryUsage().heapUsed/1024/1024
};
console.log('TRAFFIC2_BENCHMARK '+JSON.stringify(result));
if(engine.vehicles.size!==1000||engine.metrics.failed>0)
  throw Error('simulation failed 1000-car benchmark');
