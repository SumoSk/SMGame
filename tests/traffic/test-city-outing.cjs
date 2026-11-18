'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const candidatePath=process.env.SMCITY_SOURCE||path.resolve(__dirname,'../../dist/game.js');
const candidateSource=fs.readFileSync(candidatePath,'utf8');
// Only the unchanged pre-optimization chooser is embedded as the oracle.
// Its free names resolve inside a separate copy of the tested game's scope.
const originalChoose="function chooseCityOuting(c,requests=new Map()){\n const hour=(state.time%1440)/60,origin=state.buildings.get(c.locationId);if(!origin)return{reason:'ไม่มีอาคารต้นทาง'};\n const allowed=hour>=18||hour<3?['restaurant','pub','casino','shop','mall']:['restaurant','shop','mall','park','casino'];\n const kinds=allowed.filter(k=>serviceWindow(k,state.time)).sort((a,b)=>citizenServicePreference(c,b)-citizenServicePreference(c,a));\n let exists=false,space=false;\n for(const kind of kinds){\n  const win=serviceWindow(kind,state.time),duration=Math.round(SERVICE_STAY[kind][0]+habitRandom(c.id,Math.floor(state.time/15),183)*30);\n  const choices=[...state.buildings.values()].filter(b=>b.id!==origin.id&&CATALOG[b.key].kind===kind).sort((a,b)=>distance(id(a.x,a.y),id(origin.x,origin.y))+destinationRoadPenalty(a)-distance(id(b.x,b.y),id(origin.x,origin.y))-destinationRoadPenalty(b));\n  for(const b of choices){exists=true;const held=requests.get(b.id)||0;\n   if(b.visitors.size+b.reservedService+held>=CATALOG[b.key].service||parkingFree(b)<=held)continue;space=true;\n   const path=tripRoute(origin.id,b.id,null,null,c.id);if(!path)continue;\n   let length=0;for(let k=1;k<path.length;k++)length+=distance(path[k-1],path[k]);const eta=travelEstimate(path).totalMinutes;\n   const day=Math.floor(state.time/1440),workPlans=[lifePlan(c,day),lifePlan(c,day+1)].filter(Boolean);\n   const upcoming=workPlans.flatMap(plan=>plan.steps.filter(s=>s.kind==='work'&&s.at+plan.day*1440>state.time).map(step=>({at:step.at+plan.day*1440}))).sort((a,b)=>a.at-b.at)[0];\n   const quiet=(hour<3?Math.floor(state.time/1440)*1440+180:(Math.floor(state.time/1440)+1)*1440+180);\n   const end=Math.min(quiet,upcoming?upcoming.at:Infinity);\n   const homeTrip=buildingTravelEstimate(c,b.id,c.homeId);if(!homeTrip||state.time+RESIDENT_TRAVEL_MINUTES+duration>win.close||state.time+RESIDENT_TRAVEL_MINUTES*2+duration>end)continue;\n   return{kind,buildingId:b.id,duration,end};\n  }\n }\n return{reason:!exists?'ไม่มีสถานที่เปิดรองรับ':!space?'บริการหรือที่จอดเต็ม':'ไม่มีเส้นทางหรือเวลาไม่พอ'};\n}";
assert.equal(crypto.createHash('sha256').update(originalChoose).digest('hex'),"c33acbb7da5c248eb6966d8e3f0bca734169edd50dbb07809a10f445974c3f42");
process.env.SMCITY_SOURCE=candidatePath;
const harness=require('./audit-harness.cjs');
const rows=[],observed=new Set();let active=null,comparisons=0;
function encode(value){return JSON.stringify(value,(k,v)=>{
 if(v?.constructor?.name==='Map')return{$map:[...v.entries()]};
 if(v?.constructor?.name==='Set')return{$set:[...v.values()]};
 if(ArrayBuffer.isView(v))return{$typed:v.constructor.name,bytes:Buffer.from(v.buffer,v.byteOffset,v.byteLength).toString('base64')};
 if(typeof v==='number'&&!Number.isFinite(v))return{$number:String(v)};
 if(v===undefined)return{$undefined:true};return v;
 });}
