'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-adaptive-traffic.cjs','utf8').split('let {car}=roadScene(false);')[0];
new Function('require',fixture+`
const {car,leader}=roadScene(false);game.setBugCaptureEnabled(true);car.stopReason='ไฟแดง';
const original=game.snapshot(),plan=game.motionPlan(car),at=game.motionDistance(car,plan);
game.rememberVehicleStop(car,plan,at,'ไฟแดง');
const evidence=game.captureTowedVehicleEvidence(car);
assert.equal(evidence.stopHistory.length,1);
assert(evidence.nearbyVehicles.some(v=>v.id===leader.id));
assert(evidence.roadSpace.length>0);assert.equal(evidence.diagnosis.certainty,'not_proven');
assert.equal(game.snapshot(),original);assert(JSON.stringify(evidence).length<180000);
console.log('PASS: local stopping history and nearby trace, save unchanged');
`)(require);
new Function('require',fixture+`
const {car}=roadScene(false,false),st=game.state,node=car.path[car.pos+1];
for(const sign of [-1,1])for(let distance=1;distance<=5;distance++){
 const n=game.id(116,155+sign*distance),prev=distance===1?node:game.id(116,155+sign*(distance-1));
 st.roads.set(n,{type:'medium',main:false,links:new Set([prev]),load:0,wait:0});
 st.roads.get(prev).links.add(n);
}
st.junctionCache.clear();st.junctionLayoutCache?.clear();st.version++;
const desired=game.plannedLane(car,car.pos+1),occupied=[0,1,2].filter(l=>l!==desired).slice(0,2);st.occ.set(node+':0:'+occupied[0],991);st.occ.set(node+':0:'+occupied[1],992);
const x=game.explainRoadTraversal(car,car.pos+1);
assert.equal(x.occupant,null);assert.equal(x.capacity,2);assert.equal(x.capacityCounts.sameDirection,2);
assert(x.junctionArms>=3);assert(x.blockers.some(b=>b.code==='directional_capacity_full'));
assert.equal(x.allowed,false);
console.log('PASS: empty exact lane but directional capacity full identified with owners');
`)(require);
