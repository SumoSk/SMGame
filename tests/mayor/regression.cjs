'use strict';
const assert=require('node:assert/strict');
const {createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES}=require('../../dist/mayor-core.js');
const events=MAYOR_EVENTS.filter(e=>!['admin-rain','people-welcome'].includes(e.id));
const defs=new Map(events.map(e=>[e.id,e]));
const categories=Object.keys(MAYOR_CATEGORIES);
assert.equal(MAYOR_EVENTS.length,623);
assert.equal(new Set(MAYOR_EVENTS.map(e=>e.id)).size,623);
assert.equal(events.filter(e=>e.storyArc&&!e.storyOnly).length,75);
for(const e of events)for(const r of [e.ignored,...e.choices.flatMap(o=>[o.success,o.failure])].filter(Boolean)){
 for(const [k,v] of Object.entries(r.scores||{})){assert(categories.includes(k));assert(Number.isFinite(v));}
 if(e.storyArc&&r.storyNext)assert(defs.has('story-'+e.storyArc+'-'+r.storyNext),e.id);
}
function simulation(random=()=>0){
 const c=createMayorCore(events,random),s=c.fresh(360);
 s.started=true;s.sequence=1;s.nightDay=0;s.nightAt=null;
 const city={money:100000,level:20,aiCredits:2,buildingIds:{home_starter:[1]},buildingCounts:{home_starter:1},catalog:{home_starter:{name:'บ้าน',kind:'home',cost:24000,residents:10,unlocked:true}},canBuild:()=>true,capacityNeed:()=>({deficit:40,capacity:0}),performance:100,recentPerformance:70,performanceForDay:()=>40};
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
console.log('Mayor logic regression passed (623 definitions, 75 arcs including legacy).');


const current=events.filter(e=>e.playEvent);
assert.equal(current.length,74);
assert.equal(current.filter(e=>e.storyArc&&!e.storyOnly).length,5);
assert.equal(current.filter(e=>e.choices.some(o=>o.task?.kind==='build')).length,14);
const kinds=['home','shop','restaurant','office','factory','hotel','mall','pub','casino','park'];
function playCity(all=true){return {money:1e8,aiCredits:5,level:20,buildingCounts:Object.fromEntries(kinds.map(k=>[k+'_starter',all?1:0])),buildingIds:Object.fromEntries(kinds.map((k,i)=>[k+'_starter',all?[i+1]:[]])),catalog:Object.fromEntries(kinds.map(k=>[k+'_starter',{name:k,kind:k,cost:10000,residents:10,jobs:10,beds:10,service:10,unlocked:true}])),canBuild:()=>true,capacityNeed:()=>({deficit:100,capacity:0}),performance:90,recentPerformance:80,performanceForDay:()=>90};}
let branches=0;
for(const d of current)for(let idx=0;idx<d.choices.length;idx++)for(const roll of d.choices[idx].chance==null?[0]:[0,.999]){
 const c=createMayorCore(events,()=>roll),s=c.fresh(360),v=playCity();s.started=true;s.sequence=1;
 const i={id:1,eventId:d.id,category:d.category,day:0,status:'pending',source:d.emergencyOnly?'night':d.storyOnly?'story':'daily',...(d.emergencyOnly?{deadline:1200}:{})};s.issues=[i];
 if(d.storyOnly){i.storyId='thread-1';s.stories=[{id:'thread-1',arc:d.storyArc,category:d.category,status:'active',node:d.storyNode,turns:1,history:[],closedIds:[],cash:0}];}
 const r=c.choose(s,1,idx,v,500);assert(r.ok,d.id+':'+idx);branches++;
 if(r.working){const t=i.task;if(t.kind==='build')v.buildingIds[t.key].push(...Array.from({length:t.count},(_,n)=>100+n));if(t.kind==='performance')v.performanceForDay=()=>100;c.checkTasks(s,v,1800);assert.equal(i.status,'success');for(const e of d.choices[idx].success.effects||[])assert(s.effects.some(z=>z.kind===e.kind&&z.expires>1800),d.id+' missing buff');}
 assert(s.history.length>0&&categories.every(k=>s.scores[k]>=0&&s.scores[k]<=100),d.id+' state');
}
let draws=0;
for(let seed=1;seed<=80;seed++){
 let x=seed;const c=createMayorCore(events,()=>((x=Math.imul(1664525,x)+1013904223|0)>>>0)/4294967296),s=c.fresh(360),v=playCity(seed%2===0);
 if(seed%2){v.level=1;for(const b of Object.values(v.catalog))b.unlocked=['home','shop','restaurant','park','office'].includes(b.kind);}
 c.advance(s,v,360);assert(s.issues.every(i=>defs.get(i.eventId).playEvent),'legacy draw');
 for(const i of s.issues){const d=defs.get(i.eventId);assert(!d.needsKind||Object.entries(v.catalog).some(([k,b])=>b.kind===d.needsKind&&v.buildingCounts[k]>0),'building eligibility');assert(c.options(s,i,v).some(o=>o.enabled),'no available choice');}
 assert(s.issues.filter(i=>i.source==='daily').length<=5);draws+=s.issues.length;const before=s.issues.length;c.advance(s,v,400);assert.equal(s.issues.length,before);
}
{
 const c=createMayorCore(events,()=>0),s=c.fresh(360),v=playCity();s.started=true;s.nightDay=0;s.nightAt=null;s.sequence=1;v.money=100000;
 s.issues=[{id:1,eventId:'story-play-midnight-money-root',category:'integrity',day:0,status:'pending',source:'moral'}];
 assert(c.choose(s,1,0,v,500).ok);assert.equal(v.money,2100000);assert.equal(s.stories.length,1);
 c.advance(s,v,1800);assert(s.issues.some(i=>i.eventId==='story-play-midnight-money-conflict'));
 v.money=100000;c.advance(s,v,2400);assert.equal(s.unpaid,1900000);assert.equal(s.stories[0].status,'ended');
}
{
 const c=createMayorCore(events,()=>0),s=c.fresh(360);delete s.playEdition;s.issues=[{id:1,eventId:'government-home',status:'working'},{id:2,eventId:'story-restaurants-root',status:'pending'}];s.stories=[{arc:'restaurants',status:'active',closedIds:[9],history:[]}];s.scores.people=77;s.unpaid=1234;
 const migrated=c.restore(s,360);assert.equal(migrated.issues.length,1);assert.equal(migrated.issues[0].status,'working');assert.equal(migrated.stories[0].closedIds.length,0);assert.equal(migrated.scores.people,77);assert.equal(migrated.unpaid,1234);assert.equal(c.restore(migrated,360).issues.length,1);
}
console.log('City stories: '+branches+' choice cases, '+draws+' generated events; migration and consequence tests passed.');