function stateSnapshot(g,includeCaches=false){return encode(Object.fromEntries(Object.entries(g.state).filter(([k])=>includeCaches||!['routeCache','junctionCache','junctionLayoutCache'].includes(k))));}
function sameSnapshot(actual,expected,message){if(actual===expected)return;const a=JSON.parse(actual),b=JSON.parse(expected),keys=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));assert.deepEqual(keys,[],message+' changed state keys');}
function boot(oracle){
 const g=harness.boot('restoreOutingBaseline(){chooseCityOuting=('+originalChoose+');},callChoose(c,r){return chooseCityOuting(c,r);},installOutingHooks(h){chooseCityOuting=h("chooseCityOuting",chooseCityOuting);tripRoute=h("tripRoute",tripRoute);buildingTravelEstimate=h("buildingTravelEstimate",buildingTravelEstimate);}').game;
 if(oracle)g.restoreOutingBaseline();
 g.installOutingHooks((name,fn)=>function(...args){if(active){active.calls[name]=(active.calls[name]||0)+1;if(name==='tripRoute')active.routes.push(args.slice(0,5));}return fn.apply(this,args);});
 return g;
}
const oldGame=boot(true),newGame=boot(false);
const catalogs=new Map([oldGame,newGame].map(g=>[g,Object.fromEntries(Object.entries(g.CATALOG).map(([k,t])=>[k,{parkingCapacity:t.parkingCapacity,service:t.service}]))]));
function reset(g){if(!catalogs.has(g))catalogs.set(g,Object.fromEntries(Object.entries(g.CATALOG).map(([k,t])=>[k,{parkingCapacity:t.parkingCapacity,service:t.service}])));for(const[k,t]of Object.entries(catalogs.get(g)))Object.assign(g.CATALOG[k],t);g.reset('london');g.state.money=1e9;g.state.buildingQuota=Object.fromEntries(Object.keys(g.CATALOG).map(k=>[k,1000]));}
function build(g,key,x){const b=g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true);assert(b,'valid '+key+' at '+x);assert(b.access.some(a=>a.entry));return b;}
function citizen(g,home){const c=g.newCitizen(home);c.resident=true;c.arrivedAt=360;c.location='home';c.locationId=home.id;c.lifeRun=null;c.sleepUntil=0;c.routine.lastHomeAt=360;c.routine.preferences=Object.fromEntries(Object.keys(g.SERVICE_STAY).map(k=>[k,k==='restaurant'?10:1]));home.residents.add(c.id);home.parked.add(c.id);g.parkingSpace(home,c.id,true);return c;}
function fixture(g,{loop=true,venues=true}={}){
 reset(g);const home=build(g,'home_large',160),places=[];
 if(venues)for(const[key,x]of [['restaurant_large',184],['restaurant_large',208],['restaurant_large',232],['shop_large',20],['mall_large',44],['park_large',68],['pub_large',92],['casino_large',116]])places.push(build(g,key,x));
 if(loop){const cells=[];for(let y=150;y<=180;y++)cells.push(g.id(280,y));for(let x=279;x>=10;x--)cells.push(g.id(x,180));for(let y=179;y>=150;y--)cells.push(g.id(10,y));assert(g.buildRoad(cells,'large',true));}
 const c=citizen(g,home);g.state.time=600;return{g,c,home,places,restaurants:places.filter(b=>g.CATALOG[b.key].kind==='restaurant'),requests:new Map()};
}
function pair(options){return[fixture(oldGame,options),fixture(newGame,options)];}
function both(f,fn){for(const x of f)fn(x);}
function addVehicle(f,id,toId,citizenId){const v={id,toId,citizenId};f.g.state.vehicles.set(id,v);return v;}
function countVehicles(g){const map=g.state.vehicles,values=map.values;map.values=function*(){if(active)active.scans++;for(const v of values.call(this)){if(active)active.vehicleVisits++;yield v;}};return()=>{delete map.values;};}
function run(f){const metrics={calls:{},routes:[],scans:0,vehicleVisits:0},before=stateSnapshot(f.g),requestsBefore=encode(f.requests),restore=countVehicles(f.g);active=metrics;let result;try{result=f.g.callChoose(f.c,f.requests);}finally{active=null;restore();}sameSnapshot(stateSnapshot(f.g),before,'choose preserves source domain state');assert.equal(encode(f.requests),requestsBefore,'choose preserves caller reservations');return{result,metrics,state:stateSnapshot(f.g,true)};}
function check(f,name,expected){const a=run(f[0]),b=run(f[1]);assert.equal(encode(b.result),encode(a.result),name+' exact choice/reason/duration/end');sameSnapshot(b.state,a.state,name+' complete post-call state including caches');assert.equal(encode(b.metrics.calls),encode(a.metrics.calls),name+' preserves route/planner calls');assert.equal(encode(b.metrics.routes),encode(a.metrics.routes),name+' preserves route call order and inputs');assert(b.metrics.scans<=1,name+' at most one local vehicle enumeration');if(expected)expected(b.result,a.metrics,b.metrics);comparisons++;observed.add(b.result.reason||b.result.kind);rows.push({name,result:b.result,baselineScans:a.metrics.scans,candidateScans:b.metrics.scans,baselineVehicleVisits:a.metrics.vehicleVisits,candidateVehicleVisits:b.metrics.vehicleVisits});return b.result;}

