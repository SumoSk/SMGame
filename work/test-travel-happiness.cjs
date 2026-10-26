const fs=require('node:fs');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot,city}=new Function('require',fixture+'return {boot,city};')(require);
const run=()=>{

const results=[];
const check=(condition,message)=>{if(!condition)throw Error(message);};
const equal=(a,b,message)=>check(a===b,(message||'unexpected value')+': '+a+' != '+b);
function test(name,fn){fn();results.push(name);}
function resident(g,home){const c=g.newCitizen(home);Object.assign(c,{resident:true,locationId:home.id,location:'home',happy:70});c.profile.trait=3;home.residents.add(c.id);home.parked.add(c.id);g.syncParkingSlots();return c;}
test('two game minutes per actual route block, no distance cap or UI-speed dependency',()=>{
 const {game:g}=boot(),path=[g.id(10,10),g.id(30,10),g.id(30,30)],e=g.travelEstimate(path);
 equal(e.blocks,40);equal(e.roadMinutes,80);equal(e.totalMinutes,100);
 g.state.speed=4;equal(g.travelEstimate(path).totalMinutes,100);equal(g.travelEstimate(null),null);
 equal(g.travelEstimate([g.id(0,0),g.id(200,0)]).totalMinutes,420);
});
test('work planning leaves enough travel time and retains the appointment',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home);c.profile.trait=0;c.workId=restaurant.id;restaurant.workers.add(c.id);
 let p,day=0;do{p=g.planForDay(c,day++);}while(!p.works&&day<10);
 check(p.works,'workday found');const work=p.steps.find(s=>s.kind==='work'),estimate=g.buildingTravelEstimate(c,home.id,restaurant.id);
 check(work.at+estimate.totalMinutes<=work.deadline,'work departure must fit route');equal(p.travelPlanningVersion,1);
 const appointment=p.desiredArrival;g.ensureRoutine(c).advance+=30;equal(g.planForDay(c,p.day).desiredArrival,appointment,'appointment is fixed');
});
test('new score table and one result per trip',()=>{
 const {game:g,home}=city(),c=resident(g,home);
 for(const [kind,outcome,expected]of[['work','ontime',4],['work','late',-2],['work','missed',-6],['work','unavailable',-4],['work','cancelled',-4],['leisure','ontime',3],['leisure','late',1],['leisure','missed',-2]]){
  c.happy=70;const v={id:g.state.nextId++,kind,startedAt:g.state.time,travelBudget:{totalMinutes:100},congestionMinutes:0};
  g.journeyResult(c,v,outcome,'fixture');equal(c.happy,70+expected,kind+' '+outcome);
  g.journeyResult(c,v,outcome,'duplicate');equal(c.happy,70+expected,'duplicate');
 }
});
test('stress only applies beyond allocated travel budget and is capped at two',()=>{
 const {game:g,home}=city(),c=resident(g,home);g.state.time=900;
 g.journeyResult(c,{id:9901,kind:'leisure',startedAt:800,travelBudget:{totalMinutes:100},congestionMinutes:100},'ontime','within budget');equal(c.happy,73);
 c.happy=70;g.journeyResult(c,{id:9902,kind:'leisure',startedAt:400,travelBudget:{totalMinutes:100},congestionMinutes:400},'late','long queue');equal(c.happy,69);equal(c.lastJourneyResult.stress,2);
});
test('expired optional stop is skipped without score or a fabricated missed trip',()=>{
 const {game:g,home}=city(),c=resident(g,home),plan={day:0,token:'optional',steps:[{kind:'restaurant',at:500,expires:600,duration:30},{kind:'home',at:600}]};
 c.lifeRun={day:0,index:0,retry:0,token:plan.token,plan};
 g.runLifestyle(c,'life',{day:0,index:0,token:plan.token});equal(c.happy,70);equal(c.lifeRun.index,1);check(!c.lastJourneyResult,'no failure generated');check(!c.vehicleId,'no fabricated departure');
});
test('destination is rechecked against route time and next work before departure',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home),plan={day:0,token:'fit',leisureEnd:1400,steps:[{kind:'restaurant',at:720,expires:1100,duration:30},{kind:'work',at:740,deadline:750,until:1000,workId:home.id}]};
 c.lifeRun={day:0,index:0,retry:0,token:plan.token,plan};c.lifePlans={0:plan};
 check(!g.optionalActivityFits(c,plan,0,restaurant.id,760,30),'must preserve upcoming work');
 g.runLifestyle(c,'life',{day:0,index:0,token:plan.token});check(!c.vehicleId,'do not depart when no time');equal(c.happy,70);equal(c.lifeRun.index,1);
});
test('already at work receives attendance and is not marked absent at midnight',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home);c.profile.trait=0;c.workId=restaurant.id;restaurant.workers.add(c.id);c.locationId=restaurant.id;
 const plan={version:251,day:0,token:'attendance',steps:[{kind:'work',at:700,deadline:730,until:900,workId:restaurant.id}]};
 c.lifePlans={0:plan};c.lifeRun={day:0,index:0,retry:0,token:plan.token,plan};
 g.runLifestyle(c,'life',{day:0,index:0,token:plan.token});equal(c.happy,74);equal(c.workDays[0].success,1);
 g.state.time=1440;g.daily();equal(c.workDays[0].missed,0);equal(c.workDays[0].success,1);
});
test('save migration preserves active journeys and happiness while rebuilding unused tomorrow',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home);c.profile.trait=0;c.workId=restaurant.id;restaurant.workers.add(c.id);
 g.scheduleDay(c,1);delete c.lifePlans[1].travelPlanningVersion;
 check(g.createTrip(c,'work',home.id,restaurant.id,null,null,950),'trip created');
 const id=c.vehicleId,started=g.state.vehicles.get(id).startedAt,happy=c.happy;
 check(g.loadGame(true,null,g.snapshot()),'save loads');
 const restored=g.state.citizens.get(c.id);equal(restored.vehicleId,id);equal(restored.happy,happy);equal(g.state.vehicles.get(id).startedAt,started);
 equal(restored.lifePlans[1].travelPlanningVersion,1);equal(g.state.events.filter(e=>e.citizenId===c.id&&e.day===1&&e.action==='lifeStart').length,1);
});
test('live trip gets the same budget as planning and simulation still advances',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home);
 check(g.createTrip(c,'leisure',home.id,restaurant.id,null,null,1000,{stay:30,serviceKind:'restaurant',activityEnd:1200}),'departure');
 const v=g.state.vehicles.get(c.vehicleId);equal(v.travelBudget.totalMinutes,g.travelEstimate(v.path).totalMinutes);
 const before=g.state.time;for(let i=0;i<40;i++)g.tick(.1);check(g.state.time>before,'clock advances');
});
return results;

};
console.log(JSON.stringify({passed:true,checks:run()}));
