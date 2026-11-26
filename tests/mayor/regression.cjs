'use strict';
const assert=require('node:assert/strict');
const {MAYOR_EVENTS,createMayorCore}=require('../../dist/mayor-core.js');
assert.equal(MAYOR_EVENTS.filter(d=>!d.rollbackOnly&&!d.foundingOnly&&!d.followup).length,164);
assert.equal(MAYOR_EVENTS.filter(d=>!d.rollbackOnly).length,184);
assert.equal(MAYOR_EVENTS.filter(d=>d.lifeScene).length,42);
assert.equal(MAYOR_EVENTS.filter(d=>d.lifeFollow).length,7);
assert.equal(MAYOR_EVENTS.filter(d=>d.foundingOnly).length,12);
const defs=MAYOR_EVENTS.filter(d=>!['admin-rain','people-welcome'].includes(d.id)), by=new Map(defs.map(d=>[d.id,d]));
const core=createMayorCore(defs,()=>0.1);
const s=core.fresh(360);s.started=true;s.sequence=3;s.scores.people=77;s.unpaid=1234;
s.issues=[{id:1,eventId:'play-home',category:'people',status:'working',day:0,selected:0,task:{kind:'build',key:'home_starter',count:1},baseline:[1],grant:0},{id:2,eventId:'story-play-midnight-money-root',category:'integrity',status:'pending',day:0},{id:3,eventId:'play-food',category:'people',status:'pending',day:0}];
s.stories=[{id:'old',status:'active',closedIds:[3],history:[]}];s.history=[{id:7,eventId:'story-play-midnight-money-root',report:'old',status:'success',day:-1,at:0}];
const restored=core.restore(JSON.parse(JSON.stringify(s)),360);
assert.equal(restored.scores.people,77);assert.equal(restored.unpaid,1234);assert.equal(restored.history.length,1);assert.equal(restored.issues.length,1);assert.equal(restored.issues[0].status,'working');assert.equal(restored.stories[0].closedIds.length,0);
const city={money:1000000,level:20,aiCredits:2,population:20,tourists:0,roadVehicles:0,trafficCongested:false,tripCount:20,buildingCounts:{home_starter:2},buildingIds:{home_starter:[1,2]},catalog:{home_starter:{kind:'home',name:'บ้าน',cost:24000,residents:10,unlocked:true}},canBuild:()=>true,capacityNeed:()=>({deficit:100,capacity:0}),performance:90};
core.checkTasks(restored,city,500);assert.equal(restored.issues[0].status,'success');assert.equal(city.money,1030000);
for(let n=0;n<5;n++){const fresh=core.fresh(360+n*1440);core.advance(fresh,city,360+n*1440);assert(fresh.issues.every(i=>!by.get(i.eventId).rollbackOnly));}

