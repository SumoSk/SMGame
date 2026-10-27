const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8').replace(/\r\n/g,'\n');
function section(code,name){const at=code.indexOf('function '+name+'(');assert(at>=0);const end=code.indexOf('\nfunction ',at+1);return code.slice(at,end<0?code.length:end);}
const before=source.replace('if(!trafficSpatial||buildingId==null)', 'if(true||!trafficSpatial||buildingId==null)');
function boot(code){
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0]
  .replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,')
  .replace("fs.readFileSync('dist/game.js','utf8')",'source');
 return new Function('require','source',fixture+'return boot().game;')(require,code);
}
function instrument(code){
 for(const name of ['lotClear','canLeaveParkingSpace','parkingEntranceOccupied','parkingBayObstructed']){
  const start=code.indexOf('function '+name+'('),at=code.indexOf('for(const other of ',start),brace=code.indexOf('{',at);
  code=code.slice(0,brace+1)+'state.lotCandidateVisits=(state.lotCandidateVisits||0)+1;'+code.slice(brace+1);
 }
 return code;
}
function trace(code){
 const g=boot(instrument(code));g.state.money=1e9;g.state.speed=1;
 const build=(key,x)=>{const b=g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true);assert(b);return b;};
 const homes=[build('home_large',160),build('home_large',200)],office=build('office_large',240);
 for(const home of homes)for(let i=0;i<4;i++){
  const c=g.newCitizen(home);home.residents.add(c.id);home.parked.add(c.id);g.parkingSpace(home,c.id,true);
  assert(g.createTrip(c,'work',home.id,office.id,null,null,null));
 }
 // Unrelated cars must not be visited by every parking sweep.
 for(let i=0;i<240;i++)g.state.vehicles.set(900000+i,{id:900000+i,phase:'delivery_unload',path:[],delivery:{until:Infinity}});
 const frames=[];
 for(let i=0;i<240;i++){
  g.state.time+=.04;g.advanceVehicles(.025,.04);
  frames.push(JSON.stringify([...g.state.vehicles.values()].filter(v=>v.id<900000)
   .map(v=>[v.id,v.phase,v.pos,v.progress,v.lotDistance,v.speed,v.stopReason])));
 }
 return {frames,visits:g.state.lotCandidateVisits||0};
}
// Indexing and the motion lookup must preserve exact movement. Retry pacing is
// checked independently because intentionally delaying lane attempts can change timing.
const original=trace(before),optimized=trace(source);
assert.deepEqual(optimized.frames,original.frames);
assert(optimized.visits<original.visits/2,'parking candidates should drop substantially');
const retryCode=source.slice(source.indexOf('const maneuverRetries='),source.indexOf('\nfunction capsule('));
const state={time:0,version:1},due=new Function('state',retryCode+'return maneuverRetryDue;')(state),v={id:8,path:[1,2,3],pos:0};
let attempts=0;for(let i=0;i<60;i++){state.time=i*1.6/60;if(due(v,'adaptive'))attempts++;}
assert(attempts<=4&&attempts>=2);
assert(due(v,'emergency'),'independent emergency timer');
v.path=[1,2,4];assert(due(v,'adaptive'),'new route invalidates retry wait');
state.version++;assert(due(v,'adaptive'),'road edits invalidate retry wait');
state.time=-1;assert(due(v,'adaptive'),'time rewind invalidates retry wait');
console.log('PASS: 8 parking trips x 240 steps match all-vehicle scans exactly.');
console.log(JSON.stringify({parkingCandidateVisits:{before:original.visits,after:optimized.visits,reductionPercent:Math.round(100*(1-optimized.visits/original.visits))},eligibleManeuverAttemptsPer60Frames:{before:60,after:attempts}}));

