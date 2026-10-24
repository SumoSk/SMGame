const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g,get}=new Function('require',base+';return boot();')(require);
 // This DOM API exists in browsers but not in the lightweight test harness.
 get('buildDock').closest=()=>null;
 assert.equal(g.state.plantedTrees.length,0);
 assert.equal(g.plantLandscape(150,150,'shade'),false,'trees must not occupy roads');
 assert.equal(g.plantLandscape(190,190,'flower'),true);
 assert.equal(g.plantLandscape(190,190,'shade'),false,'duplicate plant must be ignored');
 assert.equal(g.plantLandscape(194,190,'palm'),true);
 const before=g.snapshot();
 assert(g.loadGame(true,null,before),'the new save must load');
 assert.deepEqual(Array.from(g.state.plantedTrees,t=>t.kind),['flower','palm']);
 assert.equal(g.eraseLandscape(190.5,190.5),true);
 assert.equal(g.state.plantedTrees.length,1);
 assert.equal(g.eraseLandscape(198.5,198.5),true,'automatic planting exclusions must persist');
 assert(g.state.hiddenAutoTrees.length>0);
 assert(g.loadGame(true,null,g.snapshot()));
 assert(g.state.hiddenAutoTrees.length>0);
 const old=JSON.parse(before);delete old.plantedTrees;delete old.hiddenAutoTrees;
 assert(g.loadGame(true,null,JSON.stringify(old)),'existing saves without landscaping must remain valid');
 assert.equal(g.state.plantedTrees.length,0);
 assert.equal(g.state.hiddenAutoTrees.length,0);
 const bad=JSON.parse(before);bad.plantedTrees=[{x:-10,y:30,kind:'flower'}];
 assert.equal(g.loadGame(true,null,JSON.stringify(bad)),false,'invalid tree save must be rejected');
 // No redundant group row: Landscape and Roads are direct build categories.
 assert.equal(get('categories').innerHTML,'','old Buildings/Landscape/City Data group row must be empty');
 assert(get('subcategories').innerHTML.includes('data-category="landscape"'),'landscaping is in primary construction tabs');
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'landscape'}})}});
 assert(get('tools').innerHTML.includes('data-tool="tree:shade"'));
 assert(get('tools').innerHTML.includes('data-tool="treeBrush"'));
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'roads'}})}});
 assert(get('tools').innerHTML.includes('data-tool="small"'),'small road tool must be present');
 assert(get('tools').innerHTML.includes('data-tool="medium"'),'medium road tool must be present');
 assert(get('tools').innerHTML.includes('data-tool="large"'),'large road tool must be present');
 assert(!get('tools').innerHTML.includes('data-tool="hand"'),'road submenu only has three road sizes');
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'home'}})}});
 assert(get('tools').innerHTML.includes('class="tool-capacity">20</span>'),'current small home must show its 20-person capacity');
 assert(get('tools').innerHTML.includes('class="tool-capacity">40</span>'),'medium home must show its 40-person capacity');
 assert(get('tools').innerHTML.includes('class="tool-capacity">60</span>'),'large home must show its 60-person capacity');
 assert(get('tools').innerHTML.includes('130,000'),'large homes must display bare price');
 assert(!get('tools').innerHTML.includes('tool-parking'),'building cards must not show redundant parking capacity');
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'food'}})}});
 assert(get('tools').innerHTML.includes('class="tool-capacity">12</span>'),'shops must show bare numeric service capacity');
 // Traffic tools moved into the right-side rail; landscaping navigation remains unchanged.
 assert(!get('categories').innerHTML.includes('data-dock-group="traffic"'),'Traffic top-level dock group must be absent');
 assert(fs.readFileSync('index.html','utf8').includes('data-city-shortcut="signalManage"'),'traffic signal control is available in the right rail');
 const uiCss=fs.readFileSync('dist/style.css','utf8');
 assert(uiCss.includes('flex:0 0 106px!important')&&uiCss.includes('min-width:106px!important;max-width:106px!important'),'desktop cards must use fixed widths regardless of item count');
 assert(uiCss.includes('height:78px!important;min-height:78px!important;max-height:78px!important'),'desktop cards must use a fixed height');
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);r.treeGroup=new THREE.Group();r.buildKey='tree-test';r.treeKey='';
 for(const kind of ['shade','palm','flower','pine','shrub','banyan']){
  const batch=new Batch();r.tree(batch,190,190,1,kind);
  assert(batch.data.size>=2,kind+' has no useful geometry');
  for(const record of batch.data.values())for(const t of record.items)assert([t.x,t.y,t.z,t.sx,t.sy,t.sz].every(Number.isFinite),kind+' invalid geometry');
 }
 r.trees(g.state,{x:190,y:190});assert(r.treeGroup.children.length>0);
 g.plantLandscape(190,190,'shade');const key=r.treeKey;r.trees(g.state,{x:190,y:190});assert.notEqual(r.treeKey,key,'tree cache must react to planting');
 console.log(JSON.stringify({passed:true,species:6,saveCompatibility:true,roadExclusion:true,automaticExclusions:true,cacheInvalidation:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
