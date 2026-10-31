require('./test-renderer-dom-stub.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return{TrafficRenderer,Batch};')(THREE);
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',fixture+'return boot();')(require);
 const counts={},expected={civic_starter:[5,3,3],civic_small:[20,8,8]};
 for(const [key,dimensions]of Object.entries(expected)){
  const t=g.CATALOG[key];
  assert.deepEqual([t.parkingCapacity,t.plotWidth,t.plotHeight],dimensions);
  assert.equal(g.lotSlots({key,x:20,y:20,rotation:0}).length,t.parkingCapacity);
  assert(g.dockItems('civic').some(x=>x.key===key));
  assert(g.parkingVisuals({key,x:20,y:20,rotation:0}).filter(v=>v.color==='#e9e6cc').length>=t.parkingCapacity+1);
 for(const quality of ['low','medium','veryHigh'])for(let rotation=0;rotation<4;rotation++){
  const r=Object.create(TrafficRenderer.prototype);r.graphicQuality=quality;r.parkingLot=()=>{};r.parking={lotPoint:g.lotPoint};
  const b={key:t.key,id:100,x:80,y:80,rotation},batch=new Batch({detailGroups:true,lowDetail:quality==='low'});
  r.building(batch,b,g.CATALOG);let count=0,windows=0;
  const bounds=g.buildingBounds(b);
  for(const group of batch.data.values())for(const item of group.items){
   count++;if(group.finish==='night-civic')windows++;
   assert([item.x,item.y,item.z,item.sx,item.sy,item.sz,item.ry].every(Number.isFinite));
   // Every government wing/facade and courtyard stays inside its own parcel.
   if(group.finish==='foliage'||group.finish==='bark')continue;
   group.geo.computeBoundingBox();const box=group.geo.boundingBox.clone();
   const matrix=new THREE.Matrix4().compose(new THREE.Vector3(item.x,item.y,item.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(item.rx,item.ry,item.rz)),new THREE.Vector3(item.sx,item.sy,item.sz));
   box.applyMatrix4(matrix);assert(box.min.x>=b.x-.01&&box.max.x<=b.x+bounds.w+.01,'x footprint');assert(box.min.z>=b.y-.01&&box.max.z<=b.y+bounds.h+.01,'z footprint');
  }
  assert(windows>=30,'night facade remains in low detail');assert(count<300,'static instancing budget');counts[key+'-'+quality]=count;
 }
 }
 assert(!g.dockItems('civic').some(x=>x.key==='civic_legacy'));
 console.log(JSON.stringify({passed:true,tiers:2,rotations:4,qualityLevels:3,counts,nightFacade:true,parcelBounds:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
