const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',fixture+'return boot();')(require);
function verify(){
 assert.equal(g.state.money,500000,'Starter upgrades must be free');
 assert.equal(g.state.buildings.size,12,'Keep original starter village');
 assert.equal(g.state.citizens.size,18,'Keep original starter residents');
 const junctions=[g.id(164,150),g.id(164,130),g.id(164,136)];
 assert.equal(g.state.roads.get(g.id(164,151)).type,'large','Eight-lane highway');
 assert.equal(g.state.roads.get(g.id(164,149)).type,'medium','Four-lane collector');
 for(const node of junctions){
  assert.equal(g.junction(node),3,'T-junction has three arms');
  assert.equal(g.state.signals.get(node)?.mode,'smart','AI controls junction');
  assert.equal(g.signalStatus(node).phase,-1,'AI opens at all-red clearance');
 }
 assert.equal([...g.state.signals.values()].filter(s=>s.mode==='smart').length,3);
 for(const [trait,tech] of [[0,'speed'],[1,'smart'],[2,'fly'],[3,'warp']]){
  assert.equal(g.state.vehicleTechLevels[trait][tech],1,tech+' one free vehicle');
  assert.equal(g.vehicleTechCounts(trait).counts[tech],1,tech+' one actual citizen car');
 }
 const snap=g.snapshot();
 assert.doesNotThrow(()=>g.validateSave(JSON.parse(snap)));
 assert(g.loadGame(true,null,snap),'Starter city can be reloaded');
 for(const node of junctions)assert.equal(g.state.signals.get(node)?.mode,'smart');
 for(const [trait,tech] of [[0,'speed'],[1,'smart'],[2,'fly'],[3,'warp']])
  assert.equal(g.vehicleTechCounts(trait).counts[tech],1);
}
verify();
for(const city of ['bangkok','chiangmai','korat']){g.startNewCity(city);verify();}
g.reset();
assert.equal(g.state.signals.size,0,'Fresh reset cannot leak starter AI into loaded saves');
assert.equal(g.state.vehicleTechLevels[3].warp,0,'Fresh reset cannot leak free vehicle upgrades');
console.log('PASS 3 starter AI intersections, 4 distinct upgraded vehicle types, 4 cities, save/load, reset');
