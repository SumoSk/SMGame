'use strict';
require('./test-dom-compat.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
function fresh(){const env=new Function('require',fixture+'return boot();')(require);env.game.reset();env.game.state.money=1e9;return env;}
function build(g,key,x){const b=g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true,0);assert(b,key+' should build');return b;}
function quota(g,key){return g.buildingQuotaStatus(key).remaining;}
const results=[];
function test(name,run){try{run();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});console.error(e.stack);}}
test('every kind requires one build for each subsequent allowance',()=>{
 const {game:spec}=fresh();
 for(const chain of Object.values(spec.BUILDING_CHAINS)){
  const {game:g}=fresh();
  assert.equal(g.buildingQuotaStatus(chain[0]).locked,false);
  for(const key of chain.slice(1))assert.equal(quota(g,key),0);
  for(let i=0;i<chain.length;i++){
   const key=chain[i],x=160+i*30;
   if(i){assert.equal(quota(g,key),1);assert.equal(g.buildingQuotaStatus(key).locked,false);}
   build(g,key,x);
   if(i){assert.equal(quota(g,key),0);assert.equal(g.buildBuilding(key,x+2,5,true),false,'spent allowance cannot be reused');}
  }
  // A new starter starts another cycle rather than permanently unlocking a tier.
  build(g,chain[0],285);if(chain.length>1)assert.equal(quota(g,chain[1]),1);else assert.equal(quota(g,chain[0]),Infinity,'single-tier civic service remains buildable');
 }
});
test('five starters accumulate five small allowances and spend one at a time',()=>{
 const {game:g}=fresh();
 for(let n=0;n<5;n++)build(g,'home_starter',160+n*5);
 assert.equal(quota(g,'home_large'),5);
 assert.equal(quota(g,'home_dual'),0);
 assert.equal(quota(g,'shop_small'),0,'categories stay independent');
 build(g,'home_large',195);
 assert.equal(quota(g,'home_large'),4);assert.equal(quota(g,'home_dual'),1);
});
test('locked cards remain visible, show zero at top right and explain the prerequisite',()=>{
 const {game:g,get}=fresh();
 get('subcategories').onclick({target:{closest:()=>({dataset:{category:'home'}})}});
 const tray=get('tools');
 assert(tray.innerHTML.includes('data-build-kind="home"'));
 tray.onclick({target:{closest:selector=>selector==='[data-build-kind]'?{dataset:{buildKind:'home'}}:null}});
 const html=get('buildVariantPopup').innerHTML;
 for(const key of ['home_starter','home_large','home_dual','home_grand'])assert(html.includes('data-tool="'+key+'"'));
 assert(html.includes('tool-quota-count is-locked'));
 assert(html.includes('ต้องสร้างบ้านเริ่มต้นเพิ่มอีก 1 ตึก'));
 assert(html.includes('aria-disabled="true"'));
 assert.equal(g.selectTool('home_large'),false);assert(get('hint').textContent.includes('บ้านเริ่มต้น'));
 assert(get('dialogContent').innerHTML.includes('class="quota-warning"'),'show a prominent warning dialog');
 assert(get('dialogContent').innerHTML.includes('เลือกบ้านเริ่มต้น'),'offer the previous tier');
 assert(get('dialogContent').innerHTML.includes('ต้องสร้างบ้านเริ่มต้นเพิ่มอีก 1 ตึก'));
 assert(g.checkBuilding('home_large',160,100).error.includes('บ้านเริ่มต้น'));
 assert(g.assistedBuildingPlacement('home_large',160,100).error.includes('บ้านเริ่มต้น'));
 for(let n=0;n<5;n++)build(g,'home_starter',160+n*5);
 assert(get('buildVariantPopup').innerHTML.includes('โควต้าสร้างได้อีก 5 ตึก">5</span>'));
 build(g,'home_large',195);
 assert(get('buildVariantPopup').innerHTML.includes('โควต้าสร้างได้อีก 4 ตึก">4</span>'));
 assert(get('buildVariantPopup').innerHTML.includes('โควต้าสร้างได้อีก 1 ตึก">1</span>'));
 const css=fs.readFileSync('dist/style.css','utf8');
 assert(/\.tool-quota-count\{position:absolute;top:3px;right:4px/.test(css));
});
test('failed placement, preview and cancelled confirmation never spend or earn quota',()=>{
 const {game:g,get}=fresh();build(g,'shop_starter',160);
 const before=JSON.stringify(g.state.buildingQuota),cash=g.state.money;
 assert.equal(g.buildBuilding('shop_small',150,150,true),false);
 assert.equal(JSON.stringify(g.state.buildingQuota),before);assert.equal(g.state.money,cash);
 const t=g.CATALOG.shop_small,y=148-t.plotHeight;
 assert(!g.checkBuilding('shop_small',180,y).error);
 g.buildBuilding('shop_small',180,y,false);
 assert(get('dialog').open);assert.equal(JSON.stringify(g.state.buildingQuota),before);
 g.closeModal();assert.equal(JSON.stringify(g.state.buildingQuota),before);
 g.state.money=-1;assert.equal(g.buildBuilding('shop_small',180,y,true),false);
 assert.equal(JSON.stringify(g.state.buildingQuota),before);
});
test('confirmation rechecks quota after another construction consumes it',()=>{
 const {game:g,get}=fresh();build(g,'home_starter',160);
 g.buildBuilding('home_large',180,148-g.CATALOG.home_large.plotHeight,false);
 const confirm=get('confirmDialog').onclick;
 assert.equal(typeof confirm,'function');
 build(g,'home_large',200);const money=g.state.money,size=g.state.buildings.size;
 confirm();assert.equal(g.state.money,money);assert.equal(g.state.buildings.size,size);
 assert.equal(quota(g,'home_large'),0);assert.equal(quota(g,'home_dual'),1);
});
test('move and demolish cannot refund or mint allowances',()=>{
 const {game:g}=fresh(),starter=build(g,'home_starter',160),small=build(g,'home_large',180);
 const before=JSON.stringify(g.state.buildingQuota);
 assert.equal(g.beginMoveBuilding(small.id),true);
 assert.equal(g.movingBuildingId,small.id);
 assert(g.moveBuilding(small.id,210,148-g.CATALOG.home_large.plotHeight,true,0));
 assert.equal(JSON.stringify(g.state.buildingQuota),before);
 g.demolishBuilding(small,true);g.demolishBuilding(starter,true);
 assert.equal(JSON.stringify(g.state.buildingQuota),before);
 assert.equal(g.buildBuilding('home_large',180,148-g.CATALOG.home_large.plotHeight,true),false);
 assert.equal(quota(g,'home_dual'),1,'earned next-tier allowance survives demolition');
});
test('exact quota balances survive saves and repeated loads after demolition',()=>{
 const {game:g}=fresh();
 const starter=build(g,'home_starter',160);build(g,'home_starter',170);const small=build(g,'home_large',190);
 g.demolishBuilding(small,true);g.demolishBuilding(starter,true);
 const balances=()=>Object.values(g.BUILDING_CHAINS).flatMap(chain=>chain.slice(1).map(key=>quota(g,key)));
 const before=JSON.stringify(balances()),raw=g.snapshot();
 for(let n=0;n<3;n++){assert(g.loadGame(true,null,raw));assert.equal(JSON.stringify(balances()),before);}
 g.reset();assert.equal(quota(g,'home_large'),0);assert.equal(quota(g,'home_dual'),0);
});
test('legacy cities retain all buildings and seed only unused allowances without debt',()=>{
 const {game:g}=fresh();
 for(let n=0;n<3;n++)build(g,'home_starter',160+n*5);
 build(g,'home_large',190);
 const raw=JSON.parse(g.snapshot());delete raw.buildingQuota;
 // This unrestricted legacy city also contains a large house without middle houses.
 g.state.buildingQuota.home_grand=1;build(g,'home_grand',240);
 const legacy=JSON.parse(g.snapshot());delete legacy.buildingQuota;
 const buildings=JSON.stringify(legacy.buildings),cash=g.state.money;
 assert(g.loadGame(true,null,JSON.stringify(legacy)));
 assert.equal(g.state.buildings.size,5);assert.equal(g.state.money,cash);
 assert.equal(quota(g,'home_large'),2);assert.equal(quota(g,'home_dual'),1);assert.equal(quota(g,'home_grand'),0);
 assert.equal(JSON.stringify(JSON.parse(g.snapshot()).buildings),buildings);
 const balances=JSON.stringify(g.state.buildingQuota);assert(g.loadGame(true,null,g.snapshot()));assert.equal(JSON.stringify(g.state.buildingQuota),balances);
});
test('invalid quota saves fail without changing the current city or its balances',()=>{
 const {game:g}=fresh();build(g,'shop_starter',160);const before=g.snapshot();
 for(const bad of [-1,1.5,'2',{},[1]]){
  const save=JSON.parse(before);save.buildingQuota=typeof bad==='object'?bad:{shop_small:bad};
  if(bad&&typeof bad==='object'&&!Array.isArray(bad))save.buildingQuota={shop_small:bad};
  assert.equal(g.loadGame(true,null,JSON.stringify(save)),false);
  assert.equal(g.snapshot(),before);
 }
});
test('new-city starter village earns allowances and keeps existing preset buildings',()=>{
 const {game:g}=fresh();g.startNewCity();
 assert.equal(g.state.buildings.size,12);
 for(const [kind,chain] of Object.entries(g.BUILDING_CHAINS)){
  if(chain.length===1){assert.equal(quota(g,chain[0]),Infinity);continue;}
  assert.equal(quota(g,chain[1]),kind==='civic'?0:kind==='home'?3:1);
  for(const key of chain.slice(2))assert.equal(quota(g,key),0);
 }
});
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;

