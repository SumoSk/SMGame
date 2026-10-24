const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
const {game:g,install}=new Function('require',prefix+'return {game,install};')(require);
function pair(type,target,offset,rotation=0,reverse=false){
 const points=Array.from({length:30},(_,i)=>{let x=i-15,y=0;for(let n=0;n<rotation;n++)[x,y]=[-y,x];return[150+x,100+y];});
 const a=install(points,i=>i<12?type:target,false,0);a.noUTurnPolicy=1;a.pos=8;
 const b={...a,id:901,laneSeed:1,motionSeedLane:1,progress:offset,path:[...a.path],pathSet:new Set(a.path)};
 g.state.vehicles.set(b.id,b);g.state.occ.clear();
 if(reverse){g.state.vehicles.delete(a.id);g.state.vehicles.set(a.id,a);}
 return [a,b];
}
function finish(){
 for(let k=0;k<3000&&g.state.vehicles.size;k++){g.state.time+=.032;g.advanceVehicles(.016,.032);}
 assert.equal(g.state.vehicles.size,0,'both merging cars must finish without towing or 150-minute recovery');
}
let cases=0;
for(const [type,target] of [['medium','small'],['large','small'],['large','medium']])
 for(const offset of [0,.15,.5,.8])for(let rotation=0;rotation<4;rotation++)for(const reverse of [false,true]){
  pair(type,target,offset,rotation,reverse);finish();cases++;
 }
// Exact blocked progress from the previous release: each car waited >90 minutes.
{
 const [a,b]=pair('large','small',.15);a.pos=b.pos=11;
 a.progress=.23015159940868535;b.progress=.22878749900998321;
 a.wait=b.wait=30;a.lastMovedAt=b.lastMovedAt=g.state.time-30;
 finish();
}
// The uploaded incident owned this turn, but tile admission still stopped it.
{
 g.startNewCity();g.state.vehicles.clear();g.state.occ.clear();g.state.reservations.clear();
 const path=[43370,43369,43368,43367,43366,43365,43364,43064,42764,42464,42164];
 const v={id:122,path,pathSet:new Set(path),pos:5,progress:.9,lane:0,laneSeed:0,speed:0,phase:'driving',kind:'pass',wait:27,noUTurnPolicy:1,lastMovedAt:g.state.time};
 g.state.vehicles.set(v.id,v);g.reserveIntersection(v,6);
 // Coarse occupancy can linger while a real car has already cleared the curve.
 g.state.occ.set('43364:3:0',999);
 for(let k=0;k<600&&g.state.vehicles.has(v.id);k++){g.state.time+=.032;g.advanceVehicles(.016,.032);}
 assert(v.pos>6||!g.state.vehicles.has(v.id),'a committed turn must clear the junction despite coarse tile occupancy');
}
console.log(JSON.stringify({passed:true,mergeCases:cases,savedDeadlockRecovered:true,committedTurnClears:true}));
