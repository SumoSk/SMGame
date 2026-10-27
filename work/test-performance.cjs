const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
function boot(source=fs.readFileSync('dist/game.js','utf8')){
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0]
  .replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,')
  .replace("fs.readFileSync('dist/game.js','utf8')",'source');
 return new Function('require','source',fixture+'return boot();')(require,source).game;
}
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const Renderer=new Function('THREE',source+'return TrafficRenderer;')(THREE);
 const r=Object.create(Renderer.prototype);r.carSets=new Map();r.carLODSets=new Map();r.carTechMeshes=new Map();
 let calls=0;r.parking={parkingSlotPose:(b,i)=>{calls++;return{x:b.x+i,y:b.y,angle:b.rotation||0};}};
 const b={key:'home',x:1,y:2,rotation:0,parkingSlots:[7,8]};
 const p=r.parkedCarPose(b,7);assert.equal(r.parkedCarPose(b,7),p);assert.equal(calls,1);
 b.parkingSlots[0]=null;b.parkingSlots[1]=7;assert.equal(r.parkedCarPose(b,7).x,2);assert.equal(calls,2);
 b.x=20;assert.equal(r.parkedCarPose(b,7).x,21);assert.equal(calls,3);
 b.rotation=1;assert.equal(r.parkedCarPose(b,7).angle,1);
 b.parkingSlots=[7];assert.equal(r.parkedCarPose(b,7).x,20);
 assert.equal(r.parkedCarPose(b,99),null);
 // Run the actual render orchestration with a stub GPU: heat must never call cars().
 for(const name of ['updateCamera','terrain','makeRoads','makeBuildings','preview','updateSignals','updateAISignalGlow','updateGrandSignals','updateWeatherLight','updateBuildingDetailLOD','updateFactoryEffects'])r[name]=()=>{};
 r.city=1;r.renderer={render:()=>{}};r.routeLine={};r.graphicQuality='low';r.treeGroup={};r.heatGroup={visible:false};r.heatAt=10;
 let carCalls=0;r.cars=()=>{carCalls++;};const mesh={count:5};r.carSets.set(0,{body:mesh,trim:mesh,headlights:mesh,taillights:mesh,lightSpill:mesh});r.carIndicatorHits=[1];
 const state={city:1,buildings:new Map(),roads:new Map(),vehicles:new Map(),version:1,time:10};
 const args={state,cam:{},tool:'hand',ROADS:{},CATALOG:{},heat:true};r.render(args);
 assert.equal(carCalls,0);assert.equal(mesh.count,0);assert.equal(r.carIndicatorHits.length,0);
 r.render({...args,heat:false});assert.equal(carCalls,1);
 let builds=0;r.makeBuildings=()=>{builds++;};r.render({...args,heat:false});assert.equal(builds,0);
 state.buildingVisualVersion=1;r.render({...args,heat:false});assert.equal(builds,1);
 r.render({...args,heat:false});assert.equal(builds,1);
 r.render({...args,state:{...state},heat:false});assert.equal(builds,2);
 const g=boot();g.state.money=1e9;const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);assert(home);assert.equal(g.state.buildingVisualVersion,1);
 g.demolishBuilding(home,true);assert.equal(g.state.buildingVisualVersion,2);
 // Compare admission decisions with the original implementation, including
 // duplicate requests and cars at equal distances in the same lane.
 const current=fs.readFileSync('dist/game.js','utf8');
 const queueCode=current.slice(current.indexOf('function queueIndex('),current.indexOf('function signalRequired(',current.indexOf('function queueAllows(')));
 const reference="function queueAllows(v,pos,connector,precheckedExit=null){\n const node=v.path[pos],queue=state.junctionQueues?.get(node);if(!queue)return true;\n const own=queue.find(q=>q.id===v.id&&q.pos===pos);if(!own)return true;\n const eligible=q=>{const car=state.vehicles.get(q.id);return car&&(!signalRequired(node)||signalAllows(node,q.connector.incoming,q.connector.laneIn))&&(q.id===v.id&&precheckedExit!==null?precheckedExit:junctionExitAvailable(car,q.pos))&&!queue.some(front=>front.id!==q.id&&front.connector.incoming===q.connector.incoming&&front.connector.laneIn===q.connector.laneIn&&front.distance<q.distance-.01);};\n if(!eligible(own))return false;const priority=junctionPriority(own,node);\n for(const other of queue){if(other.id===v.id||!eligible(other)||!connectorsConflict(connector,other.connector))continue;const p=junctionPriority(other,node);if(p<priority||p===priority&&(other.at<own.at||other.at===own.at&&(other.distance<own.distance-.01||Math.abs(other.distance-own.distance)<.01&&other.id<v.id)))return false;}\n return true;\n}\n";
 let seed=17;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let trial=0;trial<500;trial++){
  const queue=Array.from({length:1+Math.floor(rand()*24)},(_,i)=>({id:Math.floor(rand()*12),pos:i,at:Math.floor(rand()*8),distance:Math.floor(rand()*8)/2,connector:{incoming:Math.floor(rand()*4),laneIn:Math.floor(rand()*2)}}));
  const state={time:20,junctionQueues:new Map([[1,queue]]),vehicles:new Map(queue.map(q=>[q.id,{id:q.id}]))};
  const deps={state,signalRequired:()=>true,signalAllows:(n,d)=>d!==trial%4,junctionExitAvailable:v=>v.id%3!==trial%3,connectorsConflict:(a,b)=>a.incoming!==b.incoming,junctionPriority:q=>q.id%3};
  const compile=code=>new Function(...Object.keys(deps),code+'return queueAllows;')(...Object.values(deps));
  const before=compile(reference),after=compile(queueCode);
  for(const q of queue){const v={id:q.id,path:[]};v.path[q.pos]=1;assert.equal(after(v,q.pos,q.connector,true),before(v,q.pos,q.connector,true));}
  assert(queue._index,'lane-head index is constructed once');
  const indexed=queue._index;
  for(const q of queue){const v={id:q.id,path:[]};v.path[q.pos]=1;after(v,q.pos,q.connector,true);}
  assert.strictEqual(queue._index,indexed,'followers reuse indexed heads');
 }
 function trafficTrace(source){
  const game=boot(source.replace('function computePhysicalTrafficLimit(v,plan,s,lookahead){','function computePhysicalTrafficLimit(v,plan,s,lookahead){state.physicalQueries=(state.physicalQueries||0)+1;'));
  for(const key of ['roads','vehicles','occ','reservations'])game.state[key].clear();game.state.speed=1;
  for(let row=0;row<4;row++){
   const path=[];
   for(let x=10;x<280;x++){const n=game.id(x,20+row*4);path.push(n);game.state.roads.set(n,{type:'small',main:false,links:new Set(),load:0,wait:0});if(x>10){const prev=path.at(-2);game.state.roads.get(prev).links.add(n);game.state.roads.get(n).links.add(prev);}}
   for(let i=0;i<50;i++){const id=row*1000+i,v={id,path,pathSet:new Set(path),pos:2+i*3,progress:0,lane:0,laneSeed:0,speed:2.7,phase:'driving',kind:'pass',wait:0,lastPain:0,deadline:null,citizenId:null,retryAt:0,noUTurnPolicy:1,routeCheckedVersion:game.state.version};v.lane=game.plannedLane(v,v.pos);game.state.vehicles.set(id,v);v.occKey=`${path[v.pos]}:0:${v.lane}`;game.state.occ.set(v.occKey,id);}
  }
  const trace=[];
  for(let step=0;step<120;step++){game.advanceVehicles(1/60,.8/60);trace.push(JSON.stringify([...game.state.vehicles.values()].map(v=>[v.id,v.pos,v.progress,v.speed,v.wait,v.stopReason])));}
  return{trace,queries:game.state.physicalQueries};
 }
 const cached=trafficTrace(current),uncached=trafficTrace(current.replace('if(memo.queries.has(lookahead))','if(false&&memo.queries.has(lookahead))'));
 assert.deepEqual(cached.trace,uncached.trace);assert(cached.queries<uncached.queries);
 console.log(`PASS: 200 cars x 120 steps identical; physical checks ${uncached.queries} -> ${cached.queries}; 500 queue scenarios match original rules`);
 console.log('PASS: stationary pose reuse/invalidation, heat skips cars and clears picking, heat exit, building revisions/state replacement');
})().catch(e=>{console.error(e);process.exitCode=1});
