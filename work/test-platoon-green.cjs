'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const base=execFileSync('git',['show','bc8b053094713a458c41f1758c84a52e1189f1ff:dist/game.js'],{encoding:'utf8',maxBuffer:3000000});
const newer=fs.readFileSync('dist/game.js','utf8');
function boot(source){
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0]
  .replace('document:{getElementById:get,','document:{addEventListener:()=>{},getElementById:get,')
  .replace("fs.readFileSync('dist/game.js','utf8')",'source');
 return new Function('require','source',fixture+'return boot();')(require,source).game;
}
function check(source){
 const game=boot(source);game.reset();const st=game.state;
 for(const key of ['roads','vehicles','occ','reservations','junctionCache','junctionLayoutCache'])st[key]?.clear();
 const add=n=>{if(!st.roads.has(n))st.roads.set(n,{type:'large',main:false,links:new Set(),load:0,wait:0});};
 const link=(a,b)=>{add(a);add(b);st.roads.get(a).links.add(b);st.roads.get(b).links.add(a);};
 const path=[];
 for(let x=125;x<=185;x++){const n=game.id(x,150);add(n);if(path.length)link(path.at(-1),n);path.push(n);}
 for(let y=140;y<=160;y++){const n=game.id(150,y);add(n);if(y>140)link(game.id(150,y-1),n);}
 const center=game.id(150,150),slots=game.signalSlots(center),slot=slots.findIndex(q=>q.incoming===0);
 assert(slot>=0,'green phase exists');
 const cycle=game.signalCycle(center);let found=false;
 for(let t=0;t<cycle*2;t+=.25){st.time=cycle*20+t;if(game.signalAllows(center,0,0)){found=true;break;}}
 assert(found,'approach starts green');
 const cars=[];
 for(let x=137;x<=148;x++){
  const pos=x-125,id=x+2000,v={id,path,pathSet:new Set(path),pos,progress:0,
   lane:0,laneSeed:0,speed:0,phase:'driving',kind:'pass',wait:0,
   junctionPasses:[],junctionQueueSince:{},lastPain:0,routeCheckedVersion:st.version,noUTurnPolicy:1};
  v.lane=game.plannedLane(v,pos);st.vehicles.set(id,v);cars.push(v);
  v.occKey=path[pos]+':0:'+v.lane;st.occ.set(v.occKey,id);
 }
 let drops=0,started=new Set(),crossed=new Set(),prev=new Map(),dropReasons=new Map();
 for(let tick=0;tick<150;tick++){
  game.advanceVehicles(1/60,.8/60);st.time+=.8/60;
  const active=cars.filter(v=>st.vehicles.has(v.id));
  for(const v of active){
   const speed=v.speed||0;
   if(speed>.15)started.add(v.id);
   if((prev.get(v.id)||0)>.15&&speed<.01){drops++;const reason=v.stopReason||'(none)';dropReasons.set(reason,(dropReasons.get(reason)||0)+1);}
   prev.set(v.id,speed);
   if(v.pos>=26)crossed.add(v.id);
  }
  const positions=active.map(v=>game.vehiclePosition(v)).filter(Boolean).sort((a,b)=>a.x-b.x);
  for(let i=1;i<positions.length;i++)if(Math.abs(positions[i].y-positions[i-1].y)<.18)
   assert(positions[i].x-positions[i-1].x>=.61,'vehicle overlap');
 }
 return{started:started.size,crossed:crossed.size,drops,dropReasons:Object.fromEntries(dropReasons),travel:+cars.reduce((a,v)=>a+v.pos+v.progress,0).toFixed(3)};
}
const a=check(base),b=check(newer);console.log('GREEN_BASELINE',a,'GREEN_NEW',b);
assert(b.started===12);
assert(b.crossed>=a.crossed,'throughput regression');
assert(b.drops<=a.drops,'stop-start regression');
console.log('PASS: green light convoy and separation');
