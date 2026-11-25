'use strict';
const assert=require('node:assert/strict');
const {createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES}=require('../../dist/mayor-core.js');
const events=MAYOR_EVENTS.filter(e=>!['admin-rain','people-welcome'].includes(e.id));
const defs=new Map(events.map(e=>[e.id,e]));
const categories=Object.keys(MAYOR_CATEGORIES);
assert.equal(MAYOR_EVENTS.length,549);
assert.equal(new Set(MAYOR_EVENTS.map(e=>e.id)).size,549);
assert.equal(events.filter(e=>e.storyArc&&!e.storyOnly).length,70);
for(const e of events)for(const r of [e.ignored,...e.choices.flatMap(o=>[o.success,o.failure])].filter(Boolean)){
 for(const [k,v] of Object.entries(r.scores||{})){assert(categories.includes(k));assert(Number.isFinite(v));}
 if(e.storyArc&&r.storyNext)assert(defs.has('story-'+e.storyArc+'-'+r.storyNext),e.id);
}
function simulation(random=()=>0){
 const c=createMayorCore(events,random),s=c.fresh(360);
 s.started=true;s.sequence=1;s.nightDay=0;s.nightAt=null;
 const city={money:100000,level:20,aiCredits:2,buildingIds:{home_starter:[1]},buildingCounts:{home_starter:1},catalog:{home_starter:{name:'บ้าน',kind:'home',cost:24000,residents:10,unlocked:true}},canBuild:()=>true,capacityNeed:()=>({deficit:40,capacity:0}),performance:100,performanceForDay:()=>40};
 function issue(eventId,source='daily'){const d=defs.get(eventId);const i={id:1,eventId,category:d.category,status:'pending',source,day:0};s.issues=[i];return i;}
 return {c,s,city,issue};
}
{
 const {c,s,city,issue}=simulation(),i=issue('admin-traffic');
 assert(c.choose(s,1,0,city,500).ok);
 c.checkTasks(s,city,1000);assert.equal(i.status,'working');
 c.checkTasks(s,city,1800);assert.equal(i.status,'failed');
}
{
 const {c,s,city,issue}=simulation();issue('government-home');
 assert(c.choose(s,1,0,city,500).ok);city.money=100;
 c.checkTasks(s,city,1800);assert.equal(s.unpaid,71900);
 city.money=100000;c.advance(s,city,1800);assert.equal(s.unpaid,51900);
}
{
 const {c,s,city,issue}=simulation();issue('moral-envelope','moral');
 assert(c.choose(s,1,0,city,500).ok);assert.equal(s.audits.length,1);
 const saved=c.restore(JSON.parse(JSON.stringify(s)),500);
 assert(saved.audits[0].detected);city.money=100;
 for(let d=1;d<=2;d++){saved.issues=[];saved.nightDay=saved.day;saved.nightAt=null;c.advance(saved,city,360+d*1440);}
 assert.equal(saved.audits[0].status,'recovered');assert(saved.unpaid>0);
}
{
 const {c,s,city,issue}=simulation();issue('moral-public-grant','moral');
 assert(c.choose(s,1,0,city,500).ok);assert.equal(s.audits.length,0);
}
{
 const {c,s,city}=simulation();s.nightAt=1080;
 c.advance(s,city,1800);assert(s.history.some(h=>h.source==='night'&&h.status==='expired'));
}
{
 const {c,s,city,issue}=simulation();city.money=1;issue('admin-traffic');
 assert(!c.choose(s,1,1,city,500).ok);
}
assert.equal(defs.get('story-two-million-root').choices[3].success.scores.integrity,-22);
assert.equal(defs.get('story-birthday-root').ignored.storyNext,null);
assert.notEqual(defs.get('story-restaurants-conflict').choices[1].success.storyClose,true);
assert.equal(defs.get('story-restaurants-conflict').choices[1].failure.storyClose,true);
console.log('Mayor logic regression passed (549 definitions, 70 arcs).');
