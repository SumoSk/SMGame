// Large-store plot crop: all rotations, real trips, and existing saves.
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const current=fs.readFileSync('dist/game.js','utf8');
function boot(source=current){
 return new Function('require','source',prefix.replace("fs.readFileSync('dist/game.js','utf8')",'source')+';return boot().game;')(require,source);
}
function build(g,rotation){
 g.state.money=1e9;
 const line=g.lineCells(g.id(200,150),g.id(200,190));
 assert(g.buildRoad(line,'medium',true));
 for(const [a,b] of [[[200,190],[200,200]],[[150,200],[270,200]],[[270,200],[270,150]]])
  assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'medium',true));
 const H=g.CATALOG.shop_large.plotHeight;
 const [x,y]=rotation===0?[160,148-H]:rotation===1?[202,160]:
  rotation===2?[160,152]:[198-H,160];
 let b;
 for(let offset=0;offset<5&&!b;offset++)b=g.buildBuilding('shop_large',x+(rotation===1?-offset:rotation===3?offset:0),y,true,rotation);
 assert(b,'build rotation '+rotation);assert.equal(b.rotation,rotation);
 return b;
}
function step(g,until,limit=18000){
 g.state.speed=1;
 for(let n=0;n<limit&&!until();n++){g.state.time+=.04;g.advanceVehicles(.05,.04);}
 if(!until())console.log(JSON.stringify([...g.state.vehicles.values()].map(v=>({id:v.id,phase:v.phase,stop:v.stopReason,pos:v.pos,path:v.path.length,lot:v.lotBuilding,dist:v.lotDistance,slot:v.parkingSlot}))));
 assert(until(),'vehicle manoeuvre completed');
}
const reports=[];
for(let rotation=0;rotation<4;rotation++){
 const g=boot(),b=build(g,rotation),t=g.CATALOG.shop_large;
 assert.deepEqual([t.plotWidth,t.plotHeight,t.parkingCapacity,t.jobs,t.service],[8,11,40,8,32]);
 assert(b.shopCompactLotV1);
 const slots=g.lotSlots(b);
 assert.equal(slots.length,40);assert.equal(new Set(slots.map(s=>s.u+':'+s.v)).size,40);
 const home=g.buildBuilding('home_large',230,148-g.CATALOG.home_large.plotHeight,true,0);
 assert(home);const people=[];
 for(let n=0;n<8;n++){
  const c=g.newCitizen(home);people.push(c);home.residents.add(c.id);home.parked.add(c.id);g.parkingSpace(home,c.id,true);
  assert(g.createTrip(c,'leisure',home.id,b.id,null,null,null));
 }
 step(g,()=>b.parked.size===people.length);
 for(const c of people)assert(g.createTrip(c,'home',b.id,home.id,null,null,null));
 step(g,()=>home.parked.size===people.length&&g.state.vehicles.size===0);
 const before=[b.x,b.y],raw=g.snapshot();
 assert(g.loadGame(true,null,raw));const loaded=g.state.buildings.get(b.id);
 assert.deepEqual([loaded.x,loaded.y],before,'new saves never shift');
 assert(g.loadGame(true,null,g.snapshot()));
 assert.deepEqual([g.state.buildings.get(b.id).x,g.state.buildings.get(b.id).y],before);
 reports.push({rotation,arrivals:8,departures:8});
}
// Use a genuine previous-game save if provided by the local regression run.
const oldPath=process.argv[2];
const oldSource=oldPath?fs.readFileSync(oldPath,'utf8'):current.replace(
 'function buildingBounds(b){',
 "Object.assign(CATALOG.shop_large,{plotHeight:13,parkingZoneDepth:6.5,buildingZoneDepth:6.5,frontageV:12.43,parkingRearAisle:2.75,parkingAisle:5.60});\nfunction buildingBounds(b){");
for(let rotation=0;rotation<4;rotation++){
 const old=boot(oldSource),b=build(old,rotation);delete b.shopCompactLotV1;
 const beforeOrigin=[b.x,b.y];
 const gate=old.lotPoint(b,old.CATALOG.shop_large.frontageEntranceU,13);
 const home=old.buildBuilding('home_large',230,148-old.CATALOG.home_large.plotHeight,true,0);
 assert(home);
 const parked=old.newCitizen(home);home.residents.add(parked.id);b.parked.add(parked.id);
 parked.locationId=b.id;parked.location='shop';old.parkingSpace(b,parked.id,true);
 const entering=old.newCitizen(home);home.residents.add(entering.id);home.parked.add(entering.id);old.parkingSpace(home,entering.id,true);
 assert(old.createTrip(entering,'leisure',home.id,b.id,null,null,null));
 step(old,()=>[...old.state.vehicles.values()].some(v=>v.lotBuilding===b.id&&v.phase==='parking_in'));
 const saved=old.snapshot(),g=boot();assert(g.loadGame(true,null,saved),'previous save loads');
 const loaded=g.state.buildings.get(b.id),after=g.lotPoint(loaded,g.CATALOG.shop_large.frontageEntranceU,11);
 assert.deepEqual([after.x,after.y],[gate.x,gate.y],'street gate stays fixed');
 assert(loaded.parked.has(parked.id));assert(loaded.shopCompactLotV1);
 assert.deepEqual([loaded.x,loaded.y],[beforeOrigin[0]+(rotation===3?2:0),beforeOrigin[1]+(rotation===0?2:0)]);
 const reloaded=g.snapshot();assert(g.loadGame(true,null,reloaded));
 assert.deepEqual([g.state.buildings.get(b.id).x,g.state.buildings.get(b.id).y],[loaded.x,loaded.y],'migration once only');
 step(g,()=>g.state.buildings.get(b.id).parked.has(entering.id));
 for(const c of [parked,entering]){
  const citizen=g.state.citizens.get(c.id);
  assert(g.createTrip(citizen,'home',b.id,home.id,null,null,null));
 }
 step(g,()=>g.state.buildings.get(home.id).parked.size===2&&g.state.vehicles.size===0);
}
console.log(JSON.stringify({passed:true,plot:[8,11],parking:40,oldSaveMigration:true,reports}));
