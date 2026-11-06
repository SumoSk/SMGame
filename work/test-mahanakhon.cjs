const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const t=g.CATALOG.home_mahanakhon;
 assert(t&&t.kind==='home'&&t.name==='ตึกมหานคร');
 assert.equal(t.cost,500000);assert.equal(t.parkingCapacity,80);
 assert.equal(t.residents,80);assert.deepEqual([t.plotWidth,t.plotHeight],[14,8]);
 assert.equal(t.frontageEntranceU,6);assert.equal(t.frontageExitU,8);
 assert.equal(t.frontageV,7.43);assert.equal(t.parkingPitch,.55);
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
  assert(slots[i].u>1.5&&slots[i].u<12.1);
  assert(slots[i].v>1.2&&slots[i].v<5.8);
  for(let j=0;j<i;j++)assert(!g.lotCarsOverlap(g.parkingSlotPose(b,i),g.parkingSlotPose(b,j),.015),
   'bay '+i+' overlaps '+j);
 }
 for(const u of [4.95,9.05])for(const v of [.50,7.05])for(const s of slots)
  assert(Math.abs(s.u-u)>.36||Math.abs(s.v-v)>.46,'pillar would hit parked car');
 for(let rot=0;rot<4;rot++){
  const copy={...b,rotation:rot},bounds=g.buildingBounds(copy);
  assert.deepEqual([bounds.w,bounds.h],rot%2?[8,14]:[14,8]);
  for(let i=0;i<80;i++){const p=g.parkingSlotPose(copy,i);
   assert(p.x>copy.x&&p.x<copy.x+bounds.w+1&&p.y>copy.y&&p.y<copy.y+bounds.h+1);
  }
 }
 const marks=g.parkingVisuals(b);assert(marks.length>240);
 assert(marks.some(x=>x.color==='#515f62'&&x.w>13.8&&x.h>7.8),'continuous asphalt');
 assert(!marks.some(x=>['#bdc6ae','#d7cfbc','#96af8f'].includes(x.color)),'no old white base');
 assert(marks.every(r=>r.w>0&&r.h>0&&Number.isFinite(r.w+r.h)));
 g.state.money=1e9;
 // Model/parking exercise uses a pre-earned quota; actual earning and
 // consumption are covered by test-building-quota.cjs.
 g.state.buildingQuota.home_mahanakhon=1;
 const before=g.state.money;
 const home=g.buildBuilding('home_mahanakhon',160,140,true);
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
 // Rebuild a previously saved 8x6 court at the same city-road gate positions.
 building.mahanakhonExpandedPlotV3=false;
 building.mahanakhonCompactPlotV2=true;
 building.x+=3;building.y+=2;
 assert(g.loadGame(true,null,JSON.stringify(old)),'old 8x6 city loads');
 const restored=g.state.buildings.get(home.id);
 assert.equal(restored.parkingSlots.length,80);
 assert(['home_mahanakhon','home_mahanakhon_compact'].includes(restored.key));
 if(restored.key==='home_mahanakhon'){
  assert.equal(restored.x,home.x);assert.equal(restored.y,home.y);
 }
 // An old tower crowded by another building must retain its original
 // parking area instead of overwriting its neighbour or their cars.
 const crowded=JSON.parse(snapshot),small=crowded.buildings.find(([id])=>id===home.id)[1];
 small.mahanakhonExpandedPlotV3=false;small.mahanakhonCompactPlotV2=true;
 small.x+=3;small.y+=2;
 const obstruction={...JSON.parse(JSON.stringify(small)),key:'home_starter',id:999999,
  x:small.x-3,y:small.y,parkingSlots:Array(6).fill(null),
  residents:[],workers:[],visitors:[],parked:[],access:[],queue:[],rotation:0};
 crowded.buildings.push([obstruction.id,obstruction]);
 assert(g.loadGame(true,null,JSON.stringify(crowded)),'crowded old city loads');
 assert.equal(g.state.buildings.get(home.id).key,'home_mahanakhon_compact');
 assert(g.state.buildings.has(obstruction.id));
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;
 const batch=new Batch();renderer.building(batch,home,g.CATALOG,{});
 const pieces=[...batch.data.values()].flatMap(x=>x.items);
 assert(pieces.length>360,'short pixel tower must stay detailed');
 assert(Math.max(...pieces.map(p=>p.y))<11.6,'14-floor slim Mahanakhon height');
 assert(pieces.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
 // Test cavity volumes, not just darker panels: these two carved cells
 // must remain empty through the centre of their respective storeys.
 const contains=(p,x,y,z)=>Math.abs(p.x-x)<p.sx/2-.002&&
  Math.abs(p.y-y)<p.sy/2-.002&&Math.abs(p.z-z)<p.sz/2-.002;
 for(const [floor,col,row] of [[0,2,5],[1,4,4]]){
  const x=home.x+t.plotWidth/2-1.30+(col+.5)*(2.60/6);
  const z=home.y+t.plotHeight/2-1.525+(row+.5)*(3.05/6);
  const y=1.50+(floor+.5)*.66;
  assert(!pieces.some(p=>contains(p,x,y,z)),'pixel setback contains a hidden solid core');
 }
 assert(pieces.some(p=>Math.abs(p.x-(home.x+t.plotWidth/2))<.01&&
  Math.abs(p.z-(home.y+3.43-.035))<.01&&p.sx===2.60&&p.sy===1.46),
  'rear enclosure must drop continuously from the soffit');
 assert(pieces.some(p=>contains(p,home.x+7,1.63,home.y+1.50)),
  'rear canopy must cover the open rear court');
 const frontCutX=home.x+7-1.30+2.5*(2.60/6);
 const frontCutZ=home.y+4-1.525+4.5*(3.05/6);
 assert(!pieces.some(p=>contains(p,frontCutX,1.50+6.5*.66,frontCutZ)),
  'street-facing middle floors need a genuine open setback');
 const roofY=1.50+14*.66;
 assert(pieces.some(p=>Math.abs(p.y-(roofY+.198))<.001&&p.sx===1.07&&p.sz===.88),
  'observation crown must include a projecting glass tray');
 assert(pieces.some(p=>Math.abs(p.y-(roofY+.17+.55/2))<.001&&p.sy===.55),
  'observation crown must have a stepped raised Peak');
 // Keep both gates and the continuous cross-front arrival route free of
 // the new fence, entrance lamps, trees and planting troughs.
 const decorColors=new Set(['#bdc7bb','#527065','#4a635c','#3e5d59','#dfc8a1',
  '#bac5b4','#516b4b','#7b644f','#638d67','#87a57a','#abbca1','#6f936e']);
 const decorations=[...batch.data.values()].filter(g=>decorColors.has(g.color)).flatMap(g=>g.items);
 assert(decorations.length>70,'court must have real perimeter landscaping');
 for(const p of decorations){
  assert(!(Math.abs(p.z-(home.y+t.frontageV))<p.sz/2+.20&&
   p.x+p.sx/2>home.x+.25&&p.x-p.sx/2<home.x+6.20),
   'landscaping must not cover the incoming cross-front driveway');
  for(const u of [t.frontageEntranceU,t.frontageExitU])
   assert(!(Math.abs(p.x-(home.x+u))<p.sx/2+.24&&
    p.z+p.sz/2>home.y+7.15),'gate must remain open');
 }

 // Never rebuild the old side wings or wide parking-table canopy.
 const cx=t.plotWidth/2,cz=t.plotHeight/2;
 const basePieces=pieces.filter(p=>p.y>1.05&&p.y<1.54&&(p.sy||0)<.35);
 assert(basePieces.length>=2,'tower needs its own slim supporting trim');
 assert(basePieces.every(p=>(p.sx||0)<=3.10&&((p.sz||0)<=3.38||(p.sx||0)<=.13)),
  'only the narrow parking enclosure fascia may extend along the existing rear/front canopies');
 // Structural piers must not occupy any of the eighty actual parking bays.
 const supportV=3.43;
 for(const u of [cx-.90,cx+.90])for(const slot of slots)
  assert(Math.abs(slot.u-u)>.35||Math.abs(slot.v-supportV)>.44,
   'new pier would collide with a full-size parked car');
 // The protruding road-front door was removed at user request.
 // No elevated mesh is allowed at its former position; the existing
 // road/parking surface (about y=.1) is unchanged.
 const lobbyU=(t.frontageEntranceU+t.frontageExitU)/2+.10,lobbyV=t.plotHeight-.18;
 assert(!pieces.some(p=>Math.abs(p.x-(home.x+lobbyU))<.47&&
  Math.abs(p.z-(home.y+lobbyV))<.18&&p.y>.27&&p.y<1.26),
  'no front-door geometry may remain at the road-facing parcel edge');
 const legacyBuilding={...home,key:'home_mahanakhon_compact',x:20,y:20,rotation:0};
 const compactBatch=new Batch();
 renderer.building(compactBatch,legacyBuilding,g.CATALOG,{});
 const compactPieces=[...compactBatch.data.values()].flatMap(x=>x.items);
 const oldBase=compactPieces.filter(p=>p.y>1.05&&p.y<1.54&&(p.sy||0)<.35);
 assert(oldBase.every(p=>(p.sx||0)<=3.10&&((p.sz||0)<=3.38||(p.sx||0)<=.13)),
  'saved compact towers must not regain the side wings');

 console.log(JSON.stringify({passed:true,tower:'Mahanakhon',cost:t.cost,bays:80,plot:[14,8],rotation:4,save:true,driving:true,mesh:pieces.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});

