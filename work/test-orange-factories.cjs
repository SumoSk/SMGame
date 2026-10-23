// Geometry regression: real machine halls, conveyors, robots and
// parking-safe factory footprints through all four possible orientations.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const js=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',js+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const specs=[
  {key:'factory_small',plot:[8,8],parking:20,jobs:20,tier:1},
  {key:'factory_medium',plot:[8,13],parking:40,jobs:40,tier:2},
  {key:'factory_large',plot:[11,13],parking:60,jobs:60,tier:3}
 ];
 const results=[];
 for(const spec of specs){
  const t=g.CATALOG[spec.key];
  assert(t&&t.kind==='factory'&&t.plannedParking);
  assert.equal(t.modelTier,spec.tier);
  assert.deepEqual([t.plotWidth,t.plotHeight],spec.plot);
  assert.equal(t.parkingCapacity,spec.parking);
  assert.equal(t.jobs,spec.jobs);
  assert.equal(g.lotSlots({key:spec.key}).length,spec.parking);
  assert.equal(t.parkingZoneDepth,t.buildingZoneDepth);
  let baseline;
  for(let rotation=0;rotation<4;rotation++){
   const b={key:spec.key,id:406,x:23,y:44,rotation,parked:new Set(),
    parkingSlots:Array(spec.parking).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(group=>
    group.items.map(p=>({...p,color:group.color,glow:group.glow})));
   const local=items.map(p=>{
    const dx=p.x-b.x,dz=p.z-b.y;
    const uv=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:t.plotHeight-dx}:
     rotation===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    return {...p,u:+uv.u.toFixed(6),v:+uv.v.toFixed(6)};
   });
   assert(items.length>=150&&items.length<=1800,spec.key+' batched 3D detail budget');
   assert(local.every(p=>[p.u,p.v,p.y,p.sx,p.sy,p.sz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0));
   const intruders=local.filter(p=>
    p.v-p.sz*.5<t.parkingZoneDepth-.08||p.u-p.sx*.5<.68||
    p.u+p.sx*.5>t.plotWidth-.68||p.v+p.sz*.5>t.plotHeight-.34);
   assert.equal(intruders.length,0,spec.key+' parts obstruct drive or parking '+JSON.stringify(intruders.slice(0,4)));
   // Floor bays should remain open; never use a giant opaque solid.
   assert.equal(local.filter(p=>p.sy>1.65&&p.sx*p.sz>4.0).length,0,
    spec.key+' reverted to solid cuboid');
   const count=c=>local.filter(p=>p.color===c).length;
   const colors=new Set(local.map(p=>p.color));
   assert(colors.size>=23,spec.key+' missing material variation');
   assert(count('#ee8c37')>=7,spec.key+' orange industrial theme absent');
   assert(count('#e9e2d7')+count('#f2ddad')>=1,'warm contrast missing');
   assert(local.filter(p=>p.glow).length>=10,spec.key+' missing industrial lights');
   const high=Math.max(...local.map(p=>p.y+p.sy*.5));
   if(spec.tier===1){
    assert(high>2.4&&high<3.3,'workshop should be one-story');
    assert(count('#65717b')>=1,'half-open corrugated canopy missing');
    assert(count('#a6b6b6')>=1,'workbench missing');
    assert(count('#485760')>=2,'welding stations missing');
    assert(count('#d2a56b')>=2,'shipping supplies missing');
   }else if(spec.tier===2){
    assert(high>3.6&&high<4.5,'assembly crane and observer deck missing');
    assert(count('#cbd1cf')>=1,'elevated control deck missing');
    assert(count('#98a4a5')>=2,'two true production conveyors missing');
    assert(count('#f2b562')>=4,'robot assembly arms missing');
    assert(count('#87b8be')>=2,'paint booth glass absent');
    assert(local.some(p=>p.color==='#9de5d8'&&p.y>1.05),'illuminated machine controls missing');
   }else{
    assert(high>4.6&&high<5.3,'large plant should have two floors and roof trusses');
    assert(count('#98a4a5')>=3,'three production conveyors missing');
    assert(count('#f2b562')>=6,'industrial robots missing');
    assert(count('#bac7c5')>=1,'real elevated control mezzanine missing');
    assert(count('#b9c7c9')>=2,'raw-material tanks missing');
    assert(count('#f2ddad')>=1,'orange sign lettering absent');
    assert(local.some(p=>p.color==='#91c9cf'&&p.y>3),'second-floor control monitors missing');
   }
   const signature={instances:items.length,colors:colors.size,
    glow:local.filter(p=>p.glow).length,top:+high.toFixed(3)};
   if(baseline)assert.deepEqual(signature,baseline,spec.key+' rotation changes detail count');
   else baseline=signature;
  }
  results.push({...spec,...baseline});
 }
 const grand=g.CATALOG.home_grand;
 assert.deepEqual([grand.plotWidth,grand.plotHeight,grand.parkingCapacity],[11,13,60]);
 const pub=g.CATALOG.pub_small;
 const bb=new Batch();renderer.building(bb,{key:'pub_small',id:51,x:40,y:42,rotation:0,
  parked:new Set(),parkingSlots:Array(pub.parkingCapacity).fill(null)},g.CATALOG,{});
 assert([...bb.data.values()].reduce((s,k)=>s+k.items.length,0)>500);
 console.log(JSON.stringify({passed:true,models:results,rotations:12,
  grandHomePreserved:true,smallPubPreserved:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
