const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
(async()=>{
const {TrafficRenderer}=await import('../dist/renderer3d.js'),THREE=await import('../dist/vendor/three.module.js');
const game=new Function('require',fixture+'return game;')(require);
const receiver={roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup};
function render(){TrafficRenderer.prototype.makeRoads.call(receiver,game.state,game.ROADS,game.junction);return receiver.signals.length;}
function reset(){game.reset();game.state.roads.clear();game.state.junctionCache.clear();game.state.footprint.fill(-1);game.state.gates=[];}
function build(a,b,type){const cells=game.lineCells(game.id(...a),game.id(...b));assert(game.buildRoad(cells,type,true));return cells;}
reset();build([10,10],[20,10],'large');build([20,10],[25,10],'large');assert.equal(render(),0,'same-size continuation has no traffic signals');for(const i of game.state.roads.keys())assert.equal(game.xy(i)[1],10,'no road stub outside the drawn axis');
build([25,10],[25,16],'small');assert.equal(render(),0,'two-arm bend of mixed sizes is not an intersection');
let taperPieces=0;receiver.roadGroup.traverse(o=>{if(!o.isInstancedMesh||o.material.color.getHex()!==0x47565c)return;const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();for(let k=0;k<o.count;k++){o.getMatrixAt(k,matrix);matrix.decompose(position,rotation,scale);if(scale.x<.4&&scale.z>game.ROADS.small.visualWidth&&scale.z<game.ROADS.large.visualWidth)taperPieces++;}});assert(taperPieces>=12,'mixed-size connection has a gradual width transition');
build([18,10],[18,17],'small');assert.equal(game.junction(game.id(18,10)),3);assert.equal(render(),3,'a T junction has one signal per real arm');
build([18,10],[18,4],'small');assert.equal(game.junction(game.id(18,10)),4);assert.equal(render(),4,'crossing has four signals');
let bars=0;receiver.roadGroup.traverse(o=>{if(o.isInstancedMesh&&o.material.color.getHex()===0xedf0df){bars+=o.count;const m=new THREE.Matrix4(),p=new THREE.Vector3();for(let n=0;n<o.count;n++){o.getMatrixAt(n,m);p.setFromMatrixPosition(m);assert(Math.hypot(p.x-18,p.z-10)>=game.ROADS.large.visualWidth/2,'stop bars stay outside the junction center');}}});assert.equal(bars,4,'one stop bar per arm; no zebra-stripe graphics');
// Reject diagonal graph links instead of creating a spur.
assert(game.checkRoad([game.id(40,40),game.id(41,41)],'small').error);
reset();build([10,10],[20,10],'large');const raw=game.lineCells(game.id(10,11),game.id(20,11));for(const i of raw)assert.equal(game.xy(i)[1],11,'off-axis footprint must not bend the line');
assert(game.checkRoad(raw,'small').error,'drawing along an occupied shoulder cannot create parallel stubs');
console.log(JSON.stringify({passed:true,coverage:['same-size continuation without signals','mixed-size bend without signals','gradual tapered road surface','T and cross intersection signal counts','stop bars outside clear asphalt center','axis-preserving road drawing','diagonal link rejection']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
