const fs=require('node:fs'),assert=require('node:assert/strict');const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];const {boot,city}=new Function('require',fixture+'return {boot,city};')(require);
function citizen(g,home){const c=g.newCitizen(home);Object.assign(c,{resident:true,happy:80,locationId:home.id});c.profile.trait=0;home.residents.add(c.id);home.parked.add(c.id);return c;}
for(const viewport of [{width:390,height:500},{width:844,height:290},{width:1440,height:700}])for(const x of[0,viewport.width/2,viewport.width])for(const y of[0,viewport.height/2,viewport.height]){
 const {game:g}=boot(),p=g.constructionDialogPlacement({x,y},{width:300,height:190},viewport);assert(p.left>=10&&p.top>=10);assert(p.left+p.width<=viewport.width-10);assert(p.top+p.height<=viewport.height-10);
}
{
 const {game:g,get}=boot();get('dialog').getBoundingClientRect=()=>({width:280,height:180});get('buildDock').getBoundingClientRect=()=>({top:560});
 g.buildRoad(g.lineCells(g.id(150,120),g.id(135,120)),'small');const d=get('dialog');assert(d.open);assert.equal(d.style.bottom,'auto');assert(parseFloat(d.style.top)>=10&&parseFloat(d.style.top)+180<560);assert.equal(typeof get('confirmDialog').onclick,'function');g.closeModal();assert.equal(d.style.left,'');
}
{
 const {game:g,get,home}=city(),cash=g.state.money,x=home.x,y=home.y;assert(g.beginMoveBuilding(home.id));assert.equal(get('cancelMoveBuilding').hidden,false);get('cancelMoveBuilding').onclick();assert.equal(get('cancelMoveBuilding').hidden,true);assert.equal(g.movingBuildingId,null);assert.equal(home.x,x);assert.equal(home.y,y);assert.equal(g.state.money,cash);
 g.beginMoveBuilding(home.id);assert(g.moveBuilding(home.id,160,y));assert.equal(get('cancelDialog').textContent,'ยกเลิกย้าย');get('cancelDialog').onclick();assert.equal(g.movingBuildingId,null);assert.equal(home.x,x);assert(!get('dialog').open);
}
{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);c.workId=restaurant.id;restaurant.workers.add(c.id);g.state.time=720;assert(g.createTrip(c,'work',home.id,restaurant.id,null,null,730));const v=g.state.vehicles.get(c.vehicleId);v.workEnd=1000;
 home.parked.delete(c.id);const old=home.parkingSlots.indexOf(c.id);if(old>=0)home.parkingSlots[old]=null;
 assert(g.beginParkingArrival(v));const gate=Math.hypot(v.lotPath[1].x-v.lotPath[0].x,v.lotPath[1].y-v.lotPath[0].y);const count=restaurant.arrivals;
 v.lotDistance=gate+.29;g.advanceVehicles(0,0);assert.equal(v.arrivedAt,undefined);assert.equal(restaurant.arrivals,count);
 v.lotDistance=gate+.31;g.advanceVehicles(0,0);assert.equal(v.arrivedAt,720);assert.equal(v.arrivalResult,'ontime');assert.equal(c.happy,84);assert.equal(restaurant.arrivals,count+1);assert(g.state.vehicles.has(v.id),'car continues physically parking');assert.equal(g.buildingTraffic(restaurant).approaching,0);assert.equal(g.buildingTraffic(restaurant).arrived,1);
 g.state.time=800;g.trackJourney(v,80);assert(!v.late);g.arrive(v,true);assert.equal(c.happy,84);assert.equal(g.workTax(c),500);assert.equal(restaurant.arrivals,count+1,'no second arrival at the parking bay');
}
{
 const {game:g,home,restaurant}=city(),c=citizen(g,home);g.state.time=720;const plan={version:251,token:'entry',day:0,steps:[{kind:'restaurant',at:700,duration:30,expires:800},{kind:'home',at:800}]};c.lifePlans={0:plan};c.lifeRun={day:0,index:0,token:plan.token,plan};
 assert(g.createTrip(c,'leisure',home.id,restaurant.id,null,null,730,{life:{day:0,index:0,token:plan.token},activityEnd:800,stay:30,serviceKind:'restaurant'}));const v=g.state.vehicles.get(c.vehicleId);g.recordEntranceArrival(v);g.state.time=820;g.arrive(v,true);assert.equal(c.lastJourneyResult.outcome,'ontime');assert(restaurant.visitors.has(c.id),'parking delay cannot invalidate successful entry');assert(c.activityUntil>=g.state.time);
}
{
 const {game:g}=boot();g.state.money=1e8;const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true),c=g.newCitizen(home);assert(g.createTrip(c,'moveIn',null,home.id,g.state.gates[0],null,1000));const v=g.state.vehicles.get(c.vehicleId);assert.equal(home.reservedResidents,1);g.recordEntranceArrival(v);assert(c.resident);assert(home.residents.has(c.id));assert.equal(home.reservedResidents,0);g.arrive(v,true);assert.equal(home.arrivals,1);assert.equal(home.residents.size,1);
}
console.log(JSON.stringify({passed:true,dialogPositions:27,nearConstruction:true,visibleMoveCancel:true,entranceArrival:true,noParkingLateness:true,noDuplicateArrival:true}));
