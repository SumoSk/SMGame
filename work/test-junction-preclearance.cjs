'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const baseline=execFileSync('git',['show','bc8b053094713a458c41f1758c84a52e1189f1ff:dist/game.js'],{encoding:'utf8',maxBuffer:3000000});
const current=fs.readFileSync('dist/game.js','utf8');
function boot(source){
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0]
  .replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,')
  .replace("fs.readFileSync('dist/game.js','utf8')",'source');
 return new Function('require','source',fixture+'return boot();')(require,source).game;
}
function run(source){
 const injected=source
  .replace('preclearanceTickets.set(v.id,ticket);','preclearanceTickets.set(v.id,ticket);state.pregrants=(state.pregrants||0)+1;')
  .replace('if(preclearedAdmission(v,pos,ignoreSignal))return true;',
   'if(preclearedAdmission(v,pos,ignoreSignal)){state.pregrantsUsed=(state.pregrantsUsed||0)+1;return true;}');
 const g=boot(injected);g.reset();const st=g.state;
 for(const key of ['roads','vehicles','occ','reservations','junctionCache','junctionLayoutCache'])st[key]?.clear();
 const make=n=>{if(!st.roads.has(n))st.roads.set(n,{type:'large',main:false,links:new Set(),load:0,wait:0});};
 const link=(a,b)=>{make(a);make(b);st.roads.get(a).links.add(b);st.roads.get(b).links.add(a);};
 const path=[];
 for(let x=125;x<=190;x++){const n=g.id(x,150);make(n);if(path.length)link(path.at(-1),n);path.push(n);}
 for(let y=140;y<=160;y++){const n=g.id(150,y);make(n);if(y>140)link(g.id(150,y-1),n);}
 const center=g.id(150,150);
 const cycle=g.signalCycle(center);let t0=null;
 for(let t=0;t<cycle*4;t+=.05){
  st.time=cycle*30+t;const status=g.signalStatus(center);
  if(status.phase!==-1||status.remaining==null||status.remaining<=.2||status.remaining>.45)continue;
  const keep=st.time;st.time+=status.remaining+.005;
  const green=g.signalAllows(center,0,0);
  st.time=keep;if(green){t0=keep;break;}
 }
 assert(t0!==null,'find all-red clearance immediately before eastbound green');
 st.time=t0;const cars=[];
 for(let x=138;x<=148;x++){
  const pos=x-125,id=2000+x;
  const v={id,path,pathSet:new Set(path),pos,progress:0,lane:0,laneSeed:0,
    speed:0,phase:'driving',kind:'pass',wait:0,stopReason:'',
    junctionPasses:[],junctionQueueSince:{},lastPain:0,
    noUTurnPolicy:1,routeCheckedVersion:st.version};
  v.lane=g.plannedLane(v,pos);st.vehicles.set(id,v);cars.push(v);
  v.occKey=path[pos]+':0:'+v.lane;st.occ.set(v.occKey,id);
 }
 const before=cars.map(v=>v.pos+v.progress);
 let greenFrames=0,initialGreenSpeed=0,rollingStops=0,started=new Set(),previous=new Map();
 for(let i=0;i<240;i++){
  const green=g.signalAllows(center,0,0);
  g.advanceVehicles(1/60,.8/60);
  if(green){greenFrames++;if(greenFrames===1)initialGreenSpeed=cars.at(-1).speed||0;}
  for(const v of cars){
   if(v.speed>.15)started.add(v.id);
   if((previous.get(v.id)||0)>.15&&v.speed<.01&&green)rollingStops++;
   previous.set(v.id,v.speed||0);
  }
  st.time+=.8/60;
  const poses=cars.filter(v=>st.vehicles.has(v.id)).map(v=>g.vehiclePosition(v)).filter(Boolean).sort((a,b)=>a.x-b.x);
  for(let j=1;j<poses.length;j++)if(Math.abs(poses[j].y-poses[j-1].y)<.18)
   assert(poses[j].x-poses[j-1].x>=.61,'colliding vehicles');
 }
 console.log('QUEUE_END',cars.map(v=>({id:v.id,x:+(v.pos+v.progress).toFixed(3),speed:+(v.speed||0).toFixed(2),reason:v.stopReason||'',pass:v.junctionPasses?.length||0})), 'CLAIMS', [...st.reservations].filter(([k])=>String(k).startsWith('junction:')).slice(0,6));
 return{pregrants:st.pregrants||0,pregrantsUsed:st.pregrantsUsed||0,
  greenFrames,initialGreenSpeed:+initialGreenSpeed.toFixed(4),rollingStops,started:started.size,
  travel:+cars.reduce((v,c,i)=>v+c.pos+c.progress-before[i],0).toFixed(4)};
}
const a=run(baseline),b=run(current);
console.log('PRECLEARANCE_BASELINE '+JSON.stringify(a));
console.log('PRECLEARANCE_CANDIDATE '+JSON.stringify(b));
assert(b.pregrants>=1,'must grant before green');
assert(b.pregrantsUsed>=1,'ticket must be used after green');
assert(b.started>=a.started,'must start no fewer cars');
assert(b.rollingStops<=a.rollingStops,'must not introduce green stop-start');
assert(b.travel>=a.travel-.001,'must not reduce travel throughput');
console.log('PASS: precleared permits activate after red without collisions or throughput regression');
