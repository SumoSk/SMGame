'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const run=(name,initial,number)=>{
 const {game:g}=new Function('require',base+';return boot();')(require);
 g.state.money=1e9;
 g.state.buildingQuota.home_mahanakhon=1;
 const t=g.CATALOG.home_mahanakhon;
 const home=g.buildBuilding(t.key,160,148-t.plotHeight,true);
 assert(home,'road must reach Mahanakhon');
 const holders=[];
 for(const i of initial){
  const c=g.newCitizen(home);c.resident=true;c.location='home';c.locationId=home.id;c.state='อยู่บ้าน';
  home.residents.add(c.id);home.parked.add(c.id);home.parkingSlots[i]=c.id;holders.push(c);
 }
 const incoming=[];
 for(let k=0;k<number;k++){
  const c=g.newCitizen(home);
  assert(g.createTrip(c,'moveIn',null,home.id,g.id(155,150),null,null),'inbound trip must start');
  incoming.push(c);
 }
 let maxArrived=0;
 for(let tick=0;tick<14000;tick++){
  g.state.time+=.04;g.advanceVehicles(.05,.04);
  maxArrived=Math.max(maxArrived,incoming.filter(c=>home.parked.has(c.id)).length);
  if(maxArrived===incoming.length)break;
 }
 const pending=incoming.filter(c=>!home.parked.has(c.id)).map(c=>{
  const v=g.state.vehicles.get(c.vehicleId);
  return {id:c.id,phase:v?.phase,reason:v?.stopReason,lotDistance:v?.lotDistance,
   parkingStage:v?.parkingStage,assigned:home.parkingSlots.indexOf(c.id),
   lastMovedAt:v?.lastMovedAt,
   pose:v?.lotPath?g.parkingPose(v):null};
 });
 const report={name,filled:initial.length,requested:number,arrived:maxArrived,pending:pending.slice(0,8)};
 console.log(JSON.stringify(report));
 assert.equal(maxArrived,number,name+' cannot accept all incoming cars');
};
run('rear-aisle partially occupied / front full',
 [...Array(20).keys(),...Array(40).keys()].map((i,j)=>j<20?i:40+(j-20)),10);
run('front aisle partly occupied / rear full',
 [...Array(40).keys(),...Array(20).keys()].map((i,j)=>j<40?i:40+(j-40)),10);
run('empty tower / staggered arrivals',[],16);
