'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),fs=require('node:fs');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
// Exact pre-interpolation scheduler. It is injected into the same lexical
// scope as the candidate, so these controls need no external baseline file.
const schedulerOracle=`function(dt){
 if(!(state.speed>0)){resetSimulationRuntime();return;}
 if(!simulationClock||simulationClock.owner!==state||Math.abs(simulationClock.time-state.time)>1e-7){
  simulationClock={owner:state,time:state.time,minutes:0};eventDispatchBudget=null;
 }
 const clock=simulationClock,rate=GAME_MINUTES_PER_SECOND*state.speed*NORMAL_SPEED_SCALE;
 const accepted=Math.min(Math.max(0,Number.isFinite(dt)?dt:0)*rate,SIMULATION_GAME_STEP*SIMULATION_MAX_STEPS);
 clock.minutes+=accepted;
 const steps=Math.min(SIMULATION_MAX_STEPS,Math.floor((clock.minutes+1e-9)/SIMULATION_GAME_STEP));
 const started=performance.now();let completed=0;
 for(;completed<steps;){
  tick(SIMULATION_GAME_STEP/rate);completed++;
  if(performance.now()-started>=SIMULATION_CPU_BUDGET_MS)break;
 }
 clock.minutes=Math.max(0,clock.minutes-completed*SIMULATION_GAME_STEP);
 if(clock.minutes>=SIMULATION_GAME_STEP)clock.minutes%=SIMULATION_GAME_STEP;
 if(clock.minutes<1e-9||SIMULATION_GAME_STEP-clock.minutes<1e-9)clock.minutes=0;
 clock.time=state.time;
}`;
const extra='frame,simulateFrame,resetSimulationRuntime,occupy,motionPlans,lotPathPose,parkingPathGeometry,captureVehicleVisualStep,finishVehicleVisualStep,vehicleVisualSample,visualVehiclePosition,smallFleetVisualMotion,get auditHistory(){return vehicleRenderHistory;},get auditClock(){return simulationClock;},set auditClock(x){simulationClock=x;},set auditSimulation(fn){simulateFrame=fn;},set auditDraw(fn){draw=fn;},set auditTick(fn){tick=fn;},get auditTick(){return tick;},set auditHeat(x){heat=x;},schedulerOracle:'+schedulerOracle;
const result={passed:true,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(process.env.SMCITY_SOURCE)).digest('hex'),semanticFrames:0,semanticTrafficCars:3,semanticHashes:[],smooth:[],curves:[],lifecycle:[],gates:[],cold:[],caps:[],identity:[]};
const plain=x=>JSON.parse(JSON.stringify(x));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function samePose(a,b,label){assert.deepEqual(plain(a),plain(b),label);}
function close(a,b,label){assert(Math.abs(a-b)<1e-9,label+': '+a+' vs '+b);}
function fresh(reference=false){
 const s=boot(extra),g=s.game;g.auditDraw=()=>{};g.reset('london');
 for(const key of ['roads','vehicles','buildings','citizens','occ','reservations','signals'])g.state[key].clear();
 g.state.gates=[];g.state.events=[];g.state.speed=0;g.frame(1000);s.wall=1000;
 g.state.lastImmigration=1e9;g.state.lastPass=1e9;g.state.nextActivityCheck=1e9;g.state.nextTouristAt=1e9;g.state.morningPlanningDay=0;
 if(reference)g.auditSimulation=g.schedulerOracle;
 return s;
}
function road(g,points,type='small'){
 const route=[];
 for(let k=0;k<points.length-1;k++){
  const [x,y]=points[k],[xx,yy]=points[k+1],dx=Math.sign(xx-x),dy=Math.sign(yy-y),count=Math.abs(xx-x)+Math.abs(yy-y);
  assert(!(dx&&dy));for(let i=0;i<count;i++)route.push(g.id(x+dx*i,y+dy*i));
 }
 route.push(g.id(...points.at(-1)));
 for(const n of route)if(!g.state.roads.has(n))g.state.roads.set(n,{type,main:false,links:new Set(),load:0,wait:0});
 for(let i=1;i<route.length;i++){g.state.roads.get(route[i-1]).links.add(route[i]);g.state.roads.get(route[i]).links.add(route[i-1]);}
 return route;
}
function car(g,p,id=900,pos=10){
 const v={id,path:p,pathSet:new Set(p),pos,progress:0,lane:0,laneSeed:0,speed:2.7,phase:'driving',kind:'pass',citizenId:null,wait:0,retryAt:0,lastMovedAt:g.state.time,noUTurnPolicy:1,routeCheckedVersion:g.state.version,trafficModel:2,turnLanes:{},junctionPasses:[],junctionQueueSince:{}};
 g.state.vehicles.set(id,v);assert(g.occupy(v,pos));return v;
}
function straight(reference=false){const s=fresh(reference);s.v=car(s.game,road(s.game,[[20,100],[280,100]]));return s;}
function step(s,seconds){s.wall+=seconds*1000;s.game.frame(s.wall);}
function setDistance(v,p,d){let i=0;while(i+1<p.nodes.length&&p.nodes[i+1]<=d)i++;v.pos=i;v.progress=(d-p.nodes[i])/Math.max(1e-10,(p.nodes[i+1]??p.nodes[i])-p.nodes[i]);}
function controlledPair(s,v,move){const g=s.game;g.state.speed=1;const before=g.captureVehicleVisualStep();assert(before);move();g.state.time+=.08;g.auditClock={owner:g.state,time:g.state.time,minutes:.04};g.finishVehicleVisualStep(before);assert(g.auditHistory?.pairs.has(v));return g.auditHistory.pairs.get(v);}
// Simulation, safety claims, event accounting, missions and serialized saves
// remain exactly equal to the old scheduler while rendering uses new poses.
for(const speed of [1,2])for(const fps of [60,120]){
 const a=straight(),b=straight(true);
 for(const s of [a,b]){car(s.game,s.v.path,901,11);car(s.game,s.v.path,902,12);for(const v of s.game.state.vehicles.values())s.game.vehiclePosition(v);s.game.state.speed=speed;}
 a.game.auditDraw=()=>{for(const v of a.game.state.vehicles.values())a.game.visualVehiclePosition(v);};
 b.game.auditDraw=()=>{for(const v of b.game.state.vehicles.values())b.game.vehiclePosition(v);};
 for(let i=0;i<fps*2;i++){
  step(a,1/fps);step(b,1/fps);
  assert.equal(a.game.snapshot(),b.game.snapshot(),`exact simulation save speed=${speed} fps=${fps} frame=${i}`);
  close(a.game.auditClock.minutes,b.game.auditClock.minutes,'same fractional quantum');result.semanticFrames++;
 }
 result.semanticHashes.push({speed,fps,sha256:hash(a.game.snapshot())});
}
// Prime one safe step; subsequent render samples move every RAF, even though
// the underlying vehicle still advances only 20 times/second at 1x.
for(const fps of [60,120]){
 const s=straight(),g=s.game;g.vehiclePosition(s.v);g.state.speed=1;step(s,.05);
 let lastRaw=g.vehiclePosition(s.v).x,lastVisual=g.visualVehiclePosition(s.v).x,rawMoves=0,visualMoves=0;
 for(let i=0;i<fps;i++){
  step(s,1/fps);const raw=g.vehiclePosition(s.v),visual=g.visualVehiclePosition(s.v);
  if(Math.abs(raw.x-lastRaw)>1e-10)rawMoves++;if(Math.abs(visual.x-lastVisual)>1e-10)visualMoves++;
  assert(visual.x>=lastVisual-1e-9,'no reverse interpolation');assert(visual.x<=raw.x+1e-9,'no extrapolation ahead of safe state');
  lastRaw=raw.x;lastVisual=visual.x;
 }
 assert.equal(rawMoves,20);assert.equal(visualMoves,fps);result.smooth.push({fps,rawMoves,visualMoves});
}
// No early lane choice, parking allocation or actual state mutation is allowed
// while collecting cold render history, including unsupported phases.
{
 const s=straight(),g=s.game,v=s.v;g.motionPlans.delete(v);delete v.trafficModel;delete v.turnLanes;const saved=g.snapshot();
 assert.equal(g.motionPlans.get(v),undefined);assert.equal(g.vehicleVisualSample(v),null);g.captureVehicleVisualStep();
 assert.equal(g.motionPlans.get(v),undefined);assert.equal(g.snapshot(),saved);
 v.phase='departing';v.fromId=77;g.state.buildings.set(77,{id:77,key:'home_starter',parked:new Set()});
 const old=JSON.stringify(v),building=g.state.buildings.get(77);assert.equal(g.vehicleVisualSample(v),null);g.captureVehicleVisualStep();
 assert.equal(JSON.stringify(v),old);assert.equal(building.parkingSlots,undefined);result.cold.push('cold road plans and departing parking slots remain unallocated');
}
// Interpolation must follow actual curved road/parking geometry, rather than
// drawing the straight chord between its endpoints.
{
 const s=fresh(),g=s.game,v=car(g,road(g,[[40,110],[100,110],[100,170]],'large'),900,40),p=g.motionPlan(v),piece=p.pieces.find(q=>q.arc&&!q.line&&q.length>.3);
 assert(piece,'fixture has a curved road piece');const d0=piece.startDistance+piece.length*.15,d1=piece.startDistance+piece.length*.85;setDistance(v,p,d0);
 const pair=controlledPair(s,v,()=>setDistance(v,p,d1)),actual=plain(g.vehiclePosition(v)),visual=g.visualVehiclePosition(v),expected=g.positionOnMotion(p,(d0+d1)/2);
 samePose(visual,expected,'road curve follows route at interpolated distance');samePose(g.vehiclePosition(v),actual,'road rendering cannot change actual pose');
 assert(Math.hypot(visual.x-(pair.a.pose.x+pair.b.pose.x)/2,visual.y-(pair.a.pose.y+pair.b.pose.y)/2)>1e-4,'curve differs from straight chord');result.curves.push('road');
}
{
 const s=fresh(),g=s.game,v={id:900,phase:'parking_out',path:[],lotPath:[{x:10,y:10},{x:14,y:10},{x:14,y:14}],lotDistance:3.85,vehicleTech:'normal'};g.state.vehicles.set(v.id,v);
 const pair=controlledPair(s,v,()=>v.lotDistance=4.1),visual=g.visualVehiclePosition(v),expected=g.lotPathPose(v.lotPath,(3.85+4.1)/2);
 samePose(visual,expected,'parking curve follows geometry');assert(Math.hypot(visual.x-(pair.a.pose.x+pair.b.pose.x)/2,visual.y-(pair.a.pose.y+pair.b.pose.y)/2)>1e-4);result.curves.push('parking');
 const before=g.vehiclePosition(v);v.lotPath[2].x+=1;samePose(g.visualVehiclePosition(v),g.vehiclePosition(v),'in-place parking geometry edit invalidates history');assert(before);
}
{
 const s=fresh(),g=s.game,v={id:900,vehicleTech:'fly',phase:'air_lift',airFrom:{x:10,y:10,angle:Math.PI-.1},airTo:{x:20,y:20,angle:0},airProgress:.25,path:[]};g.state.vehicles.set(v.id,v);
 controlledPair(s,v,()=>{v.airProgress=.75;v.airFrom.angle=-Math.PI+.1;});const visual=g.visualVehiclePosition(v);close(visual.altitude,4,'air altitude');close(Math.abs(visual.angle),Math.PI,'shortest wrapped angle');result.curves.push('air altitude and wrapped heading');
}
function primed(){const s=straight(),g=s.game;g.vehiclePosition(s.v);g.state.speed=1;step(s,.075);assert(g.auditHistory?.pairs.has(s.v));assert(g.visualVehiclePosition(s.v).x<g.vehiclePosition(s.v).x);return s;}
for(const [name,change]of [
 ['speed',s=>s.game.state.speed=2],['pause',s=>s.game.state.speed=0],['time jump',s=>s.game.state.time+=10],['road version',s=>s.game.state.version++],
 ['path replacement',s=>s.v.path=[...s.v.path]],['phase',s=>{s.v.phase='stuck';s.v.heldPose=s.game.vehiclePosition(s.v);}],['technology',s=>s.v.vehicleTech='speed'],
 ['external position mutation',s=>s.v.progress+=.1]
]){const s=primed();change(s);samePose(s.game.visualVehiclePosition(s.v),s.game.vehiclePosition(s.v),name+' falls back to actual');result.lifecycle.push(name);}
for(const name of ['pause frame','modal','auth lock','reset','load']){
 const s=primed(),g=s.game;
 if(name==='pause frame')g.state.speed=0;
 else if(name==='modal')s.get('dialog').open=true;
 else if(name==='auth lock')s.context.window.SMGameAuthLocked=true;
 else if(name==='reset')g.reset('london');
 else assert(g.loadGame(true,null,g.snapshot()));
 if(['pause frame','modal','auth lock'].includes(name))step(s,.016);
 assert.equal(g.auditHistory,null,name+' clears history');result.lifecycle.push(name);
}
{
 const s=primed(),g=s.game,v=s.v;const pre=g.captureVehicleVisualStep();g.state.vehicles.delete(v.id);g.state.time+=.08;g.finishVehicleVisualStep(pre);assert(!g.auditHistory?.pairs.has(v),'deleted vehicles excluded');
 const replacement={...v,path:[...v.path]};g.state.vehicles.set(v.id,replacement);samePose(g.visualVehiclePosition(replacement),g.vehiclePosition(replacement),'reused ID has no old object history');result.identity.push('despawn and reused ID');
 const newborn=car(g,v.path,999,5);samePose(g.visualVehiclePosition(newborn),g.vehiclePosition(newborn),'newborn uses actual until history exists');result.identity.push('spawn');
}
// Both parked and active fleet size count toward the existing large-city path.
{
 const s=primed(),g=s.game;for(let i=0;i<98;i++)g.state.vehicles.set(1000+i,{id:1000+i,phase:'gate_waiting'});
 assert(g.smallFleetVisualMotion());assert(g.captureVehicleVisualStep());g.state.vehicles.set(2000,{id:2000,phase:'gate_waiting'});
 assert(!g.smallFleetVisualMotion());assert.equal(g.captureVehicleVisualStep(),null);g.simulateFrame(0);assert.equal(g.auditHistory,null);
 g.state.vehicles.delete(2000);g.simulateFrame(0);assert(g.smallFleetVisualMotion());assert.equal(g.auditHistory,null,'return below 100 cannot resurrect old history');result.gates.push('99 to 100 to 99');
 const t=primed(),h=t.game;h.state.buildings.set(77,{parked:new Set(Array.from({length:99},(_,i)=>i))});assert(!h.smallFleetVisualMotion());assert.equal(h.captureVehicleVisualStep(),null);h.simulateFrame(0);assert.equal(h.auditHistory,null);result.gates.push('parked fleet counted');
 for(const speed of [0,5,20]){h.state.buildings.clear();h.state.speed=speed;assert(!h.smallFleetVisualMotion());assert.equal(h.captureVehicleVisualStep(),null);}result.gates.push('pause and accelerated speeds');
 h.state.speed=1;h.auditHeat=true;assert(!h.smallFleetVisualMotion());assert.equal(h.captureVehicleVisualStep(),null);result.gates.push('heat view');
}
// At 2x an 80 ms frame executes three complete safe quanta. The display pair
// must be the last completed one, even when the CPU guard stops a longer frame.
for(const cpuMs of [0,6]){
 const s=straight(),g=s.game;g.vehiclePosition(s.v);g.state.speed=2;let cpuNow=0,ticks=0;const tick=g.auditTick;
 s.context.performance.now=()=>cpuNow;g.auditTick=dt=>{tick(dt);ticks++;cpuNow+=cpuMs;};step(s,.08);
 assert.equal(ticks,cpuMs?2:3);const pair=g.auditHistory.pairs.get(s.v);close(pair.b.distance,g.motionDistance(s.v),'last completed pose');assert(pair.a.distance<pair.b.distance);close(g.auditHistory.time,g.state.time,'last completed clock');assert(g.auditClock.minutes<.08);result.caps.push({cpuMs,ticks,lastPair:true});
}
console.log(JSON.stringify(result));
