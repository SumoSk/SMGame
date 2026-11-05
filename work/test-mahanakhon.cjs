const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const t=g.CATALOG.home_mahanakhon;
 assert(t&&t.kind==='home'&&t.name==='ตึกมหานคร');
 assert.equal(t.cost,500000);assert.equal(t.parkingCapacity,80);
 assert.equal(t.residents,80);assert.deepEqual([t.plotWidth,t.plotHeight],[8,6]);
 assert.equal(t.frontageEntranceU,3);assert.equal(t.frontageExitU,5);
 assert.equal(t.frontageV,5.43);
 assert.equal(t.parkingRows,2);assert.equal(t.parkingPhysicalRows,4);
 // The shared sandbox boots a sample city. Start with no earned tower quota
 // for the unlock assertion; quota earning is exercised separately.
 g.state.buildingQuota.home_mahanakhon=0;
 assert.equal(g.buildingQuotaStatus('home_mahanakhon').locked,true,'Mahanakhon is locked until a grand house earns a build allowance');
 assert(g.buildingQuotaStatus('home_mahanakhon').message.includes('บ้านใหญ่'),'show the grand house prerequisite');
 assert(g.dockItems('home').some(x=>x.key==='home_mahanakhon'),'must appear in homes');
 const b={key:t.key,x:20,y:20,rotation:0,parkingSlots:Array(80).fill(null)};
 const slots=g.lotSlots(b);
 assert.equal(slots.length,80);assert.equal(new Set(slots.map(s=>s.index)).size,80);
 for(let i=0;i<80;i++){
  assert(slots[i].u>.75&&slots[i].u<7.2);
  assert(slots[i].v>.65&&slots[i].v<4.6);
  for(let j=0;j<i;j++)assert(!g.lotCarsOverlap(g.parkingSlotPose(b,i),g.parkingSlotPose(b,j),.015),
   'bay '+i+' overlaps '+j);
 }
 for(const u of [2.83,5.17])for(const v of [.17,4.95])for(const s of slots)
  assert(Math.abs(s.u-u)>.36||Math.abs(s.v-v)>.46,'pillar would hit parked car');
 for(let rot=0;rot<4;rot++){
  const copy={...b,rotation:rot},bounds=g.buildingBounds(copy);
  assert.deepEqual([bounds.w,bounds.h],rot%2?[6,8]:[8,6]);
  for(let i=0;i<80;i++){const p=g.parkingSlotPose(copy,i);
   assert(p.x>copy.x&&p.x<copy.x+bounds.w+1&&p.y>copy.y&&p.y<copy.y+bounds.h+1);
  }
 }
 const marks=g.parkingVisuals(b);assert(marks.length>240);
 assert(marks.some(x=>x.color==='#515f62'&&x.w>7.8&&x.h>5.8),'continuous asphalt');
 assert(!marks.some(x=>['#bdc6ae','#d7cfbc','#96af8f'].includes(x.color)),'no old white base');
 assert(marks.every(r=>r.w>0&&r.h>0&&Number.isFinite(r.w+r.h)));
 g.state.money=1e9;
 // Model/parking exercise uses a pre-earned quota; actual earning and
 // consumption are covered by test-building-quota.cjs.
 g.state.buildingQuota.home_mahanakhon=1;
 const before=g.state.money;
 const home=g.buildBuilding('home_mahanakhon',160,142,true);
 assert(home,'two authentic street gates are required');
 assert.equal(home.access.length,2);assert.equal(home.parkingSlots.length,80);
 assert.equal(g.state.money,before-500000);
 const resident=g.newCitizen(home);
 assert(g.createTrip(resident,'moveIn',null,home.id,g.id(155,150),null,null));
 for(let tick=0;tick<9000&&!home.parked.has(resident.id);tick++){
  g.state.time+=.04;g.advanceVehicles(.05,.04);
 }
 assert(home.parked.has(resident.id),'resident should actually reach a ground-floor bay');
 const snapshot=g.snapshot();assert(g.loadGame(true,null,snapshot));
 const old=JSON.parse(snapshot),building=old.buildings.find(([id])=>id===home.id)[1];
 building.mahanakhonCompactPlotV2=false;building.x-=1;building.y-=4;
 assert(g.loadGame(true,null,JSON.stringify(old)),'10x10 save must migrate to 8x6');
 const restored=g.state.buildings.get(home.id);
 assert.equal(restored.x,home.x);assert.equal(restored.y,home.y);
 assert.equal(restored.parkingSlots.length,80);
 assert.equal(g.state.buildings.get(home.id).key,'home_mahanakhon');
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;
 const batch=new Batch();renderer.building(batch,home,g.CATALOG,{});
 const pieces=[...batch.data.values()].flatMap(x=>x.items);
 assert(pieces.length>360,'short pixel tower must stay detailed');
 assert(Math.max(...pieces.map(p=>p.y))<11,'quarter-height tower');
 assert(pieces.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
 console.log(JSON.stringify({passed:true,tower:'Mahanakhon',cost:t.cost,bays:80,plot:[8,6],rotation:4,save:true,driving:true,mesh:pieces.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
