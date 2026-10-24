const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 const kinds=['shade','banyan','flower','pine','shrub','palm'];
 for(const kind of kinds){
  const near=new Batch(),far=new Batch();
  r.tree(near,190,190,1,kind,'near');r.tree(far,190,190,1,kind,'far');
  const count=batch=>Array.from(batch.data.values()).reduce((n,item)=>n+item.items.length,0);
  assert(count(near)>count(far),kind+' must have more near detail');
  for(const batch of [near,far]){
   const group=batch.build();assert(group.children.length>0);
   for(const part of batch.data.values())for(const t of part.items)
    assert([t.x,t.y,t.z,t.sx,t.sy,t.sz,t.rx,t.ry,t.rz].every(Number.isFinite),kind+' non-finite instance');
   assert(group.children.every(mesh=>mesh.count>0));
   r.disposeGroup(group);
  }
 }
 const a=new Batch();r.tree(a,190,190,1,true);assert(a.data.size>0,'legacy palm boolean');
 const terrain=Object.create(TrafficRenderer.prototype);terrain.scene=new THREE.Scene();
 terrain.terrain('phuket');terrain.terrain('chiangmai');terrain.terrain('bangkok');terrain.terrain('korat');
 assert(source.includes("float pebbles=")&&source.includes('float blade='),'new terrain texture must remain shader based');
 assert(source.includes("Math.hypot(tx-cam.x,tz-cam.y)<27"),'automatic trees require LOD');
 assert(source.includes("SHARED_RENDER_GEOMETRIES.includes"),'shared foliage must survive scene disposal');
 console.log(JSON.stringify({passed:true,species:kinds,nearDetail:true,legacyPalm:true,terrainMaps:4}));
})().catch(e=>{console.error(e);process.exitCode=1});