'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(process.env.SMCITY_THREE_SOURCE||path.join(__dirname,'../../dist/vendor/three.module.js')).href);
 const source=fs.readFileSync(process.env.SMCITY_RENDER_SOURCE||path.join(__dirname,'../../dist/renderer3d.js'),'utf8');
 const start=source.indexOf(' chunkTreeFarGroup(group,'),end=source.indexOf(' // Keep the distant forest on the GPU.',start);
 assert(start>0&&end>start);const methods=new Function('THREE','return class {'+source.slice(start,end)+'};')(THREE).prototype,chunk=methods.chunkTreeFarGroup,mode=methods.updateTreeFarMode;
 function rows(group){const list=[];for(const mesh of group.children){if(!mesh.isInstancedMesh||!mesh.visible)continue;for(let i=0;i<mesh.count;i++)list.push({id:mesh.userData.ids[i],matrix:[...mesh.instanceMatrix.array.slice(i*16,i*16+16)],color:mesh.instanceColor?[...mesh.instanceColor.array.slice(i*3,i*3+3)]:null,geo:mesh.geometry,material:mesh.material,cast:mesh.castShadow,receive:mesh.receiveShadow,order:mesh.renderOrder,layer:mesh.layers.mask,visible:mesh.visible});}return list.sort((a,b)=>a.id-b.id);}
 let checks=0;const summaries=[];
 for(const cellSize of [36,54]){
  const group=new THREE.Group(),geo=new THREE.BoxGeometry(2,8,3),mat=new THREE.MeshStandardMaterial({color:'#649b62'}),mesh=new THREE.InstancedMesh(geo,mat,400),dummy=new THREE.Object3D();
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.renderOrder=2;mesh.layers.mask=3;mesh.userData={ids:[],nightGlow:false,test:'kept'};mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(400*3),3);mesh.instanceColor.setUsage(THREE.StaticDrawUsage);
  for(let i=0;i<400;i++){dummy.position.set((i%20)*15-10,(i%5)*.1,Math.floor(i/20)*15-10);dummy.rotation.set(.1*(i%3),i*.17,.08*(i%4));dummy.scale.set(1+(i%4)*.2,.5+(i%3),1+(i%5)*.15);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.userData.ids.push(1000+i);mesh.instanceColor.setXYZ(i,(i%7)/7,(i%5)/5,(i%11)/11);}
  mesh.computeBoundingSphere();group.add(mesh);const before=rows(group),oldSphere=mesh.boundingSphere.clone();let disposed=0;mesh.addEventListener('dispose',()=>disposed++);
  chunk.call({},group,cellSize);mode.call({},group,true);assert.deepEqual(rows(group),before,'geometry/material/transform/color/ID/render flags unchanged');checks++;
  assert.equal(disposed,0,'original bulk allocation retained');checks++;
  assert(group.children.length>1);checks++;
  for(const m of group.children){assert.strictEqual(m.geometry,geo);assert.strictEqual(m.material,mat);assert.equal(m.userData.test,'kept');assert.equal(m.instanceMatrix.usage,THREE.StaticDrawUsage);checks+=4;
   const vertex=new THREE.Vector3(),matrix=new THREE.Matrix4(),positions=geo.attributes.position;
   for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);for(let j=0;j<positions.count;j++){vertex.fromBufferAttribute(positions,j).applyMatrix4(matrix);assert(m.boundingSphere.containsPoint(vertex)||m.boundingSphere.distanceToPoint(vertex)<1e-5,'bounds include rotated/scaled geometry at chunk edges');checks++;}}
  }
  const children=[...group.children];chunk.call({},group,cellSize);assert.deepEqual(group.children,children,'repeating chunking is stable');checks++;
  const spheres=new Map(group.children.map(m=>[m,m.boundingSphere]));
  mode.call({},group,false);assert.deepEqual(rows(group),before,'zoomed out bulk has exactly the original active geometry');
  assert.equal(group.children.filter(m=>m.visible).length,1,'zoomed out draw count stays at the original one');checks+=2;
  mode.call({},group,true);assert.deepEqual(rows(group),before,'zoom back in retains exactly the same active geometry');checks++;
  for(const [m,sphere]of spheres){assert.strictEqual(m.boundingSphere,sphere,'mode changes reuse original bounds');checks++;}
  // Run the actual farTreeInstances index builder and mask implementation.
  const indexAt=source.indexOf('  for(const mesh of this.treeFarGroup.children){'),indexEnd=source.indexOf('\n }\n const zoomedIn=',indexAt);
  assert(indexAt>0&&indexEnd>indexAt);const context={treeFarGroup:group,farTreeInstances:new Map()};
  new Function(source.slice(indexAt,indexEnd)).call(context);
  assert.equal(context.farTreeInstances.get(1005).length,2,'mask index includes both bulk and chunk copy');checks++;
  const maskAt=source.indexOf(' const mask=(id,hide)=>{',indexEnd),maskEnd=source.indexOf(' for(const id of this.treeHiddenIds)',maskAt);
  assert(maskAt>0&&maskEnd>maskAt);const mask=new Function('changed',source.slice(maskAt,maskEnd)+'return mask;').call(context,new Map());
  mask(1005,true);const hiddenExpected=before.map(row=>row.id===1005?{...row,matrix:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]}:row);
  for(const zoom of [true,false,true,false]){mode.call({},group,zoom);assert.deepEqual(rows(group),hiddenExpected,'near-tree masking remains identical in both modes');checks++;}
  mask(1005,false);
  for(const zoom of [false,true]){mode.call({},group,zoom);assert.deepEqual(rows(group),before,'restoring a far tree restores both buffers');checks++;}
  const camera=new THREE.OrthographicCamera(-40,40,40,-40,.1,1000);camera.position.set(150,200,150);camera.up.set(0,0,-1);camera.lookAt(150,0,150);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let visible=0,submitted=0;for(const m of group.children){m.updateMatrixWorld();if(m.visible&&frustum.intersectsObject(m)){visible++;submitted+=m.count;}}
  assert(submitted<400,'offscreen chunks skip instances for a narrow viewport');checks++;
  summaries.push({cellSize,originalMeshes:1,retainedBulkMeshes:group.children.filter(m=>m.userData.farTreePartition==='bulk').length,chunks:group.children.filter(m=>m.userData.farTreePartition==='chunks').length,visibleChunks:visible,originalSubmittedInstances:400,chunkSubmittedInstances:submitted,originalSphereRadius:oldSphere.radius});
 }
 // Transparent or single-cell data preserve their original object/order.
 for(const transparent of [false,true]){
  const g=new THREE.Group(),m=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({transparent}),2),dummy=new THREE.Object3D();m.userData.ids=[1,2];dummy.position.x=transparent?90:1;dummy.updateMatrix();m.setMatrixAt(1,dummy.matrix);g.add(m);chunk.call({},g,54);assert.strictEqual(g.children[0],m);assert.equal(g.children.length,1);checks+=2;
 }
 // Original visibility stays authoritative in either mode.
 {
  const g=new THREE.Group(),m=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),2),dummy=new THREE.Object3D();
  m.userData.ids=[1,2];m.visible=false;dummy.position.x=90;dummy.updateMatrix();m.setMatrixAt(1,dummy.matrix);g.add(m);chunk.call({},g,54);
  for(const zoom of [true,false]){mode.call({},g,zoom);assert(g.children.every(o=>!o.visible));checks++;}
 }
 // An unchanged mode must not traverse any instance children again.
 assert.doesNotThrow(()=>mode.call({},{userData:{farTreeZoomedIn:true},get children(){throw Error('unnecessary traversal');}},true));checks++;
 // Execute the actual picking function. Skip only invisible partition copies;
 // untagged near objects retain the existing raycaster/picking policy.
 {
  const pickAt=source.indexOf(' pickLandscapes(x,y){'),pickEnd=source.indexOf(' pickLandscape(x,y){',pickAt);assert(pickAt>0&&pickEnd>pickAt);
  const pick=new Function('return ({'+source.slice(pickAt,pickEnd)+'}).pickLandscapes;')();
  for(const partition of ['bulk','chunks']){
   const hidden={visible:false,userData:{farTreePartition:partition,ids:[1]}},visible={visible:true,userData:{farTreePartition:partition==='bulk'?'chunks':'bulk',ids:[2]}},near={visible:false,userData:{ids:[3]}};
   const treeChildren=[],buildingChildren=[],choices=new Map([[1,{auto:true,x:1,y:0}],[2,{auto:true,x:2,y:0}],[3,{auto:true,x:3,y:0}]]);
   const context={treeGroup:{visible:true,children:treeChildren},buildingGroup:{children:buildingChildren},landscapePicks:choices,ndc:{set(){}},w:100,h:100,ray:{setFromCamera(){},intersectObjects:objects=>objects===buildingChildren?[]:[{object:hidden,instanceId:0,distance:1},{object:visible,instanceId:0,distance:2},{object:near,instanceId:0,distance:3}]}};
   assert.deepEqual(pick.call(context,50,50),[choices.get(2),choices.get(3)],'hidden alternate buffers never become pick targets');checks++;
  }
 }
 console.log(JSON.stringify({passed:true,checks,summaries,note:'CPU geometry and frustum tests with real Three.js. Synthetic layout only; no browser/GPU timing claim.'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
