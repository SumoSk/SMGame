const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {TrafficRenderer}=await import('../dist/renderer3d.js'),THREE=await import('../dist/vendor/three.module.js');
 const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
 const game=new Function('require',fixture+'return game;')(require);
 const receiver={roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),lampGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup,glowTexture:new THREE.Texture()};
 game.reset();game.state.roads.clear();game.state.junctionCache.clear();game.state.footprint.fill(-1);game.state.gates=[];
 for(const [a,b,t] of [[[140,150],[160,150],'large'],[[150,140],[150,160],'medium']])assert(game.buildRoad(game.lineCells(game.id(...a),game.id(...b)),t,true));
 TrafficRenderer.prototype.makeRoads.call(receiver,game.state,game.ROADS,game.junction);
 assert.equal(receiver.signals.length,12);assert.equal(receiver.signalGroup.children.length,36);assert.equal(new Set(receiver.signals.map(s=>s.node+':'+s.incoming+':'+s.lane)).size,12);
 for(const signal of receiver.signals){
  assert.deepEqual(Object.keys(signal.lenses),['red','yellow','green']);
  assert(signal.lenses.red.position.y>signal.lenses.yellow.position.y&&signal.lenses.yellow.position.y>signal.lenses.green.position.y);
 }
 for(const active of ['red','yellow','green']){
  TrafficRenderer.prototype.updateSignals.call(receiver,()=>active);
  const lit={red:0xff6855,yellow:0xffd56b,green:0x9eeb96};
  for(const s of receiver.signals)for(const [name,lens]of Object.entries(s.lenses))assert.equal(lens.material.color.getHex()===lit[name],name===active);
 }
 const rotations=new Set(receiver.signals.map(s=>s.lenses.red.rotation.y));assert.equal(rotations.size,4);
 let stripes=0;receiver.roadGroup.traverse(o=>{if(o.isInstancedMesh&&o.material.color.getHex()===0xf1eddb)stripes+=o.count;});assert(stripes>12);
 TrafficRenderer.prototype.makeRoads.call(receiver,game.state,game.ROADS,game.junction);assert.equal(receiver.signalGroup.children.length,36,'rebuild must replace old lenses');
 console.log(JSON.stringify({passed:true,signals:12,lenses:36,stripes:stripes}));
})().catch(e=>{console.error(e);process.exitCode=1;});
