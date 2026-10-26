const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer}=new Function('THREE',source+';return {TrafficRenderer};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);r.scene=new THREE.Scene();
 const variants=new Set(),citySurfaces={};let disposed=0;
 for(const city of ['phuket','bangkok','chiangmai','korat','phuket']){
  const old=r.terrainGroup?.slice()||[],atlas=r.landscapeNoiseMap;
  for(const mesh of old)mesh.traverse(o=>{if(o.material)o.material.addEventListener('dispose',()=>disposed++);});
  r.terrain(city);
  if(atlas)assert.equal(r.landscapeNoiseMap,atlas,'map switches must reuse the noise atlas');
  for(const mesh of old)assert(!r.scene.children.includes(mesh),'old scenery must leave the scene');
  const kinds=[];
  for(const mesh of r.terrainGroup)mesh.traverse(o=>{
   if(o.geometry){
    const positions=o.geometry.attributes.position;
    for(let i=0;i<positions.array.length;i++)assert(Number.isFinite(positions.array[i]),city+' non-finite terrain');
   }
   const material=o.material;if(!material?.userData.landscapeKind)return;
   kinds.push(material.userData.landscapeKind);
   const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
   material.onBeforeCompile(shader);
   assert(shader.vertexShader.includes('vLandscapeWorld=(modelMatrix*vec4(position,1.0)).xyz;'));
   assert(shader.fragmentShader.includes('diffuseColor.rgb*='),'landscape must participate in day/night lighting');
   assert.equal(shader.uniforms.landscapeNoiseMap.value,r.landscapeNoiseMap);
   if(['sea','river'].includes(material.userData.landscapeKind))assert.equal(shader.uniforms.landscapeTime,r.landscapeClock,'all water must share the render-only clock');
   if(material.userData.landscapeKind==='grass')variants.add(material.customProgramCacheKey());
  });
  citySurfaces[city]=kinds;
  assert(kinds.includes('grass')&&kinds.includes('sea'));
  if(city==='phuket')assert(kinds.includes('sand')&&kinds.includes('wetSand'));
  if(city==='bangkok')assert(kinds.includes('river'));
  if(city==='chiangmai'){
   const mountains=r.terrainGroup.find(o=>o.userData.landscapeKind==='mountains');assert(mountains);
   const p=mountains.geometry.attributes.position;let max=0;
   for(let i=0;i<p.count;i++)max=Math.max(max,p.getY(i));assert(max>6&&max<20);
   assert(mountains.geometry.index.count<72*78*6,'flat mountain rectangle must not cover the grass');
  }
 }
 assert.equal(variants.size,4,'each city must compile its own grass palette');assert(disposed>10,'map switches must dispose old materials');
 assert.equal(r.landscapeNoiseMap.image.data.length,128*128*4);
 assert.equal(r.landscapeNoiseMap.minFilter,THREE.LinearMipmapLinearFilter,'fine detail must be filtered when zooming out');
 const repeat=Object.create(TrafficRenderer.prototype);repeat.scene=new THREE.Scene();repeat.terrain('phuket');
 assert.deepEqual(repeat.landscapeNoiseMap.image.data,r.landscapeNoiseMap.image.data,'textures must remain deterministic after reload');
 console.log(JSON.stringify({passed:true,cities:4,citySurfaces,uniqueGrassPalettes:variants.size,disposedMaterials:disposed,atlasBytes:r.landscapeNoiseMap.image.data.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
