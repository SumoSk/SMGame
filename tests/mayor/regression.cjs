'use strict';
const assert=require('node:assert/strict');
const {MAYOR_EVENTS,createMayorCore}=require('../../dist/mayor-core.js');
assert.equal(MAYOR_EVENTS.filter(d=>!d.rollbackOnly).length,129);
const defs=MAYOR_EVENTS.filter(d=>!['admin-rain','people-welcome'].includes(d.id)), by=new Map(defs.map(d=>[d.id,d]));
const core=createMayorCore(defs,()=>0.1);
const s=core.fresh(360);s.started=true;s.sequence=3;s.scores.people=77;s.unpaid=1234;
s.issues=[{id:1,eventId:'play-home',category:'people',status:'working',day:0,selected:0,task:{kind:'build',key:'home_starter',count:1},baseline:[1],grant:0},{id:2,eventId:'story-play-midnight-money-root',category:'integrity',status:'pending',day:0},{id:3,eventId:'play-food',category:'people',status:'pending',day:0}];
s.stories=[{id:'old',status:'active',closedIds:[3],history:[]}];s.history=[{id:7,eventId:'story-play-midnight-money-root',report:'old',status:'success',day:-1,at:0}];
const restored=core.restore(JSON.parse(JSON.stringify(s)),360);
assert.equal(restored.scores.people,77);assert.equal(restored.unpaid,1234);assert.equal(restored.history.length,1);assert.equal(restored.issues.length,1);assert.equal(restored.issues[0].status,'working');assert.equal(restored.stories[0].closedIds.length,0);
const city={money:1000000,level:20,aiCredits:2,buildingCounts:{home_starter:2},buildingIds:{home_starter:[1,2]},catalog:{home_starter:{kind:'home',name:'บ้าน',cost:24000,residents:10,unlocked:true}},canBuild:()=>true,capacityNeed:()=>({deficit:100,capacity:0}),performance:90};
core.checkTasks(restored,city,500);assert.equal(restored.issues[0].status,'success');assert.equal(city.money,1030000);
for(let n=0;n<5;n++){const fresh=core.fresh(360+n*1440);core.advance(fresh,city,360+n*1440);assert(fresh.issues.every(i=>!by.get(i.eventId).rollbackOnly));}
console.log('v7.2 rollback: original 129 events, save compatibility and task settlement passed.');
