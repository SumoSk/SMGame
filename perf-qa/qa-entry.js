if(!window.__SMCITY_PERF_STORAGE_READY__)throw new Error('Test storage isolation failed; game not started.');
import { TrafficRenderer } from '../dist/renderer3d.js';
let renderCpuSamples=null;
window.createTrafficRenderer=canvas=>{const r=new TrafficRenderer(canvas),render=r.render;r.render=function(...args){const at=performance.now();try{return render.apply(this,args);}finally{renderCpuSamples?.push(performance.now()-at);}};return r;};
let game;window.__TRAFFIC_TEST_HARNESS__=g=>{game=g;};
const variant=new URL(location.href).searchParams.get('variant')==='after'?'after':'before';
const panel=document.createElement('section');panel.id='qa-panel';panel.style.cssText='position:fixed;right:8px;top:8px;z-index:100000;background:#fff;color:#123;padding:14px;width:330px;font:14px sans-serif;border:3px solid #168;border-radius:8px;box-shadow:0 2px 10px #0005';panel.innerHTML='<strong>SMCITY local performance QA — '+variant+'</strong><p id="qa-status">Preparing matched test city…</p><label>Speed <select id="qa-speed"><option>1</option><option>2</option><option>5</option><option selected>20</option></select></label> <button id="qa-run" disabled>Run 12-second test</button><pre id="qa-results" style="white-space:pre-wrap;font-size:13px"></pre>';document.body.append(panel);
await import('./game-'+variant+'.js');
const fixtureSeed=0x5a17c0de,originalRandom=Math.random;let randomState=fixtureSeed;Math.random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
document.getElementById('smcityWelcome')?.remove();game.startNewCity('london');game.state.speed=0;
game.state.events=[];game.state.lastImmigration=1e9;game.state.lastPass=1e9;game.state.nextActivityCheck=1e9;game.state.nextTouristAt=1e9;game.state.morningPlanningDay=0;
for(const c of game.state.citizens.values()){if(c.workId)game.runAction(c,'work',{});if(game.state.vehicles.size>=300)break;}
game.state.speed=1;for(let i=0;i<120;i++){game.state.time+=.08;game.advanceVehicles(.1,.08);}game.state.speed=0;game.state.events=[];Math.random=originalRandom;
const fixtureText=JSON.stringify({time:game.state.time,vehicles:[...game.state.vehicles.values()].map(v=>[v.id,v.citizenId,v.phase,v.fromId,v.toId,v.path,v.pos,v.progress,v.lotPath,v.lotDistance,v.lotBuilding]),citizens:[...game.state.citizens.values()].map(c=>[c.id,c.homeId,c.workId,c.locationId,c.vehicleId,c.queued,c.pending]),buildings:[...game.state.buildings.values()].map(b=>[b.id,b.parkingSlots,[...b.parked],b.queue]),occ:[...game.state.occ],reservations:[...game.state.reservations]});let fixtureHash=2166136261;for(let i=0;i<fixtureText.length;i++)fixtureHash=Math.imul(fixtureHash^fixtureText.charCodeAt(i),16777619);const fixtureFingerprint=(fixtureHash>>>0).toString(16).padStart(8,'0');
const initialTime=game.state.time,initialCars=game.state.vehicles.size,initialPopulation=game.state.citizens.size;
await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
document.getElementById('qa-status').textContent='Ready: '+initialPopulation+' people, '+initialCars+' vehicles. No account or cloud save is connected.';document.getElementById('qa-run').disabled=false;
document.getElementById('qa-run').onclick=()=>{
 const button=document.getElementById('qa-run');button.disabled=true;const speed=Number(document.getElementById('qa-speed').value);game.state.speed=speed;
 renderCpuSamples=[];const start=performance.now(),startGame=game.state.time,intervals=[],delays=[],longs=[];let last=start,done=false;
 let observer;const longTaskObserverSupported=!!window.PerformanceObserver?.supportedEntryTypes?.includes('longtask');try{if(!longTaskObserverSupported)throw new Error('Long-task observer unavailable');observer=new PerformanceObserver(list=>{for(const e of list.getEntries())longs.push(e.duration);});observer.observe({type:'longtask',buffered:false});}catch{}
 const probe=expected=>{if(done)return;delays.push(Math.max(0,performance.now()-expected));setTimeout(()=>probe(expected+100),Math.max(0,expected+100-performance.now()));};setTimeout(()=>probe(start+100),100);
 const quantile=(a,q)=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.ceil(q*b.length)-1)];};
 const frame=now=>{if(done)return;intervals.push(now-last);last=now;if(now-start<12000){requestAnimationFrame(frame);return;}done=true;game.state.speed=0;observer?.disconnect();
 const elapsed=(performance.now()-start)/1000,advanced=game.state.time-startGame;
 const results={variant,speed,fixtureSeed,fixtureFingerprint,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},graphics:game.graphicQuality,population:initialPopulation,initialVehicles:initialCars,finalVehicles:game.state.vehicles.size,hostSeconds:+elapsed.toFixed(2),advancedGameMinutes:+advanced.toFixed(3),gameMinutesPerHostSecond:+(advanced/elapsed).toFixed(3),renderFrames:intervals.length,rafP50Ms:+quantile(intervals,.5).toFixed(2),rafP95Ms:+quantile(intervals,.95).toFixed(2),eventLoopDelayP95Ms:+quantile(delays,.95).toFixed(2),renderCpuP50Ms:+quantile(renderCpuSamples,.5).toFixed(2),renderCpuP95Ms:+quantile(renderCpuSamples,.95).toFixed(2),longTaskObserverSupported,longTaskCount:longTaskObserverSupported?longs.length:null,longTaskP95Ms:longTaskObserverSupported?+quantile(longs,.95).toFixed(2):null,note:'Browser page with rendering enabled. RAF and timer delays are proxies, not physical input latency.'};
 renderCpuSamples=null;document.getElementById('qa-results').textContent=JSON.stringify(results,null,2);document.getElementById('qa-status').textContent='Completed. Game paused; close this test tab when finished.';
 };requestAnimationFrame(frame);
};