const full=createMayorCore(MAYOR_EVENTS,()=>0.25);
const blank={...city,freeTowers:0,cars:0,grantFreeMahanakhon(n){this.freeTowers+=n;return n;},grantHardworkingCars(){this.cars+=4;return 4;},population:0,tripCount:0,performance:null,buildingCounts:{},buildingIds:{},capacityNeed:()=>({deficit:0,free:0}),money:1000000};
const fresh=full.fresh(360);full.advance(fresh,blank,360);
assert.equal(fresh.issues[0].eventId,'founding-welcome');
assert(fresh.issues.every(i=>MAYOR_EVENTS.find(d=>d.id===i.eventId).foundingOnly));
const grant=fresh.issues.find(i=>i.eventId==='founding-grant');assert(grant);
for(const id of ['founding-mahanakhon','founding-cars','founding-ai','founding-casino'])assert(fresh.issues.some(i=>i.eventId===id));
for(const id of ['founding-grant','founding-mahanakhon','founding-cars','founding-ai']){
 const i=fresh.issues.find(x=>x.eventId===id);
 assert.equal(full.options(fresh,i,blank).filter(o=>!o.legacyHidden).length,2);
}
for(const d of MAYOR_EVENTS){
 const safe=d.choices.filter(o=>o.noRisk);
 assert.equal(safe.length,1);const o=safe[0];
 assert(o.title.endsWith('(ไม่มีความเสี่ยง)'));assert(!o.task&&!o.cost&&!o.grant&&o.chance===undefined);
 assert(!Object.keys(o.requires||{}).length&&!Object.keys(o.requiresBuildings||{}).length);
 assert(!Object.values(o.success.scores||{}).some(v=>v<0));if(!d.rollbackOnly)assert.equal(Object.values(o.success.scores||{}).some(v=>v!==0),false);assert(!(o.success.effects||[]).length);
 const testState=full.fresh(360);testState.issues=[{id:1,eventId:d.id,category:d.category,status:'pending',day:0,source:'daily'}];
 assert(full.options(testState,testState.issues[0],blank).find(x=>x.noRisk).enabled);
}
for(const id of ['founding-mahanakhon','founding-cars','founding-ai']){
 const i=fresh.issues.find(x=>x.eventId===id);
 assert(full.choose(fresh,i.id,0,blank,370).ok);
 assert(!full.choose(fresh,i.id,0,blank,370).ok);
}
assert.equal(blank.freeTowers,1);assert.equal(blank.cars,4);assert.equal(blank.aiCredits,3);
assert(full.choose(fresh,grant.id,0,blank,370).ok);assert.equal(blank.money,1500000);
const reload=full.restore(JSON.parse(JSON.stringify(fresh)),370);full.advance(reload,blank,370);
assert.equal(blank.money,1500000);assert(!full.choose(reload,grant.id,0,blank,370).ok);assert.equal(blank.freeTowers,1);assert.equal(blank.cars,4);assert.equal(blank.aiCredits,3);
const scores={...reload.scores};full.advance(reload,blank,full.deadline(0));assert.deepEqual(reload.scores,scores);
full.advance(reload,blank,1800);assert(reload.issues.every(i=>MAYOR_EVENTS.find(d=>d.id===i.eventId).foundingOnly));assert(!reload.issues.some(i=>i.eventId==='founding-welcome'||i.eventId==='founding-grant'));
const legacy=full.fresh(360);legacy.started=true;legacy.issues=[{id:1,eventId:'admin-traffic',category:'admin',status:'pending',day:0,source:'daily'}];const legacyRestored=full.restore(legacy,360);full.advance(legacyRestored,blank,360);assert(!legacyRestored.issues.some(i=>i.eventId==='admin-traffic'));
const limited=createMayorCore(MAYOR_EVENTS.filter(d=>['admin-traffic','admin-crossing','people-commute','image-promise','night-fire','night-tourist','night-road','people-food','founding-casino-return'].includes(d.id)),()=>0);
const live={...city,population:20,tripCount:20,trafficCongested:false,tourists:0,roadVehicles:0,buildingCounts:{},buildingIds:{},capacityNeed:()=>({deficit:0})};
const ls=limited.fresh(1800);ls.openingHandled=true;limited.advance(ls,live,1800);assert.equal(ls.issues.length,0);
const cs=limited.fresh(1800);cs.openingHandled=true;limited.advance(cs,{...live,trafficCongested:true},1800);assert(cs.issues.some(i=>i.eventId==='admin-traffic'));
const fs=limited.fresh(4680);fs.openingHandled=true;fs.flags.push('foundingCasinoAccepted');fs.history.push({eventId:'founding-casino',status:'success',day:0});limited.advance(fs,live,4680);assert(fs.issues.some(i=>i.eventId==='founding-casino-return'));
console.log('Mayor founding, all welcome gifts, no-risk choices, save compatibility and one-time rewards passed.');


const casino=MAYOR_EVENTS.find(d=>d.id==='founding-casino');
const riskIndex=casino.choices.findIndex(o=>o.quietRisk);
assert(riskIndex>=0);assert.equal(casino.choices[riskIndex].chance,.3);
for(const [roll,quiet] of [[.299999,true],[.3,false],[.99,false]]){
 const e=createMayorCore(MAYOR_EVENTS,()=>roll),s=e.fresh(360);
 const c={...blank,money:500000};
 e.advance(s,c,360);const issue=s.issues.find(i=>i.eventId==='founding-casino'),scores={...s.scores};
 const result=e.choose(s,issue.id,riskIndex,c,370);assert(result.ok);assert.equal(c.money,3500000);
 assert.equal(result.won,quiet);if(quiet){assert.deepEqual(s.scores,scores);assert(!s.flags.includes('foundingCasinoAccepted'));}
 else{assert(s.scores.integrity<scores.integrity);assert(s.flags.includes('foundingCasinoAccepted'));}
 assert(!e.choose(s,issue.id,riskIndex,c,370).ok);
}
for(const d of MAYOR_EVENTS.filter(d=>!d.rollbackOnly)){
 const o=d.choices.find(x=>x.noRisk),isGift=['founding-grant','founding-ai','founding-mahanakhon','founding-cars'].includes(d.id);
 assert.equal(Object.values(o.success.scores||{}).some(v=>v!==0),false);
 if(!isGift){assert(!o.success.money&&!o.success.aiCredits&&!o.success.freeMahanakhon&&!o.success.hardworkingCars);assert(!(o.success.flags||[]).length);assert(d.choices.some(x=>!x.noRisk&&!x.legacyHidden&&Object.values(x.success?.scores||{}).some(v=>v>0)));}
 for(const q of d.choices.filter(x=>x.quietRisk)){assert.equal(q.chance,.3);assert(!(q.success.effects||[]).length);assert(!(q.success.flags||[]).length);assert.equal(Object.values(q.success.scores||{}).some(v=>v!==0),false);}
}
console.log('Neutral choices, reward alternatives and 30% quiet outcomes passed.');

