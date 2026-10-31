// Integration regressions for the 5.0 rules. Uses actual routing/reservations.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},nodes=new Map();let g;
function node(id='dummy'){if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',value:'',style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],showModal:noop,close:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});return nodes.get(id);}
const ctx={document:{addEventListener:noop,getElementById:node,querySelector:()=>node(),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>g=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),ctx);
function city(center=true){g.reset();require('./test-building-fixtures.cjs')(g);g.state.money=1e8;
 const build=(key,x)=>{const b=g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true);assert(b,key);return b;};
 const home=build('home_large',160),work=build('factory_small',185),civic=null;
 const c=g.newCitizen(home);Object.assign(c,{resident:true,locationId:home.id,location:'home',workId:work.id});home.residents.add(c.id);home.parked.add(c.id);g.parkingSpace(home,c.id,true);work.workers.add(c.id);
 for(const[a,b]of [[[270,150],[270,180]],[[270,180],[150,180]]])assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'small',true));g.state.events=[];return{home,work,civic,c,build};}
function result(c,id,outcome,kind='leisure'){g.journeyResult(c,{id,kind},outcome,'test');}
function report(c,kind='mall'){const plan={version:500,token:'test-report',day:0,steps:[{kind,at:360,duration:60,expires:900},{kind:'home',at:600,deadline:720}]};c.lifeRun={day:0,index:0,retry:0,token:plan.token,plan};g.runLifestyle(c,'life',{day:0,index:0,token:plan.token});}
function arrive(c){const v=g.state.vehicles.get(c.vehicleId);assert(v);const b=g.state.buildings.get(v.fromId);b?.parked.delete(c.id);if(b){const i=b.parkingSlots.indexOf(c.id);if(i>=0)b.parkingSlots[i]=null;}g.arrive(v,true);return v;}
const checks=[];function test(name,fn){try{fn();checks.push(name);}catch(e){console.error(name);throw e;}}
test('06:00 boundaries and equal-weight, idempotent scoring',()=>{const{c}=city();assert.equal(g.performanceDay(359),-1);assert.equal(g.performanceDay(360),0);assert.equal(g.performanceDay(1799),0);assert.equal(g.performanceDay(1800),1);
 result(c,'a','ontime','work');result(c,'a','ontime','work');result(c,'b','late');result(c,'c','missed','home');assert.equal(g.ensurePerformance().current.total,3);assert.equal(g.ensurePerformance().current.ontime,1);assert.equal(g.computeStats().performance,100);assert(!c.movingOut);
 g.state.time=1800;g.daily();assert.equal(g.computeStats().performance,100/3);assert(c.movingOut);assert.equal(g.ensurePerformance().current.total,0);});
