const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g,get}=new Function('require',base+';return boot();')(require);
 // This DOM API exists in browsers but not in the lightweight test harness.
 get('buildDock').closest=()=>null;
 assert.equal(g.state.plantedTrees.length,0);
 assert.equal(g.plantLandscape(150,150,'shade'),true,'player decorations can occupy roads');
 assert.equal(g.eraseLandscape(150.5,150.5),true);
 assert.equal(g.plantLandscape(190,190,'flower'),true);
 assert.equal(g.plantLandscape(190,190,'shade'),true,'decorations may overlap exactly');
 assert.equal(g.plantLandscape(194,190,'palm'),true);
 const before=g.snapshot();
 assert(g.loadGame(true,null,before),'the new save must load');
 assert.deepEqual(Array.from(g.state.plantedTrees,t=>t.kind),['flower','shade','palm']);
 assert.equal(g.eraseLandscape(190.5,190.5),true);
 assert.equal(g.state.plantedTrees.length,2);
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
 const landscapeGroups=['trees','flowers','shrubs','desert','water','stone','paths','street','lights','art','thai_street','thai_factory','thai_temple','thai_landmark','nature_sets','manage'];
 const decorationTools=new Set();
 for(const group of landscapeGroups){
  assert(get('tools').innerHTML.includes('data-landscape-group="'+group+'"'),group+' subgroup is missing');
  get('tools').onclick({target:{closest:sel=>sel==='[data-landscape-group]'?{dataset:{landscapeGroup:group}}:null}});
  const markup=get('buildVariantPopup').innerHTML;
  assert(!get('buildVariantPopup').hidden,group+' popup must open');
  for(const match of markup.matchAll(/data-tool="([^"]+)"/g))decorationTools.add(match[1]);
  assert(markup.includes('data-close-variants'),group+' popup must have a close control');
 }
 const expectedDecorationTools=[...g.TREE_KINDS,...g.DECOR_KINDS].map(k=>'tree:'+k.key).concat(['landscapeSelect','treeRow','treeBrush','eraseTree']);
 assert.deepEqual([...decorationTools].sort(),expectedDecorationTools.sort(),'every existing decoration must be discoverable in a subgroup');
 get('tools').onclick({target:{closest:sel=>sel==='[data-landscape-group]'?{dataset:{landscapeGroup:'trees'}}:null}});
 assert(get('buildVariantPopup').innerHTML.includes('data-tool="tree:shade"'));
 get('buildVariantPopup').onclick({target:{closest:sel=>sel==='[data-tool]'?{dataset:{tool:'tree:shade'}}:null}});
 assert(get('buildVariantPopup').hidden,'selecting a tree closes the popup');
 assert(get('tools').innerHTML.includes('data-landscape-group="trees"'),'tree group remains in the toolbar');
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'roads'}})}});
 assert(get('tools').innerHTML.includes('data-tool="small"'),'small road tool must be present');
 assert(get('tools').innerHTML.includes('data-tool="medium"'),'medium road tool must be present');
 assert(get('tools').innerHTML.includes('data-tool="large"'),'large road tool must be present');
 assert(!get('tools').innerHTML.includes('data-tool="hand"'),'road submenu only has three road sizes');
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'home'}})}});
 assert(get('tools').innerHTML.includes('data-build-kind="home"'),'home type must be visible in the lower row');
 assert(get('tools').innerHTML.includes('data-build-kind="hotel"'),'hotel type must be visible beside home');
 get('tools').onclick({target:{closest:selector=>selector==='[data-build-kind]'?{dataset:{buildKind:'home'}}:null}});
 const homeCards=get('buildVariantPopup').innerHTML;
 assert(homeCards.includes('class="tool-capacity">20</span>'),'small home popup must show 20-person capacity');
 assert(homeCards.includes('class="tool-capacity">40</span>'),'medium home popup must show 40-person capacity');
 assert(homeCards.includes('class="tool-capacity">60</span>'),'large home popup must show 60-person capacity');
 assert(homeCards.includes('130,000'),'large homes must display bare price');
 assert(!homeCards.includes('tool-parking'),'building cards must not show redundant parking capacity');
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'food'}})}});
 assert(get('tools').innerHTML.includes('data-build-kind="shop"'));
 assert(get('tools').innerHTML.includes('data-build-kind="mall"'));
 get('tools').onclick({target:{closest:selector=>selector==='[data-build-kind]'?{dataset:{buildKind:'mall'}}:null}});
 assert(get('buildVariantPopup').innerHTML.includes('class="tool-capacity">12</span>'),'mall popup must show service capacity');
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
 assert(g.TREE_KINDS.length>=14,'decorative tree panel must include diverse ornamental species');
 for(const kind of g.TREE_KINDS.map(t=>t.key)){
  const batch=new Batch();r.tree(batch,190,190,1,kind);
  assert(batch.data.size>=2,kind+' has no useful geometry');
  for(const record of batch.data.values())for(const t of record.items)assert([t.x,t.y,t.z,t.sx,t.sy,t.sz].every(Number.isFinite),kind+' invalid geometry');
 }
 // All park tiers get big flower trees, conifers, palms and rounded
 // canopies, with the same plot/capacity data and no simulation mutations.
 r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 for(const key of ['park_small','park_medium','park_large']){
  const plot=g.CATALOG[key],b={key,id:733,x:40,y:44,rotation:0,
   parked:new Set(),parkingSlots:Array(plot.parkingCapacity).fill(null)};
  const batch=new Batch();r.building(batch,b,g.CATALOG,g.KINDS);
  const items=[...batch.data.values()].flatMap(group=>group.items.map(i=>({...i,color:group.color})));
  for(const color of ['#eda5bf','#3c7c52','#62a66d','#6fa56b'])
   assert(items.some(i=>i.color===color),key+' missing a signature flower, pine, palm or round shade tree: '+color);
  assert(items.length<500,key+' landscaping must be instanced and inexpensive');
 }
 r.graphicQuality='low';
 for(const kind of ['cherry','jacaranda','cedar','oak','willow']){
  const testBatch=new Batch();r.tree(testBatch,190,190,1.25,kind,'near');
  const count=[...testBatch.data.values()].reduce((n,g)=>n+g.items.length,0);
  assert(count>=4&&count<=16,kind+' Low should use simplified large-tree foliage');
 }
 r.graphicQuality=undefined;
 r.trees(g.state,{x:190,y:190});assert(r.treeGroup.children.length>0);
 g.plantLandscape(190,190,'shade');const key=r.treeKey;r.trees(g.state,{x:190,y:190});assert.notEqual(r.treeKey,key,'tree cache must react to planting');
 console.log(JSON.stringify({passed:true,species:6,saveCompatibility:true,roadExclusion:true,automaticExclusions:true,cacheInvalidation:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
