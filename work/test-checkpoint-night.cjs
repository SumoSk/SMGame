'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const text=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,cityVisibilityAt,Batch}=new Function('THREE',text+
  '\nreturn {TrafficRenderer,cityVisibilityAt,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 r.scene=new THREE.Scene();r.scene.background=new THREE.Color('#081322');r.roadGroup=new THREE.Group();r.lampGroup=new THREE.Group();
 r.buildingGroup=new THREE.Group();r.carSets=new Map();
 r.graphicQuality='medium';r.skyLight=new THREE.HemisphereLight();
 r.light=new THREE.DirectionalLight();r.renderer={toneMappingExposure:1};
 r.cam={x:150,y:150,z:1};r.lastGlow=-1;r.lastNightVisibility=-1;
 r.rain={visible:false,material:{opacity:0},position:new THREE.Vector3(),
  geometry:{attributes:{position:{needsUpdate:false}}}};
 r.rainPoints=new Float32Array(430*6);
 const state={gates:[150,45299,89850,45000]};
 r.buildBorderCheckpoints(state);
 assert.equal(r.roadGroup.children.length,1);
 assert.equal(r.lampGroup.children.length,1);
 const model=r.roadGroup.children[0],illum=r.lampGroup.children[0];
 const solids=[],glows=[];
 model.traverse(o=>{if(o.isInstancedMesh)solids.push(o);});
 illum.traverse(o=>{if(o.isInstancedMesh)glows.push(o);});
 assert(solids.length>8&&solids.length<35,'checkpoints should be batched, not one mesh per detail');
 assert(glows.length>1&&glows.length<12,'use instanced lights, not four sets of point lights');
 const count=solids.reduce((n,o)=>n+o.count,0);
 assert(count>=4*35,'offices, raised barrier arms and roof details at each entrance');
 assert(!glows.some(o=>o.visible),'daytime checkpoint emissive lights start hidden');
 assert(!text.includes('new THREE.PointLight('),'no expensive checkpoint point lights');
 const dark=cityVisibilityAt(120),day=cityVisibilityAt(720),evening=cityVisibilityAt(1200);
 assert(dark.ambient<day.ambient*.5,'late night should have dark ambient light');
 assert(dark.building<evening.building,'warm evening buildings should stand out');
 r.updateWeatherLight({time:120,city:'chiangmai'});
 assert(glows.every(o=>o.visible&&o.material.opacity>.5),'all checkpoint lights become bright at night');
 assert(r.skyLight.intensity<1.0,'night ambient must visibly darken');
 const nightAmbient=r.skyLight.intensity;
 r.updateWeatherLight({time:720,city:'chiangmai'});
 assert(glows.every(o=>!o.visible),'checkpoint accents off in daylight');
 assert(r.skyLight.intensity>nightAmbient,'daytime brighter than night');
 assert(r.streetGlow==null,'checkpoint works with no street glow mesh');
 // Distant hills may not enter the city grid, and cannot change traffic.
 const t=Object.create(TrafficRenderer.prototype);t.scene=new THREE.Scene();
 t.terrain('chiangmai');
 const ridges=t.terrainGroup.filter(o=>o.userData?.landscapeKind==='distant-ridge');
 assert.equal(ridges.length,2,'Chiang Mai uses north and west horizon ridges');
 for(const mesh of ridges){
  const v=mesh.geometry.attributes.position;
  for(let i=0;i<v.count;i++){
   const x=v.getX(i),z=v.getZ(i),y=v.getY(i);
   assert(Number.isFinite(y)&&y>=0,'distant scenery has finite height');
   assert(x<0||x>299||z<0||z>299,'distant ridge cannot cover buildable city land');
  }
 }
 t.terrain('phuket');
 assert.equal(t.terrainGroup.filter(o=>o.userData?.landscapeKind==='distant-ridge').length,0,
  'coastal city keeps its existing environment');
 assert(text.includes('state.gates.length'),'all four live gate coordinates drive the visual');
 assert(!text.includes('new THREE.PointLight('));
 console.log(JSON.stringify({passed:true,gateCount:state.gates.length,
   batchedMeshes:{solid:solids.length,emissive:glows.length},solidInstances:count,
   nightAmbient,dayAmbient:day.ambient,ridgeMeshes:ridges.length}));
})().catch(error=>{console.error(error);process.exitCode=1;});
