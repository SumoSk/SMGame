const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8').replace(/\r\n/g,'\n');
const reference=source.replace('if(!trafficSpatial||!pose)','if(true||!trafficSpatial||!pose)')
 .replace("if(!trafficSpatial||v.vehicleTech==='fly'","if(true||!trafficSpatial||v.vehicleTech==='fly'");
function boot(code){
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0]
  .replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,')
  .replace("fs.readFileSync('dist/game.js','utf8')",'source');
 code=code.replace('__TRAFFIC_TEST_HARNESS__({','__TRAFFIC_TEST_HARNESS__({withTrafficStep(fn){trafficSpatial={poseMemo:new WeakMap(),parkingGrid:null};try{return fn({nearbyParkingCars,updateParkingRoadSpatial});}finally{trafficSpatial=null;}},');
 return new Function('require','source',fixture+'return boot().game;')(require,code);
}
function trace(code){
 code=code.replace('function computeVehiclePosition(v){',"function computeVehiclePosition(v){if(v.lotPath||v.phase==='driving')state.poseComputations=(state.poseComputations||0)+1;");
 for(const target of ['for(const other of nearbyParkingCars(pose,1.1)){','for(const other of nearbyParkingCars(entry,.85)){','for(const other of nearbyParkingCars(targetPose,1.5)){'])
  code=code.replace(target,target+'state.parkingRoadVisits=(state.parkingRoadVisits||0)+1;');
 const g=boot(code);g.state.money=1e9;g.state.speed=1;
 const build=(key,x)=>{const b=g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true);assert(b);return b;};
 const homes=[build('home_large',160),build('home_large',200)],office=build('office_large',240);
 for(const h of homes)for(let i=0;i<4;i++){
  const c=g.newCitizen(h);h.residents.add(c.id);h.parked.add(c.id);g.parkingSpace(h,c.id,true);
  assert(g.createTrip(c,'work',h.id,office.id,null,null,null));
 }
 for(let i=0;i<12;i++){
  assert(g.createTrip(null,'pass',null,null,g.id(166,150),g.id(266,150),null));
  const v=[...g.state.vehicles.values()].at(-1);Object.assign(v,{phase:'driving',pos:i*3,progress:0,speed:.3,lastMovedAt:g.state.time});
  v.occKey=v.path[v.pos]+':'+g.dir(v.path[v.pos],v.path[v.pos+1])+':'+g.plannedLane(v,v.pos);g.state.occ.set(v.occKey,v.id);
 }
 for(let i=0;i<160;i++)g.state.vehicles.set(900000+i,{id:900000+i,phase:'stuck',kind:'pass',path:[g.id(166,150)],pos:0,progress:0,noUTurnPolicy:1,heldPose:{x:20+i%40,y:40+Math.floor(i/40)*2,angle:0},lastMovedAt:g.state.time,wait:0,recoveryVersion:g.state.version,nextRouteRetry:Infinity});
 const frames=[];
 for(let i=0;i<360;i++){
  g.state.time+=.04;g.advanceVehicles(.025,.04);
  frames.push(JSON.stringify([...g.state.vehicles.values()].filter(v=>v.id<900000).map(v=>[v.id,v.phase,v.pos,v.progress,v.lotDistance,v.speed,v.stopReason])));
 }
 return {frames,poses:g.state.poseComputations,visits:g.state.parkingRoadVisits||0};
}
const before=trace(reference),after=trace(source);
assert.deepEqual(after.frames,before.frames,'nearby filtering and pose reuse must preserve exact movement');
assert(after.poses<before.poses);assert(after.visits<before.visits);
const g=boot(source);g.state.money=1e9;
const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);assert(home);
const c=g.newCitizen(home);home.parked.add(c.id);g.parkingSpace(home,c.id,true);
const v={id:700001,phase:'parking_in',lotPath:[{x:10,y:10,angle:0},{x:20,y:10,angle:0}],lotDistance:0};
g.state.vehicles.set(v.id,v);
const stuck={id:700002,phase:'stuck',path:[g.id(166,150)],pos:0,progress:0};
const departing={id:700003,phase:'departing',fromId:home.id,citizenId:c.id};
g.state.vehicles.set(stuck.id,stuck);g.state.vehicles.set(departing.id,departing);
g.withTrafficStep(({nearbyParkingCars,updateParkingRoadSpatial})=>{
 const a=g.vehiclePosition(v);assert.equal(g.vehiclePosition(v),a,'reuse unchanged pose');
 assert([...nearbyParkingCars(a,.85)].includes(v));
 v.lotDistance=8;const b=g.vehiclePosition(v);assert.notEqual(a,b);assert(b.x>a.x);
 updateParkingRoadSpatial(v);assert(![...nearbyParkingCars(a,.85)].includes(v));assert([...nearbyParkingCars(b,.85)].includes(v));
 v.lotPath=[{x:30,y:30,angle:0},{x:40,y:30,angle:0}];v.lotDistance=0;
 assert.equal(g.vehiclePosition(v).x,30,'new parking path invalidates pose');
 for(const car of [stuck,departing]){const p=g.vehiclePosition(car);assert(p);assert([...nearbyParkingCars(p,.85)].includes(car),'include exceptional road-index omissions');}
 g.state.vehicles.delete(v.id);assert(![...nearbyParkingCars(b,.85)].includes(v),'removed cars cannot block');
});
console.log('PASS: 20 active cars + 160 distant stopped cars x 360 steps match full scans exactly; live pose/grid invalidation and exceptional phases verified.');
console.log(JSON.stringify({poseComputations:{before:before.poses,after:after.poses},parkingRoadCandidates:{before:before.visits,after:after.visits}}));

