const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot,city}=new Function('require',fixture+'return {boot,city};')(require);
function citizen(g,home){const c=g.newCitizen(home);c.resident=true;c.happy=80;c.locationId=home.id;c.profile.trait=3;home.residents.add(c.id);home.parked.add(c.id);g.syncParkingSlots();return c;}
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('150 game minute rules',()=>{const {game:g}=boot();assert.equal(g.NO_ROUTE_TIMEOUT,150);assert.equal(g.IMMOBILE_RESPAWN_TIMEOUT,150);});
test('no-route timeout cancels at 150, while an ordinary stalled trip respawns',()=>{
 for(const noRoute of [true,false]){
  const {game:g,home,restaurant}=city(),c=citizen(g,home);assert(g.createTrip(c,'leisure',home.id,restaurant.id,null,null,950,{activityEnd:1100,serviceKind:'restaurant',stay:30}));
  const v=g.state.vehicles.get(c.vehicleId);g.strandVehicle(v,'fixture');v.routeMissing=noRoute;v.routeMissingSince=noRoute?g.state.time-149:null;v.lastMovedAt=g.state.time-149;v.recoveryVersion=g.state.version;v.nextRouteRetry=Infinity;
  g.advanceVehicles(0,0);assert(g.state.vehicles.has(v.id));assert.equal(v.respawns,0);g.state.time++;g.advanceVehicles(0,0);
  if(noRoute){assert(!g.state.vehicles.has(v.id));assert.equal(c.lastJourneyResult.outcome,'cancelled');assert.equal(restaurant.reservedService,0);}
  else{assert(g.state.vehicles.has(v.id));assert.equal(v.respawns,1);assert.equal(v.toId,restaurant.id);assert.equal(restaurant.reservedService,1);}
 }
});
test('one result, bounded stress and work-only taxes',()=>{
 const {game:g,home}=city(),c=citizen(g,home);const v={id:700,kind:'leisure',startedAt:700,congestionMinutes:999};
 g.journeyResult(c,v,'late','ไปกิจกรรมสาย');assert.equal(c.happy,74);assert.equal(c.late,false);assert.equal(g.workTax(c),500);g.journeyResult(c,v,'late','ซ้ำ');assert.equal(c.happy,74);
 g.journeyResult(c,{...v,id:701,resultDone:false,kind:'work',congestionMinutes:0},'late','ทำงานสาย');assert.equal(c.happy,69);assert(c.late);assert.equal(g.workTax(c),400);
 g.journeyResult(c,{...v,id:702,resultDone:false,kind:'work'},'missed','พลาดงาน');assert.equal(g.workTax(c),250);
});
test('home recovery cannot be farmed',()=>{const {game:g,home}=city(),c=citizen(g,home);for(let i=0;i<8;i++)g.journeyResult(c,{id:900+i,kind:'home'},'ontime','กลับบ้าน');assert.equal(c.happy,81);});
test('actual parking completion decides lateness and a closed service is missed',()=>{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);c.profile.trait=0;
 assert(g.createTrip(c,'work',home.id,restaurant.id,null,null,710));const v=g.state.vehicles.get(c.vehicleId);v.phase='parking_in';v.workEnd=1000;g.trackJourney(v,1);assert.equal(c.happy,80,'no incremental late penalties');
 g.state.time=730;g.arrive(v,true);assert.equal(c.lastJourneyResult.outcome,'late');assert.equal(c.happy,75);assert.equal(g.workTax(c),400);
 const b=restaurant;g.state.time=2000;const missed=g.arrivalOutcome({kind:'leisure',serviceKind:'restaurant',stay:60,activityEnd:1900,deadline:1900},c,b);assert.equal(missed,'missed');
});
test('fixed work appointment survives departure adaptation',()=>{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);c.profile.trait=0;c.workId=restaurant.id;restaurant.workers.add(c.id);
 const r=g.ensureRoutine(c);r.advance=0;let day=0,p=g.planForDay(c,day);while(!p.works&&day<10)p=g.planForDay(c,++day);assert(p.works);r.advance=30;const earlier=g.planForDay(c,day);
 assert.equal(earlier.desiredArrival,p.desiredArrival);assert.equal(earlier.leave,p.leave-30);
});
test('cancelled lifestyle releases reservations and schedules the next step',()=>{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);const plan={version:25,day:0,steps:[{kind:'restaurant',at:700,duration:30,expires:900},{kind:'home',at:740}]};c.lifePlans={0:plan};c.lifeRun={day:0,index:0,plan,retry:0};
 assert(g.createTrip(c,'leisure',home.id,restaurant.id,null,null,850,{life:{day:0,index:0},activityEnd:900,stay:30,serviceKind:'restaurant'}));const v=g.state.vehicles.get(c.vehicleId);
 assert(g.towVehicle(v.id,true));assert.equal(c.lastJourneyResult.outcome,'cancelled');assert.equal(c.lifeRun.index,1);assert.equal(restaurant.reservedService,0);assert(g.state.events.some(e=>e.citizenId===c.id&&e.action==='life'&&e.index===1));
});
test('unavailable step is settled once and advances',()=>{
 const {game:g,home}=city(),c=citizen(g,home);const step={kind:'restaurant',at:700,expires:900};c.lifeRun={day:0,index:0,retry:3,plan:{steps:[step,{kind:'home',at:740}]}};g.lifeRetry(c,step,'ไม่มีเส้นทาง');assert.equal(c.lastJourneyResult.outcome,'unavailable');assert.equal(c.lifeRun.index,1);assert.equal(c.happy,77);assert.equal(c.pending,null);
});
test('night shift result reconciles already collected tax',()=>{
 const {game:g,home}=city(),c=citizen(g,home);g.state.time=1500;c.taxSettledDays={0:500};const money=g.state.money;g.journeyResult(c,{id:77,kind:'work',life:{day:0,index:0}},'late','กะดึกสาย');assert.equal(g.state.money,money-100);assert.equal(g.workTax(c,0),400);assert.equal(g.workTax(c,1),500);
});
test('old save migrates without losing citizens or current save outcomes',()=>{
 const {game:g,home}=city(),c=citizen(g,home);delete c.journeyRuleVersion;c.late=true;const raw=g.snapshot();assert(g.loadGame(true,null,raw));const loaded=g.state.citizens.get(c.id);assert.equal(loaded.late,false);assert.equal(loaded.journeyRuleVersion,25);
 g.journeyResult(loaded,{id:88,kind:'work'},'late','สาย');const happy=loaded.happy;assert(g.loadGame(true,null,g.snapshot()));assert.equal(g.state.citizens.get(c.id).happy,happy);assert.equal(g.workTax(g.state.citizens.get(c.id)),400);
});
test('every available building relocates free, preserving identity and members',()=>{
 const {game:catalog}=boot();let moved=0;
 for(const key of Object.keys(catalog.CATALOG).filter(k=>!['home_small','home_medium'].includes(k))){
  const {game:g,get}=boot();g.state.money=1e8;const t=g.CATALOG[key],y=148-t.plotHeight,b=g.buildBuilding(key,160,y,true);assert(b,key);const c=citizen(g,b);const members=b.residents,workers=b.workers,guests=b.guests;const cash=-20000;g.state.money=cash;
  assert(g.beginMoveBuilding(b.id));assert(get('hint').textContent.includes('ฟรี'));assert(g.moveBuilding(b.id,210,y));assert.equal(b.x,160,'confirmation does not move');get('confirmDialog').onclick();assert.equal(b.x,210,key);assert.equal(g.state.money,cash);assert.equal(g.state.buildings.get(b.id),b);assert.equal(b.residents,members);assert.equal(b.workers,workers);assert.equal(b.guests,guests);assert(b.parked.has(c.id));assert.equal(g.state.buildGrid[g.id(160,y)],-1);assert.equal(g.state.buildGrid[g.id(210,y)],b.id);assert.equal(c.homeId,b.id);g.validateSave(JSON.parse(g.snapshot()));moved++;
 }
 assert(moved>=27);
});
test('invalid move and cancelled move preserve original plot and cash',()=>{
 const {game:g,get,home}=city(),money=g.state.money,x=home.x,y=home.y;g.beginMoveBuilding(home.id);assert.equal(g.moveBuilding(home.id,0,0,true),false);assert.equal(home.x,x);assert.equal(g.state.money,money);assert.equal(g.state.buildGrid[g.id(x,y)],home.id);
 assert(g.moveBuilding(home.id,160,148-g.CATALOG[home.key].plotHeight));get('cancelDialog').onclick();assert.equal(home.x,x);g.selectTool('hand');assert.equal(g.movingBuildingId,null);
});
test('occupied moving source keeps the trip, membership and parking reservations',()=>{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);assert(g.createTrip(c,'leisure',home.id,restaurant.id,null,null,900,{activityEnd:1000,serviceKind:'restaurant',stay:30}));const v=g.state.vehicles.get(c.vehicleId),cash=g.state.money;
 assert(g.moveBuilding(home.id,225,148-g.CATALOG[home.key].plotHeight,true));assert.equal(home.x,225);assert.equal(g.state.vehicles.get(v.id),v);assert.equal(c.vehicleId,v.id);assert.equal(v.phase,'departing');assert.equal(g.state.money,cash);assert.equal(restaurant.reservedService,1);
});
test('incoming car follows relocated destination without losing its reservation',()=>{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);assert(g.createTrip(c,'leisure',home.id,restaurant.id,null,null,900,{activityEnd:1000,serviceKind:'restaurant',stay:30}));const v=g.state.vehicles.get(c.vehicleId);v.phase='parking_in';
 assert(g.moveBuilding(restaurant.id,225,148-g.CATALOG[restaurant.key].plotHeight,true));assert.equal(c.vehicleId,v.id);assert.equal(v.toId,restaurant.id);assert.equal(v.phase,'gate_waiting');assert.equal(restaurant.reservedService,1);assert(!v.resultDone);assert.equal(c.happy,80);
});
test('building and road demolition are free even with negative funds',()=>{
 const {game:g,restaurant}=city();g.state.money=-20000;g.demolishBuilding(restaurant,true);assert.equal(g.state.money,-20000);assert(!g.state.buildings.has(restaurant.id));
 g.state.money=10000;const cells=g.lineCells(g.id(170,180),g.id(179,180));assert(g.buildRoad(cells,'small',true));g.state.money=-20000;g.demolishRoad(cells[0],true);assert.equal(g.state.money,-20000);assert(g.demolishRoadStroke(cells.slice(1),true));assert.equal(g.state.money,-20000);
});
console.log(JSON.stringify({passed:true,checks}));