let f=pair({venues:false});both(f,x=>{x.c.locationId=-999;addVehicle(x,9000,7,1);});check(f,'missing origin',(r,a,b)=>{assert.equal(r.reason,'ไม่มีอาคารต้นทาง');assert.equal(b.scans,0);});
f=pair({venues:false});check(f,'no destination buildings',(r,a,b)=>{assert.equal(r.reason,'ไม่มีสถานที่เปิดรองรับ');assert.equal(b.scans,0);});
f=pair();both(f,x=>{for(const b of x.places)b.reservedService=x.g.CATALOG[b.key].service;addVehicle(x,9000,x.places[0].id,1);});check(f,'all service capacity full remains lazy',(r,a,b)=>{assert.equal(r.reason,'บริการหรือที่จอดเต็ม');assert.equal(a.scans,0);assert.equal(b.scans,0);});
f=pair();check(f,'real loop route succeeds',r=>{assert.equal(r.kind,'restaurant');assert.equal(r.buildingId,f[1].restaurants[0].id);assert.equal(r.end,1620);assert(r.duration>=40&&r.duration<=70);});
both(f,x=>x.requests.set(x.restaurants[0].id,x.g.CATALOG.restaurant_large.parkingCapacity));check(f,'live held reservations select next destination',r=>assert.equal(r.buildingId,f[1].restaurants[1].id));
both(f,x=>x.requests.delete(x.restaurants[0].id));check(f,'released reservations are read on next call',r=>assert.equal(r.buildingId,f[1].restaurants[0].id));
both(f,x=>{const b=x.restaurants[0];for(let i=0;i<49;i++)b.parked.add(10000+i);addVehicle(x,9000,b.id,1);addVehicle(x,9001,x.restaurants[1].id,2);});
check(f,'live parked membership plus incoming fills first destination',r=>assert.equal(r.buildingId,f[1].restaurants[1].id));
both(f,x=>{x.g.state.vehicles.get(9000).toId=x.restaurants[1].id;x.g.state.vehicles.get(9001).toId=x.restaurants[0].id;});check(f,'same-size retarget still counts arriving citizen',r=>assert.equal(r.buildingId,f[1].restaurants[1].id));
both(f,x=>x.g.state.vehicles.get(9001).toId=x.restaurants[1].id);check(f,'same-size vehicle retarget releases first destination',r=>assert.equal(r.buildingId,f[1].restaurants[0].id));
both(f,x=>{const b=x.restaurants[0];b.parked.delete(10000);b.parked.add(30000);});check(f,'same-size parked member replacement retains capacity',r=>assert.equal(r.buildingId,f[1].restaurants[0].id));
both(f,x=>{x.g.state.vehicles.delete(9000);addVehicle(x,9002,x.restaurants[0].id,'0');});check(f,'same-size vehicle membership replacement refreshes count',r=>assert.equal(r.buildingId,f[1].restaurants[1].id));
for(const cid of [0,null,false,'',NaN,undefined,-1,'0',{},[]]){both(f,x=>x.g.state.vehicles.get(9002).citizenId=cid);check(f,'exact citizenId truthiness '+String(cid),r=>assert.equal(r.buildingId,cid?f[1].restaurants[1].id:f[1].restaurants[0].id));}
both(f,x=>{x.g.state.vehicles.get(9002).citizenId=1;x.g.state.vehicles.get(9002).toId=String(x.restaurants[0].id);});check(f,'strict numeric versus string destination equality',r=>assert.equal(r.buildingId,f[1].restaurants[0].id));
both(f,x=>{const v=x.g.state.vehicles.get(9002);v.toId=x.restaurants[0].id;});check(f,'strict matching numeric destination equality',r=>assert.equal(r.buildingId,f[1].restaurants[1].id));