const life=MAYOR_EVENTS.filter(d=>d.lifeScene);
assert.equal(new Set(MAYOR_EVENTS.map(d=>d.id)).size,MAYOR_EVENTS.length);
for(const d of life){
 assert.equal(d.choices.filter(o=>o.noRisk).length,1);
 assert(d.choices.some(o=>Object.values(o.success?.scores||{}).some(v=>v>0)));
 const neutral=d.choices.find(o=>o.noRisk);assert(!neutral.success.money&&!neutral.success.flags&&!neutral.success.effects);
}
const world={...live,money:500000,roadVehicles:5,tourists:2,buildingCounts:{restaurant_starter:1,park_small:1,office_starter:1},buildingIds:{restaurant_starter:[1],park_small:[2],office_starter:[3]},catalog:{restaurant_starter:{kind:'restaurant'},park_small:{kind:'park'},office_starter:{kind:'office'}}};
for(const d of life.filter(d=>d.lifeFollow)){
 const f=d.lifeFollow,parent=life.find(x=>x.id===f.parent);
 assert(parent.once);const e=createMayorCore([parent,d],()=>0),at=1800;
 const city={...world};let s=e.fresh(at);s.openingHandled=true;
 e.advance(s,city,at);let p=s.issues.find(i=>i.eventId===parent.id);
 assert(p);assert(!s.issues.some(i=>i.eventId===d.id));
 const good=parent.choices.findIndex(o=>o.success.flags?.includes(f.flag));assert(good>=0);
 assert(e.choose(s,p.id,good,city,at+1).ok);s=e.restore(JSON.parse(JSON.stringify(s)),at+1);
 for(let n=1;n<f.delay;n++){e.advance(s,city,at+n*1440);assert(!s.issues.some(i=>i.eventId===d.id));}
 const due=at+f.delay*1440;e.advance(s,city,due);const sequel=s.issues.find(i=>i.eventId===d.id);assert(sequel);
 const safe=d.choices.findIndex(o=>o.noRisk);const before={...s.scores},cash=city.money;
 assert(e.choose(s,sequel.id,safe,city,due+1).ok);assert.deepEqual(s.scores,before);assert.equal(city.money,cash);
 s=e.restore(JSON.parse(JSON.stringify(s)),due+1);e.advance(s,city,due+1440);assert(!s.issues.some(i=>i.eventId===d.id));
 // Neutral parent cannot trigger a sequel.
 let alt=e.fresh(at);alt.openingHandled=true;e.advance(alt,world,at);
 p=alt.issues.find(i=>i.eventId===parent.id);assert(e.choose(alt,p.id,parent.choices.findIndex(o=>o.noRisk),world,at+1).ok);
 e.advance(alt,world,due);assert(!alt.issues.some(i=>i.eventId===d.id));
}
for(const d of life.filter(d=>!d.lifeFollow&&(d.lifeKinds||d.lifeRoad||d.lifeTourists))){
 const e=createMayorCore([d],()=>0),s=e.fresh(1800);s.openingHandled=true;
 e.advance(s,{...live,roadVehicles:0,tourists:0,buildingCounts:{},buildingIds:{},catalog:{}},1800);assert(!s.issues.some(i=>i.eventId===d.id));
}
const meme=life.find(d=>d.id==='life-meme'),me=createMayorCore([meme],()=>0),ms=me.fresh(1800);ms.openingHandled=true;me.advance(ms,world,1800);
assert(me.choose(ms,ms.issues[0].id,0,world,1801).ok);me.advance(ms,world,3240);assert.equal(ms.issues.length,0);me.advance(ms,world,9000);assert(ms.issues.some(i=>i.eventId===meme.id));
console.log('42 new city life scenes, seven saved sequels, scene gates and cooldown passed.');

const retired=['lost-key','rubber-duck','clock','raincoat','wrong-mic','old-shirt','selfie','postcard','wrong-letter','visit-lunch','form','birthday-child','queue-cake','wrong-order','shop-sign','receipt','gift-basket','parking-favor'];
for(const id of retired)assert(MAYOR_EVENTS.find(d=>d.id==='life-'+id).rollbackOnly);
const old=full.fresh(1800);old.started=true;old.openingHandled=true;old.issues=[{id:1,eventId:'life-lost-key',category:'admin',status:'pending',day:1,source:'daily'}];old.history=[{id:7,eventId:'life-lost-key',category:'admin',status:'success',day:0,at:370,report:'old result'}];
const migrated=full.restore(old,1800);assert(!migrated.issues.length);assert.equal(migrated.history.length,1);assert.deepEqual(migrated.scores,old.scores);
assert.equal(MAYOR_EVENTS.filter(d=>d.id.startsWith('city-life-')).length,18);
console.log('Trivial scenes retired and replaced with city-policy decisions; old history retained.');
