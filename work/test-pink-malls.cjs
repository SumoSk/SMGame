// Mall QA: Apple-inspired starter/small/medium and CENTRAL grand mall.
// Physical full-mesh street/parking clearance, entrance, signage, Low LOD,
// two-storey limit and original mall business capacity must all survive.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const boot=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',boot+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const specs=[
  {key:'mall_small',W:7,H:8,capacity:15,jobs:3,service:12,floors:1},
  {key:'mall_medium',W:11,H:8,capacity:30,jobs:6,service:24,floors:1},
  {key:'mall_large',W:11,H:13,capacity:60,jobs:12,service:48,floors:2}];
 const results=[];
 for(const spec of specs){
  const {key,W,H,capacity,jobs,service,floors}=spec,t=g.CATALOG[key];
  assert.deepEqual([t.plotWidth,t.plotHeight,t.parkingCapacity,t.jobs,t.service],
   [W,H,capacity,jobs,service],key+' business and parking unchanged');
  assert.equal(g.lotSlots({key}).length,capacity,key+' original parking slots');
  assert.equal(t.parkingZoneDepth,H/2);
  let signature;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,x:40,y:50,id:91,rotation,parked:new Set(),
    parkingSlots:Array(capacity).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[],matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion();
   const uv=p=>{const x=p.x-b.x,z=p.z-b.y;
    return rotation===0?[x,z]:rotation===1?[z,H-x]:
     rotation===2?[W-x,H-z]:[W-z,x];};
   let minY=Infinity,maxY=-Infinity;
   for(const group of batch.data.values())for(const p of group.items){
    assert([p.x,p.y,p.z,p.sx,p.sy,p.sz,p.rx,p.ry,p.rz].every(Number.isFinite));
    assert(p.sx>0&&p.sy>0&&p.sz>0,key+' nonpositive geometry');
    const [u,v]=uv(new THREE.Vector3(p.x,p.y,p.z));
    items.push({...p,u,v,color:group.color,finish:group.finish,glow:group.glow});
    quaternion.setFromEuler(new THREE.Euler(p.rx,p.ry,p.rz));
    matrix.compose(new THREE.Vector3(p.x,p.y,p.z),quaternion,new THREE.Vector3(p.sx,p.sy,p.sz));
    const mesh=group.geo.attributes.position;
    for(let k=0;k<mesh.count;k++){
     const world=new THREE.Vector3().fromBufferAttribute(mesh,k).applyMatrix4(matrix);
     const [x,z]=uv(world);
     assert(x>=.69-1e-6&&x<=W-.69+1e-6&&z>=H/2-.08-1e-6&&z<=H-.37+1e-6,
      key+' blocked parking or frontage rotation='+rotation+' local='+JSON.stringify([x,z]));
     minY=Math.min(minY,world.y);maxY=Math.max(maxY,world.y);
    }
   }
   assert(minY>=-.001,'model below ground');
   assert(items.length>=110&&items.length<=1100,'efficient but detailed low-poly mesh budget');
   assert(batch.data.size<95,'material batching limit');
   assert(items.some(i=>i.color==='#bdaba4'&&i.y-i.sy/2<=.04),
    'grounded stone apron missing');
   const floorsAt=items.filter(i=>i.color==='#e6dfd5'&&i.sy<=.15);
   assert(floorsAt.some(i=>Math.abs(i.y-.29)<.07),key+' ground slab missing');
   if(floors===2){
    assert(floorsAt.some(i=>Math.abs(i.y-2.31)<.14),
     'large mall needs ONE supported second level');
    assert(maxY<4.65&&maxY>4.20,key+' mall max height must fit two floors');
   }else{
    assert(!floorsAt.some(i=>i.y>1),'one-level mall has phantom upper slab');
    assert(maxY<2.75,key+' cannot exceed one floor');
   }
   assert(!floorsAt.some(i=>i.y>3.0),'no THIRD occupied mall storey');
   assert(items.filter(i=>i.finish==='glass'&&!i.glow).length>=14,
    'transparent storefronts and atrium required');
   assert(items.filter(i=>i.glow).length>=10,'architectural warm lighting required');
   // Lighting is tagged for quality switches rather than bright unlit glass:
   // anchored architectural accents survive Low, luxury extras can vanish.
   const lights=items.filter(i=>i.finish.startsWith('mall-night-'));
   assert(lights.filter(i=>i.finish==='mall-night-essential').length>=16,
    key+' main roof/atrium/glass-frame lighting is missing');
   assert(lights.filter(i=>i.finish==='mall-night-detail').length>=8,
    key+' lacks premium night accent detail');
   assert(lights.every(i=>i.glow),key+' decorative LED meshes must emit light');
   if(key==='mall_large'){
    assert(items.filter(i=>i.color==='#c72e37').length>=3,
     'CENTRAL red front, wing and freestanding entrance sign must render');
    assert(items.filter(i=>i.color==='#fff8ec'&&i.finish==='mall-sign').length>=75,
     'CENTRAL white letters must be real 3D low-quality-proof geometry');
    assert(items.some(i=>i.color==='#75b4ca'&&i.sy>3.0),
     'double-height Central glass entrance hall absent');
    assert(items.filter(i=>i.color==='#6eabbc').length>=3,
     'grand mall must have rooftop glazed skylights');
    assert(items.filter(i=>i.color==='#b8946d').length>=2,
     'two separate outdoor café terraces missing');
    assert(items.some(i=>i.color==='#73bad4'),
     'public fountain at front entrance missing');
    // Match the user's reference: one continuous white stepped rooftop,
    // folded white/bronze front supports, real cafe terraces, side brand.
    assert(items.some(i=>i.color==='#aaa6a4'&&i.sx>8&&i.y>4.15),
     'reference requires a unified large flat rooftop deck');
    assert(items.some(i=>i.color==='#edece5'&&Math.abs(i.rz)>.2&&i.y<2.9),
     'reference requires angled white architectural frames');
    assert(items.some(i=>i.color==='#a87855'&&i.u>9.7&&i.sy>1.5),
     'reference requires wood-clad side elevation');
    assert(items.some(i=>i.color==='#c72e37'&&i.u>9.7&&i.sy>.3),
     'red CENTRAL side sign must face the side street');
    assert(items.filter(i=>i.color==='#d7c6a2').length>=4,
     'roof-terrace tables and café parasols missing');
    assert(items.some(i=>i.color==='#69a56a')&&items.some(i=>i.color==='#73bad4'),
     'front plaza needs ornamental trees and fountain');
    assert(items.some(i=>i.color==='#ad7951'||i.color==='#b8946d'),
     'Central facade must have premium wood and terrace detailing');
   }else{
    assert(items.some(i=>i.color==='#9bbac0'&&Math.abs(i.rz)>.05),
     'small/medium mall must retain arched skylight');
    assert(items.some(i=>i.color==='#77b7c6')||items.some(i=>i.color==='#87bac5'),
     'small/medium mall must retain transparent cylindrical glass lobby');
   }
   assert(!items.some(i=>i.finish==='stone'&&i.sy>2.3&&i.sx>2.1),
    'oversized single stone/glass-box facade');
   assert(items.some(i=>i.color=== (key==='mall_large'?'#fff8ec':'#e3cf9c')),
    key+' raised daylight sign lettering absent');
   const result={instances:items.length,materials:batch.data.size,top:+maxY.toFixed(3),
    glow:items.filter(i=>i.glow).length};
   if(signature)assert.deepEqual(result,signature,key+' cardinal rotation altered rendering');
   else signature=result;
  }
  results.push({key,...signature,levels:floors});
 }
 assert(new Set(results.map(x=>x.instances)).size===3,'all mall tiers need visibly different detail density');
 renderer.graphicQuality='low';
 const large=g.CATALOG.mall_large;
 const b=new Batch();renderer.building(b,{key:'mall_large',id:92,x:40,y:50,rotation:0,
  parked:new Set(),parkingSlots:Array(large.parkingCapacity).fill(null)},g.CATALOG,{});
 const lowGroups=[...b.data.values()],lowItems=lowGroups.flatMap(v=>v.items);
 const lowEssential=lowGroups.filter(v=>v.finish==='mall-night-essential')
   .reduce((n,v)=>n+v.items.length,0);
 const lowDetail=lowGroups.filter(v=>v.finish==='mall-night-detail')
   .reduce((n,v)=>n+v.items.length,0);
 assert(lowItems.length<=results[2].instances,'low mode should not use more instances');
 assert(lowEssential>=16,'low-quality mall must preserve hero lights');
 assert(lowDetail<results[2].glow,'low-quality mall must omit accent LEDs');
 assert(lowGroups.some(v=>v.finish==='mall-sign'&&v.items.length>=45),
  'Low must retain visible CENTRAL raised red-white facade and pylon signs');
 // Changing the graphics preset at runtime must hide expensive luxury
 // light groups without switching off essentials or requiring a rebuild.
 renderer.graphicQuality='veryHigh';
 const toggleBatch=new Batch({detailGroups:true});
 renderer.building(toggleBatch,{key:'mall_large',id:94,x:40,y:50,rotation:0,
  parked:new Set(),parkingSlots:Array(large.parkingCapacity).fill(null)},g.CATALOG,{});
 renderer.buildingGroup=new THREE.Group();
 renderer.buildingGroup.add(toggleBatch.build());
 renderer.graphicQuality='low';renderer.lastGlow=1;renderer.lastBuildingDetailLevel=null;
 renderer.updateBuildingDetailLOD({z:2});
 const mallMeshes=[],signMeshes=[];
 renderer.buildingGroup.traverse(mesh=>{
  if(mesh.userData.mallNightTier)mallMeshes.push(mesh);
  if(mesh.userData.baseColor==='#fff8ec')signMeshes.push(mesh);
 });
 assert(signMeshes.length>0&&signMeshes.every(mesh=>mesh.visible),
  'Raised white CENTRAL letters must remain visible on Low quality');
 assert(mallMeshes.some(m=>m.userData.mallNightTier==='essential'&&m.visible),
  'Low must show essential shopping-mall night lights');
 assert(mallMeshes.some(m=>m.userData.mallNightTier==='detail'&&!m.visible),
  'Low must suppress premium mall accent LEDs');
 renderer.graphicQuality='veryHigh';renderer.lastBuildingDetailLevel=null;
 renderer.updateBuildingDetailLOD({z:2});
 assert(mallMeshes.every(m=>m.visible),'High must restore all mall nighttime LED tiers');
 renderer.graphicQuality=undefined;
 // Starter one-floor variant has three recognizable airy pavilions.
 const starter=g.CATALOG.mall_starter,starterBatch=new Batch();
 renderer.building(starterBatch,{key:'mall_starter',id:93,x:40,y:50,rotation:0,
  parked:new Set(),parkingSlots:Array(starter.parkingCapacity).fill(null)},g.CATALOG,{});
 const starterItems=[...starterBatch.data.values()].flatMap(v=>v.items.map(i=>({...i,color:v.color,finish:v.finish,glow:v.glow})));
 assert(starterItems.some(i=>i.color==='#76afbe'),'starter curved glass lobby missing');
 assert(starterItems.some(i=>i.color==='#dee8e4'),'starter floating silver roof missing');
 assert(!starterItems.some(i=>i.finish==='stone'&&i.sx>2&&i.sy>1),
  'starter must not be a box');
 assert(Math.max(...starterItems.map(i=>i.y+i.sy/2))<2.1,
  'starter is strictly single-floor');
 assert(starterItems.filter(i=>i.finish==='mall-night-essential'&&i.glow).length>=7,
  'starter glass pavilion must glow on Low without expensive spotlights');
 console.log(JSON.stringify({passed:true,malls:4,rotations:12,maxFloors:2,
  appleStyleSmallMedium:true,centralGrandMall:true,frontEntrance:true,
  parkingPreserved:true,lowQualityBrand:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
