const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const Renderer=new Function('THREE',src+'return TrafficRenderer;')(THREE);
 const r=Object.create(Renderer.prototype);r.scene=new THREE.Scene();r.w=800;r.h=600;r.cam={x:0,y:0,z:2};r.camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,1000);r.camera.position.set(0,30,20);r.camera.lookAt(0,0,0);r.createCars();r.graphicQuality='veryHigh';
 const state={buildings:new Map([[1,{id:1,key:'test',x:0,y:0,rotation:0,parked:new Set([7]),parkingSlots:[7]}]]),citizens:new Map(),vehicles:new Map([[2,{id:2,phase:'driving',x:2}]])};
 let parkedX=.5;r.parking={parkingIsMoving:()=>false,parkingSlotPose:()=>({x:parkedX,y:.5,angle:0}),citizenCarColor:()=> '#aaccdd'};
 const position=v=>({x:v.x,y:.5,angle:0});const draw=()=>r.cars(state,position,null,()=> 'green',{kind:'parked',id:7},true);
 const attrs=()=>[...r.carSets.values()].flatMap(s=>[s.body.instanceMatrix,s.trim.instanceMatrix,s.headlights.instanceMatrix,s.taillights.instanceMatrix,s.lightSpill.instanceMatrix,s.body.instanceColor]);
 draw();const versions=attrs().map(a=>a.version);draw();assert.deepEqual(attrs().map(a=>a.version),versions,'stationary frame does not upload body, paint or lights');assert(r.carSelectionFrame.visible,'selection stays live');
 // Simulate completed GPU uploads; only the moving prefix should become dirty.
 for(const a of attrs())a.clearUpdateRanges();state.vehicles.get(2).x+=.1;draw();
 for(const set of r.carSets.values())if(set.body.instanceMatrix.updateRanges.length)assert(set.body.instanceMatrix.updateRanges[0].count<=16,'parked suffix is excluded from the moving upload');
 state.buildings.get(1).parked.clear();draw();state.buildings.get(1).parked.add(7);draw();assert(r.carMarkerMesh.count>=1,'parking departure/re-entry stays visible');
 r.hideCars();draw();assert([...r.carSets.values()].some(s=>s.body.count>0),'cars restore after heatmap');
 for(const level of ['medium','far']){
  const car={x:1,z:2,angle:0,altitude:0,color:'#aaccdd',kind:0};r.updateSimpleCars(level,[car]);const set=r.carLODSets.get(level),version=set.body.instanceMatrix.version,paint=set.body.instanceColor.version;
  r.updateSimpleCars(level,[{...car}]);assert.equal(set.body.instanceMatrix.version,version);assert.equal(set.body.instanceColor.version,paint);
  r.updateSimpleCars(level,[{...car,color:'#ff0000'}]);assert.equal(set.body.instanceMatrix.version,version);assert(set.body.instanceColor.version>paint);
  r.updateSimpleCars(level,[{...car,x:3}]);assert(set.body.instanceMatrix.version>version);
 }
 r.graphicQuality='low';draw();assert(r.carLODStats.far>0);r.graphicQuality='veryHigh';draw();assert(r.carLODStats.near>0,'quality changes rebuild the correct visible tier');
 // Exercise the real label updater with a minimal DOM and a controllable clock.
 let now=1000,writes=0;const made=[];
 const element=()=>{const e={textContent:'',children:[],style:new Proxy({},{set(o,k,v){if(k==='left'||k==='top')writes++;o[k]=v;return true;}}),setAttribute(){},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},querySelectorAll(){return []},remove(){}};made.push(e);return e;};
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0].replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,').replace("fs.readFileSync('dist/game.js','utf8')",'source').replace('vm.createContext(context);',"context.Date=Clock;context.document.createElement=element;get('world').insertAdjacentElement=()=>{};vm.createContext(context);").replace('return{game,get};','return{game,get,context};');
 class Clock extends Date{static now(){return now}}
 const source=fs.readFileSync('dist/game.js','utf8').replace('function screen(x,y,h=0){','function screen(x,y,h=0){globalThis.projections=(globalThis.projections||0)+1;').replace('__TRAFFIC_TEST_HARNESS__({','__TRAFFIC_TEST_HARNESS__({toggleBuildingLabels,resize,');
 const {game:g,context}=new Function('require','source','Clock','element',fixture+'return boot();')(require,source,Clock,element);
 g.state.money=1e9;const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);g.updatePlaceLabels();assert(writes>0);
 const before=()=>({projections:context.projections,writes});let saved=before();g.updatePlaceLabels();assert.deepEqual(before(),saved,'idle labels do not project or move');
 now+=301;g.state.vehicles.set(999,{toId:home.id});g.updatePlaceLabels();assert.deepEqual(before(),saved,'count refresh does not move labels');assert(made.some(e=>e.textContent.startsWith('1 / ')),'counts still refresh');
 for(const field of ['x','y','z','angle','elevation']){saved=before();g.cam[field]+=.01;g.updatePlaceLabels();assert(context.projections>saved.projections,field+' invalidates label projection');}
 saved=before();context.innerWidth+=50;g.resize();g.updatePlaceLabels();assert(context.projections>saved.projections,'resize invalidates projection');
 saved=before();home.x++;g.state.buildingVisualVersion++;g.updatePlaceLabels();assert(context.projections>saved.projections,'building move invalidates projection');
 g.toggleBuildingLabels();g.toggleBuildingLabels();assert(made.filter(e=>e.className==='place-building-label').length>=2,'labels can be recreated after hide');
 console.log('PASS: idle body/paint/light buffers unchanged; moving upload excludes parked suffix; parking, heatmap, selection, quality and paint changes work; idle labels skip projection while counts, camera, resize and building moves update');
})().catch(e=>{console.error(e);process.exitCode=1});
