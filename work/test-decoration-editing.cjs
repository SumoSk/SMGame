require('./test-dom-compat.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g,get}=new Function('require',prefix+'return boot();')(require);
g.reset();const cash=g.state.money,quota=JSON.stringify(g.state.buildingQuota);
assert.equal(g.DECOR_KINDS.length,120);
for(let i=0;i<g.DECOR_KINDS.length;i++){
 const type=g.DECOR_KINDS[i];assert(g.plantLandscape(180+i%8*3,180+Math.floor(i/8)*3,type.key));
 g.selectTool('tree:'+type.key); // All kinds must also keep row/brush labels valid.
}
assert.equal(g.state.money,cash);assert.equal(JSON.stringify(g.state.buildingQuota),quota);
g.selectTool('hand');const item=g.state.plantedTrees[0];
g.inspectAt(...g.screen(item.x,item.y,8));assert.equal(g.selected.kind,'landscape');
assert(get('inspectContent').innerHTML.includes('ถังขยะ'));
const action=a=>get('inspectContent').onclick({target:{closest:()=>({dataset:{action:a}})}});
action('rotate-landscape');assert.equal(item.rotation,1);
action('move-landscape');assert.equal(get('cancelMoveBuilding').hidden,false);
g.finishCanvasInteraction({pan:false},...g.screen(150.5,150.5),'landscapeSelect');
assert.equal(item.x,150.5);assert.equal(item.y,150.5);
g.finishCanvasInteraction({landscape:{item},moved:true,pan:false},...g.screen(299.5,299.5),'hand');
assert.equal(item.x,299.5);assert.equal(item.y,299.5);
const all=JSON.stringify(g.state.plantedTrees),raw=g.snapshot();assert(g.loadGame(true,null,raw));
assert.equal(JSON.stringify(g.state.plantedTrees),all);assert.equal(g.state.plantedTrees[0].rotation,1);
const restored=g.state.plantedTrees[0];g.selectTool('hand');g.inspectAt(...g.screen(restored.x,restored.y,8));
action('delete-landscape');assert(g.state.plantedTrees.includes(restored),'wait for confirmation');
get('confirmDialog').onclick();assert(!g.state.plantedTrees.includes(restored));
const automatic={auto:true,x:171.25,y:171.75,kind:'shade'};
assert(g.moveLandscape(automatic,12,13));assert(g.state.hiddenAutoTrees.includes(g.id(171,171)));
assert(g.state.plantedTrees.some(t=>t.kind==='shade'&&t.x===12&&t.y===13));
assert(g.deleteLandscape({auto:true,x:172.5,y:173.5,kind:'palm'}));assert(g.state.hiddenAutoTrees.includes(g.id(172,173)));
assert(g.loadGame(true,null,g.snapshot()));assert(g.state.hiddenAutoTrees.includes(g.id(172,173)));
const retired=['bench_wood','bench_iron','picnic','umbrella','play_swing','play_slide','gazebo','bike_rack'];
const beforeMigration=JSON.stringify(g.state.plantedTrees),legacy=JSON.parse(g.snapshot());
for(let i=0;i<retired.length;i++){
 assert(!g.DECOR_KINDS.some(k=>k.key===retired[i]));
 assert.equal(g.plantLandscape(250+i,250,retired[i]),false);
 legacy.plantedTrees.push({x:250+i,y:250,kind:retired[i],rotation:1});
}
assert(g.loadGame(true,null,JSON.stringify(legacy)),'retired furniture must not break old saves');
assert.equal(JSON.stringify(g.state.plantedTrees),beforeMigration,'remove only retired pieces from loaded cities');
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {Renderer,Batch}=new Function('THREE',source+'return{Renderer:TrafficRenderer,Batch};')(THREE),r=Object.create(Renderer.prototype);
 const thaiKinds=g.DECOR_KINDS.filter(k=>/^(thai_|industrial_|temple_|landmark_)/.test(k.key));
 assert.equal(thaiKinds.length,24,'all new Thai decorations must be present');
 assert(source.includes('const scale=.35'),'new Thai models must be 35% of their original dimensions');
 assert(!source.includes("box('#e4bd67',u,base+.04,v,w+.18,.10,d+.18)"),'old broad temple roof crossbeam must be absent');
 assert(source.includes('roofPattern(0,0,5.20,3.52,2.58,1.05)'),'temple roof must include detailed ceramic tile motifs');
 for(const kind of g.DECOR_KINDS)for(let turn=0;turn<4;turn++){
  const b=new Batch();b.pickId=7;assert(r.decoration(b,150,150,kind.key,turn));
  const parts=[...b.data.values()].flatMap(a=>a.items);assert(parts.length>1,kind.key+' needs a distinct model');
  for(const p of parts){
   assert([p.x,p.y,p.z,p.sx,p.sy,p.sz,p.rx,p.ry,p.rz].every(Number.isFinite),kind.key);
   assert.equal(p.buildingId,7);
   if(/^(thai_|industrial_|temple_|landmark_)/.test(kind.key)){
    // 35%-size footprint must stay on the same cell through all four rotations.
    assert(p.sx<=2.0&&p.sy<=1.25&&p.sz<=1.35,kind.key+' exceeds 35% size envelope');
    assert(Math.abs(p.x-150)<1.22&&Math.abs(p.z-150)<1.22,kind.key+' moved off its placement cell');
    assert(p.y>=0&&p.y<=1.95,kind.key+' is above its 35% vertical envelope');
   }
  }
 }
 // High detail only near camera; far items preserve silhouette without tiny ornaments.
 let farCount=0,nearCount=0;
 for(const kind of thaiKinds){
  const close=new Batch(),far=new Batch();
  assert(r.decoration(close,150,150,kind.key,0,'near'));
  assert(r.decoration(far,150,150,kind.key,0,'far'));
  const count=b=>[...b.data.values()].reduce((n,entry)=>n+entry.items.length,0);
  assert(count(close)>count(far)&&count(far)>0,kind.key+' should support reduced distant detail');
  nearCount+=count(close);farCount+=count(far);
 }
 assert(farCount<nearCount*.80,'distant Thai scenery should reduce instanced geometry significantly');
 r.treeGroup=new THREE.Group();r.buildingGroup=new THREE.Group();r.graphicQuality='medium';r.coast=()=>125;
 r.trees(g.state,{x:185,y:185});assert(r.landscapePicks.size>0);
 assert([...r.landscapePicks.values()].some(v=>v.item),'manual props are selectable');
 assert([...r.landscapePicks.values()].some(v=>v.auto),'automatic trees are selectable');
 for(const mesh of r.treeGroup.children[0].children)assert(mesh.userData.ids.every(id=>id==null||r.landscapePicks.has(id)));
 console.log('PASS: 120 decorations × 4 rotations; 24 Thai models at 35% scale, ornate ceramic roofs, near/far detail LOD, selection and save roundtrip ('+farCount+'/'+nearCount+' distant/near instances)');
})().catch(e=>{console.error(e);process.exitCode=1;});
