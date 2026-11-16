const assert=require('node:assert/strict');const {game}=require('./audit-harness.cjs').boot();
const angle=p=>Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle));
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const near=(a,b,tolerance=1e-6)=>assert(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
function install(points,types,cross=false,seed=0){
 game.reset();game.state.roads.clear();game.state.junctionCache.clear();
 const path=points.map(([x,y])=>game.id(x,y));
 function add(node,type){if(!game.state.roads.has(node))game.state.roads.set(node,{type,main:false,links:new Set(),load:0,wait:0});}
 function link(a,b){game.state.roads.get(a).links.add(b);game.state.roads.get(b).links.add(a);}
 path.forEach((node,i)=>add(node,typeof types==='function'?types(i):types));
 for(let i=1;i<path.length;i++)link(path[i-1],path[i]);
 if(cross){const center=game.id(150,150);for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){let prev=center;for(let k=1;k<=8;k++){const node=game.id(150+dx*k,150+dy*k);add(node,'large');link(prev,node);prev=node;}}}
 const v={id:900,path,pathSet:new Set(path),pos:0,progress:0,lane:0,laneSeed:seed,speed:0,phase:'driving',kind:'pass',wait:0,lastPain:0,deadline:null,citizenId:null,retryAt:0};
 v.lane=game.plannedLane(v,0);game.state.vehicles.set(v.id,v);
 const key=`${path[0]}:${game.dir(path[0],path[1])}:${v.lane}`;v.occKey=key;game.state.occ.set(key,v.id);return v;
}
function turnPath(sign,rotation=0){const points=[];const rotate=([x,y])=>{for(let i=0;i<rotation;i++)[x,y]=[-y,x];return[150+x,150+y];};for(let x=-8;x<=0;x++)points.push(rotate([x,0]));for(let y=1;y<=8;y++)points.push(rotate([0,sign*y]));return points;}
function phase(node,value){const cycle=16,offset=(node%17)*cycle/24;game.state.time=Math.ceil((game.state.time+offset)/cycle)*cycle-offset+(value===0?.1:8.1);assert.equal(game.signalPhase(node),value);}
let combinations=0;
for(const seed of [0,1])for(const inbound of ['small','medium','large'])for(const junction of ['small','medium','large'])for(const outbound of ['small','medium','large'])for(const sign of [-1,1])for(let rotation=0;rotation<4;rotation++){
 const v=install(turnPath(sign,rotation),i=>i<8?inbound:i===8?junction:outbound,false,seed),plan=game.motionPlan(v),turn=plan.turns[0];
 let last=null,rotationTotal=0,minStep=Infinity,maxStep=0;
 for(let k=0;k<=500;k++){
  const s=turn.startDistance+(turn.endDistance-turn.startDistance)*k/500,p=game.positionOnMotion(plan,s),heading=angle(p);
  assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(heading));
  const center=game.xy(v.path[turn.pos]),x=p.x-center[0]-.5,y=p.y-center[1]-.5;
  const incoming=rotation*Math.PI/2,outgoing=incoming+sign*Math.PI/2;
  const insideIncoming=Math.abs(x*Math.sin(incoming)-y*Math.cos(incoming))<=game.ROADS[inbound].visualWidth/2+.001;
  const insideOutgoing=Math.abs(x*Math.sin(outgoing)-y*Math.cos(outgoing))<=game.ROADS[outbound].visualWidth/2+.001;
  assert(insideIncoming||insideOutgoing,'turn must stay on the paved road');
  if(last){const yaw=delta(last.heading,heading);assert(sign*yaw>=-1e-7,'turn must not steer backwards');rotationTotal+=yaw;const step=Math.hypot(p.x-last.p.x,p.y-last.p.y);minStep=Math.min(minStep,step);maxStep=Math.max(maxStep,step);}
  last={heading,p};
 }
 near(rotationTotal,sign*Math.PI/2,1e-5);assert(maxStep/minStep<1.01,'arc-distance speed must be uniform');
 for(let k=1;k<plan.pieces.length;k++){
  const seam=plan.pieces[k].startDistance,a=game.positionOnMotion(plan,seam-1e-7),b=game.positionOnMotion(plan,seam+1e-7);
  assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-5,'no position jump at a curve seam');
  assert(Math.abs(delta(angle(a),angle(b)))<1e-4,'no heading snap at a curve seam');
 }
 combinations++;
}
// Width changes must rotate the car along its actual lateral movement.
{
 const points=Array.from({length:22},(_,i)=>[140+i,100]);
 const v=install(points,i=>i<7?'large':i<14?'small':'medium'),plan=game.motionPlan(v);
 for(let k=1;k<500;k++){
  const s=plan.total*k/500,h=1e-5,a=game.positionOnMotion(plan,s-h),p=game.positionOnMotion(plan,s),b=game.positionOnMotion(plan,s+h);
  const measured=Math.atan2(b.y-a.y,b.x-a.x);assert(Math.abs(delta(angle(p),measured))<.002,'heading must match the movement tangent');
 }
 for(let i=0;i<v.path.length-2;i++){
  v.pos=i;v.progress=1;const a=game.vehiclePosition(v);v.pos++;v.progress=0;v.lane=game.plannedLane(v,v.pos);const b=game.vehiclePosition(v);
  assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-7);near(delta(angle(a),angle(b)),0);
 }
}
// Travel distance is carried across node boundaries at both normal and fast speed.
for(const speed of [1,5,10,20])for(const fps of [30,60,120]){
 const v=install(Array.from({length:110},(_,i)=>[70+i,100]),'small');game.state.speed=speed;v.speed=2.7;
 const start=game.motionDistance(v);for(let i=0;i<fps;i++)game.advanceVehicles(1/fps,.8*speed/fps);
 near(game.motionDistance(v)-start,2.7*speed,1e-7);
}

console.log(JSON.stringify({motionGeometryCombinations:combinations,widthTransitions:true,unobstructedSpeedCases:12,passed:true}));