f=pair();both(f,x=>{const b=x.restaurants[0],old=b.id;x.g.state.buildings.delete(old);b.id=NaN;x.g.state.buildings.set(NaN,b);for(let i=0;i<49;i++)b.parked.add(10000+i);addVehicle(x,9000,NaN,1);addVehicle(x,9001,NaN,2);});check(f,'NaN destination never equals itself under strict admission',r=>assert(Number.isNaN(r.buildingId)));

f=pair();for(const capacity of [false,0,null,undefined,NaN,-1,1]){both(f,x=>x.g.CATALOG.restaurant_large.parkingCapacity=capacity);check(f,'parking capacity coercion '+String(capacity));}
f=pair();both(f,x=>x.g.CATALOG.restaurant_large.service=false);check(f,'false service capacity short circuits to another kind');

f=pair();for(const t of [0,179,180,299,300,359,360,419,420,599,600,1079,1080,1379,1380,1439,1440,1559,1560,1619,1620,1799,1800]){both(f,x=>x.g.state.time=t);check(f,'service/quiet-window boundary '+t);}
f=pair();both(f,x=>x.c.lifePlans={0:{day:0,steps:[{kind:'work',at:650}]}});check(f,'upcoming work rejects insufficient time',r=>assert.equal(r.reason,'ไม่มีเส้นทางหรือเวลาไม่พอ'));
both(f,x=>x.c.lifePlans={0:{day:0,steps:[{kind:'home',at:620},{kind:'work',at:1200},{kind:'work',at:1300}]},1:{day:1,steps:[{kind:'work',at:500}]}});check(f,'earliest upcoming work preserves end',r=>assert.equal(r.end,1200));
both(f,x=>{delete x.c.lifePlans;x.c.dailyPlan={day:0,steps:[{kind:'work',at:1100}]};});check(f,'dailyPlan work fallback preserves end',r=>assert.equal(r.end,1100));
f=pair();both(f,x=>{x.c.routine.preferences.mall=100;});check(f,'shopping preference preserves mall choice',r=>assert.equal(r.kind,'mall'));
f=pair();both(f,x=>{x.g.state.time=1080;x.c.profile.trait=2;x.c.routine.preferences.pub=100;});check(f,'nightlife preference preserves pub choice',r=>assert.equal(r.kind,'pub'));
f=pair();for(const held of [-1,0,null,false,NaN,Infinity]){both(f,x=>x.requests.set(x.restaurants[0].id,held));check(f,'reservation coercion '+String(held));}
// The original preference reader can initialize old citizens' routine data.
// Compare that pre-existing side effect rather than incorrectly asserting purity.
f=pair();both(f,x=>{delete x.c.routine;});const initialized=f.map(x=>x.g.callChoose(x.c,x.requests));assert.equal(encode(initialized[1]),encode(initialized[0]));sameSnapshot(stateSnapshot(newGame,true),stateSnapshot(oldGame,true),'preserves legacy routine initialization');assert(newGame.state.citizens.get(f[1].c.id).routine.preferences);comparisons++;rows.push({name:'existing legacy routine initialization remains identical',result:initialized[1]});

f=pair({loop:false});both(f,x=>{for(const b of [...x.places])if(x.g.CATALOG[b.key].kind==='restaurant')x.g.state.buildings.delete(b.id);for(let i=0;i<1000;i++)addVehicle(x,10000+i,-9,i%2?i:0);});
check(f,'real cross roads reject four unavailable destinations',(r,a,b)=>{assert.equal(r.reason,'ไม่มีเส้นทางหรือเวลาไม่พอ');assert.equal(a.scans,4);assert.equal(b.scans,1);assert.equal(a.vehicleVisits,4000);assert.equal(b.vehicleVisits,1000);});

