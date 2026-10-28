const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');let game;
const noop=()=>{},element=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const context={document:{getElementById:get,querySelector:element,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8').replace('parkingFree,parkingSpace,','newCitizen,parkingFree,parkingSpace,'),context);
function step(n){for(let i=0;i<n;i++){game.state.time+=.04;game.advanceVehicles(.05,.04);}}
function build(key,x){const t=game.CATALOG[key];require('./test-building-fixtures.cjs')(game);game.state.money=1e8;const y=148-t.plotHeight;const check=game.checkBuilding(key,x,y);assert(!check.error,JSON.stringify({key,x,y,check}));const b=game.buildBuilding(key,x,y,true);assert(b);return b;}

game.reset();const home=build('home_large',160),office=build('office_large',180);
let maximum=0,overlapChecks=0;
function flowSteps(n){for(let i=0;i<n;i++){
 step(1);const moving=[...game.state.vehicles.values()].filter(v=>v.lotPath);
 maximum=Math.max(maximum,moving.filter(v=>v.lotBuilding===home.id).length);
 for(let a=0;a<moving.length;a++)for(let b=0;b<a;b++)if(moving[a].lotBuilding===moving[b].lotBuilding){overlapChecks++;assert(!game.lotCarsOverlap(game.parkingPose(moving[a]),game.parkingPose(moving[b]),0),'moving cars overlap');}
}}
const residents=[];for(let i=0;i<10;i++){const c=game.newCitizen(home);residents.push(c);assert(game.createTrip(c,'moveIn',null,home.id,game.id(155,150),null,null));}
flowSteps(5000);assert.equal(home.parked.size,10);assert(maximum>=2,'cars must enter before predecessor finishes parking');
for(const c of residents)assert(game.createTrip(c,'work',home.id,office.id,null,null,null));
for(let i=0;i<20;i++){const c=game.newCitizen(home);assert(game.createTrip(c,'moveIn',null,home.id,game.id(155,150),null,null));}
flowSteps(12000);
assert.equal(office.parked.size,10,'all departures finish through shared aisles');
assert.equal(home.parked.size,20,'inbound cars complete while others leave');
assert.equal(game.state.vehicles.size,0,'no internal deadlock');
assert.equal(new Set(home.parkingSlots.filter(x=>x!==null)).size,20);
console.log(JSON.stringify({passed:true,maximumConcurrentCarsInHome:maximum,overlapChecks,mixedArrivals:20,departures:10}));
