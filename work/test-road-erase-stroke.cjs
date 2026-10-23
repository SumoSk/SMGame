const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game,get}=new Function('require',prefix+'return {game,g:get};')(require);
const dom=get;
const state=game.state;
state.roads.clear();state.vehicles.clear();state.occ.clear();state.footprint.fill(-1);
const y=20;
for(let x=10;x<=20;x++){
 const node=game.id(x,y),road={type:'small',main:x===15,links:new Set(),load:0,wait:0};
 state.roads.set(node,road);
 if(x>10){const prev=game.id(x-1,y);road.links.add(prev);state.roads.get(prev).links.add(node);}
}
const unrelated=game.id(28,28),busy=game.id(16,y);
state.roads.set(unrelated,{type:'small',main:false,links:new Set(),load:0,wait:0});
state.occ.set(busy+':0:0',99);
const start=game.roadEraseSegmentCells(10,y,10,y);
assert.equal(start.length,1,'one touch hits one road node');
const drag={pan:false,cells:start,eraseLastX:10,eraseLastY:y,eraseSeen:new Set(start)};
game.appendRoadEraseStroke(drag,20,y);
assert.equal(drag.cells.length,11,'interpolates 11 road cells between sparse pointer samples');
game.appendRoadEraseStroke(drag,10,y);
assert.equal(drag.cells.length,11,'reversing a stroke does not duplicate roads');
assert.equal(game.roadEraseSegmentCells(-5,y,20,y).length,0,'reject off-map paths');
const plan=game.roadErasePlan(drag.cells);
assert.equal(plan.roads.length,9,'nine roads can be removed');
assert.equal(plan.main,1,'never remove fixed initial road');
assert.equal(plan.busy,1,'never remove occupied road');
assert.equal(plan.fee,90,'fees sum to 20% of each small road cost');
assert.equal(game.demolishRoadStroke(drag.cells),true);
assert.equal(state.roads.size,12,'confirmation must precede writes');
const confirmation=dom('confirmDialog');
assert.equal(typeof confirmation.onclick,'function','only one confirmation is created');
confirmation.onclick();
assert.equal(state.roads.size,3,'removes the nine allowed cells in one batch');
for(const node of [game.id(15,y),busy,unrelated])assert(state.roads.has(node),'keeps protected and unselected cells');
assert.equal(state.money,500000-90,'charges once for removed roads');
assert([...state.roads.values()].every(r=>[...r.links].every(node=>state.roads.has(node))),'no dangling road links');
assert.equal(game.snapshot().includes('"format":2'),true,'does not change save format');

const deck={collapsed:false,classList:{toggle(name,on){assert.equal(name,'tools-collapsed');deck.collapsed=on;}}};
const dock=dom('buildDock');dock.closest=selector=>{assert.equal(selector,'.control-deck');return deck;};
const button=dom('toggleDock');button.attrs={};button.setAttribute=(k,v)=>{button.attrs[k]=v;};
game.setDockCollapsed(true);
assert.equal(deck.collapsed,true,'entire deck collapses');
assert.equal(button.attrs['aria-expanded'],'false','collapsed accessibility state');
assert.equal(dom('toggleDockText').textContent,'กางเครื่องมือ');
game.setDockCollapsed(false);
assert.equal(deck.collapsed,false,'entire deck expands');
assert.equal(button.attrs['aria-expanded'],'true','expanded accessibility state');

const css=fs.readFileSync('dist/style.css','utf8');
assert(css.includes('body>.bottom>.control-deck.tools-collapsed>.city-dashboard'),'collapsed mode hides overview');
assert(css.includes('body>.bottom>.control-deck.tools-collapsed>.city-control-mini'),'collapsed mode hides demands');
assert(css.includes('.build-dock .dock-body,'),'collapsed mode hides all construction controls');
assert(css.includes('.dock-display-actions,'),'collapsed mode hides optional display buttons');
console.log('SMCITY v2.4.3: drag road demolition and full deck collapse passed');