test('50% personal score stays; empty days and legacy happiness do not evict',()=>{const{c}=city();c.happy=1;result(c,'1','ontime');result(c,'2','late');g.state.time=1800;g.daily();assert(!c.movingOut);assert.equal(g.personalPerformance(c),50);g.state.time=3240;g.daily();assert(!c.movingOut);});
test('night shift attendance is counted once; ongoing activity survives 06:00',()=>{const{c,work}=city();g.state.time=1600;result(c,'night','ontime','work');c.locationId=work.id;c.activityUntil=1980;const before=c.activityUntil;g.state.time=1800;g.daily();assert.equal(c.activityUntil,before);assert.equal(g.ensurePerformance().previous.ontime,1);assert.equal(g.ensurePerformance().current.total,0);assert(!c.movingOut);});
test('home appointment and overdue active journey are not counted twice',()=>{const{c,home,work}=city();g.state.time=1790;c.locationId=work.id;home.parked.delete(c.id);work.parked.add(c.id);g.parkingSpace(work,c.id,true);assert(g.createTrip(c,'home',work.id,home.id,null,null,1795));const v=g.state.vehicles.get(c.vehicleId);assert.equal(g.arrivalOutcome({...v,arrivedAt:1796},c,home),'late');g.state.time=1800;g.daily();assert.equal(g.ensurePerformance().previous.total,1);assert.equal(g.ensurePerformance().previous.late,1);g.state.time=1810;arrive(c);assert.equal(g.ensurePerformance().current.total,0);});
test('missing service records one failed trip automatically',()=>{const{c}=city();report(c);assert(!c.vehicleId);assert.equal(g.ensurePerformance().current.total,1);assert.equal(g.ensurePerformance().current.unavailable,1);const issue=Object.values(g.ensurePerformance().complaints)[0];assert.equal(issue.reason,'missing');assert.equal(issue.reports,1);assert.equal(issue.dueAt,1800);});
test('no failed-report zero income penalty',()=>{const{c}=city(false);report(c);assert.equal(g.incomeFactor(),1);assert.equal(g.ensurePerformance().current.total,1);assert(!c.vehicleId);g.state.time=1800;g.daily();assert.equal(g.incomeFactor(),.5);assert.equal(g.ensurePerformance().previous.total,1);});
test('unresolved complaint after 24 hours sets 50%; resolution restores next round',()=>{const{c,build}=city();report(c);g.state.time=1800;g.daily();assert.equal(g.incomeFactor(),.5);const before=g.state.money,stats=g.computeStats();const mall=build('mall_small',237);assert(mall);g.refreshComplaints(true);assert.equal(g.incomeFactor(),.5);g.state.time=3240;g.daily();assert.equal(g.incomeFactor(),1);});
test('reserved venue late arrival fails without creating a complaint',()=>{const{c,build}=city();const mall=build('mall_small',237);g.state.time=700;const plan={day:0,token:'far',steps:[{kind:'mall',at:700,duration:60,deadline:705,expires:1200},{kind:'home',at:1000,deadline:1200}]};c.lifeRun={day:0,index:0,token:'far',plan};g.runLifestyle(c,'life',{day:0,index:0,token:'far'});assert.equal(g.state.vehicles.get(c.vehicleId).toId,mall.id);g.state.time=710;arrive(c);assert.equal(g.ensurePerformance().current.late,1);assert.equal(Object.keys(g.ensurePerformance().complaints).length,0);});
test('full and disconnected venues report exact causes',()=>{let{c,build}=city();const mall=build('mall_small',237);g.state.time=700;mall.reservedService=g.CATALOG[mall.key].service;assert.equal(g.serviceAvailability(c,'mall').reason,'full');mall.reservedService=0;assert(g.serviceAvailability(c,'mall').building);mall.access=[];assert.equal(g.serviceAvailability(c,'mall').reason,'route');});
test('catalog categories and at least four scheduled trips with home deadlines',()=>{const{c}=city();assert(g.dockItems('home').some(i=>i.key.startsWith('hotel_')));assert(g.dockItems('leisure').some(i=>i.key.startsWith('casino_')));assert.equal(g.dockItems('civic').length,0);
 for(let i=0;i<80;i++)for(let d=0;d<7;d++){const p=g.planForDay({...c,id:c.id+i,profile:{...c.profile,trait:i%4},routine:undefined},d);assert(p.steps.length>=4);for(const step of p.steps){if(step.kind==='home')assert(Number.isFinite(step.deadline));if(g.SERVICE_STAY[step.kind]){const range=g.SERVICE_STAY[step.kind];assert(step.duration>=range[0]&&step.duration<=range[1]);}}}});
