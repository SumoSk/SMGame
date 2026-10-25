const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer}=new Function('THREE',src+'return {TrafficRenderer};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 r.scene=new THREE.Scene();r.w=800;r.h=600;
 r.cam={x:0,y:0,z:2};
 r.camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,1000);
 r.camera.position.set(0,30,20);r.camera.lookAt(0,0,0);
 r.createCars();
 r.parking={parkingIsMoving:()=>false,parkingSlotPose:()=>null,citizenCarColor:()=> '#aaccdd'};
 const vehicles=new Map([
  [1,{id:1,citizenId:1,phase:'driving',x:.5,z:.5}],
  [2,{id:2,citizenId:2,phase:'driving',x:10000,z:10000}]
 ]);
 const state={vehicles,citizens:new Map(),buildings:new Map()};
 const position=v=>({x:v.x,y:v.z,angle:0});
 const selected={kind:'vehicle',id:1};
 r.cars(state,position,null,()=> 'green',selected,true);
 assert.equal(r.carLODStats.near,1,'near cars use original detailed instanced geometry');
 assert.equal(r.carLODStats.culled,1,'offscreen vehicles do not go into draw calls');
 assert.equal(r.carMarkerMesh.count,1,'only visible status diamonds are drawn');
 assert.equal(r.carSelectionFrame.visible,true);
 assert.equal(r.carLODSets.size,0,'no proxy geometry allocated in close-up view');
 r.cars(state,position,null,()=> 'green',selected,false);
 assert.equal(r.carMarkerMesh.visible,false,'hidden diamonds are not rendered');
 assert.equal(r.carMarkerMesh.count,0);
 assert.equal(r.carIndicatorHits.length,0,'no invisible marker picking');
 assert.equal(r.carSelectionFrame.visible,true,'selected car remains highlighted when diamonds hidden');
 r.cars(state,position,null,()=> 'green',selected,true);
 assert.equal(r.carMarkerMesh.count,1,'diamonds return when the toggle is enabled');

 r.camera.left=-20;r.camera.right=20;r.camera.top=15;r.camera.bottom=-15;
 r.camera.updateProjectionMatrix();
 r.cars(state,position,null,()=> 'green',selected,true);
 assert.equal(r.carLODStats.medium,1,'medium zoom receives simpler silhouette/cabin geometry');
 assert.equal(r.carLODSets.get('medium').body.count,1);
 assert.equal(r.carLODSets.get('medium').roof.count,1);
 assert.equal(r.carSets.size,1,'near original mesh remains cached for subsequent zoom in');
 r.camera.left=-60;r.camera.right=60;r.camera.top=45;r.camera.bottom=-45;
 r.camera.updateProjectionMatrix();
 r.cars(state,position,null,()=> 'green',selected,true);
 assert.equal(r.carLODStats.far,1,'far zoom uses one cheap proxy');
 assert.equal(r.carLODSets.get('far').body.count,1);
 assert.equal(r.carLODSets.get('far').roof,null);
 assert.equal(r.carLODSets.get('medium').body.count,0,'invisible middle tier has zero instance count');
 assert.equal(r.carLODStats.culled,1);

 const html=fs.readFileSync('dist/index.html','utf8');
 assert.match(html,/id="toggleBuildingLabels".*id="toggleCarDiamonds".*id="toggleEyeComfort"/,
  'new switch is immediately beside the building label switch');
 assert.match(html,/id="toggleCarDiamondsText">ปิดเพชร/,'defaults to showing diamonds');

 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8')
  .split('const results=[]')[0].replace('return{game,get};','return{game,get,context};');
 const {game,get,context}=new Function('require',fixture+'return boot();')(require);
 const vm=require('node:vm');
 const switchButton=get('toggleCarDiamonds'),caption=get('toggleCarDiamondsText');
 assert.equal(typeof switchButton.onclick,'function');
 game.drawCarIndicators2D();
 const before2D=vm.runInContext('canvasCarMarkerHits.length',context);
 assert.ok(before2D>0,'default 2D mode has visible markers in starter city');
 switchButton.onclick();
 assert.equal(caption.textContent,'เปิดเพชร');
 assert.equal(vm.runInContext('carStatusDiamondsVisible',context),false);
 game.drawCarIndicators2D();
 assert.equal(vm.runInContext('canvasCarMarkerHits.length',context),0,
  'hidden diamonds also clear 2D hit targets');
 switchButton.onclick();
 assert.equal(caption.textContent,'ปิดเพชร');
 game.drawCarIndicators2D();
 assert.equal(vm.runInContext('canvasCarMarkerHits.length',context),before2D,
  '2D car markers return without changing traffic state');
 console.log('Car LOD: detailed/middle/far geometry, offscreen culling, 3D marker toggle, selection persistence and UI position passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
