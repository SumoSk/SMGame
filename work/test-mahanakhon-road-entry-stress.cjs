'use strict';
// Repro: entire 80-car tower returning home at once (road queue + inner aisle).
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',fixture+';return boot();')(require);
g.state.money=1e9;g.state.buildingQuota.home_mahanakhon=1;
const t=g.CATALOG.home_mahanakhon;
const home=g.buildBuilding(t.key,160,148-t.plotHeight,true);
assert(home&&home.access.length===2);
const incoming=[];for(let i=0;i<80;i++){
 const c=g.newCitizen(home);
 assert(g.createTrip(c,'moveIn',null,home.id,g.id(155,150),null,null),'trip '+i);
 incoming.push(c);
}
let arrived=0, peakWaiting=0,firstParked=-1,finalTick=0;
for(let tick=0;tick<26000;tick++){
 g.state.time+=.04;g.advanceVehicles(.05,.04);
 arrived=incoming.filter(c=>home.parked.has(c.id)).length;
 const waiting=incoming.filter(c=>!home.parked.has(c.id)).map(c=>g.state.vehicles.get(c.vehicleId)).filter(Boolean);
 peakWaiting=Math.max(peakWaiting,waiting.length);
 if(arrived>0&&firstParked<0)firstParked=tick;
 if(arrived===80){finalTick=tick;break;}
 if(tick===25999)finalTick=tick;
}
const phaseCounts={},reasons={};const missing=incoming.filter(c=>!home.parked.has(c.id)).map(c=>{
 const v=g.state.vehicles.get(c.vehicleId);
 const phase=v?.phase||'none';phaseCounts[phase]=(phaseCounts[phase]||0)+1;
 const why=v?.stopReason||'';reasons[why]=(reasons[why]||0)+1;
 return{id:c.id,phase,why,lotDistance:v?.lotDistance,parkingStage:v?.parkingStage,assigned:home.parkingSlots.indexOf(c.id),pose:v?.lotPath?g.parkingPose(v):null};
});
console.log(JSON.stringify({arrived,requested:80,firstParked,finalTick,phaseCounts,reasons,missing:missing.slice(0,16)}));
assert.equal(arrived,80,'all 80 arrivals must enter without deadlocking the public road');
