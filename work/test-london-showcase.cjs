const assert=require('node:assert/strict'),fs=require('node:fs');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g,get}=new Function('require',fixture+'return boot();')(require);
const original=g.snapshot();
const started=Date.now();
const city=g.startNewCity('london');
assert(city,'London city must initialize');
assert.equal(g.state.city,'london');
assert.equal(g.computeStats().pop,1000,'Actual people, not a display-only counter');
assert.equal(g.state.citizens.size,1000);
assert.equal(g.state.speed,0,'Large preset starts paused');
assert.equal(g.state.buildings.size,36,'All 36 blocks must be populated');
assert(g.state.plantedTrees.length>=100,'London scenery should be planted');
assert(g.state.roads.size>1500,'London must have a real connected road grid');
const homes=[...g.state.buildings.values()].filter(b=>g.CATALOG[b.key].kind==='home');
assert.equal(homes.length,17,'16 grand homes and one 40-person duplex');
assert.equal(homes.reduce((n,b)=>n+b.residents.size,0),1000);
const jobs=[...g.state.buildings.values()].reduce((n,b)=>n+g.CATALOG[b.key].jobs,0);
assert(jobs>=750,'City should have enough jobs for normal citizen traits');
for(const b of g.state.buildings.values()){
 assert(b.access.length>=2,'Every plot needs access: '+b.key);
 assert(b.access.every(a=>g.state.roads.has(a.node)));
 for(const c of b.residents)assert(b.parked.has(c),'Resident starts in correct parking');
}
const queue=[g.state.gates[0]],visited=new Set();
while(queue.length){
 const node=queue.pop();if(visited.has(node))continue;visited.add(node);
 for(const next of g.state.roads.get(node).links)queue.push(next);
}
assert.equal(visited.size,g.state.roads.size,'All London streets must reach the highway');
for(const b of [...g.state.buildings.values()].slice(0,12)){
 for(const c of [...g.state.buildings.values()].slice(-12)){
  if(b.id!==c.id)assert(g.tripRoute(b.id,c.id,null,null,1),'London plot pairs need routes: '+b.id+' to '+c.id);
 }
}
g.state.speed=1;
for(let n=0;n<4;n++)g.tick(.05);
assert.equal(g.computeStats().pop,1000,'Brief simulation should preserve 1,000 citizens');
g.state.speed=0;
const snap=g.snapshot();
assert.doesNotThrow(()=>g.validateSave(JSON.parse(snap)));
assert.equal(g.loadGame(true,null,snap),true,'London must reload with normal save code');
assert.equal(g.state.citizens.size,1000);
assert.equal(g.state.plantedTrees.length>=100,true);
g.startNewCity('phuket');
assert.equal(g.computeStats().pop,18,'Original city preset must stay the same');
assert.equal(g.state.buildings.size,12);
assert.equal(g.loadGame(true,null,original),true,'Original saves stay compatible');
console.log('PASS London showcase: 1000 people, 36 buildings, roads, landscaping, save/load, unchanged original; elapsed '+(Date.now()-started)+' ms');