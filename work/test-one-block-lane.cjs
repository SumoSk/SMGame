const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elem=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)};
const store={},context={document:{getElementById:get,querySelector:elem,querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
for(const direction of [0,1,2,3]){
 game.reset();const st=game.state;st.roads.clear();st.vehicles.clear();st.occ.clear();st.reservations.clear();st.junctionCache.clear();st.junctionLayoutCache?.clear();st.version++;
 const DIR=[[1,0],[0,1],[-1,0],[0,-1]][direction],nodes=Array.from({length:24},(_,i)=>game.id(150+DIR[0]*i,150+DIR[1]*i));
 nodes.forEach(node=>st.roads.set(node,{type:'medium',main:false,links:new Set(),load:0,wait:0}));
 for(let i=1;i<nodes.length;i++){st.roads.get(nodes[i]).links.add(nodes[i-1]);st.roads.get(nodes[i-1]).links.add(nodes[i]);}
 const make=(id,pos,lane,phase='driving')=>{
  const car={id,kind:'pass',path:[...nodes],pathSet:new Set(nodes),pos,progress:0,speed:0,lane,laneSeed:lane,motionSeedLane:lane,phase,wait:0,stopReason:'',noUTurnPolicy:1,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{},routeCheckedVersion:st.version,version:st.version,lastMovedAt:st.time,nextRouteRetry:st.time+999};
  st.vehicles.set(id,car);car.occKey=nodes[pos]+':'+direction+':'+lane;st.occ.set(car.occKey,id);return car;
 };
 const car=make(310,5,1);car.wait=3;
 const leader=make(311,7,1,'stuck');leader.heldPose=game.vehiclePosition(leader);leader.stopReason='blocked';leader.routeMissing=true;leader.nextRouteRetry=st.time+999;
 const initial=game.vehiclePosition(car);
 game.advanceVehicles(0,0);
 assert.equal(game.plannedLane(car,car.pos),0,'adaptive lane shift should commit');
 const after=game.vehiclePosition(car);
 assert(Math.hypot(initial.x-after.x,initial.y-after.y)<1e-8,'lane shift may not teleport');
 const plan=game.motionPlan(car),perpendicular=p=>(p.p3.x-p.p0.x)*DIR[1]-(p.p3.y-p.p0.y)*DIR[0];
 const shifts=plan.pieces.filter(p=>!p.turn&&Math.abs(perpendicular(p))>.1);
 assert(shifts.length===1,'one single continuous lateral manoeuvre');
 const piece=shifts[0],forward=(piece.p3.x-piece.p0.x)*DIR[0]+(piece.p3.y-piece.p0.y)*DIR[1];
 assert(forward>0&&forward<=1.0000001,'lane shift must finish within one block along the road: '+forward);
 const finish=game.positionOnMotion(plan,piece.endDistance);
 assert(Math.hypot(finish.x-piece.p3.x,finish.y-piece.p3.y)<1e-6,'lane shift must settle in target lane');
 assert(Number.isFinite(finish.angle),'final heading is finite');
}
console.log('PASS: a real adaptive lane shift finishes within one block in all four directions, no teleport');
