const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8');
 const {TrafficRenderer,Batch}=new Function('THREE',source.replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer')+';return {TrafficRenderer,Batch};')(THREE);
 const game=fs.readFileSync('dist/game.js','utf8');
 const {CATALOG,lotPoint}=new Function(game.slice(game.indexOf('const KINDS='),game.indexOf('function lotSlots'))+';return {CATALOG,lotPoint};')();
 const r=Object.create(TrafficRenderer.prototype);r.parking={lotPoint};
 let models=0,largest=0;
 for(const [key,t] of Object.entries(CATALOG)){
  if(key.endsWith('_small')||t.kind==='park')continue;
  for(let rotation=0;rotation<4;rotation++){
   const batch=new Batch();let parkingCalls=0;
   r.parkingLot=()=>parkingCalls++;
   r.building(batch,{key,id:42,x:0,y:0,rotation},CATALOG,{});
   assert.equal(parkingCalls,1,'existing parking renderer must run exactly once');
   const w=rotation%2?t.plotHeight:t.plotWidth,d=rotation%2?t.plotWidth:t.plotHeight;
   let pieces=0;
   for(const group of batch.data.values())for(const p of group.items){
    pieces++;
    for(const axis of ['x','y','z','sx','sy','sz'])assert(Number.isFinite(p[axis]),key+' finite geometry');
    assert(Math.min(p.sx,p.sy,p.sz)>0,key+' positive dimensions');
    // BOX extents including all Euler rotations (pitched roofs included).
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y,p.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx,p.ry,p.rz)),new THREE.Vector3(p.sx,p.sy,p.sz));
    group.geo.computeBoundingBox();
    const bounds=group.geo.boundingBox.clone().applyMatrix4(matrix);
    assert(bounds.min.x>=-.001&&bounds.max.x<=w+.001&&bounds.min.z>=-.001&&bounds.max.z<=d+.001,key+' stays in plot at rotation '+rotation);
   }
   const built=batch.build();assert(built.children.length>5);
   const ray=new THREE.Raycaster(new THREE.Vector3(w/2,10,d/2),new THREE.Vector3(0,-1,0));
   built.updateMatrixWorld(true);
   for(const hit of ray.intersectObject(built,true))assert([null,42].includes(hit.object.userData.ids[hit.instanceId]));
   largest=Math.max(largest,pieces);models++;
  }
 }
 console.log(JSON.stringify({passed:true,models,largest,checks:['real Three.js meshes','positive finite geometry','all four rotations stay inside plots','parking renderer preserved','instanced picking IDs']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
