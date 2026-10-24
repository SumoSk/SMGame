const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot,city}=new Function('require',fixture+'return {boot,city};')(require);
function resident(g,b){const c=g.newCitizen(b);Object.assign(c,{resident:true,locationId:b.id,location:'home',happy:85});c.profile.trait=3;b.residents.add(c.id);b.parked.add(c.id);g.syncParkingSlots();return c;}
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('precise home limits, no tourists in the denominator',()=>{
 const {game:g,home}=city();for(const [at,limit]of[[0,.5],[179,.5],[180,null],[599,null],[600,.2],[1079,.2],[1080,.3],[1439,.3],[1440,.5]])assert.equal(g.homeActivityLimit(at),limit);
 assert.equal(g.activitySnapshot().population,20);const c=g.admitTourist();assert(c);assert.equal(g.activitySnapshot().population,20);
});
test('casino sizes, costs, capacities, demand and construction tab',()=>{
 const {game:g}=boot();for(const [size,cost,maint,jobs,service,parking]of[['small',90000,900,6,16,22],['medium',200000,2000,12,32,44],['large',420000,4200,24,64,88]]){
  const t=g.CATALOG['casino_'+size];assert.deepEqual([t.cost,t.maint,t.jobs,t.service,t.parkingCapacity],[cost,maint,jobs,service,parking]);assert.equal(g.lotSlots({key:t.key}).length,parking);
 }
 assert.equal(g.dockItems('casino').length,3);assert(g.cityDemand().services.some(r=>r.kind==='casino'));
 for(const time of[0,179,180,359,720,1439,1440,2879])assert(g.serviceWindow('casino',time));
 assert(g.serviceWindow('restaurant',1500));assert(!g.serviceWindow('restaurant',1560));assert(g.serviceWindow('mall',1439));assert(!g.serviceWindow('mall',1440));
});
test('weekly days off are stable; casinos have three eight-hour shifts',()=>{
 const {game:g,home}=city();g.state.money=1e8;const office=g.buildBuilding('office_small',225,148-g.CATALOG.office_small.plotHeight,true),casino=g.buildBuilding('casino_small',275,148-g.CATALOG.casino_small.plotHeight,true);assert(office&&casino);
 const starts=new Set();for(let n=0;n<6;n++){const c=resident(g,home);c.profile.trait=0;c.workId=casino.id;casino.workers.add(c.id);const w=g.workRoutine(c);starts.add(w.leave+65);assert.equal(w.end-(w.leave+65),480);let days=0;for(let d=0;d<7;d++){assert.equal(g.worksOnDay(c,d),g.worksOnDay(c,d+7));if(g.worksOnDay(c,d))days++;}assert.equal(days,5);}
 assert.equal(starts.size,3);
 const c=resident(g,home);c.profile.trait=0;c.id=13;c.workId=office.id;office.workers.add(c.id);assert(g.worksOnDay(c,0));assert(!g.worksOnDay(c,5));assert(!g.worksOnDay(c,6));
});
test('06:00 planning preserves an overnight shift and prepares tomorrow',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home);c.profile.trait=0;c.workId=restaurant.id;restaurant.workers.add(c.id);
 const active={day:-1,index:0,token:'overnight',plan:{day:-1,token:'overnight',steps:[{kind:'work',until:1900,workId:restaurant.id}]}};c.lifeRun=active;c.activityUntil=460;
 g.state.time=360;g.updateCityActivity();assert.equal(c.lifeRun,active);assert.equal(c.activityUntil,460);assert(c.lifePlans[0]&&c.lifePlans[1]);assert.equal(c.dailyPlan.day,0);assert.equal(g.state.morningPlanningDay,0);
 const count=g.state.events.length;g.updateCityActivity();assert.equal(g.state.events.length,count,'no duplicate planning in one morning');
});
test('day-off plans include multiple outings and regular casino preferences',()=>{
 const {game:g,home}=city();let multi=0,late=0,casino=0;
 for(let n=0;n<120;n++){const c=resident(g,home),plan=g.planForDay(c,5);assert.equal(plan.version,251);assert(plan.weekend);assert(!plan.works);
  if(plan.steps.filter(s=>g.SERVICE_STAY[s.kind]).length>=4)multi++;
  if(plan.steps.some(s=>g.SERVICE_STAY[s.kind]&&s.at>=1200))late++;
  casino+=plan.steps.filter(s=>s.kind==='casino').length;
 }
 assert(multi>60);assert(late>50);assert(casino>10);
});
test('quota correction staggers real trips and keeps sleepers and active plans',()=>{
 const {game:g,home}=city();g.state.time=1200;
 const all=[...g.state.citizens.values()];for(const c of all){c.lifeRun=null;c.dailyPlan=null;c.routine.lastHomeAt=500;}
 const sleeper=all[0];sleeper.sleepUntil=1300;const active=all[1];active.lifeRun={day:0,token:'existing',index:0,plan:{steps:[]}};
 const money=g.state.money,happiness=all.reduce((n,c)=>n+c.happy,0);g.updateCityActivity();assert.equal(g.state.money,money);assert.equal(all.reduce((n,c)=>n+c.happy,0),happiness);
 const requests=all.filter(c=>c.adaptiveRequest);assert(requests.length>0&&requests.length<=3);assert(!sleeper.adaptiveRequest);assert(!active.adaptiveRequest);
 const events=g.state.events.filter(e=>e.action==='cityOuting');assert(new Set(events.map(e=>e.at)).size>1);
 const c=requests[0],event=events.find(e=>e.citizenId===c.id);g.state.time=event.at;g.runAction(c,'cityOuting',event);assert(c.vehicleId);const v=g.state.vehicles.get(c.vehicleId);assert(g.state.buildings.get(v.toId));assert.equal(v.life.token,c.lifeRun.token);assert(v.path.length>1);
});
test('no destination means no fabricated departure and no happiness penalty',()=>{
 const {game:g}=boot();g.state.money=1e8;const b=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);const c=resident(g,b);g.state.time=1100;c.routine.lastHomeAt=500;const happy=c.happy;
 g.updateCityActivity();assert(!c.vehicleId&&!c.adaptiveRequest);assert.equal(c.happy,happy);assert(g.state.homeActivityReport.blocked['ไม่มีสถานที่เปิดรองรับ']);
});
test('old lifecycle events cannot advance an adaptive outing',()=>{
 const {game:g,home}=city(),c=resident(g,home);const plan={token:'extra:test',day:0,steps:[{kind:'restaurant',at:700,duration:30,expires:1000},{kind:'home',at:800}]};c.lifeRun={day:0,index:0,retry:0,token:plan.token,plan};
 g.runAction(c,'lifeNext',{day:0,index:0});assert.equal(c.lifeRun.index,0);
 g.runAction(c,'lifeNext',{day:0,index:0,token:plan.token});assert.equal(c.lifeRun.index,1);
});
test('save/reload preserves existing journeys and restores casino preferences',()=>{
 const {game:g,home}=city(),c=resident(g,home);c.activityVersion=undefined;delete c.routine.preferences.casino;const run={day:0,index:0,retry:0,plan:{version:25,day:0,steps:[{kind:'home',at:800}]}};c.lifeRun=run;
 assert(g.loadGame(true,null,g.snapshot()));const loaded=g.state.citizens.get(c.id);assert.equal(loaded.lifeRun.index,0);assert.equal(loaded.lifeRun.plan.version,25);assert(loaded.routine.preferences.casino>0);assert.equal(loaded.lifePlans[1].version,251);
});
test('failed planned work is not charged again at midnight',()=>{
 const {game:g,home,restaurant}=city(),c=resident(g,home);c.happy=80;c.profile.trait=0;c.workId=restaurant.id;restaurant.workers.add(c.id);
 const plan={version:251,token:'251:test',day:0,steps:[{kind:'work',at:700,until:1000,deadline:800,workId:restaurant.id},{kind:'home',at:1000}]};c.lifePlans={0:plan};c.lifeRun={day:0,index:0,retry:3,token:plan.token,plan};g.lifeRetry(c,plan.steps[0],'ไปทำงานไม่ได้');assert.equal(c.happy,72);g.state.time=1440;g.daily();assert.equal(c.happy,72);assert.equal(c.workDays[0].missed,1);
});
test('v2.5 recorded results retain their original deduplication keys',()=>{const {game:g,home}=city(),c=resident(g,home);c.happy=80;c.journeyResults=[{key:'life:0:0',day:0,kind:'work',outcome:'ontime'}];g.journeyResult(c,{id:1,kind:'work',life:{day:0,index:0}},'missed','must not charge again',false);assert.equal(c.happy,80);assert.equal(c.journeyResults.length,1);});
test('tourist missed activities lose happiness once',()=>{const {game:g}=boot(),c={happy:85,pain:0,failKinds:new Set()},step={status:'planned'};g.touristActivityResult(c,step,'missed');assert.equal(c.happy,80);g.touristActivityResult(c,step,'missed');assert.equal(c.happy,80);});
console.log(JSON.stringify({passed:true,checks}));
