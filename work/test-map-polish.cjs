'use strict';
// Visual-map regression: GPU batch budget, region identity, deterministic
// scenery, safe placement, and compatibility with older town saves.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const raw=fs.readFileSync('dist/renderer3d.js','utf8');
 const src=raw.replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,landscapeMaterial,hash}=new Function('THREE',src+
  '\nreturn {TrafficRenderer,landscapeMaterial,hash};')(THREE);
 const makeState=city=>({city,version:2,landscapeVersion:0,
  footprint:new Int32Array(300*300).fill(-1),buildGrid:new Int32Array(300*300).fill(-1),
  plantedTrees:[],hiddenAutoTrees:[]});
 const makeRenderer=()=>{
  const r=Object.create(TrafficRenderer.prototype);
  r.scene=new THREE.Scene();r.treeGroup=new THREE.Group();r.buildKey='map';
  r.treeKey='';r.graphicQuality='medium';return r;
 };
 const cam={x:149,y:150,z:1.5};
 const stats=[];
 for(const city of ['phuket','bangkok','chiangmai','korat','london']){
  const r=makeRenderer(),state=makeState(city);
  const blocked=150*300+150;state.footprint[blocked]=blocked;
  r.trees(state,cam);
  const picks=[...r.landscapePicks.values()].filter(x=>x.auto);
  const kinds=new Set(picks.map(x=>x.kind));
  assert(picks.length>75&&picks.length<1100,'reasonable visible grove density '+city);
  assert(kinds.size>=4,'varied natural tree species '+city);
  assert(picks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),
    'finite world positions '+city);
  assert(picks.every(p=>Math.abs(Math.floor(p.x)-150)>1||Math.abs(Math.floor(p.y)-150)>1),
    'built roads remain clear of wild trees '+city);
  let oldCount=0;
  for(let z=Math.floor(cam.y/18)*18-62;z<Math.floor(cam.y/18)*18+62;z+=2.7)
   for(let x=Math.floor(cam.x/18)*18-62;x<Math.floor(cam.x/18)*18+62;x+=2.7){
    if(hash(x,z)<.70)continue;
    const tx=x+hash(z,x)*1.8,tz=z+hash(x+7,z)*1.8;
    const ix=Math.floor(tx),iz=Math.floor(tz);
    if(ix<1||iz<1||ix>=299||iz>=299)continue;
    if(city==='phuket'&&tx<r.coast(tz)+2.8
     ||city==='bangkok'&&Math.abs(tx-(125+Math.sin(tz*.047)*5))<6)continue;
    let blockedNear=false;
    for(let iy=iz-1;iy<=iz+1;iy++)for(let xx=ix-1;xx<=ix+1;xx++)
     if(state.footprint[iy*300+xx]>=0||state.buildGrid[iy*300+xx]>=0)blockedNear=true;
    if(!blockedNear)oldCount++;
   }
  assert(picks.length<=oldCount*1.27,
   'new map must not create significantly more costly trees '+city);
  const meshes=[];r.treeGroup.traverse(m=>{if(m.isInstancedMesh)meshes.push(m);});
  assert(meshes.length>5&&meshes.length<70,'foliage must stay GPU-instanced '+city);
  assert(meshes.some(m=>m.userData.ids?.some(id=>id==null)),
   'undergrowth should be scenery, not selectable game objects '+city);
  const signature=picks.slice(0,16).map(p=>[p.x,p.y,p.kind]);
  r.treeKey='';r.trees(state,cam);
  assert.deepEqual([...r.landscapePicks.values()].filter(x=>x.auto)
   .slice(0,16).map(p=>[p.x,p.y,p.kind]),signature,'groves must be deterministic '+city);
  stats.push({city,autoTrees:picks.length,baselineTrees:oldCount,
   batchedMeshes:meshes.length,treeKinds:[...kinds].length});
 }
 // City-specific scenery appears only in the intended world.
 const map=makeRenderer();map.terrain('phuket');
 const coastalRocks=[];
 for(const item of map.terrainGroup)item.traverse(m=>{
  if(!m.isInstancedMesh)return;
  if(['798e83','9a9b87','647e73'].includes(m.material.color.getHexString()))coastalRocks.push(m);
 });
 assert(coastalRocks.reduce((n,m)=>n+m.count,0)>=39,
  'the Phuket coastline has offshore rocks');
 const dummy=new THREE.Matrix4(),p=new THREE.Vector3();
 for(const mesh of coastalRocks)for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,dummy);p.setFromMatrixPosition(dummy);
  assert(p.x<map.coast(p.z)-5,'offshore rocks cannot enter city roads');
 }
 map.terrain('chiangmai');
 assert.equal(map.terrainGroup.filter(m=>m.userData?.landscapeKind==='distant-ridge').length,2);
 map.terrain('korat');
 const shaderKey=landscapeMaterial('korat','grass',map.landscapeNoiseMap).customProgramCacheKey();
 assert(shaderKey.includes('float farm='),'Korat has restrained agricultural texture');
 map.terrain('bangkok');
 const bangkokKinds=map.terrainGroup.map(m=>m.material?.userData?.landscapeKind);
 assert(bangkokKinds.includes('river'),'Bangkok keeps its river');
 assert(!raw.includes('new THREE.PointLight('),'map polish must not allocate per-tree lights');
 console.log(JSON.stringify({passed:true,stats,coastalRockGroups:coastalRocks.length}));
})().catch(error=>{console.error(error);process.exitCode=1;});
