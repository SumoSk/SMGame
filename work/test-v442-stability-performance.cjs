'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const baseline=execFileSync('git',['show','bc8b053094713a458c41f1758c84a52e1189f1ff:dist/game.js'],{encoding:'utf8',maxBuffer:3000000});
const updated=fs.readFileSync('dist/game.js','utf8');
function boot(source){
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0]
 .replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,')
 .replace("fs.readFileSync('dist/game.js','utf8')",'source');
 return new Function('require','source',fixture+'return boot();')(require,source).game;
}
function scenario(source,carsCount,steps,spacing=1){
 const injected=source.replace('function computePhysicalTrafficLimit(v,plan,s,lookahead){','function computePhysicalTrafficLimit(v,plan,s,lookahead){state.physicalChecks=(state.physicalChecks||0)+1;')
 .replace('function positionOnMotion(plan,s){','function positionOnMotion(plan,s){state.poseCalculations=(state.poseCalculations||0)+1;');
 assert(injected!==source,'cannot instrument simulation');
 const game=boot(injected),st=game.state;
 for(const key of ['roads','vehicles','occ','reservations'])st[key].clear();
 st.speed=1;
 const rowSize=40,rows=Math.ceil(carsCount/rowSize),members=[];
 for(let row=0;row<rows;row++){
  const y=15+row*4,path=[];
  for(let x=10;x<280;x++){
   const n=game.id(x,y);path.push(n);st.roads.set(n,{type:'small',main:false,links:new Set(),load:0,wait:0});
   if(x>10){const prev=path.at(-2);st.roads.get(n).links.add(prev);st.roads.get(prev).links.add(n);}
  }
  for(let i=0;i<Math.min(rowSize,carsCount-row*rowSize);i++){
   const id=row*1000+i,pos=6+Math.floor(i*spacing),progress=i*spacing-Math.floor(i*spacing);
   const car={id,path,pathSet:new Set(path),pos,progress,lane:0,laneSeed:0,speed:i%9===0?0:2.7,
    phase:'driving',kind:'pass',wait:0,lastPain:0,deadline:null,citizenId:null,retryAt:0,
    noUTurnPolicy:1,routeCheckedVersion:st.version};
   car.lane=game.plannedLane(car,pos);st.vehicles.set(id,car);
   car.occKey=path[pos]+':0:'+car.lane;st.occ.set(car.occKey,id);members.push(car);
  }
 }
 const start=performance.now();
 for(let step=0;step<steps;step++)game.advanceVehicles(1/60,.8/60);
 const ms=performance.now()-start;
 for(const car of members)if(st.vehicles.has(car.id)){
  assert(Number.isFinite(car.progress)&&Number.isFinite(car.speed),'finite vehicle state');
  assert(car.speed>=0,'nonnegative velocity');
 }
 const distance=members.reduce((sum,c)=>sum+c.pos+c.progress,0);
 return {ms:+ms.toFixed(2),poses:st.poseCalculations||0,checks:st.physicalChecks||0,distance:+distance.toFixed(3)};
}
const median=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)];
for(const count of [200,500,1000]){
 // The same deterministic city layout, density, stop-start and runtime
 // parameters are replayed for both versions on the same CI machine.
 scenario(baseline,50,10);scenario(updated,50,10);
 const old=[],now=[];
 for(let r=0;r<3;r++){
  if(r%2){now.push(scenario(updated,count,70));old.push(scenario(baseline,count,70));}
  else{old.push(scenario(baseline,count,70));now.push(scenario(updated,count,70));}
 }
 const a={ms:median(old.map(r=>r.ms)),poses:median(old.map(r=>r.poses)),checks:median(old.map(r=>r.checks)),distance:median(old.map(r=>r.distance))};
 const b={ms:median(now.map(r=>r.ms)),poses:median(now.map(r=>r.poses)),checks:median(now.map(r=>r.checks)),distance:median(now.map(r=>r.distance))};
 const delta=+((b.ms/a.ms-1)*100).toFixed(2);
 console.log('BENCHMARK '+JSON.stringify({cars:count,baseline:a,updated:b,msChangePercent:delta}));
 console.log('GEOMETRY_COUNTS '+JSON.stringify({cars:count,baseline:a.poses,updated:b.poses}));
 console.log('PHYSICAL_CHECKS '+JSON.stringify({cars:count,baseline:a.checks,updated:b.checks}));
 if(b.ms>a.ms*1.10)console.warn('REGRESSION: >10% CPU time increase at '+count+' cars');
}
console.log('AUDIT COMPLETE: unchanged v4.4.2 baseline against stability patch; not browser FPS');
