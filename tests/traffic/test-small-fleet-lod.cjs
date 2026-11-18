'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(process.env.SMCITY_RENDER_SOURCE||path.join(__dirname,'../../dist/renderer3d.js'),'utf8');
const start=source.indexOf(' cars(state,vehiclePosition,'),end=source.indexOf('  this.updateCarTechEffects(techEffects,warpPoints);',start);
assert(start>0&&end>start,'actual cars() selection stage exists');
// Execute the actual selection/culling/cache stage. GPU uploads after this stage
// are outside the LOD decision under test and require a browser smoke test.
const stage=source.slice(start,end)+'return {groups,medium,far,roadTrainLow,taxiLow};\n }';
const styles=Array.from({length:16},()=>[1.2,.6,.5,0,.5,.3]);
const run=new Function('VEHICLE_TYPES','VEHICLE_STYLES','VEHICLE_TECH_COLORS','VEHICLE_VISUAL_SCALE','CAR_LOD_DISTANCE_SCALE','carClassFor','carPaintFor','return ({'+stage+'}).cars;')(
 Array.from({length:13},()=>''),styles,{speed:'#f00',smart:'#0ff',fly:'#ff0',warp:'#0f0'},.96,1.25,(c,id,tech,v)=>c?.style??v?.style??0,()=> '#fff');
// Exact former LOD expression, independent of the new fleet decision.
const former=new Function('v','kind','quality','distance','apparentLength','upgraded',`return v?.kind==='intercity'&&quality==='low'?'roadTrainLow':
kind===8&&quality==='low'?'taxiLow':
kind===8&&quality==='medium'&&distance>65*1.25?'taxiLow':
kind===8?'near':
v?.kind==='intercity'&&distance<135*1.25?'near':v?.kind==='delivery'&&distance<70*1.25?'near':upgraded?'near':quality==='veryHigh'?'near':
quality==='low'?'far':
apparentLength>=22/1.25&&distance<=Math.max(24,12/.5)*1.25?'near':apparentLength>=10/1.25?'medium':'far';`);
function fixture(active,parked,{quality='medium',x=90,style=0,scale=10,kind='pass',tech='normal'}={}){
 const target={id:1,citizenId:1,phase:'driving',kind,vehicleTech:tech,style},vehicles=new Map([[1,target]]);
 for(let i=1;i<active;i++)vehicles.set(i+1,{id:i+1,phase:'gate_waiting'});
 const b={id:50,x:0,y:0,parked:new Set(Array.from({length:parked},(_,i)=>1000+i)),pose:{x:x+3.5,y:.5,angle:0}};
 const state={vehicles,buildings:new Map([[50,b]]),citizens:new Map([[1,{id:1,style}]])};
 for(const id of b.parked)state.citizens.set(id,{id,style});
 const point={set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}};
 const renderer={graphicQuality:quality,cameraViewVersion:1,carFrustumVersion:1,carFrustumReady:true,carViewFrustum:{planes:[{distanceToPoint:p=>p.x>999?-2:1}]},carViewPoint:point,cam:{x:0,y:0,z:.5},camera:{isPerspectiveCamera:false,top:10,bottom:0},h:scale*10,carSurfaceY:()=>.1,parkedCarPose:b=>b.pose,parking:{buildingBounds:()=>null,parkingIsMoving:()=>false,citizenCarColor:()=> '#fff'}};
 return {renderer,state,target,b,x,scale,style,kind,tech,quality};
}
function execute(f){return run.call(f.renderer,f.state,v=>({x:(v.x??f.x)+.5,y:.5,angle:0}),{},null,null,false);}
function category(data,x){for(const [level,items]of Object.entries(data))if(level==='groups'?items.some(g=>g.some(car=>car.x===x)):items.some(car=>car.x===x))return level==='groups'?'near':level;return null;}
let checks=0;
for(const quality of ['low','medium','high','veryHigh'])for(const active of [1,98,99,100])for(const parked of [0,1,99,100])for(const style of [0,8])for(const x of [20,90,200])for(const scale of [10,300]){
 const f=fixture(active,parked,{quality,style,x,scale}),data=execute(f),small=active+parked<100&&quality!=='low';
 const old=former(f.target,style,quality,x,styles[style][0]*.96*scale,false);
 assert.equal(category(data,x),small?'near':old,`moving active=${active} parked=${parked} quality=${quality}`);checks++;
 if(parked){const oldParked=former(undefined,style,quality,x+3,styles[style][0]*.96*scale,false);assert.equal(category(data,x+3),small?'near':oldParked,'parked policy');checks++;}
}
// Crossing the threshold in either direction must invalidate parked cache LOD.
for(const quality of ['low','medium','high','veryHigh'])for(const active of [1,100])for(const parked of [0,100])for(const kind of ['pass','intercity','delivery'])for(const tech of ['normal','speed','smart','fly','warp'])for(const style of [0,8,9,12])for(const x of [20,200]){
 const f=fixture(active,parked,{quality,kind,tech,style,x,scale:1}),data=execute(f),small=active+parked<100&&quality!=='low';
 const old=former(f.target,style,quality,x,styles[style][0]*.96,tech!=='normal');
 assert.equal(category(data,x),small?'near':old,'special vehicle model retains former policy outside small fleet');checks++;
}
// Crossing the threshold in either direction must invalidate parked cache LOD.
{
 const f=fixture(98,1,{scale:1}),pose=f.b.pose;
 for(const [active,expected]of [[98,'near'],[99,'far'],[98,'near'],[99,'far']]){
  while(f.state.vehicles.size>active)f.state.vehicles.delete(f.state.vehicles.size);
  while(f.state.vehicles.size<active){const id=f.state.vehicles.size+1;f.state.vehicles.set(id,{id,phase:'gate_waiting'});}
  assert.equal(category(execute(f),f.x+3),expected,'cached parked car follows 99/100 total threshold');
  assert.equal(f.renderer.parkedRenderCache.get(pose).smallFleet,active===98);checks+=2;
 }
}
// Full detail never bypasses visibility culling, including parked cars.
{
 const f=fixture(1,1,{x:1001});assert.equal(category(execute(f),1001),null);assert.equal(f.renderer.carLODStats.culled,2);checks+=2;
}
// A large parked fleet preserves the former policy even with one moving car.
{
 const f=fixture(1,500,{scale:1});assert.equal(category(execute(f),f.x),'far');checks++;
}
// Counting is skipped once active cars already reach the threshold, and stops
// on the first building that reaches it. Rendering still visits its own data.
for(const active of [1,100]){
 const f=fixture(active,0),parked=new Set(Array.from({length:100},(_,i)=>1000+i));let reads=0;
 f.b={id:50,x:0,y:0,pose:{x:93.5,y:.5,angle:0},get parked(){reads++;return parked;}};
 f.state.buildings=new Map([[50,f.b],[51,{id:51,x:0,y:0,parked:new Set(),pose:f.b.pose}]]);
 execute(f);assert.equal(reads,active===100?1:2,'bounded count uses one extra read only when needed');checks++;
}
console.log(JSON.stringify({passed:true,checks,scope:'Actual cars selection, frustum culling, parked cache and 99/100 total-car boundary; no GPU/FPS claim'}));
