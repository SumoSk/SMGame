'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),oracle="function canLeaveParkingSpace(v,points){\n const building=state.buildings.get(v.lotBuilding);\n // Reserve enough room to clear the bay before joining the one-way aisle.\n const mergeLength=lotPathLength(points.slice(0,2))+.7,ownLimit=starterExitQueueLimit(v,lotPathLength(points));\n const samples=[];\n for(let d=0;d<=mergeLength;d+=.12)samples.push(lotPathPose(points,Math.min(d,ownLimit)));\n const bounds=poses=>{let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of poses){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}return{minX,minY,maxX,maxY};};\n const own=bounds(samples);\n for(const other of parkingLotCars(v.lotBuilding)){\n  if(other.id===v.id||other.lotBuilding!==v.lotBuilding||!other.lotPath)continue;\n  // Sample each unchanged path once, rather than once per opposing sample.\n  const upcoming=[],distance=other.lotDistance||0,limit=starterExitQueueLimit(other,lotPathLength(other.lotPath));\n  for(let ahead=0;ahead<=1.5;ahead+=.15)upcoming.push(lotPathPose(other.lotPath,Math.max(distance,Math.min(distance+ahead,limit))));\n  const theirs=bounds(upcoming);\n  // One block exceeds the collision routine's maximum center distance at .06.\n  if(own.maxX+1<theirs.minX||theirs.maxX+1<own.minX||own.maxY+1<theirs.minY||theirs.maxY+1<own.minY)continue;\n  for(let k=0;k<samples.length;k++)for(let n=0;n<upcoming.length;n++)if(!starterLotOverlapAllowed(building,samples[k],upcoming[n])&&lotCarsOverlap(samples[k],upcoming[n],.06))return noteParkingBlock(v,'bay_exit_predicted_path_conflict',{blockerVehicleId:other.id,checkedPose:samples[k],blockingPredictedPose:upcoming[n],ownLookahead:k*.12,blockerLookahead:n*.15,forecastOnly:true});\n }return true;\n}";
function boot(){process.env.SMCITY_SOURCE??=path.join(root,'dist/game.js');return require('./audit-harness.cjs').boot('canLeaveParkingSpace,parkingPose,lotPathPose,lotPathLength,starterExitQueueLimit,oldCanLeaveParkingSpace:'+oracle+',set auditNote(fn){noteParkingBlock=fn;},set auditLimit(fn){starterExitQueueLimit=fn;}').game;}
const copy=p=>p.map(x=>({...x}));
function bayPath(g,b,index){const t=g.CATALOG[b.key],s=g.lotSlots(b)[index],exit=t.parkingExitU??t.plotWidth-.45;return[g.parkingSlotPose(b,index),g.lotPoint(b,s.u,s.aisle),g.lotPoint(b,exit,s.aisle),g.lotPoint(b,exit,t.parkingWaitV??t.plotHeight-.9)];}
const result={differentialCases:0,contexts:[],trueResults:0,blockedResults:0,geometryFlagInvalidation:[],mutationKinds:[]};
for(const key of ['home_starter','home_large','home_grand','home_mahanakhon_compact'])for(let rotation=0;rotation<4;rotation++){
 const g=boot();g.reset('london');g.state.money=1e9;g.state.buildingQuota=Object.fromEntries(Object.keys(g.CATALOG).map(k=>[k,1000]));
 const t=g.CATALOG[key],pos=rotation===0?[170,148-t.plotHeight]:rotation===1?[152,170]:rotation===2?[170,152]:[148-t.plotHeight,170],b=g.buildBuilding(key,...pos,true,rotation);assert(b);
 const cars=[];for(let k=0;k<4;k++){const c=g.newCitizen(b);c.resident=true;b.residents.add(c.id);b.parked.add(c.id);const slot=g.parkingSpace(b,c.id,true),v={id:1000+k,citizenId:c.id,fromId:b.id,toId:b.id,lotBuilding:b.id,phase:k?'parking_in':'departing',lotDistance:0};v.lotPath=bayPath(g,b,slot);cars.push(v);g.state.vehicles.set(v.id,v);}
 const v=cars[0],other=cars[1],originalLimit=g.starterExitQueueLimit,limits=new Map();g.auditLimit=(car,total)=>limits.has(car.id)?limits.get(car.id):originalLimit(car,total);
 let trace=null;g.auditNote=(car,code,detail)=>{trace=JSON.parse(JSON.stringify({code,...detail}));return false;};
 let points=copy(v.lotPath);
 function check(label){
  for(const firstNew of [false,true]){let oldValue,newValue,oldTrace,newTrace;trace=null;if(firstNew){newValue=g.canLeaveParkingSpace(v,points);newTrace=trace;trace=null;oldValue=g.oldCanLeaveParkingSpace(v,points);oldTrace=trace;}else{oldValue=g.oldCanLeaveParkingSpace(v,points);oldTrace=trace;trace=null;newValue=g.canLeaveParkingSpace(v,points);newTrace=trace;}
   assert.equal(newValue,oldValue,label+' result');assert.equal(JSON.stringify(newTrace),JSON.stringify(oldTrace),label+' first blocker/proof');result.differentialCases++;if(newValue)result.trueResults++;else result.blockedResults++;
  }result.mutationKinds.push(label);
 }
 check('initial');points=copy(points);check('equivalent-new-candidate-array');other.lotPath=copy(points);check('live-blocker-path-change');cars[2].lotPath=copy(points);check('second-blocker-priority');g.state.vehicles.delete(other.id);check('remove-first-blocker');g.state.vehicles.set(other.id,other);check('reinsert-map-order');
 for(const d of [0,.12,.73,1.5,4,0]){other.lotDistance=d;check('other-progress-'+d);}
 for(const limit of [0,.24,.7,1.5,Infinity]){limits.set(other.id,limit);limits.set(v.id,limit);check('queue-limit-'+limit);}
 limits.clear();check('restore-live-starter-queue');
 for(const phase of ['parking_out','departing','parking_in']){other.phase=phase;v.phase=phase;check('phase-'+phase);}
 points[1].x+=.31;check('mutate-own-coordinate');other.lotPath[1].y-=.27;check('mutate-other-coordinate');
 points.forEach(p=>p.tightParking=true);other.lotPath.forEach(p=>p.tightParking=true);check('tight-flags-on');points.forEach(p=>p.tightParking=false);other.lotPath.forEach(p=>p.tightParking=false);check('tight-flags-off');
 points.push({...points.at(-1),x:points.at(-1).x+.5});check('append-path-point');points.pop();check('remove-path-point');points[1]={...points[1],y:points[1].y+.1};check('replace-point-object');
 b.x+=2;check('move-building-x');b.y-=1;check('move-building-y');b.rotation=(b.rotation+1)%4;check('rotate-building');
 const slot=b.parkingSlots.indexOf(v.citizenId),next=(slot+1)%b.parkingSlots.length;[b.parkingSlots[slot],b.parkingSlots[next]]=[b.parkingSlots[next],b.parkingSlots[slot]];check('inplace-slot-owner-swap');b.parkingSlots=[...b.parkingSlots];check('replace-slot-array');b.parked.delete(v.citizenId);check('parked-membership-change');
 other.lotBuilding=b.id+100;check('other-leaves-lot');other.lotBuilding=b.id;other.lotPath=null;check('other-path-cleared');other.lotPath=copy(points);check('arrival-restores-path');
 const replacement={...other,lotPath:copy(points)};g.state.vehicles.set(other.id,replacement);check('replace-vehicle-object-same-id');g.state.vehicles.clear();g.state.vehicles.set(v.id,v);check('no-other-live-cars');
 result.contexts.push({key,rotation});
}
{
 const g=boot(),p=[{x:0,y:0},{x:1,y:0},{x:1,y:1}];g.lotPathPose(p,.95);
 for(const enabled of [true,false,true]){p[1].tightParking=enabled;let maxDifference=0;for(const d of [.9,.95,1,1.02,1.1]){const a=g.lotPathPose(p,d),b=g.lotPathPose(copy(p),d);maxDifference=Math.max(maxDifference,Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.angle-b.angle));}assert.equal(maxDifference,0);result.geometryFlagInvalidation.push({enabled,maxDifference});}
}

{
 const g=boot(),v={lotPath:[{x:0,y:0},{x:1,y:0},{x:1,y:1}],lotDistance:.95};let cases=0;
 function check(){const p=g.parkingPose(v),expected=v.lotPath?g.lotPathPose(copy(v.lotPath),v.lotDistance||0):null;assert.deepEqual(p,expected);if(p){p.x+=999;p.angle+=2;assert.deepEqual(g.parkingPose(v),expected,'returned pose mutation must not poison the cache');}cases++;}
 for(const distance of [0,.1,.95,1,1.1,2,8,0]){v.lotDistance=distance;check();}v.lotPath[1].y+=.2;check();v.lotPath[1].tightParking=true;check();v.lotPath=copy(v.lotPath);check();v.lotPath=[{x:3,y:4,tag:'a'}];check();v.lotPath[0].tag='b';check();v.lotPath=[];check();v.lotPath=null;check();result.motionPoseCases=cases;
}
result.mutationKinds=[...new Set(result.mutationKinds)];console.log(JSON.stringify({passed:true,oracle:'Exact old canLeaveParkingSpace function, injected into candidate lexical scope; shares corrected path geometry. Flag-only geometry checked against fresh path copies separately.',...result},null,2));
