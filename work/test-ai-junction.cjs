const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8')
  .split('const results=[]')[0];
 const {game,get}=new Function('require',fixture+'return boot();')(require);
 const center=game.id(150,150),slots=game.signalSlots(center);
 assert.equal(slots.length,4);
 assert.equal(game.state.money,500000);
 assert.equal(game.buyAISignal(center),false,'insufficient money cannot purchase');
 assert.equal(game.state.money,500000);
 game.state.money=2500000;
 assert.equal(game.buyAISignal(center),true);
 assert.equal(game.state.money,1500000,'charge exactly 1 million');
 assert.equal(game.state.signals.get(center).mode,'smart');
 assert.equal(game.buyAISignal(center),false,'repeat purchase must be rejected');
 assert.equal(game.state.money,1500000,'repeat click cannot charge twice');
 assert.equal(game.signalStatus(center).phase,-1,'initial installation starts all-red');
 assert.equal(game.controlSignal(center,'manual'),false,'smart installation cannot be manually overwritten');
 assert.equal(game.editSignal(center,{mode:'manual'}),false,'manual timing cannot disable purchased smart mode');
 game.state.time+=2;
 // Feed a queue of approaching westbound traffic toward this exact junction.
 const pathWest=[game.id(148,150),game.id(149,150),center,game.id(151,150)];
 for(let k=0;k<12;k++)game.state.vehicles.set(80000+k,{
  id:80000+k,phase:'driving',path:[...pathWest],pos:1,wait:6,pathSet:new Set(pathWest)
 });
 const scores=game.aiSignalQueuePressure().get(center);
 assert(scores&&scores.some(q=>q.cars>=12),'smart estimator must see approach queues');
 game.smartSignalStep();
 const st=game.signalStatus(center);
 assert.equal(st.phase,slots.find(x=>x.incoming===0).incoming,'AI chooses the queued direction');
 assert.equal(st.yellow,false);
 for(const slot of slots)for(let lane=0;lane<slot.lanes;lane++)
  assert.equal(game.signalColor(center,slot.incoming,lane),slot.incoming===st.incoming?'green':'red',
   'all lanes of only the selected approach should be green');
 game.state.time+=3;game.smartSignalStep();
 assert.equal(game.signalStatus(center).incoming,st.incoming,'minimum green 5 min');
 game.state.time+=17;game.smartSignalStep();
 assert.equal(game.signalStatus(center).yellow,true,'max green must transition to yellow');
 for(const slot of slots)assert(!game.signalAllows(center,slot.incoming,0),
  'yellow must deny new entries on every approach');
 game.state.time+=2;game.smartSignalStep();
 assert.equal(game.signalStatus(center).phase,-1,'yellow must become all-red clearance');
 game.state.time+=2;game.smartSignalStep();
 assert(game.signalStatus(center).phase>=0,'AI must resume green after clearance');
 for(let k=0;k<12;k++)game.state.vehicles.delete(80000+k);
 const state=JSON.parse(game.snapshot()),savedTime=game.state.time;
 assert.equal(state.money,1500000);
 assert.equal(state.signals.find(([node])=>node===center)[1].mode,'smart');
 assert.doesNotThrow(()=>game.validateSave(state));
 assert(game.loadGame(true,null,JSON.stringify(state)),'save with AI signal must load');
 assert.equal(game.state.signals.get(center).mode,'smart');
 assert.equal(game.state.money,1500000);
 assert.equal(game.state.time,savedTime);
 assert.equal(game.restoreRecommendedSignals()>=0,true);
 assert.equal(game.state.signals.get(center).mode,'smart','global signal reset must preserve paid upgrade');
 const corrupted=JSON.parse(game.snapshot());
 corrupted.signals.find(([i])=>i===center)[1].smartPhase='teleport';
 assert.throws(()=>game.validateSave(corrupted),/Invalid signal setting/);
 game.state.roads.get(center).links.clear();
 game.roadChanged([center]);
 assert.equal(game.state.signals.has(center),false,'demolished junction loses installed AI');
 assert.equal(game.state.money,1500000,'demolishing junction gives no refund');

 const src=fs.readFileSync('dist/game.js','utf8');
 const css=fs.readFileSync('dist/style.css','utf8');
 assert(src.includes("button.className='ai-junction-pin'"),'AI button should float over junction');
 assert(src.includes("openAISignalUpgrade(node)"),'touching AI badge opens purchase/owned junction');
 assert(css.includes('pointer-events:auto;touch-action:manipulation'),'AI marker is clearly tappable');
 assert(css.includes('.ai-junction-pin.owned'),'bought icon must have distinct blue style');
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const rendererSource=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer}=new Function('THREE',rendererSource+'return {TrafficRenderer};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 r.aiSignalGroup=new THREE.Group();r.aiSignalGlows=[];r.aiSignalKey='';
 r.disposeGroup=TrafficRenderer.prototype.disposeGroup;
 const state3D={city:'phuket',roads:new Map([[center,{type:'large'}]]),signals:new Map([[center,{mode:'smart'}]])};
 r.updateAISignalGlow(state3D);
 assert.equal(r.aiSignalGroup.children.length,6,'cyan ground halo, ring, four corner lights');
 assert.equal(r.aiSignalGlows.length,1);
 state3D.signals.clear();r.updateAISignalGlow(state3D);
 assert.equal(r.aiSignalGroup.children.length,0,'deleted AI glow disappears');
 console.log('AI junction purchase: billing, one-junction ownership, safe signal phases, queue priorities, save/load, global reset, demolition, blue center glow and clickable badges passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
