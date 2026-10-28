// Thai 7-Eleven branded glass convenience-shop geometry and performance checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const code=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',code+';return {TrafficRenderer,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const specs=[['shop_small',6,8,10,2,8,1],
  ['shop_medium',8,8,20,4,16,2],['shop_large',8,11,40,8,32,3]];
 const rows=[];
 for(const [key,W,H,parking,jobs,service,blocks] of specs){
  const t=g.CATALOG[key];
  assert.deepEqual([t.plotWidth,t.plotHeight,t.parkingCapacity,t.jobs,t.service],
   [W,H,parking,jobs,service],'unchanged shopping and parking program '+key);
  assert.equal(g.lotSlots({key}).length,parking);
  if(key==='shop_large'){
   // Paint and vehicle waypoints share the two compact-plot aisles.
   assert.equal(t.parkingRearAisle,2.05);
   assert.equal(t.parkingAisle,4.90);
   assert.equal(t.parkingRowOffset,.79);
   const slots=g.lotSlots({key});
   assert.equal(slots.length,40,'40 real parking bays retained');
   assert(Math.max(...slots.map(s=>s.v))<6.5,'all parked cars clear the shop frontage');
  }
  let digest;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,x:40,y:50,id:127,rotation,parked:new Set(),
    parkingSlots:Array(parking).fill(null)},batch=new Batch();
   r.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(v=>v.items.map(i=>({...i,color:v.color,
    finish:v.finish,glow:v.glow,geo:v.geo})));
   assert(items.length>90&&items.length<850,key+' Low-poly shape budget');
   const countColor=color=>items.filter(x=>x.color===color).length;
   if(key==='shop_small')assert(!items.some(i=>i.color==='#ff7f00'&&i.y>1.85&&i.y<2.15&&i.sx>2),
    'small shop must have its brand sign only above the roof, not on its facade');
   assert(countColor('#ff7f00')>=blocks+1,'orange 7-brand stripe missing');
   assert(countColor('#006940')>=blocks+1,'dark-green 7-ELEVEN wordmark missing');
   assert(countColor('#ed1b34')>=blocks+1,'red 7 brandmark missing');
   assert(items.filter(x=>x.finish==='glass'&&!x.glow).length>=blocks*3,
    'each unit must have visible glass frontage');
   const baseLights=items.filter(x=>x.finish==='shop-night-essential');
   const detailLights=items.filter(x=>x.finish==='shop-night-detail');
   assert(baseLights.length>=blocks*5,'night essentials must survive Low');
   assert(detailLights.length>=blocks*2,'premium lit fascia needs optional accents');
   assert(baseLights.every(x=>x.glow)&&detailLights.every(x=>x.glow));
   // The primary crest is physically ABOVE the roof FRONT, not just painted
   // on the facade. Solar panels exist on ALL tiers, including the Low preset.
   const rooftop=items.filter(x=>x.finish==='shop-brand-essential'&&x.y>2.0);
   assert(rooftop.some(x=>x.color==='#ed1b34'),
    key+' missing raised rooftop red seven');
   assert(rooftop.some(x=>x.color==='#006940'),
    key+' missing readable roof-mounted green billboard');
   assert(items.some(x=>x.finish==='shop-roof-essential'&&x.color==='#183a4c'),
    key+' must contain blue-black solar cells on the roof');
   // Inspect FULL rotated primitives. Checking only mesh centres misses
   // canopies, logos and cylindrical decorations overhanging road lanes.
   const uv=(pt)=>{
    const x=pt.x-b.x,z=pt.z-b.y;
    return rotation===0?[x,z]:rotation===1?[z,H-x]:
     rotation===2?[W-x,H-z]:[W-z,x];
   };
   let lo=Infinity,hi=-Infinity,actualBlocks=0;
   const offending=[];
   for(const p of items){
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y,p.z),
     new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx,p.ry,p.rz)),
     new THREE.Vector3(p.sx,p.sy,p.sz)),g0=p.geo.attributes.position;
    for(let i=0;i<g0.count;i++){
     const v=new THREE.Vector3().fromBufferAttribute(g0,i).applyMatrix4(matrix);
     const [u,z]=uv(v);
     if(u<.68-.0001||u>W-.68+.0001||z<t.parkingZoneDepth-.08-.0001||
      z>H-.39+.0001){
      if(offending.length<4)offending.push({
       u:+u.toFixed(3),v:+z.toFixed(3),color:p.color,y:+v.y.toFixed(3)});
     }
     lo=Math.min(lo,v.y);hi=Math.max(hi,v.y);
    }
   }
   assert.equal(offending.length,0,key+' physically overhangs streets '+JSON.stringify(offending));
   assert(lo>=-.001);
   if(key==='shop_large'){
    // Rear half of each of the three 7-Eleven shops is contracted.
    const floors=items.filter(i=>i.color==='#e9e7df'&&Math.abs(i.y-.28)<.04);
    assert.equal(floors.length,3,'independent shops remain');
    const minRear=Math.min(...floors.map(i=>uv({x:i.x,y:i.y,z:i.z})[1]-i.sz/2));
    assert(minRear>6.7&&minRear<7.0,'shortened shops meet parking with a narrow safe setback');
    assert(floors.some(i=>uv({x:i.x,y:i.y,z:i.z})[1]+i.sz/2>9.2),
     'shop entrances remain inside the compact frontage');
    assert(hi>3.5&&hi<4.2,'only the main large shop reaches two floors');
    assert(!items.some(i=>i.color==='#cbd1cb'&&i.sy<.08),
     'surplus rear apron must be removed');
    assert(!items.some(i=>i.color==='#e7e7df'&&i.y<.20),
     'white filler passage must be removed');
    const foundation=items.find(i=>i.color==='#c5ccc4');
    const foundationRear=uv({x:foundation.x,y:foundation.y,z:foundation.z})[1]-foundation.sz/2;
    const parkingEdge=Math.max(...g.lotSlots(b).map(s=>s.v+.64));
    assert(foundationRear-parkingEdge>0&&foundationRear-parkingEdge<.20,
     'parking must adjoin the foundation without overlapping');
    assert(items.filter(i=>i.color==='#e8e8df'&&i.y>2).length>=1,
     'large should have real upper level');
   }else assert(hi<2.65,'small and medium must remain one-floor');
   const report={instances:items.length,materials:batch.data.size,
    lights:items.filter(i=>i.glow).length,height:+hi.toFixed(3)};
   if(digest)assert.deepEqual(digest,report,'rotation must preserve building look');
   else digest=report;
  }
  rows.push({key,blocks,...digest});
 }
 assert(new Set(rows.map(i=>i.instances)).size===3,'tiers must differ visibly');
 // Ensure Low actually suppresses optional trim but preserves recognizable
 // storefront signs, while returning to High restores the accents.
 r.graphicQuality='veryHigh';
 const t=g.CATALOG.shop_large,b={key:'shop_large',id:200,x:40,y:50,rotation:0,
  parked:new Set(),parkingSlots:Array(t.parkingCapacity).fill(null)};
 const batch=new Batch({detailGroups:true});r.building(batch,b,g.CATALOG,{});
 r.buildingGroup=new THREE.Group();r.buildingGroup.add(batch.build());
 const ledMeshes=[];r.buildingGroup.traverse(m=>{if(m.userData.shopNightTier)ledMeshes.push(m);});
 assert(ledMeshes.some(m=>m.userData.shopNightTier==='essential'));
 assert(ledMeshes.some(m=>m.userData.shopNightTier==='detail'));
 r.graphicQuality='low';r.lastGlow=1;r.lastBuildingDetailLevel=null;
 r.updateBuildingDetailLOD({z:1});
 assert(ledMeshes.filter(m=>m.userData.shopNightTier==='essential').every(m=>m.visible));
 assert(ledMeshes.filter(m=>m.userData.shopNightTier==='detail').every(m=>!m.visible));
 r.graphicQuality='veryHigh';r.lastBuildingDetailLevel=null;
 r.updateBuildingDetailLOD({z:2});
 assert(ledMeshes.every(m=>m.visible));
 const roofMeshes=[];
 r.buildingGroup.traverse(mesh=>{if(mesh.userData.baseColor==='#183a4c'||
   mesh.userData.baseColor==='#ed1b34')roofMeshes.push(mesh);});
 assert(roofMeshes.length>=2,'all roof panels and primary brand are present');
 assert(roofMeshes.filter(mesh=>mesh.userData.baseColor==='#ed1b34')
  .some(mesh=>!mesh.userData.fineBuildingDetail),
  'Low must retain the primary high rooftop crest even with detailed LOD off');
 // Starter store is also 7-Eleven styled.
 const sb=new Batch();r.building(sb,{key:'shop_starter',id:211,x:40,y:50,rotation:0,
  parked:new Set(),parkingSlots:[]},g.CATALOG,{});
 const starter=[...sb.data.values()].flatMap(g=>g.items.map(p=>({...p,color:g.color,finish:g.finish})));
 for(const color of ['#ff7f00','#006940','#ed1b34'])
  assert(starter.some(x=>x.color===color),'starter 7-Eleven logo/stripe missing '+color);
 assert(starter.filter(p=>p.finish==='shop-night-essential').length>=4);
 assert(!starter.some(p=>p.color==='#006940'&&p.y<1.75&&p.sx>.5&&p.sx<.85),
  'starter shop must not duplicate its rooftop 7 logo on the facade');
 assert(starter.some(p=>p.finish==='shop-roof-essential'&&p.color==='#153a52'),
  'starter solar cells missing');
 assert(starter.some(p=>p.finish==='shop-brand-essential'&&p.color==='#ed1b34'&&p.y>1.8),
  'starter high red rooftop seven missing');
 assert(starter.some(p=>p.finish==='shop-brand-essential'&&p.color==='#006940'&&p.y>1.7),
  'starter main rooftop identity invisible in Low');
 // A freestanding billboard is taller than the one-storey shop.
 // Check the building height separately from the sign, plus its readability.
 const shopBody=starter.filter(p=>p.finish!=='shop-brand-essential');
 assert(Math.max(...shopBody.map(p=>p.y+p.sy*.5))<2.1,'starter remains a single storey');
 const brand=starter.filter(p=>p.finish==='shop-brand-essential');
 assert(brand.some(p=>p.color==='#006940'&&p.sx>=1.3&&p.sy>=.8),
  'starter rooftop billboard must be large and upright');
 assert(brand.filter(p=>p.color==='#006940'&&p.sx<.05&&p.sy<.05).length>=40,
  'starter ELEVEN lettering must have readable individual strokes');
 console.log(JSON.stringify({passed:true,shops:4,rotations:12,parkingPreserved:true,
  rearHalfCompressed:true,parkingMovedTowardStore:true,
  lowQualityLighting:true,sevenElevenBranding:true,solarRoofs:true,roofSignsLow:true,models:rows}));
})().catch(e=>{console.error(e);process.exitCode=1;});
