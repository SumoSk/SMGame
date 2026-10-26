
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},node=()=>({textContent:'',innerHTML:'',value:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){},close(){},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
const context={document:{getElementById:get,querySelector:node,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
game.reset();game.state.money=1e9;
const build=(kind,x)=>game.buildBuilding(kind,x,148-game.CATALOG[kind].plotHeight,true);
const home=build('home_large',160),factory=build('factory_small',182),restaurant=build('restaurant_small',206),pub=build('pub_small',224),shop=build('shop_small',242);
assert(home&&factory&&restaurant&&pub&&shop);
for(const [a,b] of [[[270,150],[270,180]],[[270,180],[150,180]]])assert(game.buildRoad(game.lineCells(game.id(...a),game.id(...b)),'small',true));
function resident(){const c=game.newCitizen(home);c.resident=true;c.location='home';c.locationId=home.id;home.residents.add(c.id);home.parked.add(c.id);game.parkingSpace(home,c.id,true);return c;}
assert.equal(game.LIFESTYLES.reduce((n,s)=>n+s.weight,0),100);
assert(game.serviceWindow('pub',1500));assert(!game.serviceWindow('pub',180));assert(!game.serviceWindow('mall',300));
const sample=resident();sample.workId=factory.id;factory.workers.add(sample.id);
const styles=new Set();
for(let i=1;i<=240;i++){
 const c={...sample,id:1000+i,routine:undefined,profile:{...sample.profile,trait:i%4}};
 for(let day=0;day<7;day++){const p=game.planForDay(c,day);styles.add(p.lifestyle);
  assert.equal(JSON.stringify(p),JSON.stringify(game.planForDay(c,day)));
  for(const s of p.steps)if(game.SERVICE_STAY[s.kind]){const range=game.SERVICE_STAY[s.kind];assert(s.duration>=range[0]&&s.duration<=range[1]);}
 }
}
assert.equal(styles.size,12,'all twelve lifestyles remain possible with eligible jobs');
sample.workId=null;assert(!game.planForDay(sample,0).works,'jobless residents must retain leisure opportunities');
function start(plan){
 game.state.events=[];sample.pending=null;sample.lifeRun=null;sample.vehicleId=null;sample.dailyPlan=plan;sample.lifePlans={[plan.day]:plan};sample.locationId=home.id;sample.location='home';
 game.state.time=plan.day*1440+plan.steps[0].at;game.runAction(sample,'lifeStart',{day:plan.day});
}
function finishTrip(){
 const v=game.state.vehicles.get(sample.vehicleId);assert(v,'expected real routed trip');
 const origin=game.state.buildings.get(v.fromId);
 // Simulate departure bookkeeping, then actual elapsed travel before arrival.
 origin?.parked.delete(sample.id);origin?.visitors.delete(sample.id);
 if(origin){const slot=origin.parkingSlots.indexOf(sample.id);if(slot>=0)origin.parkingSlots[slot]=null;}
 game.state.time+=15;game.arrive(v,true);return v;
}
function event(){let e=game.eventPop();assert(e);while(e.action==='lifeStart'&&sample.lifeRun&&e.day!==sample.lifeRun.day){e=game.eventPop();assert(e);}game.state.time=Math.max(game.state.time,e.at);game.runAction(game.state.citizens.get(e.citizenId),e.action,e);return e;}
const route={version:2,day:0,works:false,steps:[{kind:'restaurant',at:1300,duration:30,expires:1740},{kind:'pub',at:1400,duration:100,expires:1740},{kind:'home',at:1400,rest:30},{kind:'shop',at:1940,duration:20,expires:2300},{kind:'home',at:1940}]};
start(route);let v=finishTrip();assert.equal(v.toId,restaurant.id);assert.equal(sample.activityUntil,game.state.time+30,'stay starts at arrival');
event();event();v=finishTrip();assert.equal(v.toId,pub.id);assert(sample.activityUntil>1440,'pub visit crosses midnight');
const snapshot=game.snapshot();assert(game.loadGame(true,null,snapshot),'active itinerary reloads');
// refresh references after load
const restored=game.state.citizens.get(sample.id);assert.equal(restored.lifeRun.index,1);
Object.assign(sample,restored);game.state.citizens.set(sample.id,sample);
event();event();v=finishTrip();assert.equal(v.toId,home.id);assert(sample.lifeRun);
event();event();v=finishTrip();assert.equal(v.toId,shop.id,'can leave home a second time');
event();event();v=finishTrip();assert.equal(v.toId,home.id);event();assert(!sample.lifeRun);
assert.equal(game.state.vehicles.size,0,'all routed trips cleaned up');
// A service reservation that arrives after closing is never admitted.
start({version:2,day:2,steps:[{kind:'restaurant',at:1380,duration:30,expires:1740},{kind:'home',at:1380}]});
v=game.state.vehicles.get(sample.vehicleId);assert(v);
game.state.time=2*1440+1561;finishTrip();
assert(!game.state.buildings.get(v.toId).visitors.has(sample.id),'closed venue cannot admit late arrivals');
assert(game.state.events.length>0,'late arrival continues itinerary');
// No work event is discarded after midnight.
sample.workId=factory.id;
start({version:2,day:3,works:true,steps:[{kind:'work',at:1200,until:1560,deadline:1300,workId:factory.id},{kind:'home',at:1560}]});
v=finishTrip();assert.equal(v.kind,'work');assert.equal(sample.activityUntil,3*1440+1560);
game.scheduleDay(sample,4);event();event();assert.equal(game.state.vehicles.get(sample.vehicleId).kind,'home');
assert.equal([...game.state.vehicles.values()].filter(v=>v.citizenId===sample.id).length,1);
console.log(JSON.stringify({passed:true,lifestyles:styles.size,crossMidnight:true,multiStop:true,secondOuting:true,arrivalDuration:true,closedArrival:true,nightShift:true,activeReload:true}));
