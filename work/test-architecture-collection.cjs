const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const setup=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',setup+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',src+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 // Keep the exact world-space lot rotation but isolate architectural geometry
 // from parking paint so footprint assertions can inspect each model alone.
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const models=['home_large','home_dual',
  ...['office','factory','shop','restaurant','mall','park','pub','hotel']
   .flatMap(kind=>['small','medium','large'].map(tier=>kind+'_'+tier))];
 assert.equal(models.length,26);
 const countByKind={},geometry=[];
 for(const key of models){
  const t=g.CATALOG[key];assert(t,key+' must exist');
  const perRotation=[];
  for(let rotation=0;rotation<4;rotation++){
   const b={id:31,rotation,key,x:40,y:55,parked:new Set(),parkingSlots:Array(t.parkingCapacity).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const components=[...batch.data.values()];
   const items=components.flatMap(z=>z.items);
   assert(items.length>=42,key+': no detailed building geometry');
   assert(items.every(z=>[z.x,z.y,z.z,z.sx,z.sy,z.sz,z.rx,z.ry,z.rz].every(Number.isFinite)),key+': nonfinite geometry');
   assert(items.every(z=>z.sx>0&&z.sy>0&&z.sz>0),key+': negative/zero dimensions');
   const bad=items.filter(z=>{
    const dx=z.x-b.x,dz=z.z-b.y;
    const local=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:t.plotHeight-dx}:
     rotation===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    if(!(local.u>=-.25&&local.u<=t.plotWidth+.25&&local.v>=-.25&&local.v<=t.plotHeight+.25))return true;
    if(t.plannedParking&&local.v<t.parkingZoneDepth-.03)return true;
    return false;
   });
   assert.equal(bad.length,0,key+': out of plot or in parking court: '+JSON.stringify(bad.slice(0,3)));
   const glows=components.filter(z=>z.glow).reduce((n,z)=>n+z.items.length,0);
   if(key!=='park_small')assert(glows>=4,key+': expected facade night lighting');
   if(rotation===0)countByKind[key]=items.length;
   perRotation.push(items.length);
  }
  assert(perRotation.every(n=>n===perRotation[0]),key+': rotation altered geometry complexity');
  geometry.push({key,count:perRotation[0]});
 }
 for(const kind of ['office','factory','shop','restaurant','mall','park','pub','hotel']){
  const counts=['small','medium','large'].map(size=>countByKind[kind+'_'+size]);
  assert(new Set(counts).size>=2,kind+': no tier-specific design features');
 }
 // The pre-existing grand villa must continue down its dedicated branch.
 assert.equal(g.CATALOG.home_grand.plotWidth,11);
 assert.equal(g.CATALOG.home_grand.plotHeight,13);
 const r=Object.create(TrafficRenderer.prototype);
 r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const grandBatch=new Batch();
 r.building(grandBatch,{id:999,key:'home_grand',rotation:0,x:20,y:20,
  parked:new Set(),parkingSlots:Array(60).fill(null)},g.CATALOG,{});
 const grandItems=[...grandBatch.data.values()].flatMap(x=>x.items);
 assert(grandItems.length>50,'grand circular villa no longer renders');
 console.log(JSON.stringify({passed:true,artDirectedModels:models.length,rotations:4,
  grandVillaPreserved:true,grandElements:grandItems.length,
  smallestModelElements:Math.min(...geometry.map(x=>x.count)),
  largestModelElements:Math.max(...geometry.map(x=>x.count)),
  highlights:geometry.filter(z=>z.key.endsWith('_large')).slice(0,8)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
