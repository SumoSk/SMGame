require('./test-dom-compat.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g,get}=new Function('require',prefix+'return boot();')(require);
const makeRoad=(type='small',main=false,links=[])=>({type,main,links:new Set(links),load:0,wait:0});
function clear(){g.state.roads.clear();g.state.buildings.clear();g.state.citizens.clear();g.state.vehicles.clear();g.state.occ.clear();g.state.buildGrid.fill(-1);g.roadChanged([]);}
function pair(x,y,type='small'){const a=g.id(x,y),b=g.id(x+1,y);g.state.roads.set(a,makeRoad(type,false,[b]));g.state.roads.set(b,makeRoad(type,false,[a]));return[a,b];}
clear();
for(let x=10;x<=20;x++)g.state.roads.set(g.id(x,20),makeRoad('small',x===15,[...(x>10?[g.id(x-1,20)]:[]),...(x<20?[g.id(x+1,20)]:[])]));
g.roadChanged([]);
assert.equal(g.roadEraseSegmentCells(10,20,10,20).length,1,'single touch selects one centerline node');
const stroke={pan:false,cells:[],eraseLastX:10,eraseLastY:20,eraseSeen:new Set()};
g.appendRoadEraseStroke(stroke,20,20);assert.equal(stroke.cells.length,11,'sparse pointer movement has no gaps');
g.appendRoadEraseStroke(stroke,10,20);assert.equal(stroke.cells.length,11,'backtracking does not duplicate deletion');
assert.equal(g.roadEraseSegmentCells(-1,20,20,20).length,0);
const unselected=g.id(28,28);g.state.roads.set(unselected,makeRoad());g.roadChanged([]);
assert(g.demolishRoadStroke(stroke.cells));assert.equal(g.state.roads.size,12,'no deletion before confirmation');
get('confirmDialog').onclick();assert.equal(g.state.roads.size,2);assert(g.state.roads.has(g.id(15,20)),'protected main road survives');assert(g.state.roads.has(unselected),'unselected road survives');
clear();
const wide=pair(30,30,'medium'),lower=pair(30,31,'small'),outside=pair(30,34,'small');g.roadChanged([]);
const layers=g.roadEraseSegmentCells(30,30.6,31,30.6);
for(const id of [...wide,...lower])assert(layers.includes(id),'every pavement under the stroke is selected, including overlapping roads');
assert(outside.every(id=>!layers.includes(id)),'a separate neighboring road is untouched');
assert(g.demolishRoadStroke(layers,true));assert([...wide,...lower].every(id=>!g.state.roads.has(id)));assert(outside.every(id=>g.state.roads.has(id)));
assert.equal(g.roadEraseSegmentCells(30,30.6,31,30.6).length,0,'deleted area contains no second layer');
clear();
const oldA=g.id(20,20),oldB=g.id(21,20);g.state.roads.set(oldA,makeRoad('small',false,[oldB]));g.state.roads.set(oldB,makeRoad());g.roadChanged([]);
assert(g.demolishRoad(oldB,true));assert(!g.state.roads.get(oldA).links.has(oldB),'asymmetric legacy incoming links cannot leave an asphalt stub');
g.validateSave(JSON.parse(g.snapshot()));assert(g.loadGame(true,null,g.snapshot()));assert(!g.state.roads.has(oldB));assert(!g.state.roads.get(oldA).links.has(oldB),'removed road stays removed after save/load');

g.reset();g.selectTool('tree:thai_motorbike');const beforeCash=g.state.money;
assert(g.rotateLandscape());assert.equal(g.landscapeRotation,1);assert(g.plantLandscape(180.25,180.75,'thai_motorbike'));
let prop=g.state.plantedTrees.at(-1);assert.equal(prop.rotation,1,'placement stores the angle shown in the preview');
g.selectTool('hand');g.inspectAt(...g.screen(prop.x,prop.y,8));assert.equal(g.selected.record.item,prop);g.updateLandscapeQuickActions();assert.equal(get('landscapeQuickActions').hidden,false);
const action=name=>get('landscapeQuickActions').onclick({target:{closest:()=>({dataset:{landscapeAction:name}})},preventDefault(){},stopPropagation(){}});
action('rotate');assert.equal(prop.rotation,2);assert.equal(g.state.money,beforeCash,'rotation is free');
assert(g.loadGame(true,null,g.snapshot()));prop=g.state.plantedTrees.at(-1);assert.equal(prop.rotation,2,'rotated props survive save/load');
g.selectTool('hand');g.inspectAt(...g.screen(prop.x,prop.y,8));const countBeforeDelete=g.state.plantedTrees.length;action('delete');assert(!g.state.plantedTrees.includes(prop),'one click deletes immediately');assert.equal(g.state.plantedTrees.length,countBeforeDelete-1,'delete affects only one selected piece');assert.equal(get('landscapeQuickActions').hidden,true);
assert(g.plantLandscape(190,190,'thai_motorbike',3));prop=g.state.plantedTrees.at(-1);g.beginMoveLandscape({item:prop});assert(g.rotateLandscape());assert.equal(prop.rotation,3,'preview rotation while moving does not mutate the original');
g.cancelBuildingMove();assert.equal(prop.rotation,3,'canceling a move preserves the original orientation');
g.selectTool('tree:shade');assert.equal(g.rotateLandscape(),true,'trees expose the same rotate action as decorations');

(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const {TrafficRenderer}=await import(pathToFileURL(path.resolve('dist/renderer3d.js')).href);
 const receiver={roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),lampGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup,buildBorderCheckpoints(){}};
 const a=g.id(50,50),b=g.id(51,50);const broken={...g.state,roads:new Map([[a,makeRoad('small',false,[b])]])};
 TrafficRenderer.prototype.makeRoads.call(receiver,broken,g.ROADS,()=>0);receiver.roadGroup.updateMatrixWorld(true);
 const hit=new THREE.Raycaster(new THREE.Vector3(50.9,10,50),new THREE.Vector3(0,-1,0)).intersectObjects(receiver.roadGroup.children,true);
 assert.equal(hit.length,0,'renderer does not draw a phantom link to a missing road');
 const preview={previewGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup,tree(){throw Error('a decoration must not preview as a tree')},decoration(batch,x,y,kind,rotation){assert.equal(kind,'thai_motorbike');assert([2,3].includes(rotation));return true;}};
 TrafficRenderer.prototype.preview.call(preview,g.state,{x:190,y:190,rawX:190.25,rawY:190.75,decorationRotation:3},null,'tree:thai_motorbike',null,g.CATALOG,g.ROADS,()=>0,()=>({}));
 const first=preview.previewKey;TrafficRenderer.prototype.preview.call(preview,g.state,{x:190,y:190,rawX:190.25,rawY:190.75,decorationRotation:2},null,'tree:thai_motorbike',null,g.CATALOG,g.ROADS,()=>0,()=>({}));
 assert.notEqual(preview.previewKey,first,'changing angle invalidates the preview cache');
 console.log('PASS: complete overlapping-road deletion, sparse strokes, legacy links, protected roads, save/load, prop placement/rotation/deletion, cancel, and renderer previews.');
})().catch(error=>{console.error(error);process.exitCode=1});