test('save reload preserves automatic shortage and failed mission',()=>{const{c}=city();report(c);const raw=g.snapshot(),save=JSON.parse(raw);assert(g.loadGame(true,null,raw));assert.equal(g.ensurePerformance().complaints[Object.keys(save.performance.complaints)[0]].dueAt,1800);assert.equal(g.state.vehicles.get(g.state.citizens.get(c.id).vehicleId),undefined);assert.equal(g.ensurePerformance().current.total,1);assert.equal(g.incomeFactor(),1);});
test('unexpired trip crosses 06:00 and earns its result in the following round',()=>{const{c,home,work}=city();g.state.time=1790;assert(g.createTrip(c,'work',home.id,work.id,null,null,1900));g.state.time=1800;g.daily();assert.equal(g.ensurePerformance().previous.total,0);assert.equal(g.ensurePerformance().current.total,0);g.state.time=1810;arrive(c);assert.equal(g.ensurePerformance().current.ontime,1);});
test('income factor applies once to gross income; maintenance stays whole',()=>{for(const factor of [0,.5,1]){city();g.ensurePerformance().incomeFactor=factor;const s=g.computeStats(),before=g.state.money;g.state.time=1800;g.daily();assert.equal(g.state.money,before+(s.tax+s.business)*factor-s.maint);}});
test('actual emigration retains the three-day housing quota cooldown',()=>{const{c,home}=city();result(c,'bad','missed');g.state.time=1800;g.daily();assert(c.movingOut);g.runAction(c,'moveOut');const v=g.state.vehicles.get(c.vehicleId);assert(v&&v.kind==='moveOut');arrive(c);assert(!g.state.citizens.has(c.id));assert.equal(home.moveOutCooldowns.length,1);assert.equal(home.moveOutCooldowns[0],g.state.time+3*1440);});
test('two kinds of unavailable services register without civic trips',()=>{const{c}=city();report(c);assert.equal(g.ensurePerformance().current.total,1);report(c,'shop');assert(!c.vehicleId);assert.equal(Object.keys(g.ensurePerformance().complaints).length,2);assert(!g.ensurePerformance().current.reportFailed);});
test('mission report treats late trips as failures and manual opens',()=>{const{c}=city();result(c,'late','late');const html=g.missionReportMarkup();assert(html.includes('ภารกิจไม่สำเร็จ'));assert.doesNotThrow(()=>node('help').onclick());});
test('repeated 5.0 reloads retain tomorrow plans and one start event',()=>{const{c}=city();g.scheduleDay(c,1);const expected=JSON.stringify(c.lifePlans[1]);for(let i=0;i<3;i++){assert(g.loadGame(true,null,g.snapshot()));const loaded=g.state.citizens.get(c.id);assert.equal(JSON.stringify(loaded.lifePlans[1]),expected);assert.equal(g.state.events.filter(e=>e.citizenId===c.id&&e.day===1&&e.action==='lifeStart').length,1);}});
test('no government building construction or category',()=>{
 assert.equal(g.BUILDING_CHAINS.civic,undefined);assert.equal(g.dockItems('civic').length,0);
 for(const key of ['civic_starter','civic_small','civic_legacy'])assert.equal(g.buildBuilding(key,211,140,true),false);
});
test('persistent demand warnings survive days and saves until a matching building is built',()=>{
 const {build}=city();
 g.observeDemandNotices([{kind:'park',name:'สวน',amount:20},{kind:'shop',name:'ร้านค้า',amount:5}]);
 assert.equal(g.demandNoticeList().length,2);
 g.state.time+=5*1440;
 g.observeDemandNotices([{kind:'park',name:'สวน',amount:0},{kind:'shop',name:'ร้านค้า',amount:0}]);
 assert.equal(g.demandNoticeList().length,2,'a natural demand drop must not clear an unbuilt warning');
 assert(g.loadGame(true,null,g.snapshot()),'reload original city');
 assert.equal(g.demandNoticeList().length,2,'alerts must be part of the save');
 assert(build('park_small',237),'one matching park is constructed');
 assert.deepEqual(Array.from(g.demandNoticeList(),x=>x.kind),['shop'],'only the park warning clears');
 g.observeDemandNotices([{kind:'park',name:'สวน',amount:20},{kind:'shop',name:'ร้านค้า',amount:5}]);
 assert.deepEqual(Array.from(g.demandNoticeList(),x=>x.kind),['shop'],'an uncleared shortage should not immediately re-alert after building');
 g.observeDemandNotices([{kind:'park',name:'สวน',amount:0}]);
 g.observeDemandNotices([{kind:'park',name:'สวน',amount:8}]);
 assert.deepEqual(Array.from(g.demandNoticeList(),x=>x.kind),['shop','park'],'a new shortage after recovery may alert again');
});
test('old 60-space stations remain loadable without losing their plots',()=>{
 const {home}=city(),save=JSON.parse(g.snapshot()),b=save.buildings.find(([id])=>id===home.id)[1];
 const originalId=home.id;b.key='civic_starter';b.y=135;b.parkingSlots=Array(60).fill(null);
 assert(g.loadGame(true,null,JSON.stringify(save)));
 const old=g.state.buildings.get(originalId);
 assert.equal(old.key,'civic_legacy');assert.equal(old.parkingSlots.length,60);
 assert.deepEqual([g.buildingBounds(old).w,g.buildingBounds(old).h],[11,13]);
});
test('grouped build boxes pop upward and keep every existing tier',()=>{
 city();
 const tabs=node('subcategories'),tray=node('tools'),popup=node('buildVariantPopup');
 tabs.onclick({target:{closest:()=>({dataset:{category:'home'}})}});
 assert(tray.innerHTML.includes('data-build-kind="home"'));
 assert(tray.innerHTML.includes('data-build-kind="hotel"'));
 assert(!tray.innerHTML.includes('data-tool="home_starter"'));
 tray.onclick({target:{closest:selector=>selector==='[data-build-kind]'?{dataset:{buildKind:'home'}}:null}});
 assert.equal(popup.hidden,false);
 for(const key of ['home_starter','home_large','home_dual','home_grand'])
  assert(popup.innerHTML.includes('data-tool="'+key+'"'),key);
 assert(!popup.innerHTML.includes('data-tool="hotel_starter"'));
 popup.onclick({target:{closest:selector=>selector==='[data-tool]'?{dataset:{tool:'home_dual'}}:null}});
 assert.equal(g.state.buildings.size>0,true); // unchanged city fixture
 assert(popup.innerHTML.includes('aria-pressed="true"'));
 tabs.onclick({target:{closest:()=>({dataset:{category:'work'}})}});
 assert.equal(popup.hidden,true);
 assert(tray.innerHTML.includes('data-build-kind="office"'));
 assert(tray.innerHTML.includes('data-build-kind="factory"'));
});
assert(fs.readFileSync('index.html','utf8').includes('<small>ภารกิจ :</small>'));
console.log(JSON.stringify({passed:true,checks},null,2));

