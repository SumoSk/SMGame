// Retirement regression: no civic construction or Pentagon meshes.
require('./test-renderer-dom-stub.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return{TrafficRenderer,Batch};')(THREE);
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',fixture+'return boot();')(require);
 assert(!g.BUILDING_CHAINS.civic);
 assert.equal(g.dockItems('civic').length,0);
 for(const key of ['civic_starter','civic_small','civic_legacy']){
  const t=g.CATALOG[key];assert(t.legacyOnly);
  assert(g.checkParkingBuilding(key,160,140).error.includes('ออกจากระบบสร้าง'));
  for(const quality of ['low','medium','veryHigh'])for(let rotation=0;rotation<4;rotation++){
   const renderer=Object.create(TrafficRenderer.prototype);renderer.graphicQuality=quality;renderer.parking={parkingVisuals:g.parkingVisuals,lotPoint:g.lotPoint};
   const b={key,id:100,x:80,y:80,rotation,parked:new Set(),parkingSlots:Array(t.parkingCapacity).fill(null)};
   const batch=new Batch({detailGroups:true,lowDetail:quality==='low'});
   renderer.building(batch,b,g.CATALOG);
   const items=[...batch.data.values()].flatMap(group=>group.items);
   assert(items.length>0,'historical lot retains parking visuals');
   assert(![...batch.data.keys()].some(k=>String(k).includes('night-civic')),'no government geometry');
  }
 }
 console.log(JSON.stringify({passed:true,tiersRetired:3,qualityLevels:3,rotations:4}));
})().catch(e=>{console.error(e);process.exitCode=1});
