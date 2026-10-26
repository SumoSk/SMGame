'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const stub=fs.readFileSync('work/test-ipad-controls.cjs','utf8').split("game.selectTool('small');")[0];
const {game:g,get,event}=new Function('require',stub+'return {game,get,event};')(require);
const icon=fs.readFileSync('index.html','utf8');
assert(icon.includes('data-city-shortcut="erase"'),'one demolition action in the left rail');
assert(!icon.includes('data-city-shortcut="eraseRoad"')&&!icon.includes('data-city-shortcut="eraseBuilding"'));
const city=JSON.parse(g.snapshot());
const b=[...g.state.buildings.values()][0];
assert(b,'starter city needs building');
const at=g.screen(b.x+.5,b.y+.5);
assert.equal(g.demolitionBuildingAt(at[0],at[1]),b.id,'target specific building with its plot, not a road');
g.selectTool('erase');
event('pointerdown',101,at[0],at[1],'mouse');
event('pointerup',101,at[0],at[1],'mouse');
assert(get('dialog').open,'building tap must request confirmation');
assert(get('dialogContent').innerHTML.includes('รื้อ'),'demolition confirms building');
assert(g.state.buildings.has(b.id),'tap must not demolish before approval');
get('cancelDialog').onclick();
assert(g.state.buildings.has(b.id),'cancel leaves the building intact');
assert.equal(JSON.parse(g.snapshot()).buildings.length,city.buildings.length,'no accidental building edits');
// A fresh city with a 3-block editable street exercises continuous road erase.
g.reset();g.state.roads.clear();g.state.vehicles.clear();g.state.occ.clear();g.state.footprint.fill(-1);
const y=156;
for(let x=156;x<=158;x++){
 const i=g.id(x,y),r={type:'small',main:false,links:new Set(),load:0,wait:0};
 g.state.roads.set(i,r);
 if(x>156){const p=g.id(x-1,y);r.links.add(p);g.state.roads.get(p).links.add(i);}
}
g.selectTool('erase');
const a=g.screen(156.5,156.5),z=g.screen(158.5,156.5);
event('pointerdown',102,a[0],a[1],'mouse');
event('pointermove',102,z[0],z[1],'mouse');
event('pointerup',102,z[0],z[1],'mouse');
assert(get('dialog').open,'road drag must request one confirmation');
assert(get('dialogContent').innerHTML.includes('รื้อถนน'),'same icon uses road removal logic');
assert.equal(g.state.roads.size,3,'road drag cannot delete before approval');
get('confirmDialog').onclick();
assert.equal(g.state.roads.size,0,'approval removes the complete road stroke');
assert.equal(g.state.money,500000,'demolition stays free');
console.log('Unified demolition passed: one square tool; building tap prompts/cancels; multi-cell road drag confirms; no accidental data loss.');
