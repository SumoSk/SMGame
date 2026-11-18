'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const sourcePath=process.env.SMCITY_RENDER_SOURCE||path.join(__dirname,'../../dist/renderer3d.js');
 const THREE=await import(pathToFileURL(process.env.SMCITY_THREE_SOURCE||path.join(__dirname,'../../dist/vendor/three.module.js')).href);
 const source=fs.readFileSync(sourcePath,'utf8');
 const begin=source.indexOf('const TERRAIN_PALETTES='),end=source.indexOf('function mountainHeight(',begin);
 assert(begin>0&&end>begin,'actual landscape materials found');
 const materials=new Function('THREE',source.slice(begin,end)+'return {landscapeWater,landscapeMaterial,landscapeNoise};')(THREE);
 const groundAt=source.indexOf(' groundShape(points,color,height){'),groundEnd=source.indexOf(' terrain(city){',groundAt);
 assert(groundAt>0&&groundEnd>groundAt);
 const groundShape=new Function('THREE','return ({'+source.slice(groundAt,groundEnd)+'}).groundShape;')(THREE);
 const waterAt=source.indexOf('  const water=new THREE.Mesh(',groundEnd),waterEnd=source.indexOf('  const strip=',waterAt);
 assert(waterAt>groundEnd&&waterEnd>waterAt);
 const makeWater=new Function('THREE','landscapeWater','city','noise','clock',source.slice(waterAt,waterEnd)+'return water;');
 const noise=materials.landscapeNoise(),clock={value:0};let checks=0;
 for(const city of ['phuket','bangkok','chiangmai','korat']){
  const context={scene:new THREE.Scene(),terrainGroup:[]};
  const water=makeWater.call(context,THREE,materials.landscapeWater,city,noise,clock),material=water.material;
  assert.equal(material.transparent,false,'sea stays in the opaque pass');
  assert.equal(material.depthTest,true,'sea uses occlusion depth');
  assert.equal(material.depthWrite,true,'sea still occludes transparent effects behind it');
  assert.equal(material.depthFunc,THREE.LessEqualDepth,'standard opaque depth comparison');
  assert.equal(material.alphaTest,0,'sea does not use alpha cutout');
  assert.equal(material.blending,THREE.NormalBlending,'sea has ordinary opaque blending');
  assert.equal(material.side,THREE.FrontSide,'sea retains the original face policy');
  assert.equal(water.castShadow,false,'sea remains a receiver, not a new shadow caster');
  assert.equal(water.receiveShadow,true,'existing shadows remain visible on sea');
  assert.equal(water.position.y,-.26,'sea geometry stays at the existing level');
  assert.equal(water.renderOrder,1,'sea submits after opaque terrain and ordinary geometry');
  assert.strictEqual(context.scene.children[0],water);
  assert.strictEqual(context.terrainGroup[0],water);checks+=13;
  for(const [kind,height]of [['wetSand',-.12],['sand',-.105],['grass',0]]){
   const groundMaterial=materials.landscapeMaterial(city,kind,noise);
   const ground=groundShape.call(context,[[0,0],[10,0],[10,10],[0,10]],groundMaterial,height);
   assert(ground.position.y>water.position.y,'terrain remains above sea');
   assert(ground.renderOrder<water.renderOrder,'terrain writes depth before sea shading');
   assert.equal(ground.material.transparent,false);
   assert.equal(ground.material.depthTest,true);assert.equal(ground.material.depthWrite,true);
   assert.equal(ground.receiveShadow,true);checks+=6;
  }
  // Compile the actual custom shader injection against Three's real standard
  // shader sources. No GPU is required to inspect early-depth prerequisites.
  const shader={uniforms:{...THREE.ShaderLib.standard.uniforms},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  assert(shader.fragmentShader.includes('uniform float landscapeTime;'));
  assert.strictEqual(shader.uniforms.landscapeTime,clock,'water animation clock is preserved');
  assert(shader.fragmentShader.includes('rippleNormal'),'water ripple shading is preserved');
  assert(!/\bgl_FragDepth(?:EXT)?\b/.test(shader.fragmentShader),'custom sea shader does not write fragment depth');
  assert(!/\bdiscard\b/.test(shader.fragmentShader),'custom sea shader does not discard fragments');checks+=5;
  const river=materials.landscapeWater(city,true,noise,clock);
  assert.equal(river.transparent,false);assert.equal(river.depthTest,true);assert.equal(river.depthWrite,true);checks+=3;
 }
 console.log(JSON.stringify({passed:true,checks,cities:4,note:'Actual renderer material, terrain and shader prerequisites for drawing opaque sea after occluders. This is not a GPU timing or pixel-equivalence measurement.'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
