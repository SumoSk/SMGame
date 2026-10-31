const fs=require('node:fs'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const results=[];
for(const population of [100,500,1000]){
 const{game:g}=new Function('require',fixture+'return boot();')(require);
 assert(g.startNewCity('london'));
 for(const c of [...g.state.citizens.values()].slice(population)){
  g.state.citizens.delete(c.id);
  for(const b of g.state.buildings.values()){
   b.residents.delete(c.id);b.workers.delete(c.id);b.parked.delete(c.id);b.visitors.delete(c.id);
   const i=b.parkingSlots.indexOf(c.id);if(i>=0)b.parkingSlots[i]=null;
  }
 }
 g.state.events=g.state.events.filter(e=>g.state.citizens.has(e.citizenId));g.eventHeapify();
 g.state.lastImmigration=1e9;g.state.speed=20;const end=g.state.time+1440,times=[],hours=Array.from({length:24},()=>({samples:0,cars:0}));
 while(g.state.time<end){
  const start=performance.now();g.tick(.2);times.push(performance.now()-start);
  const bucket=hours[Math.floor(g.state.time%1440/60)];bucket.samples++;bucket.cars+=g.state.vehicles.size;
  const owners=new Set();for(const v of g.state.vehicles.values())if(v.citizenId!=null){assert(!owners.has(v.citizenId),'duplicate vehicle');owners.add(v.citizenId);}
  for(const b of g.state.buildings.values()){assert(b.reservedService>=0);assert(b.parked.size<=g.CATALOG[b.key].parkingCapacity);}
  assert(Number.isFinite(g.state.money));
 }
 assert(g.ensurePerformance().previous);
 const raw=g.snapshot();assert(g.loadGame(true,null,raw));
 times.sort((a,b)=>a-b);
 results.push({population,medianTickMs:+times[Math.floor(times.length*.5)].toFixed(2),p95TickMs:+times[Math.floor(times.length*.95)].toFixed(2),finalPopulation:g.computeStats().pop,performance:g.ensurePerformance().official,incomeFactor:g.incomeFactor(),hourlyCars:hours.map(h=>h.samples?Math.round(h.cars/h.samples):0)});
}
console.log(JSON.stringify({passed:true,note:'Headless simulation timings; not GPU FPS. Original London layout is intentionally unchanged.',results},null,2));
