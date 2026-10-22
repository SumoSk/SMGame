'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('world');
let renderer3d=null;try{if(window.createTrafficRenderer)renderer3d=window.createTrafficRenderer(canvas);}catch(e){console.error('3D renderer:',e);}
const ctx=renderer3d?null:canvas.getContext('2d');
const W=300,H=300,T=18,DIR=[[1,0],[0,1],[-1,0],[0,-1]],fmt=n=>Math.round(n).toLocaleString('th-TH'),money=n=>'฿'+fmt(n);
const ROADS={small:{name:'ถนนเล็ก',lanes:2,cost:50,maint:.5,speed:3,width:2,visualWidth:1.55},medium:{name:'ถนนกลาง',lanes:4,cost:150,maint:1,speed:4.5,width:2,visualWidth:2.35},large:{name:'ถนนใหญ่',lanes:8,cost:600,maint:5,speed:6,width:4,visualWidth:3.72}};
const TRAFFIC_RULES={stopLineOffset:.52,vehicleHalfLength:.28,maxIntersectionLookahead:3,maxIntersectionReservation:3};
const GAME_MINUTES_PER_SECOND=.8;
const CITIES={phuket:{name:'ภูเก็ต',en:'PHUKET ISLAND',sub:'เกาะเล็ก ๆ กับความเป็นไปได้ที่ยิ่งใหญ่',terrain:'island'},bangkok:{name:'กรุงเทพฯ',en:'BANGKOK METROPOLIS',sub:'เชื่อมสองฝั่งเมือง ให้ทุกชีวิตไปต่อ',terrain:'river'},chiangmai:{name:'เชียงใหม่',en:'CHIANG MAI',sub:'เมืองเหนือที่เติบโต ในจังหวะของคุณ',terrain:'mountain'},korat:{name:'โคราช',en:'NAKHON RATCHASIMA',sub:'ประตูสู่อีสาน ทุกเส้นทางเริ่มที่นี่',terrain:'through'}};
const KINDS={hotel:{name:'โรงแรม',icon:'▣',color:'#b8dfe9',roof:'#4f93ad'},home:{name:'บ้าน',icon:'⌂',color:'#e9b871',roof:'#db8558'},shop:{name:'ร้านค้า',icon:'▤',color:'#f4c76c',roof:'#d79c3e'},restaurant:{name:'ร้านอาหาร',icon:'♨',color:'#eaa080',roof:'#c76251'},mall:{name:'ห้าง',icon:'▥',color:'#cee7db',roof:'#5d9c98'},office:{name:'สำนักงาน',icon:'▥',color:'#b9d5da',roof:'#4f8598'},factory:{name:'โรงงาน',icon:'⚙',color:'#c4c9b4',roof:'#7d8c81'},park:{name:'สวน',icon:'♧',color:'#8aba70',roof:'#5b9658'},pub:{name:'ผับ',icon:'♫',color:'#bfa6c8',roof:'#88618e'}};
const CATALOG={};
const catalogData={hotel:[[2,3000,20,0,0,0,2],[3,17500,100,0,0,0,10],[4,65000,350,0,0,0,30]],home:[[2,6000,20,2],[3,35000,100,10],[4,130000,350,30]],shop:[[2,8000,100,0,3,12],[3,24000,250,0,8,35],[4,70000,650,0,18,80]],restaurant:[[3,12000,180,0,5,18],[4,35000,450,0,14,50],[5,85000,900,0,30,95]],mall:[[4,45000,450,0,12,45],[5,95000,1100,0,30,100],[6,190000,2300,0,65,180]],office:[[3,18000,250,0,18],[4,60000,700,0,50],[5,120000,1300,0,90]],factory:[[4,22000,450,0,25],[5,70000,1300,0,65],[6,140000,2400,0,110]],park:[[3,6000,40,0,1,20],[4,18000,140,0,3,60],[5,45000,350,0,8,130]],pub:[[3,14000,200,0,5,18],[4,38000,550,0,13,45],[5,85000,1200,0,28,85]]};
for(const [kind,rows] of Object.entries(catalogData))rows.forEach((r,i)=>{const key=kind+'_'+['small','medium','large'][i];CATALOG[key]={key,kind,name:KINDS[kind].name+['เล็ก','กลาง','ใหญ่'][i],size:r[0],cost:r[1],maint:r[2],residents:r[3]||0,jobs:r[4]||0,service:r[5]||0,beds:r[6]||0};});
// Version 6 of the parking layout is the new v5 architectural masterplan.
// There are exactly two facing stall rows, one continuous aisle, no inner banks.
// Preserve the previous home_large key, existing buildings and all v7 saves.
CATALOG.home_small.name='บ้านรุ่นเก่า 2 คน';
CATALOG.home_medium.name='บ้านรุ่นเก่า 10 คน';
CATALOG.home_large.name='บ้านเล็ก';
CATALOG.home_dual={key:'home_dual',kind:'home',name:'บ้านกลาง',size:5,cost:200000,maint:700,residents:60,jobs:0,service:0,beds:0,dualParking:true};
const PARKING_VERSION=7,LOT_SPEED=1.35;
for(const t of Object.values(CATALOG)){
 t.parkingCapacity=t.beds||t.residents||t.jobs+t.service;
 t.parkingColumns=Math.ceil(t.parkingCapacity/2);
 t.parkingRows=1; // one double-sided bank = exactly two long parallel stall rows
 t.parkingPhysicalRows=2;
 t.parkingPitch=.55; // compact two-sided parallel rows
 t.parkingRowOffset=.94; // keep maneuvering clearance
 t.parkingAisle=t.size+2.13;
 t.plotWidth=Math.ceil(Math.max(t.size+2.5,2.45+t.parkingColumns*t.parkingPitch));
 t.plotHeight=Math.ceil(t.size+4.0);
 t.compactParking=false;
 t.parkingLayout=null;
 if(t.dualParking){t.parkingColumns=30;t.parkingRows=2;t.parkingPhysicalRows=2;t.parkingPitch=.59;t.parkingRowOffset=.88;t.plotWidth=20;t.plotHeight=11;t.parkingAisle=9.15;t.parkingUpperAisle=6.55;t.parkingExitA=18.95;t.parkingExitB=19.60;t.compactParking=true;}
}
function buildingBounds(b){const t=CATALOG[b.key];return (b.rotation||0)%2?{w:t.plotHeight,h:t.plotWidth}:{w:t.plotWidth,h:t.plotHeight};}
function lotPoint(b,u,v){const t=CATALOG[b.key];let x=u,y=v;switch(b.rotation||0){case 1:x=t.plotHeight-v;y=u;break;case 2:x=t.plotWidth-u;y=t.plotHeight-v;break;case 3:x=v;y=t.plotWidth-u;break;}return{x:b.x+x+.5,y:b.y+y+.5};}
function lotSlots(b){
 const t=CATALOG[b.key];if(t.parkingLayout)return t.parkingLayout;
 const slots=[];
 for(let n=0;n<t.parkingCapacity;n++){
  const row=Math.floor(n/t.parkingColumns),col=n%t.parkingColumns;
  const aisle=t.dualParking&&row?t.parkingUpperAisle:t.parkingAisle;
  slots.push({index:n,u:(t.dualParking?1:1.42)+(col+.5)*t.parkingPitch,
   v:aisle+(t.dualParking?-t.parkingRowOffset:row?t.parkingRowOffset:-t.parkingRowOffset),aisle,row,zone:t.dualParking?(row?'B':'A'):null});
 }
 return t.parkingLayout=slots;
}
function lotModel(b){const t=CATALOG[b.key],p=lotPoint(b,t.plotWidth/2,t.size/2+.1);return{...b,x:p.x-.5-t.size/2,y:p.y-.5-t.size/2};}
function parkingSlotPose(b,index){const slot=lotSlots(b)[index];if(!slot)return null;const p=lotPoint(b,slot.u,slot.v),theta=(CATALOG[b.key].dualParking?Math.PI/2:(slot.row?Math.PI/2:-Math.PI/2))+(b.rotation||0)*Math.PI/2;return{...p,angle:Math.atan2(Math.sin(theta)*.78,Math.cos(theta))};}
function citizenCarColor(id){if(state?.citizens.get(id)?.tourist)return '#65c8f2';return ['#f0e8c7','#e5a861','#719ca5','#afc5a2','#bc8fa5','#c8c8c0'][Math.abs(id)%6];}
function parkingSpace(b,cid,allocate=false){
 if(!b.parkingSlots)b.parkingSlots=Array(CATALOG[b.key].parkingCapacity).fill(null);
 let index=b.parkingSlots.indexOf(cid);
 if(index<0&&allocate){
  const t=CATALOG[b.key],bankCount=Array(t.parkingRows).fill(0),bankCapacity=Array(t.parkingRows).fill(0);
  for(let i=0;i<b.parkingSlots.length;i++){
   const bank=t.dualParking?Math.floor(i/t.parkingColumns):Math.floor(i/(2*t.parkingColumns));
   bankCapacity[bank]++;
   if(b.parkingSlots[i]!==null)bankCount[bank]++;
  }
  // Balance parking across banks and stagger columns, instead of filling the
  // first row completely and blocking the next arrival's only approach aisle.
  let best=Infinity;
  const seed=((Math.imul(Number(cid)||0,2654435761)>>>0)%65536)/65536;
  for(let i=0;i<b.parkingSlots.length;i++){
   if(b.parkingSlots[i]!==null)continue;
   const bank=t.dualParking?Math.floor(i/t.parkingColumns):Math.floor(i/(2*t.parkingColumns)),col=i%t.parkingColumns;
   const occupancy=bankCount[bank]/Math.max(1,bankCapacity[bank]);
   const spread=Math.abs((col+.5)/t.parkingColumns-seed);
   const score=occupancy*100+spread*3+bank*.01;
   if(score<best){best=score;index=i;}
  }
  if(index>=0)b.parkingSlots[index]=cid;
 }
 return index;
}
function freeParkingSpace(b,cid){if(!b?.parkingSlots)return;const i=b.parkingSlots.indexOf(cid);if(i>=0)b.parkingSlots[i]=null;}
function parkingFree(b){let incoming=0;for(const v of state.vehicles.values())if(v.toId===b.id&&v.citizenId)incoming++;return Math.max(0,CATALOG[b.key].parkingCapacity-b.parked.size-incoming);}
function parkingIsMoving(cid){const c=state.citizens.get(cid),v=state.vehicles.get(c?.vehicleId);return !!v?.lotPath;}
function parkingPose(v){if(!v.lotPath)return null;return lotPathPose(v.lotPath,v.lotDistance||0);}
function lotPathPose(points,distance){
 let d=Math.max(0,distance);
 const curve=(a,b,c,t)=>{
  const u=1-t,x=u*u*a.x+2*u*t*b.x+t*t*c.x,y=u*u*a.y+2*u*t*b.y+t*t*c.y;
  const dx=u*(b.x-a.x)+t*(c.x-b.x),dy=u*(b.y-a.y)+t*(c.y-b.y);
  return{x,y,angle:Math.atan2(dy*.78,dx)};
 };
 const bend=(a,b,c)=>{
  const x=b.x-a.x,y=b.y-a.y,p=c.x-b.x,q=c.y-b.y,la=Math.hypot(x,y),lb=Math.hypot(p,q);
  if(la<.12||lb<.12||Math.abs(x*q-y*p)<.08*la*lb)return null;
  return{r:Math.min(.14,la*.25,lb*.25),ux:x/la,uy:y/la,vx:p/lb,vy:q/lb};
 };
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);
  const prev=i>1?bend(points[i-2],a,b):null;
  const next=i+1<points.length?bend(a,b,points[i+1]):null;
  if(prev&&d<=prev.r){
   const r=prev.r,p={x:a.x-prev.ux*r,y:a.y-prev.uy*r},q={x:a.x+prev.vx*r,y:a.y+prev.vy*r};
   return curve(p,a,q,Math.max(0,Math.min(1,(d+r)/(2*r))));
  }
  if(d<=len||i===points.length-1){
   if(next&&d>=len-next.r){
    const r=next.r,p={x:b.x-next.ux*r,y:b.y-next.uy*r},q={x:b.x+next.vx*r,y:b.y+next.vy*r};
    return curve(p,b,q,Math.max(0,Math.min(1,(d-(len-r))/(2*r))));
   }
   const t=len?Math.max(0,Math.min(1,d/len)):1;
   return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2((b.y-a.y)*.78,b.x-a.x)};
  }
  d-=len;
 }
 return{...points[0],angle:0};
}
function lotPathLength(points){let n=0;for(let i=1;i<points.length;i++)n+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return n;}
// Each car occupies its physical space; unrelated aisles remain free.
function lotCarsOverlap(a,b,margin=.035){
 const dx=b.x-a.x,dy=b.y-a.y,hl=.285+margin,hw=.13+margin;
 // A long two-row lot can have hundreds of parked cars. Reject distant
 // objects before allocating the oriented axes and calling sin/cos.
 if(dx*dx+dy*dy>4*(hl*hl+hw*hw))return false;
 const angle=p=>Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle)),aa=angle(a),ba=angle(b);
 const axes=[[Math.cos(aa),Math.sin(aa)],[-Math.sin(aa),Math.cos(aa)],
             [Math.cos(ba),Math.sin(ba)],[-Math.sin(ba),Math.cos(ba)]];
 for(const [x,y] of axes){
  const ra=hl*Math.abs(x*Math.cos(aa)+y*Math.sin(aa))+hw*Math.abs(-x*Math.sin(aa)+y*Math.cos(aa));
  const rb=hl*Math.abs(x*Math.cos(ba)+y*Math.sin(ba))+hw*Math.abs(-x*Math.sin(ba)+y*Math.cos(ba));
  if(Math.abs(dx*x+dy*y)>=ra+rb)return false;
 }
 return true;
}
function lotClear(v,pose,ignoreRoadTraffic=false){
 for(const other of state.vehicles.values()){
  if(other.id===v.id||other.lotBuilding!==v.lotBuilding||!other.lotPath)continue;
  if(lotCarsOverlap(pose,parkingPose(other)))return false;
 }
 // The first/last metres of the driveway are shared with live road traffic.
 // A car leaving or entering the lot must not ignore vehicles on the street.
 const b=state.buildings.get(v.lotBuilding);
 if(!ignoreRoadTraffic&&b&&['departing','parking_out'].includes(v.phase)){
  const t=CATALOG[b.key],entrance=lotPoint(b,.45,t.plotHeight),exit=lotPoint(b,t.dualParking?t.parkingExitB:t.plotWidth-.45,t.plotHeight);
  if(v.phase==='parking_out'||Math.min(Math.hypot(pose.x-entrance.x,pose.y-entrance.y),Math.hypot(pose.x-exit.x,pose.y-exit.y))<1.15)
   for(const other of state.vehicles.values()){
    if(other.id===v.id||!['driving','stuck','parking_out','parking_in','departing'].includes(other.phase))continue;
    if(other.lotBuilding===b.id&&other.lotPath)continue;
    const p=vehiclePosition(other);
    if(p&&Math.hypot(p.x-pose.x,p.y-pose.y)<1.1&&lotCarsOverlap(pose,p,.045))return false;
   }
 }
 if(b)for(const cid of b.parked){
  if(cid===v.citizenId||parkingIsMoving(cid))continue;const p=parkingSlotPose(b,parkingSpace(b,cid));if(p&&Math.abs(p.x-pose.x)<1&&Math.abs(p.y-pose.y)<1&&lotCarsOverlap(pose,p,CATALOG[b.key].dualParking?0:.015))return false;
 }
 return true;
}
function canLeaveParkingSpace(v,points){
 // Reserve enough room to clear the bay before joining the one-way aisle.
 const mergeLength=lotPathLength(points.slice(0,2))+.7;
 for(const other of state.vehicles.values()){
  if(other.id===v.id||other.lotBuilding!==v.lotBuilding||!other.lotPath)continue;
  for(let d=0;d<=mergeLength;d+=.12){const p=lotPathPose(points,d);
   for(let ahead=0;ahead<=1.5;ahead+=.15)if(lotCarsOverlap(p,lotPathPose(other.lotPath,(other.lotDistance||0)+ahead),.06))return false;
  }
 }return true;
}
function parkingAccess(b){
 const t=CATALOG[b.key],bounds=buildingBounds(b),center=lotPoint(b,t.plotWidth/2,t.plotHeight/2),entry=lotPoint(b,.45,t.plotHeight),exit=lotPoint(b,t.dualParking?t.parkingExitB:t.plotWidth-.45,t.plotHeight),candidates=[];
 for(let y=b.y-1;y<=b.y+bounds.h;y++)for(let x=b.x-1;x<=b.x+bounds.w;x++){
  const side=(b.rotation||0)===0?y===b.y+bounds.h:(b.rotation||0)===1?x===b.x-1:(b.rotation||0)===2?y===b.y-1:x===b.x+bounds.w;
  if(!side||!valid(x,y))continue;const node=owner(id(x,y)),r=state.roads.get(node);if(!r||candidates.some(a=>a.node===node)||junction(node)>=3)continue;
  const [nx,ny]=xy(node),dx=center.x-(nx+.5),dy=center.y-(ny+.5),prev=[],next=[];
  for(const neighbor of r.links){const [px,py]=xy(neighbor),ax=nx-px,ay=ny-py;if(ay*dx-ax*dy>.1)prev.push(neighbor);const ex=px-nx,ey=py-ny;if(ey*dx-ex*dy>.1)next.push(neighbor);}
  if(prev.length&&next.length)candidates.push({node,prev,next,x:nx+.5,y:ny+.5});
 }
 const choose=(p,other)=>candidates.filter(a=>a.node!==other).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 const a=choose(entry);if(!a)return [];
 const tangent=(p,a)=>(b.rotation||0)%2?Math.abs(p.y-a.y):Math.abs(p.x-a.x);
 if(tangent(entry,a)>1.1)return [];
 if(t.dualParking){
  const pa=lotPoint(b,t.parkingExitA,t.plotHeight),pb=lotPoint(b,t.parkingExitB,t.plotHeight);
  const first=candidates.filter(c=>c.node!==a.node).sort((x,y)=>Math.hypot(x.x-pa.x,x.y-pa.y)-Math.hypot(y.x-pa.x,y.y-pa.y))[0];
  const second=candidates.filter(c=>c.node!==a.node&&c.node!==first?.node).sort((x,y)=>Math.hypot(x.x-pb.x,x.y-pb.y)-Math.hypot(y.x-pb.x,y.y-pb.y))[0];
  if(!first||!second||tangent(pa,first)>1.1||tangent(pb,second)>1.1)return [];
  return [{...a,entry:true,exit:false},{...first,entry:false,exit:true,zone:'A'},{...second,entry:false,exit:true,zone:'B'}];
 }
 const z=choose(exit,a.node);if(!z||tangent(exit,z)>1.1)return [];
 return [{...a,entry:true,exit:false},{...z,entry:false,exit:true}];
}
function checkParkingBuilding(key,x,y){
 const t=CATALOG[key];if(!t||['home_small','home_medium'].includes(key))return{error:'อาคารบ้านรุ่นนี้หยุดให้สร้างแล้วค่ะ'};
 if(state.money<0||state.money-t.cost< -10000)return{error:'งบประมาณไม่พอสำหรับอาคารนี้ค่ะ'};
 let error='วางด้านทางเข้าออกของลานจอดให้ชิดถนนที่ยาวพอค่ะ';
 for(let rotation=0;rotation<4;rotation++){
  const b={key,x,y,rotation},bounds=buildingBounds(b);if(!valid(x,y)||!valid(x+bounds.w-1,y+bounds.h-1)){error='พื้นที่อาคารและลานจอดต้องอยู่ในแผนที่ค่ะ';continue;}
  let blocked=false;for(let yy=y;yy<y+bounds.h&&!blocked;yy++)for(let xx=x;xx<x+bounds.w;xx++){const i=id(xx,yy);if(state.footprint[i]>=0||state.buildGrid[i]>=0){blocked=true;break;}}
  if(blocked){error='พื้นที่อาคารและลานจอดทับถนนหรือสิ่งปลูกสร้างค่ะ';continue;}
  const access=parkingAccess(b);if(access.length)return{access,rotation,bounds};
 }
 return{error};
}
function markBuildingPlot(b,value){const {w,h}=buildingBounds(b);for(let yy=b.y;yy<b.y+h;yy++)for(let xx=b.x;xx<b.x+w;xx++)state.buildGrid[id(xx,yy)]=value;}

// Parking exit arbitration: normal movement never ghosts. A recovery permit
// ignores exactly one mutually blocking parking car, never other road cars.
const PARKING_MERGE_RULES={priorityAfter:3,deadlockAfter:2,exitClearance:1.05};
let parkingMerges=[];
function parkingEscapePair(road,otherId){
 const parked=state.vehicles.get(otherId);
 return !!parked&&road.parkingEscapeFor===otherId&&parked.mergeEscapeId===road.id;
}
function mergeSamples(v){
 const points=[];
 if(v.lotPath){const len=lotPathLength(v.lotPath);for(let s=v.lotDistance||0;s<len;s+=.12)points.push(lotPathPose(v.lotPath,s));points.push(lotPathPose(v.lotPath,len));}
 const plan=motionPlan(v),end=Math.min(plan.total,PARKING_MERGE_RULES.exitClearance);
 for(let s=0;s<end;s+=.12)points.push(positionOnMotion(plan,s));
 points.push(positionOnMotion(plan,end));return points;
}
function mergeTouches(samples,pose){return !!pose&&samples.some(p=>lotCarsOverlap(p,pose,.07));}
function mergeRoadKeys(v){
 const plan=motionPlan(v),keys=[];
 for(let k=0;k<v.path.length;k++){
  keys.push(occKey(v.path[k],motionDirection(v.path,k),plannedLane(v,k)));
  if(plan.nodes[k]>=PARKING_MERGE_RULES.exitClearance)break;
 }
 return keys;
}
function parkingClaimed(key,vid){
 return parkingMerges.some(g=>g.v.id!==vid&&g.v.mergeCommitted&&g.keys.includes(key)&&!parkingEscapePair(state.vehicles.get(vid)||{},g.v.id));
}
function parkingRoadLimit(v,plan,s,lookahead){
 let limit=Infinity;
 for(const gate of parkingMerges){
  const p=gate.v;
  if(p.id===v.id||!gate.priority||parkingEscapePair(v,p.id)||gate.admitted.includes(v.id))continue;
  // A car already inside must be able to leave; block only approaching cars.
  if(mergeTouches(gate.samples,positionOnMotion(plan,s)))continue;
  const end=Math.min(plan.total,s+lookahead);
  for(let n=s+.08;n<=end+.079;n+=.08){
   const at=Math.min(n,end);
   if(mergeTouches(gate.samples,positionOnMotion(plan,at))){limit=Math.min(limit,Math.max(s,at-.12));break;}
  }
 }
 return limit;
}
function prepareParkingMerges(dt){
 parkingMerges=[];
 for(const v of state.vehicles.values()){
  // Drop the old blanket ghost exception, including in existing saves.
  if(v.phase==='driving'&&v.mergeGhostUntil!=null)v.mergeExitActive=true;
  v.mergeGhostUntil=null;
  if(v.phase!=='parking_out'&&!(v.phase==='driving'&&v.mergeExitActive)){
   v.mergeEscapeId=null;v.mergeExitActive=false;v.mergeCommitted=false;continue;
  }
  if(v.phase==='driving'&&motionDistance(v)>=Math.min(motionPlan(v).total,PARKING_MERGE_RULES.exitClearance)){
   v.mergeExitActive=false;v.mergeCommitted=false;v.mergeEscapeId=null;v.mergeAdmitted=[];continue;
  }
  if(v.mergePolicy!==2){v.mergePolicy=2;v.mergeCommitted=!!(v.lotDistance>0||v.phase==='driving');v.mergeWaitSeconds=0;v.mergeAdmitted=null;}
  v.mergeWaitSeconds=(v.mergeWaitSeconds||0)+dt;
  const samples=mergeSamples(v),priority=v.mergeCommitted||v.mergeWaitSeconds>=PARKING_MERGE_RULES.priorityAfter;
  if(priority&&!v.mergeDrainStarted){v.mergeDrainStarted=true;v.mergeAdmitted=[...state.vehicles.values()].filter(o=>o.id!==v.id&&['driving','stuck','parking_in'].includes(o.phase)&&mergeTouches(samples,vehiclePosition(o))).map(o=>o.id);}
  v.mergeAdmitted=(v.mergeAdmitted||[]).filter(id=>{const o=state.vehicles.get(id);return o&&mergeTouches(samples,vehiclePosition(o));});
  parkingMerges.push({v,samples,priority,admitted:v.mergeAdmitted,keys:mergeRoadKeys(v)});
 }
 // Resolve overlapping driveways deterministically: older request first.
 parkingMerges.sort((a,b)=>(b.v.mergeWaitSeconds||0)-(a.v.mergeWaitSeconds||0)||a.v.id-b.v.id);
 for(const gate of parkingMerges){
  const v=gate.v;
  if(v.mergeEscapeId){
   const road=state.vehicles.get(v.mergeEscapeId);
   if(!road||road.phase!=='driving'||!mergeTouches(gate.samples,vehiclePosition(road))){
    if(road)road.parkingEscapeFor=null;
    v.mergeEscapeId=null;v.mergeBlockSeconds=0;
   }else{road.parkingEscapeFor=v.id;continue;}
  }
  const pose=vehiclePosition(v),previous=v.mergeLastPose;
  v.mergeLastPose={x:pose.x,y:pose.y};
  if(!previous||Math.hypot(previous.x-pose.x,previous.y-pose.y)>.001){v.mergeBlockSeconds=0;v.mergeBlockRoad=null;continue;}
  const candidate=[...state.vehicles.values()].find(road=>{
   if(road.id===v.id||road.phase!=='driving'||road.mergeExitActive||road.parkingEscapeFor||(road.speed||0)>.05)return false;
   const plan=motionPlan(road),s=motionDistance(road,plan);
   // Both vehicles' immediate forward footprints must block one another.
   const blockedByParking=[0,.12,.28,.48].some(d=>capsulesOverlap(positionOnMotion(plan,Math.min(plan.total,s+d)),pose));
   const next=v.lotPath?lotPathPose(v.lotPath,Math.min(lotPathLength(v.lotPath),(v.lotDistance||0)+.12)):positionOnMotion(motionPlan(v),Math.min(motionPlan(v).total,motionDistance(v)+.12));
   return blockedByParking&&lotCarsOverlap(next,vehiclePosition(road),.07);
  });
  if(!candidate){v.mergeBlockSeconds=0;v.mergeBlockRoad=null;continue;}
  if(v.mergeBlockRoad!==candidate.id){v.mergeBlockRoad=candidate.id;v.mergeBlockSeconds=0;}
  v.mergeBlockSeconds=(v.mergeBlockSeconds||0)+dt;
  if(v.mergeBlockSeconds<PARKING_MERGE_RULES.deadlockAfter)continue;
  // Merely waiting at a red light or behind another car is not a mutual lock.
  candidate.parkingEscapeFor=v.id;v.mergeEscapeId=candidate.id;
  const plan=motionPlan(candidate),s=motionDistance(candidate,plan),barrier=motionBarrier(candidate,plan,s,.15);
  if(barrier.limit<=s+.05){candidate.parkingEscapeFor=null;v.mergeEscapeId=null;continue;}
  gate.priority=true;
  if(!gate.admitted.includes(candidate.id))gate.admitted.push(candidate.id);
 }
 for(const road of state.vehicles.values())if(road.parkingEscapeFor&&!parkingEscapePair(road,road.parkingEscapeFor))road.parkingEscapeFor=null;
}
// Driveway admission now checks only the single road tile immediately ahead.
// Parking aisle collisions remain governed by advanceLot/lotClear as each car moves.
function canCommitParkingMerge(v){
 const own=parkingMerges.find(g=>g.v===v);
 if(!own||!parkingMergeClear(v))return false;
 v.mergeCommitted=true;own.priority=true;return true;
}
function parkingMergeClear(v){
 if(!v.lotPath||!v.path?.[1])return false;
 const node=v.path[0],d=motionDirection(v.path,0),lane=plannedLane(v,0);
 if(!cellAvailable(node,d,lane,v.id))return false;
 // Only check the physical merge point of that same tile, not the whole driveway or road ahead.
 const entry=positionOnMotion(motionPlan(v),0);
 for(const other of state.vehicles.values()){
  if(other.id===v.id||!['driving','stuck','parking_out','parking_in'].includes(other.phase))continue;
  const p=vehiclePosition(other);
  if(p&&Math.hypot(p.x-entry.x,p.y-entry.y)<.85&&lotCarsOverlap(entry,p,.04))return false;
 }
 return true;
}
function advanceLot(v,dt,maxDistance=Infinity,ignoreRoadTraffic=false){
 const total=lotPathLength(v.lotPath),target=Math.min(total,maxDistance,(v.lotDistance||0)+LOT_SPEED*dt);let distance=v.lotDistance||0;
 // Small swept steps also protect queues when the game runs at high speed.
 while(distance<target-1e-8){const next=Math.min(target,distance+.04);if(!lotClear(v,lotPathPose(v.lotPath,next),ignoreRoadTraffic)){v.stopReason='รอรถข้างหน้าในลานจอด';break;}distance=next;v.lastMovedAt=state.time;}
 v.lotDistance=distance;return distance>=total-1e-7;
}
function parkingBankBusy(b,index,arriving){
 // A single continuous eastbound aisle carries inbound and outbound traffic.
 // Never lock the entire 100+ car strip for an opposing car in a distant bay.
 // Swept footprint collision checks in lotClear/canLeaveParkingSpace serialize
 // merges locally at the exact physical conflict, without cross-bank deadlocks.
 const target=lotSlots(b)[index];
 if(!target)return false;
 for(const other of state.vehicles.values()){
  if(!other.lotPath||other.lotBuilding!==b.id)continue;
  const otherIndex=b.parkingSlots?.indexOf(other.citizenId)??-1;
  if(otherIndex<0)continue;
  const occupied=lotSlots(b)[otherIndex];
  if(occupied&&(!CATALOG[b.key].dualParking||occupied.zone===target.zone)&&Math.abs(occupied.u-target.u)<.45&&occupied.index!==index)return true;
 }
 return false;
}
function prepareLotDeparture(v,dt){
 const b=state.buildings.get(v.fromId);if(!b)return true;
 if(v.lotReady)return true;
 if(!v.lotPath){
  const index=parkingSpace(b,v.citizenId,true),slot=lotSlots(b)[index];if(!slot){v.stopReason='ไม่พบช่องจอดของรถ';return false;}
  if(parkingBankBusy(b,index,false)){v.stopReason='รอรถเข้าจอดในแถวเดียวกัน';return false;}
  const t=CATALOG[b.key],exitU=t.dualParking?(slot.zone==='A'?t.parkingExitA:t.parkingExitB):t.plotWidth-.45;v.lotPath=[parkingSlotPose(b,index),lotPoint(b,slot.u,slot.aisle),lotPoint(b,exitU,slot.aisle),lotPoint(b,exitU,t.plotHeight-.9)];v.lotDistance=0;v.lotBuilding=b.id;
  if(!canLeaveParkingSpace(v,v.lotPath)){v.lotPath=null;v.stopReason='รอทางว่างเพื่อออกจากช่องจอด';return false;}
 }
 v.stopReason='กำลังออกจากช่องจอด';if(!advanceLot(v,dt))return false;v.lotReady=true;v.stopReason='รอถนนว่างเพื่อออกจากลาน';return true;
}
// Keep parking claims exclusive, and replace one only after finding a viable
// forward bay. A car already in the one-way aisle must never reverse or teleport.
function localParkingPoint(b,p){
 const t=CATALOG[b.key],x=p.x-b.x-.5,y=p.y-b.y-.5;
 switch(b.rotation||0){
  case 1:return {u:y,v:t.plotHeight-x};
  case 2:return {u:t.plotWidth-x,v:t.plotHeight-y};
  case 3:return {u:t.plotWidth-y,v:x};
  default:return {u:x,v:y};
 }
}
function parkingArrivalPath(v,b,index,replan=false){
 const t=CATALOG[b.key],slot=lotSlots(b)[index];
 if(!slot)return null;
 const end=parkingSlotPose(b,index),aisle=lotPoint(b,slot.u,slot.aisle);
 if(!replan){
  const start=positionOnMotion(motionPlan(v),motionPlan(v).total);
  return [start,lotPoint(b,.45,t.plotHeight-.4),lotPoint(b,.45,slot.aisle),aisle,end];
 }
 const start=parkingPose(v);if(!start)return null;
 const local=localParkingPoint(b,start);
 if(slot.u<local.u+.8)return null;
 if(local.u>.85&&Math.abs(local.v-slot.aisle)>.65)return null;
 const approachU=Math.min(slot.u-.35,Math.max(local.u+.12,.75));
 if(t.dualParking&&local.u<.85&&Math.abs(local.v-slot.aisle)>.15)
  return [start,lotPoint(b,.45,slot.aisle),lotPoint(b,approachU,slot.aisle),aisle,end];
 return [start,lotPoint(b,approachU,slot.aisle),aisle,end];
}
function parkingBayObstructed(v,b,index){
 const pose=parkingSlotPose(b,index);if(!pose)return true;
 for(const cid of b.parked){
  if(cid===v.citizenId||parkingIsMoving(cid))continue;
  const other=parkingSlotPose(b,parkingSpace(b,cid));
  if(other&&lotCarsOverlap(pose,other,CATALOG[b.key].dualParking?0:.03))return true;
 }
 for(const other of state.vehicles.values()){
  if(other.id===v.id||other.lotBuilding!==b.id||!other.lotPath)continue;
  if(b.parkingSlots?.indexOf(other.citizenId)===index)return true;
  const actual=parkingPose(other);
  if(actual&&lotCarsOverlap(pose,actual,.06))return true;
 }
 return false;
}
function assignArrivalParking(v,replan=false,includeOld=false){
 const b=state.buildings.get(v.toId);if(!b||!v.citizenId)return false;
 if(!b.parkingSlots)b.parkingSlots=Array(CATALOG[b.key].parkingCapacity).fill(null);
 // Preserve the existing staggered allocation policy for the first choice.
 if(!replan&&!CATALOG[b.key].dualParking&&b.parkingSlots.indexOf(v.citizenId)<0)parkingSpace(b,v.citizenId,true);
 const old=b.parkingSlots.indexOf(v.citizenId),slots=lotSlots(b);
 const current=replan?localParkingPoint(b,parkingPose(v)):null;
 const options=[];
 for(let i=0;i<slots.length;i++){
  if(b.parkingSlots[i]!==null&&b.parkingSlots[i]!==v.citizenId)continue;
  if(replan&&i===old&&!includeOld)continue;
  if(replan&&slots[i].u<(current?.u??0)+.8)continue;
  options.push(i);
 }
 const dual=CATALOG[b.key].dualParking,zoneLoad=[0,0];
 if(dual)for(let i=0;i<slots.length;i++)if(b.parkingSlots[i]!=null)zoneLoad[slots[i].row]++;
 options.sort((a,b)=>{
  if(!replan){if(a===old)return -1;if(b===old)return 1;}
  if(dual&&!replan)return zoneLoad[slots[a].row]-zoneLoad[slots[b].row]||slots[a].u-slots[b].u||a-b;
  if(dual&&replan&&current?.u>.85)return Math.abs(slots[a].aisle-current.v)-Math.abs(slots[b].aisle-current.v)||slots[a].u-slots[b].u||a-b;
  return (slots[a].u-(current?.u??.45))-(slots[b].u-(current?.u??.45))||a-b;
 });
 for(const i of options){
  if(parkingBankBusy(b,i,true)||parkingBayObstructed(v,b,i))continue;
  const path=parkingArrivalPath(v,b,i,replan);if(!path)continue;
  const prevPath=v.lotPath,prevDistance=v.lotDistance,prevBuilding=v.lotBuilding;
  v.lotPath=path;v.lotDistance=0;v.lotBuilding=b.id;
  if(!lotClear(v,parkingPose(v))){
   v.lotPath=prevPath;v.lotDistance=prevDistance;v.lotBuilding=prevBuilding;continue;
  }
  if(old>=0&&old!==i)b.parkingSlots[old]=null;
  b.parkingSlots[i]=v.citizenId;
  v.lotReady=false;v.parkingReplanAt=state.time+2;
  v.stopReason=old>=0&&old!==i?'เปลี่ยนช่องจอดใหม่อัตโนมัติ':'กำลังเข้าจอด';
  return true;
 }
 return false;
}
function beginParkingArrival(v){
 const b=state.buildings.get(v.toId);if(!b||!v.citizenId)return false;
 // Admit the car into the driveway before selecting a parking stall. The
 // entrance is not a parking queue, and lack of a bay must not block the road.
 const t=CATALOG[b.key],entry=positionOnMotion(motionPlan(v),motionPlan(v).total);
 v.lotPath=t.dualParking?[entry,lotPoint(b,.45,t.plotHeight-.4),lotPoint(b,.45,t.parkingAisle)]
  :[entry,lotPoint(b,.45,t.plotHeight-.4),lotPoint(b,.45,t.parkingAisle),lotPoint(b,.72,t.parkingAisle)];
 v.lotDistance=0;v.lotBuilding=b.id;v.parkingStage=true;v.parkingReplanAt=state.time;
 v.phase='parking_in';v.speed=0;v.stopReason='กำลังเข้าลานจอด';
 return true;
}
function cleanupParkingVehicle(v,keepDestination=false){
 for(const b of state.buildings.values()){
  if(b.id===v.fromId&&!b.parked.has(v.citizenId))freeParkingSpace(b,v.citizenId);
  if(b.id===v.toId&&!keepDestination&&!b.parked.has(v.citizenId))freeParkingSpace(b,v.citizenId);
 }
}
function syncParkingSlots(){for(const b of state.buildings.values()){if(!b.parkingSlots)b.parkingSlots=Array(CATALOG[b.key].parkingCapacity).fill(null);const entering=new Set([...state.vehicles.values()].filter(v=>v.toId===b.id&&v.phase==='parking_in').map(v=>v.citizenId));for(let i=0;i<b.parkingSlots.length;i++){const cid=b.parkingSlots[i];if(cid!==null&&!b.parked.has(cid)&&!entering.has(cid))b.parkingSlots[i]=null;}for(const cid of b.parked)parkingSpace(b,cid,true);}}
function parkingVisuals(b){
 const t=CATALOG[b.key],rects=[];
 const rect=(u,v,w,h,color)=>rects.push({u,v,w,h,color});
 rect(t.plotWidth/2,t.plotHeight/2,t.plotWidth-.05,t.plotHeight-.05,'#bdc6ae');
 if(t.dualParking){
  // TRUE independent parking zones: two vertical stall rows of 30, each with
  // its OWN eastbound aisle. Only the left-hand driveway is shared.
  const slots=lotSlots(b);
  for(const zone of ['A','B']){
   const aisle=zone==='A'?t.parkingAisle:t.parkingUpperAisle;
   const end=zone==='A'?t.parkingExitA:t.parkingExitB;
   const color=zone==='A'?'#515f62':'#465e65';
   rect((.78+end)/2,aisle,end-.78,1.02,color);
   // Painted longitudinal boundaries and directional arrows visibly divide zones.
   rect((.78+end)/2,aisle-.55,end-.78,.028,'#c5d2c2');
   rect((.78+end)/2,aisle+.55,end-.78,.028,'#c5d2c2');
   for(const slot of slots)if(slot.zone===zone){
    rect(slot.u-t.parkingPitch/2,slot.v,.023,1.05,'#e9e6cc');
    rect(slot.u+t.parkingPitch/2,slot.v,.023,1.05,'#e9e6cc');
    rect(slot.u,slot.v-.53,t.parkingPitch-.04,.024,'#e9e6cc');
   }
   for(let u=1.2;u<end-1;u+=2.1){
    rect(u,aisle,.46,.028,'#c5d2c2');
    rect(u+.18,aisle-.10,.19,.024,'#c5d2c2');
    rect(u+.18,aisle+.10,.19,.024,'#c5d2c2');
   }
   // Colour-coded A/B route markers at the shared driveway fork.
   rect(1.15,aisle, .35,.24,zone==='A'?'#f1ca85':'#86d1dc');
  }
  rect(.45,(t.parkingUpperAisle+t.plotHeight)/2,.67,t.plotHeight-t.parkingUpperAisle+.08,'#58666a');
  rect(.45,t.plotHeight-.43,.50,.09,'#94d9aa');
  // Zone B exit runs OUTSIDE the full end of Zone A's aisle, so the paths
  // remain parallel and never cross one another after the shared entrance.
  for(const [u,aisle,zone] of [[t.parkingExitA,t.parkingAisle,'A'],[t.parkingExitB,t.parkingUpperAisle,'B']]){
   rect(u,(aisle+t.plotHeight)/2,.52,t.plotHeight-aisle+.08,'#58666a');
   rect(u,(aisle+t.plotHeight)/2,.026,t.plotHeight-aisle,'#bbc9b9');
   rect(u,t.plotHeight-.43,.50,.09,'#f3ca88');
   rect(u,aisle,.31,.20,zone==='A'?'#f1ca85':'#86d1dc');
  }
  return rects;
 }
 const front=t.size+.22,bottom=t.plotHeight-.12,aisle=t.parkingAisle;
 rect(t.plotWidth/2,(front+bottom)/2,t.plotWidth-.12,bottom-front,'#515f62');
 // Exactly two perimeter stall rows. The center lane is a single continuous
 // eastbound aisle, with no crossroads, internal parking banks or crossovers.
 for(const row of [0,1]){
  const rowV=aisle+(row?t.parkingRowOffset:-t.parkingRowOffset);
  for(let col=0;col<t.parkingColumns;col++){
   const stall=lotSlots(b)[row*t.parkingColumns+col];if(!stall)continue;
   rect(stall.u-t.parkingPitch/2,rowV,.025,1.24,'#e9e6cc');
   rect(stall.u+t.parkingPitch/2,rowV,.025,1.24,'#e9e6cc');
   rect(stall.u,rowV+(row?.62:-.62),t.parkingPitch-.04,.025,'#e9e6cc');
  }
 }
 // Directional lane markings and very long uninterrupted sight lines.
 for(let u=1.1;u<t.plotWidth-1.1;u+=2.1){
  rect(u,aisle,.58,.035,'#c5d2c2');
  rect(u+.21,aisle-.11,.20,.03,'#c5d2c2');
  rect(u+.21,aisle+.11,.20,.03,'#c5d2c2');
 }
 // Short lead-ins at opposite ends link the central strip to one road frontage.
 for(const u of [.45,t.plotWidth-.45]){
  rect(u,(aisle+t.plotHeight)/2,.85,t.plotHeight-aisle+.08,'#58666a');
  rect(u,(aisle+t.plotHeight)/2,.026,t.plotHeight-aisle,'#bbc9b9');
 }
 rect(.45,t.plotHeight-.45,.52,.08,'#94d9aa');
 rect(t.plotWidth-.45,t.plotHeight-.45,.52,.08,'#f3ca88');
 for(const u of [1.05,t.plotWidth-1.05])rect(u,t.plotHeight-.66,.12,.38,'#e5e6d0');
 return rects;
}
function drawParking2D(b){for(const r of parkingVisuals(b)){const points=[[r.u-r.w/2,r.v-r.h/2],[r.u+r.w/2,r.v-r.h/2],[r.u+r.w/2,r.v+r.h/2],[r.u-r.w/2,r.v+r.h/2]].map(([u,v])=>{const p=lotPoint(b,u,v);return screen(p.x-.5,p.y-.5);});poly(points,r.color);}for(const cid of b.parked||[]){if(parkingIsMoving(cid))continue;const i=parkingSpace(b,cid),p=parkingSlotPose(b,i);if(p){const q=screen(p.x,p.y);drawCarShape(q[0],q[1],p.angle,citizenCarColor(cid),cam.z);}}}

const runtimeErrors=[];for(const type of ['error','unhandledrejection'])window.addEventListener(type,e=>{runtimeErrors.push({at:new Date().toISOString(),message:String(e.message||e.reason?.stack||e.reason||type).slice(0,4000)});if(runtimeErrors.length>20)runtimeErrors.shift();});
let state,cam={x:150,y:150,z:1.25,angle:Math.PI*.2,elevation:Math.atan2(86,90)},view={w:innerWidth,h:innerHeight,dpr:1},tool='hand',category='roads',selected=null,hover=null,drag=null,heat=false,debug=false,last=0,uiTick=0,news=[],toastTimer,follow=null;
const id=(x,y)=>y*W+x,xy=i=>[i%W,Math.floor(i/W)],valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function reset(city='phuket'){
parkingMerges=[];
state={city,money:500000,time:360,speed:1,roads:new Map(),buildings:new Map(),citizens:new Map(),vehicles:new Map(),signals:new Map(),signalDefaults:{eastWest:6,northSouth:6},footprint:new Int32Array(W*H).fill(-1),buildGrid:new Int32Array(W*H).fill(-1),nextId:1,profileSeq:0,version:0,routeCache:new Map(),occ:new Map(),reservations:new Map(),events:[],lastMinute:359,lastDay:0,lastImmigration:0,lastPass:0,stats:{},alerts:[],roadChanges:[],activeTraffic:new Set(),junctionCache:new Map(),skip:false};
state.plantedTrees=[];state.hiddenAutoTrees=[];state.landscapeVersion=0;
for(let n=0;n<300;n++){state.roads.set(id(150,n),{type:'large',main:true,links:new Set(),load:0,wait:0});state.roads.set(id(n,150),{type:'large',main:true,links:new Set(),load:0,wait:0});}
for(let n=0;n<299;n++){link(id(150,n),id(150,n+1));link(id(n,150),id(n+1,150));}
state.gates=[id(150,0),id(299,150),id(150,299),id(0,150)];rebuildFootprint();cam={x:149,y:149,z:innerWidth<700?.94:1.24,angle:Math.PI*.2,elevation:Math.atan2(86,90)};selected=null;follow=null;news=[];tool='hand';hideCitizenDashboard();hideTouristDashboard();touristSearch='';touristPage=0;touristDashboardAt=0;citizenFilter='all';citizenSearch='';citizenPage=0;if($('citizenSearch'))$('citizenSearch').value='';$('inspector').classList.add('hidden');$('cityName').textContent=CITIES[city].name;$('citySub').textContent=CITIES[city].sub;$('mapLabel').innerHTML=CITIES[city].en+'<small>THAILAND · สร้างเมืองในแบบคุณ</small>';addNews('เริ่มเมืองใหม่ เชื่อมถนน สร้างบ้าน และสร้างงาน');updateUI();renderTools();}
function link(a,b){if(a===b)return;state.roads.get(a)?.links.add(b);state.roads.get(b)?.links.add(a);}
function rebuildFootprint(){state.footprint.fill(-1);for(const [i,r]of state.roads){const [x,y]=xy(i),w=ROADS[r.type].width,lo=Math.floor(w/2);for(let dy=-lo;dy<w-lo;dy++)for(let dx=-lo;dx<w-lo;dx++)if(valid(x+dx,y+dy)){const p=id(x+dx,y+dy);if(state.footprint[p]<0||Math.hypot(dx,dy)<distance(p,state.footprint[p]))state.footprint[p]=i;}}}
function distance(a,b){const p=xy(a),q=xy(b);return Math.hypot(p[0]-q[0],p[1]-q[1]);}
function screen(x,y,h=0){if(renderer3d)return renderer3d.screen(x,y,h);return[(x-cam.x)*T*cam.z+view.w/2,(y-cam.y)*T*cam.z*.78+view.h*.47-h*cam.z];}
function world(x,y){if(renderer3d)return renderer3d.world(x,y);return[(x-view.w/2)/(T*cam.z)+cam.x,(y-view.h*.47)/(T*cam.z*.78)+cam.y];}
function resize(){view={w:innerWidth,h:innerHeight,dpr:Math.min(devicePixelRatio||1,2)};if(renderer3d){renderer3d.resize();return;}canvas.width=Math.round(view.w*view.dpr);canvas.height=Math.round(view.h*view.dpr);ctx.setTransform(view.dpr,0,0,view.dpr,0,0);}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function box(x,y,w,h,height,top,side='#bcbaa0',front='#d8d4b7'){
const a=screen(x,y),b=screen(x+w,y),c=screen(x+w,y+h),d=screen(x,y+h),at=screen(x,y,height),bt=screen(x+w,y,height),ct=screen(x+w,y+h,height),dt=screen(x,y+h,height);
poly([b,c,ct,bt],side);poly([d,c,ct,dt],front);poly([at,bt,ct,dt],top);return{a:at,b:bt,c:ct,d:dt};}
function tree(x,y,s=1){const [px,py]=screen(x,y),z=cam.z*s;ctx.fillStyle='#244c3330';ctx.beginPath();ctx.ellipse(px+7*z,py+3*z,10*z,5*z,0,0,7);ctx.fill();ctx.fillStyle='#927b50';ctx.fillRect(px-z,py-9*z,2*z,9*z);ctx.fillStyle='#548e59';ctx.beginPath();ctx.ellipse(px,py-13*z,8*z,10*z,0,0,7);ctx.fill();ctx.fillStyle='#74a966';ctx.beginPath();ctx.ellipse(px-2*z,py-17*z,6*z,6*z,0,0,7);ctx.fill();}
function drawTerrain(){
ctx.fillStyle='#8bc8c5';ctx.fillRect(0,0,view.w,view.h);const terrain=CITIES[state.city].terrain;
const topLeft=world(0,0),bottomRight=world(view.w,view.h),x0=Math.max(0,Math.floor(topLeft[0]-5)),x1=Math.min(300,Math.ceil(bottomRight[0]+5)),y0=Math.max(0,Math.floor(topLeft[1]-5)),y1=Math.min(300,Math.ceil(bottomRight[1]+8));
if(terrain==='island'){
const coast=[[-8,-12],[72,-12],[84,53],[105,91],[108,125],[96,153],[108,184],[88,225],[71,315],[315,315],[315,-12]].map(([x,y])=>screen(x+24,y));poly(coast,'#f1e0ad');poly(coast.map(([x,y])=>[x+15*cam.z,y]),'#9fbd82');
ctx.strokeStyle='#d0e9d68a';ctx.lineWidth=1;for(let yy=y0;yy<y1;yy+=5){const p=screen(80,yy);ctx.beginPath();ctx.moveTo(p[0]-45*cam.z,p[1]);ctx.quadraticCurveTo(p[0]-30*cam.z,p[1]-3,p[0]-18*cam.z,p[1]);ctx.stroke();}
}else{ctx.fillStyle=terrain==='mountain'?'#adc194':'#b4c99d';ctx.fillRect(0,0,view.w,view.h);if(terrain==='river'){ctx.strokeStyle='#93c9c4';ctx.lineWidth=12*T*cam.z;ctx.beginPath();for(let y=-10;y<=310;y+=4){const p=screen(112+Math.sin(y/29)*8,y);if(y===-10)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.stroke();}}
ctx.strokeStyle=debug||tool!=='hand'?'#4c743220':'#4c743207';ctx.lineWidth=.5;if(cam.z>.48)for(let y=y0;y<y1;y++){const a=screen(x0,y),b=screen(x1,y);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}if(cam.z>.48)for(let x=x0;x<x1;x++){ctx.beginPath();ctx.moveTo(...screen(x,y0));ctx.lineTo(...screen(x,y1));ctx.stroke();}
for(let y=Math.floor(y0/3)*3;y<y1;y+=3)for(let x=Math.floor(x0/3)*3;x<x1;x+=3){const h=Math.abs(Math.sin(x*32.13+y*14.79)),tx=x+Math.sin(x*13+y)*1.1,ty=y+Math.cos(y*9+x)*.8,ix=Math.floor(tx),iy=Math.floor(ty);if(h<.67||!valid(ix,iy)||terrain==='island'&&tx<134||terrain==='river'&&Math.abs(tx-(112+Math.sin(ty/29)*8))<8)continue;if(state.footprint[id(ix,iy)]>=0||state.buildGrid[id(ix,iy)]>=0||(state.hiddenAutoTrees||[]).includes(id(ix,iy)))continue;tree(tx,ty,.6+h*.65);}
}
function dir(a,b){const [x,y]=xy(a),[u,v]=xy(b);return Math.abs(u-x)>=Math.abs(v-y)?u>x?0:2:v>y?1:3;}
function junctionDetails(i){
 if(state.junctionCache.has(i)&&state.junctionLayoutCache?.has(i))return state.junctionLayoutCache.get(i);
 const r=state.roads.get(i);if(!r)return{arms:[],hiddenEdges:[],halfX:0,halfY:0,ports:[],polygon:[]};
 const [cx,cy]=xy(i),raw=new Map(),hiddenEdges=[];
 const width=road=>roadVisualWidth(road?.type),threshold=Math.max(width(r),...[...r.links].map(n=>width(state.roads.get(n))))/2+.3;
 for(const n of r.links){const d=dir(i,n);let current=n,previous=i,travel=distance(i,n),edges=[[i,n]],steps=0;
  while(travel<threshold&&steps++<8){const next=[...(state.roads.get(current)?.links||[])].filter(k=>k!==previous&&dir(current,k)===d).sort((a,b)=>distance(i,b)-distance(i,a))[0];if(next==null)break;edges.push([current,next]);previous=current;current=next;travel=distance(i,current);}
  const arm={dir:d,node:n,width:width(state.roads.get(current)),reach:travel,edges,valid:travel>=threshold||state.gates?.includes(current)};if(!raw.has(d)||raw.get(d).reach<travel)raw.set(d,arm);
 }
 let arms=[...raw.values()];if(arms.length>=3){const valid=arms.filter(a=>a.valid);if(valid.length>=2){for(const a of arms)if(!a.valid)hiddenEdges.push(...a.edges);arms=valid;}}
 const bend=arms.length===2&&arms[0].dir%2!==arms[1].dir%2;
 const rounding=arms.length>=3||bend?Math.min(.55,Math.min(...arms.map(a=>a.width))*.22):0;
 const get=d=>arms.find(a=>a.dir===d)?.width||0,halfX=Math.max(get(1),get(3),arms.length>=3?0:width(r))/2+rounding,halfY=Math.max(get(0),get(2),arms.length>=3?0:width(r))/2+rounding;
 const ports=[];for(const d of [3,0,1,2]){const arm=arms.find(a=>a.dir===d);if(!arm)continue;const h=arm.width/2,points=d===3?[[-h,-halfY],[h,-halfY]]:d===0?[[halfX,-h],[halfX,h]]:d===1?[[h,halfY],[-h,halfY]]:[[-halfX,h],[-halfX,-h]];ports.push({...arm,points,extent:d%2===0?halfX:halfY});}
 const polygon=[],borders=[];
 for(let k=0;k<ports.length;k++){const port=ports[k],next=ports[(k+1)%ports.length],a=port.points[1],b=next.points[0],edge=[a];polygon.push(...port.points);
 if(port.dir%2!==next.dir%2){const c=port.dir%2===0?[b[0],a[1]]:[a[0],b[1]],la=Math.hypot(c[0]-a[0],c[1]-a[1]),lb=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(rounding,la,lb);
  if(r>1e-7){const p=[c[0]+(a[0]-c[0])*r/la,c[1]+(a[1]-c[1])*r/la],q=[c[0]+(b[0]-c[0])*r/lb,c[1]+(b[1]-c[1])*r/lb];edge.push(p);for(let n=1;n<=16;n++){const t=n/16,u=1-t;edge.push([u*u*p[0]+2*u*t*c[0]+t*t*q[0],u*u*p[1]+2*u*t*c[1]+t*t*q[1]]);}}
  else if(la>1e-8&&lb>1e-8)edge.push(c);
 }
 edge.push(b);polygon.push(...edge.slice(1,-1));borders.push(edge);
 }
 const result={node:i,x:cx,y:cy,arms,hiddenEdges,halfX,halfY,ports,polygon,borders,bend,rounding};
 if(!state.junctionLayoutCache)state.junctionLayoutCache=new Map();state.junctionLayoutCache.set(i,result);state.junctionCache.set(i,arms.length);return result;
}
function junction(i){return state.junctionCache.has(i)?state.junctionCache.get(i):junctionDetails(i).arms.length;}
junction.details=junctionDetails;
function drawRoads(){
 const layouts=new Map(),nearby=new Map(),hidden=new Set(),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 for(const [node]of state.roads){const layout=junctionDetails(node);for(const [a,b]of layout.hiddenEdges)hidden.add(edgeKey(a,b));if(layout.arms.length>=3||layout.bend)layouts.set(node,layout);}
 for(const l of layouts.values())for(let yy=Math.floor(l.y-l.halfY-2);yy<=Math.ceil(l.y+l.halfY+2);yy++)for(let xx=Math.floor(l.x-l.halfX-2);xx<=Math.ceil(l.x+l.halfX+2);xx++){const key=id(xx,yy);if(!nearby.has(key))nearby.set(key,[]);nearby.get(key).push(l);}
 const segments=[];
 for(const [i,r]of state.roads)for(const n of r.links){if(n<i||hidden.has(edgeKey(i,n)))continue;const [x,y]=xy(i),[nx,ny]=xy(n),dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy),other=state.roads.get(n);let wa=roadVisualWidth(r.type),wb=roadVisualWidth(other?.type),intervals=[[0,1]];
 for(const l of new Set([...(nearby.get(i)||[]),...(nearby.get(n)||[])])){const horizontal=Math.abs(dx)>Math.abs(dy),d=horizontal?((x+nx)/2>=l.x?0:2):((y+ny)/2>=l.y?1:3),arm=l.arms.find(a=>a.dir===d);if(!arm||(horizontal?Math.abs(y-l.y):Math.abs(x-l.x))>.01)continue;wa=wb=arm.width;let lo=0,hi=1;for(const [start,delta,min,max]of [[x,dx,l.x-l.halfX,l.x+l.halfX],[y,dy,l.y-l.halfY,l.y+l.halfY]]){if(Math.abs(delta)<1e-9){if(start<min||start>max)hi=-1;}else{const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}}if(hi>lo){const next=[];for(const [a,b]of intervals){if(hi<=a||lo>=b)next.push([a,b]);else{if(lo>a)next.push([a,lo]);if(hi<b)next.push([hi,b]);}}intervals=next;}}
 const px=-dy/length,py=dx/length,point=(t,off)=>[x+dx*t+px*off,y+dy*t+py*off];segments.push({r,other,x,y,dx,dy,length,wa,wb,intervals,point});
 for(const [lo,hi]of intervals)for(const border of [.14,0]){const a=wa+(wb-wa)*lo,b=wa+(wb-wa)*hi;poly([point(lo,-a/2-border),point(hi,-b/2-border),point(hi,b/2+border),point(lo,a/2+border)].map(([x,y])=>screen(x+.5,y+.5)),border?'#c9c8b5':heat?roadColor(r):'#47565c');}}
 for(const l of layouts.values())poly(l.polygon.map(([x,y])=>screen(l.x+.5+x,l.y+.5+y)),'#47565c');
 const stroke=(points,color,width=.025,dashed=false)=>{if(points.length<2)return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(...screen(x+.5,y+.5)):ctx.moveTo(...screen(x+.5,y+.5)));ctx.strokeStyle=color;ctx.lineWidth=Math.max(.55,width*T*cam.z);ctx.lineJoin='round';ctx.lineCap='butt';ctx.setLineDash(dashed?[.45*T*cam.z,.55*T*cam.z]:[]);ctx.stroke();ctx.setLineDash([]);};
 const capacity=width=>Math.max(1,(Object.values(ROADS).find(t=>Math.abs(t.visualWidth-width)<.01)?.lanes||2)/2);
 for(const s of segments){const ca=capacity(s.wa),cb=capacity(s.wb);for(const [lo,hi]of s.intervals){const guide=(oa,ob,color,dashed=false)=>stroke([s.point(lo,oa+(ob-oa)*lo),s.point(hi,oa+(ob-oa)*hi)],color,color==='#ead78c'?.018:.025,dashed);for(const sign of [-1,1]){guide(.035*sign,.035*sign,'#ead78c');guide(s.wa/2*sign,s.wb/2*sign,'#dce3d8');for(let k=1;k<Math.max(ca,cb);k++)guide(Math.min(s.wa/2-.1,k*s.wa/(ca*2))*sign,Math.min(s.wb/2-.1,k*s.wb/(cb*2))*sign,'#dce3d8',true);}}}
 for(const l of layouts.values()){
 for(const edge of l.borders){const points=edge.map(([x,y])=>[l.x+x,l.y+y]);stroke(points,'#c9c8b5',.28);stroke(points,'#dce3d8');}
 if(l.bend){const [a,b]=l.ports,va=DIR[a.dir],vb=DIR[b.dir],ca=capacity(a.width),cb=capacity(b.width),guide=(oa,ob,color,dashed=false)=>{const ax=va[0]*a.extent-va[1]*oa,ay=va[1]*a.extent+va[0]*oa,bx=vb[0]*b.extent+vb[1]*ob,by=vb[1]*b.extent-vb[0]*ob,cx=a.dir%2===0?bx:ax,cy=a.dir%2===0?ay:by,points=[];for(let k=0;k<=64;k++){const t=k/64,u=1-t;points.push([l.x+u*u*ax+2*u*t*cx+t*t*bx,l.y+u*u*ay+2*u*t*cy+t*t*by]);}stroke(points,color,color==='#ead78c'?.018:.025,dashed);};for(const sign of [-1,1]){guide(.035*sign,.035*sign,'#ead78c');for(let k=1;k<Math.max(ca,cb);k++)guide(Math.min(a.width/2-.1,k*a.width/(ca*2))*sign,Math.min(b.width/2-.1,k*b.width/(cb*2))*sign,'#dce3d8',true);}}
 else if(cam.z>.4){for(const port of l.ports){const d=port.dir,[vx,vy]=DIR[d],px=-vy,py=vx,offset=port.extent+.13,point=(along,side)=>[l.x+vx*along+px*side,l.y+vy*along+py*side];stroke([point(offset,.06),point(offset,port.width/2-.06)],'#edf0df',.075);const [sx,sy]=screen(...point(offset,port.width/2+.3).map(v=>v+.5));ctx.fillStyle='#263e3a';ctx.fillRect(sx-2*cam.z,sy-4*cam.z,4*cam.z,8*cam.z);ctx.fillStyle=signalColor(l.node,d%2)==='green'?'#a4dc90':signalColor(l.node,d%2)==='yellow'?'#efd581':'#f08b75';ctx.beginPath();ctx.arc(sx,sy,1.7*cam.z,0,7);ctx.fill();}}
 }
 if(selected?.kind==='road'&&junction(selected.id)>=3){const [x,y]=xy(selected.id),p=screen(x+.5,y+.5);ctx.strokeStyle='#fff0a9';ctx.lineWidth=2.5*cam.z;ctx.beginPath();ctx.arc(p[0],p[1],Math.max(12,17*cam.z),0,Math.PI*2);ctx.stroke();}
 if(debug)for(const [i]of state.roads){const [x,y]=xy(i),p=screen(x+.5,y+.5);ctx.fillStyle='#fff';ctx.font=`${9*cam.z}px monospace`;ctx.fillText(String(occupancy(i)),p[0],p[1]);}
}

function roadColor(r){return r.wait>4?'#363b38':r.wait>1?'#e36351':r.load>.75?'#edaa51':r.load>.4?'#dbce68':'#67ab76';}
const SIGNAL_YELLOW_MINUTES=1,SIGNAL_CLEAR_MINUTES=1,SIGNAL_MIN_GREEN=5,SIGNAL_MAX_GREEN=240;
const RECOMMENDED_SIGNAL_GREEN_MINUTES=6;
const signalDefaults=()=>({...state.signalDefaults,mode:'auto',axis:0,holdUntil:0});
function signalSettings(i){return state.signals.get(i)||signalDefaults();}
function signalCycle(i){const s=signalSettings(i);return s.eastWest+s.northSouth+2*(SIGNAL_YELLOW_MINUTES+SIGNAL_CLEAR_MINUTES);}
function signalProgress(i){const cycle=signalCycle(i);return (state.time+(i%17)*cycle/24)%cycle;}
function signalStatus(i){
 const s=signalSettings(i);if(s.holdUntil>state.time)return{phase:-1,yellowAxis:-1,remaining:s.holdUntil-state.time};
 if(s.mode==='manual')return{phase:s.axis,yellowAxis:-1,remaining:null};
 const phase=signalProgress(i),ew=s.eastWest,ns=s.northSouth,yellow=SIGNAL_YELLOW_MINUTES,clear=SIGNAL_CLEAR_MINUTES;
 if(phase<ew)return{phase:0,yellowAxis:-1,remaining:ew-phase};
 if(phase<ew+yellow)return{phase:2,yellowAxis:0,remaining:ew+yellow-phase};
 if(phase<ew+yellow+clear)return{phase:-1,yellowAxis:-1,remaining:ew+yellow+clear-phase};
 if(phase<ew+yellow+clear+ns)return{phase:1,yellowAxis:-1,remaining:ew+yellow+clear+ns-phase};
 if(phase<ew+2*yellow+clear+ns)return{phase:2,yellowAxis:1,remaining:ew+2*yellow+clear+ns-phase};
 return{phase:-1,yellowAxis:-1,remaining:signalCycle(i)-phase};
}
function signalPhase(i){return signalStatus(i).phase;}
function signalColor(i,axis){const s=signalStatus(i);return s.phase===axis?'green':s.phase===2&&s.yellowAxis===axis?'yellow':'red';}
function editSignal(i,changes){
 if(!state.roads.has(i)||junction(i)<3)return false;
 const current=signalSettings(i),next={...current,...changes};
 if(!Number.isInteger(next.eastWest)||next.eastWest<SIGNAL_MIN_GREEN||next.eastWest>SIGNAL_MAX_GREEN||!Number.isInteger(next.northSouth)||next.northSouth<SIGNAL_MIN_GREEN||next.northSouth>SIGNAL_MAX_GREEN||!['auto','manual'].includes(next.mode)||![0,1].includes(next.axis))return false;
 next.holdUntil=next.mode!==current.mode||next.axis!==current.axis?state.time+SIGNAL_CLEAR_MINUTES:current.holdUntil;
 state.signals.set(i,next);return true;
}
function controlSignal(i,action){const s=signalSettings(i);if(action==='manual'){const phase=signalPhase(i);return editSignal(i,{mode:'manual',axis:phase===1?1:phase===0?0:s.axis});}if(action==='switch'&&s.mode==='manual')return editSignal(i,{axis:1-s.axis});if(action==='auto')return editSignal(i,{mode:'auto'});return false;}
function setSignalDefaults(eastWest,northSouth,applyExisting=false){
 if(!Number.isInteger(eastWest)||eastWest<SIGNAL_MIN_GREEN||eastWest>SIGNAL_MAX_GREEN||!Number.isInteger(northSouth)||northSouth<SIGNAL_MIN_GREEN||northSouth>SIGNAL_MAX_GREEN)return false;
 if(!applyExisting)for(const [node] of state.roads)if(junction(node)>=3&&!state.signals.has(node))state.signals.set(node,signalDefaults());
 state.signalDefaults={eastWest,northSouth};
 if(applyExisting)for(const [node] of state.roads)if(junction(node)>=3){const current=signalSettings(node);state.signals.set(node,{...current,eastWest,northSouth});}
 return true;
}
function restoreRecommendedSignals(){
 state.signalDefaults={eastWest:RECOMMENDED_SIGNAL_GREEN_MINUTES,northSouth:RECOMMENDED_SIGNAL_GREEN_MINUTES};
 let count=0;
 for(const [node] of state.roads)if(junction(node)>=3){
  state.signals.set(node,{...signalDefaults(),holdUntil:state.time+SIGNAL_CLEAR_MINUTES});
  count++;
 }
 return count;
}
// A junction tile stores the road used to build it, not the lane count of
// every movement through it. Use the connected outgoing arm for each direction.
function movementRoad(i,d){
 const r=state.roads.get(i);if(d==null||!r)return ROADS[r?.type||'small'];
 const layout=junctionDetails(i);
 const bend=layout.arms.length===2&&layout.arms[0].dir%2!==layout.arms[1].dir%2;
 if(layout.arms.length<3&&!bend)return ROADS[r.type];
 const arm=layout.arms.find(a=>a.dir===d)||layout.arms.find(a=>a.dir===(d+2)%4);
 return arm?Object.values(ROADS).reduce((best,t)=>Math.abs(t.visualWidth-arm.width)<Math.abs(best.visualWidth-arm.width)?t:best,ROADS.small):ROADS[r.type];
}
function laneCapacity(i,d){return Math.max(1,Math.floor(movementRoad(i,d).lanes/2));}
function roadVisualWidth(type){return ROADS[type]?.visualWidth||ROADS.small.visualWidth;}
function laneOffset(i,d,lane){const r=state.roads.get(i),type=movementRoad(i,d),cap=Math.max(1,Math.floor(type.lanes/2)),safeLane=Math.min(cap-1,Math.max(0,Number.isFinite(lane)?lane:0)),width=type.visualWidth,laneWidth=width/(cap*2),across=(safeLane+.5-cap/2)*laneWidth,side=width*.25,dirVector=DIR[d]||DIR[0],length=Math.hypot(dirVector[0],dirVector[1])||1;return{x:(dirVector[1]/length)*(side+across),y:(-dirVector[0]/length)*(side+across)};}
function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function bezierPoint(p0,p1,p2,p3,t){const u=1-t,uu=u*u,tt=t*t;return{x:uu*u*p0.x+3*uu*t*p1.x+3*u*tt*p2.x+tt*t*p3.x,y:uu*u*p0.y+3*uu*t*p1.y+3*u*tt*p2.y+tt*t*p3.y};}
function bezierTangent(p0,p1,p2,p3,t){const u=1-t;return{x:3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x),y:3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y)};}
function signalAllows(i,entering){const phase=signalPhase(i);return phase>=0&&phase<2&&phase===entering%2;}
function stopProgress(v,pos){const node=v.path[pos],prev=v.path[Math.max(0,pos-1)];if(node==null||prev==null)return 0;const gap=Math.max(.05,1-TRAFFIC_RULES.stopLineOffset-TRAFFIC_RULES.vehicleHalfLength);return Math.min(.24,Math.max(.04,gap));}
function nextTurn(v,pos){for(let n=pos;n<Math.min(pos+4,v.path.length-2);n++){const d1=dir(v.path[n],v.path[n+1]),d2=dir(v.path[n+1],v.path[n+2]);if(d1!==d2)return(d2-d1+4)%4;}return 0;}
function occupancy(i){let n=0;for(let d=0;d<4;d++)for(let l=0;l<4;l++)if(state.occ.has(`${i}:${d}:${l}`))n++;return n;}
function drawBuilding(b,ghost=false){const plot=b;drawParking2D(plot);b=lotModel(plot);const t=CATALOG[b.key],k=KINDS[t.kind],s=t.size,x=b.x,y=b.y,p=screen(x,y);if(p[0]<-180||p[0]>view.w+100||p[1]<-80||p[1]>view.h+180)return;ctx.save();if(ghost)ctx.globalAlpha=.62;
box(x+.06,y+.06,s-.12,s-.12,2,'#d9d7ba','#a3b38d','#bbc39e');
if(t.kind==='park'){box(x+.25,y+.25,s-.5,s-.5,3,'#8abb75','#739b66','#86aa72');poly([screen(x+.3,y+s*.45,4),screen(x+s-.3,y+s*.45,4),screen(x+s-.3,y+s*.63,4),screen(x+.3,y+s*.63,4)],'#e3d9b5');tree(x+s*.28,y+s*.3,1.1);tree(x+s*.73,y+s*.28,1.3);tree(x+s*.7,y+s*.8,.9);const f=screen(x+s*.45,y+s*.75,5);ctx.fillStyle='#d9d6b7';ctx.beginPath();ctx.ellipse(...f,9*cam.z,6*cam.z,0,0,7);ctx.fill();ctx.fillStyle='#83bfba';ctx.beginPath();ctx.ellipse(...f,6*cam.z,4*cam.z,0,0,7);ctx.fill();}
else{const tall=t.kind==='office'?s*8:t.kind==='mall'?s*4:t.kind==='home'?s*4+3:s*3.5,height=tall;const bx=x+.26,by=y+.3,bw=s-.55,bh=s-.8;const sh=[screen(bx+bw,by),screen(bx+bw+height/T*.65,by+.6),screen(bx+bw+height/T*.65,by+bh+.6),screen(bx,by+bh+.1)];poly(sh,'#294b3924');box(bx,by,bw,bh,height,k.color,'#76988d',t.kind==='home'?'#efdcb2':'#d9e1cf');
if(t.kind==='home'||t.kind==='restaurant'||t.kind==='pub'){const a=screen(bx-.1,by-.12,height),bb=screen(bx+bw+.1,by-.12,height),c=screen(bx+bw+.1,by+bh+.1,height),d=screen(bx-.1,by+bh+.1,height),m1=screen(bx-.1,by+bh*.46,height+8),m2=screen(bx+bw+.1,by+bh*.46,height+8);poly([a,bb,m2,m1],k.roof);poly([m1,m2,c,d],t.kind==='home'?'#e4a46c':k.roof);ctx.strokeStyle='#7f70514d';ctx.lineWidth=.65;for(let n=1;n<bw*3;n++){const xx=bx+n/3;ctx.beginPath();ctx.moveTo(...screen(xx,by+bh*.46,height+8));ctx.lineTo(...screen(xx,by+bh+.1,height));ctx.stroke();}}
else{box(bx+.15,by+.15,bw-.3,bh-.3,height+2,k.roof,'#64837e','#7a9890');if(t.kind==='office'||t.kind==='mall'){box(bx+bw*.4,by+.2,bw*.35,bh*.38,height+4,'#b7d1c4');}if(t.kind==='factory'){box(bx+bw*.7,by+.2,.35,.35,height+12,'#b9b99e','#77857a','#8b9a8a');}}
if(cam.z>.42){const floors=t.kind==='office'?Math.floor(s*1.3):1;for(let f=0;f<floors;f++)for(let w=0;w<Math.max(1,Math.floor(bw*1.4));w++){const px=bx+.2+w*.62,py=by+bh+.015;poly([screen(px,py,5+f*7),screen(px+.29,py,5+f*7),screen(px+.29,py,9+f*7),screen(px,py,9+f*7)],'#69979c');}if(['shop','restaurant'].includes(t.kind)){const py=by+bh+.08;for(let n=0;n<bw*4;n++){poly([screen(bx+n/4,py,8),screen(bx+(n+1)/4,py,8),screen(bx+(n+1)/4,py+.3,6),screen(bx+n/4,py+.3,6)],n%2?'#f6e7bc':k.roof);}}}
tree(x+s-.3,y+s-.3,.55);}

if(selected?.kind==='building'&&selected.id===b.id||ghost){ctx.strokeStyle=ghost?'#f6dc83':'#fff6b7';ctx.lineWidth=2;const bounds=buildingBounds(plot);poly([screen(plot.x,plot.y),screen(plot.x+bounds.w,plot.y),screen(plot.x+bounds.w,plot.y+bounds.h),screen(plot.x,plot.y+bounds.h)],null,ctx.strokeStyle);}
if(cam.z>1.1&&!ghost&&typeof document.createElement!=='function'){const p=screen(x+s*.5,y+s+.45);ctx.font=`500 ${Math.min(12,10*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.textAlign='center';ctx.fillStyle='#284a3e';ctx.fillText(t.name,p[0],p[1]);ctx.textAlign='start';}ctx.restore();}
function drawCarShape(x,y,angle,color,z){ctx.save();if(color==='#65c8f2')z*=1.08;ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#173a3d40';ctx.fillRect(-5*z+2*z,-2.5*z+2*z,10*z,5*z);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-5*z,-2.4*z,10*z,4.8*z,1.4*z);ctx.fill();ctx.fillStyle='#466572';ctx.fillRect(0,-1.9*z,2.3*z,3.8*z);ctx.fillStyle='#dae7df';ctx.fillRect(-2.8*z,-1.9*z,2.2*z,3.8*z);ctx.fillStyle='#fff2b3';ctx.fillRect(3.5*z,-2.1*z,1*z,1*z);ctx.fillRect(3.5*z,1.1*z,1*z,1*z);ctx.restore();}
function drawVehicles(){for(const v of state.vehicles.values()){if(v.phase==='gate_waiting'||v.phase==='departing'&&!v.lotPath)continue;const pos=vehiclePosition(v);if(!pos)continue;const p=screen(pos.x,pos.y);if(p[0]<-20||p[0]>view.w+20||p[1]<-20||p[1]>view.h+20)continue;drawCarShape(p[0],p[1],pos.angle,v.color,cam.z);if(follow===v.id){ctx.strokeStyle='#fff6a2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...p,12*cam.z,0,7);ctx.stroke();}}}
// Lane geometry is immutable during a trip. It is rebuilt only after a route or
// road edit, rather than being recalculated from the car's new lane each frame.
const motionPlans=new WeakMap();
function motionDirection(path,k){return dir(path[Math.max(0,Math.min(k,path.length-2))],path[Math.max(1,Math.min(k+1,path.length-1))]);}
function turnLanePair(v,c,rank){
 const a=laneCapacity(v.path[c.pos-1],c.incoming),b=laneCapacity(v.path[c.pos+1],c.outgoing);
 if(c.turn===2)return{incoming:0,outgoing:0};
 const count=Math.min(2,a,b),r=Math.max(0,Math.min(count-1,rank));
 return c.turn===1?{incoming:r,outgoing:r}:{incoming:a-count+r,outgoing:b-count+r};
}
function chooseTurnLane(v,c){
 if(c.turn===2)return 0;
 const count=Math.min(2,laneCapacity(v.path[c.pos-1],c.incoming),laneCapacity(v.path[c.pos+1],c.outgoing));
 const scores=Array(count).fill(0),node=v.path[c.pos];
 for(const other of state.vehicles.values()){
  if(other.id===v.id||!other.path?.length)continue;
  const p=motionPlans.get(other);if(!p)continue;
  const turn=p.turns.find(t=>other.pos<=t.pos&&other.path[t.pos]===node&&t.incoming===c.incoming&&t.turn===c.turn);
  if(!turn||turn.pos-other.pos>24)continue;
  for(let r=0;r<count;r++)if(p.lanes[Math.max(0,turn.pos-1)]===turnLanePair(v,c,r).incoming)scores[r]+=1+(other.speed<.1?.5:0);
 }
 for(let r=0;r<count;r++){const pair=turnLanePair(v,c,r);for(let k=c.pos+1;k<=Math.min(v.path.length-1,c.pos+4);k++){const key=occKey(v.path[k],c.outgoing,Math.min(pair.outgoing,laneCapacity(v.path[k],c.outgoing)-1));if(state.occ.has(key)||state.reservations.has(key))scores[r]+=2;}}
 const seed=Math.abs(v.laneSeed??v.id??0)%count;let best=seed;for(let r=0;r<count;r++)if(scores[r]<scores[best])best=r;return best;
}
function motionPlan(v){
 if(v.trafficModel==null)v.trafficModel=2;
 const cached=motionPlans.get(v);
 if(cached&&cached.path===v.path&&cached.version===state.version)return cached;
 const path=v.path,n=path.length,lanes=new Uint8Array(n),route=new Float64Array(n),corners=[];
 for(let i=1;i<n;i++)route[i]=route[i-1]+distance(path[i-1],path[i]);
 for(let i=1;i<n-1;i++){const incoming=motionDirection(path,i-1),outgoing=motionDirection(path,i),turn=(outgoing-incoming+4)%4;if(turn)corners.push({pos:i,incoming,outgoing,turn,u:route[i]});}
 const legacy=v.trafficModel===1;
 if(!legacy){if(!v.turnLanes)v.turnLanes={};for(const c of corners){const key=c.pos+':'+path[c.pos]+':'+c.turn;const earlyLeft=state.buildings.has(v.fromId)&&c.turn===3&&c.u<9;if(earlyLeft)v.turnLanes[key]=Math.min(2,laneCapacity(path[c.pos-1],c.incoming),laneCapacity(path[c.pos+1],c.outgoing))-1;else if(v.turnLanes[key]==null)v.turnLanes[key]=chooseTurnLane(v,c);c.lanePair=turnLanePair(v,c,v.turnLanes[key]);}}
 let previousLane=Math.max(0,Math.floor(v.motionSeedLane??v.laneSeed??v.lane??v.id??0));
 let lastCorner=null,nextIndex=0,previousCap=laneCapacity(path[0],motionDirection(path,0));
 for(let i=0;i<n;i++){
  while(nextIndex<corners.length&&corners[nextIndex].pos<=i)lastCorner=corners[nextIndex++];
  const next=corners[nextIndex],cap=laneCapacity(path[i],motionDirection(path,i));
  const hold=lastCorner&&route[i]-lastCorner.u<=Math.min(1.8,next?(next.u-lastCorner.u)*.3:1.8);
  // Choose a turn lane well before the stop line. Keep the final approach straight.
  const prepare=next&&(!lastCorner||next.u-route[i]<=Math.max(7,Math.min(13,4+cap*2)));
  const turn=hold?lastCorner.turn:prepare?next.turn:0;
  lanes[i]=legacy?(turn===1?0:turn===3?cap-1:Math.min(cap-1,Math.floor((previousLane+.5)*cap/previousCap))):hold?Math.min(cap-1,lastCorner.lanePair.outgoing):prepare?Math.min(cap-1,next.lanePair.incoming):Math.min(cap-1,Math.floor((previousLane+.5)*cap/previousCap));
  previousLane=lanes[i];previousCap=cap;
 }
 if(state.buildings.has(v.fromId))lanes[0]=laneCapacity(path[0],motionDirection(path,0))-1;if(state.buildings.has(v.toId))lanes[n-1]=laneCapacity(path[n-1],motionDirection(path,n-1))-1;
 // An emergency move to the right is an actual new starting lane, not just
 // a rendered car displacement. Preserve it when rebuilding the route.
 if(v.emergencyInitialLane!=null&&n>1)lanes[0]=Math.min(laneCapacity(path[0],motionDirection(path,0))-1,Math.max(0,v.emergencyInitialLane));
 const point=(i,d=motionDirection(path,i))=>{const p=xy(path[i]),off=laneOffset(path[i],d,lanes[i]);return{x:p[0]+.5+off.x,y:p[1]+.5+off.y};};
 const dot=(p,d)=>p.x*DIR[d][0]+p.y*DIR[d][1];
 const shift=(p,d,a)=>({x:p.x+DIR[d][0]*a,y:p.y+DIR[d][1]*a});
 for(let k=0;k<corners.length;k++){
  const c=corners[k],i=c.pos,p=xy(path[i]),center={x:p[0]+.5,y:p[1]+.5};
  const incoming=laneOffset(path[i-1],c.incoming,lanes[i-1]),outgoing=laneOffset(path[i+1],c.outgoing,lanes[i+1]);
  const width=Math.min(roadVisualWidth(state.roads.get(path[i-1])?.type),roadVisualWidth(state.roads.get(path[i+1])?.type));
  let radius=Math.max(.75,width*.33),cutIn,cutOut;
  if(!legacy&&c.turn===1)radius+=(Math.hypot(incoming.x,incoming.y)+Math.hypot(outgoing.x,outgoing.y))*.5;
  if(c.turn===3){
   const inHalf=roadVisualWidth(state.roads.get(path[i-1])?.type)*.5,outHalf=roadVisualWidth(state.roads.get(path[i+1])?.type)*.5;
   const inMargin=Math.max(.04,inHalf-Math.hypot(incoming.x,incoming.y)-.13),outMargin=Math.max(.04,outHalf-Math.hypot(outgoing.x,outgoing.y)-.13);
   radius=Math.min(radius,.98*(inMargin+outMargin+Math.sqrt(2*inMargin*outMargin)));
  }
  if(c.turn===2){cutIn=cutOut=radius;}else{cutIn=radius-dot(outgoing,c.incoming);cutOut=radius+dot(incoming,c.outgoing);}
  // Closely spaced junctions share their available corridor. Scale the lane
  // offsets too, so a constrained turn never doubles back to reach its exit.
  const before=k?c.u-corners[k-1].u:Infinity,after=k+1<corners.length?corners[k+1].u-c.u:Infinity;
  const fit=Math.min(1,before*.46/Math.max(.05,cutIn),after*.46/Math.max(.05,cutOut));
  radius*=fit;cutIn*=fit;cutOut*=fit;
  incoming.x*=fit;incoming.y*=fit;outgoing.x*=fit;outgoing.y*=fit;
  if(c.turn===2){
   c.p0=shift({x:center.x+incoming.x,y:center.y+incoming.y},c.incoming,-cutIn);
   c.p3=shift({x:center.x+outgoing.x,y:center.y+outgoing.y},c.outgoing,cutOut);
   const handle=Math.max(.4,Math.hypot(outgoing.x-incoming.x,outgoing.y-incoming.y)*2/3)*fit;
   c.p1=shift(c.p0,c.incoming,handle);c.p2=shift(c.p3,c.outgoing,-handle);
  }else{
   const crossing={x:center.x+incoming.x+outgoing.x,y:center.y+incoming.y+outgoing.y};
   c.p0=shift(crossing,c.incoming,-radius);c.p3=shift(crossing,c.outgoing,radius);
   c.p1=shift(c.p0,c.incoming,radius*.5522847498);c.p2=shift(c.p3,c.outgoing,-radius*.5522847498);
  }
  c.radius=radius;c.rawStart=c.u-cutIn;c.rawEnd=c.u+cutOut;
  c.startU=Math.max(0,c.rawStart);c.endU=Math.min(route[n-1],c.rawEnd);
 }
 if(v.motionStartPose&&corners[0]?.startU<=1e-8){const c=corners[0],p=v.motionStartPose,h=Math.max(.2,Math.hypot(c.p3.x-p.x,c.p3.y-p.y)/3);c.p0={x:p.x,y:p.y};c.p1={x:p.x+(p.dx??DIR[c.incoming][0])*h,y:p.y+(p.dy??DIR[c.incoming][1])*h};c.rawStart=c.startU=0;}
 const pieces=[];
 function append(startU,endU,p0,p1,p2,p3,turn=null){
  if(endU-startU<1e-8)return;
  if(!turn&&startU===0&&v.motionStartPose?.dx!=null){const pose=v.motionStartPose,h=Math.hypot(p1.x-p0.x,p1.y-p0.y);p1={x:p0.x+pose.dx*h,y:p0.y+pose.dy*h};}
  const dx=p3.x-p0.x,dy=p3.y-p0.y,length=Math.hypot(dx,dy);
  const line=!turn&&Math.abs(dx*(p1.y-p0.y)-dy*(p1.x-p0.x))<1e-8&&Math.abs(dx*(p2.y-p0.y)-dy*(p2.x-p0.x))<1e-8;
  const last=pieces[pieces.length-1];
  if(line&&last?.line&&Math.abs(last.endU-startU)<1e-8){
   const lx=last.p3.x-last.p0.x,ly=last.p3.y-last.p0.y;
   if(lx*dx+ly*dy>0&&Math.abs(lx*dy-ly*dx)<1e-8){last.endU=endU;last.p3=p3;last.length+=length;return;}
  }
  const piece={startU,endU,p0,p1,p2,p3,line,turn,length,arc:null};
  if(!line){const arc=new Float64Array(129);let prev=p0;for(let k=1;k<129;k++){const p=bezierPoint(p0,p1,p2,p3,k/128);arc[k]=arc[k-1]+Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}piece.arc=arc;piece.length=arc[128];}
  pieces.push(piece);
 }
 function straight(startU,endU,start,end){
  if(endU-startU<1e-8)return;
  let first=0;while(first<n-2&&route[first+1]<=startU)first++;
  let last=first;while(last<n-2&&route[last+1]<endU)last++;
  const d=motionDirection(path,first),types=new Set();for(let k=first;k<=Math.min(n-1,last+1);k++)types.add(state.roads.get(path[k])?.type);
  const forward=dot({x:end.x-start.x,y:end.y-start.y},d),lateral=Math.abs((end.x-start.x)*DIR[d][1]-(end.y-start.y)*DIR[d][0]);
  if(types.size===1&&forward>1e-8){
   const window=Math.min(forward,Math.max(3,lateral*3));let a=start,u=startU;
   if(lateral>1e-8&&forward>window){
    // Perform the lateral manoeuvre in the FIRST part of the link, not the
    // last three cells immediately before the junction stop line.
    const settled=shift(end,d,-(forward-window)),settleU=startU+(endU-startU)*window/forward,h=window/3;
    append(startU,settleU,start,shift(start,d,h),shift(settled,d,-h),settled);
    a=settled;u=settleU;
   }
   const remaining=lateral>1e-8&&forward>window?forward-window:forward;
   const h=remaining/3;append(u,endU,a,shift(a,d,h),shift(end,d,-h),end);return;
  }
  const anchors=[{u:startU,p:start}];
  for(let i=first+1;i<n-1&&route[i]<endU-1e-8;i++)anchors.push({u:route[i],p:point(i)});
  anchors.push({u:endU,p:end});let k=first;
  for(let i=1;i<anchors.length;i++){
   const a=anchors[i-1],b=anchors[i];while(k<n-2&&route[k+1]<(a.u+b.u)/2)k++;
   const d=motionDirection(path,k),handle=Math.max(0,dot({x:b.p.x-a.p.x,y:b.p.y-a.p.y},d))/3;
   append(a.u,b.u,a.p,shift(a.p,d,handle),shift(b.p,d,-handle),b.p);
  }
 }
 let cursor=0,position=v.motionStartPose|| (n?point(0):{x:0,y:0});
 for(const c of corners){
  if(c.endU<=c.startU)continue;
  const span=c.rawEnd-c.rawStart,t0=(c.startU-c.rawStart)/span,t1=(c.endU-c.rawStart)/span;
  const a=bezierPoint(c.p0,c.p1,c.p2,c.p3,t0),b=bezierPoint(c.p0,c.p1,c.p2,c.p3,t1);
  straight(cursor,c.startU,position,a);
  // Trim a turn that begins at a spawn point or ends at a destination while
  // retaining the exact tangent of the original curve.
  const da=bezierTangent(c.p0,c.p1,c.p2,c.p3,t0),db=bezierTangent(c.p0,c.p1,c.p2,c.p3,t1),spanT=(t1-t0)/3;
  append(c.startU,c.endU,a,{x:a.x+da.x*spanT,y:a.y+da.y*spanT},{x:b.x-db.x*spanT,y:b.y-db.y*spanT},b,c);
  cursor=c.endU;position=b;
 }
 if(n>1)straight(cursor,route[n-1],position,point(n-1,motionDirection(path,n-2)));
 let total=0;for(const p of pieces){p.startDistance=total;total+=p.length;p.endDistance=total;}
 function distanceAt(u){
  if(!pieces.length)return 0;
  let lo=0,hi=pieces.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(pieces[mid].endU<u)lo=mid+1;else hi=mid;}
  const p=pieces[lo],t=Math.max(0,Math.min(1,(u-p.startU)/(p.endU-p.startU)));
  return p.startDistance+t*p.length;
 }
 const nodes=new Float64Array(n);for(let i=0;i<n;i++)nodes[i]=distanceAt(route[i]);
 for(const c of corners){c.startDistance=distanceAt(c.startU);c.endDistance=distanceAt(c.endU);}
 const junctions=[];
 for(let i=1;i<n-1;i++)if(junction(path[i])>=3){
  const road=state.roads.get(path[i]),turn=corners.find(c=>c.pos===i);
  const layout=junctionDetails(path[i]),halfIn=motionDirection(path,i-1)%2===0?layout.halfX:layout.halfY,halfOut=motionDirection(path,i)%2===0?layout.halfX:layout.halfY;
  const boundaryIn=distanceAt(Math.max(0,route[i]-halfIn)),boundaryOut=distanceAt(Math.min(route[n-1],route[i]+halfOut));
  const start=turn?Math.min(turn.startDistance,boundaryIn):boundaryIn;
  const end=turn?Math.max(turn.endDistance,boundaryOut):boundaryOut;
  junctions.push({pos:i,node:path[i],entry:start,stop:Math.max(0,start-TRAFFIC_RULES.vehicleHalfLength-.1),clear:end+TRAFFIC_RULES.vehicleHalfLength});
 }
 const plan={path,version:state.version,lanes,route,nodes,pieces,turns:corners,junctions,total};motionPlans.set(v,plan);return plan;
}
function motionDistance(v,plan=motionPlan(v)){const i=Math.max(0,Math.min(v.pos,plan.nodes.length-1));return plan.nodes[i]+Math.max(0,Math.min(1,v.progress||0))*((plan.nodes[i+1]??plan.nodes[i])-plan.nodes[i]);}
function positionOnMotion(plan,s){
 if(!plan.pieces.length){const p=xy(plan.path[0]||0);return{x:p[0]+.5,y:p[1]+.5,angle:0};}
 let lo=0,hi=plan.pieces.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(plan.pieces[mid].endDistance<s)lo=mid+1;else hi=mid;}
 const p=plan.pieces[lo],along=Math.max(0,Math.min(p.length,s-p.startDistance));let t=p.length?along/p.length:0;
 if(p.arc){let a=0,b=128;while(a+1<b){const m=(a+b)>>1;if(p.arc[m]<along)a=m;else b=m;}const fraction=(along-p.arc[a])/Math.max(1e-10,p.arc[b]-p.arc[a]);t=(a+fraction)/128;}
 const point=p.line?{x:p.p0.x+(p.p3.x-p.p0.x)*t,y:p.p0.y+(p.p3.y-p.p0.y)*t}:bezierPoint(p.p0,p.p1,p.p2,p.p3,t);
 const tangent=p.line?{x:p.p3.x-p.p0.x,y:p.p3.y-p.p0.y}:bezierTangent(p.p0,p.p1,p.p2,p.p3,t);
 const length=Math.hypot(tangent.x,tangent.y)||1;return{x:point.x,y:point.y,angle:Math.atan2(tangent.y*.78,tangent.x),dx:tangent.x/length,dy:tangent.y/length};
}
function vehiclePosition(v){if(v.lotPath)return parkingPose(v);if(v.phase==='departing'){const b=state.buildings.get(v.fromId);return b?parkingSlotPose(b,parkingSpace(b,v.citizenId)):null;}if(v.phase==='stuck'&&v.heldPose)return v.heldPose;return v.path?.length?positionOnMotion(motionPlan(v),motionDistance(v)):null;}
// Read-only overlay: sample the same lane plan used by vehicle movement.
const trackingSamples=new WeakMap();
function trackingRoute(v){
 if(!v?.path?.length||missingRoute(v))return [];if(v.lotPath){const p=parkingPose(v);return [p,...v.lotPath.filter((_,i)=>i>0)];}
 const plan=motionPlan(v),start=motionDistance(v,plan),pose=vehiclePosition(v);
 if(!pose)return [];
 let samples=trackingSamples.get(plan);
 if(!samples){samples=[];for(let s=0;s<plan.total;s+=.4)samples.push({s,...positionOnMotion(plan,s)});samples.push({s:plan.total,...positionOnMotion(plan,plan.total)});trackingSamples.set(plan,samples);}
 // A held pose off its planned lane must not invent a straight connector.
 const planned=positionOnMotion(plan,start);
 if(v.phase==='stuck'&&Math.hypot(pose.x-planned.x,pose.y-planned.y)>.25)return [];
 return [pose,...samples.filter(p=>p.s>start+1e-6)];
}
function trackingDestination(v){const b=state.buildings.get(v.toId);return b?`${CATALOG[b.key].name} #${b.id}`:v.kind==='pass'?'ทางออกเมือง':'ปลายทาง';}
let trackingLayer=null,trackingNodes=new Map(),trackingAt=-Infinity;
function updateTrackingOverlay(){
 const enabled=tool==='tracking';
 if(trackingLayer)trackingLayer.style.display=enabled?'block':'none';
 if(!enabled){trackingAt=-Infinity;return;}
 const now=performance.now();if(now-trackingAt<100)return;trackingAt=now;
 const ns='http://www.w3.org/2000/svg';
 if(!trackingLayer){trackingLayer=document.createElementNS(ns,'svg');trackingLayer.setAttribute('aria-hidden','true');Object.assign(trackingLayer.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'0',overflow:'hidden'});canvas.insertAdjacentElement('afterend',trackingLayer);}
 const visible=new Set();
 for(const v of state.vehicles.values()){
  if(!['driving','stuck'].includes(v.phase))continue;
  const pose=vehiclePosition(v);if(!pose)continue;
  visible.add(v.id);let item=trackingNodes.get(v.id);
  if(!item){const group=document.createElementNS(ns,'g'),path=document.createElementNS(ns,'polyline');path.setAttribute('fill','none');path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');group.append(path);trackingLayer.appendChild(group);item={group,path};trackingNodes.set(v.id,item);}
  const focused=selected?.kind==='vehicle'&&selected.id===v.id,color=focused?'#ffffff':`hsl(${(v.id*137.508)%360} 95% 72%)`,project=p=>screen(p.x-(renderer3d?.5:0),p.y-(renderer3d?.5:0));
  const points=trackingRoute(v).map(project);
  item.path.setAttribute('points',points.map(p=>p.join(',')).join(' '));item.path.setAttribute('stroke',color);item.path.setAttribute('stroke-width',focused?'3':'1.5');item.path.setAttribute('opacity',focused?'1':'.65');
  if(focused)trackingLayer.appendChild(item.group);
 }
 for(const [id,item] of trackingNodes)if(!visible.has(id)){item.group.remove();trackingNodes.delete(id);}
}

function buildingTraffic(b,incoming=null){const t=CATALOG[b.key];let approaching=0;if(incoming)approaching=incoming.get(b.id)||0;else for(const v of state.vehicles.values())if(v.toId===b.id)approaching++;return{name:t.name,approaching,parked:b.parked.size,max:t.beds||t.residents||t.jobs+t.service};}
function buildingGaugeMetrics(b,approaching){
 const t=CATALOG[b.key];
 const used=t.service?b.visitors.size:t.residents?b.residents.size:b.workers.size;
 return serviceGaugeMetrics({traveling:approaching,used,capacity:t.service||t.residents||t.jobs});
}
let placeLabelLayer=null,placeLabelState=null,placeLabels=new Map(),placeLabelCounts=new Map(),placeLabelAt=0,routeWarningMarkers=new Map(),buildingLabelsVisible=true;
const NO_ROUTE_TIMEOUT=120;
const IMMOBILE_RESPAWN_TIMEOUT=120;
function missingRoute(v){return !!v&&(!!v.departureNoRoute||v.phase==='stuck'&&v.routeMissing!==false&&!/พบเส้นทางแล้ว/.test(v.stopReason||''));}
function setRouteMissing(v,missing){if(missing){if(v.routeMissing===false||!Number.isFinite(v.routeMissingSince))v.routeMissingSince=state.time;v.routeMissing=true;}else{v.routeMissing=false;v.routeMissingSince=null;}}
function routeWarningPosition(v){
 if(v.phase==='stuck'){const p=vehiclePosition(v);return p?renderer3d?screen(p.x-.5,p.y-.5,18):screen(p.x,p.y,12):null;}
 if(!v.departureNoRoute)return null;
 if(v.fromId==null&&state.gates.includes(v.fromGate)){const [x,y]=xy(v.fromGate);return renderer3d?screen(x,y,18):screen(x+.5,y+.5,12);}
 const b=state.buildings.get(v.fromId),c=state.citizens.get(v.citizenId);if(!b||!c||!b.parked.has(c.id))return null;
 const n=[...b.parked].indexOf(c.id),s=CATALOG[b.key].size;
 if(renderer3d)return n<s-1?screen(b.x+.54+n*.53,b.y+s-.28,18):null;
 return n<Math.min(b.parked.size,Math.floor(s*2))?screen(b.x+.38+(n%Math.floor(s))*.62,b.y+s-.3-Math.floor(n/s)*.4,12):null;
}
function updateRouteWarnings(){
 if(!placeLabelLayer)return;
 const visible=new Set();
 for(const v of state.vehicles.values()){
  if(!missingRoute(v))continue;const p=routeWarningPosition(v);if(!p||p[0]<12||p[0]>view.w-12||p[1]<72||p[1]>view.h-100)continue;
  visible.add(v.id);let marker=routeWarningMarkers.get(v.id);
  if(!marker){marker=document.createElement('div');marker.textContent='!';marker.setAttribute('aria-label','รถ #'+v.id+' ไม่มีเส้นทาง');Object.assign(marker.style,{position:'absolute',transform:'translate(-50%,-100%)',width:'19px',height:'19px',display:'grid',placeItems:'center',borderRadius:'50%',background:'#df3543',border:'2px solid #fff',color:'#fff',font:'bold 12px/1 Arial,sans-serif',boxShadow:'0 2px 7px #5c172199',pointerEvents:'none'});placeLabelLayer.append(marker);routeWarningMarkers.set(v.id,marker);}
  marker.style.left=p[0]+'px';marker.style.top=p[1]+'px';
 }
 for(const [id,marker]of routeWarningMarkers)if(!visible.has(id)){marker.remove();routeWarningMarkers.delete(id);}
}
function updatePlaceLabels(){
 if(!buildingLabelsVisible)return;
 if(typeof document.createElement!=='function')return;
 if(!placeLabelLayer){placeLabelLayer=document.createElement('div');placeLabelLayer.id='buildingLabels';placeLabelLayer.setAttribute('aria-label','สถานที่และจำนวนรถที่กำลังมา');Object.assign(placeLabelLayer.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});canvas.insertAdjacentElement('afterend',placeLabelLayer);}
 if(placeLabelState!==state){placeLabelLayer.replaceChildren();placeLabels.clear();routeWarningMarkers.clear();placeLabelState=state;placeLabelAt=0;}
 const now=Date.now(),refresh=now-placeLabelAt>300||placeLabels.size!==state.buildings.size;
 if(refresh){placeLabelCounts=new Map();for(const v of state.vehicles.values())if(v.toId!=null)placeLabelCounts.set(v.toId,(placeLabelCounts.get(v.toId)||0)+1);placeLabelAt=now;}
 for(const [key,label]of placeLabels)if(!state.buildings.has(key)){label.element.remove();placeLabels.delete(key);}
 for(const b of state.buildings.values()){
  const t=CATALOG[b.key],height=renderer3d?(t.kind==='office'?t.size*1.15+.7:t.kind==='park'?.65:t.kind==='home'?t.size*.62+1.2:t.size*.55+1)*18:(t.kind==='office'?t.size*8:t.kind==='park'?6:t.kind==='home'?t.size*4+11:t.size*3.5+7);
  const model=lotModel(b),p=screen(model.x+t.size/2,model.y+t.size/2,height);let label=placeLabels.get(b.id);
  if(!label){
   const element=document.createElement('div'),name=document.createElement('strong'),counts=document.createElement('span');
   element.className='place-building-label';
   Object.assign(element.style,{position:'absolute',transform:'translate(-50%,-100%)',pointerEvents:'none'});
   name.className='place-building-name';counts.className='place-building-arrivals';
   element.append(name,counts);placeLabelLayer.append(element);
   label={element,name,counts};placeLabels.set(b.id,label);
  }
  const visible=p[0]>-40&&p[0]<view.w+40&&p[1]>65&&p[1]<view.h-95;label.element.hidden=!visible;if(!visible)continue;
  label.element.style.left=p[0]+'px';label.element.style.top=(p[1]-4)+'px';
  if(refresh||!label.name.textContent){
   const traffic=buildingTraffic(b,placeLabelCounts);
   label.name.textContent=traffic.name;label.counts.textContent=traffic.approaching+' / '+traffic.parked+' / '+traffic.max;
   label.element.setAttribute('aria-label',traffic.name+' กำลังมา '+traffic.approaching+' คัน จอดอยู่ '+traffic.parked+' คัน ความจุ '+traffic.max+' คัน');
  }
 }
}
function draw(){if(renderer3d){renderer3d.render({state,cam,hover,drag,tool,selected,heat,debug,follow:tool==='tracking'?null:follow,CATALOG,ROADS,KINDS,junction,vehiclePosition,signalColor,checkBuilding,parking:{buildingBounds,lotPoint,lotSlots,lotModel,parkingVisuals,parkingSlotPose,parkingIsMoving,citizenCarColor}});updatePlaceLabels();updateRouteWarnings();updateTrackingOverlay();return;}drawTerrain();drawPlantedTrees2D();drawRoads();const bs=[...state.buildings.values()].sort((a,b)=>a.y-b.y||a.x-b.x);for(const b of bs)drawBuilding(b);drawVehicles();updatePlaceLabels();updateRouteWarnings();updateTrackingOverlay();if(tool!=='tracking'&&follow&&state.vehicles.has(follow)){const v=state.vehicles.get(follow);ctx.strokeStyle='#ffe98d';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();v.path.slice(v.pos).forEach((i,n)=>{const p=xy(i),s=screen(p[0]+.5,p[1]+.5);n?ctx.lineTo(...s):ctx.moveTo(...s);});ctx.stroke();ctx.setLineDash([]);}
if(hover&&tool!=='hand'){if(CATALOG[tool])drawBuilding({key:tool,x:hover.x,y:hover.y,rotation:checkBuilding(tool,hover.x,hover.y).rotation||0},true);else{const cells=drag?.cells||[owner(id(hover.x,hover.y))];for(const i of cells){const [x,y]=xy(i),s=screen(x,y);ctx.fillStyle=tool.startsWith('erase')?'#df7e6c99':'#fbe3989c';ctx.fillRect(s[0],s[1],T*cam.z,T*cam.z*.78);}}}
if(state.buildings.size===0){const p=screen(154,143);ctx.fillStyle='#214c3ac9';ctx.font=`500 ${Math.max(12,14*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.fillText('เมืองใหม่ เริ่มจากถนนเส้นแรก',p[0],p[1]);ctx.font=`${Math.max(10,11*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.fillStyle='#3f6148';ctx.fillText('ถนนหลัก 8 เลนพร้อมแล้ว · เลือกถนนเล็ก แล้วลากต่อออกมา',p[0],p[1]+22*cam.z);}
}
function owner(i){return state.roads.has(i)?i:state.footprint[i]>=0?state.footprint[i]:i;}
function addNews(text){news.unshift({time:state.time,text});news=news.slice(0,15);}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);}

// Counts represent unique citizens with an active unmet request, never building quotas.
function cityDemand(){
 const kinds=['shop','restaurant','mall','park','pub'],rows=kinds.map(kind=>({kind,label:KINDS[kind].name,buildings:0,capacity:0,used:0,reserved:0,missing:new Set(),full:new Set(),unreachable:new Set(),retrying:new Set(),traveling:new Set(),visiting:new Set()})),byKind=Object.fromEntries(rows.map(r=>[r.kind,r]));
 const jobs={kind:'work',label:'งาน · สำนักงาน / โรงงาน',people:new Set(),unreachable:new Set(),capacity:0,used:0,buildings:0},housing={kind:'home',label:'บ้าน',people:new Set(),incoming:new Set(),capacity:0,used:0,reserved:0,buildings:0};
 for(const b of state.buildings.values()){const t=CATALOG[b.key];if(!t)continue;const r=byKind[t.kind];if(r){r.buildings++;r.capacity+=t.service;r.used+=b.visitors.size;r.reserved+=b.reservedService||0;for(const id of b.visitors){const c=state.citizens.get(id);if(c?.resident&&!c.removed)r.visiting.add(id);}}if(t.jobs){jobs.capacity+=t.jobs;jobs.used+=b.workers.size;jobs.buildings++;}if(t.residents){housing.buildings++;housing.capacity+=t.residents;housing.used+=b.residents.size;housing.reserved+=b.reservedResidents||0;}}
 const noRoute=v=>v&&(v.departureNoRoute||v.phase==='stuck'&&/ไม่มีเส้นทาง|หาเส้นทาง|ห้ามกลับรถ|เส้นทางเดิมขาด|ถนนถูกลบ/.test(v.stopReason||''));
 for(const c of state.citizens.values()){if(c.removed)continue;const v=state.vehicles.get(c.vehicleId);
  if(!c.resident){if(v?.kind==='moveIn')housing.incoming.add(c.id);continue;}if(!state.buildings.has(c.homeId))housing.people.add(c.id);
  if(!c.movingOut&&c.profile.trait!==3&&!c.workId)jobs.people.add(c.id);if(v?.kind==='work'&&noRoute(v)||c.pending?.action==='work'&&!v&&(!Number.isFinite(c.pending.expires)||c.pending.expires>=state.time)&&c.workId&&/ไม่มีเส้นทาง/.test(c.problem||''))jobs.unreachable.add(c.id);
  let kind=null,blocked=false;if(v?.kind==='leisure'){kind=v.serviceKind||CATALOG[state.buildings.get(v.toId)?.key]?.kind;blocked=noRoute(v);if(!blocked&&byKind[kind])byKind[kind].traveling.add(c.id);}
  const p=c.pending,active=p&&(!Number.isFinite(p.expires)||p.expires>=state.time)&&(!Number.isFinite(p.end)||p.end>state.time);if(active&&p.action==='leisure'&&!v){kind=p.kind;blocked=/ไม่มีเส้นทาง/.test(c.problem||'');}else if(!blocked)continue;
  const r=byKind[kind];if(!r)continue;if(!r.buildings)r.missing.add(c.id);else if(blocked)r.unreachable.add(c.id);else if(r.capacity-r.used-r.reserved<=0)r.full.add(c.id);else r.retrying.add(c.id);
 }
 const count=r=>{const out={...r};for(const [key,value]of Object.entries(out))if(value instanceof Set)out[key]=value.size;return out;};
 return{services:rows.map(r=>({...count(r),waiting:new Set([...r.missing,...r.full,...r.unreachable,...r.retrying]).size,free:Math.max(0,r.capacity-r.used-r.reserved)})),jobs:{...count(jobs),free:Math.max(0,jobs.capacity-jobs.used)},housing:{...count(housing),free:Math.max(0,housing.capacity-housing.used-housing.reserved)}};
}
function cityAdvice(demand,stats){
 const cars=[...state.vehicles.values()],stranded=cars.filter(v=>v.phase==='stuck').length,blockedDepartures=cars.filter(v=>v.departureNoRoute).length,moving=cars.filter(v=>v.phase==='driving'&&v.speed>.1).length,queued=cars.filter(v=>v.phase==='driving'&&v.wait>=24).length;
 const routePeople=demand.services.reduce((n,r)=>n+r.unreachable,0)+demand.jobs.unreachable,serviceWaiting=demand.services.reduce((n,r)=>n+r.waiting,0),shortages=demand.services.filter(r=>r.missing+r.full>0).sort((a,b)=>b.missing+b.full-a.missing-a.full),good=[],problems=[],next=[];
 const add=(key,text,category=null,report=false)=>{if(!next.some(a=>a.key===key))next.push({key,text,category,report});};
 if(!demand.housing.buildings)add('home','สร้างบ้านติดถนนที่มีทางเข้าออก เพื่อเริ่มรับคนย้ายเข้า','home');
 if(stranded+blockedDepartures+routePeople){problems.push('รถไม่มีเส้นทางหรือรอการกู้ '+stranded+' คัน และรอเส้นทางก่อนออก '+blockedDepartures+' คัน'+(routePeople?' · ผู้รอเดินทางไปบริการ/งาน '+routePeople+' คน':''));add('routes','ตรวจรถที่ไปต่อไม่ได้ เชื่อมถนนให้วนถึงจุดหมาย หรือลากรถที่ค้างออก',null,true);}
 if(queued){problems.push('รถ '+queued+' คันรอบนถนนอย่างน้อย 24 นาทีในเกม');if(!stranded&&!blockedDepartures)add('traffic','ตรวจคิวแยกและถนนปลายทางที่ระบายรถไม่ทัน',null,true);}
 if(demand.jobs.people){const shortage=Math.max(0,demand.jobs.people-demand.jobs.free);problems.push('ยังไม่มีงาน '+demand.jobs.people+' คน'+(demand.jobs.free?' · มีตำแหน่งว่าง '+demand.jobs.free+' ตำแหน่ง':' · ยังไม่มีตำแหน่งว่าง'));if(shortage)add('work','เพิ่มตำแหน่งงานให้คนว่างงาน '+shortage+' คน เช่น สำนักงาน โรงงาน หรือธุรกิจบริการ','work');else add('matching','มีตำแหน่งว่างอยู่แล้ว รอจับคู่งานและตรวจการเดินทางก่อนสร้างเพิ่ม',null,true);}
 for(const r of shortages){problems.push(r.label+': '+(r.missing?'ยังไม่มีบริการ ผู้รอ '+r.missing+' คน':'ความจุเต็ม ผู้รอ '+r.full+' คน'));add(r.kind,(r.missing?'เพิ่ม':'เพิ่มความจุ')+r.label+' สำหรับผู้รอ '+(r.missing+r.full)+' คน',r.kind==='shop'||r.kind==='restaurant'||r.kind==='mall'?'food':'leisure');}
 if(stats.pop&&stats.happy<70){problems.push('ความสุข '+Math.round(stats.happy)+'% · ระบบหยุดรับคนย้ายเข้าเมื่อความสุขต่ำกว่า 70%');if(!shortages.length&&!routePeople&&!stranded)add('happiness','ดูปัญหาของประชาชนที่ความสุขต่ำ แล้วแก้การเดินทาง งาน หรือบริการที่ยังขาด',null,true);}
 if(stats.net<0){problems.push('ประมาณการรายรับสุทธิติดลบ '+money(-stats.net)+' ต่อวัน');add('budget','ชะลอการสร้างที่ยังไม่มีผู้ต้องการ และดูรายรับกับค่าดูแลก่อนขยายเมือง');}
 const employed=[...state.citizens.values()].filter(c=>c.resident&&!c.removed&&c.workId&&!c.movingOut).length;if(employed)good.push('มีงานแล้ว '+employed+' คน');if(moving)good.push('รถกำลังเคลื่อนที่ '+moving+' คัน');const visitors=new Set();for(const b of state.buildings.values())for(const id of b.visitors)if(state.citizens.get(id)?.resident)visitors.add(id);if(visitors.size)good.push('กำลังใช้บริการในเมือง '+visitors.size+' คน');if(stats.net>=0)good.push('ประมาณการสุทธิ '+money(stats.net)+' ต่อวัน');if(stats.pop&&stats.happy>=70)good.push('ความสุขยังเปิดรับคนย้ายเข้าได้');
 if(!next.length){if(!stats.pop)add('settle',demand.housing.free?'มีบ้านว่าง '+demand.housing.free+' ที่ รอคนเดินทางเข้าเมือง และเตรียมงานให้พร้อม':'รอการเดินทางย้ายเข้าที่จองบ้านไว้สำเร็จ');else add('steady','เมืองยังไม่มีความต้องการที่ค้างอยู่ เฝ้าดูช่วงเลิกงานก่อนขยายบริการเพิ่ม');}
 const headline=!demand.housing.buildings?'เริ่มเมืองจากบ้านหลังแรก':stranded+blockedDepartures+routePeople?'แก้การเดินทางก่อน เมืองจะเดินต่อได้':shortages.length?'มีบริการที่ชาวเมืองกำลังรอ':demand.jobs.people?'เติมงานให้ชาวเมือง':stats.net<0?'คุมค่าดูแลก่อนขยายเมือง':'เมืองกำลังเดินไปตามจังหวะของผู้คน';
 const overview='ตอนนี้มีชาวเมือง '+stats.pop+' คน ความสุข '+Math.round(stats.happy)+'%'+(stats.pop?' และมีบ้านว่าง '+demand.housing.free+' ที่':'')+' · ผู้รอบริการ '+serviceWaiting+' คน · รถทั้งหมด '+cars.length+' คัน'+(state.speed===0?' · เวลาหยุดอยู่ กดเล่นต่อเพื่อให้ระบบเดินหน้า':'');
 return{headline,overview,good:good.slice(0,3),problems:problems.slice(0,5),next:next.slice(0,3)};
}
function serviceGaugeMetrics(r){
 const values={traveling:r.traveling,used:r.used,capacity:r.capacity};
 const scale=Math.max(1,r.capacity,r.used+r.traveling);
 return Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value,pct:Math.max(0,Math.min(100,100*value/scale))}]));
}
function serviceGaugeMarkup(r){
 const metric=serviceGaugeMetrics(r);
 return '<div class="need-gauges" role="img" aria-label="กำลังไป '+r.traveling+' คน อยู่ '+r.used+' คน รับได้ '+r.capacity+' คน">'+
  [['traveling','ไป'],['used','อยู่'],['capacity','รับ']].map(([key,label])=>
   '<span class="need-gauge" data-gauge="'+key+'" aria-hidden="true"><span class="need-tube"><i class="need-tube-fill" style="clip-path:inset('+(100-metric[key].pct)+'% 0 0 0)"></i></span><span class="need-gauge-label">'+label+'</span></span>').join('')+
  '</div>';
}
function updateCityAdvisor(){
 const d=cityDemand(),advice=cityAdvice(d,state.stats),set=(id,html)=>{const el=$(id);if(el&&el.innerHTML!==html)el.innerHTML=html;},e=escapeSaveText;
 // Three compact figures: total capacity / currently using (including en route) / unmet demand.
 // Hotel guest reservations include visitors travelling to the hotel as well as those staying.
 const hotels=[...state.buildings.values()].filter(b=>CATALOG[b.key]?.beds);
 const hotelCapacity=hotels.reduce((sum,b)=>sum+CATALOG[b.key].beds,0);
 const hotelBooked=hotels.reduce((sum,b)=>sum+(b.guests?.size||0),0);
 const wantsHotel=touristPeople().filter(c=>c.enteredAt!=null&&!c.returning&&!c.hotelId&&c.wantsHotel&&c.nights<c.maxNights).length;
 const hotelUnmet=Math.max(0,wantsHotel-Math.max(0,hotelCapacity-hotelBooked));
 const touristServiceTrips=new Map();
 for(const v of state.vehicles.values()){
  const c=state.citizens.get(v.citizenId);
  if(!c?.tourist||c.removed||v.kind!=='leisure')continue;
  const kind=v.serviceKind||CATALOG[state.buildings.get(v.toId)?.key]?.kind;
  if(!kind)continue;
  if(!touristServiceTrips.has(kind))touristServiceTrips.set(kind,new Set());
  const destination=state.buildings.get(v.toId);
  if(!destination?.visitors.has(c.id))touristServiceTrips.get(kind).add(c.id);
 }
 const needs=[
  {kind:'home',label:'บ้าน',capacity:d.housing.capacity,busy:d.housing.used+d.housing.incoming,waiting:d.housing.people},
  {kind:'work',label:'งาน',capacity:d.jobs.capacity,busy:d.jobs.used,waiting:d.jobs.people},
  ...d.services.map(r=>({kind:r.kind,label:r.label,capacity:r.capacity,busy:r.used+r.traveling+(touristServiceTrips.get(r.kind)?.size||0),waiting:r.waiting})),
  {kind:'hotel',label:'โรงแรม',capacity:hotelCapacity,busy:hotelBooked,waiting:hotelUnmet}
 ];
 const html=needs.map(r=>{
  const value=-Math.max(0,r.waiting);
  return '<div class="mini-need'+(value<0?' shortage':'')+'" data-need-kind="'+r.kind+'" title="'+e(r.label)+' · ความจุ '+fmt(r.capacity)+' · กำลังใช้ '+fmt(r.busy)+' · ความต้องการ '+value+'"><span>'+e(r.label)+'</span><div class="mini-need-values"><b class="mini-need-capacity">'+fmt(r.capacity)+'</b><b class="mini-need-busy">'+fmt(r.busy)+'</b><strong class="mini-need-missing">'+value+'</strong></div></div>';
 }).join('');
 set('demand',html);
 set('advisorHeadline',e(advice.headline));set('advisorOverview',e(advice.overview));set('advisorGood',advice.good.map(t=>'<li>'+e(t)+'</li>').join('')||'<li>เริ่มจากบ้านและถนน แล้วรอชีวิตเมืองเริ่มเดินทาง</li>');set('advisorProblems',advice.problems.map(t=>'<li>'+e(t)+'</li>').join('')||'<li>ยังไม่พบปัญหาที่ต้องเร่งแก้จากข้อมูลปัจจุบัน</li>');
 set('advisorNext',advice.next.map((a,i)=>'<li><span>'+e(a.text)+'</span>'+(a.report?'<button data-advice-report>ตรวจเมือง</button>':a.category?'<button data-advice-category="'+a.category+'">เปิดหมวดสร้าง</button>':'')+'</li>').join(''));
}

function updateUI(){const s=computeStats();$('money').textContent=money(state.money);$('population').innerHTML=fmt(s.pop)+' <em>คน</em>';if($('tourists'))$('tourists').innerHTML=fmt(touristPeople().filter(c=>c.enteredAt!=null).length)+' <em>คน</em>';$('happy').innerHTML=Math.round(s.happy)+'<em>%</em>';$('flow').innerHTML=Math.round(s.flow)+'<em>%</em>';$('clock').textContent=timeText(state.time);$('day').textContent=['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'][Math.floor(state.time/1440)%7]+' · วันที่ '+(Math.floor(state.time/1440)+1);$('sun').style.left=(state.time%1440)/1440*100+'%';$('net').textContent=(s.net>=0?'+':'')+money(s.net);$('net').classList.toggle('warning',s.net<0);const steps=[{done:[...state.roads.values()].some(r=>!r.main),text:'ต่อถนนเล็กจากถนนหลัก'},{done:s.homes>0,text:'สร้างบ้านติดถนน รอคนย้ายเข้า'},{done:s.jobs>0,text:'สร้างงานให้ประชาชน'}];$('steps').textContent=steps.filter(s=>s.done).length+' / 3';$('guide').innerHTML=steps.map((s,i)=>`<div class="guide-item ${s.done?'done':'current'}"><b>${s.done?'✓':i+1}</b><span>${s.text}</span></div>`).join('');updateCityAdvisor();$('news').innerHTML=news.slice(0,3).map(n=>`<div class="news-item"><time>${timeText(n.time)}</time>${n.text}</div>`).join('');const stranded=[...state.vehicles.values()].filter(v=>v.phase==='stuck'||v.departureNoRoute).length;$('status').textContent=stranded?'รถรอเส้นทาง '+stranded+' คัน · เมนู ☰ → ตรวจเมือง / รายงานบัค':s.pop?`รถเดินทาง ${state.vehicles.size} คัน · รอคิว ${s.waiting} คัน · คลิกที่รถเพื่อดูชีวิตประชาชน`:'ลากเพื่อเลื่อนแผนที่ · เลื่อนล้อเพื่อซูม';document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===state.speed));$('pause').textContent=state.speed?'Ⅱ':'▶';if(selected&&!document.activeElement?.classList?.contains?.('signal-minutes'))renderInspector();renderCitizenDashboard();renderTouristDashboard();}
function timeText(t){t=Math.floor(t%1440);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function computeStats(){let pop=0,happy=0,homes=0,freeHomes=0,jobs=0,unemployed=0,serviceNeed=0,tax=0,business=0,maint=0,waiting=0;for(const b of state.buildings.values()){const t=CATALOG[b.key];homes+=t.residents;freeHomes+=Math.max(0,t.residents-(b.residents?.size||0)-(b.reservedResidents||0));jobs+=t.jobs;maint+=t.maint;business+=(b.workers?.size||0)*50;}for(const c of state.citizens.values()){if(!c.resident||c.removed)continue;pop++;happy+=c.happy;if(c.profile.trait!==3&&!c.workId&&!c.movingOut)unemployed++;if(c.pending&&['shop','restaurant','mall','park','pub'].includes(c.pending.kind))serviceNeed++;if(!c.movingOut)tax+=c.late?250:500;}for(const r of state.roads.values())if(!r.main)maint+=ROADS[r.type].maint;for(const v of state.vehicles.values())if(v.wait>1||v.phase!=='driving')waiting++;const flow=state.vehicles.size?100*(1-waiting/state.vehicles.size):100;return state.stats={pop,happy:pop?happy/pop:100,homes,freeHomes,jobs,unemployed,serviceNeed,tax,business,maint,net:tax+business-maint,waiting,flow};}

// Aggregate actual citizen records; interpretation is clearly labeled and no
// fictional survey responses are generated.
const CITIZEN_TRAITS=['ขยัน','ชิล ๆ','สายชิล','บ้านรวย'];
const CITIZEN_FILTERS=[['all','ทั้งหมด'],['unhappy','ไม่มีความสุข'],['critical','วิกฤต'],['issues','มีปัญหา'],['jobless','ไม่มีงาน'],['travel','กำลังเดินทาง'],['late','มาสาย']];
let citizenFilter='all',citizenSearch='',citizenPage=0,citizenDashboardUpdatedAt=0;
function citizenDashboardData(){
 const people=[],traits=[0,0,0,0],moods=[0,0,0,0],rush=Array(12).fill(0),lifestyles=Array(12).fill(0);
 const problems=new Map(),locations={home:0,work:0,service:0,travel:0,other:0};
 const summary={population:0,average:100,unhappy:0,critical:0,jobless:0,waiting:0,travel:0,late:0,adaptive:0,movingOut:0,issues:0};
 let happinessSum=0;
 const today=Math.floor(state.time/1440);
 const addIssue=(label)=>problems.set(label,(problems.get(label)||0)+1);
 for(const c of state.citizens.values()){
  if(!c.resident||c.removed)continue;
  const vehicle=state.vehicles.get(c.vehicleId),mood=Number.isFinite(c.happy)?Math.max(0,Math.min(100,c.happy)):0;
  const plan=c.dailyPlan?.day===today?c.dailyPlan:planForDay(c,today);
  const noJob=c.profile.trait!==3&&!c.workId&&!c.movingOut;
  const blocked=!!c.pending||!!vehicle&&(vehicle.phase==='stuck'||vehicle.departureNoRoute||(vehicle.wait||0)>=8);
  const issue=blocked||noJob||c.movingOut||mood<60;
  people.push({c,vehicle,mood,plan,noJob,blocked,issue});
  if(Number.isInteger(plan.style))lifestyles[plan.style]++;
  summary.population++;happinessSum+=mood;
  traits[Math.max(0,Math.min(3,c.profile?.trait||0))]++;
  moods[mood<40?0:mood<60?1:mood<80?2:3]++;
  if(mood<60)summary.unhappy++;
  if(mood<40)summary.critical++;
  if(noJob){summary.jobless++;addIssue('ไม่มีตำแหน่งงาน');}
  if(vehicle){summary.travel++;locations.travel++;if((vehicle.wait||0)>=8)summary.waiting++;}
  else if(c.locationId===c.homeId)locations.home++;
  else if(c.workId&&c.locationId===c.workId)locations.work++;
  else if(state.buildings.get(c.locationId)?.key&&CATALOG[state.buildings.get(c.locationId).key].service)locations.service++;
  else locations.other++;
  if(c.late)summary.late++;
  if((c.routine?.advance||0)>0)summary.adaptive++;
  if(c.movingOut){summary.movingOut++;addIssue('กำลังเตรียมย้ายออก');}
  if(c.pending){
   const p=c.pending,description=p.action==='work'?'เดินทางไปทำงานไม่ได้':p.action==='leisure'?'รอกิจกรรมหรือบริการ':p.action==='home'?'กลับบ้านไม่ได้':'รอการเดินทาง';
   addIssue(description);
  }else if(vehicle&&(vehicle.phase==='stuck'||vehicle.departureNoRoute))addIssue('รถไม่มีเส้นทาง');
  else if(vehicle&&(vehicle.wait||0)>=8)addIssue('รถติดหรือรอคิวนาน');
  if(issue)summary.issues++;
  // Estimate each leg across all 24 hours, including last night's itinerary.
  for(const p of [c.lifePlans?.[today-1],plan].filter(Boolean))for(const step of p.steps||[]){
   const at=p.day*1440+(step.estimatedAt??step.at);
   if(at>=today*1440&&at<(today+1)*1440)rush[Math.floor((at-today*1440)/120)]++;
  }
 }
 summary.average=summary.population?happinessSum/summary.population:100;
 return{summary,traits,moods,rush,lifestyles,problems:[...problems.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6),locations,people,today};
}
function citizenRiskText(record){
 const {c,vehicle,noJob,mood}=record;
 if(c.movingOut)return'กำลังเตรียมย้ายออก';
 if(vehicle?.phase==='stuck'||vehicle?.departureNoRoute)return'ไม่มีเส้นทางเดินรถ';
 if(c.pending)return c.problem||'มีการเดินทางหรือกิจกรรมรอดำเนินการ';
 if(vehicle&&(vehicle.wait||0)>=8)return'รอรถติด '+Math.round(vehicle.wait||0)+' นาทีเกม';
 if(noJob)return'ยังไม่มีตำแหน่งงาน';
 if(mood<40)return'ความสุขต่ำมาก · ปัญหาล่าสุด: '+(c.problem||'ยังไม่ระบุ');
 if(mood<60)return'ความสุขต่ำ · ปัญหาล่าสุด: '+(c.problem||'ยังไม่ระบุ');
 if(c.late)return'เคยไปทำงานสายวันนี้';
 return c.state||'อยู่ในเมือง';
}
function filteredCitizenRecords(data){
 const query=citizenSearch.trim().toLocaleLowerCase('th-TH');
 const matches=data.people.filter(p=>{
  const {c,vehicle,mood,noJob,issue}=p;
  const passes=citizenFilter==='unhappy'?mood<60:citizenFilter==='critical'?mood<40:
   citizenFilter==='issues'?issue:citizenFilter==='jobless'?noJob:
   citizenFilter==='travel'?!!vehicle:citizenFilter==='late'?!!c.late:true;
  return passes&&(!query||String(c.id).includes(query)||citizenName(c).toLocaleLowerCase('th-TH').includes(query));
 });
 matches.sort((a,b)=>a.mood-b.mood||Number(b.issue)-Number(a.issue)||a.c.id-b.c.id);
 return matches;
}
function showCitizenDashboard(){
 const panel=$('citizensDashboard');if(!panel)return;
 selected=null;$('inspector').classList.add('hidden');
 panel.classList.remove('hidden');citizenDashboardUpdatedAt=0;
 renderCitizenDashboard(true);
}
function hideCitizenDashboard(){const panel=$('citizensDashboard');if(panel)panel.classList.add('hidden');}
function renderCitizenDashboard(force=false){
 const panel=$('citizensDashboard');
 if(!panel||tool!=='citizenDashboard'||panel.classList.contains('hidden'))return;
 if(!force&&Date.now()-citizenDashboardUpdatedAt<1500)return;
 citizenDashboardUpdatedAt=Date.now();
 const data=citizenDashboardData(),{summary:m,traits,moods,rush,problems,locations}=data;
 $('citizenDashDay').textContent='วันที่ '+(data.today+1)+' · '+timeText(state.time);
 const filters=$('citizenFilters');
 // Filter controls are separate from the refreshing contents so text input
 // and scroll position remain stable as the game progresses.
 if(filters&&!filters.children.length)filters.innerHTML=CITIZEN_FILTERS.map(([key,label])=>
  '<button data-citizen-filter="'+key+'">'+label+'</button>').join('');
 for(const b of filters?.querySelectorAll('[data-citizen-filter]')||[])
  b.classList.toggle('active',b.dataset.citizenFilter===citizenFilter);
 const bar=(label,count,total,accent='')=>'<div class="citizen-bar-row"><span>'+label+
  '</span><span class="citizen-bar-track"><i class="citizen-bar-fill '+accent+
  '" style="width:'+Math.min(100,100*count/Math.max(1,total))+'%"></i></span><strong>'+fmt(count)+'</strong></div>';
 const tile=(value,label,urgent=false)=>'<div class="citizen-kpi'+(urgent?' urgent':'')+'"><b>'+value+'</b><span>'+label+'</span></div>';
 const section=(label,meta,content)=>'<section class="citizen-section"><div class="citizen-section-head"><h3>'+label+'</h3><small>'+meta+'</small></div>'+content+'</section>';
 const records=filteredCitizenRecords(data),shown=records.slice(0,(citizenPage+1)*40);
 const card=p=>{
  const c=p.c,issue=citizenRiskText(p),score=p.mood<40?'critical':p.mood<60?'low':'';
  return'<button class="citizen-person" data-citizen-id="'+c.id+'" title="ดูชีวิตประชาชน '+c.id+'"><span class="citizen-person-main"><b>'+
   escapeSaveText(citizenName(c))+'</b><small>'+escapeSaveText(CITIZEN_TRAITS[c.profile?.trait]||'ประชาชน')+
   ' · '+escapeSaveText(lifestyleName(p.plan))+' · '+escapeSaveText(issue)+'</small></span><span class="citizen-person-score"><strong class="'+score+'">'+Math.round(p.mood)+'%</strong><em>ความสุข</em></span></button>';
 };
 const total=fmt(m.population),mean=Math.round(m.average);
 const html='<div class="citizen-kpis">'+tile(total,'ประชาชนในเมือง')+tile(mean+'%','ความสุขเฉลี่ย')+
  tile(fmt(m.unhappy),'ความสุขต่ำกว่า 60%',m.unhappy>0)+tile(fmt(m.critical),'วิกฤต ต่ำกว่า 40%',m.critical>0)+
  tile(fmt(m.jobless),'ยังไม่มีงาน')+tile(fmt(m.travel),'กำลังเดินทาง')+
  tile(fmt(m.waiting),'รถรอนาน ≥ 8 นาทีเกม')+tile(fmt(m.issues),'คนที่ควรดูแล',m.issues>0)+'</div>'+
  '<div class="citizen-pair">'+
   section('ลักษณะนิสัย','อ้างอิงโปรไฟล์ประชาชน',traits.map((count,i)=>bar(CITIZEN_TRAITS[i],count,m.population,i===3?'cool':'')).join(''))+
   section('ระดับความสุข','สัดส่วนปัจจุบัน',bar('ดี 80–100%',moods[3],m.population)+
    bar('ปานกลาง 60–79%',moods[2],m.population,'cool')+bar('ต่ำ 40–59%',moods[1],m.population,'warning')+
    bar('วิกฤต 0–39%',moods[0],m.population,'danger'))+'</div>'+
  section('รูปแบบชีวิตวันนี้','เปลี่ยนได้รายวัน · สัดส่วนจริงตามงานและสถานที่',data.lifestyles.map((count,i)=>bar(LIFESTYLES[i].name,count,m.population)).join(''))+
  section('ชีวิตประจำวัน · อยู่ที่ไหน','นับตามสถานะปัจจุบัน','<div class="citizen-signal-grid">'+
   [['อยู่บ้าน',locations.home],['อยู่ที่ทำงาน',locations.work],['กำลังใช้บริการ',locations.service],['เดินทาง',locations.travel],['อื่น ๆ',locations.other],['ปรับออกเช้าหลังมาสาย',m.adaptive]].map(([label,num])=>'<div><b>'+fmt(num)+'</b><small>'+label+'</small></div>').join('')+'</div>')+
  section('ช่วงเวลาเดินทางที่วางแผนไว้','ประมาณการทุกกิจกรรม 00–24 น. · รวมกะข้ามคืน ไม่ใช่จำนวนรถจริง',
   '<div class="citizen-rush-chart">'+rush.map((count,i)=>'<div class="citizen-rush-col"><div class="citizen-rush-bar" title="'+fmt(count)+' กิจกรรม" style="height:'+
    Math.max(2,Math.round(count/Math.max(1,...rush)*61))+'px"></div><small>'+String(i*2).padStart(2,'0')+'</small></div>').join('')+'</div>')+
  section('ปัญหาที่ระบบตรวจพบ','ค้างอยู่หรือเพิ่งเกิดขึ้น',
   '<div class="citizen-issues">'+(problems.length?problems.map(([label,count])=>'<span class="citizen-issue">'+escapeSaveText(label)+' <strong>'+fmt(count)+'</strong></span>').join(''):'<span class="citizen-note">ยังไม่พบปัญหาที่ค้างอยู่</span>')+'</div>')+
  section('รายชื่อประชาชนที่ต้องติดตาม',fmt(records.length)+' คนตามตัวกรอง',
   '<div class="citizen-results">'+(shown.length?shown.map(card).join(''):'<div class="citizen-empty">ยังไม่พบประชาชนตามเงื่อนไขนี้ค่ะ</div>')+'</div>'+
   (shown.length<records.length?'<button class="citizen-more" data-citizen-more="1">ดูเพิ่มอีก 40 คน</button>':'')+
   '<p class="citizen-note">“ความคิด/ความกังวล” ประเมินจากความสุข ปัญหาล่าสุด งาน และการเดินทางของตัวละคร ไม่ใช่คำพูดหรือความคิดเห็นจริงของประชาชน</p>');
 const body=$('citizensDashboardBody'),scroll=body.scrollTop;body.innerHTML=html;body.scrollTop=scroll;
}
const TREE_KINDS=[{key:'shade',name:'ต้นไม้พุ่มกลม',icon:'🌳'},{key:'palm',name:'ต้นปาล์ม',icon:'🌴'},{key:'flower',name:'ไม้ดอก',icon:'🌸'},{key:'pine',name:'ต้นสน',icon:'🌲'},{key:'shrub',name:'ไม้พุ่ม',icon:'🌿'},{key:'banyan',name:'ต้นไม้ใหญ่',icon:'🌳'}];
let currentTreeKind='shade';
function landscapeClear(x,y){
 const xx=Math.floor(x),yy=Math.floor(y);
 if(!valid(xx,yy))return false;
 if(state.city==='phuket'&&renderer3d&&x<renderer3d.coast(y)+2.8)return false;
 if(state.city==='bangkok'&&Math.abs(x-(125+Math.sin(y*.047)*5))<6)return false;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const ax=xx+dx,ay=yy+dy;if(!valid(ax,ay))return false;
  const i=id(ax,ay);if(state.footprint[i]>=0||state.buildGrid[i]>=0)return false;
 }
 return true;
}
function plantLandscape(x,y,kind=currentTreeKind){
 if(!TREE_KINDS.some(k=>k.key===kind)||!landscapeClear(x,y)||state.plantedTrees.length>=4000)return false;
 const tx=Math.floor(x)+.5,ty=Math.floor(y)+.5;
 if(state.plantedTrees.some(t=>Math.hypot(t.x-tx,t.y-ty)<1.1))return false;
 state.plantedTrees.push({x:tx,y:ty,kind});state.landscapeVersion++;
 return true;
}
function eraseLandscape(x,y){
 let nearest=-1,distance=1.8;
 state.plantedTrees.forEach((t,i)=>{const d=Math.hypot(t.x-x,t.y-y);if(d<distance){distance=d;nearest=i;}});
 if(nearest>=0){state.plantedTrees.splice(nearest,1);state.landscapeVersion++;return true;}
 // The automatic forest is procedural: store an exclusion mask, never delete a road or a building.
 const hidden=new Set(state.hiddenAutoTrees||[]);
 const xx=Math.floor(x),yy=Math.floor(y),before=hidden.size;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const ax=xx+dx,ay=yy+dy;if(valid(ax,ay))hidden.add(id(ax,ay));
 }
 if(hidden.size===before)return false;
 state.hiddenAutoTrees=[...hidden].slice(-6000);state.landscapeVersion++;return true;
}
function plantLandscapeStroke(d,x,y,spacing=2){
 const p=world(x,y),x1=Math.floor(p[0]),y1=Math.floor(p[1]),steps=Math.max(Math.abs(x1-d.x),Math.abs(y1-d.y)),count=Math.max(1,Math.ceil(steps/spacing));let planted=0;
 for(let i=0;i<=count;i++){const xx=Math.round(d.x+(x1-d.x)*i/count),yy=Math.round(d.y+(y1-d.y)*i/count);if(spacing<=1.2){
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    if(dx*dx+dy*dy>4||(i+dx*5+dy*3)%3===0)continue;
    if(plantLandscape(xx+dx,yy+dy))planted++;
   }
  }else if(plantLandscape(xx,yy))planted++;}
 return planted;
}
function drawPlantedTrees2D(){
 for(const t of state.plantedTrees||[]){if(!landscapeClear(t.x,t.y))continue;const a=screen(t.x,t.y);if(a[0]<-60||a[0]>view.w+60||a[1]<-60||a[1]>view.h+60)continue;tree(t.x,t.y,t.kind==='shrub'?.44:t.kind==='banyan'?1.4:t.kind==='palm'?1.15:1);}
}
const categories=[['roads','ถนน'],['home','บ้าน'],['work','งานและโรงงาน'],['food','ร้านค้าและอาหาร'],['leisure','พักผ่อน'],['landscape','ต้นไม้และตกแต่ง'],['signals','ไฟจราจร'],['citizens','ประชาชน'],['tourists','นักท่องเที่ยว'],['hotel','โรงแรม'],['tracking','ติดตามรถ'],['manage','รื้อถอน']];
/* Separate WHAT to do (main dock group) from WHICH tool to use.
   category and tool retain their original keys for save/simulation compatibility. */
const dockGroups=[
 {key:'build',icon:'🏙️',name:'สิ่งปลูกสร้าง',categories:['roads','home','work','food','leisure','hotel']},
 {key:'green',icon:'🌳',name:'ตกแต่ง',categories:['landscape']},
 {key:'insights',icon:'📊',name:'ข้อมูลเมือง',categories:['citizens','tourists','tracking']},
 {key:'traffic',icon:'🚦',name:'การจราจร',categories:['signals']},
 {key:'manage',icon:'🛠️',name:'จัดการ',categories:['manage']}
];
let dockGroup='build';
function toggleTrafficHeat(){heat=!heat;renderTools();}
function renderTools(){
 const activeGroup=dockGroups.find(g=>g.categories.includes(category))||dockGroups[0];
 dockGroup=activeGroup.key;
 const groupTitle=$('dockCurrentGroup');
 if(groupTitle)groupTitle.textContent=activeGroup.name;
 $('categories').innerHTML=dockGroups.map(g=>`<button type="button" data-dock-group="${g.key}" class="${dockGroup===g.key?'active':''}" aria-pressed="${dockGroup===g.key}" title="${g.name}"><span class="dock-group-icon" aria-hidden="true">${g.icon}</span><span class="dock-group-name">${g.name}</span></button>`).join('');
 const sub=$('subcategories');
 if(sub){sub.hidden=activeGroup.categories.length===1;
 sub.innerHTML=categories.filter(([key])=>activeGroup.categories.includes(key)).map(([k,n])=>`<button type="button" data-category="${k}" class="${category===k?'active':''}" aria-pressed="${category===k}">${n}</button>`).join('');}
 let items=[];if(category==='roads'){items=['small','medium','large'].map(k=>({key:k,name:ROADS[k].name,icon:'═',price:fmt(ROADS[k].cost)}));}else if(category==='landscape'){items=[...TREE_KINDS.map(t=>({key:'tree:'+t.key,name:t.name,icon:t.icon,sub:'แตะเพื่อปลูกทีละต้น',price:'ตกแต่งฟรี'})),{key:'treeRow',name:'ปลูกเป็นแนว',icon:'🌱',sub:'ลากเพื่อปลูกเป็นแถว · '+TREE_KINDS.find(t=>t.key===currentTreeKind).name,price:'ตกแต่งฟรี'},{key:'treeBrush',name:'ปลูกเป็นกลุ่ม',icon:'🌿',sub:'ลากเพื่อปลูกเป็นกลุ่ม · '+TREE_KINDS.find(t=>t.key===currentTreeKind).name,price:'ตกแต่งฟรี'},{key:'eraseTree',name:'ลบต้นไม้',icon:'⌫',sub:'แตะเพื่อลบต้นไม้ที่ปลูก หรือเว้นบริเวณต้นไม้อัตโนมัติ',price:'ไม่มีค่ารื้อ'}];}else if(category==='signals'){items=[{key:'signalManage',name:'ควบคุมไฟจราจร',icon:'🚦',sub:'คลิกแยกเพื่อตั้งค่าเฉพาะจุด',price:'ตั้งค่าเริ่มต้นได้ทั้งเมือง'},{key:'trafficHeat',name:'ความหนาแน่นจราจร',icon:'🌡️',sub:'เปิดหรือปิดแผนที่แสดงความหนาแน่น',price:'แตะเพื่อสลับการแสดงผล'}];}else if(category==='citizens'){items=[{key:'citizenDashboard',name:'แดชบอร์ดประชาชน',icon:'👥',sub:'ความสุข นิสัย ปัญหา และชีวิตประจำวัน',price:'ข้อมูลประชาชนทั้งเมือง'},{key:'hand',name:'สำรวจแผนที่',icon:'↖',sub:'กดคนในแดชบอร์ดเพื่อดูข้อมูล',price:'กลับสู่แผนที่'}];}else if(category==='tourists'){items=[{key:'touristDashboard',name:'นักท่องเที่ยว',icon:'🚐',sub:'รายชื่อ แผนเที่ยว ที่พัก และรายได้',price:'เที่ยวเมืองด้วยรถตู้สีฟ้า'},{key:'hand',name:'สำรวจแผนที่',icon:'↖',sub:'เลือกคนเพื่อดูจุดหมาย',price:'กลับสู่แผนที่'}];}else if(category==='tracking'){items=[{key:'tracking',name:'โหมดติดตาม',icon:'⌁',sub:'เส้นทางรถตามเลนถึงปลายทาง',price:'แตะรถเพื่อดูเหตุผลที่หยุด'},{key:'hand',name:'ปิดโหมดติดตาม',icon:'↖',sub:'กลับไปสำรวจเมือง',price:'ซ่อนเส้นทางรถ'}];}else if(category==='manage'){items=[{key:'hand',name:'สำรวจเมือง',icon:'↖',sub:'ติดตามชีวิต',price:'คลิกอาคารหรือรถ'},{key:'eraseRoad',name:'รื้อถนน',icon:'╳',sub:'ถนนหลักรื้อไม่ได้',price:'ค่ารื้อ 20%'},{key:'eraseBuilding',name:'รื้ออาคาร',icon:'⌫',sub:'คลิกอาคาร',price:'ค่ารื้อ 10%'}];}else{const kinds=category==='work'?['office','factory']:category==='food'?['shop','restaurant','mall']:category==='leisure'?['park','pub']:category==='hotel'?['hotel']:['home'];items=Object.values(CATALOG).filter(t=>kinds.includes(t.kind)&&(t.kind!=='home'||['home_large','home_dual'].includes(t.key))).map(t=>({key:t.key,name:t.name,icon:KINDS[t.kind].icon,capacity:t.beds||t.residents||t.service||t.jobs,price:fmt(t.cost)}));}$('tools').innerHTML=items.map(t=>`<button class="tool ${(t.key==='trafficHeat'?heat:tool===t.key)?'active':''}" data-tool="${t.key}" aria-pressed="${t.key==='trafficHeat'?heat:tool===t.key}" title="${t.key==='trafficHeat'?(heat?'ปิดความหนาแน่นจราจร':'เปิดความหนาแน่นจราจร'):(tool===t.key?'กำลังเลือก · กดซ้ำเพื่อยกเลิก':t.name)}"><span class="tool-icon">${t.icon}</span><span><strong class="tool-name">${t.name}${t.capacity?` <span class="tool-capacity">${t.capacity}</span>`:''}</strong>${!t.capacity&&t.sub?`<small>${t.sub}</small>`:''}<small class="tool-price">${t.price}</small></span></button>`).join('');}
// The building/control dock is presentation-only; selected tools and the
// simulation remain untouched while the dock is folded.
function setDockCollapsed(collapsed){
 const dock=$('buildDock'),button=$('toggleDock'),icon=$('toggleDockIcon'),label=$('toggleDockText');
 if(!dock||!button)return;
 dock.classList.toggle('is-collapsed',!!collapsed);
 button.setAttribute('aria-expanded',String(!collapsed));
 button.setAttribute('aria-label',collapsed?'กางแถบเครื่องมือ':'หุบแถบเครื่องมือ');
 if(icon)icon.textContent=collapsed?'⌃':'⌄';
 if(label)label.textContent=collapsed?'กางเครื่องมือ':'หุบเครื่องมือ';
}
function selectTool(t){if(t.startsWith('tree:'))currentTreeKind=t.slice(5);tool=t;trackingAt=-Infinity;if(t==='citizenDashboard')showCitizenDashboard();else hideCitizenDashboard();if(t==='touristDashboard')showTouristDashboard();else hideTouristDashboard();if(trackingLayer)trackingLayer.style.display=t==='tracking'?'block':'none';renderTools();$('hint').textContent=ROADS[t]?`ลากจากถนนเดิมไปยังจุดที่ต้องการ · ${ROADS[t].name} ${ROADS[t].lanes} เลน · กด Esc เพื่อยกเลิก`:CATALOG[t]?`${CATALOG[t].name} · แปลง ${CATALOG[t].plotWidth}×${CATALOG[t].plotHeight} · ที่จอด ${CATALOG[t].parkingCapacity} คัน · ${money(CATALOG[t].cost)} · ค่าดูแล ${money(CATALOG[t].maint)} / วัน · วางชิดขอบถนน`:t.startsWith('tree:')||t==='treeRow'||t==='treeBrush'?'เลือกพื้นที่โล่งเพื่อปลูกต้นไม้ · ปลูกเป็นแนวหรือกลุ่มด้วยการลาก':t==='eraseTree'?'แตะต้นไม้เพื่อเอาออก · ไม่กระทบอาคารและถนน':t==='tracking'?'โหมดติดตาม · เส้นสีจากรถไปตามเลนถึงปลายทาง · แตะรถดูรายละเอียด · Esc หรือแตะสองครั้งเพื่อปิด':t==='signalManage'?'โหมดไฟจราจร · คลิกที่ทางแยกเพื่อควบคุมไฟเอง หรือปรับค่าเริ่มต้นของทั้งเมือง':t==='citizenDashboard'?'โหมดประชาชน · ดูความสุข ปัญหา และกิจวัตรทั้งเมือง · กดรายชื่อเพื่อดูรายละเอียด':t==='hand'?'ลากแผนที่เพื่อเลื่อน · คลิกอาคารหรือรถเพื่อดูรายละเอียด · หมุนล้อเพื่อซูม':'เลือกสิ่งที่ต้องการรื้อ · ระบบจะแสดงค่ารื้อก่อนยืนยัน';if(t==='signalManage'){selected={kind:'signals'};renderInspector();}}
function modal(html){$('dialogContent').innerHTML=html;$('dialog').showModal();}
function closeModal(){$('dialog').close();}
const row=(a,b)=>`<div class="detail-row"><span>${a}</span><strong>${b}</strong></div>`;
const action=(name,key,value)=>`<button class="action" data-action="${key}" data-value="${value??''}">${name}</button>`;
function globalSignalInspector(){
 const s=state.signalDefaults,count=[...state.roads.keys()].filter(i=>junction(i)>=3).length;
 return `<span class="tag">ระบบไฟจราจรทั้งเมือง</span><h2>🚦 ตั้งค่าไฟทุกแยก</h2>${row('แยกที่มีไฟจราจร',count+' แยก')}`+
 `<section class="signal-control"><h3>ค่าเริ่มต้นไฟเขียวอัตโนมัติ</h3><div class="signal-times">`+
 `<label for="signalDefaultEW">แนวนอน <span><input class="signal-minutes" id="signalDefaultEW" type="number" inputmode="numeric" min="5" max="240" step="1" value="${s.eastWest}"> นาที</span></label>`+
 `<label for="signalDefaultNS">แนวตั้ง <span><input class="signal-minutes" id="signalDefaultNS" type="number" inputmode="numeric" min="5" max="240" step="1" value="${s.northSouth}"> นาที</span></label></div>`+
 `<p class="signal-note">ไฟเหลือง ${SIGNAL_YELLOW_MINUTES} นาที และแดงเคลียร์แยก ${SIGNAL_CLEAR_MINUTES} นาทีต่อช่วง · รอบค่าเริ่มต้น ${s.eastWest+s.northSouth+2*(SIGNAL_YELLOW_MINUTES+SIGNAL_CLEAR_MINUTES)} นาทีเกม</p>`+
 action('บันทึกเป็นค่าเริ่มต้นสำหรับแยกใหม่','signal-defaults-save')+
 action('ใช้เวลานี้กับทุกแยกในเมือง','signal-defaults-apply')+
 action('คืนค่าแนะนำทุกแยก (6 + 6 นาที)','signal-defaults-reset')+
 `<p class="signal-note">ใช้เวลานี้กับทุกแยกจะคงโหมดควบคุมเองไว้ · คืนค่าแนะนำจะเปลี่ยนทุกแยกกลับเป็นอัตโนมัติ ไฟเขียวฝั่งละ 6 นาที พร้อมช่วงไฟเหลืองและแดงเคลียร์แยก · คลิกแยกบนแผนที่เพื่อปรับทีละจุด</p></section>`;
}
function signalInspector(i){
 const setting=signalSettings(i),status=signalStatus(i),manual=setting.mode==='manual',direction=status.phase===0?'ตะวันออก–ตะวันตก':status.phase===1?'เหนือ–ใต้':status.phase===2?'ไฟเหลือง':'แดงทุกทิศ';
 const color=axis=>signalColor(i,axis),remaining=status.remaining==null?'รอสั่งสลับไฟ':Math.ceil(status.remaining)+' นาทีในเกม';
 return `<section class="signal-control" data-node="${i}"><h3>🚦 ควบคุมไฟแยกนี้</h3><div class="signal-current"><span class="signal-mode">${manual?'ควบคุมเอง':'อัตโนมัติ'}</span><strong>${direction}</strong><small>${remaining}</small></div>`+
 `<div class="signal-direction" data-axis="0"><span class="signal-lamp ${color(0)}"></span><span>↔ ตะวันออก–ตะวันตก</span><b>${color(0)==='green'?'เขียว':color(0)==='yellow'?'เหลือง':'แดง'}</b></div>`+
 `<div class="signal-direction" data-axis="1"><span class="signal-lamp ${color(1)}"></span><span>↕ เหนือ–ใต้</span><b>${color(1)==='green'?'เขียว':color(1)==='yellow'?'เหลือง':'แดง'}</b></div>`+
 `<h3>ตั้งเวลาไฟเขียวอัตโนมัติ</h3><div class="signal-times"><label for="signalEW">แนวนอน <span><input class="signal-minutes" id="signalEW" type="number" inputmode="numeric" min="5" max="240" step="1" value="${setting.eastWest}"> นาที</span></label>`+
 `<label for="signalNS">แนวตั้ง <span><input class="signal-minutes" id="signalNS" type="number" inputmode="numeric" min="5" max="240" step="1" value="${setting.northSouth}"> นาที</span></label></div>`+
 `<p class="signal-note">ไฟเหลือง ${SIGNAL_YELLOW_MINUTES} นาที และแดงทุกทิศ ${SIGNAL_CLEAR_MINUTES} นาทีต่อครั้ง</p>${action('บันทึกเวลาไฟแยกนี้','signal-save',i)}`+
 (manual?`<div class="signal-manual">${action('สลับไฟ → '+(setting.axis===0?'เหนือ–ใต้':'ตะวันออก–ตะวันตก'),'signal-switch',i)}${action('กลับสู่ระบบอัตโนมัติ','signal-auto',i)}</div>`:action('ควบคุมไฟเอง','signal-manual',i))+
 (category==='signals'?action('ตั้งค่าไฟจราจรทั้งเมือง','signal-global',i):'')+`</section>`;
}
function refreshSignalInspector(i){
 const root=$('inspectContent').querySelector?.(`.signal-control[data-node="${i}"]`);
 if(!root)return false;
 const status=signalStatus(i),mode=signalSettings(i).mode;
 root.querySelector('.signal-mode').textContent=mode==='manual'?'ควบคุมเอง':'อัตโนมัติ';
 root.querySelector('.signal-current strong').textContent=status.phase===0?'ตะวันออก–ตะวันตก':status.phase===1?'เหนือ–ใต้':status.phase===2?'ไฟเหลือง':'แดงทุกทิศ';
 root.querySelector('.signal-current small').textContent=status.remaining==null?'รอสั่งสลับไฟ':Math.ceil(status.remaining)+' นาทีในเกม';
 for(const axis of [0,1]){const line=root.querySelector(`.signal-direction[data-axis="${axis}"]`),color=signalColor(i,axis);line.querySelector('.signal-lamp').className='signal-lamp '+color;line.querySelector('b').textContent=color==='green'?'เขียว':color==='yellow'?'เหลือง':'แดง';}
 return true;
}
function renderInspector(force=false){
if(!selected)return;const s=computeStats();let html='';
if(!force&&selected.kind==='road'&&state.roads.has(selected.id)&&junction(selected.id)>=3&&refreshSignalInspector(selected.id))return;
if(selected.kind==='signals')html=globalSignalInspector();
else if(selected.kind==='building'){const b=state.buildings.get(selected.id);if(!b){selected=null;$('inspector').classList.add('hidden');return;}const t=CATALOG[b.key];html=`<span class="tag">${KINDS[t.kind].icon} อาคาร #${b.id}</span><h2>${t.name}</h2>`+row('พื้นที่รวมลานจอด',buildingBounds(b).w+' × '+buildingBounds(b).h)+row('ค่าดูแล / วัน',money(t.maint));if(t.beds)html+=row('ผู้จองที่พัก / เตียง',(b.guests?.size||0)+' / '+t.beds)+row('กำลังพักโรงแรม',[...(b.guests||[])].filter(id=>state.citizens.get(id)?.sleepUntil>state.time).length+' คน');if(t.residents)html+=row('ผู้อยู่อาศัย',b.residents.size+' / '+t.residents)+row('กำลังย้ายเข้า',b.reservedResidents+' คน');if(t.jobs)html+=row('พนักงาน',b.workers.size+' / '+t.jobs);if(t.service)html+=row('ผู้ใช้บริการ',b.visitors.size+' / '+t.service)+row('จองเดินทางมา',b.reservedService+' คน');html+=row('รถกำลังเดินทางมา',buildingTraffic(b).approaching+' คัน')+row('รถจอด / รองรับสูงสุด',b.parked.size+' / '+buildingTraffic(b).max+' คัน')+row('รอออกจากอาคาร',b.queue.length+' คัน')+row('รอเส้นทาง',[...b.queue].filter(id=>state.vehicles.get(id)?.departureNoRoute).length+' คัน')+row('เดินทางมาถึง',b.arrivals+' ครั้ง')+'<h3>การเข้าออก</h3><p>เข้าออกจากขอบทางฝั่งซ้ายตามทิศรถ หากอยู่คนละฝั่ง รถต้องวนกลับตามเส้นทาง</p>';const people=[...new Set([...b.residents,...b.workers,...b.visitors,...(b.guests||[])])].slice(0,24);if(people.length)html+='<h3>ประชาชน</h3><div class="inspect-list">'+people.map(c=>action(citizenName(state.citizens.get(c)), 'citizen',c)).join('')+'</div>';html+=action('รื้ออาคารนี้','demolish',b.id);}
else if(selected.kind==='citizen'||selected.kind==='vehicle'){const v=selected.kind==='vehicle'?state.vehicles.get(selected.id):null,c=selected.kind==='citizen'?state.citizens.get(selected.id):v?.citizenId?state.citizens.get(v.citizenId):null;if(!c&&!v){html='<h2>เดินทางถึงจุดหมายแล้ว</h2><p>รถคันนี้เดินทางเสร็จแล้ว เลือกอาคารปลายทางเพื่อดูประชาชนต่อค่ะ</p>';}else if(c?.tourist){html=touristInspector(c);}else if(c){const cv=state.vehicles.get(c.vehicleId);html=`<span class="tag">ชีวิตประชาชน #${c.id}</span><h2>${citizenName(c)}</h2>`+row('บุคลิก',['ขยัน','ชิล ๆ','สายชิล','บ้านรวย'][c.profile.trait])+row('รูปแบบชีวิตวันนี้',lifestyleName(c.dailyPlan))+row('สถานะ',c.state)+row('ความสุข',Math.round(c.happy)+'%')+row('ภาษีวันนี้',money(c.late?250:500))+row('บ้าน',buildingName(c.homeId))+row('งาน',c.profile.trait===3?'ไม่ต้องทำงาน':buildingName(c.workId))+row('ปัญหาล่าสุด',c.problem||'ยังไม่มีปัญหา');if(cv)html+=row('การเดินทาง',TRIPS[cv.kind].name)+row('จุดหมาย',cv.toId?buildingName(cv.toId):'ประตูเมือง')+row('เวลารอ',Math.floor(cv.wait)+' นาที')+action(follow===cv.id?'หยุดติดตามรถ':'ติดตามรถและเส้นทาง','follow',cv.id)+vehicleRecoveryActions(cv);html+='<h3>ตารางชีวิต</h3>'+row('ออกทำงานวันนี้',c.dailyPlan?.works?timeText(c.dailyPlan.day*1440+c.dailyPlan.leave):'—')+row('เลิกงานวันนี้',c.dailyPlan?.works?timeText(c.dailyPlan.day*1440+c.dailyPlan.end):'—')+row('ปรับออกเร็วขึ้น',Math.round(c.routine?.advance||0)+' นาที')+row('กิจกรรมโปรด',KINDS[c.profile.leisure]?.name||'กลับบ้าน');if(c.dailyPlan?.steps?.length)html+='<h3>แผนกิจกรรมวันนี้</h3><p>'+c.dailyPlan.steps.map(s=>timeText(c.dailyPlan.day*1440+(s.estimatedAt??s.at))+' '+lifestyleStepName(s)+((s.estimatedAt??s.at)>=1440?' (วันถัดไป)':'')).join('<br>')+'</p><p>เวลาโดยประมาณ ปรับตามการเดินทางและเวลาถึงจริง</p>';if(c.lifeRun&&c.lifeRun.day!==c.dailyPlan?.day)html+=row('กิจกรรมต่อจากวันก่อน',lifestyleStepName(c.lifeRun.plan.steps[c.lifeRun.index]));if(c.history.length)html+='<h3>การเดินทางล่าสุด</h3><p>'+c.history.slice(-4).reverse().join('<br>')+'</p>';}
else html='<span class="tag">รถภายนอก</span><h2>เดินทางผ่านเมือง</h2><p>รถจากประตูเมืองหนึ่งไปอีกประตูเมืองหนึ่ง ไม่มีประชาชนเจ้าของในเมืองนี้</p>'+action('ติดตามเส้นทาง','follow',v.id)+vehicleRecoveryActions(v);}
else if(selected.kind==='road'){const r=state.roads.get(selected.id);if(!r){$('inspector').classList.add('hidden');return;}const t=ROADS[r.type],j=junction(selected.id);html='<span class="tag">โครงข่ายจราจร</span><h2>'+t.name+'</h2>'+row('จำนวนเลน',t.lanes+' เลน')+row('ความจุจริง',t.lanes+' คัน / ช่อง')+row('รถในช่องนี้',occupancy(selected.id)+' คัน')+row('ค่าดูแล / วัน',r.main?'ฟรี':money(t.maint))+row('ทางแยก',j===4?'สี่แยก · ไฟจราจร':j===3?'สามแยก · ไฟจราจร':j===1?'ทางตัน · กลับรถไม่ได้':'ถนนต่อเนื่อง')+'<p>'+(r.main?'ถนนหลักเริ่มต้นของเมือง รื้อไม่ได้':'รถขับชิดซ้ายและใช้เลนตามเส้นทาง เมื่อเต็มจะรอคิว')+'</p>';if(j>=3)html+=signalInspector(selected.id);}
else if(selected.kind==='money')html='<span class="tag">การคลังเมือง</span><h2>งบประมาณ</h2>'+row('เงินคงเหลือ',money(state.money))+row('ภาษีประชาชน / วัน',money(s.tax))+row('ภาษีธุรกิจ / วัน',money(s.business))+row('ท่องเที่ยวรับจริงวันนี้',money(tourismLedger().fees-tourismLedger().refunds))+row('ค่าดูแลทั้งหมด / วัน',money(s.maint))+row('สุทธิ / วัน',money(s.net))+'<p>ประชาชนจ่ายภาษี 500 บาทต่อวัน หากไปสาย ภาษีของคนนั้นลดครึ่งหนึ่ง ถนนหลักไม่มีค่าดูแล</p>';
else if(selected.kind==='tourists')html='<span class="tag">การท่องเที่ยว</span><h2>นักท่องเที่ยว</h2>'+touristSummaryMarkup()+action('ดูรายชื่อนักท่องเที่ยว','tourist-dashboard');
else if(selected.kind==='population')html='<span class="tag">ผู้คนในเมือง</span><h2>ประชากร '+s.pop+' คน</h2>'+row('กำลังย้ายเข้า',[...state.citizens.values()].filter(c=>!c.resident&&!c.removed&&!c.tourist).length+' คน')+row('ที่ว่างในบ้าน',s.freeHomes+' คน')+row('ตำแหน่งงานทั้งหมด',s.jobs)+row('ว่างงาน',s.unemployed+' คน')+'<p>มีบ้านว่าง เส้นทางจากประตูเมือง และความสุขตั้งแต่ 70% จึงจะมีคนย้ายเข้า คนจะนับเป็นประชากรเมื่อเดินทางถึงบ้านจริง</p><div class="inspect-list">'+[...state.citizens.values()].filter(c=>c.resident&&!c.removed).slice(0,40).map(c=>action(citizenName(c),'citizen',c.id)).join('')+'</div>';
else if(selected.kind==='happiness')html='<span class="tag">คุณภาพชีวิต</span><h2>ความสุข '+Math.round(s.happy)+'%</h2>'+row('มีความสุข',[...state.citizens.values()].filter(c=>c.resident&&c.happy>=80).length+' คน')+row('กำลังมีปัญหา',[...state.citizens.values()].filter(c=>c.resident&&c.happy<55).length+' คน')+'<p>ไปทำงานและใช้บริการทันเวลาช่วยให้มีความสุข รถติด ไปสาย ไม่มีงาน และขาดบริการทำให้ความสุขลดลง</p><p>ต่ำกว่า 25% หรือว่างงาน 2 วัน ประชาชนจะเตรียมย้ายออก</p>';
else html='<span class="tag">การเดินทาง</span><h2>จราจรในเมือง</h2>'+row('รถทั้งหมด',state.vehicles.size+' คัน')+row('กำลังรอ',s.waiting+' คัน')+row('ความคล่องตัว',Math.round(s.flow)+'%')+'<p>คลิกที่รถเพื่อดูว่าของใคร กำลังไปไหน และติดอยู่เพราะอะไร เพิ่มเลนหรือกระจายงานและบริการให้ใกล้บ้านช่วยลดการเดินทาง</p>'+action(heat?'ปิดแผนที่รถติด':'เปิดแผนที่รถติด','heat');
$('inspector').classList.remove('hidden');$('inspectContent').innerHTML=html;
}
function buildingName(i){const b=state.buildings.get(i);return b?CATALOG[b.key].name+' #'+i:'ยังไม่มี';}
function citizenName(c){return c?['กานต์','ต้น','พลอย','มะลิ','นนท์','แพรว','ภูมิ','ฟ้า','บีม','อิง','พีท','ข้าวหอม'][c.id%12]+' #'+c.id:'ประชาชน';}
const TRIPS={hotel:{name:'ไปพักโรงแรม',color:'#65c8f2'},touristOut:{name:'กลับนอกเมือง',color:'#65c8f2'},moveIn:{name:'ย้ายเข้า',color:'#8cdd91'},work:{name:'ไปทำงาน',color:'#70b4e8'},home:{name:'กลับบ้าน',color:'#f4f0dc'},leisure:{name:'พักผ่อน',color:'#e897bf'},moveOut:{name:'ย้ายออก',color:'#e57865'},pass:{name:'ผ่านเมือง',color:'#edc863'}};
function accessFor(b){return parkingAccess(b);}
class Heap{constructor(){this.items=[];}push(item){let a=this.items;a.push(item);let i=a.length-1;while(i){let p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p;}a[i]=item;}pop(){let a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(true){let c=i*2+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return first;}get length(){return this.items.length;}}
function route(start,end,firstNext=null,finalPrev=null,previousNode=null){
if(!state.roads.has(start)||!state.roads.has(end))return null;
const cacheKey=[state.version,start,end,firstNext?.join('.')||'',finalPrev?.join('.')||'',previousNode??-1].join('|');if(state.routeCache.has(cacheKey))return state.routeCache.get(cacheKey);
const heap=new Heap(),g=new Map(),came=new Map(),origin=`${start}:${previousNode??-1}`;heap.push({node:start,prev:previousNode??-1,key:origin,g:0,f:distance(start,end)});g.set(origin,0);let count=0;
while(heap.length&&count++<35000){const cur=heap.pop();if(cur.g!==g.get(cur.key))continue;if(cur.node===end&&cur.key!==origin&&(!finalPrev||finalPrev.includes(cur.prev))){const path=[];let key=cur.key;while(key){path.push(+key.split(':')[0]);key=came.get(key);}path.reverse();if(state.routeCache.size>1500)state.routeCache.clear();state.routeCache.set(cacheKey,path);return path;}
const r=state.roads.get(cur.node);for(const n of r.links){if(cur.key===origin&&firstNext&&!firstNext.includes(n))continue;if(n===cur.prev)continue;const key=`${n}:${cur.node}`,cost=cur.g+distance(cur.node,n)+(n===cur.prev?2:0);if(cost>=(g.get(key)??Infinity))continue;g.set(key,cost);came.set(key,cur.key);heap.push({node:n,prev:cur.node,key,g:cost,f:cost+distance(n,end)});}}
if(state.routeCache.size>1500)state.routeCache.clear();state.routeCache.set(cacheKey,null);return null;
}
// A driveway starts in the outer-left lane. If the first intersection is too close
// to cross over for a right turn, take an available left turn (or straight) and
// find another forward-only route to the same destination. Never force a U-turn.
function safeDeparturePath(path,access){
 if(!path||path.length<3)return path;
 let travelled=0;
 for(let i=1;i<path.length-1;i++){
  travelled+=distance(path[i-1],path[i]);if(travelled>=9)break;
  if(junction(path[i])<3)continue;
  const incoming=dir(path[i-1],path[i]),outgoing=dir(path[i],path[i+1]);
  if((outgoing-incoming+4)%4!==1)break; // no abrupt right-lane crossing needed
  const links=state.roads.get(path[i])?.links;if(!links)break;
  for(const wanted of [(incoming+3)%4,incoming]){
   const next=[...links].find(n=>dir(path[i],n)===wanted);
   if(next==null)continue;
   const alternative=route(path[i],access.node,[next],access.prev,path[i-1]);
   if(alternative?.length>1)return path.slice(0,i).concat(alternative);
  }
  break;
 }
 return path;
}
function tripRoute(fromId,toId,fromGate,toGate,citizenId=null){const from=state.buildings.get(fromId),to=state.buildings.get(toId),allExits=from?from.access.filter(a=>a.exit):null,assigned=from&&CATALOG[from.key].dualParking&&citizenId!=null?lotSlots(from)[parkingSpace(from,citizenId)]:null,aa=from?(assigned?allExits.filter(a=>a.zone===assigned.zone):allExits):[{node:fromGate,next:null}],bb=to?to.access.filter(a=>a.entry):[{node:toGate,prev:null}];if(!aa?.length||!bb?.length)return null;const candidates=[];for(const a of aa)for(const b of bb)candidates.push({a,b,d:distance(a.node,b.node)});candidates.sort((a,b)=>a.d-b.d);for(const pair of candidates.slice(0,32)){const p=route(pair.a.node,pair.b.node,pair.a.next,pair.b.prev);if(p)return from?safeDeparturePath(p,pair.b):p;}return null;}
// Citizen habits are stable, but the schedule varies by individual and day.
// Hashing is deterministic: reloads and high population counts cannot change
// the calendar or create per-frame random decisions.
function habitRandom(id,day,salt=0){
 let n=Math.imul((id|0)^0x6c8e9cf5,1597334677)^Math.imul((day|0)+11,3812015801)^Math.imul((salt|0)+29,1103515245);
 n=Math.imul(n^n>>>16,2246822507);n=Math.imul(n^n>>>13,3266489909);
 return((n^n>>>16)>>>0)/4294967296;
}
function profile(i){
 const trait=i%4,early=habitRandom(i,0,9),shift=habitRandom(i,0,4);
 return{trait,leave:Math.round(395+early*140+(trait===2?35:0)),
  end:Math.round(1000+shift*155+(trait===2?30:0)),
  leisure:trait===0?['restaurant',null,'park',null][Math.floor(i/4)%4]:
   ['restaurant','mall',trait===1?'shop':'pub','park'][Math.floor(i/4)%4]};
}

// Lifestyle weights are weekday targets, conditioned on real employment and
// compatible shifts. They are never vehicle quotas or permanent citizen classes.
const LIFESTYLES=[
 ['regular','พนักงานทั่วไป',17],['early','คนทำงานเช้า',10],
 ['late','คนทำงานสาย',8],['night','คนทำงานกะค่ำ',5],
 ['food','สายทำงานและกิน',12],['social','สายทำงานและเที่ยว',9],
 ['flex','สายชีวิตยืดหยุ่น',8],['homebody','สายติดบ้าน',7],
 ['relax','สายพักผ่อน',7],['shopping','สายช็อปและใช้เงิน',6],
 ['nightlife','สายเที่ยวกลางคืน',6],['irregular','สายไม่มีตารางแน่นอน',5]
].map(([id,name,weight])=>({id,name,weight}));
const SERVICE_HOURS={restaurant:[360,1440],mall:[600,1320],shop:[480,1320],park:[300,1260],pub:[1080,1620]};
const SERVICE_STAY={restaurant:[30,70],mall:[45,120],shop:[20,60],park:[20,90],pub:[80,180]};
function serviceWindow(kind,at){
 const hours=SERVICE_HOURS[kind];if(!hours)return null;
 const day=Math.floor(at/1440);
 for(const d of [day-1,day]){const open=d*1440+hours[0],close=d*1440+hours[1];if(at>=open&&at<close)return{open,close};}
 return null;
}
function weightedLifestyle(c,day,ids,salt){
 const r=ensureRoutine(c),weights=ids.map(i=>{
  let w=LIFESTYLES[i].weight;
  if(i===r.affinity)w*=2;
  if(c.profile.trait===0&&i===0)w*=1.7;
  if(c.profile.trait===1&&[4,9].includes(i))w*=1.6;
  if(c.profile.trait===2&&[5,8,10].includes(i))w*=1.8;
  if(c.profile.trait===3&&i===9)w*=1.8;
  if(i===7)w*=1.5-r.sociability;
  return w;
 });
 let n=habitRandom(c.id,day,salt)*weights.reduce((a,b)=>a+b,0);
 for(let k=0;k<ids.length;k++){n-=weights[k];if(n<0)return ids[k];}return ids[ids.length-1];
}
function ensureRoutine(c){
 if(!c.routine)c.routine={seed:c.id,advance:0,lateStreak:0,earlyStreak:0,
  postPreference:Math.floor(habitRandom(c.id,0,33)*4),sociability:habitRandom(c.id,0,34),
  weekdayShift:Math.round((habitRandom(c.id,0,35)-.5)*24)};
 const r=c.routine;
 if(!Number.isFinite(r.advance))r.advance=0;
 if(!Number.isFinite(r.punctuality))r.punctuality=habitRandom(c.id,0,36);
 if(!Number.isFinite(r.trafficTolerance))r.trafficTolerance=habitRandom(c.id,0,37);
 if(!Number.isFinite(r.affinity)){
  let n=habitRandom(c.id,0,38)*100;r.affinity=11;
  for(let i=0;i<LIFESTYLES.length;i++){n-=LIFESTYLES[i].weight;if(n<0){r.affinity=i;break;}}
 }
 if(!r.preferences)r.preferences=Object.fromEntries(Object.keys(SERVICE_STAY).map((k,i)=>[k,.2+habitRandom(c.id,0,40+i)+(c.profile.leisure===k?1:0)]));
 return r;
}
function workRoutine(c){
 const b=state.buildings.get(c.workId);if(!b)return null;
 const kind=CATALOG[b.key].kind,r=ensureRoutine(c);
 // Stable personal shift: daily variation cannot swap a morning worker onto
 // a night shift. Workplaces, including weekend services, constrain the shift.
 const permitted=kind==='factory'?[0,1,2,3,6]:kind==='pub'?[3]:
  kind==='office'?[0,1,2,6]:kind==='park'?[1,0]:kind==='mall'?[2]:[0,1,2];
 const shift=weightedLifestyle(c,0,permitted,51),u=habitRandom(c.id,0,52),v=habitRandom(c.id,0,53);
 const ranges={0:[390,570,990,1170],1:[300,450,810,990],2:[570,750,1110,1320],3:[960,1260,1440,1740],6:[540,840,1080,1320]};
 const a=ranges[shift];let leave=Math.round(a[0]+u*(a[1]-a[0])),end=Math.round(a[2]+v*(a[3]-a[2]));
 const hours=kind==='pub'?[960,1740]:kind==='factory'?[0,2880]:kind==='office'?[300,1380]:[SERVICE_HOURS[kind][0]-60,SERVICE_HOURS[kind][1]];
 leave=Math.max(hours[0],Math.min(hours[1]-300,leave));end=Math.min(hours[1],Math.max(leave+300,end));
 return{shift,leave,end,kind,open:hours[0],close:hours[1]};
}
function planForDay(c,day){
 const r=ensureRoutine(c),p=c.profile,w=workRoutine(c),weekday=((day%7)+7)%7,weekend=weekday>=5;
 const random=salt=>habitRandom(c.id,day,salt),pick=(lo,hi,salt)=>Math.round(lo+random(salt)*(hi-lo));
 const works=p.trait!==3&&!!w&&(!weekend||random(54)<(w.kind==='office'?.12:.58));
 let style=works?([1,2,3].includes(w.shift)?w.shift:weightedLifestyle(c,day,[0,4,5,6],55)):weightedLifestyle(c,day,[7,8,9,10,11],55);
 const leave=works?Math.max(w.open,Math.round(w.leave+(random(17)-.5)*(10+(1-r.punctuality)*30)-r.advance)):pick(540,840,17);
 const end=works?Math.min(w.close,w.end+pick(0,30,18)):pick(990,1200,18);
 const postDelay=pick(0,12,19),steps=[];
 const add=(kind,at,extra={})=>steps.push({kind,at,...extra});
 const service=(kind,at,salt,extra={})=>{
  const span=SERVICE_STAY[kind];add(kind,at,{duration:pick(span[0],span[1],salt),...extra});
 };
 const prefer=(salt,exclude=[])=>{
  const keys=Object.keys(r.preferences).filter(k=>!exclude.includes(k));
  let n=random(salt)*keys.reduce((s,k)=>s+r.preferences[k],0);
  for(const k of keys){n-=r.preferences[k];if(n<0)return k;}return keys[0];
 };
 const tiredUntil=Math.max(0,(r.lastHomeAt||0)+360-day*1440);
 const outChance=Math.min(.95,.20+r.sociability*.55+(weekend?.15:0)+(c.happy<60?.15:0));
 let firstKind=null;
 if(works){
  add('work',leave,{until:end,deadline:Math.min(end,leave+65),workId:c.workId});
  if(style===4&&leave<660&&end>900){
   const lunch=pick(Math.max(660,leave+150),Math.min(810,end-150),61);
   steps[0].until=lunch;
   service('restaurant',lunch,62,{expires:Math.min(lunch+100,end-100),lunch:true});
   add('work',lunch+60,{until:end,deadline:lunch+130,workId:c.workId,resume:true});
  }
  const out=random(20)<outChance;
  if(out&&style!==3){
   const at=end+postDelay;
   const again=random(63)<.30&&at<1170;
   if(again)add('home',at,{rest:pick(30,90,64)});
   const start=at+(again?60:0);
   firstKind=style===4||style===5?'restaurant':prefer(21);
   service(firstKind,start,65);
   if(style===5&&(weekday===4||weekday===5||random(66)<.35))service('pub',Math.max(1200,start+90),67);
  }
  add('home',end+postDelay);
 }else{
  let start=Math.max(tiredUntil,pick(540,1080,22));
  if(style===7){if(random(20)<.20){firstKind=prefer(21,['pub']);service(firstKind,start,65);}}
  else if(style===8){firstKind='park';start=Math.max(tiredUntil,pick(360,600,22));service('park',start,65);if(random(66)<.65)service('restaurant',pick(720,1020,68),67);}
  else if(style===9){firstKind='mall';start=Math.max(tiredUntil,pick(600,960,22));service('mall',start,65);service('restaurant',start+100,67);if(random(66)<.55)service('shop',start+170,68);if(random(69)<.25){add('home',start+230,{rest:60});service(prefer(70,['pub']),1140,71);}}
  else if(style===10){firstKind='restaurant';start=Math.max(tiredUntil,pick(1080,1380,22));service('restaurant',start,65);service('pub',Math.max(1200,start+70),67);}
  else if(random(20)<outChance){firstKind=prefer(21);service(firstKind,start,65);if(random(66)<.3)service(prefer(70),start+100,71);}
  if(steps.length)add('home',start);
 }
 // Optional late nights must leave room for tomorrow's regular job. Work
 // always wins over leisure; a restaurant lunch resumes the same job.
 const nextWorks=p.trait!==3&&w&&((weekday+1)%7<5);
 const finishBy=nextWorks?Math.min(day*1440+1740,(day+1)*1440+w.leave-360):day*1440+1740;
 for(const step of steps)if(SERVICE_STAY[step.kind])step.expires=Math.min(step.expires??1740,finishBy-day*1440);
 let cursor=0;for(const step of steps){step.estimatedAt=Math.max(step.at,cursor);cursor=step.kind==='work'?Math.max(step.estimatedAt,step.until):step.estimatedAt+(step.duration||step.rest||0)+15;}
 return{version:2,day,works,lifestyle:LIFESTYLES[style].id,style,leave,end,postDelay,
  kind:firstKind,leisureStart:steps.find(s=>SERVICE_STAY[s.kind])?.at??startFallback(),
  leisureEnd:finishBy-day*1440,desiredArrival:leave+65,steps,workId:c.workId};
 function startFallback(){return 600;}
}
function lifestyleName(plan){return LIFESTYLES.find(l=>l.id===plan?.lifestyle)?.name||'กิจวัตรเดิม';}
function lifestyleStepName(s){return s.kind==='work'?(s.resume?'กลับเข้าทำงาน':'ทำงาน'):s.kind==='home'?'กลับบ้าน':KINDS[s.kind]?.name||s.kind;}
function lifePlan(c,day){return c.lifePlans?.[day]||(c.dailyPlan?.day===day?c.dailyPlan:null);}
function scheduleDay(c,day){
 if(c.scheduled.has(day)||c.removed||c.movingOut)return;
 assignJob(c);c.scheduled.add(day);if(c.scheduled.size>4)c.scheduled.delete(Math.min(...c.scheduled));
 const plan=planForDay(c,day);c.dailyPlan=plan;
 if(!c.lifePlans)c.lifePlans={};c.lifePlans[day]=plan;
 for(const key of Object.keys(c.lifePlans))if(+key<day-1&&+key!==c.lifeRun?.day)delete c.lifePlans[key];
 if(plan.steps.length)schedule(c,Math.max(state.time+.5,day*1440+plan.steps[0].at),'lifeStart',{day});
}
function lifeAdvance(c){
 const run=c.lifeRun;if(!run)return;
 run.index++;run.retry=0;
 if(run.index>=run.plan.steps.length){c.lifeRun=null;c.activityUntil=null;return;}
 const step=run.plan.steps[run.index];
 schedule(c,Math.max(state.time+.5,run.day*1440+step.at),'life',{day:run.day,index:run.index});
}
function lifeRetry(c,step,problem){
 const run=c.lifeRun;if(!run)return;
 const end=run.day*1440+(step.expires??step.until??1740);
 if(step.kind!=='home'&&(++run.retry>=4||state.time+15>=end)){lifeAdvance(c);return;}
 const action=step.kind==='work'?'work':step.kind==='home'?'home':'leisure';
 c.pending={action,kind:SERVICE_STAY[step.kind]?step.kind:undefined,end,life:true,day:run.day,index:run.index,
  attempts:run.retry,next:state.time+15+habitRandom(c.id,run.day,80+run.retry)*15,expires:step.kind==='home'?state.time+1440:end};
 c.problem=problem;
 // Retries are heap events, not a scan of all residents every frame.
 schedule(c,c.pending.next,'life',{day:run.day,index:run.index});
}
function runLifestyle(c,action,extra){
 if(!c||!c.resident||c.removed||c.movingOut)return;
 if(action==='lifeStart'){
  const plan=lifePlan(c,extra.day);if(!plan||!plan.steps.length)return;
  if(c.lifeRun?.day===extra.day)return;
  if(c.lifeRun||c.vehicleId){if(state.time<(extra.day+1)*1440)schedule(c,Math.max(state.time+30,c.activityUntil||0),'lifeStart',{day:extra.day});return;}
  c.lifeRun={day:extra.day,index:0,plan,retry:0};
 }
 const run=c.lifeRun;
 if(!run||extra.day!==run.day||(extra.index!=null&&extra.index!==run.index))return;
 if(c.vehicleId)return;
 if(action!=='lifeNext'&&state.time<(c.activityUntil||0))return;
 if(action==='lifeNext'){if(state.time<(c.activityUntil||0))return;c.activityUntil=null;lifeAdvance(c);return;}
 const step=run.plan.steps[run.index],base=run.day*1440,meta={day:run.day,index:run.index};
 if(!step)return;
 if(state.time<base+step.at){schedule(c,base+step.at,'life',meta);return;}
 c.pending=null;
 if(step.kind==='work'){
  assignJob(c);
  if(!c.workId||c.workId!==step.workId||state.time>=base+step.until){lifeAdvance(c);return;}
  if(c.locationId===c.workId){c.state='อยู่ที่ทำงาน';c.activityUntil=base+step.until;schedule(c,c.activityUntil,'lifeNext',meta);return;}
  if(createTrip(c,'work',c.locationId||c.homeId,c.workId,null,null,base+step.deadline,{life:meta}))return;
  lifeRetry(c,step,'ไม่มีเส้นทางไปทำงานหรือที่จอดเต็ม');return;
 }
 if(step.kind==='home'){
  if(c.locationId===c.homeId){c.state='อยู่บ้าน';if(step.rest){c.activityUntil=state.time+step.rest;schedule(c,c.activityUntil,'lifeNext',meta);}else lifeAdvance(c);return;}
  if(createTrip(c,'home',c.locationId,c.homeId,null,null,state.time+1440,{life:meta}))return;
  lifeRetry(c,step,'ไม่มีเส้นทางกลับบ้านหรือที่จอดเต็ม');return;
 }
 const expires=base+(step.expires??1740);
 if(state.time>=expires){lifeAdvance(c);return;}
 const origin=state.buildings.get(c.locationId)||state.buildings.get(c.homeId);
 if(!origin){lifeAdvance(c);return;}
 const kinds=step.lunch?[step.kind]:[step.kind,...Object.keys(SERVICE_STAY).filter(k=>k!==step.kind)];
 for(const kind of kinds){
  const win=serviceWindow(kind,state.time);if(!win)continue;
  const choices=[...state.buildings.values()].filter(b=>b.id!==origin.id&&CATALOG[b.key].kind===kind&&b.visitors.size+b.reservedService<CATALOG[b.key].service&&parkingFree(b)>0)
   .sort((a,b)=>(Math.abs(a.x-origin.x)+Math.abs(a.y-origin.y))-(Math.abs(b.x-origin.x)+Math.abs(b.y-origin.y)));
  for(const b of choices){
   const path=tripRoute(origin.id,b.id,null,null);if(!path)continue;
   let distance=0;for(let i=1;i<path.length;i++)distance+=Math.hypot(...xy(path[i]).map((n,k)=>n-xy(path[i-1])[k]));
   const eta=distance/3*GAME_MINUTES_PER_SECOND+8;
   const span=SERVICE_STAY[kind],duration=kind===step.kind?step.duration:Math.round(span[0]+habitRandom(c.id,run.day,90+run.index)*(span[1]-span[0]));
   if(state.time+eta+duration>Math.min(win.close,expires))continue;
   if(createTrip(c,'leisure',origin.id,b.id,null,null,state.time+eta+60,{life:meta,activityEnd:expires,serviceKind:kind,stay:duration,closeAt:win.close}))return;
  }
 }
 lifeRetry(c,step,'สถานที่ปิด เต็ม หรือไม่มีเส้นทางไปถึง');
}
function arriveLifestyle(c,v,b){
 const run=c.lifeRun;
 if(!run||v.life.day!==run.day||v.life.index!==run.index){schedule(c,state.time+.5,'home');return;}
 const step=run.plan.steps[run.index],meta={day:run.day,index:run.index};let until=state.time+.5;
 if(v.kind==='work'){
  c.state=v.late?'อยู่ที่ทำงาน · มาสาย':'อยู่ที่ทำงาน';
  const r=ensureRoutine(c);
  if(!step.resume){
   if(v.late){pain(c,4,'ไปทำงานสาย');r.lateStreak=Math.min(12,(r.lateStreak||0)+1);r.earlyStreak=0;r.advance=Math.min(60,r.advance+Math.round(3+(1-r.trafficTolerance)*6));}
   else{reward(c,20,92);r.lateStreak=0;if(++r.earlyStreak>=3){r.advance=Math.max(0,r.advance-2);r.earlyStreak=0;}}
  }
  until=Math.max(state.time+.5,run.day*1440+step.until);
 }else if(v.kind==='leisure'){
  const window=serviceWindow(v.serviceKind,state.time),duration=v.stay||step.duration;
  // Late traffic can invalidate a reservation. Do not admit visitors or reward
  // a closed/full venue; continue the itinerary from the actual arrival point.
  if(window&&state.time+duration<=Math.min(window.close,v.activityEnd)&&b.visitors.size<CATALOG[b.key].service){
   b.visitors.add(c.id);c.state='อยู่'+KINDS[v.serviceKind].name;reward(c,15,94);until=state.time+duration;
  }else{c.state='ถึงสถานที่แล้วแต่ใช้บริการไม่ได้';c.problem='ถึงช้ากว่าเวลาที่ใช้บริการได้';}
 }else{
  c.state='อยู่บ้าน';ensureRoutine(c).lastHomeAt=state.time;reward(c,5,90);until=state.time+(step.rest||.5);
 }
 c.activityUntil=until;schedule(c,until,'lifeNext',meta);
}

// Visitors share the citizen/vehicle graph, but never become residents or workers.
const TOURISM={happiness:80,residentHappiness:70,populationRatio:.65,fee:1500,discount:500,minDuration:300,maxDuration:600};
const TOURIST_KINDS=['restaurant','mall','pub','shop','park'];
let touristSearch='',touristPage=0,touristDashboardAt=0;
function tourismLedger(){
 const day=Math.floor(state.time/1440);
 if(!state.tourism)state.tourism={day,fees:0,refunds:0,arrivals:0,departures:0,totalFees:0,totalRefunds:0};
 if(state.tourism.day!==day){Object.assign(state.tourism,{day,fees:0,refunds:0,arrivals:0,departures:0});}
 return state.tourism;
}
function touristPeople(){return [...state.citizens.values()].filter(c=>c.tourist&&!c.removed);}
function tourismCapacity(){
 const stats=computeStats(),people=touristPeople(),residentDemand=new Set();let capacity=0,beds=0,booked=0;
 for(const b of state.buildings.values()){
  const t=CATALOG[b.key];if(t.beds){beds+=t.beds;booked+=b.guests?.size||0;}
  if(!TOURIST_KINDS.includes(t.kind)||!b.access.length)continue;
  capacity+=t.service;
  for(const cid of b.visitors)if(state.citizens.get(cid)?.resident)residentDemand.add(cid);
 }
 // Reserve capacity for residents whose actual plans overlap a visitor's 5–10 hour stay.
 const until=state.time+TOURISM.maxDuration;
 for(const c of state.citizens.values()){
  if(!c.resident||c.removed)continue;
  if(c.pending?.action==='leisure'||state.vehicles.get(c.vehicleId)?.kind==='leisure'){residentDemand.add(c.id);continue;}
  for(const plan of Object.values(c.lifePlans||{}))if(plan?.steps?.some(s=>TOURIST_KINDS.includes(s.kind)&&plan.day*1440+(s.estimatedAt??s.at)>=state.time&&plan.day*1440+(s.estimatedAt??s.at)<=until)){residentDemand.add(c.id);break;}
 }
 const populationLimit=Math.floor(stats.pop*TOURISM.populationRatio),serviceLimit=Math.max(0,capacity-residentDemand.size),limit=Math.min(populationLimit,serviceLimit);
 return{population:stats.pop,happiness:stats.happy,populationLimit,capacity,residentDemand:residentDemand.size,serviceLimit,limit,total:people.length,
  present:people.filter(c=>c.enteredAt!=null).length,waiting:people.filter(c=>c.enteredAt==null).length,
  available:stats.happy>=TOURISM.happiness?Math.max(0,limit-people.length):0,beds,booked};
}
function touristSchedule(c,at){c.tourToken=(c.tourToken||0)+1;schedule(c,at,'touristStep',{token:c.tourToken});}
function touristCharge(c){
 if(c.enteredAt==null||c.returning)return;
 const last=c.feePeriods.at(-1);if(last&&state.time-last.at<1440)return;
 const ledger=tourismLedger();c.feePeriods.push({at:state.time,paid:TOURISM.fee,discounted:false});
 state.money+=TOURISM.fee;ledger.fees+=TOURISM.fee;ledger.totalFees+=TOURISM.fee;
}
function touristEnter(c,v){
 if(!c?.tourist)return;
 if(c.enteredAt==null){c.enteredAt=state.time;c.tourEnd=state.time+c.tourDuration;tourismLedger().arrivals++;}
 touristCharge(c);if(v&&v.tourFeePeriod==null)v.tourFeePeriod=c.feePeriods.length-1;
}
function touristTrafficFailure(c,v,step){
 if(!step||step.status==='missed-traffic'||!(v?.congestionMinutes>=60))return false;
 step.status='missed-traffic';step.reason='รถติดจนใช้บริการไม่ทัน';c.trafficFailures=(c.trafficFailures||0)+1;c.problem=step.reason;
 const period=c.feePeriods[v.tourFeePeriod??c.feePeriods.length-1];
 if(period&&!period.discounted){period.discounted=true;period.paid-=TOURISM.discount;state.money-=TOURISM.discount;const ledger=tourismLedger();ledger.refunds+=TOURISM.discount;ledger.totalRefunds+=TOURISM.discount;}
 return true;
}
function touristPlan(c,at=state.time){
 const choices=[...state.buildings.values()].filter(b=>TOURIST_KINDS.includes(CATALOG[b.key].kind)&&b.access.length);
 const seed=c.id+(c.nights||0)*137;choices.sort((a,b)=>habitRandom(seed,a.id,6)-habitRandom(seed,b.id,6));
 const selected=[],used=new Set();let cursor=at;
 for(let pass=0;pass<2&&selected.length<4;pass++)for(const b of choices){
  const kind=CATALOG[b.key].kind;if(selected.some(s=>s.buildingId===b.id)||pass===0&&used.has(kind))continue;
  let win=serviceWindow(kind,cursor);let visitAt=cursor;
  if(!win){for(let delta=30;delta<=180;delta+=30){win=serviceWindow(kind,cursor+delta);if(win){visitAt=cursor+delta;break;}}}
  if(!win||visitAt>at+c.tourDuration-30||win.close-visitAt<20)continue;
  const range=SERVICE_STAY[kind],stay=Math.round(range[0]+habitRandom(seed,b.id,7)*(range[1]-range[0]));
  selected.push({buildingId:b.id,kind,stay,at:visitAt,status:'planned'});used.add(kind);cursor=visitAt+stay+30;
  if(selected.length>=4)break;
 }
 return selected;
}
function admitTourist(){
 const cap=tourismCapacity();if(!cap.available)return null;
 const cid=state.nextId++,duration=Math.round(TOURISM.minDuration+habitRandom(cid,Math.floor(state.time),3)*(TOURISM.maxDuration-TOURISM.minDuration));
 const c={id:cid,tourist:true,profile:profile(cid),homeId:null,workId:null,resident:false,removed:false,movingOut:false,happy:85,
  state:'รอเข้าเมือง',location:'gate',locationId:null,vehicleId:null,queued:null,pending:null,late:false,unemployed:0,problem:'',history:[],scheduled:new Set(),pain:0,failKinds:new Set(),
  enteredAt:null,tourDuration:duration,tourEnd:state.time+duration,itinerary:[],tourIndex:0,feePeriods:[],nights:0,maxNights:habitRandom(cid,0,10)<.18?2:1,
  wantsHotel:habitRandom(cid,0,11)<.35,hotelId:null,returning:false,tourToken:0};
 c.itinerary=touristPlan(c);if(!c.itinerary.length)return null;
 state.citizens.set(cid,c);
 const first=c.itinerary[0],b=state.buildings.get(first.buildingId),win=serviceWindow(first.kind,state.time);
 if(!win||parkingFree(b)<=0||b.visitors.size+b.reservedService>=CATALOG[b.key].service){state.citizens.delete(cid);return null;}
 const gates=[...state.gates].sort((a,z)=>distance(a,id(b.x,b.y))-distance(z,id(b.x,b.y)));
 for(const gate of gates)if(createTrip(c,'leisure',null,b.id,gate,null,Math.min(c.tourEnd,win.close-10),{serviceKind:first.kind,stay:first.stay,closeAt:win.close})){
  const v=state.vehicles.get(c.vehicleId);v.tourIndex=0;first.status='travel';touristSchedule(c,state.time+15);return c;
 }
 state.citizens.delete(cid);return null;
}
function releaseHotel(c){const hotel=state.buildings.get(c.hotelId);hotel?.guests?.delete(c.id);c.hotelId=null;}
function prepareTouristDemolition(b){
 for(const c of touristPeople()){
  if(c.hotelId===b.id){releaseHotel(c);c.sleepUntil=null;}
  const v=state.vehicles.get(c.vehicleId);
  if(c.locationId===b.id&&(!v||['departing','parking_out','parking_in'].includes(v.phase))||v?.toId===b.id&&['gate_waiting','parking_in'].includes(v.phase)){
   if(c.enteredAt!=null)tourismLedger().departures++;removeCitizen(c);continue;
  }
  if(v?.toId===b.id){
   const step=c.itinerary[v.tourIndex];if(step){step.status='skipped';step.reason='จุดหมายถูกรื้อ';}
   if(v.phase==='departing'){
    const origin=state.buildings.get(v.fromId);cancelVehicle(v);c.locationId=origin?.id||null;
    c.tourIndex=Math.max(c.tourIndex,(v.tourIndex??c.tourIndex)+1);touristSchedule(c,state.time+1);
   }else{
    if(v.serviceReservation)b.reservedService=Math.max(0,b.reservedService-1);
    v.serviceReservation=false;freeParkingSpace(b,c.id);v.toId=null;v.toGate=state.gates.slice().sort((a,z)=>distance(a,v.path[v.pos])-distance(z,v.path[v.pos]))[0];
    v.kind='touristOut';v.deadline=null;c.returning=true;releaseHotel(c);strandVehicle(v,'จุดหมายถูกรื้อ · หาเส้นทางกลับนอกเมือง');recoverVehicle(v,true);
   }
  }
 }
}
function touristHotel(c){
 if(c.nights>=c.maxNights||!c.wantsHotel)return false;
 const origin=state.buildings.get(c.locationId);
 const hotels=[...state.buildings.values()].filter(b=>CATALOG[b.key].beds>(b.guests?.size||0)&&b.access.length&&parkingFree(b)>0);
 hotels.sort((a,b)=>origin?distance(id(a.x,a.y),id(origin.x,origin.y))-distance(id(b.x,b.y),id(origin.x,origin.y)):a.id-b.id);
 for(const hotel of hotels){
  if(createTrip(c,'hotel',c.locationId,hotel.id,null,null,null)){
   releaseHotel(c);c.hotelId=hotel.id;if(!hotel.guests)hotel.guests=new Set();hotel.guests.add(c.id);c.state='เดินทางไปโรงแรม';touristSchedule(c,state.time+15);return true;
  }
 }
 return false;
}
function touristLeave(c){
 c.returning=true;releaseHotel(c);
 if(c.vehicleId)return;
 if(!c.locationId){if(c.enteredAt!=null)tourismLedger().departures++;removeCitizen(c);return;}
 const b=state.buildings.get(c.locationId),gates=[...state.gates].sort((a,z)=>b?distance(a,id(b.x,b.y))-distance(z,id(b.x,b.y)):0);
 for(const gate of gates)if(createTrip(c,'touristOut',c.locationId,null,null,gate,null)){c.state='เดินทางกลับนอกเมือง';touristSchedule(c,state.time+15);return;}
 c.state='รอเส้นทางกลับนอกเมือง';c.problem='ยังไม่มีเส้นทางออกจากอาคาร';touristSchedule(c,state.time+15);
}
function touristStep(c,e={}){
 if(!c||c.removed||!c.tourist||e.token!=null&&e.token!==c.tourToken)return;
 const v=state.vehicles.get(c.vehicleId);touristCharge(c);
 if(v){
  const step=c.itinerary[v.tourIndex];
  if(v.kind==='leisure'&&v.deadline&&state.time>v.deadline)touristTrafficFailure(c,v,step);
  touristSchedule(c,state.time+15);return;
 }
 if(c.enteredAt==null){removeCitizen(c);return;}
 if(c.returning){touristLeave(c);return;}
 if(c.sleepUntil){
  if(state.time<c.sleepUntil){touristSchedule(c,Math.min(c.sleepUntil,state.time+60));return;}
  c.sleepUntil=null;releaseHotel(c);c.tourDuration=Math.round(300+habitRandom(c.id,c.nights,14)*300);c.tourEnd=state.time+c.tourDuration;
  c.wantsHotel=c.nights<c.maxNights&&habitRandom(c.id,c.nights,15)<.3;
  c.tourIndex=c.itinerary.length;c.itinerary.push(...touristPlan(c));c.activityUntil=null;
 }
 if(c.activityUntil>state.time){touristSchedule(c,Math.min(c.activityUntil,state.time+60));return;}
 c.activityUntil=null;
 if(state.time>=c.tourEnd){
  if(touristHotel(c))return;
  touristLeave(c);return;
 }
 let step=c.itinerary[c.tourIndex];
 if(!step){c.state='พักผ่อนระหว่างทริป';touristSchedule(c,c.tourEnd);return;}
 if(step.status==='visiting'||step.status==='done'){step.status='done';c.tourIndex++;touristSchedule(c,state.time+.5);return;}
 const b=state.buildings.get(step.buildingId),win=serviceWindow(step.kind,state.time);
 if(!b||!win){step.status='skipped';step.reason=b?'สถานที่ปิดบริการ':'สถานที่ถูกรื้อ';c.tourIndex++;touristSchedule(c,state.time+5);return;}
 if(step.at>state.time){c.state='พักรอกิจกรรมถัดไป';touristSchedule(c,Math.min(step.at,c.tourEnd));return;}
 if(c.locationId===b.id){b.visitors.add(c.id);step.status='visiting';c.state='เที่ยว'+KINDS[step.kind].name;c.activityUntil=Math.min(c.tourEnd,win.close,state.time+step.stay);touristSchedule(c,c.activityUntil);return;}
 if(createTrip(c,'leisure',c.locationId,b.id,null,null,Math.min(c.tourEnd,win.close-10),{serviceKind:step.kind,stay:step.stay,closeAt:win.close})){
  const trip=state.vehicles.get(c.vehicleId);trip.tourIndex=c.tourIndex;trip.tourFeePeriod=c.feePeriods.length-1;step.status='travel';c.tourRetries=0;touristSchedule(c,state.time+15);return;
 }
 c.tourRetries=(c.tourRetries||0)+1;c.state='รอไป'+KINDS[step.kind].name;c.problem=parkingFree(b)<=0||b.visitors.size+b.reservedService>=CATALOG[b.key].service?'บริการหรือลานจอดเต็ม':'ไม่มีเส้นทางไปจุดหมาย';
 if(c.tourRetries>=4){step.status='skipped';step.reason=c.problem;c.tourIndex++;c.tourRetries=0;}
 touristSchedule(c,state.time+15);
}
function arriveTourist(c,v,b){
 touristEnter(c,v);
 if(v.kind==='touristOut'||!b){tourismLedger().departures++;removeCitizen(c);return;}
 if(v.kind==='hotel'){
  c.nights++;c.state='พักโรงแรม';c.sleepUntil=state.time+360+Math.round(habitRandom(c.id,c.nights,21)*240);
  c.activityUntil=null;touristSchedule(c,state.time+60);return;
 }
 const step=c.itinerary[v.tourIndex];
 if(v.kind==='leisure'&&step){
  const win=serviceWindow(step.kind,state.time),missed=state.time>=Math.min(c.tourEnd,v.closeAt||Infinity)-10;
  if(missed){touristTrafficFailure(c,v,step);if(step.status!=='missed-traffic'){step.status='skipped';step.reason='มาถึงหลังหมดเวลาเที่ยว';}c.tourIndex=Math.max(c.tourIndex,v.tourIndex+1);c.state='หมดเวลาใช้บริการ';touristSchedule(c,state.time+1);return;}
  if(!win){step.status='skipped';step.reason='สถานที่ปิดบริการ';c.tourIndex=v.tourIndex+1;touristSchedule(c,state.time+1);return;}
  b.visitors.add(c.id);step.status='visiting';c.state='เที่ยว'+KINDS[step.kind].name;c.happy=Math.min(100,c.happy+3);c.problem='';c.activityUntil=Math.min(c.tourEnd,win.close,state.time+step.stay);touristSchedule(c,c.activityUntil);return;
 }
 touristSchedule(c,state.time+1);
}
function updateTourism(gameDt){
 // Track queue time independently of native recovery, which may reset v.wait.
 for(const c of touristPeople()){
  const v=state.vehicles.get(c.vehicleId);
  if(v&&c.enteredAt!=null&&v.kind==='leisure'&&!missingRoute(v)&&(v.wait>1||v.stopReason&&v.speed<.1)&&v.phase!=='gate_waiting')v.congestionMinutes=(v.congestionMinutes||0)+gameDt;
 }
 if(state.time<(state.nextTouristAt||0))return;
 state.nextTouristAt=state.time+2+habitRandom(state.nextId,Math.floor(state.time),24)*3;
 admitTourist();
}
function touristSummaryMarkup(){
 const c=tourismCapacity(),l=tourismLedger();return row('นักท่องเที่ยวในเมือง',c.present+' คน')+row('รอเข้าเมือง',c.waiting+' คน')+row('เพดาน 65% ของประชากร',c.populationLimit+' คน')+row('โควตาตามบริการ',c.serviceLimit+' คน')+row('ห้องพักที่จอง / เตียงทั้งหมด',c.booked+' / '+c.beds)+row('รายได้ท่องเที่ยววันนี้',money(l.fees-l.refunds))+row('คืนส่วนลดรถติดวันนี้',money(l.refunds))+'<p>ความสุขตั้งแต่ 80% จึงรับนักท่องเที่ยวเพิ่ม · เที่ยว 5–10 ชั่วโมง · ค่าเข้า 1,500 บาทต่อ 24 ชั่วโมง ลดเหลือ 1,000 เมื่อรถติดจนพลาดบริการ</p>';
}
function touristInspector(c){
 const v=state.vehicles.get(c.vehicleId),period=c.feePeriods.at(-1);
 let html='<span class="tag">นักท่องเที่ยว #'+c.id+'</span><h2>'+citizenName(c)+'</h2>'+row('สถานะ',escapeSaveText(c.state))+row('ตำแหน่ง',c.locationId?buildingName(c.locationId):c.enteredAt==null?'รอประตูเมือง':'กำลังเดินทาง')+row('เข้าเมือง',c.enteredAt==null?'ยังไม่เข้า':timeText(c.enteredAt))+row('เวลาเที่ยวรอบนี้',Math.round(c.tourDuration/60*10)/10+' ชั่วโมง')+row('สิ้นสุดเวลาเที่ยว',timeText(c.tourEnd))+row('ที่พัก',c.hotelId?buildingName(c.hotelId):c.wantsHotel?'ต้องการค้างถ้ามีห้องว่าง':'ไปกลับ')+row('ค้างแล้ว',c.nights+' คืน')+row('ค่าเข้ารอบล่าสุด',money(period?.paid||0))+row('พลาดบริการเพราะรถติด',c.trafficFailures||0)+row('ปัญหาล่าสุด',escapeSaveText(c.problem||'ยังไม่มีปัญหา'));
 if(v)html+=row('จุดหมาย',v.toId?buildingName(v.toId):'กลับนอกเมือง')+row('เวลารอ',Math.floor(v.wait)+' นาที')+action(follow===v.id?'หยุดติดตามรถ':'ติดตามรถตู้สีฟ้า','follow',v.id)+vehicleRecoveryActions(v);
 const labels={planned:'วางแผน',travel:'กำลังไป',visiting:'ใช้บริการ',done:'เที่ยวแล้ว',skipped:'ข้าม', 'missed-traffic':'พลาดเพราะรถติด'};
 html+='<h3>แผนเที่ยว</h3><div class="tourist-itinerary">'+c.itinerary.map(s=>'<p>'+escapeSaveText(buildingName(s.buildingId))+' · '+labels[s.status]+(s.reason?' · '+escapeSaveText(s.reason):'')+'</p>').join('')+'</div>';
 if(c.history.length)html+='<h3>การเดินทางล่าสุด</h3><p>'+c.history.slice(-5).reverse().map(escapeSaveText).join('<br>')+'</p>';
 return html;
}
function hideTouristDashboard(){$('touristsDashboard')?.classList.add('hidden');}
function showTouristDashboard(){hideCitizenDashboard();selected=null;$('inspector').classList.add('hidden');$('touristsDashboard')?.classList.remove('hidden');renderTouristDashboard(true);}
function renderTouristDashboard(force=false){
 const panel=$('touristsDashboard');if(!panel||tool!=='touristDashboard'||panel.classList.contains('hidden'))return;
 if(!force&&Date.now()-touristDashboardAt<1500)return;touristDashboardAt=Date.now();
 const query=touristSearch.trim().toLocaleLowerCase('th-TH'),people=touristPeople().filter(c=>!query||citizenName(c).toLocaleLowerCase('th-TH').includes(query)||String(c.id).includes(query));
 const cards=people.slice(0,(touristPage+1)*40).map(c=>{const v=state.vehicles.get(c.vehicleId),next=c.itinerary[c.tourIndex];
  const destination=v?(v.toId?buildingName(v.toId):'กลับนอกเมือง'):c.sleepUntil?'พัก '+buildingName(c.hotelId):next?buildingName(next.buildingId):'เตรียมกลับนอกเมือง';
  return '<button class="citizen-person" data-tourist-id="'+c.id+'"><span class="citizen-person-main"><b>'+escapeSaveText(citizenName(c))+'</b><small>'+escapeSaveText(c.state)+' · '+escapeSaveText(destination)+'</small></span><span class="citizen-person-score"><strong>'+money(c.feePeriods.at(-1)?.paid||0)+'</strong><em>ค่าเข้ารอบล่าสุด</em></span></button>';}).join('');
 const body=$('touristsDashboardBody'),scroll=body.scrollTop;body.innerHTML='<section class="citizen-section">'+touristSummaryMarkup()+'</section><section class="citizen-section"><h3>นักท่องเที่ยว '+people.length+' คน</h3>'+cards+(people.length>(touristPage+1)*40?'<button class="action" data-tourist-more>แสดงเพิ่ม</button>':'')+(!people.length?'<p>ยังไม่มีนักท่องเที่ยวที่ตรงกับรายการ</p>':'')+'</section>';body.scrollTop=scroll;
}


function newCitizen(home){
 const cid=state.nextId++;
 const c={id:cid,profile:profile(state.profileSeq++),homeId:home.id,
  workId:null,location:'gate',locationId:null,resident:false,removed:false,
  movingOut:false,happy:82,state:'กำลังย้ายเข้า',vehicleId:null,queued:null,
  pending:null,late:false,unemployed:0,problem:'',history:[],scheduled:new Set(),
  pain:0,failKinds:new Set()};
 ensureRoutine(c);state.citizens.set(c.id,c);return c;
}
// Priority heap avoids resorting thousands of events for every citizen.
function eventLess(a,b){return a.at<b.at||(a.at===b.at&&a.citizenId<b.citizenId);}
function eventPush(e){
 const q=state.events;let i=q.length;q.push(e);
 while(i>0){const p=(i-1)>>1;if(!eventLess(q[i],q[p]))break;[q[i],q[p]]=[q[p],q[i]];i=p;}
}
function eventPop(){
 const q=state.events;if(!q.length)return null;const first=q[0],end=q.pop();
 if(q.length){q[0]=end;let i=0;for(;;){let k=i,left=i*2+1,right=left+1;
  if(left<q.length&&eventLess(q[left],q[k]))k=left;
  if(right<q.length&&eventLess(q[right],q[k]))k=right;
  if(k===i)break;[q[k],q[i]]=[q[i],q[k]];i=k;}}
 return first;
}
function eventHeapify(){
 const events=state.events||[];state.events=[];for(const e of events)eventPush(e);
}
function schedule(c,at,action,extra={}){
 if(!c||c.removed||!Number.isFinite(at))return;
 eventPush({citizenId:c.id,at,action,...extra});
}
function assignJob(c){if(c.tourist)return;if(c.profile.trait===3||c.movingOut||c.removed)return;const old=state.buildings.get(c.workId);if(old&&old.workers.has(c.id))return;const home=state.buildings.get(c.homeId);if(!home)return;let best=null,score=Infinity;for(const b of state.buildings.values()){const t=CATALOG[b.key];if(t.jobs<=b.workers.size)continue;const sc=Math.abs(b.x-home.x)+Math.abs(b.y-home.y)+b.workers.size/t.jobs*12;if(sc<score){score=sc;best=b;}}if(best){c.workId=best.id;best.workers.add(c.id);c.unemployed=0;}else c.workId=null;}
function pain(c,amount,problem,key){if(!c||c.removed)return;if(key&&c.failKinds.has(key))return;if(key)c.failKinds.add(key);c.happy=Math.max(0,c.happy-amount);c.pain+=amount;c.problem=problem;}
function reward(c,amount,cap){c.happy=Math.max(c.happy,Math.min(cap,c.happy+amount));}
function pending(c,action,extra={},problem='ไม่มีเส้นทาง'){const attempts=(c.pending?.attempts||0)+1;c.pending={action,...extra,attempts,next:state.time+Math.min(45,8+attempts*2)+(c.id%7),expires:state.time+360};c.problem=problem;}
function runAction(c,action,extra={}){
 if(c?.tourist){if(action==='touristStep')touristStep(c,extra);return;}
 if(action.startsWith('life')||extra.life)return runLifestyle(c,action.startsWith('life')?action:'life',extra);
 if(!c||c.removed||!c.resident)return;
 const day=Math.floor(state.time/1440),base=day*1440,plan=c.dailyPlan?.day===day?c.dailyPlan:planForDay(c,day);
 // Ignore stale events from a previous day; do not overwrite the new routine
 // or a queued destination while the citizen is already travelling.
 if(extra.day!=null&&extra.day!==day&&action!=='home')return;
 if(c.vehicleId){
  if(action==='work'&&c.queued?.action)return;
  if(action==='afterWork'||action==='home'||!c.queued)c.queued={action,...extra};
  return;
 }
 if(c.movingOut&&action!=='moveOut')return;
 c.pending=null;
 if(action==='work'){
  assignJob(c);
  if(!c.workId){pain(c,10,'ไม่มีตำแหน่งงานว่าง','nojob');pending(c,'work',{},'ไม่มีตำแหน่งงานว่าง');return;}
  if(c.locationId===c.workId||state.time%1440>plan.end)return;
  // Deadline is based on this individual's schedule, not a fixed city-wide hour.
  attemptLife(c,'work',c.workId,Math.max(base+plan.desiredArrival,state.time+20));
 }
 else if(action==='home'){
  if(c.locationId===c.homeId){c.state='อยู่บ้าน';return;}
  attemptLife(c,'home',c.homeId,base+1430);
 }
 else if(action==='afterWork'){
  if(c.locationId===c.homeId)return;
  if(c.locationId!==c.workId){runAction(c,'home');return;}
  if(plan.kind&&state.time<base+1330){
   runAction(c,'leisure',{kind:plan.kind,end:Math.min(base+1430,Math.max(state.time+50,base+plan.end+plan.postDelay+100))});
  }else runAction(c,'home');
 }
 else if(action==='leisure'){
  const end=Number.isFinite(extra.end)?extra.end:base+1260;
  if(state.time>=end){runAction(c,'home');return;}
  const kind=extra.kind||plan.kind||c.profile.leisure;
  if(!kind||!KINDS[kind])return;
  const origin=state.buildings.get(c.locationId)||state.buildings.get(c.homeId);
  const nearby=b=>Math.abs(b.x-origin.x)+Math.abs(b.y-origin.y);
  function choices(k){
   return [...state.buildings.values()].filter(b=>CATALOG[b.key].kind===k&&
    b.visitors.size+b.reservedService<CATALOG[b.key].service&&parkingFree(b)>0)
    .sort((a,b)=>nearby(a)+(a.visitors.size+a.reservedService)/Math.max(1,CATALOG[a.key].service)*18-
      nearby(b)-(b.visitors.size+b.reservedService)/Math.max(1,CATALOG[b.key].service)*18);
  }
  // Prefer another destination of the same kind, otherwise a nearby
  // alternative activity, otherwise retry a few minutes later.
  let candidates=choices(kind),chosen=kind;
  if(!candidates.length&&state.time+35<end){
   for(const alt of ['restaurant','mall','shop','park','pub']){
    if(alt===kind)continue;const picks=choices(alt);
    if(picks.length){candidates=picks;chosen=alt;break;}
   }
  }
  if(!candidates.length){
   if(state.time+30<end)pending(c,'leisure',{kind,end},'ร้านเต็มหรือไม่มีที่จอด');
   else runAction(c,'home');
   return;
  }
  const b=candidates[0];
  if(c.locationId===b.id){schedule(c,end,'home');return;}
  attemptLife(c,'leisure',b.id,Math.min(end,state.time+180),{activityEnd:end,serviceKind:chosen});
 }
 else if(action==='moveOut'){
  c.movingOut=true;c.state='เตรียมย้ายออก';
  const from=state.buildings.get(c.locationId)||state.buildings.get(c.homeId);
  if(!from)return;
  const gates=[...state.gates].sort((a,b)=>distance(id(from.x,from.y),a)-distance(id(from.x,from.y),b));
  for(const gate of gates)if(createTrip(c,'moveOut',from.id,null,null,gate,state.time+1440))return;
  pending(c,'moveOut',{},'ไม่มีเส้นทางออกจากเมือง');
 }
}
function attemptLife(c,kind,toId,deadline,extra={}){if(c.locationId===toId)return true;const target=state.buildings.get(toId);if(target&&parkingFree(target)<=0){pending(c,kind==='leisure'?'leisure':kind,{kind:extra.serviceKind,end:extra.activityEnd},'ลานจอดปลายทางเต็ม');return false;}const from=c.locationId||c.homeId;if(createTrip(c,kind,from,toId,null,null,deadline,extra))return true;pain(c,12,'ไม่มีเส้นทางไป'+buildingName(toId),'route-'+kind);pending(c,kind==='leisure'?'leisure':kind,{kind:extra.serviceKind,end:extra.activityEnd},c.problem);return false;}
function plannedLane(v,pos){return motionPlan(v).lanes[pos]??0;}
function occKey(i,d,l){return `${i}:${d}:${l}`;}
function cellAvailable(i,d,l,vid){const r=state.roads.get(i);if(!r)return false;const key=occKey(i,d,l),o=state.occ.get(key),res=state.reservations.get(key);if(parkingClaimed(key,vid)||o&&o!==vid&&!parkingEscapePair(state.vehicles.get(vid)||{},o)||res&&res.id!==vid&&!parkingEscapePair(state.vehicles.get(vid)||{},res.id))return false;const cap=laneCapacity(i,d);let same=0,total=0;for(let dd=0;dd<4;dd++)for(let ll=0;ll<4;ll++){const o=state.occ.get(occKey(i,dd,ll));if(o&&o!==vid&&!parkingEscapePair(state.vehicles.get(vid)||{},o)){total++;if(dd===d)same++;}}return l>=0&&l<cap&&same<cap&&(junction(i)>=3||total<cap*2);}
// Road traffic may pass a road tile held by another vehicle; a physical same-lane leader still governs spacing.
// Keep signalised intersections on the original exclusive admission rules.
function roadTraversalAvailable(v,pos){const i=v.path[pos],d=motionDirection(v.path,pos),lane=plannedLane(v,pos);return state.roads.has(i)&&lane>=0&&lane<laneCapacity(i,d)&&(junction(i)<3||cellAvailable(i,d,lane,v.id));}
function occupy(v,pos){const i=v.path[pos],d=dir(i,v.path[Math.min(pos+1,v.path.length-1)]),l=plannedLane(v,pos);v.lane=l;v.occKey=occKey(i,d,l);state.occ.set(v.occKey,v.id);}
function release(v,keepIntersection=false){if(v.occKey&&state.occ.get(v.occKey)===v.id)state.occ.delete(v.occKey);v.occKey=null;if(!keepIntersection){clearVehicleReservations(v);v.junctionPasses=[];v.committedJunction=null;}}
function createTrip(c,kind,fromId,toId,fromGate,toGate,deadline,extra={}){if(c?.vehicleId)return false;const destination=state.buildings.get(toId);if(destination&&parkingFree(destination)<=0)return false;if(kind==='pass'&&state.vehicles.size>=8000)return false;const fromBuilding=state.buildings.get(fromId);if(c&&fromBuilding&&CATALOG[fromBuilding.key].dualParking)parkingSpace(fromBuilding,c.id,true);
 const path=tripRoute(fromId,toId,fromGate,toGate,c?.id);if(!path)return false;const to=state.buildings.get(toId),from=state.buildings.get(fromId);if(kind==='leisure'&&to.visitors.size+to.reservedService>=CATALOG[to.key].service)return false;
const v={id:state.nextId++,trafficModel:2,noUTurnPolicy:1,citizenId:c?.id||null,kind,fromId,toId,fromGate,toGate,path:[...path],pathSet:new Set(path),pos:0,progress:0,lane:0,laneSeed:Math.abs(state.nextId)%4,speed:0,phase:from?'departing':'gate_waiting',wait:0,lastPain:0,deadline,late:false,color:c?citizenCarColor(c.id):TRIPS[kind].color,version:state.version,life:extra.life,stay:extra.stay,closeAt:extra.closeAt,activityEnd:extra.activityEnd,serviceKind:extra.serviceKind,residentReservation:kind==='moveIn',serviceReservation:kind==='leisure',retryAt:0,occKey:null,stopReason:'',routeMissing:false,routeMissingSince:null,committedJunction:null,departureRouteVersion:state.version};state.vehicles.set(v.id,v);if(kind==='moveIn')to.reservedResidents++;if(kind==='leisure')to.reservedService++;
v.lastMovedAt=state.time;v.respawns=0;
if(from){parkingSpace(from,c.id,true);from.queue.push(v.id);}if(c){c.vehicleId=v.id;c.location=from?CATALOG[from.key].kind:'travel';c.state=from?'รอออกเดินทาง':TRIPS[kind].name;c.history.push(timeText(state.time)+' '+TRIPS[kind].name+' → '+(to?CATALOG[to.key].name:'ประตูเมือง'));c.history=c.history.slice(-12);}return true;}
function arrive(v,instant=false){if(!instant&&v.phase!=='parking_in'&&beginParkingArrival(v))return;release(v);cleanupParkingVehicle(v,true);state.vehicles.delete(v.id);updateTrafficSpatial(v);const from=state.buildings.get(v.fromId);if(from)from.queue=from.queue.filter(i=>i!==v.id);const b=state.buildings.get(v.toId),c=state.citizens.get(v.citizenId);if(v.residentReservation&&b)b.reservedResidents=Math.max(0,b.reservedResidents-1);if(v.serviceReservation&&b)b.reservedService=Math.max(0,b.reservedService-1);if(!c)return;c.vehicleId=null;if(c.tourist&&!b){arriveTourist(c,v,b);return;}
if(v.kind==='moveOut'){removeCitizen(c);addNews(citizenName(c)+' ย้ายออกจากเมือง');return;}if(!b){c.location='home';c.locationId=c.homeId;c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);return;}
b.arrivals++;b.parked.add(c.id);parkingSpace(b,c.id,true);c.locationId=b.id;c.location=CATALOG[b.key].kind;
if(c.tourist){arriveTourist(c,v,b);return;}if(v.life){arriveLifestyle(c,v,b);return;}
if(v.kind==='moveIn'){c.resident=true;b.residents.add(c.id);c.state='อยู่บ้าน';assignJob(c);scheduleDay(c,Math.floor(state.time/1440));if(computeStats().pop<=5)addNews(citizenName(c)+' ย้ายมาถึงบ้านแล้ว');}
else if(v.kind==='work'){
 c.state=v.late?'อยู่ที่ทำงาน · มาสาย':'อยู่ที่ทำงาน';
 const routine=ensureRoutine(c);
 if(v.late){pain(c,4,'ไปทำงานสาย');routine.lateStreak=Math.min(12,(routine.lateStreak||0)+1);routine.earlyStreak=0;routine.advance=Math.min(42,(routine.advance||0)+4+Math.min(5,routine.lateStreak));}
 else{reward(c,20,92);routine.lateStreak=0;routine.earlyStreak=(routine.earlyStreak||0)+1;if(routine.earlyStreak>=3){routine.advance=Math.max(0,(routine.advance||0)-2);routine.earlyStreak=0;}}
 const plan=c.dailyPlan;if(plan&&state.time>=plan.day*1440+plan.end+plan.postDelay)c.queued=plan.day===Math.floor(state.time/1440)?{action:'afterWork',day:plan.day,kind:plan.kind}:{action:'home'};
}
else if(v.kind==='leisure'){b.visitors.add(c.id);c.state='อยู่'+KINDS[CATALOG[b.key].kind].name;if(v.late)pain(c,3,'ไปกิจกรรมสาย');else reward(c,15,94);schedule(c,Math.max(state.time+10,v.activityEnd||state.time+90),'home');}
else{c.state='อยู่บ้าน';reward(c,5,90);}if(c.queued){const q=c.queued;c.queued=null;schedule(c,state.time+.5,q.action,q);}}
function removeCitizen(c){if(c.tourist)releaseHotel(c);if(c.vehicleId)cancelVehicle(state.vehicles.get(c.vehicleId));for(const b of state.buildings.values()){b.residents.delete(c.id);b.workers.delete(c.id);b.visitors.delete(c.id);b.parked.delete(c.id);freeParkingSpace(b,c.id);}c.resident=false;c.removed=true;c.vehicleId=null;c.pending=null;c.queued=null;state.events=state.events.filter(e=>e.citizenId!==c.id);eventHeapify();state.citizens.delete(c.id);}
function cancelVehicle(v){if(!v)return;release(v);cleanupParkingVehicle(v);const b=state.buildings.get(v.toId),from=state.buildings.get(v.fromId);if(b&&v.residentReservation)b.reservedResidents=Math.max(0,b.reservedResidents-1);if(b&&v.serviceReservation)b.reservedService=Math.max(0,b.reservedService-1);if(from)from.queue=from.queue.filter(i=>i!==v.id);state.vehicles.delete(v.id);updateTrafficSpatial(v);const c=state.citizens.get(v.citizenId);if(c)c.vehicleId=null;}
// Route recovery is bounded per simulation step and respects the current heading.
function remainingRouteValid(v){for(let k=v.pos;k<v.path.length;k++)if(!state.roads.has(v.path[k])||k+1<v.path.length&&!state.roads.get(v.path[k]).links.has(v.path[k+1]))return false;return true;}
function strandVehicle(v,reason){const pose=vehiclePosition(v);release(v);v.phase='stuck';v.heldPose=pose;v.speed=0;v.stopReason=reason;setRouteMissing(v,true);v.nextRouteRetry=state.time;v.recoveryVersion=-1;if(state.roads.has(v.path[v.pos]))occupy(v,v.pos);}
function recoveryDue(v){return v.recoveryVersion!==state.version||!(v.nextRouteRetry>state.time);}
function recoverVehicle(v,force=false){
 if(!v||v.phase!=='stuck'||!force&&!recoveryDue(v))return false;
 v.recoveryVersion=state.version;v.nextRouteRetry=state.time+8+v.id%3;
 const current=v.path[v.pos],previous=v.pos?v.path[v.pos-1]:null,next=v.path[v.pos+1],pose=vehiclePosition(v);let path=null;
 const forward=v.progress>1e-6&&next!=null?[next]:[...(state.roads.get(current)?.links||[])].filter(n=>{const d=DIR[dir(current,n)];return !pose||d[0]*(pose.dx??0)+d[1]*(pose.dy??0)>=-.05;}),target=state.buildings.get(v.toId);
 for(const access of target?.access||(!v.toId?[{node:v.toGate??v.path.at(-1),prev:null}]:[])){path=route(current,access.node,forward,access.prev,previous);if(path)break;}
 if(!path){setRouteMissing(v,true);v.stopReason='ไม่มีเส้นทางที่ห้ามกลับรถ · รอเชื่อมถนนหรือลากรถออก';return false;}
 const probe={...v,path,pathSet:new Set(path),pos:0,progress:0,motionStartPose:pose,motionSeedLane:v.lane,turnLanes:{},junctionPasses:[],junctionQueueSince:{},trafficModel:2,heldPose:null,phase:'driving'};
 const lane=plannedLane(probe,0);if(!cellAvailable(path[0],dir(path[0],path[1]),lane,v.id)){setRouteMissing(v,false);v.stopReason='พบเส้นทางแล้ว · รอช่องถนนว่าง';return false;}
 release(v);Object.assign(v,probe);setRouteMissing(v,false);v.noUTurnPolicy=1;v.speed=0;v.wait=0;v.stopReason='';v.routeCheckedVersion=state.version;occupy(v,0);updateTrafficSpatial(v);return true;
}
function checkDepartureRoute(v){
 const path=tripRoute(v.fromId,v.toId,v.fromGate??v.path[0],v.toGate??v.path.at(-1),v.citizenId);v.departureRouteVersion=state.version;v.nextDepartureRouteRetry=state.time+8+v.id%3;
 if(!path){release(v);const from=state.buildings.get(v.fromId),c=state.citizens.get(v.citizenId);if(from&&c){from.parked.add(c.id);c.locationId=from.id;c.location=CATALOG[from.key].kind;c.state='รอเส้นทางออกจากอาคาร';}setRouteMissing(v,true);v.departureNoRoute=true;v.stopReason='ไม่มีเส้นทางออกไปยังจุดหมาย · รออยู่ในอาคาร/ประตู';return false;}
 v.path=[...path];v.pathSet=new Set(path);v.pos=0;v.progress=0;v.motionStartPose=null;v.heldPose=null;v.turnLanes={};v.junctionQueueSince={};v.departureNoRoute=false;setRouteMissing(v,false);v.stopReason='';v.noUTurnPolicy=1;return true;
}
// Reuse the original trip and destination reservation; only its physical
// location and route change. Route finding is throttled in advanceVehicles.
function respawnVehicle(v){
 if(!v||!state.vehicles.has(v.id))return false;
 const gates=(state.gates||[]).filter(gate=>state.roads.has(gate));
 if(!gates.length)return false;
 const target=state.buildings.get(v.toId),end=target?.access?.[0]?.node??v.toGate??v.path.at(-1);
 const gateQueue=new Map(gates.map(gate=>[gate,0]));
 for(const other of state.vehicles.values())if(other.phase==='gate_waiting'&&gateQueue.has(other.fromGate))gateQueue.set(other.fromGate,gateQueue.get(other.fromGate)+1);
 gates.sort((a,b)=>gateQueue.get(a)-gateQueue.get(b)||distance(a,end)-distance(b,end)||a-b);
 let entrance=gates[0],path=null;
 for(const gate of gates){const candidate=tripRoute(null,v.toId,gate,v.toGate);if(candidate?.length>1){entrance=gate;path=candidate;break;}}
 const from=state.buildings.get(v.fromId),c=state.citizens.get(v.citizenId);
 release(v);
 if(from){from.queue=from.queue.filter(id=>id!==v.id);if(c){from.parked.delete(c.id);from.visitors.delete(c.id);freeParkingSpace(from,c.id);}}
 v.fromId=null;v.fromGate=entrance;v.path=path?[...path]:[entrance];v.pathSet=new Set(v.path);
 v.pos=0;v.progress=0;v.lane=0;v.motionStartPose=null;v.motionSeedLane=null;v.emergencyInitialLane=null;v.heldPose=null;
 v.lotPath=null;v.lotDistance=0;v.lotBuilding=null;v.lotReady=false;v.mergeCommitted=false;v.mergeGhostUntil=null;v.mergeExitActive=false;v.mergeEscapeId=null;v.parkingEscapeFor=null;v.mergeAdmitted=null;v.mergeDrainStarted=false;v.mergeWaitSeconds=0;cleanupParkingVehicle(v);
 v.turnLanes={};v.junctionPasses=[];v.junctionQueueSince={};v.committedJunction=null;
 v.phase='gate_waiting';v.speed=0;v.wait=0;v.lastMovedAt=state.time;v.respawns=(v.respawns||0)+1;
 v.retryAt=0;v.departureRouteVersion=path?state.version:-1;v.nextDepartureRouteRetry=state.time;
 v.departureNoRoute=!path;v.routeCheckedVersion=state.version;v.noUTurnPolicy=1;v.trafficModel=2;
 setRouteMissing(v,!path);v.stopReason=path?'กลับมาเริ่มเข้าที่ประตูเมืองใหม่':'กลับมาประตูเมืองแล้ว · ยังไม่มีเส้นทางถึงจุดหมาย';
 if(c){c.location='travel';c.state='รอเข้าเมืองใหม่';c.history.push(timeText(state.time)+' รถติดครบ 120 นาที · กลับเข้าประตูเมืองใหม่');c.history=c.history.slice(-12);}
 updateTrafficSpatial(v);return true;
}
function canTowVehicle(v){return !!v&&(v.phase==='stuck'||v.departureNoRoute||v.wait>=48);}
function towVehicle(id){
 const v=state.vehicles.get(id);if(!canTowVehicle(v))return false;
 const c=state.citizens.get(v.citizenId),from=state.buildings.get(v.fromId);cancelVehicle(v);
 if(c){if(c.tourist){if(v.kind==='leisure')touristTrafficFailure(c,v,c.itinerary[v.tourIndex]);tourismLedger().departures++;removeCitizen(c);}else if(!c.resident){removeCitizen(c);}else{let origin=from||state.buildings.get(c.homeId);if(origin&&CATALOG[origin.key].service&&origin.visitors.size>=CATALOG[origin.key].service)origin=state.buildings.get(c.homeId);
  for(const b of state.buildings.values()){b.parked.delete(c.id);b.visitors.delete(c.id);}if(origin){origin.parked.add(c.id);if(CATALOG[origin.key].service)origin.visitors.add(c.id);c.locationId=origin.id;c.location=CATALOG[origin.key].kind;}else{c.locationId=null;c.location='home';}
  c.state='ยกเลิกเที่ยวเดินทาง · อยู่'+(origin?CATALOG[origin.key].name:'ที่พัก');c.problem='รถถูกลากออก เที่ยวเดินทางไม่สำเร็จ';c.pending=null;c.queued=null;c.history.push(timeText(state.time)+' ยกเลิกเที่ยวเดินทาง · ลากรถออก');c.history=c.history.slice(-12);
 }}
 if(follow===id)follow=null;return true;
}
function vehicleRecoveryActions(v){if(!v)return '';return row('เหตุผลที่หยุด',escapeSaveText(v.stopReason||(['departing','gate_waiting'].includes(v.phase)?'รอออกเดินทาง':'กำลังเดินทาง')))+(v.phase==='stuck'||v.departureNoRoute?action('ลองหาเส้นทางใหม่','reroute',v.id):'')+(canTowVehicle(v)?action('ลากรถออก / ยกเลิกเที่ยว','tow',v.id):'');}
function immigration(){if(computeStats().happy<TOURISM.residentHappiness)return;let n=0;for(const b of state.buildings.values()){const t=CATALOG[b.key];if(!t.residents||!b.access.length||b.failedRouteVersion===state.version)continue;const free=t.residents-b.residents.size-b.reservedResidents;for(let k=0;k<free&&n<16;k++){const c=newCitizen(b);const gates=[...state.gates].sort((a,z)=>distance(a,id(b.x,b.y))-distance(z,id(b.x,b.y)));let success=false;for(const gate of gates)if(createTrip(c,'moveIn',null,b.id,gate,null,state.time+1440)){success=true;n++;break;}if(!success){state.citizens.delete(c.id);b.failedRouteVersion=state.version;break;}}if(n>=16)break;}}
function junctionConnector(v,pos){
 const plan=motionPlan(v),g=plan.junctions.find(g=>g.pos===pos);if(!g)return null;
 if(g.connector)return g.connector;
 const samples=[],start=Math.max(0,g.entry-.35),end=Math.min(plan.total,g.clear+.35),n=Math.max(2,Math.ceil((end-start)/.12));
 for(let k=0;k<=n;k++)samples.push(positionOnMotion(plan,start+(end-start)*k/n));
 return g.connector={samples,node:g.node,incoming:motionDirection(v.path,pos-1),outgoing:motionDirection(v.path,pos),laneIn:plan.lanes[pos-1],laneOut:plan.lanes[Math.min(pos+1,plan.lanes.length-1)],turn:(motionDirection(v.path,pos)-motionDirection(v.path,pos-1)+4)%4,conflicts:new WeakMap()};
}
function pointSegmentDistance(p,a,b){const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);}
function segmentsNear(a,b,c,d){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;
 return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))<.4;
}
function connectorsConflict(a,b){
 if(!a||!b)return true;if(a.conflicts.has(b))return a.conflicts.get(b);
 let conflict=false;
 for(let i=1;i<a.samples.length&&!conflict;i++)for(let j=1;j<b.samples.length;j++){const p=a.samples[i-1],q=a.samples[i],r=b.samples[j-1],s=b.samples[j];if(Math.max(p.x,q.x)+.4<Math.min(r.x,s.x)||Math.max(r.x,s.x)+.4<Math.min(p.x,q.x)||Math.max(p.y,q.y)+.4<Math.min(r.y,s.y)||Math.max(r.y,s.y)+.4<Math.min(p.y,q.y))continue;if(segmentsNear(p,q,r,s)){conflict=true;break;}}
 a.conflicts.set(b,conflict);b.conflicts.set(a,conflict);return conflict;
}
function clearVehicleReservations(v){
 for(const [key,r]of state.reservations){if(r.passes){r.passes=r.passes.filter(p=>p.id!==v.id);if(!r.passes.length)state.reservations.delete(key);else r.id=r.passes[0].id;}else if(r.id===v.id)state.reservations.delete(key);}
}
function prepareJunctionQueues(){
 state.junctionQueues=new Map();
 for(const v of state.vehicles.values()){
  if(v.phase!=='driving'||!v.path?.length)continue;
  const plan=motionPlan(v),s=motionDistance(v,plan);if(!v.junctionQueueSince)v.junctionQueueSince={};
  const activeKeys=new Set();
  for(const g of plan.junctions){if(ownsJunctionPass(v,g.pos)||s>=g.entry||g.stop-s>2.5)continue;const key=g.pos+':'+g.node;activeKeys.add(key);if(v.junctionQueueSince[key]==null)v.junctionQueueSince[key]=state.time;
   const connector=junctionConnector(v,g.pos),request={id:v.id,pos:g.pos,at:v.junctionQueueSince[key],distance:g.stop-s,connector};let queue=state.junctionQueues.get(g.node);if(!queue)state.junctionQueues.set(g.node,queue=[]);queue.push(request);
  }
  for(const key of Object.keys(v.junctionQueueSince))if(!activeKeys.has(key))delete v.junctionQueueSince[key];
 }
}
function junctionPriority(request,node){
 const c=request.connector;let priority=c.turn===2?2:c.turn===1?1:0;
 // A movement that has waited a full signal cycle joins the oldest-first tier.
 return state.time-request.at>=signalCycle(node)?0:priority;
}
function queueAllows(v,pos,connector){
 const node=v.path[pos],queue=state.junctionQueues?.get(node);if(!queue)return true;
 const own=queue.find(q=>q.id===v.id&&q.pos===pos);if(!own)return true;
 const eligible=q=>{const car=state.vehicles.get(q.id);return car&&junctionExitAvailable(car,q.pos)&&(!signalRequired(node)||signalAllows(node,q.connector.incoming))&&!queue.some(front=>front.id!==q.id&&front.connector.incoming===q.connector.incoming&&front.connector.laneIn===q.connector.laneIn&&front.distance<q.distance-.01);};
 if(!eligible(own))return false;const priority=junctionPriority(own,node);
 for(const other of queue){if(other.id===v.id||!eligible(other)||!connectorsConflict(connector,other.connector))continue;const p=junctionPriority(other,node);if(p<priority||p===priority&&(other.at<own.at||other.at===own.at&&(other.distance<own.distance-.01||Math.abs(other.distance-own.distance)<.01&&other.id<v.id)))return false;}
 return true;
}
function signalRequired(node){return junction(node)>=3;}
function junctionExitAvailable(v,pos){
 for(let k=pos;k<=Math.min(v.path.length-1,pos+TRAFFIC_RULES.maxIntersectionLookahead);k++)
  if(!roadTraversalAvailable(v,k))return false;
 // A free *logical* lane is not enough if a car is physically sitting at the
 // downstream side of the junction (for example during a lane change).
 if(trafficSpatial){
  const plan=motionPlan(v),junctionTurn=plan.junctions.find(g=>g.pos===pos);
  if(junctionTurn){
   for(const beyond of [.18,.6]){
    const pose=positionOnMotion(plan,Math.min(plan.total,junctionTurn.clear+beyond));
    const ix=Math.floor(pose.x/2),iy=Math.floor(pose.y/2);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)
     for(const other of trafficSpatial.cells.get((ix+dx)+':'+(iy+dy))?.values()||[])
      if(other.id!==v.id&&Math.hypot(other.pose.x-pose.x,other.pose.y-pose.y)<.8&&capsulesOverlap(pose,other.pose))return false;
   }
  }
 }
 return true;
}
function intersectionAllowed(v,pos,ignoreSignal=false){
 if(ownsJunctionPass(v,pos))return true;const i=v.path[pos];if(junction(i)<3)return true;
 const entering=motionDirection(v.path,pos-1);if(signalRequired(i)&&!ignoreSignal&&!signalAllows(i,entering))return false;
 const connector=junctionConnector(v,pos),lock=state.reservations.get('junction:'+i);
 for(const pass of lock?.passes|| (lock?[lock]:[])){if(pass.id!==v.id){const other=state.vehicles.get(pass.id);if(other&&connectorsConflict(connector,junctionConnector(other,pass.pos??other.pos)))return false;}}
 if(!ignoreSignal&&!queueAllows(v,pos,connector))return false;
 return junctionExitAvailable(v,pos);
}
function ownsJunctionPass(v,pos){return v.junctionPasses?.some(p=>p.pos===pos&&p.node===v.path[pos]);}
function reserveIntersection(v,pos){
 const i=v.path[pos];if(junction(i)<3)return;
 if(!v.junctionPasses)v.junctionPasses=[];
 if(!ownsJunctionPass(v,pos))v.junctionPasses.push({pos,node:i});
 const key='junction:'+i,lock=state.reservations.get(key)||{passes:[]};if(!lock.passes)lock.passes=[];const pass=lock.passes.find(p=>p.id===v.id);if(pass){pass.until=state.time+30;pass.pos=pos;}else lock.passes.push({id:v.id,pos,until:state.time+30});lock.id=lock.passes[0].id;lock.until=state.time+30;state.reservations.set(key,lock);
 for(let k=pos;k<=Math.min(v.path.length-1,pos+TRAFFIC_RULES.maxIntersectionReservation);k++){
  const next=k+1<v.path.length?v.path[k+1]:v.path[Math.max(0,k-1)],d=k+1<v.path.length?dir(v.path[k],next):dir(next,v.path[k]);
  state.reservations.set(occKey(v.path[k],d,plannedLane(v,k)),{id:v.id,until:state.time+30});
 }
 v.committedJunction=i;
}
function refreshMotionReservations(v,plan,s){
 if(!v.junctionPasses?.length)return;
 const active=v.junctionPasses.filter(p=>{const g=plan.junctions.find(g=>g.pos===p.pos&&g.node===p.node);return g&&s<g.clear;});
 if(active.length!==v.junctionPasses.length){clearVehicleReservations(v);v.junctionPasses=active;}
 for(const p of active)reserveIntersection(v,p.pos);
 v.committedJunction=active.length?active[active.length-1].node:null;
}
let trafficSpatial=null;
function capsule(p){const dx=p.dx??Math.cos(Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle))),dy=p.dy??Math.sin(Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle)));return [{x:p.x-dx*.16,y:p.y-dy*.16},{x:p.x+dx*.16,y:p.y+dy*.16}];}
function capsulesOverlap(p,q){
 const x=q.x-p.x,y=q.y-p.y;if(Math.abs(x)>.65||Math.abs(y)>.65)return false;
 if(p.dx!=null&&q.dx!=null&&Math.abs(p.dx*q.dy-p.dy*q.dx)<.01){const along=Math.abs(x*p.dx+y*p.dy),across=Math.abs(x*p.dy-y*p.dx);return Math.hypot(Math.max(0,along-.32),across)<.32;}
 const [a,b]=capsule(p),[c,d]=capsule(q);const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))<.32;
}
function updateTrafficSpatial(v){
 if(!trafficSpatial)return;trafficSpatial.epoch++;const old=trafficSpatial.cars.get(v.id);if(old){const cell=trafficSpatial.cells.get(old.key);cell?.delete(v.id);if(!cell?.size)trafficSpatial.cells.delete(old.key);trafficSpatial.cars.delete(v.id);}
 if(!state.vehicles.has(v.id)||(!['driving','parking_in','parking_out'].includes(v.phase)&&!(v.phase==='departing'&&v.lotPath)&&!(v.phase==='stuck'&&v.heldPose)))return;const pose=vehiclePosition(v),key=Math.floor(pose.x/2)+':'+Math.floor(pose.y/2);let cell=trafficSpatial.cells.get(key);if(!cell)trafficSpatial.cells.set(key,cell=new Map());const record={id:v.id,pose,key};cell.set(v.id,record);trafficSpatial.cars.set(v.id,record);
}
// Only reciprocal, simultaneous lane swaps may phase through one another.
// Ordinary following, one-sided cut-ins, intersections and parking stay solid.
function laneChangeSegment(v,plan,s){
 if(v.phase!=='driving'||v.path?.length<2)return null;
 const d=motionDirection(v.path,v.pos),axis=DIR[d];
 for(const p of plan.pieces){
  if(p.startDistance>s+.45)break;
  if(p.turn||p.endDistance<s-.20)continue;
  const dx=p.p3.x-p.p0.x,dy=p.p3.y-p.p0.y;
  const forward=dx*axis[0]+dy*axis[1];
  const side=dx*axis[1]-dy*axis[0];
  if(forward<.25||Math.abs(side)<.22)continue;
  const crossesSignal=plan.junctions.some(g=>p.startDistance<g.clear&&p.endDistance>g.entry);
  if(crossesSignal)continue;
  const lateral=p=>p.x*axis[1]-p.y*axis[0];
  return {direction:d,start:lateral(p.p0),end:lateral(p.p3),side};
 }
 return null;
}
function reciprocalLaneSwap(v,other,plan,s,otherPose){
 if(v.phase!=='driving'||other.phase!=='driving'||v.id===other.id)return false;
 const a=laneChangeSegment(v,plan,s);
 if(!a)return false;
 const otherPlan=motionPlan(other),otherS=motionDistance(other,otherPlan);
 const b=laneChangeSegment(other,otherPlan,otherS);
 if(!b||a.direction!==b.direction||a.side*b.side>=0)return false;
 // Both vehicles must swap sides, rather than converge into one common lane.
 if((a.start-b.start)*(a.end-b.end)>=0)return false;
 const start=positionOnMotion(plan,s),d=DIR[a.direction];
 const ahead=(otherPose.x-start.x)*d[0]+(otherPose.y-start.y)*d[1];
 return Math.abs(ahead)<2.2;
}
function physicalTrafficLimit(v,plan,s,lookahead){
 if(!trafficSpatial)return Infinity;const end=Math.min(plan.total,s+lookahead),origin=positionOnMotion(plan,s),x=Math.floor(origin.x/2),y=Math.floor(origin.y/2),key=x+':'+y;let cached=trafficSpatial.candidates.get(v.id),candidates=cached?.key===key&&cached.epoch===trafficSpatial.epoch?cached.ids:null;
 if(!candidates){candidates=[];for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(const other of trafficSpatial.cells.get((x+dx)+':'+(y+dy))?.values()||[])if(other.id!==v.id)candidates.push(other.id);trafficSpatial.candidates.set(v.id,{key,epoch:trafficSpatial.epoch,ids:candidates});}
 if(!candidates.length)return Infinity;
 const piece=plan.pieces.find(p=>p.line&&p.startDistance<=s&&p.endDistance>=end),near=[];
 for(const id of candidates){
  const otherCar=state.vehicles.get(id);
  // Road cars ghost through parked, departing and route-stuck vehicles, not through moving same-lane leaders.
  if(!otherCar||otherCar.phase!=='driving'||parkingEscapePair(v,id))continue;
  const record=trafficSpatial.cars.get(id);if(!record)continue;
  const p=record.pose,x=p.x-origin.x,y=p.y-origin.y;
  if(x*x+y*y>(lookahead+.7)*(lookahead+.7))continue;
  // Swapping neighbours can overlap only while their lateral paths cross.
  if(reciprocalLaneSwap(v,otherCar,plan,s,p))continue;
  if(piece&&origin.dx!=null&&p.dx!=null&&Math.abs(origin.dx*p.dy-origin.dy*p.dx)<.01){
   const across=Math.abs(x*origin.dy-y*origin.dx);
   // On a straight stretch, cars in another parallel lane must not hold up the left lane.
   if(motionDirection(v.path,v.pos)===motionDirection(otherCar.path,otherCar.pos)&&plannedLane(v,v.pos)!==plannedLane(otherCar,otherCar.pos)&&across>=.22)continue;
   if(across>=.32)continue;
  }
  near.push(p);
 }
 if(!near.length)return Infinity;let safe=s;
 for(let next=s+.1;next<=end+.099;next+=.1){const along=Math.min(end,next),p=positionOnMotion(plan,along);for(const other of near)if(capsulesOverlap(p,other))return Math.max(s,safe-.025);safe=along;if(along===end)break;}
 return Infinity;
}
function motionBarrier(v,plan,s,budget=-1){
 const scan=Math.min(3,Math.max(.8,(v.speed||0)*(v.speed||0)/9.6+.3,budget>=0?budget+.1:0));
 // Cars already on the road have priority: the parking exit must yield, not stop all road traffic.
 const physical=physicalTrafficLimit(v,plan,s,scan);
 let limit=physical,reason=Number.isFinite(physical)?'เว้นระยะรถ':'';
 const nextPos=v.pos+1;
 if(nextPos<v.path.length&&!roadTraversalAvailable(v,nextPos)){
  const cellLimit=Math.max(s,plan.nodes[nextPos]-TRAFFIC_RULES.vehicleHalfLength*2-.08);if(cellLimit<limit){limit=cellLimit;reason='รถคันหน้าขวาง';}
 }
 const lookahead=Math.max(4,(v.speed||0)*(v.speed||0)/9.6+1,budget>=0?budget+.5:0);
 for(const g of plan.junctions){
  if(s>=g.clear||g.stop>s+lookahead||ownsJunctionPass(v,g.pos))continue;
  // Cars from an older save can already be beyond the entry line. They may
  // clear a free junction, but are never rewound when the signal changes.
  const inside=s>g.entry+1e-6;
  const allowed=intersectionAllowed(v,g.pos,inside);
  if(!allowed){
   const stop=Math.max(s,g.stop);
   if(stop<limit){limit=stop;reason=signalRequired(g.node)&&!signalAllows(g.node,dir(v.path[g.pos-1],g.node))?'ไฟแดง':'คิวแยก';}
  }else if(inside||(budget>=0&&g.stop<=s+budget+1e-8&&g.stop<=limit))reserveIntersection(v,g.pos);
 }
 return{limit,reason};
}
function enforceNoUTurn(v){
 if(v.noUTurnPolicy===1||!v.path?.length)return;
 const plan=motionPlan(v),s=motionDistance(v,plan),turn=plan.turns.find(t=>t.turn===2&&t.endDistance>s);
 if(!turn){v.noUTurnPolicy=1;return;}
 const pose=vehiclePosition(v),current=v.path[v.pos],previous=v.pos?v.path[v.pos-1]:null,next=v.path[v.pos+1],target=state.buildings.get(v.toId);let replacement=null;
 if(s<=turn.startDistance+1e-6)for(const access of target?.access||[{node:v.toGate,prev:null}]){replacement=route(current,access.node,next==null?null:[next],access.prev,previous);if(replacement)break;}
 release(v);v.noUTurnPolicy=1;
 if(!replacement){v.heldPose=pose;v.phase='stuck';v.speed=0;v.stopReason='ห้ามกลับรถ · ต้องสร้างถนนวนให้ถึงปลายทาง';setRouteMissing(v,true);const from=state.buildings.get(v.fromId);if(from)from.queue=from.queue.filter(id=>id!==v.id);if(state.roads.has(current))occupy(v,v.pos);return;}
 v.motionStartPose=pose;v.motionSeedLane=v.lane;v.path=replacement;v.pathSet=new Set(replacement);v.pos=0;v.progress=0;v.turnLanes={};v.trafficModel=2;v.heldPose=null;setRouteMissing(v,false);v.stopReason='';
 if(v.phase==='driving')occupy(v,0);
}

// A car approaching an occupied parking entrance may jump to the next RIGHT
// lane. Search a new forward-only route at the same moment: the physical pose,
// route, planned lane and occupancy must all agree in this one synchronous step.
function parkingGateAlerts(){
 const alerts=[],seen=new Set();
 for(const car of state.vehicles.values()){
  const inLot=car.phase==='parking_in';
  const outLot=car.phase==='parking_out'||car.phase==='departing'&&car.lotReady||car.phase==='driving'&&car.mergeExitActive;
  const waitingInRoad=car.phase==='driving'&&car.toId!=null&&(car.speed||0)<.3;
  if(!inLot&&!outLot&&!waitingInRoad)continue;
  const building=state.buildings.get(inLot||waitingInRoad?car.toId:car.fromId);
  if(!building)continue;
  const access=building.access?.find(a=>inLot||waitingInRoad?a.entry:a.exit);
  if(!access?.next?.length)continue;
  if(waitingInRoad){
   const p=vehiclePosition(car);
   if(!p||Math.hypot(p.x-access.x,p.y-access.y)>2.8)continue;
  }
  const d=dir(access.node,access.next[0]),key=access.node+':'+d;
  if(!seen.has(key)){seen.add(key);alerts.push({x:access.x,y:access.y,d,node:access.node});}
 }
 return alerts;
}
function emergencyRightReroute(v,alerts){
 if(v.phase!=='driving'||v.mergeExitActive||v.parkingEscapeFor||!v.path?.[v.pos+1]||state.time<(v.emergencyRightUntil||0))return false;
 const node=v.path[v.pos],next=v.path[v.pos+1],direction=dir(node,next);
 if(laneCapacity(node,direction)<2||junction(node)>=3||junction(next)>=3)return false;
 const oldLane=plannedLane(v,v.pos),rightLane=oldLane-1;
 // The outer (left) lane stays in its queue; it must not jump right to escape its leader.
 if(rightLane<0||oldLane===laneCapacity(node,direction)-1)return false;
 const pose=vehiclePosition(v);
 // Only affected cars approaching the entry/exit should jump. Preserve
 // legitimate traffic heading INTO the lot rather than diverting it.
 if(v.toId!=null){
  const dest=state.buildings.get(v.toId);
  if(dest?.access?.some(a=>a.entry&&Math.hypot(a.x-pose.x,a.y-pose.y)<3.2))return false;
 }
 const dirVec=DIR[direction],right={x:dirVec[1],y:-dirVec[0]};
 const relevant=alerts.some(a=>{
  if(a.d!==direction)return false;
  const x=a.x-pose.x,y=a.y-pose.y;
  return x*dirVec[0]+y*dirVec[1]>=-.55&&x*dirVec[0]+y*dirVec[1]<3.5&&Math.abs(x*right.x+y*right.y)<3;
 });
 if(!relevant)return false;
 const currentOffset=laneOffset(node,direction,oldLane),nextOffset=laneOffset(node,direction,rightLane);
 const shift={x:nextOffset.x-currentOffset.x,y:nextOffset.y-currentOffset.y};
 const targetPose={x:pose.x+shift.x,y:pose.y+shift.y,angle:Math.atan2(dirVec[1]*.78,dirVec[0]),dx:dirVec[0],dy:dirVec[1]};
 // Check both logical lane reservations and physical bodies; even an instant
 // jump cannot overlap another car or intrude into the oncoming direction.
 if(!cellAvailable(node,direction,rightLane,v.id)||!cellAvailable(next,direction,rightLane,v.id))return false;
 for(const other of state.vehicles.values()){
  if(other.id===v.id)continue;
  const p=vehiclePosition(other);
  if(!p||Math.hypot(p.x-targetPose.x,p.y-targetPose.y)>1.5)continue;
  for(const offset of [-.45,0,.6]){
   const sample={...targetPose,x:targetPose.x+dirVec[0]*offset,y:targetPose.y+dirVec[1]*offset};
   if(lotCarsOverlap(sample,p,.08))return false;
  }
 }
 const previous=v.pos?v.path[v.pos-1]:null;
 const targets=state.buildings.get(v.toId)?.access?.filter(a=>a.entry)
  ||[{node:v.toGate??v.path.at(-1),prev:null}];
 let newPath=null;
 for(const access of targets){
  const option=route(node,access.node,[next],access.prev,previous);
  if(option?.length>1&&(!newPath||option.length<newPath.length))newPath=option;
 }
 if(!newPath)newPath=v.path.slice(v.pos);
 if(newPath.length<2||newPath[1]!==next)return false;
 const candidate={...v,path:[...newPath],pathSet:new Set(newPath),pos:0,progress:0,
  motionStartPose:targetPose,motionSeedLane:rightLane,emergencyInitialLane:rightLane,
  turnLanes:{},junctionPasses:[],junctionQueueSince:{},committedJunction:null};
 const candidatePlan=motionPlan(candidate);
 if(!candidatePlan.total||plannedLane(candidate,0)!==rightLane)return false;
 // Switch physical and logical lane in a single commit, with no intermediate
 // state where both lanes think they contain the same car.
 release(v);
 Object.assign(v,candidate);
 v.speed=Math.min(v.speed||0,2);
 v.emergencyRightUntil=state.time+6;
 v.stopReason='หลบขวาฉุกเฉินและคำนวณเส้นทางใหม่';
 v.routeCheckedVersion=state.version;v.lastMovedAt=state.time;
 occupy(v,0);updateTrafficSpatial(v);
 return true;
}
function advanceVehicles(realDt,gameDt){
 let routeBudget=2,respawnBudget=2;const gateAttempt=new Set(),simDt=Math.max(0,realDt*state.speed);for(const car of state.vehicles.values()){if(['departing','gate_waiting'].includes(car.phase)){if(car.noUTurnPolicy!==1){car.departureRouteVersion=-1;car.noUTurnPolicy=1;}}else if(car.phase==='driving'||car.phase==='stuck')enforceNoUTurn(car);}const requests=[];for(const car of state.vehicles.values()){let at=null;if(car.phase==='stuck'&&recoveryDue(car))at=car.recoveryVersion!==state.version?-1:car.nextRouteRetry??-1;else if(['departing','gate_waiting'].includes(car.phase)&&!(car.retryAt>state.time)&&(car.departureRouteVersion!==state.version||car.departureNoRoute&&!(car.nextDepartureRouteRetry>state.time)))at=car.departureRouteVersion!==state.version?-1:car.nextDepartureRouteRetry??-1;if(at!=null){requests.push({id:car.id,at});requests.sort((a,b)=>a.at-b.at||a.id-b.id);if(requests.length>2)requests.pop();}}const routeChecks=new Set(requests.map(r=>r.id));prepareJunctionQueues();trafficSpatial={cells:new Map(),cars:new Map(),candidates:new Map(),epoch:0};for(const car of state.vehicles.values())updateTrafficSpatial(car);
 prepareParkingMerges(simDt);
 const emergencyAlerts=parkingGateAlerts();
 for(const v of [...state.vehicles.values()]){
  if(!state.vehicles.has(v.id))continue;
  if(!Number.isFinite(v.lastMovedAt))v.lastMovedAt=state.time-Math.max(0,Number.isFinite(v.wait)?v.wait:0);
  // Apply the same 120-game-minute recovery to every moving/stalled trip,
  // INCLUDING parking_in, parking_out and departing without an active lotPath.
  // This check must precede the early continue branches for parking motion.
  if(respawnBudget>0&&['departing','parking_in','parking_out','driving','stuck'].includes(v.phase)
    &&state.time-v.lastMovedAt>=IMMOBILE_RESPAWN_TIMEOUT
    &&respawnVehicle(v)){respawnBudget--;continue;}
  if(v.phase==='parking_in'){
   const done=advanceLot(v,simDt);
   const gateDistance=Math.hypot(v.lotPath[1].x-v.lotPath[0].x,v.lotPath[1].y-v.lotPath[0].y);
   if(v.lotDistance>gateDistance+.3)release(v);
   if(v.parkingStage){
    // Once inside the aisle, choose a free forward stall. If none is
    // currently usable, wait IN the lot and retry without occupying the road.
    if(done&&state.time>=(v.parkingReplanAt||0)){
     if(assignArrivalParking(v,true,true))v.parkingStage=false;
     else{v.parkingReplanAt=state.time+2;v.stopReason='อยู่ในลานจอด · หาช่องว่าง';}
    }
    updateTrafficSpatial(v);continue;
   }
   if(done)arrive(v,true);
   else if(state.time-v.lastMovedAt>=2&&state.time>=(v.parkingReplanAt||0)){
    if(!assignArrivalParking(v,true)){v.parkingReplanAt=state.time+2;v.stopReason='หาช่องจอดถัดไป';}
   }
   updateTrafficSpatial(v);continue;
  }
  if(v.phase==='parking_out'){
   if(v.mergeEscapeId){v.stopReason='ให้รถบนถนนที่ขวางกันผ่านก่อน';updateTrafficSpatial(v);continue;}
   if(!v.mergeCommitted&&!canCommitParkingMerge(v)){v.stopReason='รอช่องว่างตลอดทางออก';updateTrafficSpatial(v);continue;}
   if(advanceLot(v,simDt)){
    const b=state.buildings.get(v.fromId);
    if(b){b.queue=b.queue.filter(id=>id!==v.id);b.parked.delete(v.citizenId);b.visitors.delete(v.citizenId);freeParkingSpace(b,v.citizenId);}
    const c=state.citizens.get(v.citizenId);
    if(c){c.location='travel';c.state=TRIPS[v.kind].name;}
    v.lotPath=null;v.lotReady=false;v.mergeExitActive=true;v.mergeGhostUntil=null;
    v.phase='driving';v.speed=0;v.wait=0;v.stopReason='';v.lastMovedAt=state.time;
    const key=occKey(v.path[0],motionDirection(v.path,0),plannedLane(v,0));
    if(!state.occ.has(key)&&!state.reservations.has(key))occupy(v,0);
   }
   updateTrafficSpatial(v);continue;
  }
  if(v.mergeExitActive&&v.mergeEscapeId){v.speed=0;v.stopReason='ให้รถบนถนนที่ขวางกันผ่านก่อน';updateTrafficSpatial(v);continue;}
  if(missingRoute(v)){

   if(!Number.isFinite(v.routeMissingSince))v.routeMissingSince=state.time;
   if(state.time-v.routeMissingSince>NO_ROUTE_TIMEOUT){towVehicle(v.id);continue;}
  }
  const c=state.citizens.get(v.citizenId);
  if(v.deadline&&state.time>v.deadline&&!['pass','moveIn'].includes(v.kind)){
   if(!v.late){v.late=true;if(c){c.late=true;pain(c,3,'เดินทางสาย');}}
   else if(c&&state.time-(v.lastLate||v.deadline)>60){pain(c,1,'เดินทางล่าช้าต่อเนื่อง');v.lastLate=state.time;}
  }
  if(v.phase==='gate_waiting'||v.phase==='departing'){
   v.wait+=gameDt;if(v.phase==='departing'&&!v.departureNoRoute){if(!prepareLotDeparture(v,simDt)){updateTrafficSpatial(v);continue;}updateTrafficSpatial(v);}if(v.retryAt>state.time)continue;v.retryAt=state.time+.35;
   const from=state.buildings.get(v.fromId);
   if(v.departureRouteVersion!==state.version||v.departureNoRoute&&!(v.nextDepartureRouteRetry>state.time)){if(routeBudget<=0||!routeChecks.has(v.id))continue;routeBudget--;if(!checkDepartureRoute(v))continue;}
   if(v.departureNoRoute)continue;
   if(from&&[...state.vehicles.values()].some(car=>car.id!==v.id&&car.fromId===from.id&&car.phase==='parking_out'))continue;
   if(!from){if(gateAttempt.has(v.path[0]))continue;gateAttempt.add(v.path[0]);}
   const i=v.path[0],next=v.path[1];if(next==null){arrive(v);continue;}
   const d=dir(i,next),lane=plannedLane(v,0);
   if(from){
    // Only one vehicle per lot is in the street-merge corridor at once.
    // Clearance and a temporary driveway claim are checked before moving.
    const start=parkingPose(v),end=positionOnMotion(motionPlan(v),0);
    v.lotPath=[start,end];v.lotDistance=0;v.lotReady=false;
    v.mergeCommitted=false;v.mergePolicy=2;v.mergeWaitSeconds=0;v.mergeAdmitted=null;v.mergeDrainStarted=false;v.mergeEscapeId=null;v.phase='parking_out';v.stopReason='รอช่องทางออกสู่ถนน';
    updateTrafficSpatial(v);continue;
   }
   if(cellAvailable(i,d,lane,v.id)&&physicalTrafficLimit(v,motionPlan(v),0,.01)>0){
    if(c){c.location='travel';c.state=TRIPS[v.kind].name;}
    v.phase='driving';v.speed=0;v.stopReason='';if(c?.tourist)touristEnter(c,v);
    occupy(v,0);v.wait=0;v.lastMovedAt=state.time;updateTrafficSpatial(v);
   }else if(c&&v.wait>60&&state.time-v.lastPain>90){pain(c,1,'รอออกจากอาคารหรือประตูเมือง');v.lastPain=state.time;}
   continue;
  }
  if(v.phase==='stuck'){v.wait+=gameDt;v.speed=0;if(routeBudget>0&&routeChecks.has(v.id)&&recoveryDue(v)){routeBudget--;recoverVehicle(v);}continue;}
  if(v.routeCheckedVersion!==state.version){v.routeCheckedVersion=state.version;if(!remainingRouteValid(v)){strandVehicle(v,'เส้นทางเดิมขาด');continue;}}
  if(v.pos+1>=v.path.length){arrive(v);continue;}
  if(emergencyAlerts.length)emergencyRightReroute(v,emergencyAlerts);
  if(v.mergeGhostUntil!=null&&motionDistance(v)>=v.mergeGhostUntil-1e-8)v.mergeGhostUntil=null;
  // Claim only a free lane; a pair-specific recovery cannot steal occupancy.
  if(!v.occKey&&state.roads.has(v.path[v.pos])){
   const d=motionDirection(v.path,v.pos),lane=plannedLane(v,v.pos),key=occKey(v.path[v.pos],d,lane);
   if(!state.occ.has(key)&&!state.reservations.has(key))occupy(v,v.pos);
  }
  const plan=motionPlan(v),initial=motionDistance(v,plan),type=ROADS[state.roads.get(v.path[v.pos]).type];
  let s=initial;refreshMotionReservations(v,plan,s);
  const barrier=motionBarrier(v,plan,s),braking=4.8,acceleration=2.8;
  let target=type.speed*.9;
  for(const turn of plan.turns){
   if(s>=turn.endDistance)continue;
   const cornerSpeed=Math.max(.65,Math.sqrt(2.8*turn.radius));
   target=Math.min(target,Math.sqrt(cornerSpeed*cornerSpeed+2*braking*Math.max(0,turn.startDistance-s)));
  }
  if(Number.isFinite(barrier.limit))target=Math.min(target,Math.sqrt(2*braking*Math.max(0,barrier.limit-s)));
  const oldSpeed=Math.max(0,v.speed||0);
  v.speed=target>oldSpeed?Math.min(target,oldSpeed+acceleration*simDt):Math.max(target,oldSpeed-braking*simDt);
  let budget=(oldSpeed+v.speed)*.5*simDt,blocked=barrier.limit<=s+1e-9?barrier.reason:'',transitions=0;
  while(budget>1e-10&&state.vehicles.has(v.id)&&transitions<64){
   if(v.pos+1>=v.path.length){arrive(v);break;}
   const gate=motionBarrier(v,plan,s,budget),end=plan.nodes[v.pos+1],remaining=Math.max(0,end-s);
   const step=Math.min(budget,remaining,Math.max(0,gate.limit-s));
   if(step>0){s+=step;budget-=step;v.progress=Math.min(1,(s-plan.nodes[v.pos])/Math.max(1e-10,end-plan.nodes[v.pos]));}
   if(s>=end-1e-9){
    const nextPos=v.pos+1,d=motionDirection(v.path,nextPos),lane=plannedLane(v,nextPos);
    if(!roadTraversalAvailable(v,nextPos)){blocked=gate.reason||'รถคันหน้าขวาง';v.speed=0;break;}
    // Pair-specific recovery never steals the parking car's logical lane.
    release(v,true);v.pos=nextPos;v.progress=0;
    const roadKey=occKey(v.path[nextPos],d,lane);
    if(!state.occ.has(roadKey)&&!state.reservations.has(roadKey))occupy(v,v.pos);
    transitions++;
    state.roads.get(v.path[v.pos]).load=Math.min(1.2,state.roads.get(v.path[v.pos]).load+.15);
    refreshMotionReservations(v,plan,s);
    if(v.pos===v.path.length-1){arrive(v);break;}
   }else if(step<1e-10||s>=gate.limit-1e-9){blocked=gate.reason;v.speed=0;break;}
  }
  if(!state.vehicles.has(v.id)||v.phase==='parking_in')continue;
  refreshMotionReservations(v,plan,s);
  if(s-initial>1e-7)v.lastMovedAt=state.time;
  if(blocked&&s-initial<1e-7){
   v.wait+=gameDt;v.stopReason=blocked;state.roads.get(v.path[v.pos]).wait=Math.min(10,state.roads.get(v.path[v.pos]).wait+realDt);
   if(c&&v.wait>14&&state.time-v.lastPain>70){pain(c,1,blocked==='ไฟแดง'?'รถติดหรือรอสัญญาณไฟ':'รถติดหรือรอคิว');v.lastPain=state.time;}
  }else{v.wait=0;v.stopReason=blocked||'';}
  updateTrafficSpatial(v);
 }
 trafficSpatial=null;parkingMerges=[];
 for(const [key,res]of state.reservations){if(res.passes){res.passes=res.passes.filter(p=>p.until>=state.time&&state.vehicles.has(p.id));if(res.passes.length)res.id=res.passes[0].id;else state.reservations.delete(key);}else if(res.until<state.time||!state.vehicles.has(res.id))state.reservations.delete(key);}
}
function daily(){reconcile();const s=computeStats();state.money=Math.max(-10000,state.money+s.net);for(const b of state.buildings.values())b.arrivals=0;for(const c of state.citizens.values()){if(!c.resident||c.removed)continue;assignJob(c);if(c.profile.trait!==3&&!c.workId)c.unemployed++;else c.unemployed=0;if(c.unemployed>=2){pain(c,28,'ว่างงาน 2 วัน');c.movingOut=true;}if(c.happy<25)c.movingOut=true;if(c.movingOut)schedule(c,state.time+1,'moveOut');else if(!c.late&&c.pain<8&&(c.workId||c.profile.trait===3))reward(c,10,86);c.lastTax=c.late?250:500;c.late=false;c.pain=0;c.failKinds.clear();scheduleDay(c,Math.floor(state.time/1440));}addNews('สรุปวัน: '+(s.net>=0?'รายรับสุทธิ ':'ขาดทุน ')+money(Math.abs(s.net)));}
function reconcile(){syncParkingSlots();for(const b of state.buildings.values()){b.reservedResidents=0;b.reservedService=0;}for(const v of state.vehicles.values()){const b=state.buildings.get(v.toId);if(b){if(v.residentReservation)b.reservedResidents++;if(v.serviceReservation)b.reservedService++;}}}
function tick(dt){if(!state.speed)return;const old=state.time,gameDt=dt*GAME_MINUTES_PER_SECOND*state.speed;state.time+=gameDt;if(Math.floor(old/1440)!==Math.floor(state.time/1440))daily();let count=0,trips=0;while(state.events.length&&state.events[0].at<=state.time&&count<42&&trips<14){const e=eventPop(),c=state.citizens.get(e.citizenId);runAction(c,e.action,e);count++;trips++;}
if(state.time-state.lastImmigration>=1){state.lastImmigration=state.time;immigration();}
if(Math.floor(old/2)!==Math.floor(state.time/2)){let n=0;for(const c of state.citizens.values()){if(c.pending&&!c.pending.life&&c.pending.next<=state.time&&n++<80){const p=c.pending;if(p.expires<state.time){c.pending=null;continue;}runAction(c,p.action,p);}}}
if(state.time-state.lastPass>=90){state.lastPass=state.time;if(computeStats().pop<1200&&state.vehicles.size<3600){const index=Math.floor(state.time/90)%4;createTrip(null,'pass',null,null,state.gates[index],state.gates[(index+2)%4],null);}}
advanceVehicles(dt,gameDt);updateTourism(gameDt);for(const r of state.roads.values()){if(r.load>.001)r.load*=Math.pow(.90,dt*4);if(r.wait>.001)r.wait*=Math.pow(.72,dt*4);}if(state.stats.happy<70&&state.time-(state.lastHappyAlert||0)>180){addNews('คนใหม่หยุดย้ายเข้า ช่วยแก้ปัญหาให้ความสุขตั้งแต่ 70%');state.lastHappyAlert=state.time;}}
function lineCells(a,b){let [x,y]=xy(a),[u,v]=xy(b),dx=u-x,dy=v-y;const horizontal=Math.abs(dx)>=Math.abs(dy);if(horizontal)v=y;else u=x;const steps=Math.max(Math.abs(u-x),Math.abs(v-y)),result=[];for(let n=0;n<=steps;n++){const xx=Math.round(x+(u-x)*(steps?n/steps:0)),yy=Math.round(y+(v-y)*(steps?n/steps:0));if(!valid(xx,yy))continue;const raw=id(xx,yy),snapped=owner(raw),point=xy(snapped),aligned=horizontal?point[1]===y:point[0]===x,p=aligned?snapped:raw;if(result[result.length-1]!==p)result.push(p);}return result;}
function checkRoad(cells,type){let cost=0;const t=ROADS[type];if(!cells.length)return{error:'เลือกตำแหน่งถนนบนแผนที่'};const centerline=new Set(cells);for(const i of cells)if(!state.roads.has(i)&&state.footprint[i]>=0&&!centerline.has(state.footprint[i]))return{error:'แนวถนนซ้อนขอบถนนเดิม ลากให้เชื่อมตรงกลางหรือขยับแนวถนนค่ะ'};for(const i of cells){const [x,y]=xy(i),r=state.roads.get(i),w=Math.max(t.width,r?ROADS[r.type].width:0),lo=Math.floor(w/2);for(let yy=y-lo;yy<y+w-lo;yy++)for(let xx=x-lo;xx<x+w-lo;xx++){if(!valid(xx,yy))continue;if(state.buildGrid[id(xx,yy)]>=0)return{error:'ถนนทับพื้นที่อาคาร เลือกแนวถนนใหม่ค่ะ'};}cost+=r?Math.max(0,t.cost-ROADS[r.type].cost):t.cost;}
const adds=new Map();for(let k=1;k<cells.length;k++){const a=cells[k-1],b=cells[k];if(a===b)continue;const pa=xy(a),pb=xy(b);if(pa[0]!==pb[0]&&pa[1]!==pb[1])return{error:'แนวถนนต้องตรงเข้าจุดเชื่อม ลองลากจากกลางถนนเดิมค่ะ'};for(const[p,q]of[[a,b],[b,a]]){if(!adds.has(p))adds.set(p,new Set(state.roads.get(p)?.links||[]));adds.get(p).add(q);if(adds.get(p).size>4)return{error:'จุดเชื่อมนี้มีถนนเกิน 4 แขนง ลองขยับแนวถนนค่ะ'};}}
if(state.money<0||state.money-cost< -10000)return{error:'งบประมาณไม่พอ ลองถนนสั้นลงหรือรอรายรับวันถัดไปค่ะ'};return{cost};}
function buildRoad(cells,type,confirmed=false){const check=checkRoad(cells,type);if(check.error){toast(check.error);return false;}if(!confirmed){confirmAction('สร้าง'+ROADS[type].name,`ความยาว ${cells.length} ช่อง · ${ROADS[type].lanes} เลน<br>ค่าก่อสร้าง ${money(check.cost)}<br>อาคารจะวางทับพื้นที่ถนนไม่ได้`,()=>buildRoad(cells,type,true));return;}const changed=[];for(const i of cells){const r=state.roads.get(i);if(!r){state.roads.set(i,{type,main:false,links:new Set(),load:0,wait:0});changed.push(i);}else if(ROADS[type].lanes>ROADS[r.type].lanes){r.type=type;changed.push(i);}}for(let k=1;k<cells.length;k++)link(cells[k-1],cells[k]);state.money-=check.cost;roadChanged(changed);toast('สร้างถนนแล้ว · '+money(check.cost));updateUI();return true;}
function roadChanged(cells){state.version++;state.routeCache.clear();state.junctionCache.clear();state.junctionLayoutCache?.clear();for(const node of state.signals.keys())if(junction(node)<3)state.signals.delete(node);rebuildFootprint();for(const b of state.buildings.values())b.access=accessFor(b);let budget=2;
 for(const v of state.vehicles.values()){if(['departing','gate_waiting'].includes(v.phase)){v.retryAt=0;continue;}if(v.phase==='parking_in'||v.phase==='parking_out')continue;if(v.phase!=='stuck'&&!remainingRouteValid(v))strandVehicle(v,'เส้นทางเดิมขาด');if(v.phase==='stuck'){v.nextRouteRetry=state.time;if(budget-->0)recoverVehicle(v,true);}}
 for(const c of state.citizens.values())if(c.pending)c.pending.next=state.time+.5;
}
function checkBuilding(key,x,y){return checkParkingBuilding(key,x,y);}
function buildBuilding(key,x,y,confirmed=false){const check=checkBuilding(key,x,y),t=CATALOG[key];if(check.error){toast(check.error);return false;}if(!confirmed){confirmAction('สร้าง'+t.name,`ค่าก่อสร้าง ${money(t.cost)} · ค่าดูแล ${money(t.maint)} / วัน<br>พื้นที่รวมลานจอด ${check.bounds.w} × ${check.bounds.h} ช่อง · ที่จอด ${t.parkingCapacity} คัน<br>${t.beds?'รองรับผู้พัก '+t.beds+' คน':t.residents?'รองรับผู้อยู่อาศัย '+t.residents+' คน':t.jobs+' ตำแหน่งงาน'+(t.service?' · บริการ '+t.service+' คน':'')}`,()=>buildBuilding(key,x,y,true));return;}const b={id:state.nextId++,key,x,y,rotation:check.rotation,compactLotV2:!!t.dualParking,compactLotV3:!!t.dualParking,parkingSlots:Array(t.parkingCapacity).fill(null),access:check.access,residents:new Set(),workers:new Set(),visitors:new Set(),guests:new Set(),parked:new Set(),reservedResidents:0,reservedService:0,queue:[],arrivals:0};state.buildings.set(b.id,b);markBuildingPlot(b,b.id);state.money-=t.cost;for(const c of state.citizens.values()){if(c.resident)assignJob(c);if(c.pending)c.pending.next=state.time+.5;}addNews('เปิด'+t.name+'ใหม่'+(t.jobs?' · เพิ่ม '+t.jobs+' งาน':''));toast('สร้าง'+t.name+'แล้ว');updateUI();return b;}
function demolishBuilding(b,confirmed=false){if(!b)return;const t=CATALOG[b.key],fee=t.cost*.1;if(!confirmed){confirmAction('รื้อ'+t.name,`ค่ารื้อ ${money(fee)}<br>${t.residents?'ผู้อยู่อาศัยในบ้านนี้จะออกจากเมือง':'พนักงานต้องหางานใหม่ ผู้ที่กำลังเดินทางมาอาคารนี้จะกลับบ้าน'}`,()=>demolishBuilding(b,true));return;}if(state.money-fee< -10000){toast('งบประมาณไม่พอสำหรับค่ารื้อค่ะ');return;}prepareTouristDemolition(b);if(t.residents)for(const c of [...state.citizens.values()])if(c.homeId===b.id)removeCitizen(c);for(const v of [...state.vehicles.values()])if(v.fromId===b.id||v.toId===b.id){const c=state.citizens.get(v.citizenId);if(c?.tourist)continue;cancelVehicle(v);if(c){c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);}}for(const c of state.citizens.values()){if(c.tourist)continue;if(c.workId===b.id)c.workId=null;if(c.locationId===b.id){c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);}}
markBuildingPlot(b,-1);state.buildings.delete(b.id);state.money-=fee;for(const c of state.citizens.values())assignJob(c);reconcile();selected=null;$('inspector').classList.add('hidden');toast('รื้ออาคารแล้ว');updateUI();}
function demolishRoad(i,confirmed=false){const r=state.roads.get(i);if(!r){toast('เลือกช่องที่มีถนนค่ะ');return;}if(r.main){toast('ถนนหลักเริ่มต้นรื้อไม่ได้ค่ะ');return;}if(occupancy(i)>0||[...state.vehicles.values()].some(v=>v.path?.[v.pos]===i&&['driving','stuck','parking_in','parking_out'].includes(v.phase))){toast('มีรถอยู่บนถนน รอให้รถผ่านก่อนค่ะ');return;}const fee=ROADS[r.type].cost*.2;if(!confirmed){confirmAction('รื้อถนน',`ค่ารื้อ ${money(fee)} · ถนนที่ขาดอาจทำให้อาคารเข้าออกไม่ได้`,()=>demolishRoad(i,true));return;}if(state.money-fee< -10000){toast('งบประมาณไม่พอสำหรับค่ารื้อค่ะ');return;}for(const n of r.links)state.roads.get(n)?.links.delete(i);state.roads.delete(i);state.money-=fee;roadChanged([i]);updateUI();}
function confirmAction(title,body,callback){modal(`<span class="eyebrow">CITY PLANNING</span><h2>${title}</h2><p>${body}</p><div class="actions"><button id="cancelDialog">ยกเลิก</button><button id="confirmDialog" class="primary">ยืนยัน</button></div>`);$('cancelDialog').onclick=closeModal;$('confirmDialog').onclick=()=>{closeModal();callback();};}
function signalHitAt(x,y){const p=world(x,y),centerX=Math.round(p[0]-(renderer3d?0:.5)),centerY=Math.round(p[1]-(renderer3d?0:.5));let best=22,result=null;for(let yy=centerY-3;yy<=centerY+3;yy++)for(let xx=centerX-3;xx<=centerX+3;xx++){if(!valid(xx,yy))continue;const node=id(xx,yy);if(junction(node)<3)continue;const v=screen(xx+(renderer3d?0:.5),yy+(renderer3d?0:.5),renderer3d?.2:0),dist=Math.hypot(v[0]-x,v[1]-y);if(dist<best){best=dist;result=node;}}return result;}
function inspectAt(x,y){const signal=tool==='tracking'?null:signalHitAt(x,y);if(signal!=null){selected={kind:'road',id:signal};renderInspector();return;}let closest=null,best=15;for(const v of state.vehicles.values()){if(!['driving','stuck','parking_in','parking_out'].includes(v.phase)&&!(v.phase==='departing'&&v.lotPath))continue;const p=vehiclePosition(v);if(!p)continue;const a=screen(p.x-(renderer3d?.5:0),p.y-(renderer3d?.5:0)),dist=Math.hypot(a[0]-x,a[1]-y);if(dist<best){best=dist;closest=v;}}if(closest){selected={kind:'vehicle',id:closest.id};renderInspector();return;}if(renderer3d){const hit=renderer3d.pickBuilding(x,y);if(hit!=null){selected={kind:'building',id:hit};renderInspector();return;}}const p=world(x,y),ix=Math.floor(p[0]),iy=Math.floor(p[1]);if(!valid(ix,iy))return;const b=state.buildGrid[id(ix,iy)];if(b>=0)selected={kind:'building',id:b};else{const i=owner(id(ix,iy));if(state.roads.has(i))selected={kind:'road',id:i};else{selected=null;$('inspector').classList.add('hidden');return;}}renderInspector();}
// Compact five-way 3D camera joystick. 3D pick/world projection already uses
// the live camera matrix, so construction and selection follow the rotated view.
const cameraDefaultAngle=Math.PI*.2,cameraDefaultElevation=Math.atan2(86,90);
let cameraJoystickHold=null;
function nudgeCamera(direction,amount=1){
 if(!renderer3d)return;
 const angle=cam.angle??cameraDefaultAngle,elevation=cam.elevation??cameraDefaultElevation;
 if(direction==='left'||direction==='right'){
  cam.angle=(angle+(direction==='left'?-1:1)*Math.PI/12*amount)%(Math.PI*2);
 }else if(direction==='up'||direction==='down'){
  cam.elevation=Math.max(Math.PI*22/180,Math.min(Math.PI*78/180,elevation+(direction==='up'?1:-1)*Math.PI/24*amount));
 }else return;
 renderer3d.updateCamera(cam);
}
function resetCameraAngle(){
 cam.angle=cameraDefaultAngle;cam.elevation=cameraDefaultElevation;
 cameraJoystickHold=null;
 if(renderer3d)renderer3d.updateCamera(cam);
}
function initCameraJoystick(){
 const joystick=$('cameraJoystick');
 if(!renderer3d){if(joystick)joystick.hidden=true;return;}
 const release=()=>{cameraJoystickHold=null;};
 document.querySelectorAll('[data-camera-direction]').forEach(button=>{
  const direction=button.dataset.cameraDirection;
  button.addEventListener('pointerdown',event=>{
   if(event.button!=null&&event.button!==0)return;
   event.preventDefault();
   cameraJoystickHold={direction,started:Date.now()};
   nudgeCamera(direction);
   button.setPointerCapture?.(event.pointerId);
  });
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
  // Keyboard activation (Enter/Space), without double-firing a pointer tap.
  button.addEventListener('click',event=>{if(event.detail===0)nudgeCamera(direction);});
 });
 document.addEventListener?.('pointerup',release);
 document.addEventListener?.('pointercancel',release);
 window.addEventListener('blur',release);
 $('resetCameraAngle').onclick=resetCameraAngle;
}
initCameraJoystick();
function frame(ts){const dt=Math.min(.08,(ts-last)/1000||0);last=ts;if(cameraJoystickHold&&Date.now()-cameraJoystickHold.started>260)nudgeCamera(cameraJoystickHold.direction,dt*3);if(!$('dialog').open&&!window.SMGameAuthLocked)tick(dt);if(follow){const v=state.vehicles.get(follow);if(v){const p=vehiclePosition(v);if(p){cam.x+=(p.x-cam.x)*.06;cam.y+=(p.y-cam.y)*.06;}}else follow=null;}draw();uiTick+=dt;if(uiTick>.75){uiTick=0;updateUI();}requestAnimationFrame(frame);}
window.addEventListener('resize',resize);
$('categories').onclick=e=>{
 const b=e.target.closest('[data-dock-group]');if(!b)return;
 const next=dockGroups.find(g=>g.key===b.dataset.dockGroup);if(!next)return;
 // Every primary category switches the in-box tool tray; never hides it.
 // Re-clicking the active icon keeps the tools visible in the same rectangle.
 if(!next.categories.includes(category))category=next.categories[0];
 dockGroup=next.key;
 // Main section changes are presentation-only, with no placement action.
 selectTool('hand');
 setDockCollapsed(false);
};
$('subcategories').onclick=e=>{
 const b=e.target.closest('[data-category]');if(!b)return;
 const next=b.dataset.category;
 const group=dockGroups.find(g=>g.categories.includes(next));
 if(!group||group.key!==dockGroup)return;
 category=next;
 if(next==='signals')selectTool('signalManage');
 else if(next==='citizens')selectTool('citizenDashboard');
 else if(next==='tourists')selectTool('touristDashboard');
 else if(next==='tracking')selectTool('tracking');
 else selectTool('hand');
};
$('tools').onclick=e=>{
 const b=e.target.closest('[data-tool]');if(!b)return;
 if(b.dataset.tool==='trafficHeat'){
  // Heatmap is a view toggle; it must not replace a construction tool in hand.
  toggleTrafficHeat();return;
 }
 // Re-clicking the active placement tool returns to the empty hand.
 if(tool===b.dataset.tool&&tool!=='hand'){cancelInteraction();return;}
 selectTool(b.dataset.tool);
};
$('toggleDock').onclick=()=>setDockCollapsed(!$('buildDock').classList.contains('is-collapsed'));
// Removing label nodes is decisive: CSS-only hiding was not reliable here.
function toggleBuildingLabels(){
 buildingLabelsVisible=!buildingLabelsVisible;
 const hidden=!buildingLabelsVisible;
 const button=$('toggleBuildingLabels');
 button.classList.toggle('is-hidden',hidden);
 button.setAttribute('aria-pressed',String(hidden));
 button.setAttribute('aria-label',hidden?'เปิดป้ายอาคารบนแผนที่':'ปิดป้ายอาคารบนแผนที่');
 button.title=hidden?'แสดงชื่อและตัวเลขอาคารอีกครั้ง':'ซ่อนชื่อและตัวเลขบนป้ายอาคาร';
 $('toggleBuildingLabelsText').textContent=hidden?'เปิดป้าย':'ปิดป้าย';
 if(hidden){
  // Physically remove all building overlays, not just individual hidden flags.
  // Keep the separate red no-route warnings untouched.
  for(const label of placeLabels.values())label.element.remove();
  placeLabels.clear();
  if(placeLabelLayer)for(const node of placeLabelLayer.querySelectorAll('.place-building-label'))node.remove();
 }else{
  placeLabelAt=0;
  updatePlaceLabels();
 }
 document.documentElement?.classList.toggle('building-labels-off',hidden);
}
$('toggleBuildingLabels').onclick=toggleBuildingLabels;

$('exploreCity').onclick=()=>{
 // One-tap touch-safe escape from every construction, demolition and tracking
 // state. Clear any active drag/preview; no building or vehicle is modified.
 cancelInteraction();
 category='roads';dockGroup='build';
 selectTool('hand');
 setDockCollapsed(false);
};

$('closeTouristsDashboard').onclick=()=>{category='roads';dockGroup='roads';selectTool('hand');};
$('touristSearch').oninput=e=>{touristSearch=e.target.value.slice(0,80);touristPage=0;renderTouristDashboard(true);};
$('touristsDashboardBody').onclick=e=>{const person=e.target.closest('[data-tourist-id]');if(person){hideTouristDashboard();selected={kind:'citizen',id:Number(person.dataset.touristId)};renderInspector(true);}else if(e.target.closest('[data-tourist-more]')){touristPage++;renderTouristDashboard(true);}};
$('closeCitizensDashboard').onclick=()=>{category='roads';dockGroup='roads';selectTool('hand');};
$('citizenSearch').oninput=e=>{citizenSearch=e.target.value.slice(0,80);citizenPage=0;renderCitizenDashboard(true);};
$('citizenFilters').onclick=e=>{const b=e.target.closest('[data-citizen-filter]');if(b){citizenFilter=b.dataset.citizenFilter;citizenPage=0;renderCitizenDashboard(true);}};
$('citizensDashboardBody').onclick=e=>{
 const person=e.target.closest('[data-citizen-id]');
 if(person){const id=Number(person.dataset.citizenId);if(state.citizens.has(id)){hideCitizenDashboard();selected={kind:'citizen',id};renderInspector(true);}return;}
 if(e.target.closest('[data-citizen-more]')){citizenPage++;renderCitizenDashboard(true);}
};$('pause').onclick=()=>{state.speed=state.speed?0:1;updateUI();};document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=+b.dataset.speed;updateUI();});$('collapse').onclick=()=>{document.querySelector('.city-panel').classList.toggle('collapsed');$('collapse').textContent=document.querySelector('.city-panel').classList.contains('collapsed')?'+':'−';};$('closeInspector').onclick=()=>{selected=null;$('inspector').classList.add('hidden');follow=null;};document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{selected={kind:b.dataset.inspect};renderInspector();});
let pointers=new Map(),pinch=null,pendingTap=null,lastTap=null;
const ignoredTouchPointers=new Set(),doubleTapDelay=320,doubleTapRadius=44;
function clearPendingTap(perform=false){if(!pendingTap)return;clearTimeout(pendingTap.timer);const action=pendingTap.action;pendingTap=null;lastTap=null;if(perform)action();}
function cancelInteraction(){clearPendingTap();for(const pointerId of pointers.keys())if(canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);pointers.clear();pinch=null;drag=null;hover=null;selected=null;follow=null;selectTool('hand');$('inspector').classList.add('hidden');}
canvas.addEventListener('mousedown',e=>{if(e.button===2){e.preventDefault();cancelInteraction();}});
canvas.addEventListener('pointerdown',e=>{
 if(e.button===2){e.preventDefault();cancelInteraction();return;}
 if(e.pointerType==='touch'&&pendingTap){
  const doubleTap=lastTap&&Date.now()-lastTap.at<=doubleTapDelay&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<=doubleTapRadius;
  if(doubleTap){e.preventDefault();cancelInteraction();ignoredTouchPointers.add(e.pointerId);return;}
  clearPendingTap(true);
 }
 canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:cam.z};drag=null;return;}
 const p=world(e.clientX,e.clientY),x=Math.floor(p[0]),y=Math.floor(p[1]);
 drag={sx:e.clientX,sy:e.clientY,lastX:e.clientX,lastY:e.clientY,x,y,pan:tool==='hand'||tool==='tracking'||tool==='signalManage'||tool==='citizenDashboard'||e.button===1||e.shiftKey,moved:false,cells:valid(x,y)?[owner(id(x,y))]:[]};
});
canvas.addEventListener('pointermove',e=>{const p=world(e.clientX,e.clientY);hover={x:Math.floor(p[0]),y:Math.floor(p[1])};if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const a=[...pointers.values()];cam.z=Math.max(.22,Math.min(5.2,pinch.z*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/pinch.distance));return;}if(!drag)return;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>(e.pointerType==='touch'?10:5))drag.moved=true;if(drag.pan){if(renderer3d){const a=world(drag.lastX,drag.lastY),b=world(e.clientX,e.clientY);cam.x-=b[0]-a[0];cam.y-=b[1]-a[1];renderer3d.updateCamera(cam);}else{cam.x-=(e.clientX-drag.lastX)/(T*cam.z);cam.y-=(e.clientY-drag.lastY)/(T*cam.z*.78);}cam.x=Math.max(-20,Math.min(320,cam.x));cam.y=Math.max(-20,Math.min(320,cam.y));follow=null;}else if(ROADS[tool]&&valid(drag.x,drag.y)&&valid(hover.x,hover.y))drag.cells=lineCells(owner(id(drag.x,drag.y)),owner(id(hover.x,hover.y)));drag.lastX=e.clientX;drag.lastY=e.clientY;});
function finishCanvasInteraction(d,x,y,activeTool){
 if(tool!==activeTool)return;
 if(d.pan){if(!d.moved)inspectAt(x,y);return;}
 if(ROADS[tool])buildRoad(d.cells,tool);
 else if(tool.startsWith('tree:')||tool==='treeRow'||tool==='treeBrush'||tool==='eraseTree'){
  const p=world(x,y);let count=0;
  if(tool==='eraseTree'){toast(eraseLandscape(p[0],p[1])?'ลบต้นไม้แล้วค่ะ':'ไม่พบต้นไม้ที่ต้องลบค่ะ');return;}
  if(tool==='treeRow')count=plantLandscapeStroke(d,x,y,2.8);
  else if(tool==='treeBrush')count=plantLandscapeStroke(d,x,y,1.1);
  else count=plantLandscape(p[0],p[1],tool.slice(5))?1:0;
  toast(count?'ปลูกต้นไม้ '+count+' ต้นแล้วค่ะ':'พื้นที่นี้ปลูกต้นไม้ไม่ได้ค่ะ');return;
 }
 else if(CATALOG[tool]){const p=world(x,y);buildBuilding(tool,Math.floor(p[0]),Math.floor(p[1]));}
 else{const p=world(x,y),ix=Math.floor(p[0]),iy=Math.floor(p[1]);if(!valid(ix,iy))return;if(tool==='eraseRoad')demolishRoad(owner(id(ix,iy)));if(tool==='eraseBuilding')demolishBuilding(state.buildings.get(state.buildGrid[id(ix,iy)]));}
}
canvas.addEventListener('pointerup',e=>{
 pointers.delete(e.pointerId);if(ignoredTouchPointers.delete(e.pointerId))return;
 if(pinch){if(pointers.size===0)pinch=null;drag=null;return;}
 if(!drag)return;
 const d=drag,activeTool=tool,x=e.clientX,y=e.clientY;drag=null;
 const action=()=>finishCanvasInteraction(d,x,y,activeTool);
 // Delay only stationary touch taps so the second tap can cancel BEFORE a
 // building/road/demolition confirmation opens. Drags and mouse input stay instant.
 if(e.pointerType==='touch'&&!d.moved){lastTap={x,y,at:Date.now()};pendingTap={action,timer:setTimeout(()=>{pendingTap=null;lastTap=null;action();},doubleTapDelay)};return;}
 action();
});
canvas.addEventListener('pointercancel',e=>{ignoredTouchPointers.delete(e.pointerId);pointers.delete(e.pointerId);drag=null;pinch=null;});canvas.addEventListener('contextmenu',e=>{e.preventDefault();cancelInteraction();});canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();const before=world(e.clientX,e.clientY);cam.z=Math.max(.22,Math.min(5.2,cam.z*(e.deltaY<0?1.12:.89)));if(renderer3d)renderer3d.updateCamera(cam);const after=world(e.clientX,e.clientY);cam.x+=before[0]-after[0];cam.y+=before[1]-after[1];},{passive:false});
window.addEventListener('keydown',e=>{if($('dialog').open)return;if(e.key==='Escape'){cancelInteraction();return;}if(e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='Space'){e.preventDefault();state.speed=state.speed?0:1;updateUI();}if(['1','2','5'].includes(e.key)){state.speed=+e.key;updateUI();}if(e.key.toLowerCase()==='h')toggleTrafficHeat();if(e.key.toLowerCase()==='b'){category='roads';selectTool('small');}if(e.key.toLowerCase()==='s'&&(e.ctrlKey||e.metaKey)){e.preventDefault();openCloudSaveDialog();}});
$('inspectContent').onclick=e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,v=+b.dataset.value;
 if(a==='signal-defaults-reset'){
  if(selected?.kind!=='signals')return;const count=restoreRecommendedSignals();
  toast('คืนค่าแนะนำแล้ว '+count+' แยก · กลับสู่ไฟอัตโนมัติทั้งหมด');renderInspector(true);return;
 }
 if(a==='signal-defaults-save'||a==='signal-defaults-apply'){
  if(selected?.kind!=='signals')return;const rawEW=String($('signalDefaultEW').value).trim(),rawNS=String($('signalDefaultNS').value).trim();
  if(!rawEW||!rawNS||!setSignalDefaults(Number(rawEW),Number(rawNS),a==='signal-defaults-apply')){toast('เวลาไฟเขียวต้องเป็นจำนวนเต็ม 5–240 นาทีค่ะ');return;}
  toast(a==='signal-defaults-apply'?'ปรับเวลาไฟเขียวทุกแยกแล้วค่ะ':'บันทึกค่าเริ่มต้นสำหรับแยกใหม่แล้วค่ะ');renderInspector(true);return;
 }
 if(a==='signal-global'){selected={kind:'signals'};renderInspector(true);return;}
 if(a.startsWith('signal-')){if(selected?.kind!=='road'||selected.id!==v)return;if(a==='signal-save'){const rawEW=String($('signalEW').value).trim(),rawNS=String($('signalNS').value).trim(),eastWest=Number(rawEW),northSouth=Number(rawNS);if(!rawEW||!rawNS||!editSignal(v,{eastWest,northSouth})){toast('ตั้งเวลาไฟเขียวฝั่งละ 5–240 นาที (จำนวนเต็ม) ค่ะ');return;}toast('บันทึกเวลาไฟแยกนี้แล้วค่ะ');}else{const key=a==='signal-manual'?'manual':a==='signal-switch'?'switch':a==='signal-auto'?'auto':'';if(!controlSignal(v,key))return;toast(key==='manual'?'เปิดโหมดควบคุมไฟเองแล้วค่ะ':key==='switch'?'สลับไฟแล้ว · รอแดงทุกทิศ '+SIGNAL_CLEAR_MINUTES+' นาที':'กลับสู่ไฟอัตโนมัติแล้วค่ะ');}renderInspector(true);return;}
 if(a==='tow'){if(towVehicle(v)){selected=null;$('inspector').classList.add('hidden');toast('ลากรถออกแล้ว · ยกเลิกเที่ยวเดินทาง');updateUI();}}if(a==='reroute'){const car=state.vehicles.get(v),ok=car?.phase==='stuck'?recoverVehicle(car,true):car?checkDepartureRoute(car):false;toast(ok?'พบเส้นทางแล้ว จะออกเดินทางเมื่อถนนว่าง':'ยังไม่มีเส้นทางที่ไปต่อได้ค่ะ');renderInspector();}if(a==='citizen'){selected={kind:'citizen',id:v};renderInspector();}if(a==='tourist-dashboard'){category='tourists';selectTool('touristDashboard');return;}if(a==='follow'){follow=follow===v?null:v;renderInspector();}if(a==='demolish')demolishBuilding(state.buildings.get(v));if(a==='heat')toggleTrafficHeat();};
$('help').onclick=()=>{modal('<span class="eyebrow">WELCOME, CITY MAKER</span><h2>ทุกคันมีชีวิต<br>ทุกถนนมีความหมาย</h2><p>เริ่มด้วยงบ 500,000 บาท และถนนหลัก 8 เลนที่ไม่เสียค่าดูแล เมืองจะเติบโตจากการเดินทางที่คุณออกแบบ</p><ol><li>เลือก <b>ถนนเล็ก</b> แล้วลากจากถนนหลักออกไป</li><li>เลือก <b>บ้าน</b> วางชิดขอบถนน คนจะขับรถจากประตูเมืองเข้ามา</li><li>สร้าง <b>สำนักงานหรือโรงงาน</b> ให้คนมีงาน ก่อนเพิ่มร้านค้าและสวน</li><li>คลิกรถเพื่อดูต้นทาง ปลายทาง และปัญหา เปิดแผนที่รถติดเพื่อหาจุดคอขวด</li><li>คลิก <b>ทางแยกไฟแดง</b> เพื่อตั้งเวลาของแยกนั้น หรือเลือกควบคุมไฟเองและกดสลับฝั่งที่ได้ไฟเขียว</li></ol><p>ลากเพื่อเลื่อน · เลื่อนล้อหรือใช้สองนิ้วเพื่อซูม<br>Space หยุดเวลา · B สร้างถนน · Esc สำรวจเมือง<br>รถขับชิดซ้าย อาคารฝั่งตรงข้ามต้องมีทางวนกลับ</p><div class="actions"><button class="primary" id="helpDone">เริ่มสร้างเมือง</button></div>');$('helpDone').onclick=closeModal;};
function snapshot(){return JSON.stringify({format:2,parkingVersion:PARKING_VERSION,city:state.city,money:state.money,time:state.time,nextId:state.nextId,profileSeq:state.profileSeq,tourism:state.tourism,plantedTrees:state.plantedTrees,hiddenAutoTrees:state.hiddenAutoTrees,nextTouristAt:state.nextTouristAt,roads:[...state.roads].map(([i,r])=>[i,{...r,links:[...r.links]}]),buildings:[...state.buildings].map(([i,b])=>[i,{...b,residents:[...b.residents],workers:[...b.workers],visitors:[...b.visitors],parked:[...b.parked],guests:[...(b.guests||[])]}]),citizens:[...state.citizens].map(([i,c])=>[i,{...c,scheduled:[...c.scheduled],failKinds:[...c.failKinds]}]),vehicles:[...state.vehicles].map(([i,v])=>[i,{...v,pathSet:[...v.pathSet]}]),signals:[...state.signals],signalDefaults:state.signalDefaults,events:state.events,cam,news});}
const SAVE_KEY='traffic-fixer-thailand-saves-v2',LEGACY_SAVE_KEY='traffic-fixer-thailand-v1';
const escapeSaveText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readLocalSaveSlots(){
 const raw=localStorage.getItem(SAVE_KEY);let slots=[];
 if(raw!==null&&raw!==undefined){const store=JSON.parse(raw);if(store.format!==2||!Array.isArray(store.slots))throw Error('Invalid save collection');slots=store.slots;if(slots.some(s=>!s||typeof s.id!=='string'||typeof s.name!=='string'||typeof s.data!=='string')||new Set(slots.map(s=>s.id)).size!==slots.length)throw Error('Invalid save slots');}
 const legacy=localStorage.getItem(LEGACY_SAVE_KEY);
 if(legacy&&!slots.some(s=>s.id==='legacy'))slots.push({id:'legacy',name:'เซฟเดิม',savedAt:null,data:legacy});
 return slots.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
}
let saveDBPromise=null,durableSlots=[],durableSlotsReady=false;
function openSaveDB(){
 if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDBUnavailable'));
 if(!saveDBPromise)saveDBPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('traffic-fixer-thailand',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('saves'))request.result.createObjectStore('saves',{keyPath:'id'});};request.onerror=()=>reject(request.error||new Error('DatabaseOpenFailed'));request.onblocked=()=>reject(new Error('DatabaseBlocked'));request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();saveDBPromise=null;};resolve(db);};}).catch(e=>{saveDBPromise=null;throw e;});
 return saveDBPromise;
}
function saveDBOperation(db,mode,record){return new Promise((resolve,reject)=>{const tx=db.transaction('saves',mode),store=tx.objectStore('saves');let value;const request=record?store.put(record):store.getAll();request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||request.error||new Error('DatabaseWriteFailed'));});}
function readSaveSlots(){let local=[];try{local=readLocalSaveSlots();}catch(e){if(!durableSlotsReady)throw e;console.warn('Legacy saves unavailable:',e);}const merged=new Map(local.map(s=>[s.id,s]));for(const slot of durableSlots){const old=merged.get(slot.id);if(!old||(slot.savedAt||0)>=(old.savedAt||0))merged.set(slot.id,slot);}return [...merged.values()].sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));}
async function readDurableSaveSlots(){try{const db=await openSaveDB();durableSlots=await saveDBOperation(db,'readonly');durableSlotsReady=true;}catch(e){console.warn('Save database unavailable:',e);return readSaveSlots();}return readSaveSlots();}
function saveFailureMessage(error){const code=error?.name||'Error',message=error?.message||'Unknown';if(code==='QuotaExceededError')return 'พื้นที่บันทึกในเบราว์เซอร์เต็มค่ะ ('+code+')';if(code==='SecurityError'||code==='NotAllowedError')return 'เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูลเว็บไซต์ค่ะ ('+code+')';return 'บันทึกไม่สำเร็จ: '+code+' · '+message;}
async function saveDurableGame(name,slotId){
 const clean=String(name).trim().slice(0,80);if(!clean)throw Error('กรุณาใส่ชื่อเซฟ');
 const record={id:slotId,name:clean,savedAt:Date.now(),data:snapshot()};
 try{const db=await openSaveDB();await saveDBOperation(db,'readwrite',record);durableSlots=durableSlots.filter(s=>s.id!==slotId);durableSlots.push(record);durableSlotsReady=true;}
 catch(databaseError){try{const slots=readLocalSaveSlots(),index=slots.findIndex(s=>s.id===slotId);if(index<0)slots.push(record);else slots[index]=record;const raw=JSON.stringify({format:2,slots});localStorage.setItem(SAVE_KEY,raw);if(localStorage.getItem(SAVE_KEY)!==raw)throw Error('Save verification failed');}catch(localError){console.error('Save database failed:',databaseError,'Local save failed:',localError);throw localError;}}
 return record;
}
async function commitDialogSave(name,slotId,button){const error=$('saveError');error.textContent='กำลังบันทึก…';button.disabled=true;try{await saveDurableGame(name,slotId);closeModal();toast('บันทึก “'+String(name).trim().slice(0,80)+'” แล้วค่ะ');}catch(e){error.textContent=saveFailureMessage(e);console.error('Save failed:',e);}finally{button.disabled=false;}}
function saveGame(silent=false,name='บันทึกด่วน',slotId='quick'){
 try{const slots=readSaveSlots(),clean=String(name).trim().slice(0,80);if(!clean)throw Error('Missing name');const record={id:slotId,name:clean,savedAt:Date.now(),data:snapshot()},index=slots.findIndex(s=>s.id===slotId);if(index<0)slots.push(record);else slots[index]=record;const raw=JSON.stringify({format:2,slots});localStorage.setItem(SAVE_KEY,raw);if(localStorage.getItem(SAVE_KEY)!==raw)throw Error('Save verification failed');if(!silent)toast('บันทึก “'+clean+'” แล้วค่ะ');return true;}catch(e){console.error('Save failed:',e);if(!silent)toast('บันทึกไม่สำเร็จ เบราว์เซอร์อาจไม่อนุญาตหรือพื้นที่เต็มค่ะ');return false;}
}
function validateSave(s){
 if(!s||s.format!==2||s.parkingVersion!==PARKING_VERSION)throw Error('เมืองนี้เป็นระบบลานจอดรุ่นเก่า กรุณาเริ่มเมืองใหม่');
 if(!CITIES[s.city]||!Number.isFinite(s.time)||!Number.isFinite(s.money)||!Number.isInteger(s.nextId)||!Array.isArray(s.events))throw Error('Invalid save');
 if(s.signalDefaults!==undefined){const d=s.signalDefaults;if(!d||!Number.isInteger(d.eastWest)||d.eastWest<SIGNAL_MIN_GREEN||d.eastWest>SIGNAL_MAX_GREEN||!Number.isInteger(d.northSouth)||d.northSouth<SIGNAL_MIN_GREEN||d.northSouth>SIGNAL_MAX_GREEN)throw Error('Invalid default signal setting');}
 if(s.plantedTrees!==undefined&&(!Array.isArray(s.plantedTrees)||s.plantedTrees.length>4000||s.plantedTrees.some(t=>!t||!Number.isFinite(t.x)||!Number.isFinite(t.y)||!valid(Math.floor(t.x),Math.floor(t.y))||!TREE_KINDS.some(k=>k.key===t.kind))))throw Error('Invalid planted trees');
 if(s.hiddenAutoTrees!==undefined&&(!Array.isArray(s.hiddenAutoTrees)||s.hiddenAutoTrees.length>6000||s.hiddenAutoTrees.some(i=>!Number.isInteger(i)||i<0||i>=W*H)))throw Error('Invalid tree clearings');
 for(const key of ['roads','buildings','citizens','vehicles'])if(!Array.isArray(s[key])||s[key].some(e=>!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||!e[1])||new Set(s[key].map(e=>e[0])).size!==s[key].length)throw Error('Invalid '+key);
 for(const [i,r]of s.roads)if(i<0||i>=W*H||!ROADS[r.type]||!Array.isArray(r.links)||r.links.some(n=>!Number.isInteger(n)||n<0||n>=W*H))throw Error('Invalid road');
 if(s.signals!==undefined){if(!Array.isArray(s.signals)||s.signals.length>s.roads.length||new Set(s.signals.map(e=>e?.[0])).size!==s.signals.length)throw Error('Invalid signals');const roads=new Set(s.roads.map(e=>e[0]));for(const e of s.signals){if(!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||!roads.has(e[0]))throw Error('Invalid signal node');const c=e[1];if(!c||!Number.isInteger(c.eastWest)||c.eastWest<SIGNAL_MIN_GREEN||c.eastWest>SIGNAL_MAX_GREEN||!Number.isInteger(c.northSouth)||c.northSouth<SIGNAL_MIN_GREEN||c.northSouth>SIGNAL_MAX_GREEN||!['auto','manual'].includes(c.mode)||![0,1].includes(c.axis)||!Number.isFinite(c.holdUntil))throw Error('Invalid signal setting');}}
 for(const [,b]of s.buildings)if(!CATALOG[b.key]||!Number.isInteger(b.x)||!Number.isInteger(b.y)||!valid(b.x,b.y)||!valid(b.x+buildingBounds(b).w-1,b.y+buildingBounds(b).h-1)||!Number.isInteger(b.rotation)||b.rotation<0||b.rotation>3||!Array.isArray(b.parkingSlots)||b.parkingSlots.length!==CATALOG[b.key].parkingCapacity||['residents','workers','visitors','parked','access'].some(k=>!Array.isArray(b[k])))throw Error('Invalid building');
 for(const [,c]of s.citizens)if(!Array.isArray(c.scheduled)||!Array.isArray(c.failKinds))throw Error('Invalid citizen');
 for(const [,v]of s.vehicles)if(!Array.isArray(v.pathSet)||!Array.isArray(v.path))throw Error('Invalid vehicle');
}
// Existing medium houses were 24x15. Shift each plot *inside its original
// footprint*, toward the unchanged roadside edge, so old saves keep access.
function migrateCompactHomes(){
 // Keep the roadside front edge fixed across both prior home_dual layouts:
 // original 24x15 -> 20x11, or interim 20x8 -> 20x11.
 const moved=new Set(),newHeight=CATALOG.home_dual.plotHeight;
 for(const b of state.buildings.values()){
  if(b.key!=='home_dual'||b.compactLotV3)continue;
  const previousHeight=b.compactLotV2?8:15,delta=previousHeight-newHeight;
  if(b.rotation===0)b.y+=delta;
  if(b.rotation===3)b.x+=delta;
  b.compactLotV2=true;b.compactLotV3=true;moved.add(b.id);
 }
 if(!moved.size)return;
 for(const v of state.vehicles.values()){
  if(!moved.has(v.lotBuilding)&&!moved.has(v.fromId)&&!moved.has(v.toId))continue;
  if(moved.has(v.lotBuilding)&&v.lotPath){
   v.lotPath=null;v.lotDistance=0;v.lotReady=false;v.lotBuilding=null;
   v.mergeCommitted=false;v.mergeExitActive=false;v.mergeEscapeId=null;
   v.parkingStage=false;v.parkingReplanAt=0;v.occKey=null;v.stopReason='';
   if(v.phase==='parking_in'){v.phase='driving';v.speed=0;}
   else if(v.phase==='parking_out'){v.phase='departing';v.speed=0;v.departureRouteVersion=-1;v.retryAt=0;}
  }
  if(moved.has(v.fromId)&&v.phase==='departing'){v.departureRouteVersion=-1;v.retryAt=0;}
 }
}
function loadGame(silent=false,slotId=null,rawOverride=null){const previous={state,cam,news};try{const slots=rawOverride===null?readSaveSlots():[],slot=slotId?slots.find(s=>s.id===slotId):slots[0],raw=rawOverride??slot?.data;if(!raw){if(!silent)toast('ยังไม่มีเมืองที่บันทึกไว้ค่ะ');return false;}const s=JSON.parse(raw);validateSave(s);reset(s.city);state.money=s.money;state.time=s.time;state.nextId=s.nextId;state.profileSeq=s.profileSeq??s.citizens.length;state.lastImmigration=s.time;state.lastPass=s.time;state.tourism=s.tourism;state.plantedTrees=s.plantedTrees||[];state.hiddenAutoTrees=s.hiddenAutoTrees||[];state.landscapeVersion=0;state.nextTouristAt=s.nextTouristAt||s.time+3;state.roads=new Map(s.roads.map(([i,r])=>[i,{...r,links:new Set(r.links)}]));state.buildings=new Map(s.buildings.map(([i,b])=>[i,{...b,residents:new Set(b.residents),workers:new Set(b.workers),visitors:new Set(b.visitors),parked:new Set(b.parked),guests:new Set(b.guests||[])}]));state.citizens=new Map(s.citizens.map(([i,c])=>[i,{...c,scheduled:new Set(c.scheduled),failKinds:new Set(c.failKinds)}]));state.vehicles=new Map(s.vehicles.map(([i,v])=>[i,{...v,trafficModel:v.trafficModel??1,pathSet:new Set(v.pathSet)}]));state.signals=new Map(s.signals||[]);state.signalDefaults=s.signalDefaults||state.signalDefaults;state.events=s.events;eventHeapify();cam=s.cam||cam;news=s.news||[];migrateCompactHomes();rebuildFootprint();state.buildGrid.fill(-1);for(const b of state.buildings.values()){markBuildingPlot(b,b.id);b.access=accessFor(b);}for(const v of state.vehicles.values())if(['driving','parking_out'].includes(v.phase)||v.phase==='parking_in'&&v.occKey)occupy(v,v.pos);for(const v of state.vehicles.values())if(v.phase==='driving')refreshMotionReservations(v,motionPlan(v),motionDistance(v));reconcile();
 // Existing saves still work: retain the current day's already-queued events,
 // then switch to dynamic routines when the next game day is scheduled.
 for(const c of state.citizens.values()){
  if(c.tourist)continue;
  if(!c.profile)c.profile=profile(c.id);
  ensureRoutine(c);
  if(!c.dailyPlan||!Number.isFinite(c.dailyPlan.day))c.dailyPlan=planForDay(c,Math.floor(state.time/1440));
 }
 state.speed=0;updateUI();if(!silent)toast('โหลดเมืองพร้อมลานจอดแล้ว กด ▶ เพื่อเล่นต่อค่ะ');return true;}catch(e){state=previous.state;cam=previous.cam;news=previous.news;console.error('Load failed:',e);$('cityName').textContent=CITIES[state.city].name;$('citySub').textContent=CITIES[state.city].sub;$('mapLabel').innerHTML=CITIES[state.city].en+'<small>THAILAND · สร้างเมืองในแบบคุณ</small>';updateUI();if(!silent)toast(e.message?.includes('ลานจอดรุ่นเก่า')?'เมืองเก่าใช้กับลานจอดระบบใหม่ไม่ได้ กรุณาเริ่มเมืองใหม่ค่ะ':'โหลดเซฟนี้ไม่ได้ เมืองปัจจุบันและข้อมูลเซฟยังอยู่ค่ะ');return false;}}
function saveSlotSummary(slot){try{const s=JSON.parse(slot.data);return escapeSaveText(CITIES[s.city]?.name||'เมือง')+' · อาคาร '+(s.buildings?.length||0)+' แห่ง · '+(slot.savedAt?escapeSaveText(new Date(slot.savedAt).toLocaleString('th-TH')):'บันทึกจากเวอร์ชันเดิม');}catch{return 'ข้อมูลเซฟอ่านไม่ได้';}}
function saveSlotRows(slots,mode){return slots.map((slot,i)=>`<div style="padding:10px 0;border-bottom:1px solid #dce4de"><strong style="overflow-wrap:anywhere">${escapeSaveText(slot.name)}</strong><p style="margin:4px 0">${saveSlotSummary(slot)}</p><div class="actions"><button id="slotAction${i}">${mode==='save'?'เขียนทับเซฟนี้':'โหลดเซฟนี้'}</button></div></div>`).join('');}
async function openSaveDialog(){
 let slots;try{slots=await readDurableSaveSlots();}catch{toast('อ่านรายการเซฟไม่ได้ ข้อมูลเดิมยังเก็บอยู่ค่ะ');return;}
 modal(`<span class="eyebrow">SAVE CITY</span><h2>บันทึกเมือง</h2><label for="saveName">ชื่อเซฟ</label><input id="saveName" maxlength="80" autocomplete="off" style="display:block;box-sizing:border-box;width:100%;margin:8px 0" value="${escapeSaveText(CITIES[state.city].name+' วันที่ '+(Math.floor(state.time/1440)+1))}"><p id="saveError" role="status" aria-live="polite" style="overflow-wrap:anywhere"></p><div class="actions"><button id="createSave" class="primary">บันทึกเป็นเซฟใหม่</button><button id="saveClose">กลับไปเล่น</button></div>${slots.length?'<h3>เซฟที่มีอยู่</h3>'+saveSlotRows(slots,'save'):''}`);
 $('saveClose').onclick=closeModal;
 $('createSave').onclick=()=>{const name=$('saveName').value.trim();if(!name){toast('ใส่ชื่อเซฟก่อนค่ะ');$('saveName').focus();return;}const slotId='save-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);return commitDialogSave(name,slotId,$('createSave'));};
 slots.forEach((slot,i)=>$('slotAction'+i).onclick=()=>{closeModal();confirmAction('เขียนทับ “'+escapeSaveText(slot.name)+'”','ข้อมูลในเซฟนี้จะเปลี่ยนเป็นเมืองที่กำลังเล่น',()=>{modal('<h2>บันทึกเมือง</h2><p id="saveError" role="status" aria-live="polite"></p><div class="actions"><button id="retrySave">ลองอีกครั้ง</button><button id="saveBack">กลับไปเล่น</button></div>');$('saveBack').onclick=closeModal;$('retrySave').onclick=()=>commitDialogSave(slot.name,slot.id,$('retrySave'));commitDialogSave(slot.name,slot.id,$('retrySave'));});});
}
async function openLoadDialog(){
 let slots;try{slots=await readDurableSaveSlots();}catch{toast('อ่านรายการเซฟไม่ได้ ข้อมูลเดิมยังเก็บอยู่ค่ะ');return;}
 modal(`<span class="eyebrow">LOAD CITY</span><h2>เลือกเซฟที่ต้องการโหลด</h2>${slots.length?saveSlotRows(slots,'load'):'<p>ยังไม่มีเซฟ กดบันทึกเมืองเพื่อตั้งชื่อและสร้างเซฟก่อนค่ะ</p>'}<div class="actions"><button id="loadClose">กลับไปเล่น</button></div>`);
 $('loadClose').onclick=closeModal;
 slots.forEach((slot,i)=>$('slotAction'+i).onclick=()=>{closeModal();confirmAction('โหลด “'+escapeSaveText(slot.name)+'”','เมืองที่ยังไม่ได้บันทึกจะถูกแทนที่ด้วยเซฟที่เลือก',()=>loadGame(false,slot.id));});
}
// All visible save operations use the authenticated Supabase account.
// Historic local saves are left on the device but are never read or written by the game menus.
let quickCloudSaving = false;
const quickSaveName = () => 'เซฟด่วน · '+CITIES[state.city].name;
async function quickSaveCloud(){
 const api=window.SMGameAccount;
 if(quickCloudSaving)return;
 if(!api?.user){
  if(api?.requestSaveLogin)api.requestSaveLogin(snapshot(),quickSaveName());
  else toast('ระบบสมาชิกยังไม่พร้อม กรุณาลองอีกครั้งค่ะ');
  return;
 }
 quickCloudSaving=true;
 const button=$('saveGameQuick');
 if(button)button.disabled=true;
 try {
  await api.save(quickSaveName(),'quick-save',snapshot());
  toast('บันทึกเกมออนไลน์แล้วค่ะ');
 } catch(e) {
  console.error('Quick save failed:',e);
  toast('บันทึกไม่สำเร็จ: '+(e.message||'กรุณาลองอีกครั้ง'));
 } finally {
  quickCloudSaving=false;
  if(button)button.disabled=false;
 }
}
window.SMGameOnCloudSaved=()=>toast('บันทึกเกมออนไลน์แล้วค่ะ');
async function openCloudSaveDialog(){
 const api=window.SMGameAccount;
 if(!api?.user){quickSaveCloud();return;}
 let slots;
 try{slots=await api.listSaves();}
 catch(e){console.error('Online saves:',e);toast('อ่านเซฟออนไลน์ไม่ได้ กรุณาลองอีกครั้งค่ะ');return;}
 const rows=slots.map((slot,i)=>{
  const when=Number.isFinite(slot.savedAt)?new Date(slot.savedAt).toLocaleString('th-TH'):'';
  return '<div style="padding:11px 0;border-bottom:1px solid #dce4de"><strong style="overflow-wrap:anywhere">'+escapeSaveText(slot.name)+'</strong><p style="margin:3px 0;color:#648074;font-size:12px">'+escapeSaveText(when)+'</p><div class="actions"><button id="onlineLoad'+i+'">โหลด</button><button id="onlineOverwrite'+i+'">เขียนทับ</button><button id="onlineDelete'+i+'">ลบเซฟ</button></div></div>';
 }).join('');
 modal(`<span class="eyebrow">ONLINE SAVES</span><h2>เซฟเกม</h2>
  <p>บันทึกออนไลน์ในบัญชีของคุณ และเล่นต่อบนอุปกรณ์อื่นได้ค่ะ</p>
  <label for="onlineSaveName">ชื่อเซฟ</label>
  <input id="onlineSaveName" maxlength="80" autocomplete="off" style="display:block;box-sizing:border-box;width:100%;margin:8px 0" value="${escapeSaveText(CITIES[state.city].name+' วันที่ '+(Math.floor(state.time/1440)+1))}">
  <p id="onlineSaveError" role="status" aria-live="polite" style="min-height:16px"></p>
  <div class="actions"><button id="onlineCreate" class="primary">บันทึกเป็นเซฟใหม่</button><button id="onlineClose">กลับไปเล่น</button></div>
  <h3>เซฟออนไลน์ของฉัน</h3>
  ${rows||'<p>ยังไม่มีเซฟออนไลน์ค่ะ</p>'}
  <h3>จัดการเมือง</h3>
  <select id="citySelect">${Object.entries(CITIES).map(([k,c])=>`<option value="${k}" ${k===state.city?'selected':''}>${c.name}</option>`).join('')}</select>
  <div class="actions"><button id="newCity">เริ่มเมืองใหม่</button><button id="reportMenu">ตรวจเมือง / รายงานบัค</button></div>`);
 $('onlineClose').onclick=closeModal;
 $('onlineCreate').onclick=async()=>{
  const button=$('onlineCreate'),error=$('onlineSaveError'),name=$('onlineSaveName').value.trim().slice(0,80);
  if(!name){error.textContent='กรุณาตั้งชื่อเซฟค่ะ';return;}
  button.disabled=true;error.textContent='กำลังบันทึกออนไลน์…';
  try{await api.save(name,'cloud-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),snapshot());toast('บันทึกเซฟออนไลน์แล้วค่ะ');await openCloudSaveDialog();}
  catch(e){console.error('Online save failed:',e);error.textContent='บันทึกไม่สำเร็จ: '+(e.message||'กรุณาลองใหม่');}
  finally{button.disabled=false;}
 };
 slots.forEach((slot,i)=>{
  $('onlineLoad'+i).onclick=()=>{
   confirmAction('โหลดเซฟ “'+escapeSaveText(slot.name)+'”','เมืองปัจจุบันที่ยังไม่ได้บันทึกจะถูกแทนที่',()=>{
    if(loadGame(false,null,slot.data))toast('โหลดเซฟออนไลน์แล้วค่ะ');
   });
  };
  $('onlineOverwrite'+i).onclick=()=>{
   confirmAction('เขียนทับ “'+escapeSaveText(slot.name)+'”','เซฟออนไลน์เดิมจะถูกแทนที่ด้วยเมืองที่กำลังเล่น',async()=>{
    try{await api.save(slot.name,slot.id,snapshot());toast('เขียนทับเซฟออนไลน์แล้วค่ะ');await openCloudSaveDialog();}
    catch(e){console.error('Cloud overwrite failed:',e);toast('เขียนทับเซฟออนไลน์ไม่สำเร็จค่ะ');}
   });
  };
  $('onlineDelete'+i).onclick=()=>{
   confirmAction('ลบเซฟ “'+escapeSaveText(slot.name)+'”','ลบเซฟนี้ออกจากบัญชีออนไลน์ถาวร และไม่สามารถกู้คืนจากเกมได้',async()=>{
    try{await api.deleteSave(slot.id);toast('ลบเซฟออนไลน์แล้วค่ะ');await openCloudSaveDialog();}
    catch(e){console.error('Cloud delete failed:',e);toast('ลบเซฟไม่สำเร็จ กรุณาลองใหม่ค่ะ');}
   });
  };
 });
 $('newCity').onclick=()=>{
  const key=$('citySelect').value;
  confirmAction('เริ่มเมืองใหม่','เมืองปัจจุบันที่ยังไม่ได้บันทึกจะหายไป เริ่มเมืองใหม่ด้วยเงิน 500,000 บาท',()=>reset(key));
 };
 $('reportMenu').onclick=openCityReport;
}
function openAccountDialog(){
 const api=window.SMGameAccount;
 if(!api?.user){api?.openSignIn?.();return;}
 modal(`<span class="eyebrow">MY ACCOUNT</span><h2>บัญชีผู้ใช้</h2>
 <p>อีเมล: <strong>${escapeSaveText(api.user.email||'')}</strong></p>
 <h3>เปลี่ยนรหัสผ่าน</h3>
 <label for="accountOldPassword">รหัสผ่านปัจจุบัน</label>
 <input id="accountOldPassword" type="password" autocomplete="current-password" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:9px" required>
 <label for="accountNewPassword">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
 <input id="accountNewPassword" type="password" autocomplete="new-password" minlength="8" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:9px" required>
 <label for="accountConfirmPassword">ยืนยันรหัสผ่านใหม่</label>
 <input id="accountConfirmPassword" type="password" autocomplete="new-password" minlength="8" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:9px" required>
 <p id="accountChangeNotice" role="status" aria-live="polite"></p>
 <div class="actions"><button id="accountChangePassword" class="primary">บันทึกรหัสผ่านใหม่</button><button id="accountSignOut">ออกจากระบบ</button><button id="accountClose">กลับไปเล่น</button></div>`);
 $('accountClose').onclick=closeModal;
 $('accountChangePassword').onclick=async()=>{
  const oldPw=$('accountOldPassword').value,newPw=$('accountNewPassword').value,confirm=$('accountConfirmPassword').value;
  const error=$('accountChangeNotice'),button=$('accountChangePassword');
  if(newPw.length<8){error.textContent='รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษรค่ะ';return;}
  if(newPw!==confirm){error.textContent='ยืนยันรหัสผ่านใหม่ไม่ตรงกันค่ะ';return;}
  if(newPw===oldPw){error.textContent='กรุณาตั้งรหัสผ่านใหม่ที่ต่างจากเดิมค่ะ';return;}
  button.disabled=true;error.textContent='กำลังเปลี่ยนรหัสผ่าน…';
  try{await api.changePassword(oldPw,newPw);$('accountOldPassword').value='';$('accountNewPassword').value='';$('accountConfirmPassword').value='';error.textContent='เปลี่ยนรหัสผ่านสำเร็จแล้วค่ะ';}
  catch(e){error.textContent='เปลี่ยนรหัสผ่านไม่สำเร็จ: '+(e.message||'กรุณาตรวจสอบรหัสผ่านเดิม');}
  finally{button.disabled=false;}
 };
 $('accountSignOut').onclick=()=>{
  confirmAction('ออกจากระบบ','ออกจากบัญชีโดยไม่ปิดเมืองปัจจุบัน ถ้ายังไม่เซฟออนไลน์ เมืองนี้อาจหายเมื่อปิดหน้าเว็บ',async()=>{
   try{await api.signOut();closeModal();}
   catch(e){console.error('Sign out:',e);toast('ออกจากระบบไม่สำเร็จค่ะ');}
  });
 };
}
window.SMGameAuthReset=()=>{}; // Authentication must never erase the active guest city.
function cityBugReport(){
 const reasons={},vehicles=[],issues=[];
 for(const v of state.vehicles.values()){const reason=v.phase==='stuck'?(v.stopReason||'ไม่มีเส้นทาง'):v.phase==='gate_waiting'||v.phase==='departing'?'รอออกจากอาคาร/ประตู':v.stopReason||'กำลังเดินทาง';reasons[reason]=(reasons[reason]||0)+1;
 const pose=vehiclePosition({...v,turnLanes:{...v.turnLanes}});vehicles.push({id:v.id,phase:v.phase,reason,wait:v.wait||0,speed:v.speed||0,node:v.path[v.pos],pos:v.pos,lane:v.lane,pose,nextRouteRetry:v.nextRouteRetry??null,departureNoRoute:!!v.departureNoRoute,junctionPasses:v.junctionPasses||[]});
 if(canTowVehicle(v))issues.push({id:v.id,reason,wait:v.wait||0,node:v.path[v.pos],pose});}
 issues.sort((a,b)=>Number(state.vehicles.get(b.id)?.phase==='stuck')-Number(state.vehicles.get(a.id)?.phase==='stuck')||b.wait-a.wait);
 const orphanReservations=[];for(const [key,r]of state.reservations)if((r.passes||[r]).some(p=>!state.vehicles.has(p.id)))orphanReservations.push(key);
 const brokenLinks=[];for(const [node,r]of state.roads)for(const n of r.links)if(!state.roads.get(n)?.links.has(node))brokenLinks.push([node,n]);
 return{format:'SMGame-city-bug-report',version:1,createdAt:new Date().toISOString(),build:'stranded-recovery-v3',city:state.city,time:state.time,paused:state.speed===0,speed:state.speed,summary:{roads:state.roads.size,buildings:state.buildings.size,vehicles:state.vehicles.size,reasons},issues,orphanReservations,brokenLinks,vehicles,reservations:[...state.reservations],runtimeErrors:[...runtimeErrors],save:JSON.parse(snapshot())};
}
function openCityReport(){const report=cityBugReport(),rows=Object.entries(report.summary.reasons).map(([reason,count])=>'<li>'+escapeSaveText(reason)+' · '+count+' คัน</li>').join('');
 modal('<span class="eyebrow">CITY DIAGNOSTICS</span><h2>ตรวจเมือง / รายงานบัค</h2><p>'+ (report.paused?'เมืองหยุดเวลาอยู่ กดเล่นต่อเพื่อให้รถขยับ':'เมืองกำลังเดินเวลา')+'</p><p>รถ '+report.summary.vehicles+' คัน · รอนาน/ไม่มีเส้นทาง '+report.issues.length+' คัน</p><ul>'+rows+'</ul><p>ลิงก์ถนนผิดปกติ '+report.brokenLinks.length+' · การจองรถที่หายไป '+report.orphanReservations.length+' · ข้อผิดพลาดโปรแกรม '+report.runtimeErrors.length+'</p><p>ไฟล์รายงานรวมเมือง เส้นทางรถ และเหตุผลที่หยุด แนบไฟล์นี้ให้อริสเพื่อตรวจเมืองที่มีปัญหาได้</p><div class="actions"><button id="exportCityBug" class="primary">ดาวน์โหลดรายงานเมือง</button><button id="reportClose">กลับไปเล่น</button></div>'+report.issues.slice(0,12).map((v,i)=>'<p><button id="bugCar'+i+'">ดูรถ #'+v.id+'</button> <button id="bugTow'+i+'">ลากรถออก</button> '+escapeSaveText(v.reason)+' · รอ '+Math.round(v.wait)+' นาทีในเกม</p>').join(''));
 $('reportClose').onclick=closeModal;
 $('exportCityBug').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SMGame-bug-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 report.issues.slice(0,12).forEach((v,i)=>{$('bugCar'+i).onclick=()=>{if(v.pose){cam.x=v.pose.x;cam.y=v.pose.y;follow=v.id;}selected={kind:'vehicle',id:v.id};closeModal();renderInspector();};$('bugTow'+i).onclick=()=>{if(towVehicle(v.id))toast('ลากรถออกแล้ว · ยกเลิกเที่ยวเดินทาง');openCityReport();};});
}
$('advisorNext').onclick=e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-advice-report'))openCityReport();else if(button.dataset.adviceCategory){category=button.dataset.adviceCategory;renderTools();}};
if($('accountQuick'))$('accountQuick').onclick=openAccountDialog;
if($('saveGameQuick'))$('saveGameQuick').onclick=openCloudSaveDialog;
window.SMGameOnAuthChanged=loggedIn=>{
 const account=$('accountQuick');
 if(account){
  account.classList.toggle('is-signed-in',!!loggedIn);
  account.title=loggedIn?'บัญชีผู้ใช้':'เข้าสู่ระบบ / สมัครสมาชิก';
  account.setAttribute('aria-label',account.title);
 }
};
$('menu').onclick=()=>{
 modal('<span class="eyebrow">GAME MENU</span><h2>เมนูหลัก</h2><div class="actions"><button id="accountMenu">บัญชีผู้ใช้</button><button id="saveMenu">เซฟเกม</button></div><div class="actions"><button id="menuClose">กลับไปเล่น</button></div>');
 $('menuClose').onclick=closeModal;
 $('accountMenu').onclick=openAccountDialog;
 $('saveMenu').onclick=openCloudSaveDialog;
};
$('skip').onclick=()=>confirmAction('ข้ามไปเช้าวันใหม่','สรุปการเดินทางและรายรับจนถึง 06:00 วันถัดไป ช่วงที่ข้ามจะประมาณผลการเดินทางแทนการจำลองรถทุกคัน',()=>{const target=(Math.floor(state.time/1440)+1)*1440+360;for(const v of [...state.vehicles.values()]){if(!['moveIn','pass'].includes(v.kind)&&v.wait>24){v.late=true;const c=state.citizens.get(v.citizenId);if(c){c.late=true;pain(c,3,'ล่าช้าก่อนข้ามวัน');}}arrive(v,true);}state.events=state.events.filter(e=>e.at>=target);eventHeapify();state.time=target-360;daily();state.time=target;for(const c of [...state.citizens.values()]){if(c.removed)continue;if(c.tourist){removeCitizen(c);continue;}for(const b of state.buildings.values()){b.visitors.delete(c.id);b.parked.delete(c.id);}state.buildings.get(c.homeId)?.parked.add(c.id);c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';c.queued=null;c.pending=null;c.lifeRun=null;c.activityUntil=null;c.scheduled.delete(Math.floor(target/1440));scheduleDay(c,Math.floor(target/1440));}syncParkingSlots();state.lastImmigration=target;state.lastPass=target;state.speed=1;heat=true;renderTools();addNews('ข้ามวันแบบสรุป เริ่มเช้าวันใหม่ 06:00');updateUI();toast('เช้าวันใหม่ พร้อมปรับเมืองต่อแล้วค่ะ');});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_city_status',title:'อ่านสถานะเมือง',description:'อ่านงบประมาณ ประชากร ความสุข จราจร และความต้องการของเมืองที่กำลังเล่น',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||Object.keys(input).length)throw Error('Expected empty object');return{city:CITIES[state.city].name,time:timeText(state.time),money:state.money,...computeStats()};}})).catch(()=>{});}catch{}}
// Read-only diagnostics and exact game actions are exposed only in the local test harness.
if(typeof window.__TRAFFIC_TEST_HARNESS__==='function')window.__TRAFFIC_TEST_HARNESS__({get state(){return state;},get cam(){return cam;},nudgeCamera,resetCameraAngle,TOURISM,tourismCapacity,admitTourist,touristStep,touristEnter,touristCharge,touristTrafficFailure,touristLeave,touristHotel,arriveTourist,updateTourism,tourismLedger,touristPeople,touristInspector,renderTouristDashboard,showTouristDashboard,releaseHotel,prepareTouristDemolition,daily,LIFESTYLES,SERVICE_STAY,serviceWindow,workRoutine,runLifestyle,lifeAdvance,newCitizen,scheduleDay,planForDay,ensureRoutine,habitRandom,eventPush,eventPop,eventHeapify,citizenDashboardData,filteredCitizenRecords,renderCitizenDashboard,showCitizenDashboard,hideCitizenDashboard,TREE_KINDS,landscapeClear,plantLandscape,eraseLandscape,plantLandscapeStroke,lotCarsOverlap,advanceLot,parkingFree,parkingSpace,lotSlots,lotPoint,lotModel,buildingBounds,parkingSlotPose,parkingPose,parkingVisuals,syncParkingSlots,beginParkingArrival,prepareLotDeparture,arrive,trackingRoute,trackingDestination,reset,id,xy,route,tripRoute,buildRoad,buildBuilding,checkBuilding,checkRoad,demolishRoad,demolishBuilding,createTrip,missingRoute,routeWarningPosition,updatePlaceLabels,updateRouteWarnings,recoverVehicle,checkDepartureRoute,canTowVehicle,towVehicle,strandVehicle,cancelVehicle,immigration,tick,computeStats,cityDemand,cityAdvice,updateCityAdvisor,runAction,drawRoads,advanceVehicles,junctionDetails,cityBugReport,openCityReport,renderInspector,inspectAt,signalHitAt,signalSettings,signalCycle,signalProgress,signalStatus,signalPhase,signalColor,signalAllows,editSignal,controlSignal,setSignalDefaults,restoreRecommendedSignals,selectTool,snapshot,loadGame,saveGame,buildingTraffic,buildingGaugeMetrics,readSaveSlots,readDurableSaveSlots,saveDurableGame,validateSave,prepareJunctionQueues,junctionConnector,connectorsConflict,enforceNoUTurn,capsulesOverlap,queueAllows,reserveIntersection,release,accessFor,dir,junction,plannedLane,intersectionAllowed,stopProgress,roadChanged,occupancy,vehiclePosition,motionPlan,motionDistance,positionOnMotion,laneOffset,lineCells,roadVisualWidth,bezierPoint,bezierTangent,TRIPS,ROADS,CATALOG});
resize();reset();requestAnimationFrame(frame);
})();
