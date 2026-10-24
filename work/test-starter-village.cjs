const fs=require('node:fs'),assert=require('node:assert/strict');
// This fixture executes actual page startup, including the default preset.
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('const angle=')[0];
const {game:g,context}=new Function('require',prefix+'return {game,context};')(require);
const checkVillage=()=>{
 assert.equal(g.state.buildings.size,12);assert.equal(g.state.citizens.size,18);assert.equal(g.state.money,500000);
 assert.equal(g.state.time,360);assert.equal(g.state.speed,1);
 const kinds=new Set([...g.state.buildings.values()].map(b=>g.CATALOG[b.key].kind));assert.equal(kinds.size,10);
 const homes=[...g.state.buildings.values()].filter(b=>g.CATALOG[b.key].kind==='home');assert.equal(homes.length,3);
 assert(homes.every(b=>b.residents.size===6&&b.parked.size===6&&b.parkingSlots.every(id=>id!=null)));
 assert([...g.state.roads.values()].every(r=>r.main?r.type==='medium':r.type==='small'));
 assert.equal(g.junction(g.id(164,150)),3,'small village access is a real T junction');
 const reached=new Set(),queue=[g.state.gates[0]];while(queue.length){const i=queue.pop();if(reached.has(i))continue;reached.add(i);for(const j of g.state.roads.get(i).links)queue.push(j);}assert.equal(reached.size,g.state.roads.size,'every starter street connects to city gates');
 for(const b of g.state.buildings.values()){
  assert(b.access.length>=2);const bounds=g.buildingBounds(b);
  for(let y=b.y;y<b.y+bounds.h;y++)for(let x=b.x;x<b.x+bounds.w;x++){assert.equal(g.state.buildGrid[g.id(x,y)],b.id);assert.equal(g.state.footprint[g.id(x,y)],-1,'plot must not overlap any road');}
  for(const c of g.state.buildings.values())if(c.id!==b.id)assert(g.tripRoute(b.id,c.id,null,null,1),'all starter destinations must be reachable without U-turns');
 }
};
assert.equal(g.state.city,'phuket');checkVillage();
for(const city of ['bangkok','chiangmai','korat']){g.startNewCity(city);assert.equal(g.state.city,city);checkVillage();}
for(const width of [393,834,1440]){const local=new Function('require',prefix.replace('innerWidth:1440','innerWidth:'+width)+'return game;')(require);assert(local.cam.z>(width<700?.94:1.24));const p=local.screen(169.5,138.5);assert(Math.abs(p[0]-width/2)<1e-6);assert(Math.abs(p[1]-900*(width<700?.29:.34))<1e-6,'village is framed above controls');}
// Existing saves restore their own map/camera and never receive free buildings.
g.reset();g.state.money=123456;g.cam.x=80;g.cam.y=170;g.cam.z=.75;const old=g.snapshot();
g.startNewCity();assert(g.loadGame(true,null,old));assert.equal(g.state.buildings.size,0);assert.equal(g.state.citizens.size,0);assert.equal(g.state.money,123456);assert.equal(g.cam.x,80);assert.equal(g.cam.z,.75);
g.startNewCity();for(let n=0;n<200;n++)g.tick(.05);g.validateSave(JSON.parse(g.snapshot()));
for(const v of g.state.vehicles.values()){const p=g.vehiclePosition(v);if(p)assert(Number.isFinite(p.x)&&Number.isFinite(p.y));}
console.log('Default starter village: 4 maps, 12 buildings, 18 residents, medium arterial/small loop, all destinations connected, responsive close camera, old saves retained.');
