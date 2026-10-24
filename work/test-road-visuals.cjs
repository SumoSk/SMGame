const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
(async()=>{
 const THREE=await import('../dist/vendor/three.module.js'),{TrafficRenderer}=await import('../dist/renderer3d.js');
 const {game,install,turnPath}=new Function('require',fixture+'return {game,install,turnPath};')(require);
 const receiver={roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),lampGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup};
 const render=()=>{TrafficRenderer.prototype.makeRoads.call(receiver,game.state,game.ROADS,game.junction);receiver.roadGroup.updateMatrixWorld(true);};
 const meshes=color=>{const out=[];receiver.roadGroup.traverse(o=>{if(o.isMesh&&o.material.color.getHex()===color)out.push(o);});return out;};
 const hit=(objects,x,z)=>new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0)).intersectObjects(objects).length>0;
 let turns=0;
 for(const crossing of [false,true])for(const inbound of ['small','medium','large'])for(const outbound of ['small','medium','large'])for(const sign of [-1,1])for(let rotation=0;rotation<4;rotation++){
  const v=install(turnPath(sign,rotation),i=>i<=8?inbound:outbound,crossing),plan=game.motionPlan(v),turn=plan.turns[0];render();const asphalt=meshes(0x47565c);
  for(let k=0;k<=40;k++){const p=game.positionOnMotion(plan,turn.startDistance+(turn.endDistance-turn.startDistance)*k/40);for(const side of [-.13,0,.13])assert(hit(asphalt,p.x-.5-p.dy*side,p.y-.5+p.dx*side),'rounded bend must support the vehicle width '+JSON.stringify({inbound,outbound,sign,rotation,k,side}));}
  const layout=game.junctionDetails(v.path[8]),paint=meshes(0xead78c);assert(layout.borders.some(edge=>edge.length>=16),'corners use sampled curves');
  for(const port of layout.ports){const [dx,dz]=[[1,0],[0,1],[-1,0],[0,-1]][port.dir];for(const sign of [-1,1])for(const step of (crossing?[0,.03]:[-.03,0,.03])){const x=150+dx*(port.extent+step)-dz*.035*sign,z=150+dz*(port.extent+step)+dx*.035*sign;assert(hit(paint,x,z),'yellow lines meet the bend boundary without a gap '+JSON.stringify({inbound,outbound,sign,rotation,dir:port.dir,step,x,z}));}}
  const white=meshes(0xdce3d8);for(const port of layout.ports){const [dx,dz]=[[1,0],[0,1],[-1,0],[0,-1]][port.dir];for(const side of [-1,1])for(const step of [0,.03])assert(hit(white,150+dx*(port.extent+step)-dz*port.width/2*side,150+dz*(port.extent+step)+dx*port.width/2*side),'white road edge meets the rounded curb');}
  game.drawRoads();turns++;
 }
 // Paint goes right up to the intersection; the old whole-link suppression
 // left one or two bare grid cells here. No center line crosses its interior.
 const v=install(Array.from({length:17},(_,k)=>[142+k,150]),'large',true);render();const layout=game.junctionDetails(game.id(150,150)),paint=meshes(0xead78c);
 for(const port of layout.ports){const [dx,dz]=[[1,0],[0,1],[-1,0],[0,-1]][port.dir];for(let d=.01;d<1.8;d+=.08)assert(hit(paint,150+dx*(port.extent+d)-dz*.035,150+dz*(port.extent+d)+dx*.035),'approach paint remains visible all the way to the intersection');}
 assert(!hit(paint,150,150),'no straight yellow stripes through the center of a signal junction');
 // Clicking a signal junction must not crash the 3D animation loop. This
 // caught the missing `junction` argument in the selected-road preview path.
 const preview={previewKey:'',previewGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup};
 assert(game.junction(game.id(150,150))>=3,'fixture includes a traffic-light intersection');
 assert.doesNotThrow(()=>TrafficRenderer.prototype.preview.call(preview,game.state,null,null,'hand',{kind:'road',id:game.id(150,150)},game.CATALOG,game.ROADS,game.junction,()=>({error:null})),'selecting the intersection must not stop the 3D frame');
 assert.equal(preview.previewGroup.children.length,2,'3D selection highlights the road junction');
 // Optional geometry export for visual review, using the actual built meshes.
 if(process.env.SM_ROAD_QA){const frames=[];for(const bend of [false,true]){if(bend)install(turnPath(1),'medium');else install(Array.from({length:17},(_,k)=>[142+k,150]),i=>i<8?'large':'medium',true);render();const triangles=[];receiver.roadGroup.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.attributes.position,index=o.geometry.index,m=new THREE.Matrix4(),world=new THREE.Matrix4(),p=new THREE.Vector3();for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){if(o.isInstancedMesh){o.getMatrixAt(instance,m);world.multiplyMatrices(o.matrixWorld,m);}else world.copy(o.matrixWorld);for(let k=0;k<(index?index.count:pos.count);k+=3){const points=[];for(let n=0;n<3;n++){p.fromBufferAttribute(pos,index?index.getX(k+n):k+n).applyMatrix4(world);points.push([p.x-150,p.y,p.z-150]);}triangles.push({points,color:o.material.color.getHexString()});}}});frames.push(triangles);}fs.writeFileSync(process.env.SM_ROAD_QA,JSON.stringify(frames));}
 console.log(JSON.stringify({passed:true,turns,coverage:['rounded asphalt supports car width','continuous yellow-line joins','junction approach paint clipping','clear signal junction center']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
