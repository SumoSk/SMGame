'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
const FPSES=[12.5,30,60,120],SPEEDS=[1,2,5,20],Q=.08,MAX=16;
const result={source:process.env.SMCITY_SOURCE,following:[],cheap100:[],trips100:[],boundary100:[],caps:[],cpuCap:[],lifecycle:[],classification:[],decay:[]};
function quiet(g){g.state.lastImmigration=1e9;g.state.lastPass=1e9;g.state.nextActivityCheck=1e9;g.state.morningPlanningDay=0;}
function fresh(){
 const s=boot('occupy,frame,simulateFrame,resetSimulationRuntime,eventCanStartTrip,get simClock(){return simulationClock;},get eventBudget(){return eventDispatchBudget;},get tripSerial(){return eventTripSerial;},set auditDraw(fn){draw=fn;},set auditTick(fn){tick=fn;},set auditAction(fn){runAction=fn;}'),g=s.game;
 g.auditDraw=()=>{};g.reset('london');g.state.speed=0;g.frame(1000);s.wall=1000;quiet(g);s.tickRecords=[];s.actions=[];
 const tick=g.tick,run=g.runAction;
 g.auditTick=dt=>{const before=g.state.time,a=s.actions.length,t=g.tripSerial;tick(dt);s.tickRecords.push({gameDt:g.state.time-before,actions:s.actions.length-a,trips:g.tripSerial-t});};
 g.auditAction=(c,action,e)=>{const before=g.tripSerial;run(c,action,e);s.actions.push({citizenId:c?.id,action,at:g.state.time,trips:g.tripSerial-before});};
 return s;
}
function frame(s,dt){s.wall+=dt*1000;s.game.frame(s.wall);}
function advance(s,fps,speed,minutes){const g=s.game,end=g.state.time+minutes;g.state.speed=speed;let frames=0;
 while(g.state.time<end-1e-8){frame(s,Math.min(1/fps,(end-g.state.time)/(1.6*speed)));assert(++frames<30000);}
 assert(Math.abs(g.state.time-end)<1e-7);return frames;
}
function line(g,points,type='small'){const p=points.map(([x,y])=>g.id(x,y));for(const n of p)if(!g.state.roads.has(n))g.state.roads.set(n,{type,main:false,links:new Set(),load:0,wait:0});for(let i=1;i<p.length;i++){g.state.roads.get(p[i-1]).links.add(p[i]);g.state.roads.get(p[i]).links.add(p[i-1]);}return p;}
function addCar(g,p,id,pos){const v={id,path:[...p],pathSet:new Set(p),pos,progress:0,lane:0,laneSeed:0,speed:2.7,phase:'driving',kind:'pass',citizenId:null,wait:0,retryAt:0,lastMovedAt:g.state.time,noUTurnPolicy:1,routeCheckedVersion:g.state.version,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{}};g.state.vehicles.set(id,v);g.occupy(v,pos);return v;}
for(const fps of FPSES)for(const speed of SPEEDS)for(const frontFirst of [false,true]){
 const s=fresh(),g=s.game;g.state.roads.clear();g.state.gates=[];const p=line(g,Array.from({length:261},(_,i)=>[20+i,100]));let a,b;if(frontFirst){a=addCar(g,p,900,12);b=addCar(g,p,901,11);}else{b=addCar(g,p,900,11);a=addCar(g,p,901,12);}const frames=advance(s,fps,speed,16);
 assert(g.state.vehicles.has(a.id)&&g.state.vehicles.has(b.id));assert.equal(s.tickRecords.length,Math.round(16/Q));assert(s.tickRecords.every(x=>Math.abs(x.gameDt-Q)<1e-8));result.following.push({fps,speed,frontFirst,frames,ticks:s.tickRecords.length,gap:g.motionDistance(a)-g.motionDistance(b)});
}
for(const order of [false,true]){const gaps=result.following.filter(x=>x.frontFirst===order).map(x=>x.gap);assert(Math.max(...gaps)-Math.min(...gaps)<1e-8);}
console.error('fixed frame matrix passed');
function people(s,withJobs=false){const g=s.game;g.state.money=1e9;g.state.buildingQuota=Object.fromEntries(Object.keys(g.CATALOG).map(k=>[k,1000]));
 const homes=[160,184,208,232,256].map(x=>g.buildBuilding('home_large',x,148-g.CATALOG.home_large.plotHeight,true));assert(homes.every(Boolean));
 const offices=withJobs?[170,194,218,242,266].map(x=>g.buildBuilding('office_large',x,148-g.CATALOG.office_large.plotHeight,true)):[];assert(offices.every(Boolean));g.state.events=[];const residents=[];
 for(let hi=0;hi<homes.length;hi++){const home=homes[hi];for(let k=0;k<20;k++){const c=g.newCitizen(home);c.resident=true;c.location='home';c.locationId=home.id;c.profile.trait=0;home.residents.add(c.id);home.parked.add(c.id);g.parkingSpace(home,c.id,true);if(withJobs){const office=offices[hi];c.workId=office.id;office.workers.add(c.id);}residents.push(c);}}g.state.events=[];quiet(g);return residents;
}
for(const fps of FPSES)for(const speed of SPEEDS){
 const s=fresh(),g=s.game,residents=people(s);for(const c of residents)g.eventPush({citizenId:c.id,at:360,action:'home'});advance(s,fps,speed,.96);
 assert.equal(g.state.events.filter(e=>e.action==='home'&&e.at===360).length,0);assert.equal(s.actions.length,100);assert.equal(g.tripSerial,0);result.cheap100.push({fps,speed,processed:s.actions.length,lastAt:s.actions.at(-1).at-360,maxActionsPerTick:Math.max(...s.tickRecords.map(x=>x.actions)),trips:g.tripSerial});
}
console.error('100 cheap real actions passed');
for(const fps of FPSES)for(const speed of SPEEDS){
 const s=fresh(),g=s.game,residents=people(s,true);for(const c of residents){c.dailyPlan={day:0,end:361,desiredArrival:361,kind:null};g.eventPush({citizenId:c.id,at:360,action:'work',day:0});}advance(s,fps,speed,.96);
 const starts=s.actions.filter(x=>x.trips);assert.equal(starts.length,100);assert.equal(g.tripSerial,100);assert(starts.every(x=>x.at<361));assert(s.tickRecords.every(x=>x.actions<=42&&x.trips<=14));
 result.trips100.push({fps,speed,started:g.tripSerial,lastAt:starts.at(-1).at-360,maxTripsPerTick:Math.max(...s.tickRecords.map(x=>x.trips)),maxActionsPerTick:Math.max(...s.tickRecords.map(x=>x.actions)),boundary:'work shift ends at361; all100 start before it'});
}
console.error('100 actual trip starts passed');
for(const [fps,speed]of [[12.5,1],[12.5,20],[120,1],[120,20]]){
 const s=fresh(),g=s.game,residents=people(s,true);g.state.time=1439;for(const c of residents){c.dailyPlan={day:0,end:1440,desiredArrival:1440,kind:null};g.eventPush({citizenId:c.id,at:1439,action:'work',day:0});}advance(s,fps,speed,.96);
 assert.equal(g.tripSerial,100);assert(s.actions.filter(x=>x.trips).every(x=>x.at<1440));result.boundary100.push({fps,speed,started:g.tripSerial,lastAt:s.actions.filter(x=>x.trips).at(-1).at,dayBoundary:1440});
}
for(const speed of SPEEDS){
 const s=fresh(),g=s.game;g.state.speed=speed;const before=g.state.time;frame(s,.08);const first=s.tickRecords.length;assert(first<=MAX);assert(g.state.time-before<=1.28+1e-8);assert(g.simClock.minutes<Q+1e-8);const clock=g.state.time;frame(s,0);assert.equal(g.state.time,clock);result.caps.push({speed,ticksIn80ms:first,advanced:g.state.time-before,remainder:g.simClock.minutes,noCatchUpOnZeroDt:true});
}
{
 const s=fresh(),g=s.game;let now=0;const tick=g.tick;g.auditTick=dt=>{tick(dt);now+=6;};s.context.performance.now=()=>now;g.state.speed=20;const before=g.state.time;frame(s,.08);
 assert(Math.abs(g.state.time-before-2*Q)<1e-8);assert.equal(g.simClock.minutes,0);const after=g.state.time;frame(s,0);assert.equal(g.state.time,after);result.cpuCap.push({fakeMsPerTick:6,budgetMs:12,completedTicks:2,advanced:g.state.time-before,zeroDtDoesNotCatchUp:true});
}
{
 const s=fresh(),g=s.game;g.state.speed=1;frame(s,.01);assert(g.simClock.minutes>0);g.state.speed=0;frame(s,.05);assert.equal(g.simClock,null);assert.equal(g.eventBudget,null);g.state.speed=1;const at=g.state.time;frame(s,.015);assert.equal(g.state.time,at);result.lifecycle.push('pause clears fractional time and event credits');
 frame(s,.05);assert(g.eventBudget);g.reset('london');assert.equal(g.eventBudget,null);assert.equal(g.simClock,null);quiet(g);g.state.speed=1;frame(s,.01);assert.equal(g.state.time,360);result.lifecycle.push('reset discards old city remainder and credits');
 frame(s,.05);const raw=g.snapshot();assert(g.eventBudget);assert(g.loadGame(true,null,raw));assert.equal(g.eventBudget,null);assert.equal(g.simClock,null);quiet(g);g.state.speed=1;const loaded=g.state.time;frame(s,.01);assert.equal(g.state.time,loaded);result.lifecycle.push('load clears fractional time and event credits');
 g.state.time+=100;frame(s,.01);assert.equal(g.simClock.minutes,.016);assert.equal(g.eventBudget,null);result.lifecycle.push('external time jump discards old remainder');
 s.get('dialog').open=true;frame(s,.08);assert.equal(g.simClock,null);assert.equal(g.eventBudget,null);s.get('dialog').open=false;frame(s,.01);assert.equal(g.simClock.minutes,.016);result.lifecycle.push('modal pause discards remainder without consuming hidden time');
}
{
 const s=fresh(),g=s.game,c={id:1,resident:true,homeId:10,locationId:10,workId:20};
 assert.equal(g.eventCanStartTrip(c,{action:'home'}),false);assert.equal(g.eventCanStartTrip(c,{action:'home',life:true}),true);
 c.locationId=20;assert.equal(g.eventCanStartTrip(c,{action:'work'}),true);g.state.buildings.set(20,{workers:new Set([1])});assert.equal(g.eventCanStartTrip(c,{action:'work'}),false);g.state.buildings.get(20).workers.clear();assert.equal(g.eventCanStartTrip(c,{action:'work'}),true);
 result.classification.push('life metadata and missing/changed jobs are conservatively trip-capable; only stable no-trip actions bypass trip credit');
}
for(const speed of SPEEDS){const s=fresh(),g=s.game;g.state.roads.clear();g.state.gates=[];const p=line(g,[[20,20],[21,20]]);g.state.roads.get(p[0]).load=2;g.state.roads.get(p[0]).wait=2;advance(s,30,speed,.96);result.decay.push({speed,load:g.state.roads.get(p[0]).load,wait:g.state.roads.get(p[0]).wait});}
assert(Math.max(...result.decay.map(x=>x.load))-Math.min(...result.decay.map(x=>x.load))<1e-10);
assert(Math.max(...result.decay.map(x=>x.wait))-Math.min(...result.decay.map(x=>x.wait))<1e-10);
console.log(JSON.stringify({passed:true,quantum:Q,maxSteps:MAX,...result},null,2));
