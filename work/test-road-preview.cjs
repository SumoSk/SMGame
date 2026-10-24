const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
(async()=>{
 const {game,get}=new Function('require',fixture+'return {game,get};')(require);
 const THREE=await import('../dist/vendor/three.module.js'),{TrafficRenderer}=await import('../dist/renderer3d.js');
 const render=(state,junction)=>{const receiver={roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup,parking:{roadsideVisuals:game.roadsideVisuals}};TrafficRenderer.prototype.makeRoads.call(receiver,state,game.ROADS,junction,true);return receiver;};
 const signature=group=>{const rows=[];group.traverse(o=>{if(!o.isMesh)return;rows.push([o.material.color.getHex(),o.count||0,Array.from(o.geometry.attributes.position.array),o.instanceMatrix?Array.from(o.instanceMatrix.array):null]);});return JSON.stringify(rows);};
 assert.equal(game.ROADS.small.visualWidth,game.ROADS.medium.visualWidth/2);
 assert.equal(game.ROADS.small.width,game.ROADS.medium.width/2);
 for(const type of ['small','medium','large']){
  game.reset();game.state.roads.clear();game.state.gates=[];game.roadChanged([]);
  const existing=game.lineCells(game.id(100,100),game.id(114,100));game.buildRoad(existing,'medium',true);
  const cells=game.lineCells(game.id(107,100),game.id(107,108));
  const before=signature(render(game.state,game.junction).roadGroup),cash=game.state.money,count=game.state.roads.size,version=game.state.version,links=[...game.state.roads.get(cells[0]).links];
  game.buildRoad(cells,type);
  const plan=game.getRoadPreview();assert(plan);assert(!plan.error);assert.equal(game.pendingRoadPreview.type,type);
  const preview=render(plan.state,plan.junction);assert(preview.roadGroup.children.length>0);
  const receiver={previewKey:'',previewGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup,parking:{roadsideVisuals:game.roadsideVisuals}};
  TrafficRenderer.prototype.preview.call(receiver,game.state,null,null,type,null,game.CATALOG,game.ROADS,game.junction,game.checkBuilding,plan);
  assert.equal(receiver.previewGroup.children.length,2,'real road and signal groups remain visible without hover');
  assert.equal(game.state.money,cash);assert.equal(game.state.roads.size,count);assert.equal(game.state.version,version);assert.deepEqual([...game.state.roads.get(cells[0]).links],links);
  game.closeModal();game.selectTool('hand');assert.equal(game.getRoadPreview(),null);assert.equal(signature(render(game.state,game.junction).roadGroup),before,'cancel leaves actual geometry untouched');
  game.buildRoad(cells,type);get('confirmDialog').onclick();assert.equal(game.pendingRoadPreview,null);assert.equal(game.state.roads.size,count+8);assert(game.state.money<cash);
  assert.equal(signature(render(game.state,game.junction).roadGroup),signature(preview.roadGroup),'confirmed surface and paint match the preview');
 }
 console.log(JSON.stringify({passed:true,coverage:['half-width small road','all three real road previews','mixed-size junction geometry','no preview charge or graph mutation','cancel','confirm matches preview']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
