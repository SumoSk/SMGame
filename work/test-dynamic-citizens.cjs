const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},node=()=>({textContent:'',innerHTML:'',value:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true},close(){this.open=false},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
const storage={};const context={document:{getElementById:get,querySelector:node,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
function setup(){
 game.reset();game.state.money=1e9;
 const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
 const office=game.buildBuilding('office_large',180,148-game.CATALOG.office_large.plotHeight,true);
 assert(home&&office);return {home,office};
}
function resident(home){
 const c=game.newCitizen(home);c.resident=true;c.location='home';c.locationId=home.id;
 home.residents.add(c.id);home.parked.add(c.id);
 game.parkingSpace(home,c.id,true);return c;
}
const {home,office}=setup();
const citizens=Array.from({length:30},()=>resident(home));
const traits=[0,1,2,3].map(t=>citizens.filter(c=>c.profile.trait===t).length);
assert(traits.every(n=>n>=5),'each of the four personality classes must appear: '+traits);
for(const c of citizens)game.scheduleDay(c,0);
const plans=citizens.map(c=>c.dailyPlan),morning=plans.filter(p=>p.works).map(p=>p.leave);
assert(new Set(morning).size>=morning.length-3,'morning departure times should not be batched');
assert(new Set(plans.map(p=>p.end)).size>12,'work finish times must vary');
assert(plans.some(p=>p.kind==null),'some residents should spend leisure hours at home');
assert(plans.some(p=>p.kind),'some residents should go out');
let variations=0;
for(const c of citizens){
 const first=game.planForDay(c,0),next=game.planForDay(c,1),again=game.planForDay(c,0);
 assert.equal(JSON.stringify(first),JSON.stringify(again),'stable day plan across reload');
 if(first.leave!==next.leave||first.end!==next.end)variations++;
 assert(Math.abs(first.leave-c.profile.leave-c.routine.weekdayShift+c.routine.advance)<=21.5,'daily jitter bounded around personal routine');
}
assert(variations>=26,'daily habits should vary across days');
let last=-Infinity,count=0;
while(game.state.events.length){const e=game.eventPop();assert(e.at>=last,'event queue must remain time-ordered');last=e.at;count++;}
assert(count>30,'citizen events should have been scheduled');
for(const c of citizens)game.scheduleDay(c,1);
let eventSnapshot=game.snapshot();
assert(game.loadGame(true,null,eventSnapshot),'new schedule snapshot must reload');
let popped=0;last=-Infinity;
while(game.state.events.length){const e=game.eventPop();assert(e.at>=last,'reloaded event heap is invalid');last=e.at;popped++;}
assert(popped>20);
const sample=game.state.citizens.get(citizens[0].id);
assert.equal(JSON.stringify(sample.dailyPlan),JSON.stringify(game.planForDay(sample,1)));
const before=sample.routine.advance;
sample.workId=office.id;office.workers.add(sample.id);sample.locationId=home.id;sample.location='home';
game.state.time=1*1440+sample.dailyPlan.leave;
game.runAction(sample,'work',{day:1});
const trip=game.state.vehicles.get(sample.vehicleId);assert(trip&&trip.kind==='work','morning work trip missing');
trip.late=true;game.arrive(trip,true);
// Instant test arrival skips road departure; release the artificial old parked occupancy.
home.parked.delete(sample.id);
const oldSlot=home.parkingSlots.indexOf(sample.id);if(oldSlot>=0)home.parkingSlots[oldSlot]=null;
assert(sample.routine.advance>before,'late work arrivals must shift future departures earlier');
assert(game.planForDay(sample,2).leave<game.planForDay({...sample,routine:{...sample.routine,advance:before}},2).leave,'later mornings must adapt');
// After work: one citizen goes directly home, another chooses a service.
sample.dailyPlan={...sample.dailyPlan,day:1,kind:null,end:1040,postDelay:7};
game.state.time=1440+1100;
game.runAction(sample,'afterWork',{day:1});
assert(game.state.vehicles.get(sample.vehicleId)?.kind==='home'||sample.pending?.action==='home','some citizens must choose home after work even if no valid road route exists');
// A full destination leads to an alternate type or a delayed retry, not
// endless frame-by-frame decisions.
const second=game.state.citizens.get(citizens[1].id);
second.workId=office.id;office.workers.add(second.id);second.locationId=office.id;second.location='office';
second.dailyPlan={...second.dailyPlan,day:1,kind:'restaurant',end:1030,postDelay:20};
game.runAction(second,'leisure',{kind:'restaurant',end:game.state.time+120});
assert(second.pending?.action==='leisure'||second.vehicleId,'unavailable service must defer or choose another destination');
const unchangedEvents=game.state.events.length;
game.advanceVehicles(0,0);
assert.equal(game.state.events.length,unchangedEvents,'citizens should not replan every frame');
// Stress: 5,000 residents generate O(log n) events, not per-citizen re-sorts.
setup();
const bigHome={id:999,key:'home_large'},big=[];
for(let i=0;i<5000;i++){const c=game.newCitizen(bigHome);c.resident=true;big.push(c);game.scheduleDay(c,0);}
last=-Infinity;let total=0;
while(game.state.events.length){const e=game.eventPop();assert(e.at>=last,'large queue out of order');last=e.at;total++;}
assert(total>6000,'insufficient events for 5,000 citizen stress');
console.log(JSON.stringify({passed:true,archetypes:traits,personalDepartures:new Set(morning).size,plannedWorkDays:morning.length,variationCount:variations,scheduleEvents:count,reloadedEvents:popped,largePopulation:5000,largeEvents:total,adaptiveAdvance:sample.routine.advance-before}));