// Stable sorting preserves insertion order when the complete comparator ties.
f=pair();both(f,x=>{const a=x.restaurants[0],b=x.restaurants[1];b.x=a.x;b.y=a.y;});check(f,'equal destination comparator retains original insertion order',r=>assert.equal(r.buildingId,f[1].restaurants[0].id));

// A RAM-only route hook simulates a parked change between candidates, proving
// only incoming counts are reused. Production route calls do not change it.
const livePairs=[fixture(boot(true)),fixture(boot(false))];
for(const x of livePairs){const second=x.restaurants[1];let first=true;x.g.installOutingHooks((name,fn)=>name==='tripRoute'?function(...args){if(first&&args[1]===x.restaurants[0].id){first=false;for(let k=0;k<x.g.CATALOG[second.key].parkingCapacity;k++)second.parked.add(40000+k);return null;}return fn.apply(this,args);}:fn);}
const liveResults=livePairs.map(x=>x.g.callChoose(x.c,x.requests));assert.equal(encode(liveResults[1]),encode(liveResults[0]));assert.equal(liveResults[1].buildingId,livePairs[1].restaurants[2].id);comparisons++;rows.push({name:'RAM-only between-candidate parked mutation is read live',result:liveResults[1]});

function burst(g){reset(g);const homes=[160,184,208,232,256].map(x=>build(g,'home_large',x)),places=[['restaurant_large',20],['shop_large',40],['park_large',60],['mall_large',80]].map(([k,x])=>build(g,k,x));for(const home of homes)for(let k=0;k<20;k++)citizen(g,home);for(let i=0;i<1000;i++)g.state.vehicles.set(50000+i,{id:50000+i,toId:-9,citizenId:i+1});g.state.time=600;g.state.morningPlanningDay=0;g.state.nextActivityCheck=600;for(const b of places)assert.equal(g.tripRoute(homes[0].id,b.id,null,null,[...homes[0].parked][0]),null);return{g,homes,places};}
const burstResults=[oldGame,newGame].map(g=>{const x=burst(g),m={calls:{},routes:[],scans:0,vehicleVisits:0},restore=countVehicles(g);active=m;try{g.updateCityActivity();}finally{active=null;restore();}return{metrics:m,state:stateSnapshot(g,true),report:g.state.homeActivityReport};});
sameSnapshot(burstResults[1].state,burstResults[0].state,'100-person admission pass preserves every state field including planner report, events, vehicle data and caches');
assert.equal(encode(burstResults[1].metrics.calls),encode(burstResults[0].metrics.calls));assert.equal(encode(burstResults[1].metrics.routes),encode(burstResults[0].metrics.routes));
assert.equal(burstResults[0].metrics.calls.chooseCityOuting,100);assert.equal(burstResults[1].metrics.scans,100);assert.equal(burstResults[0].metrics.scans,400);assert.equal(burstResults[1].report.queued,0);comparisons++;
rows.push({name:'100-person no-route pass still checks every original candidate',baselineScans:burstResults[0].metrics.scans,candidateScans:burstResults[1].metrics.scans,baselineVehicleVisits:burstResults[0].metrics.vehicleVisits,candidateVehicleVisits:burstResults[1].metrics.vehicleVisits,chooseCalls:burstResults[1].metrics.calls.chooseCityOuting,report:burstResults[1].report});
assert(observed.has('ไม่มีอาคารต้นทาง')&&observed.has('ไม่มีสถานที่เปิดรองรับ')&&observed.has('บริการหรือที่จอดเต็ม')&&observed.has('ไม่มีเส้นทางหรือเวลาไม่พอ'));
const report={passed:true,comparisons,source:candidatePath,sourceSha256:crypto.createHash('sha256').update(candidateSource).digest('hex'),oracle:'Exact unchanged v6.0.3 base chooseCityOuting injected into candidate lexical scope; independent candidate and oracle states. Real building, road and citizen APIs; RAM-only instrumentation and one clearly labeled mutation probe. No wall-clock benchmarks.',rows};
const output=process.env.OUTING_REPORT;if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,comparisons,sourceSha256:report.sourceSha256,observed:[...observed],last:rows.at(-1)},null,2));
module.exports=report;
