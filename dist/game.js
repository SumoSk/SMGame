'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('world');
let renderer3d=null;try{if(window.createTrafficRenderer)renderer3d=window.createTrafficRenderer(canvas);}catch(e){console.error('3D renderer:',e);}
const ctx=renderer3d?null:canvas.getContext('2d');
const GRAPHICS_KEY='smcity-graphics-quality-v1';
const GRAPHICS_LEVELS={veryHigh:'สูงมาก',medium:'กลาง',low:'ต่ำ'};
let graphicQuality='medium';
try{const saved=localStorage.getItem(GRAPHICS_KEY);if(GRAPHICS_LEVELS[saved])graphicQuality=saved;}catch{}
if(renderer3d)renderer3d.setGraphicQuality(graphicQuality);
function applyGraphicQuality(value){
 if(!GRAPHICS_LEVELS[value])return false;
 graphicQuality=value;
 try{localStorage.setItem(GRAPHICS_KEY,value);}catch{}
 if(renderer3d)renderer3d.setGraphicQuality(value);
 else resize();
 return true;
}
const W=300,H=300,T=18,DIR=[[1,0],[0,1],[-1,0],[0,-1]],fmt=n=>Math.round(n).toLocaleString('th-TH'),money=n=>'฿'+fmt(n);
const ROADS={small:{name:'ถนนเล็ก',lanes:2,cost:50,maint:.5,speed:3,width:1,clearanceWidth:2,visualWidth:1.175},medium:{name:'ถนนกลาง',lanes:4,cost:150,maint:1,speed:4.5,width:2,visualWidth:2.35},large:{name:'ถนนใหญ่',lanes:8,cost:600,maint:5,speed:6,width:4,visualWidth:3.72}};
const TRAFFIC_RULES={stopLineOffset:.52,vehicleHalfLength:.28,maxIntersectionLookahead:3,maxIntersectionReservation:3};
// Never change lanes just because one is a little faster. Only react to real
// obstruction, with ample room before a turn/junction and a clear swept path.
const ADAPTIVE_LANE_RULES={minWait:2,obstacleAhead:2.2,turnBuffer:9,junctionBuffer:5,cooldown:8,sweep:3.1};
const GAME_MINUTES_PER_SECOND=.8;
const NORMAL_SPEED_SCALE=2; // UI 1x runs at the former 2x simulation speed.
const CITIES={phuket:{name:'ภูเก็ต',en:'PHUKET ISLAND',sub:'เกาะเล็ก ๆ กับความเป็นไปได้ที่ยิ่งใหญ่',terrain:'island'},bangkok:{name:'กรุงเทพฯ',en:'BANGKOK METROPOLIS',sub:'เชื่อมสองฝั่งเมือง ให้ทุกชีวิตไปต่อ',terrain:'river'},chiangmai:{name:'เชียงใหม่',en:'CHIANG MAI',sub:'เมืองเหนือที่เติบโต ในจังหวะของคุณ',terrain:'mountain'},korat:{name:'โคราช',en:'NAKHON RATCHASIMA',sub:'ประตูสู่อีสาน ทุกเส้นทางเริ่มที่นี่',terrain:'through'}};
const KINDS={casino:{name:'คาสิโน',icon:'♠',color:'#6250ac',roof:'#20223f'},hotel:{name:'โรงแรม',icon:'▣',color:'#b8dfe9',roof:'#4f93ad'},home:{name:'บ้าน',icon:'⌂',color:'#e9b871',roof:'#db8558'},shop:{name:'ร้านค้า',icon:'▤',color:'#f4c76c',roof:'#d79c3e'},restaurant:{name:'ร้านอาหาร',icon:'♨',color:'#eaa080',roof:'#c76251'},mall:{name:'ห้าง',icon:'▥',color:'#cee7db',roof:'#5d9c98'},office:{name:'สำนักงาน',icon:'▥',color:'#b9d5da',roof:'#4f8598'},factory:{name:'โรงงาน',icon:'⚙',color:'#c4c9b4',roof:'#7d8c81'},park:{name:'สวน',icon:'♧',color:'#8aba70',roof:'#5b9658'},pub:{name:'ผับ',icon:'♫',color:'#bfa6c8',roof:'#88618e'}};
const CATALOG={};
const catalogData={casino:[[4,90000,900,0,6,16],[5,200000,2000,0,12,32],[6,420000,4200,0,24,64]],hotel:[[2,3000,20,0,0,0,2],[3,17500,100,0,0,0,10],[4,65000,350,0,0,0,30]],home:[[2,6000,20,2],[3,35000,100,10],[4,130000,350,30]],shop:[[2,8000,100,0,3,12],[3,24000,250,0,8,35],[4,70000,650,0,18,80]],restaurant:[[3,12000,180,0,5,18],[4,35000,450,0,14,50],[5,85000,900,0,30,95]],mall:[[4,45000,450,0,12,45],[5,95000,1100,0,30,100],[6,190000,2300,0,65,180]],office:[[3,18000,250,0,18],[4,60000,700,0,50],[5,120000,1300,0,90]],factory:[[4,22000,450,0,25],[5,70000,1300,0,65],[6,140000,2400,0,110]],park:[[3,6000,40,0,1,20],[4,18000,140,0,3,60],[5,45000,350,0,8,130]],pub:[[3,14000,200,0,5,18],[4,38000,550,0,13,45],[5,85000,1200,0,28,85]]};
for(const [kind,rows] of Object.entries(catalogData))rows.forEach((r,i)=>{const key=kind+'_'+['small','medium','large'][i];CATALOG[key]={key,kind,name:KINDS[kind].name+['เล็ก','กลาง','ใหญ่'][i],size:r[0],cost:r[1],maint:r[2],residents:r[3]||0,jobs:r[4]||0,service:r[5]||0,beds:r[6]||0};});
// Version 6 of the parking layout is the new v5 architectural masterplan.
// There are exactly two facing stall rows, one continuous aisle, no inner banks.
// Preserve the previous home_large key, existing buildings and all v7 saves.
CATALOG.home_starter={key:'home_starter',kind:'home',name:'บ้านเริ่มต้น',size:3,cost:24000,maint:60,residents:6,jobs:0,service:0,beds:0,starterTier:true};
CATALOG.home_small.name='บ้านรุ่นเก่า 2 คน';
CATALOG.home_medium.name='บ้านรุ่นเก่า 10 คน';
CATALOG.home_large.name='บ้านเล็ก';
CATALOG.home_dual={key:'home_dual',kind:'home',name:'บ้านกลาง',size:5,cost:200000,maint:700,residents:60,jobs:0,service:0,beds:0,dualParking:true};
// New large home is an additional type: two complete small-home parking banks
// stacked front-to-back, not stretched sideways. Existing homes remain intact.
CATALOG.home_grand={key:'home_grand',kind:'home',name:'บ้านใหญ่',size:6,cost:285000,maint:980,residents:60,jobs:0,service:0,beds:0,stackedParking:true};
// Additional starter tiers; all existing building keys and saved plots remain intact.
const STARTER_PRICES={shop:[3000,40],restaurant:[5000,60],mall:[12000,100],office:[6000,70],factory:[8000,100],park:[2500,15],pub:[6000,70],casino:[30000,300],hotel:[2500,25]};
for(const [kind,[cost,maint]] of Object.entries(STARTER_PRICES)){
 const key=kind+'_starter',workplace=kind==='office'||kind==='factory',hotel=kind==='hotel';
 CATALOG[key]={key,kind,name:KINDS[kind].name+'เริ่มต้น',size:3,cost,maint,residents:0,
  jobs:workplace?6:1,service:workplace||hotel?0:5,beds:hotel?5:0,starterTier:true};
}
// New building occupancy schedule; hotel and costs are unchanged.
const CAPACITY_PLAN={"home_large":[20,0,0],"home_dual":[40,0,0],"home_grand":[60,0,0],"office_small":[0,15,0],"office_medium":[0,30,0],"office_large":[0,60,0],"factory_small":[0,20,0],"factory_medium":[0,40,0],"factory_large":[0,60,0],"shop_small":[0,2,8],"shop_medium":[0,4,16],"shop_large":[0,8,32],"restaurant_small":[0,3,10],"restaurant_medium":[0,6,20],"restaurant_large":[0,10,40],"mall_small":[0,3,12],"mall_medium":[0,6,24],"mall_large":[0,12,48],"park_small":[0,1,14],"park_medium":[0,2,28],"park_large":[0,4,56],"pub_small":[0,2,8],"pub_medium":[0,4,16],"pub_large":[0,8,32]};
for(const [key,[residents,jobs,service]] of Object.entries(CAPACITY_PLAN))Object.assign(CATALOG[key],{residents,jobs,service});
for(const t of Object.values(CATALOG))if(!t.starterTier&&((t.kind==='home'&&['home_large','home_dual'].includes(t.key))||(!['hotel','home'].includes(t.kind)))){t.plannedParking=true;t.modelTier=t.key==='home_large'?1:t.key==='home_dual'?2:t.key.endsWith('_small')?1:t.key.endsWith('_medium')?2:3;}
const PARKING_VERSION=9,LOT_SPEED=1.35;
for(const t of Object.values(CATALOG)){
 t.parkingCapacity=t.starterTier?6:t.beds||t.residents||t.jobs+t.service;
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
 if(t.stackedParking){t.parkingColumns=15;t.parkingRows=2;t.parkingPhysicalRows=4;t.parkingPitch=.55;t.parkingRowOffset=.79;t.parkingAisle=4.90;t.parkingRearAisle=2.05;t.plotWidth=11;t.plotHeight=13;t.compactParking=true;t.frontageEntranceU=3.0;t.frontageExitU=8.0;t.frontageV=12.43;}
 if(t.starterTier){
  t.compactCottage=true;t.parkingColumns=6;t.parkingPhysicalRows=1;
  t.plotWidth=3;t.plotHeight=3;t.parkingStartU=.15;t.parkingPitch=.45;
  t.parkingAisle=2.70;t.parkingRowOffset=.80;
  t.frontageEntranceU=.20;t.frontageExitU=2.80;t.parkingExitU=2.80;
 }
 if(t.plannedParking){
  // Parking is sized FIRST. Compare the one-bank and two-bank plot areas,
  // including real side-drive clearance. Building takes the other 50%.
  const candidate=banks=>{
   const columns=Math.ceil(t.parkingCapacity/(2*banks));
   const width=Math.max(6,Math.ceil(2.33+columns*.55));
   const height=banks===1?8:13;
   return {banks,columns,width,height,area:width*height};
  };
  const best=[candidate(1),candidate(2)].sort((a,b)=>a.area-b.area||a.banks-b.banks)[0];
  t.dualParking=false;t.stackedParking=true;t.compactParking=true;
  t.parkingRows=best.banks;t.parkingPhysicalRows=best.banks*2;
  t.parkingColumns=best.columns;t.parkingPitch=.55;t.parkingRowOffset=.79;
  t.parkingRearAisle=2.05;t.parkingAisle=best.banks===2?4.90:2.05;
  t.plotWidth=best.width;t.plotHeight=best.height;
  t.parkingZoneDepth=t.plotHeight/2;t.buildingZoneDepth=t.plotHeight/2;
  t.frontageEntranceU=+(t.plotWidth*.275).toFixed(2);
  t.frontageExitU=+(t.plotWidth-t.frontageEntranceU).toFixed(2);
  t.frontageV=t.plotHeight-.57;t.parkingLayout=null;
 }
}
function buildingBounds(b){const t=CATALOG[b.key];return (b.rotation||0)%2?{w:t.plotHeight,h:t.plotWidth}:{w:t.plotWidth,h:t.plotHeight};}
function lotPoint(b,u,v){const t=CATALOG[b.key];let x=u,y=v;switch(b.rotation||0){case 1:x=t.plotHeight-v;y=u;break;case 2:x=t.plotWidth-u;y=t.plotHeight-v;break;case 3:x=v;y=t.plotWidth-u;break;}return{x:b.x+x+.5,y:b.y+y+.5};}
function lotSlots(b){
 const t=CATALOG[b.key];if(t.parkingLayout)return t.parkingLayout;
 const slots=[];
 for(let n=0;n<t.parkingCapacity;n++){
  const row=Math.floor(n/t.parkingColumns),col=n%t.parkingColumns;
  const stackedBank=t.stackedParking?Math.floor(row/2):0;
  const aisle=t.stackedParking?(stackedBank?t.parkingAisle:t.parkingRearAisle):t.dualParking&&row?t.parkingUpperAisle:t.parkingAisle;
  const rowSide=t.stackedParking?row%2:row;
  slots.push({index:n,u:(t.parkingStartU??(t.dualParking?1:1.42))+(col+.5)*t.parkingPitch,
   v:aisle+(t.dualParking?-t.parkingRowOffset:rowSide?t.parkingRowOffset:-t.parkingRowOffset),
   aisle,row,zone:t.stackedParking?(stackedBank?'front':'rear'):t.dualParking?(row?'B':'A'):null});
 }
 return t.parkingLayout=slots;
}
function lotModel(b){const t=CATALOG[b.key],scale=t.plannedParking?Math.min(t.size,t.plotWidth-2,t.buildingZoneDepth-1.35):t.size,p=lotPoint(b,t.plotWidth/2,t.plannedParking?t.parkingZoneDepth+t.buildingZoneDepth/2:t.size/2+.1);return{...b,x:p.x-.5-scale/2,y:p.y-.5-scale/2,visualSize:scale};}
function parkingSlotPose(b,index){const slot=lotSlots(b)[index];if(!slot)return null;const p=lotPoint(b,slot.u,slot.v),theta=(CATALOG[b.key].dualParking?Math.PI/2:(slot.row%2?Math.PI/2:-Math.PI/2))+(b.rotation||0)*Math.PI/2;return{...p,angle:Math.atan2(Math.sin(theta)*.78,Math.cos(theta))};}
function citizenCarColor(id){if(state?.citizens.get(id)?.tourist)return '#ffd127';return ['#f0e8c7','#e5a861','#719ca5','#afc5a2','#bc8fa5','#c8c8c0'][Math.abs(id)%6];}
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
function parkingIsMoving(cid){const c=state.citizens.get(cid),v=state.vehicles.get(c?.vehicleId);return !!v&&(!!v.lotPath||['air_lift','air_cruise','air_land','warp_charge'].includes(v.phase));}
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
// A single shared driveway is an admission point, not a spawn pad. Keep a
// second arriving car on its road route until the first clears the entrance.
function parkingEntranceOccupied(v,b,entry){
 for(const other of state.vehicles.values()){
  if(other.id===v.id||other.phase!=='parking_in'||other.toId!==b.id||!other.lotPath)continue;
  const pose=parkingPose(other);
  if(pose&&Math.hypot(pose.x-entry.x,pose.y-entry.y)<.92)return true;
 }
 return false;
}
// Repair saves produced by older versions: two parking_in cars could be
// spawned at the exact same point. Let the older car clear the entrance,
// while the younger vehicle waits until their physical bodies separate.
function overlappingEntranceLeader(v,other){
 if(v.phase!=='parking_in'||other.phase!=='parking_in'||v.toId!==other.toId||!v.lotPath||!other.lotPath||v.id>=other.id)return false;
 if((other.lotDistance||0)>.12||(v.lotDistance||0)>1.4)return false;
 const a=v.lotPath[0],b=other.lotPath[0];
 return Math.hypot(a.x-b.x,a.y-b.y)<.24;
}
function lotClear(v,pose,ignoreRoadTraffic=false){
 for(const other of state.vehicles.values()){
  if(other.id===v.id||other.lotBuilding!==v.lotBuilding||!other.lotPath)continue;
  if(overlappingEntranceLeader(v,other))continue;
  if(lotCarsOverlap(pose,parkingPose(other)))return false;
 }
 // The first/last metres of the driveway are shared with live road traffic.
 // A car leaving or entering the lot must not ignore vehicles on the street.
 const b=state.buildings.get(v.lotBuilding);
 if(!ignoreRoadTraffic&&b&&['departing','parking_out'].includes(v.phase)){
  const t=CATALOG[b.key],entrance=lotPoint(b,t.frontageEntranceU??.45,t.plotHeight),exit=lotPoint(b,t.frontageExitU??(t.dualParking?t.parkingExitB:t.plotWidth-.45),t.plotHeight);
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
 const t=CATALOG[b.key],bounds=buildingBounds(b),center=lotPoint(b,t.plotWidth/2,t.plotHeight/2),entry=lotPoint(b,t.frontageEntranceU??.45,t.plotHeight),exit=lotPoint(b,t.frontageExitU??(t.dualParking?t.parkingExitB:t.plotWidth-.45),t.plotHeight),candidates=[];
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
function checkParkingBuilding(key,x,y,ignoreId=null,preferredRotation=null){
 const t=CATALOG[key];if(!t||(!ignoreId&&['home_small','home_medium'].includes(key)))return{error:'อาคารบ้านรุ่นนี้หยุดให้สร้างแล้วค่ะ'};
 if(!ignoreId&&(state.money<0||state.money-t.cost< -10000))return{error:'งบประมาณไม่พอสำหรับอาคารนี้ค่ะ'};
 let error='วางด้านทางเข้าออกของลานจอดให้ชิดถนนที่ยาวพอค่ะ';
 for(const rotation of preferredRotation==null?[0,1,2,3]:[preferredRotation]){
  const b={key,x,y,rotation},bounds=buildingBounds(b);if(!valid(x,y)||!valid(x+bounds.w-1,y+bounds.h-1)){error='พื้นที่อาคารและลานจอดต้องอยู่ในแผนที่ค่ะ';continue;}
  let blocked=false;for(let yy=y;yy<y+bounds.h&&!blocked;yy++)for(let xx=x;xx<x+bounds.w;xx++){const i=id(xx,yy);if(state.footprint[i]>=0||(state.buildGrid[i]>=0&&state.buildGrid[i]!==ignoreId)){blocked=true;break;}}
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
// A real signal at the crossing of the rear-bank exit spine and the front
// parking aisle. Grant a single vehicle the junction until its rear bumper
// clears it, then prefer the waiting opposite approach. This uses game
// vehicle positions, not an animated light that can disagree with movement.
// A proper internal signalized T-junction at the RIGHT driveway of the two
// grand-home parking banks. A single crossing token covers the entire turn;
// vehicles wait on independent physical stop lines, never in the crossing.
// Queue priority is demand-actuated and alternates whenever both approaches
// have a car ready. The signal is intentionally independent of city roads.
function grandSignalMayCross(v){
 const crossing=v.grandCrossing,b=state.buildings.get(v.lotBuilding);
 if(!crossing||!b||!CATALOG[b.key]?.stackedParking||crossing.cleared)return true;
 const control=b.grandSignal||(b.grandSignal={green:'front',holder:null,lastServed:null});
 if(crossing.granted)return control.holder===v.id;
 if(control.holder!=null){
  const holder=state.vehicles.get(control.holder);
  if(holder?.lotBuilding===b.id&&holder.grandCrossing?.granted&&!holder.grandCrossing.cleared)return false;
  control.holder=null; // Discard stale reservations recovered from old saves.
 }
 const ready=car=>car.lotBuilding===b.id&&car.phase==='departing'&&car.lotPath&&
  car.grandCrossing&&!car.grandCrossing.cleared&&!car.grandCrossing.granted&&
  (car.lotDistance||0)>=car.grandCrossing.stopAt-.10;
 const waiting=[...state.vehicles.values()].filter(car=>ready(car));
 const front=waiting.filter(car=>car.grandCrossing.approach==='front').sort((a,b)=>a.id-b.id);
 const rear=waiting.filter(car=>car.grandCrossing.approach==='rear').sort((a,b)=>a.id-b.id);
 // Only the first waiting vehicle from a direction may enter the crossing.
 const own=crossing.approach==='rear'?rear:front;
 if(own[0]&&own[0].id!==v.id)return false;
 const opposite=crossing.approach==='rear'?front:rear;
 // When both queues are real and not moving, yield to the opposite approach
 // that missed the preceding green; if opposite cannot reach the stop line
 // it is NOT allowed to force this approach to wait forever.
 if(opposite.length&&control.lastServed===crossing.approach){
  control.green=opposite[0].grandCrossing.approach;
  return false;
 }
 // Protect the exit spine and actual junction footprint. Opposing vehicles
 // stopped BEFORE their respective setback are not an artificial conflict.
 for(const other of state.vehicles.values()){
  if(other.id===v.id||other.lotBuilding!==b.id||!other.lotPath)continue;
  const their=parkingPose(other);
  if(!their)continue;
  const otherCrossing=other.grandCrossing;
  if(otherCrossing&&!otherCrossing.granted&&!otherCrossing.cleared&&
     (other.lotDistance||0)<=otherCrossing.stopAt+.06)continue;
  for(const d of [crossing.crossingAt,crossing.clearAt,crossing.clearAt+.18]){
   const our=lotPathPose(v.lotPath,Math.min(lotPathLength(v.lotPath),d));
   if(lotCarsOverlap(our,their,.06))return false;
  }
 }
 crossing.granted=true;control.holder=v.id;
 control.green=crossing.approach;
 return true;
}
function grandSignalRelease(v){
 const crossing=v.grandCrossing;if(!crossing||crossing.cleared)return;
 const b=state.buildings.get(v.lotBuilding);
 if(b?.grandSignal?.holder===v.id){
  b.grandSignal.holder=null;
  b.grandSignal.lastServed=crossing.approach;
  b.grandSignal.green=crossing.approach==='front'?'rear':'front';
 }
 crossing.cleared=true;crossing.granted=false;
}
function advanceLot(v,dt,maxDistance=Infinity,ignoreRoadTraffic=false){
 const total=lotPathLength(v.lotPath),target=Math.min(total,maxDistance,(v.lotDistance||0)+LOT_SPEED*dt);let distance=v.lotDistance||0;
 // Small swept steps also protect queues when the game runs at high speed.
 while(distance<target-1e-8){
  const next=Math.min(target,distance+.04),crossing=v.grandCrossing;
  if(crossing&&!crossing.cleared&&next>=crossing.stopAt-1e-6&&!crossing.granted){
   if(!grandSignalMayCross(v)){v.stopReason='รอไฟแดงตรงแยกภายในบ้านใหญ่';break;}
  }
  if(crossing?.granted&&!crossing.cleared&&!grandSignalMayCross(v)){
   v.stopReason='รอแยกภายในว่าง';break;
  }
  if(!lotClear(v,lotPathPose(v.lotPath,next),ignoreRoadTraffic)){v.stopReason='รอรถข้างหน้าในลานจอด';break;}
  distance=next;v.lastMovedAt=state.time;
  if(crossing?.granted&&!crossing.cleared&&distance>=crossing.clearAt)grandSignalRelease(v);
 }
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
  if(occupied&&(!(CATALOG[b.key].dualParking||CATALOG[b.key].stackedParking)||occupied.zone===target.zone)&&Math.abs(occupied.u-target.u)<.45&&occupied.index!==index)return true;
 }
 return false;
}
function prepareLotDeparture(v,dt){
 const b=state.buildings.get(v.fromId);if(!b)return true;
 if(v.lotReady)return true;
 if(!v.lotPath){
  const index=parkingSpace(b,v.citizenId,true),slot=lotSlots(b)[index];if(!slot){v.stopReason='ไม่พบช่องจอดของรถ';return false;}
  if(parkingBankBusy(b,index,false)){v.stopReason='รอรถเข้าจอดในแถวเดียวกัน';return false;}
  const t=CATALOG[b.key],exitU=t.dualParking?(slot.zone==='A'?t.parkingExitA:t.parkingExitB):(t.parkingExitU??t.plotWidth-.45);
  v.lotPath=[parkingSlotPose(b,index),lotPoint(b,slot.u,slot.aisle),lotPoint(b,exitU,slot.aisle)];
  // Rear court must physically cross the front court's aisle at a real T
  // junction. Include the crossing as an explicit motion waypoint.
  if(t.stackedParking&&t.parkingRows>1&&slot.zone==='rear')v.lotPath.push(lotPoint(b,exitU,t.parkingAisle));
  v.lotPath.push(lotPoint(b,exitU,t.compactCottage?t.plotHeight-.15:t.plotHeight-.9));
  v.lotDistance=0;v.lotBuilding=b.id;
  if(t.stackedParking&&t.parkingRows>1){
   const junctionSegment=slot.zone==='rear'?4:3;
   const crossingAt=lotPathLength(v.lotPath.slice(0,junctionSegment));
   v.grandCrossing={approach:slot.zone,crossingAt,stopAt:Math.max(0,crossingAt-1.12),clearAt:crossingAt+1.02,granted:false,cleared:false};
  }
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
  if(t.compactCottage)return [start,lotPoint(b,t.frontageEntranceU,2.85),
   lotPoint(b,t.frontageEntranceU,slot.aisle),aisle,end];
  if(t.stackedParking)return [
   start,lotPoint(b,t.frontageEntranceU,t.frontageV),
   lotPoint(b,.45,t.frontageV),lotPoint(b,.45,slot.aisle),aisle,end];
  return [start,lotPoint(b,.45,t.plotHeight-.4),lotPoint(b,.45,slot.aisle),aisle,end];
 }
 const start=parkingPose(v);if(!start)return null;
 const local=localParkingPoint(b,start);
 if(slot.u<local.u+.8)return null;
 if(local.u>.85&&Math.abs(local.v-slot.aisle)>.65)return null;
 if(t.stackedParking&&Math.abs(local.v-slot.aisle)>.15)
  return [start,lotPoint(b,.45,slot.aisle),aisle,end];
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
 const dual=CATALOG[b.key].dualParking,stacked=CATALOG[b.key].stackedParking,zoneLoad=[0,0];
 const bankIndex=slot=>stacked?Math.floor(slot.row/2):slot.row;
 if(dual||stacked)for(let i=0;i<slots.length;i++)if(b.parkingSlots[i]!=null)zoneLoad[bankIndex(slots[i])]++;
 options.sort((a,b)=>{
  if(!replan){if(a===old)return -1;if(b===old)return 1;}
  if(stacked&&replan&&(current?.u??0)<=.85)
   return zoneLoad[bankIndex(slots[a])]-zoneLoad[bankIndex(slots[b])]||
    Math.abs(slots[a].aisle-current.v)-Math.abs(slots[b].aisle-current.v)||slots[a].u-slots[b].u||a-b;
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
 if(parkingEntranceOccupied(v,b,entry)){v.speed=0;v.stopReason='รอรถคันหน้าพ้นปากทางเข้า';return true;}
 if(t.compactCottage){
  // Select the bay BEFORE advancing beyond the first two compact spaces.
  // The generic staging/replanning rule needs .8 of forward clearance and
  // cannot reach these bays after the car has already entered the aisle.
  if(!assignArrivalParking(v,false)){v.speed=0;v.stopReason='รอช่องจอดว่าง';return true;}
  v.parkingStage=false;v.phase='parking_in';v.speed=0;return true;
 }

 v.lotPath=t.stackedParking?[
   entry,lotPoint(b,t.frontageEntranceU,t.frontageV),
   lotPoint(b,.45,t.frontageV),lotPoint(b,.45,t.parkingAisle)]
  :t.dualParking?[entry,lotPoint(b,.45,t.plotHeight-.4),lotPoint(b,.45,t.parkingAisle)]
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
 // Stop the underlay at the true outer edge of the rear parking bank.
 // The previous full-plot backing exposed a pale ~0.6-cell strip behind
 // every current model. This crops only that backing, never stalls or lanes.
 if(t.compactCottage){
  // Ground-level home behind a separate, single row of six compact bays.
  // Cars keep their usual size; only lateral clearance between bays is tighter.
  rect(1.5,.625,2.95,1.20,'#96af8f');
  rect(1.5,1.90,2.70,1.24,'#515f62');
  rect(1.5,2.70,2.94,.55,'#58666a');
  for(let col=0;col<=6;col++)rect(.15+col*.45,1.90,.025,1.24,'#e9e6cc');
  rect(1.5,1.28,2.70,.025,'#e9e6cc');
  for(const u of [t.frontageEntranceU,t.frontageExitU])rect(u,2.93,.34,.14,'#58666a');
  return rects;
 }
 const rearEdge=t.stackedParking?Math.max(.025,t.parkingRearAisle-t.parkingRowOffset-.64):.025;
 if(t.plannedParking){
  const end=t.parkingZoneDepth-.025;
  rect(t.plotWidth/2,(rearEdge+end)/2,t.plotWidth-.05,end-rearEdge,'#9baaa0');
  rect(t.plotWidth/2,t.parkingZoneDepth+t.buildingZoneDepth/2,t.plotWidth-.05,t.buildingZoneDepth-.05,'#96af8f');
 }else{
  const end=t.plotHeight-.025;
  rect(t.plotWidth/2,(rearEdge+end)/2,t.plotWidth-.05,end-rearEdge,t.key==='home_starter'?'#96af8f':'#bdc6ae');
 }
 if(t.stackedParking){
  // Shared grand-house banks, one for compact or two for large lots.
  const rear=t.parkingRearAisle,front=t.parkingRows>1?t.parkingAisle:t.parkingRearAisle;
  const aisles=t.parkingRows>1?[rear,front]:[rear];
  for(const aisle of aisles){
   const bottom=aisle-t.parkingRowOffset-.64,top=aisle+t.parkingRowOffset+.64;
   rect(t.plotWidth/2,(bottom+top)/2,t.plotWidth-.12,top-bottom,'#515f62');
  }
  // Both original side spines STOP at the new frontage road. They used
  // to extend all the way to the street, leaving orphan strips of the OLD
  // entrance/exit beside the new centered city-road gates.
  const forecourt=t.frontageV,sideL=.45,sideR=t.plotWidth-.45;
  for(const u of [sideL,sideR]){
   rect(u,(rear+forecourt)/2,.72,forecourt-rear+.08,'#58666a');
  }
  for(const [bank,aisle] of aisles.entries()){
   const rowStart=bank*2;
   for(let row=0;row<2;row++)for(let col=0;col<t.parkingColumns;col++){
    const slot=lotSlots(b)[(rowStart+row)*t.parkingColumns+col];
    if(!slot)continue; // the last row can be partly filled
    rect(slot.u-t.parkingPitch/2,slot.v,.025,1.24,'#e9e6cc');
    rect(slot.u+t.parkingPitch/2,slot.v,.025,1.24,'#e9e6cc');
    rect(slot.u,slot.v+(row?.62:-.62),t.parkingPitch-.04,.025,'#e9e6cc');
   }
   for(let u=1.1;u<t.plotWidth-1.1;u+=2.1){
    rect(u,aisle,.58,.035,'#c5d2c2');
    rect(u+.21,aisle-.11,.20,.03,'#c5d2c2');
    rect(u+.21,aisle+.11,.20,.03,'#c5d2c2');
   }
  }
  // Dedicated frontage connector: this SINGLE asphalt course joins the
  // side roads, while two short gate necks alone reach the main street.
  // Its ends align with the outer edges of the side lanes (no ragged tabs).
  const entranceU=t.frontageEntranceU,gateOut=t.frontageExitU;
  rect(t.plotWidth/2,forecourt,t.plotWidth-.18,.71,'#58666a');
  const gateEnd=t.plotHeight-.045; // keep the rendered road inside the plot
  for(const u of [entranceU,gateOut])
   rect(u,(gateEnd+forecourt)/2,.69,gateEnd-forecourt+.04,'#58666a');
  // Curbs on the long approach to the facade, broken where parking rows and
  // the turn into the frontage actually meet. Do NOT stripe the lane center.
  const curbStart=front+t.parkingRowOffset+.74,curbEnd=forecourt-.48;
  if(curbEnd>curbStart){
   for(const u of [sideL+.39,sideR-.39])
    rect(u,(curbStart+curbEnd)/2,.026,curbEnd-curbStart,'#bbc9b9');
  }
  // Inside corner radii are paved with the same material as the driveway,
  // giving a readable soft turn instead of a hard 90-degree road junction.
  for(const [u,dir] of [[sideL,1],[sideR,-1]]){
   for(let n=0;n<4;n++){
    const z=(n+.5)/4,spread=.17*Math.sqrt(1-z*z);
    rect(u+dir*(.36+spread/2),forecourt-.34+z*.34,spread+.014,.105,'#58666a');
   }
  }
  // Neat continuous curb above the forecourt, with clear openings at both
  // turning radii; a matching road-edge line only between the two gate necks.
  rect((sideL+entranceU)/2,forecourt-.39,entranceU-sideL-.72,.035,'#bbc9b9');
  rect((gateOut+sideR)/2,forecourt-.39,sideR-gateOut-.72,.035,'#bbc9b9');
  rect(t.plotWidth/2,forecourt+.39,gateOut-entranceU-.95,.032,'#bbc9b9');
  // Pavement striping follows actual travel direction (right-to-left along
  // this forecourt) and the real centered entrance and exit.
  for(const u of [Math.max(1.3,entranceU-.7),Math.min(t.plotWidth-1.3,gateOut+.7)]){
   rect(u,forecourt,.34,.027,'#c5d2c2');
   rect(u-.12,forecourt-.085,.13,.025,'#c5d2c2');
   rect(u-.12,forecourt+.085,.13,.025,'#c5d2c2');
  }
  // The middle frontage between the two street gates is decorative only.
  // Replace the visually-unused road patch with a lit welcome island and
  // planting bed while keeping the working entry and exit carriageways clear.
  const islandMid=(entranceU+gateOut)/2,islandGap=Math.max(0,gateOut-entranceU-1.30),islandTop=t.plotHeight-.10;
  if(islandGap>.25){
   rect(islandMid,(forecourt+islandTop)/2,islandGap,islandTop-forecourt-.12,'#d7cfbc');
   rect(islandMid,(forecourt+islandTop)/2,islandGap-.18,islandTop-forecourt-.24,'#e5ded0');
   rect(islandMid,forecourt+.17,islandGap-.36,.032,'#bbc9b9');
   rect(islandMid,islandTop-.16,islandGap-.46,.032,'#bbc9b9');
   rect(islandMid,(forecourt+islandTop)/2,islandGap-1.08,.28,'#7ea072');
   rect(islandMid,(forecourt+islandTop)/2,Math.max(.08,islandGap-1.46),.10,'#d7b38c');
   for(const u of [islandMid-1.05,islandMid+1.05])rect(u,(forecourt+islandTop)/2,.22,.22,'#f1ca85');
  }
  rect(entranceU,forecourt-.06,.17,.13,'#94d9aa');
  rect(gateOut,forecourt-.06,.17,.13,'#f3ca88');
  const exitU=t.plotWidth-.45;
  // Replace the old internal traffic-light stop bars with calmer threshold
  // markings so the junction stays readable without visible red/green lights.
  rect(exitU-.88,front,.26,.055,'#e5e6d0');
  rect(exitU,front-.86,.40,.055,'#e5e6d0');
  // Gate markers belong to the street-facing entry and exit.
  rect(entranceU,t.plotHeight-.18,.48,.050,'#94d9aa');
  rect(gateOut,t.plotHeight-.18,.48,.050,'#f3ca88');
  return rects;
 }
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
 for(const row of (t.singleParkingRow?[0]:[0,1])){
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
function drawParking2D(b){for(const r of parkingVisuals(b)){const points=[[r.u-r.w/2,r.v-r.h/2],[r.u+r.w/2,r.v-r.h/2],[r.u+r.w/2,r.v+r.h/2],[r.u-r.w/2,r.v+r.h/2]].map(([u,v])=>{const p=lotPoint(b,u,v);return screen(p.x-.5,p.y-.5);});poly(points,r.color);}for(const cid of b.parked||[]){if(parkingIsMoving(cid))continue;const i=parkingSpace(b,cid),p=parkingSlotPose(b,i);if(p){const q=screen(p.x,p.y);drawTechCarShape(q[0],q[1],p.angle,citizenCarColor(cid),cam.z,state.citizens.get(cid)?.vehicleTech);}}}

const runtimeErrors=[];for(const type of ['error','unhandledrejection'])window.addEventListener(type,e=>{runtimeErrors.push({at:new Date().toISOString(),message:String(e.message||e.reason?.stack||e.reason||type).slice(0,4000)});if(runtimeErrors.length>20)runtimeErrors.shift();});
let state,cam={x:150,y:150,z:1.25,angle:Math.PI/4,elevation:Math.PI*50/180},view={w:innerWidth,h:innerHeight,dpr:1},tool='hand',category='roads',selected=null,hover=null,drag=null,pendingRoadPreview=null,pendingDemolitionPreview=null,roadPreviewCache=null,movingBuildingId=null,constructionAnchor=null,heat=false,debug=false,last=0,uiTick=0,news=[],toastTimer,follow=null;
const id=(x,y)=>y*W+x,xy=i=>[i%W,Math.floor(i/W)],valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function reset(city='phuket'){
if(travelRecording)travelLogStop('เปลี่ยนหรือโหลดเมือง');
parkingMerges=[];incidentCases.clear();incidentForVehicle.clear();incidentScanAt=-Infinity;incidentRenderAt=0;
nextAISignalPoll=-Infinity;
state={city,money:500000,vehicleTechLevels:freshVehicleTechLevels(),time:360,incidentRewards:{day:0,count:0},speed:1,roads:new Map(),buildings:new Map(),citizens:new Map(),vehicles:new Map(),signals:new Map(),signalDefaults:{eastWest:6,northSouth:6},footprint:new Int32Array(W*H).fill(-1),buildGrid:new Int32Array(W*H).fill(-1),nextId:1,profileSeq:0,version:0,routeCache:new Map(),occ:new Map(),reservations:new Map(),events:[],lastMinute:359,lastDay:0,lastImmigration:0,lastPass:0,stats:{},alerts:[],roadChanges:[],activeTraffic:new Set(),junctionCache:new Map(),skip:false};
state.plantedTrees=[];state.hiddenAutoTrees=[];state.landscapeVersion=0;missionAutoClose();state.missionStats=newMissionStats();
for(let n=0;n<300;n++){state.roads.set(id(150,n),{type:'large',main:true,links:new Set(),load:0,wait:0});state.roads.set(id(n,150),{type:'large',main:true,links:new Set(),load:0,wait:0});}
for(let n=0;n<299;n++){link(id(150,n),id(150,n+1));link(id(n,150),id(n+1,150));}
state.gates=[id(150,0),id(299,150),id(150,299),id(0,150)];rebuildFootprint();cam={x:149,y:149,z:innerWidth<700?.94:1.24,angle:Math.PI/4,elevation:Math.PI*50/180};selected=null;follow=null;news=[];tool='hand';movingBuildingId=null;$('cancelMoveBuilding').hidden=true;hideCitizenDashboard();hideTouristDashboard();touristSearch='';touristPage=0;touristDashboardAt=0;touristFilter='all';citizenFilter='all';citizenSearch='';citizenPage=0;if($('citizenSearch'))$('citizenSearch').value='';$('inspector').classList.add('hidden');$('cityName').textContent=CITIES[city].name;$('citySub').textContent=CITIES[city].sub;$('mapLabel').innerHTML=CITIES[city].en+'<small>THAILAND · สร้างเมืองในแบบคุณ</small>';addNews('เริ่มเมืองใหม่ เชื่อมถนน สร้างบ้าน และสร้างงาน');updateUI();renderTools();}
// New-city preset only. reset() remains the empty simulation initializer used
// by save loading; saved roads, buildings, citizens and camera are restored as-is.
function startNewCity(city='phuket'){
 reset(city);
 // Preserve the original largest roads at all four city entrances.
 // One continuous medium (4-lane) collector connects the main road to the village.
 // The remaining village streets stay small (2-lane).
 // Extend the medium approach while keeping the same village layout and building mix.
 const approachExtension=8,villageY=y=>y-approachExtension;
 if(!buildRoad(lineCells(id(164,150),id(164,villageY(132))),'medium',true))throw Error('Starter village collector could not be placed');
 const streets=[[[164,132],[176,132]],[[176,132],[176,144]],[[176,144],[164,144]],[[164,138],[176,138]]];
 for(const [a,b] of streets)if(!buildRoad(lineCells(id(a[0],villageY(a[1])),id(b[0],villageY(b[1]))),'small',true))throw Error('Starter village road could not be placed');
 const plots=[
  ['home_starter',166,128,0],['home_starter',170,128,0],
  ['home_starter',166,133,2],['park_starter',170,133,2],
  ['restaurant_starter',166,140,0],['shop_starter',170,140,0],
  ['mall_starter',166,145,2],['office_starter',170,145,2],
  ['factory_starter',160,134,3],['hotel_starter',160,140,3],
  ['pub_starter',177,134,1],['casino_starter',177,140,1]
 ];
 const homes=[];
 for(const [key,x,y,rotation] of plots){
  const building=buildBuilding(key,x,villageY(y),true);if(!building)throw Error('Starter village building could not be placed: '+key);
  // West-side factory and hotel access the medium collector; all other
  // starter buildings continue to face the original small side streets.
  building.rotation=rotation;building.access=accessFor(building);
  const accessRoadType=x===160?'medium':'small';
  if(building.access.length<2||building.access.some(a=>state.roads.get(a.node)?.type!==accessRoadType))throw Error('Starter building has invalid street access: '+key);
  if(key==='home_starter')homes.push(building);
 }
 for(const home of homes)for(let n=0;n<CATALOG[home.key].residents;n++){
  const c=newCitizen(home);c.resident=true;c.arrivedAt=state.time;c.locationId=home.id;c.location='home';c.state='อยู่บ้าน';
  home.residents.add(c.id);home.parked.add(c.id);assignJob(c);
 }
 for(const c of state.citizens.values()){scheduleDay(c,0);scheduleDay(c,1);}
 // Only the primary T-junction where the eight-lane highway meets the
 // four-lane collector receives free AI. The other junctions remain normal.
 if(!installAISignal(id(164,150)))
  throw Error('Starter main AI junction is incomplete');
 // One complimentary example of each of the four purchasable car classes.
 // Trait 0 = diligent, 1 = chill, 2 = partygoer, 3 = wealthy.
 for(const [trait,tech] of [[0,'speed'],[1,'smart'],[2,'fly'],[3,'warp']])
  state.vehicleTechLevels[trait][tech]=1;
 syncParkingSlots();syncCitizenVehicleTech();
 for(const [trait,tech] of [[0,'speed'],[1,'smart'],[2,'fly'],[3,'warp']])
  if(vehicleTechCounts(trait).counts[tech]!==1)
   throw Error('Starter vehicle showcase is incomplete: '+tech);
 // Roads and buildings are an included starting package, not a hidden charge.
 state.money=500000;state.missionStats=newMissionStats();state.lastImmigration=state.time;state.lastPass=state.time;
 // Keep the original zoom, angle and elevation. Pan halfway between the village
 // and main junction so that the longer approach remains visible at startup.
 const cameraFocusY=138.5-approachExtension/2;
 cam={x:169.5,y:cameraFocusY,z:innerWidth<700?1.25:innerWidth<1100?1.65:2.05,angle:Math.PI/4,elevation:Math.PI*50/180};
 // Frame the village above the bottom controls rather than behind them.
 if(renderer3d)renderer3d.updateCamera(cam);
 const anchor=world(innerWidth*.5,innerHeight*(innerWidth<700?.29:.34));
 cam.x+=169.5-anchor[0];cam.y+=cameraFocusY-anchor[1];
 news=[];addNews('หมู่บ้านโชว์ของพร้อมแล้ว · สามแยกหลัก AI 1 จุด · รถพิเศษ 4 ประเภท · ชาวเมือง 18 คน');
 updateUI();renderTools();return state;
}
function link(a,b){if(a===b)return;state.roads.get(a)?.links.add(b);state.roads.get(b)?.links.add(a);}
// Road centerlines sit on grid boundaries; the narrow carriageway still
// touches both adjacent plot cells. Clearance is independent of lane width.
function roadClearanceWidth(t){return t.clearanceWidth||t.width;}
function rebuildFootprint(){state.footprint.fill(-1);for(const [i,r]of state.roads){const [x,y]=xy(i),w=roadClearanceWidth(ROADS[r.type]),lo=Math.floor(w/2);for(let dy=-lo;dy<w-lo;dy++)for(let dx=-lo;dx<w-lo;dx++)if(valid(x+dx,y+dy)){const p=id(x+dx,y+dy);if(state.footprint[p]<0||Math.hypot(dx,dy)<distance(p,state.footprint[p]))state.footprint[p]=i;}}}
function distance(a,b){const p=xy(a),q=xy(b);return Math.hypot(p[0]-q[0],p[1]-q[1]);}
function screen(x,y,h=0){if(renderer3d)return renderer3d.screen(x,y,h);return[(x-cam.x)*T*cam.z+view.w/2,(y-cam.y)*T*cam.z*.78+view.h*.47-h*cam.z];}
function world(x,y){if(renderer3d)return renderer3d.world(x,y);return[(x-view.w/2)/(T*cam.z)+cam.x,(y-view.h*.47)/(T*cam.z*.78)+cam.y];}
function resize(){view={w:innerWidth,h:innerHeight,dpr:graphicQuality==='low'?.75:Math.min(devicePixelRatio||1,2)};if(renderer3d){renderer3d.resize();return;}canvas.width=Math.round(view.w*view.dpr);canvas.height=Math.round(view.h*view.dpr);ctx.setTransform(view.dpr,0,0,view.dpr,0,0);}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function box(x,y,w,h,height,top,side='#bcbaa0',front='#d8d4b7'){
const a=screen(x,y),b=screen(x+w,y),c=screen(x+w,y+h),d=screen(x,y+h),at=screen(x,y,height),bt=screen(x+w,y,height),ct=screen(x+w,y+h,height),dt=screen(x,y+h,height);
poly([b,c,ct,bt],side);poly([d,c,ct,dt],front);poly([at,bt,ct,dt],top);return{a:at,b:bt,c:ct,d:dt};}
function tree(x,y,s=1){if(graphicQuality==='low')return;const [px,py]=screen(x,y),z=cam.z*s;ctx.fillStyle='#244c3330';ctx.beginPath();ctx.ellipse(px+7*z,py+3*z,10*z,5*z,0,0,7);ctx.fill();ctx.fillStyle='#927b50';ctx.fillRect(px-z,py-9*z,2*z,9*z);ctx.fillStyle='#548e59';ctx.beginPath();ctx.ellipse(px,py-13*z,8*z,10*z,0,0,7);ctx.fill();ctx.fillStyle='#74a966';ctx.beginPath();ctx.ellipse(px-2*z,py-17*z,6*z,6*z,0,0,7);ctx.fill();}
function drawTerrain(){
ctx.fillStyle='#8bc8c5';ctx.fillRect(0,0,view.w,view.h);const terrain=CITIES[state.city].terrain;
const topLeft=world(0,0),bottomRight=world(view.w,view.h),x0=Math.max(0,Math.floor(topLeft[0]-5)),x1=Math.min(300,Math.ceil(bottomRight[0]+5)),y0=Math.max(0,Math.floor(topLeft[1]-5)),y1=Math.min(300,Math.ceil(bottomRight[1]+8));
if(terrain==='island'){
const coast=[[-8,-12],[72,-12],[84,53],[105,91],[108,125],[96,153],[108,184],[88,225],[71,315],[315,315],[315,-12]].map(([x,y])=>screen(x+24,y));poly(coast,'#f1e0ad');poly(coast.map(([x,y])=>[x+15*cam.z,y]),'#9fbd82');
ctx.strokeStyle='#d0e9d68a';ctx.lineWidth=1;for(let yy=y0;yy<y1;yy+=5){const p=screen(80,yy);ctx.beginPath();ctx.moveTo(p[0]-45*cam.z,p[1]);ctx.quadraticCurveTo(p[0]-30*cam.z,p[1]-3,p[0]-18*cam.z,p[1]);ctx.stroke();}
}else{ctx.fillStyle=terrain==='mountain'?'#adc194':'#b4c99d';ctx.fillRect(0,0,view.w,view.h);if(terrain==='river'){ctx.strokeStyle='#93c9c4';ctx.lineWidth=12*T*cam.z;ctx.beginPath();for(let y=-10;y<=310;y+=4){const p=screen(112+Math.sin(y/29)*8,y);if(y===-10)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.stroke();}}
ctx.strokeStyle=debug||tool!=='hand'?'#4c743220':'#4c743207';ctx.lineWidth=.5;if(cam.z>.48)for(let y=y0;y<y1;y++){const a=screen(x0,y),b=screen(x1,y);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}if(cam.z>.48)for(let x=x0;x<x1;x++){ctx.beginPath();ctx.moveTo(...screen(x,y0));ctx.lineTo(...screen(x,y1));ctx.stroke();}
if(graphicQuality!=='low')for(let y=Math.floor(y0/3)*3;y<y1;y+=3)for(let x=Math.floor(x0/3)*3;x<x1;x+=3){const h=Math.abs(Math.sin(x*32.13+y*14.79)),tx=x+Math.sin(x*13+y)*1.1,ty=y+Math.cos(y*9+x)*.8,ix=Math.floor(tx),iy=Math.floor(ty);if(h<.67||!valid(ix,iy)||terrain==='island'&&tx<134||terrain==='river'&&Math.abs(tx-(112+Math.sin(ty/29)*8))<8)continue;if(state.footprint[id(ix,iy)]>=0||state.buildGrid[id(ix,iy)]>=0||(state.hiddenAutoTrees||[]).includes(id(ix,iy)))continue;tree(tx,ty,.6+h*.65);}
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
// Shared visual-only streetscape: no road graph, lanes, plots or prices change.
const roadsideVisualCache=new WeakMap();
function roadsideVisuals(roadState=state,roadDetails=junctionDetails){
 const stamp=[roadState.version,roadState.roads.size,...[...roadState.buildings.values()].map(b=>[b.id,b.x,b.y,b.rotation].join(','))].join(':');
 const cached=roadsideVisualCache.get(roadState);if(cached?.stamp===stamp&&cached.details===roadDetails)return cached.faces;
 const faces=[],layouts=new Map(),nearby=new Map(),hidden=new Set(),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 faces.plants=[];
 const margin=w=>Math.abs(w-ROADS.small.visualWidth)<.01?(roadClearanceWidth(ROADS.small)-w)/2:.14;
 const blockers=new Map(),gates=[];
 const indexRect=rect=>{for(let x=Math.floor(rect.x0/8);x<=Math.floor(rect.x1/8);x++)for(let y=Math.floor(rect.y0/8);y<=Math.floor(rect.y1/8);y++){const key=x+':'+y;if(!blockers.has(key))blockers.set(key,[]);blockers.get(key).push(rect);}};
 for(const b of roadState.buildings.values()){
  const t=CATALOG[b.key];if(!t)continue;const bounds=buildingBounds(b);
  indexRect({x0:b.x,y0:b.y,x1:b.x+bounds.w,y1:b.y+bounds.h,building:b.id});
  const n=DIR[((b.rotation||0)+1)%4],side=[-n[1],n[0]];
  for(const access of b.access||[]){
   const road=roadState.roads.get(access.node);if(!road)continue;
   const u=access.entry?(t.frontageEntranceU??.45):(t.frontageExitU??(t.dualParking?(access.zone==='A'?t.parkingExitA:t.parkingExitB):t.parkingExitU??t.plotWidth-.45));
   const p=lotPoint(b,u,t.plotHeight),x=p.x-.5,y=p.y-.5,rx=access.node%W,ry=Math.floor(access.node/W),half=roadVisualWidth(road.type)/2;
   const gap=(rx-x)*n[0]+(ry-y)*n[1]-half,width=t.compactCottage?.36:t.dualParking?.54:.72;
   const a=-.08,z=Math.max(.06,gap+.035),corners=[[-width/2,a],[width/2,a],[width/2,z],[-width/2,z]].map(([s,v])=>[x+side[0]*s+n[0]*v,y+side[1]*s+n[1]*v]);
   const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
   indexRect({x0:Math.min(...xs)-.035,y0:Math.min(...ys)-.035,x1:Math.max(...xs)+.035,y1:Math.max(...ys)+.035,gate:true});
   if(gap>1e-4)gates.push({corners,building:b.id});
  }
 }
 const clip=(poly,axis,value,less)=>{
  if(!poly.length)return [];const output=[];let a=poly[poly.length-1],ai=less?a[axis]<=value:a[axis]>=value;
  for(const b of poly){const bi=less?b[axis]<=value:b[axis]>=value;if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);output.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}if(bi)output.push(b);a=b;ai=bi;}
  return output;
 };
 const subtract=(poly,r)=>{
  let inside=poly;const outside=[];
  for(const [axis,value,less] of [[0,r.x0,false],[0,r.x1,true],[1,r.y0,false],[1,r.y1,true]]){
   const part=clip(inside,axis,value,!less);if(part.length>=3)outside.push(part);inside=clip(inside,axis,value,less);if(inside.length<3)break;
  }
  return outside;
 };
 const emit=(points,color,height,thickness,role,ignoreBuilding=null,driveway=false)=>{
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),obstacles=new Set();
  for(let x=Math.floor(x0/8);x<=Math.floor(x1/8);x++)for(let y=Math.floor(y0/8);y<=Math.floor(y1/8);y++)for(const r of blockers.get(x+':'+y)||[])if(!(r.building===ignoreBuilding||driveway&&r.gate)&&r.x0<x1&&r.x1>x0&&r.y0<y1&&r.y1>y0)obstacles.add(r);
  let parts=[points];for(const r of obstacles){parts=parts.flatMap(poly=>subtract(poly,r));if(!parts.length)return;}
  for(const poly of parts){let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];area+=a[0]*b[1]-a[1]*b[0];}if(Math.abs(area)>1e-7)faces.push({points:poly,color,height,thickness,role});}
 };
 const strip=(points,inner,outer,color,height,thickness,role)=>{
  const pairs=[];
  for(let i=0;i<points.length;i++){
   const a=points[Math.max(0,i-1)],p=points[i],b=points[Math.min(points.length-1,i+1)],ax=p[0]-a[0],ay=p[1]-a[1],bx=b[0]-p[0],by=b[1]-p[1],al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
   if(al<1e-8&&bl<1e-8){pairs.push(null);continue;}
   const na=al?[ay/al,-ax/al]:[by/bl,-bx/bl],nb=bl?[by/bl,-bx/bl]:na;
   let nx=na[0]+nb[0],ny=na[1]+nb[1],length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;const m=1/Math.max(.5,nx*nb[0]+ny*nb[1]);
   pairs.push([[p[0]+nx*inner*m,p[1]+ny*inner*m],[p[0]+nx*outer*m,p[1]+ny*outer*m]]);
  }
  for(let i=1;i<pairs.length;i++)if(pairs[i-1]&&pairs[i])emit([pairs[i-1][0],pairs[i][0],pairs[i][1],pairs[i-1][1]],color,height,thickness,role);
 };
 for(const [node] of roadState.roads){const l=roadDetails(node);if(!l)continue;for(const [a,b] of l.hiddenEdges||[])hidden.add(edgeKey(a,b));if(l.arms.length>=3||l.bend)layouts.set(node,l);}
 for(const l of layouts.values())for(let x=Math.floor(l.x-l.halfX-2);x<=Math.ceil(l.x+l.halfX+2);x++)for(let y=Math.floor(l.y-l.halfY-2);y<=Math.ceil(l.y+l.halfY+2);y++){const key=y*W+x;if(!nearby.has(key))nearby.set(key,[]);nearby.get(key).push(l);}
 for(const [i,r] of roadState.roads)for(const j of r.links){
  if(j<i||hidden.has(edgeKey(i,j)))continue;const x=i%W,y=Math.floor(i/W),nx=j%W,ny=Math.floor(j/W),dx=nx-x,dy=ny-y,len=Math.hypot(dx,dy);if(!len)continue;
  let wa=roadVisualWidth(r.type),wb=roadVisualWidth(roadState.roads.get(j)?.type),intervals=[[0,1]];
  for(const l of new Set([...(nearby.get(i)||[]),...(nearby.get(j)||[])])){
   const horizontal=Math.abs(dx)>Math.abs(dy),d=horizontal?((x+nx)/2>=l.x?0:2):((y+ny)/2>=l.y?1:3),arm=l.arms.find(a=>a.dir===d);
   if(!arm||(horizontal?Math.abs(y-l.y):Math.abs(x-l.x))>.01)continue;wa=wb=arm.width;
   let lo=0,hi=1;for(const [start,delta,min,max] of [[x,dx,l.x-l.halfX,l.x+l.halfX],[y,dy,l.y-l.halfY,l.y+l.halfY]]){if(Math.abs(delta)<1e-9){if(start<min||start>max)hi=-1;}else{const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}}
   if(hi>lo){const next=[];for(const [a,b] of intervals){if(hi<=a||lo>=b)next.push([a,b]);else{if(lo>a)next.push([a,lo]);if(hi<b)next.push([hi,b]);}}intervals=next;}
  }
  const px=-dy/len,py=dx/len,p=(t,offset)=>[x+dx*t+px*offset,y+dy*t+py*offset];
  for(const [lo,hi] of intervals)for(const sign of [-1,1]){
   const inner=t=>(wa+(wb-wa)*t)/2,outer=t=>inner(t)+margin(wa)+(margin(wb)-margin(wa))*t;
   const quad=(a,b,from,to)=>[p(a,sign*from(a)),p(b,sign*from(b)),p(b,sign*to(b)),p(a,sign*to(a))];
   const garden=r.type==='small'&&roadState.roads.get(j)?.type==='small'&&Math.abs(wa-ROADS.small.visualWidth)<.01&&Math.abs(wb-wa)<.01;
   if(garden){
    emit(quad(lo,hi,t=>inner(t)+.025,outer),'#b2b5aa',.115,.035,'sidewalk');
    emit(quad(lo,hi,inner,t=>inner(t)+.025),'#929b87',.13,.035,'curb');
    // Rounded hedge groups are set back from junction corners.
    if(.5-.46/len>=lo&&.5+.46/len<=hi){
     const [cx,cy]=p(.5,sign*(inner(.5)+(outer(.5)-inner(.5))*.56)),ux=dx/len,uy=dy/len;
     const hx=Math.abs(ux)*.47+Math.abs(px)*.16,hy=Math.abs(uy)*.47+Math.abs(py)*.16;
     let clear=true;
     for(let bx=Math.floor((cx-hx)/8);bx<=Math.floor((cx+hx)/8)&&clear;bx++)for(let by=Math.floor((cy-hy)/8);by<=Math.floor((cy+hy)/8)&&clear;by++)for(const r of blockers.get(bx+':'+by)||[])
      {const pad=r.gate?.08:.005;if(cx+hx>r.x0-pad&&cx-hx<r.x1+pad&&cy+hy>r.y0-pad&&cy-hy<r.y1+pad){clear=false;break;}}
     if(clear){
      const seed=(Math.imul(i+1,1664525)^Math.imul(j+17,1013904223)^(sign<0?0x51a3:0x1297))>>>0;faces.plants.push({x:cx,y:cy,ux,uy,angle:-Math.atan2(dy,dx),seed,flower:seed%3!==0});
      // Rounded mulch is tucked under the foliage, not a repeated rectangular tray.
      emit(Array.from({length:10},(_,n)=>{const a=n*Math.PI/5;return [cx+ux*Math.cos(a)*.39+px*Math.sin(a)*.12,cy+uy*Math.cos(a)*.39+py*Math.sin(a)*.12];}),'#687b58',.118,.008,'planting-bed');
     }
    }
   }else{
    emit(quad(lo,hi,t=>inner(t)+.055,outer),'#c6c9c4',.135,.045,'sidewalk');
    emit(quad(lo,hi,inner,t=>inner(t)+.055),'#e1dfd5',.16,.065,'curb');
    for(const t of [.25,.75])if(t>lo&&t<hi&&outer(t)-inner(t)>.20){const dt=Math.min(.006/len,(hi-lo)/5);emit(quad(t-dt,t+dt,t=>inner(t)+.06,outer),'#a4aca5',.138,.004,'sidewalk-joint');}
   }
  }
 }
 for(const l of layouts.values()){
  const w=Math.min(...l.arms.map(a=>margin(a.width)));
  for(const border of l.borders||[]){const points=border.map(([x,y])=>[l.x+x,l.y+y]);
   if(l.arms.every(a=>Math.abs(a.width-ROADS.small.visualWidth)<.01)){
    strip(points,.025,w,'#b2b5aa',.115,.035,'sidewalk');strip(points,0,.025,'#929b87',.13,.035,'curb');
   }else{strip(points,.055,w,'#c6c9c4',.135,.045,'sidewalk');strip(points,0,.055,'#e1dfd5',.16,.065,'curb');}
  }
 }
 for(const gate of gates)emit(gate.corners,'#58666a',.104,.025,'driveway',gate.building,true);
 roadsideVisualCache.set(roadState,{stamp,details:roadDetails,faces});return faces;
}
function drawRoads(roadState=state,roadDetails=junctionDetails){
 const state=roadState;
 const layouts=new Map(),nearby=new Map(),hidden=new Set(),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 for(const [node]of state.roads){const layout=roadDetails(node);for(const [a,b]of layout.hiddenEdges)hidden.add(edgeKey(a,b));if(layout.arms.length>=3||layout.bend)layouts.set(node,layout);}
 for(const l of layouts.values())for(let yy=Math.floor(l.y-l.halfY-2);yy<=Math.ceil(l.y+l.halfY+2);yy++)for(let xx=Math.floor(l.x-l.halfX-2);xx<=Math.ceil(l.x+l.halfX+2);xx++){const key=id(xx,yy);if(!nearby.has(key))nearby.set(key,[]);nearby.get(key).push(l);}
 const segments=[];
 for(const [i,r]of state.roads)for(const n of r.links){if(n<i||hidden.has(edgeKey(i,n)))continue;const [x,y]=xy(i),[nx,ny]=xy(n),dx=nx-x,dy=ny-y,length=Math.hypot(dx,dy),other=state.roads.get(n);let wa=roadVisualWidth(r.type),wb=roadVisualWidth(other?.type),intervals=[[0,1]];
 for(const l of new Set([...(nearby.get(i)||[]),...(nearby.get(n)||[])])){const horizontal=Math.abs(dx)>Math.abs(dy),d=horizontal?((x+nx)/2>=l.x?0:2):((y+ny)/2>=l.y?1:3),arm=l.arms.find(a=>a.dir===d);if(!arm||(horizontal?Math.abs(y-l.y):Math.abs(x-l.x))>.01)continue;wa=wb=arm.width;let lo=0,hi=1;for(const [start,delta,min,max]of [[x,dx,l.x-l.halfX,l.x+l.halfX],[y,dy,l.y-l.halfY,l.y+l.halfY]]){if(Math.abs(delta)<1e-9){if(start<min||start>max)hi=-1;}else{const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}}if(hi>lo){const next=[];for(const [a,b]of intervals){if(hi<=a||lo>=b)next.push([a,b]);else{if(lo>a)next.push([a,lo]);if(hi<b)next.push([hi,b]);}}intervals=next;}}
 const px=-dy/length,py=dx/length,point=(t,off)=>[x+dx*t+px*off,y+dy*t+py*off];segments.push({r,other,x,y,dx,dy,length,wa,wb,intervals,point});
 for(const [lo,hi]of intervals)for(const border of [.14,0]){const a=wa+(wb-wa)*lo,b=wa+(wb-wa)*hi;poly([point(lo,-a/2-border),point(hi,-b/2-border),point(hi,b/2+border),point(lo,a/2+border)].map(([x,y])=>screen(x+.5,y+.5)),border?'#c9c8b5':heat?roadColor(r):'#47565c');}}
 for(const l of layouts.values())poly(l.polygon.map(([x,y])=>screen(l.x+.5+x,l.y+.5+y)),'#47565c');
 // Purchased AI: illuminate only that intersection's center in 2D fallback.
 for(const [node,l]of layouts)if(state.signals.get(node)?.mode==='smart'){
  const [x,y]=screen(l.x+.5,l.y+.5);
  ctx.save();ctx.fillStyle='#36d4f466';ctx.strokeStyle='#9af4ff';ctx.lineWidth=Math.max(1,cam.z*1.5);
  ctx.beginPath();ctx.arc(x,y,Math.max(5,8*cam.z),0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.restore();
 }
 const roadside=roadsideVisuals(roadState,roadDetails);
 for(const face of roadside)poly(face.points.map(([x,y])=>screen(x+.5,y+.5)),face.color);
 for(const plant of roadside.plants||[]){
  const green=['#477b50','#568c57','#65975d','#73a563'];
  for(let n=0;n<4;n++){
   const along=[-.28,-.09,.11,.29][n],q=screen(plant.x+.5+plant.ux*along,plant.y+.5+plant.uy*along,.28+(n%2)*.025);
   ctx.fillStyle=green[(n+(plant.seed>>>6))%4];ctx.beginPath();ctx.ellipse(q[0],q[1],.15*T*cam.z,.125*T*cam.z,0,0,Math.PI*2);ctx.fill();
   if(plant.flower&&(n===1||n===3)){ctx.fillStyle=['#d97da2','#b28dd1','#e6bb56','#e89d78'][(plant.seed>>>8)%4];for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ctx.beginPath();ctx.arc(q[0]+Math.cos(a)*.035*T*cam.z,q[1]+Math.sin(a)*.027*T*cam.z,Math.max(.8,.027*T*cam.z),0,Math.PI*2);ctx.fill();}}
  }
 }
 const stroke=(points,color,width=.025,dashed=false)=>{if(points.length<2)return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(...screen(x+.5,y+.5)):ctx.moveTo(...screen(x+.5,y+.5)));ctx.strokeStyle=color;ctx.lineWidth=Math.max(.55,width*T*cam.z);ctx.lineJoin='round';ctx.lineCap='butt';ctx.setLineDash(dashed?[.45*T*cam.z,.55*T*cam.z]:[]);ctx.stroke();ctx.setLineDash([]);};
 const capacity=width=>Math.max(1,(Object.values(ROADS).find(t=>Math.abs(t.visualWidth-width)<.01)?.lanes||2)/2);
 for(const s of segments){const ca=capacity(s.wa),cb=capacity(s.wb);for(const [lo,hi]of s.intervals){const guide=(oa,ob,color,dashed=false)=>stroke([s.point(lo,oa+(ob-oa)*lo),s.point(hi,oa+(ob-oa)*hi)],color,color==='#ead78c'?.018:.025,dashed);for(const sign of [-1,1]){guide(.035*sign,.035*sign,'#ead78c');guide(s.wa/2*sign,s.wb/2*sign,'#dce3d8');for(let k=1;k<Math.max(ca,cb);k++)guide(Math.min(s.wa/2-.1,k*s.wa/(ca*2))*sign,Math.min(s.wb/2-.1,k*s.wb/(cb*2))*sign,'#dce3d8',true);}}}
 for(const l of layouts.values()){
 for(const edge of l.borders){const points=edge.map(([x,y])=>[l.x+x,l.y+y]);stroke(points,'#c9c8b5',.28);stroke(points,'#dce3d8');}
 if(l.bend){const [a,b]=l.ports,va=DIR[a.dir],vb=DIR[b.dir],ca=capacity(a.width),cb=capacity(b.width),guide=(oa,ob,color,dashed=false)=>{const ax=va[0]*a.extent-va[1]*oa,ay=va[1]*a.extent+va[0]*oa,bx=vb[0]*b.extent+vb[1]*ob,by=vb[1]*b.extent-vb[0]*ob,cx=a.dir%2===0?bx:ax,cy=a.dir%2===0?ay:by,points=[];for(let k=0;k<=64;k++){const t=k/64,u=1-t;points.push([l.x+u*u*ax+2*u*t*cx+t*t*bx,l.y+u*u*ay+2*u*t*cy+t*t*by]);}stroke(points,color,color==='#ead78c'?.018:.025,dashed);};for(const sign of [-1,1]){guide(.035*sign,.035*sign,'#ead78c');for(let k=1;k<Math.max(ca,cb);k++)guide(Math.min(a.width/2-.1,k*a.width/(ca*2))*sign,Math.min(b.width/2-.1,k*b.width/(cb*2))*sign,'#dce3d8',true);}}
 else if(cam.z>.4){for(const port of l.ports){const d=port.dir,[vx,vy]=DIR[d],px=-vy,py=vx,offset=port.extent+.13,point=(along,side)=>[l.x+vx*along+px*side,l.y+vy*along+py*side];stroke([point(offset,.06),point(offset,port.width/2-.06)],'#edf0df',.075);const [sx,sy]=screen(...point(offset,port.width/2+.3).map(v=>v+.5));ctx.fillStyle='#263e3a';ctx.fillRect(sx-2*cam.z,sy-4*cam.z,4*cam.z,8*cam.z);const light=signalColor(l.node,(d+2)%4);ctx.fillStyle=light==='green'?'#a4dc90':light==='yellow'?'#efd581':'#f08b75';ctx.beginPath();ctx.arc(sx,sy,1.7*cam.z,0,7);ctx.fill();}}
 }
 if(selected?.kind==='road'&&junction(selected.id)>=3){const [x,y]=xy(selected.id),p=screen(x+.5,y+.5);ctx.strokeStyle='#fff0a9';ctx.lineWidth=2.5*cam.z;ctx.beginPath();ctx.arc(p[0],p[1],Math.max(12,17*cam.z),0,Math.PI*2);ctx.stroke();}
 if(debug)for(const [i]of state.roads){const [x,y]=xy(i),p=screen(x+.5,y+.5);ctx.fillStyle='#fff';ctx.font=`${9*cam.z}px monospace`;ctx.fillText(String(occupancy(i)),p[0],p[1]);}
}

function roadColor(r){return r.wait>4?'#363b38':r.wait>1?'#e36351':r.load>.75?'#edaa51':r.load>.4?'#dbce68':'#67ab76';}
// Split phasing: one approach is green at a time, every lane from that approach.
const SIGNAL_YELLOW_MINUTES=1,SIGNAL_CLEAR_MINUTES=1,SIGNAL_MIN_GREEN=5,SIGNAL_MAX_GREEN=240;
const RECOMMENDED_SIGNAL_GREEN_MINUTES=6;
const AI_SIGNAL_PRICE=1000000,AI_MIN_GREEN=5,AI_MAX_GREEN=18,AI_POLL_MINUTES=.65;
let nextAISignalPoll=-Infinity;
// 'incoming' describes travel heading, so its source approach is opposite.
const SIGNAL_DIRECTION_NAMES=['จากทิศตะวันตก','จากทิศเหนือ','จากทิศตะวันออก','จากทิศใต้'];
const signalDefaults=()=>({...state.signalDefaults,mode:'auto',axis:0,holdUntil:0});
function signalSettings(i){return state.signals.get(i)||signalDefaults();}
function signalSlots(i){
 if(!state.roads.has(i)||junction(i)<3)return[];
 const cache=state.signalSlotCache??(state.signalSlotCache=new Map()),cached=cache.get(i);
 if(cached)return cached;
 const slots=[...junctionDetails(i).arms].sort((a,b)=>a.dir-b.dir).map(arm=>{
  const incoming=(arm.dir+2)%4;
  return{incoming,axis:incoming%2,lanes:laneCapacity(arm.node,incoming),node:arm.node};
 });
 cache.set(i,slots);return slots;
}
function signalDuration(setting,slot){return slot.axis===0?setting.eastWest:setting.northSouth;}
function signalCycle(i){const setting=signalSettings(i);return signalSlots(i).reduce((n,slot)=>n+(setting.mode==='smart'?12:signalDuration(setting,slot))+SIGNAL_YELLOW_MINUTES+SIGNAL_CLEAR_MINUTES,0);}
function signalProgress(i){const cycle=signalCycle(i);return cycle?(state.time+(i%17)*cycle/24)%cycle:0;}
function signalManualSlot(i,setting,slots=signalSlots(i)){
 if(!slots.length)return 0;
 if(setting.phaseModel==='approach'&&Number.isInteger(setting.slot)&&setting.slot>=0&&setting.slot<slots.length)return setting.slot;
 // v2.6.1's 'slot' was an individual lane. Convert its position using the
 // original sorted arm order and that arm's actual number of incoming lanes.
 if(Number.isInteger(setting.slot)&&setting.slot>=0){
  let total=0;
  for(let n=0;n<slots.length;n++){total+=slots[n].lanes;if(setting.slot<total)return n;}
 }
 return Math.max(0,slots.findIndex(slot=>slot.axis===setting.axis));
}
function signalStatus(i){
 const setting=signalSettings(i),slots=signalSlots(i),red=remaining=>({phase:-1,slotIndex:-1,incoming:-1,lane:-1,yellow:false,remaining});
 if(!slots.length)return red(null);
 if(setting.holdUntil>state.time)return red(setting.holdUntil-state.time);
 if(setting.mode==='smart'){
  const slotIndex=Number.isInteger(setting.smartSlot)?setting.smartSlot:-1;
  const slot=slots[slotIndex],remaining=Math.max(0,(setting.smartUntil??state.time)-state.time);
  if(setting.smartPhase==='green'&&slot)return{phase:slot.incoming,slotIndex,incoming:slot.incoming,lane:-1,yellow:false,remaining};
  if(setting.smartPhase==='yellow'&&slot)return{phase:4,slotIndex,incoming:slot.incoming,lane:-1,yellow:true,remaining};
  return red(remaining);
 }
 if(setting.mode==='manual'){
  const slotIndex=signalManualSlot(i,setting,slots),slot=slots[slotIndex];
  return{phase:slot.incoming,slotIndex,incoming:slot.incoming,lane:-1,yellow:false,remaining:null};
 }
 let elapsed=signalProgress(i);
 for(let n=0;n<slots.length;n++){
  const slot=slots[n],green=signalDuration(setting,slot);
  if(elapsed<green)return{phase:slot.incoming,slotIndex:n,incoming:slot.incoming,lane:-1,yellow:false,remaining:green-elapsed};
  elapsed-=green;
  if(elapsed<SIGNAL_YELLOW_MINUTES)return{phase:4,slotIndex:n,incoming:slot.incoming,lane:-1,yellow:true,remaining:SIGNAL_YELLOW_MINUTES-elapsed};
  elapsed-=SIGNAL_YELLOW_MINUTES;
  if(elapsed<SIGNAL_CLEAR_MINUTES)return red(SIGNAL_CLEAR_MINUTES-elapsed);
  elapsed-=SIGNAL_CLEAR_MINUTES;
 }
 return red(0);
}
function signalPhase(i){return signalStatus(i).phase;}
function signalColor(i,incoming,lane=0){const st=signalStatus(i);return st.incoming!==incoming?'red':st.yellow?'yellow':st.phase>=0?'green':'red';}
function signalAllows(i,incoming,lane=0){return signalColor(i,incoming,lane)==='green';}
function editSignal(i,changes){
 if(!state.roads.has(i)||junction(i)<3||signalSettings(i).mode==='smart')return false;
 const current=signalSettings(i),slots=signalSlots(i),oldSlot=signalManualSlot(i,current,slots),next={...current,...changes};
 if(changes.slot===undefined)next.slot=oldSlot;
 next.phaseModel='approach';
 if(!Number.isInteger(next.eastWest)||next.eastWest<SIGNAL_MIN_GREEN||next.eastWest>SIGNAL_MAX_GREEN||
 !Number.isInteger(next.northSouth)||next.northSouth<SIGNAL_MIN_GREEN||next.northSouth>SIGNAL_MAX_GREEN||
 !['auto','manual'].includes(next.mode)||![0,1].includes(next.axis)||
 !Number.isInteger(next.slot)||next.slot<0||next.slot>=slots.length)return false;
 next.holdUntil=next.mode!==current.mode||next.slot!==oldSlot||next.axis!==current.axis?
  state.time+SIGNAL_CLEAR_MINUTES:current.holdUntil;
 state.signals.set(i,next);return true;
}
function controlSignal(i,action){
 const settings=signalSettings(i),slots=signalSlots(i);if(!slots.length)return false;
 if(action==='manual'){
  const active=signalStatus(i),slot=active.slotIndex>=0?active.slotIndex:signalManualSlot(i,settings,slots);
  return editSignal(i,{mode:'manual',slot,axis:slots[slot].axis});
 }
 if(action==='switch'&&settings.mode==='manual'){
  const slot=(signalManualSlot(i,settings,slots)+1)%slots.length;
  return editSignal(i,{slot,axis:slots[slot].axis});
 }
 if(action==='auto')return editSignal(i,{mode:'auto'});
 return false;
}
function setSignalDefaults(eastWest,northSouth,applyExisting=false){
 if(!Number.isInteger(eastWest)||eastWest<SIGNAL_MIN_GREEN||eastWest>SIGNAL_MAX_GREEN||
 !Number.isInteger(northSouth)||northSouth<SIGNAL_MIN_GREEN||northSouth>SIGNAL_MAX_GREEN)return false;
 if(!applyExisting)for(const [node]of state.roads)if(junction(node)>=3&&!state.signals.has(node))state.signals.set(node,signalDefaults());
 state.signalDefaults={eastWest,northSouth};
 if(applyExisting)for(const [node]of state.roads)if(junction(node)>=3){
  const current=signalSettings(node);if(current.mode!=='smart')state.signals.set(node,{...current,eastWest,northSouth});
 }
 return true;
}
function restoreRecommendedSignals(){
 state.signalDefaults={eastWest:RECOMMENDED_SIGNAL_GREEN_MINUTES,northSouth:RECOMMENDED_SIGNAL_GREEN_MINUTES};
 let count=0;for(const [node]of state.roads)if(junction(node)>=3){
  if(signalSettings(node).mode!=='smart'){state.signals.set(node,{...signalDefaults(),holdUntil:state.time+SIGNAL_CLEAR_MINUTES});count++;}
 }
 return count;
}

// Shared AI initialization, used for purchases and the starter showcase.
function installAISignal(i){
 if(!state.roads.has(i)||junction(i)<3)return false;
 state.signals.set(i,{
  ...signalSettings(i),mode:'smart',phaseModel:'approach',holdUntil:0,
  smartPhase:'clear',smartSlot:-1,smartUntil:state.time+SIGNAL_CLEAR_MINUTES,
  smartSince:state.time,smartLast:signalSlots(i).map(()=>state.time-12)
 });
 nextAISignalPoll=-Infinity;
 return true;
}
function buyAISignal(i){
 if(!state.roads.has(i)||junction(i)<3){toast('ตำแหน่งนี้ไม่มีไฟแดงที่อัปเกรดได้ค่ะ');return false;}
 if(signalSettings(i).mode==='smart'){toast('ทางแยกนี้ติดตั้ง AI แล้วค่ะ');return false;}
 if(state.money<AI_SIGNAL_PRICE){toast('เงินเมืองไม่พอ ต้องมี 1,000,000 บาทเพื่อซื้อ AI ค่ะ');return false;}
 // One irreversible purchase for this junction; road demolition never refunds it.
 state.money-=AI_SIGNAL_PRICE;
 missionMoney('aiSignalInvestment',AI_SIGNAL_PRICE);
 installAISignal(i);
 updateUI();renderInspector(true);
 toast('ติดตั้ง AI ที่ทางแยกนี้แล้ว −฿1,000,000');
 return true;
}
function aiSignalQueuePressure(){
 // Time-sliced city scan, not a per-car/per-frame route search.
 const demands=new Map();
 for(const [node,setting]of state.signals)if(setting.mode==='smart'&&state.roads.has(node)&&junction(node)>=3)
  demands.set(node,signalSlots(node).map(()=>({cars:0,queued:0,blocked:0})));
 if(!demands.size)return demands;
 for(const v of state.vehicles.values()){
  if(!['driving','stuck','departing'].includes(v.phase)||!Array.isArray(v.path)||!v.path.length)continue;
  const start=Math.max(1,Math.floor(v.pos||0)),end=Math.min(v.path.length-1,start+9);
  for(let k=start;k<=end;k++){
   const node=v.path[k],entry=demands.get(node);
   if(!entry)continue;
   const incoming=motionDirection(v.path,k-1),idx=signalSlots(node).findIndex(slot=>slot.incoming===incoming);
   if(idx<0)continue;
   const q=entry[idx],distance=k-start,waiting=Number(v.wait)||0;
   q.cars+=distance<=2?2:1;
   if(waiting>1||v.phase==='stuck')q.queued+=Math.min(8,1+waiting/4);
   const next=v.path[k+1],out=state.roads.get(next);
   if(out&&(out.load>3||out.wait>6))q.blocked++;
   break; // Only the nearest AI junction on this trip.
  }
 }
 return demands;
}
function smartSignalStep(){
 if(state.time<nextAISignalPoll)return;
 nextAISignalPoll=state.time+AI_POLL_MINUTES;
 const demand=aiSignalQueuePressure(),now=state.time;
 for(const [node,queues]of demand){
  const st=state.signals.get(node),slots=signalSlots(node);
  if(!slots.length)continue;
  if(!Array.isArray(st.smartLast)||st.smartLast.length!==slots.length)st.smartLast=slots.map(()=>now-12);
  const index=Math.max(0,Math.min(slots.length-1,st.smartSlot??-1));
  if(st.smartPhase==='green'){
   const elapsed=Math.max(0,now-(st.smartSince??now));
   const current=queues[index],otherDemand=queues.some((q,j)=>j!==index&&q.cars>0);
   if(elapsed<AI_MIN_GREEN)continue;
   // Hold green to clear queues, but cap it so others aren't starved.
   if(elapsed<AI_MAX_GREEN&&current?.cars>0&&
    (!otherDemand||elapsed<AI_MIN_GREEN+Math.min(8,current.cars*.75))){
    st.smartUntil=now+AI_POLL_MINUTES;continue;
   }
   if(elapsed<8&&!otherDemand&&current?.cars===0){
    st.smartUntil=now+AI_POLL_MINUTES;continue;
   }
   st.smartPhase='yellow';st.smartUntil=now+SIGNAL_YELLOW_MINUTES;continue;
  }
  if(st.smartPhase==='yellow'){
   if(now<st.smartUntil)continue;
   st.smartPhase='clear';st.smartUntil=now+SIGNAL_CLEAR_MINUTES;continue;
  }
  if(now<st.smartUntil)continue;
  // Favor busy and long-waiting approaches; otherwise rotate.
  const last=st.smartSlot??-1;
  let winner=-1,top=-Infinity;
  for(let j=0;j<slots.length;j++){
   const q=queues[j],age=Math.max(0,now-(st.smartLast[j]??now)),rotate=(j-last+slots.length)%slots.length;
   const score=q.cars? q.cars*3+q.queued*2+Math.min(36,age)*.42-q.blocked*4
    : -25+rotate*.05;
   if(score>top){top=score;winner=j;}
  }
  if(!queues.some(q=>q.cars))winner=(last+1)%slots.length;
  if(winner===last&&slots.length>1&&queues.some((q,j)=>j!==last&&q.cars&&now-(st.smartLast[j]??now)>20))
   winner=queues.findIndex((q,j)=>j!==last&&q.cars&&now-(st.smartLast[j]??now)>20);
  st.smartPhase='green';st.smartSlot=winner;st.smartSince=now;
  st.smartUntil=now+AI_MIN_GREEN;st.smartLast[winner]=now;
 }
}
function openAISignalUpgrade(i){
 if(!state.roads.has(i)||junction(i)<3)return false;
 if(signalSettings(i).mode==='smart'){selected={kind:'road',id:i};renderInspector(true);return true;}
 const afford=state.money>=AI_SIGNAL_PRICE;
 modal('<div class="ai-checkout-v2"><header><div class="ai-checkout-icon">✦</div><small>SMCITY · AI TRAFFIC CONTROL</small><h2>อัปเกรดทางแยก AI</h2><p>ระบบควบคุมสัญญาณจราจรอัจฉริยะ</p></header>'+
 '<div class="ai-checkout-info"><span>แยกที่เลือก</span><strong>ติดตั้งระบบ AI 1 แยก</strong></div>'+
 '<div class="ai-checkout-info"><span>ราคาติดตั้ง</span><strong>'+money(AI_SIGNAL_PRICE)+'</strong></div>'+
 '<div class="ai-checkout-balance">งบประมาณหลังซื้อ <strong>'+money(state.money-AI_SIGNAL_PRICE)+'</strong></div>'+
 '<div class="ai-checkout-actions"><button type="button" id="cancelDialog">ยกเลิก</button>'+
 '<button type="button" id="confirmDialog" class="primary" '+(afford?'':'disabled')+'>ยืนยันการติดตั้ง</button></div>'+
 (!afford?'<p class="ai-checkout-warning">งบประมาณไม่เพียงพอค่ะ</p>':'')+'</div>');
 $('dialog').classList.add('ai-upgrade-center');
 $('cancelDialog').onclick=closeModal;
 $('confirmDialog').onclick=()=>{
  // Recheck balance and ownership at confirmation; only this action charges money.
  if(!state.roads.has(i)||junction(i)<3||signalSettings(i).mode==='smart'){
   toast('ทางแยกนี้เปลี่ยนแปลงไปแล้วค่ะ');closeModal();return;
  }
  if(buyAISignal(i))closeModal();
 };
 return true;
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

function stopProgress(v,pos){const node=v.path[pos],prev=v.path[Math.max(0,pos-1)];if(node==null||prev==null)return 0;const gap=Math.max(.05,1-TRAFFIC_RULES.stopLineOffset-TRAFFIC_RULES.vehicleHalfLength);return Math.min(.24,Math.max(.04,gap));}
function nextTurn(v,pos){for(let n=pos;n<Math.min(pos+4,v.path.length-2);n++){const d1=dir(v.path[n],v.path[n+1]),d2=dir(v.path[n+1],v.path[n+2]);if(d1!==d2)return(d2-d1+4)%4;}return 0;}
function occupancy(i){let n=0;for(let d=0;d<4;d++)for(let l=0;l<4;l++)if(state.occ.has(`${i}:${d}:${l}`))n++;return n;}
function drawBuilding(b,ghost=false){const plot=b;drawParking2D(plot);b=lotModel(plot);const t=CATALOG[b.key],k=KINDS[t.kind],s=b.visualSize||t.size,x=b.x,y=b.y,p=screen(x,y);if(p[0]<-180||p[0]>view.w+100||p[1]<-80||p[1]>view.h+180)return;ctx.save();if(ghost)ctx.globalAlpha=.62;
box(x+.06,y+.06,s-.12,s-.12,2,'#d9d7ba','#a3b38d','#bbc39e');
if(t.kind==='park'){box(x+.25,y+.25,s-.5,s-.5,3,'#8abb75','#739b66','#86aa72');poly([screen(x+.3,y+s*.45,4),screen(x+s-.3,y+s*.45,4),screen(x+s-.3,y+s*.63,4),screen(x+.3,y+s*.63,4)],'#e3d9b5');tree(x+s*.28,y+s*.3,1.1);tree(x+s*.73,y+s*.28,1.3);tree(x+s*.7,y+s*.8,.9);const f=screen(x+s*.45,y+s*.75,5);ctx.fillStyle='#d9d6b7';ctx.beginPath();ctx.ellipse(...f,9*cam.z,6*cam.z,0,0,7);ctx.fill();ctx.fillStyle='#83bfba';ctx.beginPath();ctx.ellipse(...f,6*cam.z,4*cam.z,0,0,7);ctx.fill();}
else{const tall=t.kind==='office'?s*8:t.kind==='mall'?s*4:t.kind==='home'?s*4+3:s*3.5,height=tall;const bx=x+.26,by=y+.3,bw=s-.55,bh=s-.8;const sh=[screen(bx+bw,by),screen(bx+bw+height/T*.65,by+.6),screen(bx+bw+height/T*.65,by+bh+.6),screen(bx,by+bh+.1)];poly(sh,'#294b3924');box(bx,by,bw,bh,height,k.color,'#76988d',t.kind==='home'?'#efdcb2':'#d9e1cf');
if(t.kind==='home'||t.kind==='restaurant'||t.kind==='pub'){const a=screen(bx-.1,by-.12,height),bb=screen(bx+bw+.1,by-.12,height),c=screen(bx+bw+.1,by+bh+.1,height),d=screen(bx-.1,by+bh+.1,height),m1=screen(bx-.1,by+bh*.46,height+8),m2=screen(bx+bw+.1,by+bh*.46,height+8);poly([a,bb,m2,m1],k.roof);poly([m1,m2,c,d],t.kind==='home'?'#e4a46c':k.roof);ctx.strokeStyle='#7f70514d';ctx.lineWidth=.65;for(let n=1;n<bw*3;n++){const xx=bx+n/3;ctx.beginPath();ctx.moveTo(...screen(xx,by+bh*.46,height+8));ctx.lineTo(...screen(xx,by+bh+.1,height));ctx.stroke();}}
else{box(bx+.15,by+.15,bw-.3,bh-.3,height+2,k.roof,'#64837e','#7a9890');if(t.kind==='office'||t.kind==='mall'){box(bx+bw*.4,by+.2,bw*.35,bh*.38,height+4,'#b7d1c4');}if(t.kind==='factory'){box(bx+bw*.7,by+.2,.35,.35,height+12,'#b9b99e','#77857a','#8b9a8a');}}
if(cam.z>.42){const floors=t.kind==='office'?Math.floor(s*1.3):1;for(let f=0;f<floors;f++)for(let w=0;w<Math.max(1,Math.floor(bw*1.4));w++){const px=bx+.2+w*.62,py=by+bh+.015;poly([screen(px,py,5+f*7),screen(px+.29,py,5+f*7),screen(px+.29,py,9+f*7),screen(px,py,9+f*7)],'#69979c');}if(['shop','restaurant'].includes(t.kind)){const py=by+bh+.08;for(let n=0;n<bw*4;n++){poly([screen(bx+n/4,py,8),screen(bx+(n+1)/4,py,8),screen(bx+(n+1)/4,py+.3,6),screen(bx+n/4,py+.3,6)],n%2?'#f6e7bc':k.roof);}}}
tree(x+s-.3,y+s-.3,.55);}

if(selected?.kind==='building'&&selected.id===b.id||ghost){ctx.strokeStyle=ghost?'#f6dc83':'#fff6b7';ctx.lineWidth=2;const bounds=buildingBounds(plot);poly([screen(plot.x,plot.y),screen(plot.x+bounds.w,plot.y),screen(plot.x+bounds.w,plot.y+bounds.h),screen(plot.x,plot.y+bounds.h)],null,ctx.strokeStyle);}
if(cam.z>1.1&&!ghost&&typeof document.createElement!=='function'){const p=screen(x+s*.5,y+s+.45);ctx.font=`500 ${Math.min(12,10*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.textAlign='center';ctx.fillStyle='#284a3e';ctx.fillText(t.name,p[0],p[1]);ctx.textAlign='start';}ctx.restore();}
function drawTechCarShape(x,y,angle,color,z,tech){
 if(tech==='smart'){
  ctx.save();ctx.shadowBlur=16*z;ctx.shadowColor='#40ddff';ctx.strokeStyle='#65e4ff';ctx.lineWidth=1.8*z;
  ctx.beginPath();ctx.ellipse(x,y,8*z,5*z,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(tech==='speed'){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.fillStyle='#f95029';ctx.beginPath();ctx.moveTo(6*z,0);ctx.lineTo(2*z,-1.45*z);ctx.lineTo(-4*z,-1.45*z);ctx.lineTo(-5*z,1.45*z);ctx.lineTo(2*z,1.45*z);ctx.closePath();ctx.fill();
  ctx.fillStyle='#263139';for(const xx of [-3.6,3.2])for(const yy of [-2.5,2.5])ctx.fillRect((xx-1.1)*z,(yy-.9)*z,2.2*z,1.8*z);
  ctx.fillStyle='#fe9a30';ctx.fillRect(4.4*z,-3.5*z,1.0*z,7*z);ctx.fillRect(-5.3*z,-3.5*z,1*z,7*z);
  ctx.fillStyle='#1f313d';ctx.fillRect(-.8*z,-.8*z,2.6*z,1.6*z);ctx.restore();return;
 }
 drawCarShape(x,y,angle,color,z);
}
function drawCarShape(x,y,angle,color,z){ctx.save();if(color==='#ffd127')z*=1.08;ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#173a3d40';ctx.fillRect(-5*z+2*z,-2.5*z+2*z,10*z,5*z);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-5*z,-2.4*z,10*z,4.8*z,1.4*z);ctx.fill();ctx.fillStyle='#466572';ctx.fillRect(0,-1.9*z,2.3*z,3.8*z);ctx.fillStyle='#dae7df';ctx.fillRect(-2.8*z,-1.9*z,2.2*z,3.8*z);ctx.fillStyle='#fff2b3';ctx.fillRect(3.5*z,-2.1*z,1*z,1*z);ctx.fillRect(3.5*z,1.1*z,1*z,1*z);ctx.restore();}
function drawVehicles(){for(const v of state.vehicles.values()){
 if(v.phase==='gate_waiting'||v.phase==='departing'&&!v.lotPath)continue;
 const pos=vehiclePosition(v);if(!pos)continue;
 const p=screen(pos.x,pos.y,(pos.altitude||0)*6.5);
 if(p[0]<-20||p[0]>view.w+20||p[1]<-20||p[1]>view.h+20)continue;
 if(v.phase==='warp_charge')for(const point of [v.airFrom,v.airTo]){
  if(!point)continue;const q=screen(point.x,point.y);
  ctx.save();ctx.fillStyle='#49d6ff33';ctx.strokeStyle='#a9efff';ctx.lineWidth=2*cam.z;
  ctx.fillRect(q[0]-7*cam.z,q[1]-95*cam.z,14*cam.z,95*cam.z);ctx.beginPath();ctx.arc(q[0],q[1],7*cam.z,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 drawTechCarShape(p[0],p[1],pos.angle,v.color,cam.z,v.vehicleTech);
}}
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
function vehiclePosition(v){
 if(v.vehicleTech==='fly'&&v.airFrom&&v.airTo){
  const f=v.airProgress||0,a=v.airFrom,b=v.airTo;
  if(v.phase==='air_lift')return{...a,altitude:Math.max(1.5,8*f)};
  if(v.phase==='air_cruise')return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,angle:Math.atan2((b.y-a.y)*.78,b.x-a.x),altitude:8};
  if(v.phase==='air_land')return{...b,altitude:Math.max(1.5,8*(1-f))};
 }
 if(v.phase==='warp_charge'&&v.airFrom)return{...v.airFrom,altitude:0};
 
 if(v.vehicleTech==='fly'&&v.phase==='departing'){const b=state.buildings.get(v.fromId);const p=b?parkingSlotPose(b,parkingSpace(b,v.citizenId)):null;return p?{...p,altitude:4}:null;}
 if(v.lotPath){const p=parkingPose(v);return v.vehicleTech==='fly'&&p?{...p,altitude:4}:p;}if(v.phase==='departing'){const b=state.buildings.get(v.fromId);return b?parkingSlotPose(b,parkingSpace(b,v.citizenId)):null;}if(v.phase==='stuck'&&v.heldPose)return v.heldPose;const ground=v.path?.length?positionOnMotion(motionPlan(v),motionDistance(v)):null;return v.vehicleTech==='fly'&&ground?{...ground,altitude:5}:ground;}
// Visual trip status only: never changes deadlines, happiness or vehicle motion.
const CAR_STATUS_COLORS={green:'#64c887',orange:'#efa54d',red:'#e36b6b'};
const CAR_STATUS_EMOJI={orange:'😥',red:'😡'};
function vehicleTimeliness(v,at=state.time){
 if(!v||!Number.isFinite(v.deadline))return 'green';
 const remaining=v.deadline-(v.arrivedAt??at);
 return remaining<0?'red':v.arrivedAt!=null?'green':remaining<=30?'orange':'green';
}
function normalizeSelectedCar(){
 if(selected?.kind==='vehicle'){
  const v=state.vehicles.get(selected.id);if(v){if(v.citizenId)selected.citizenId=v.citizenId;return;}
  const c=state.citizens.get(selected.citizenId),b=state.buildings.get(c?.locationId);
  if(c&&b?.parked.has(c.id))selected={kind:'parked',id:c.id,buildingId:b.id};
 }else if(selected?.kind==='parked'){
  const c=state.citizens.get(selected.id),v=state.vehicles.get(c?.vehicleId);
  if(v)selected={kind:'vehicle',id:v.id,citizenId:c.id};
 }
}
function selectedCarVehicle(){
 if(selected?.kind==='vehicle')return state.vehicles.get(selected.id)||null;
 if(selected?.kind==='parked')return state.vehicles.get(state.citizens.get(selected.id)?.vehicleId)||null;
 return null;
}
function trackingOrigin(v){const b=state.buildings.get(v.fromId);if(b)return `${CATALOG[b.key].name} #${b.id}`;const gate=state.gates.indexOf(v.fromGate);return gate>=0?'ประตูเมืองทิศ'+['เหนือ','ตะวันออก','ใต้','ตะวันตก'][gate]:'จุดเริ่มเส้นทาง';}
function trackingEndpoint(v,origin=false){
 const b=state.buildings.get(origin?v.fromId:v.toId);
 if(b){const t=CATALOG[b.key];return {point:lotPoint(b,t.plotWidth/2,t.plotHeight/2),name:origin?trackingOrigin(v):trackingDestination(v)};}
 const node=(origin?v.fromGate:v.toGate)??v.path?.[origin?0:v.path.length-1];if(node==null)return null;
 const [x,y]=xy(node);return {point:{x:x+.5,y:y+.5},name:origin?trackingOrigin(v):trackingDestination(v)};
}
let canvasCarMarkerHits=[];
let carStatusDiamondsVisible=false;
function drawCarIndicators2D(){
 canvasCarMarkerHits=[];
 const add=(pose,v,cid,buildingId=null)=>{
  if(!pose)return;const p=screen(pose.x,pose.y,(pose.altitude||0)*6.5);if(p[0]<-15||p[0]>view.w+15||p[1]<-20||p[1]>view.h+20)return;
  const focus=v?selected?.kind==='vehicle'&&selected.id===v.id:selected?.kind==='parked'&&selected.id===cid;
  if(focus){ctx.save();ctx.translate(...p);ctx.rotate(pose.angle);ctx.strokeStyle='#ffffff';ctx.lineWidth=1.2;ctx.strokeRect(-6*cam.z,-3.5*cam.z,12*cam.z,7*cam.z);ctx.restore();}
  if(!carStatusDiamondsVisible)return;
  const emoji=CAR_STATUS_EMOJI[vehicleTimeliness(v)];if(!emoji)return;
  const size=Math.min(18,Math.max(12,cam.z*12)),x=p[0],y=p[1]-5*cam.z-size*.5-3;
  ctx.save();ctx.font=size+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,x,y);ctx.restore();
  canvasCarMarkerHits.push({x,y,selection:v?{kind:'vehicle',id:v.id,citizenId:v.citizenId}:{kind:'parked',id:cid,buildingId}});
 };
 for(const v of state.vehicles.values())if(['driving','stuck','parking_in','parking_out','air_lift','air_cruise','air_land','warp_charge'].includes(v.phase)||v.phase==='departing'&&v.lotPath)add(vehiclePosition(v),v,v.citizenId);
 for(const b of state.buildings.values())for(const cid of b.parked)if(!parkingIsMoving(cid)){const index=b.parkingSlots.indexOf(cid);if(index>=0)add(parkingSlotPose(b,index),state.vehicles.get(state.citizens.get(cid)?.vehicleId),cid,b.id);}
}
// Read-only overlay: sample the same lane plan used by vehicle movement.
const trackingSamples=new WeakMap();
function trackingRoute(v){
 if(v?.airFrom&&v?.airTo){
  const at=vehiclePosition(v)||v.airFrom;
  return [at,v.airTo];
 }
 if(!v?.path?.length||missingRoute(v))return [];
 const lot=[];
 if(v.lotPath){
  const total=lotPathLength(v.lotPath),start=v.lotDistance||0;
  for(let d=start;d<total;d+=.14)lot.push(lotPathPose(v.lotPath,d));lot.push(lotPathPose(v.lotPath,total));
  if(v.phase==='parking_in')return lot;
 }
 const plan=motionPlan(v),start=motionDistance(v,plan),pose=vehiclePosition(v);if(!pose)return lot;
 let samples=trackingSamples.get(plan);
 if(!samples){samples=[];for(let s=0;s<plan.total;s+=.4)samples.push({s,...positionOnMotion(plan,s)});samples.push({s:plan.total,...positionOnMotion(plan,plan.total)});trackingSamples.set(plan,samples);}
 if(lot.length)return [...lot,positionOnMotion(plan,0),...samples.filter(p=>p.s>0)];
 if(v.phase==='departing')return samples;
 const planned=positionOnMotion(plan,start);if(v.phase==='stuck'&&Math.hypot(pose.x-planned.x,pose.y-planned.y)>.25)return [];
 return [pose,...samples.filter(p=>p.s>start+1e-6)];
}
function trackingDestination(v){const b=state.buildings.get(v.toId);return b?`${CATALOG[b.key].name} #${b.id}`:v.kind==='pass'?'ทางออกเมือง':'ปลายทาง';}
let trackingLayer=null,trackingNodes=new Map(),trackingAt=-Infinity;
function updateTrackingOverlay(){
 const focusedVehicle=selectedCarVehicle()||state.vehicles.get(follow),enabled=tool==='tracking'||!!focusedVehicle;
 if(trackingLayer)trackingLayer.style.display=enabled?'block':'none';
 if(!enabled){trackingAt=-Infinity;return;}
 const now=performance.now();if(now-trackingAt<100)return;trackingAt=now;
 const ns='http://www.w3.org/2000/svg';
 if(!trackingLayer){trackingLayer=document.createElementNS(ns,'svg');trackingLayer.setAttribute('aria-hidden','true');Object.assign(trackingLayer.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'0',overflow:'hidden'});canvas.insertAdjacentElement('afterend',trackingLayer);}
 const visible=new Set(),project=p=>screen(p.x-(renderer3d?.5:0),p.y-(renderer3d?.5:0));
 for(const v of state.vehicles.values()){
  const focused=focusedVehicle?.id===v.id;
  if(!focused&&tool!=='tracking'||!focused&&!['driving','stuck'].includes(v.phase))continue;
  visible.add(v.id);let item=trackingNodes.get(v.id);
  if(!item){
   const group=document.createElementNS(ns,'g'),path=document.createElementNS(ns,'polyline');path.setAttribute('fill','none');path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');group.append(path);trackingLayer.appendChild(group);item={group,path,ends:[]};trackingNodes.set(v.id,item);
   for(let n=0;n<2;n++){
    const circle=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');circle.setAttribute('r','3');circle.setAttribute('stroke','#ffffff');circle.setAttribute('stroke-width','1');
    Object.assign(label.style,{fontSize:'10px',fontFamily:'Noto Sans Thai, Tahoma, sans-serif',paintOrder:'stroke',stroke:'#29443a',strokeWidth:'2.5px',fill:'#ffffff'});group.append(circle,label);item.ends.push({circle,label});
   }
  }
  const points=trackingRoute(v).map(project);item.path.setAttribute('points',points.map(p=>p.join(',')).join(' '));item.path.setAttribute('stroke',focused?'#ffffff':`hsl(${(v.id*137.508)%360} 95% 72%)`);item.path.setAttribute('stroke-width',focused?'2':'1.5');item.path.setAttribute('opacity',focused?'.92':'.55');
  for(let n=0;n<2;n++){
   const endpoint=focused?trackingEndpoint(v,n===0):null,parts=item.ends[n];parts.circle.style.display=parts.label.style.display=endpoint?'':'none';if(!endpoint)continue;
   const p=project(endpoint.point),right=p[0]>view.w*.72;parts.circle.setAttribute('cx',p[0]);parts.circle.setAttribute('cy',p[1]);parts.circle.setAttribute('fill',n?'#75cfa5':'#bac8c2');
   parts.label.setAttribute('x',p[0]+(right?-7:7));parts.label.setAttribute('y',p[1]-7);parts.label.setAttribute('text-anchor',right?'end':'start');parts.label.textContent=(n?'ปลายทาง · ':'ต้นทาง · ')+endpoint.name;
  }
  if(focused)trackingLayer.appendChild(item.group);
 }
 for(const [id,item]of trackingNodes)if(!visible.has(id)){item.group.remove();trackingNodes.delete(id);}
}

function buildingTraffic(b,incoming=null){
 const t=CATALOG[b.key];let approaching=0,inside=0;
 if(incoming){const count=incoming.get(b.id);if(typeof count==='number')approaching=count;else if(count){approaching=count.approaching;inside=count.inside;}}
 else for(const v of state.vehicles.values())if(v.toId===b.id){if(v.arrivedAt!=null){if(!b.parked.has(v.citizenId))inside++;}else approaching++;}
 return{name:t.name,approaching,parked:b.parked.size,arrived:b.parked.size+inside,max:t.beds||t.residents||t.jobs+t.service};
}
function buildingGaugeMetrics(b,approaching){
 const t=CATALOG[b.key];
 const used=t.service?b.visitors.size:t.residents?b.residents.size:b.workers.size;
 return serviceGaugeMetrics({traveling:approaching,used,capacity:t.service||t.residents||t.jobs});
}
let placeLabelLayer=null,placeLabelState=null,placeLabels=new Map(),placeLabelCounts=new Map(),placeLabelAt=0,placeLabelProjectionKey=null,routeWarningMarkers=new Map(),buildingLabelsVisible=false;
const NO_ROUTE_TIMEOUT=150;
const IMMOBILE_RESPAWN_TIMEOUT=150;
function missingRoute(v){return !!v&&(!!v.departureNoRoute||v.phase==='stuck'&&v.routeMissing!==false&&!/พบเส้นทางแล้ว/.test(v.stopReason||''));}
function setRouteMissing(v,missing){if(missing){if(v.routeMissing===false||!Number.isFinite(v.routeMissingSince))v.routeMissingSince=state.time;v.routeMissing=true;}else{v.routeMissing=false;v.routeMissingSince=null;}}
// Incident gameplay: detect the stopped root, not the queue behind it.
// This is diagnostic sampling, never a second vehicle simulation loop.
const INCIDENT_STALL_MINUTES=12,INCIDENT_LOG_KEY='smcity-manual-incident-log-v1';
const INCIDENT_REWARD_BAHT=5000,INCIDENT_REWARD_DAILY_LIMIT=3;
let incidentCases=new Map(),incidentForVehicle=new Map(),incidentScanAt=-Infinity;
let incidentMarkerLayer=null,incidentMarkers=new Map(),incidentRenderAt=0;
function incidentPosition(v){return vehiclePosition(v);}
function incidentStoppedFor(v){return Math.max(0,state.time-(Number.isFinite(v.lastMovedAt)?v.lastMovedAt:state.time));}
function incidentNearby(positions,pose){const near=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
 const key=(Math.floor(pose.x/2)+dx)+','+(Math.floor(pose.y/2)+dy);
 for(const item of positions.get(key)||[])if(Math.hypot(item.pose.x-pose.x,item.pose.y-pose.y)<2.8)near.push(item);
}return near;}
function scanIncidents(force=false){
 if(!state)return;
 if(!force&&state.time-incidentScanAt<3&&incidentScanAt<=state.time)return;
 incidentScanAt=state.time;const positions=new Map(),candidates=new Map(),stopped=[];
 for(const v of state.vehicles.values()){
  if(!['driving','stuck','parking_in','parking_out','departing','gate_waiting'].includes(v.phase))continue;
  const pose=incidentPosition(v);if(!pose)continue;
  const item={v,pose,stalled:incidentStoppedFor(v)};
  const key=Math.floor(pose.x/2)+','+Math.floor(pose.y/2);
  if(!positions.has(key))positions.set(key,[]);positions.get(key).push(item);
  if(item.stalled>=INCIDENT_STALL_MINUTES)stopped.push(item);
 }
 for(const item of stopped){
  const {v,pose,stalled}=item;
  if(v.kind==='pass'&&v.phase==='gate_waiting')continue;
  const noRoute=missingRoute(v),parking=['parking_in','parking_out'].includes(v.phase)||v.phase==='departing'&&!!v.fromId;
  const near=incidentNearby(positions,pose).filter(o=>o.v.id!==v.id);
  const overlapped=near.filter(o=>o.stalled>=INCIDENT_STALL_MINUTES&&Math.hypot(o.pose.x-pose.x,o.pose.y-pose.y)<.52&&o.v.phase!=='gate_waiting');
  const heading={x:pose.dx??Math.cos(pose.angle||0),y:pose.dy??Math.sin(pose.angle||0)};
  const followerOf=near.find(o=>{
   const dx=o.pose.x-pose.x,dy=o.pose.y-pose.y;
   return (dx*heading.x+dy*heading.y)>.30&&dx*heading.x+dy*heading.y<2.2&&Math.abs(dx*heading.y-dy*heading.x)<.60&&o.stalled>=INCIDENT_STALL_MINUTES;
  });
  // Vehicles queued behind another stationary car are not independent incidents.
  // Exact overlaps, cycles and missing routes are exceptions.
  if(followerOf&&!overlapped.length&&!noRoute)continue;
  if(!noRoute&&!overlapped.length&&stalled<INCIDENT_STALL_MINUTES)continue;
  if(!noRoute&&v.phase==='gate_waiting'&&!overlapped.length)continue;
  if(!noRoute&&/^(ไฟแดง|คิวแยก)$/.test(v.stopReason||'')&&!overlapped.length)continue;
  const related=overlapped.map(o=>o.v.id);
  if(v.mergeEscapeId&&state.vehicles.has(v.mergeEscapeId)&&incidentStoppedFor(state.vehicles.get(v.mergeEscapeId))>=INCIDENT_STALL_MINUTES)related.push(v.mergeEscapeId);
  candidates.set(v.id,{id:v.id,related,reason:noRoute?'ไม่มีเส้นทาง':overlapped.length?'รถทับซ้อนหรือแย่งช่องทาง':parking?'รถค้างในลานจอด / ทางออก':'รถหยุดผิดปกติ',place:parking?'ลานจอด':'ถนน',stalled});
 }
 // Merge only directly competing cars, never a complete stopped queue.
 const nextCases=new Map(),nextByVehicle=new Map(),seen=new Set();
 for(const c of candidates.values()){
  if(seen.has(c.id))continue;
  const members=[],stack=[c.id];
  while(stack.length&&members.length<8){const id=stack.pop();if(seen.has(id)||!state.vehicles.has(id))continue;
   seen.add(id);members.push(id);
   const entry=candidates.get(id);
   for(const linked of entry?.related||[])if(candidates.has(linked)&&!seen.has(linked))stack.push(linked);
  }
  if(!members.length)continue;members.sort((a,b)=>a-b);
  const root=members[0],entry=candidates.get(root)||c;
  const incident={id:root,vehicles:members,reason:entry.reason,place:entry.place,stalled:Math.max(...members.map(i=>incidentStoppedFor(state.vehicles.get(i))))};
  nextCases.set(root,incident);for(const id of members)nextByVehicle.set(id,incident);
 }
 incidentCases=nextCases;incidentForVehicle=nextByVehicle;
}
function incidentSummaryVehicle(v){
 if(!v)return null;const pose=incidentPosition(v);
 return{id:v.id,citizenId:v.citizenId??null,phase:v.phase,kind:v.kind,fromId:v.fromId??null,toId:v.toId??null,
  lotBuilding:v.lotBuilding??null,lotDistance:v.lotDistance??null,wait:v.wait??0,stalledMinutes:incidentStoppedFor(v),reason:v.stopReason||'',
  pose:pose?{x:+pose.x.toFixed(3),y:+pose.y.toFixed(3),angle:pose.angle??0}:null,
  node:v.path?.[v.pos]??null,lane:v.lane??null,path:(v.path||[]).slice(0,160),position:v.pos??0};
}
function incidentReservations(ids){const set=new Set(ids),found=[];
 for(const [key,record]of state.reservations){
  const passes=record.passes||[record];if(!passes.some(p=>set.has(p.id)))continue;
  found.push({key,owners:passes.map(p=>({id:p.id,until:p.until??null}))});if(found.length>=30)break;
 }return found;
}
// Grouped overlapping stopped cars are presented as an accident; other blocked cars as breakdowns.
function incidentEventType(incident){
 const cars=incident.vehicles.map(id=>state.vehicles.get(id)).filter(Boolean);
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
  const a=incidentPosition(cars[i]),b=incidentPosition(cars[j]);
  if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)<.52)return 'collision';
 }
 return 'breakdown';
}
function incidentRewardStatus(){
 const day=Math.floor(state.time/1440),prev=state.incidentRewards||{};
 const count=prev.day===day?Math.min(INCIDENT_REWARD_DAILY_LIMIT,Math.max(0,Math.floor(prev.count||0))):0;
 return {day,count,available:count<INCIDENT_REWARD_DAILY_LIMIT};
}
function openTrafficIncident(vehicleId){
 scanIncidents(true);
 const incident=incidentForVehicle.get(vehicleId);
 if(!incident){toast('เหตุการณ์นี้สิ้นสุดแล้วค่ะ');return false;}
 const crash=incidentEventType(incident)==='collision',reward=incidentRewardStatus();
 const title=crash?'💥 รถชน!':'🚨 รถเสีย!';
 const detail=crash?'เกิดเหตุรถชนหรือทับซ้อน กีดขวางการจราจร ต้องการส่งเจ้าหน้าที่เข้าช่วยเหลือหรือไม่?':'พบรถหยุดนิ่งผิดปกติกีดขวางการจราจร ต้องการส่งเจ้าหน้าที่เข้าช่วยเหลือหรือไม่?';
 const award=reward.available?'ช่วยเหลือ +'+money(INCIDENT_REWARD_BAHT):'ช่วยเหลือ (ไม่มีเงินรางวัล)';
 const note=reward.available?'<p>เงินสนับสนุนการช่วยเหลือ <b>+'+money(INCIDENT_REWARD_BAHT)+'</b> · เหลือสิทธิ์ '+(INCIDENT_REWARD_DAILY_LIMIT-reward.count)+' เหตุการณ์วันนี้</p>':'<p>วันนี้รับเงินสนับสนุนครบ '+INCIDENT_REWARD_DAILY_LIMIT+' เหตุการณ์แล้ว แต่ยังส่งเจ้าหน้าที่ช่วยเหลือได้ค่ะ</p>';
 modal('<span class="eyebrow">TRAFFIC EMERGENCY</span><h2>'+title+'</h2><p>'+detail+'</p><p>บริเวณ: '+escapeSaveText(incident.place)+' · รถต้นเหตุ '+incident.vehicles.length+' คัน</p>'+note+'<div class="actions"><button class="primary" id="incidentHelpBtn">'+award+'</button><button id="incidentIgnoreBtn">นิ่งเฉย</button></div>');
 $('incidentHelpBtn').onclick=()=>{
  $('incidentHelpBtn').disabled=true;
  if(resolveIncident(vehicleId))closeModal();
  else{closeModal();toast('เหตุการณ์เปลี่ยนไปแล้ว ตรวจสอบรถอีกครั้งค่ะ');}
 };
 $('incidentIgnoreBtn').onclick=closeModal;
 return true;
}
let incidentLogMemory=null;
function manualIncidentLogs(){
 if(incidentLogMemory===null){try{const value=JSON.parse(localStorage.getItem(INCIDENT_LOG_KEY)||'[]');incidentLogMemory=Array.isArray(value)?value:[];}catch{incidentLogMemory=[];}}
 return incidentLogMemory.map(e=>({...e}));
}
function saveManualIncidentCache(list){
 // Keep the upload queue alive even when browser storage is full or blocked.
 incidentLogMemory=list.slice(0,80).map(e=>({...e}));
 try{localStorage.setItem(INCIDENT_LOG_KEY,JSON.stringify(incidentLogMemory));return true;}catch{return false;}
}
function normalizeManualIncidentLogs(){
 const logs=manualIncidentLogs();let changed=false;
 for(const entry of logs)if(!entry.eventId){entry.eventId=crypto.randomUUID();changed=true;}
 if(changed)saveManualIncidentCache(logs);
 return logs;
}
function markIncidentLocal(eventId,patch){
 const logs=manualIncidentLogs(),entry=logs.find(e=>e.eventId===eventId);
 if(entry){Object.assign(entry,patch);saveManualIncidentCache(logs);}
}
let incidentCloudSyncing=null;
function syncManualIncidentLogs(){
 const account=window.SMGameAccount,user=account?.user;
 if(incidentCloudSyncing)return incidentCloudSyncing;
 if(!user||typeof account.saveIncidentLog!=='function')return Promise.resolve(false);
 incidentCloudSyncing=Promise.resolve().then(async()=>{
 try{
  for(let i=0;i<80;i++){
   if(account.user?.id!==user.id)break;
   const entry=normalizeManualIncidentLogs().slice().reverse().find(e=>!e.cloudSyncedFor&&(!e.userId||e.userId===user.id));
   if(!entry)break;
   markIncidentLocal(entry.eventId,{userId:user.id});
   await account.saveIncidentLog({...entry,userId:user.id});
   markIncidentLocal(entry.eventId,{cloudSyncedFor:user.id});
  }
 }catch(error){console.warn('SMCITY incident log cloud sync:',error);}
 finally{incidentCloudSyncing=null;}
 });
 return incidentCloudSyncing;
}
function writeManualIncidentLog(entry){
 try{
  entry.eventId=crypto.randomUUID();
  entry.userId=window.SMGameAccount?.user?.id||null;
  const list=normalizeManualIncidentLogs();list.unshift(entry);
  const saved=saveManualIncidentCache(list);
  if(entry.userId)void syncManualIncidentLogs().then(()=>{
   if(window.SMGameAccount?.user?.id!==entry.userId)return;
   const synced=manualIncidentLogs().some(e=>e.eventId===entry.eventId&&e.cloudSyncedFor===entry.userId);
   toast(synced?'บันทึก Log เข้า Supabase แล้ว':'ส่ง Log เข้า Supabase ไม่สำเร็จ · กดซิงก์ในดู Log เพื่อลองอีกครั้ง');
  });
  return saved;
 }catch(error){console.warn('Local incident log:',error);return false;}
}
function resolveIncident(id){
 scanIncidents(true);const found=incidentForVehicle.get(id);
 if(!found)return false;
 const ids=found.vehicles.filter(cid=>state.vehicles.has(cid));if(!ids.length)return false;
 const before=ids.map(cid=>incidentSummaryVehicle(state.vehicles.get(cid)));
 const reservations=incidentReservations(ids),outcomes=[],eventType=incidentEventType(found);
 // Clear only the incident's own reservations and vehicles. Following traffic is untouched.
 for(const cid of ids){const v=state.vehicles.get(cid);if(!v)continue;
  const initial=v.phase;let method='ยกรถต้นเหตุออก';
  // A found forward route is only accepted when there is physical clearance NOW.
  if(initial==='stuck'){
   if(recoverVehicle(v,true)&&v.phase==='driving'&&!missingRoute(v)){
    const plan=motionPlan(v),d=motionDistance(v,plan),probe=physicalTrafficLimit(v,plan,d,.12);
    const pos=incidentPosition(v),physicalConflict=pos&&[...state.vehicles.values()].some(other=>{
     if(other.id===v.id||other.phase==='gate_waiting'||other.phase==='departing'&&!other.lotPath)return false;
     const p=incidentPosition(other);return p&&Math.hypot(pos.x-p.x,pos.y-p.y)<.72&&lotCarsOverlap(pos,p,.015);
    });
    if((probe===Infinity||probe>d+.08)&&!physicalConflict){method='เปลี่ยนเส้นทางและออกตัว';v.lastMovedAt=state.time;}
   }
  }
  if(method!=='เปลี่ยนเส้นทางและออกตัว')towVehicle(cid,true);
  outcomes.push({id:cid,method,remaining:state.vehicles.has(cid)});
 }
 // Clear any root that still has a detected issue; do not pay for a failed intervention.
 scanIncidents(true);
 for(const cid of ids)if(incidentForVehicle.has(cid)&&towVehicle(cid,true)){
  const outcome=outcomes.find(o=>o.id===cid);
  if(outcome){outcome.method='ยกรถต้นเหตุออก (ตรวจซ้ำ)';outcome.remaining=false;}
 }
 scanIncidents(true);
 if(ids.some(cid=>incidentForVehicle.has(cid))){toast('เหตุการณ์ยังไม่สิ้นสุดค่ะ');return false;}
 const reward=incidentRewardStatus(),awarded=reward.available?INCIDENT_REWARD_BAHT:0;
 if(awarded){state.money+=awarded;missionMoney('incidentReward',awarded);state.incidentRewards={day:reward.day,count:reward.count+1};}
 const entry={format:'SMCITY-manual-incident',version:2,at:new Date().toISOString(),city:state.city,gameTime:state.time,
  eventType,award:awarded,reason:found.reason,place:found.place,vehicles:before,reservationsBefore:reservations,
  outcomes,reservationsAfter:incidentReservations(ids)};
 const stored=writeManualIncidentLog(entry);
 selected=null;$('inspector').classList.add('hidden');updateUI();
 toast((eventType==='collision'?'รถชน':'รถเสีย')+' · ช่วยเหลือสำเร็จ '+ids.length+' คัน'+(awarded?' · ได้รับ '+money(awarded):' · ครบโควตารางวัลวันนี้แล้ว')+(entry.userId?' · กำลังส่ง Log เข้า Supabase…':stored?' · บันทึก Log ในเครื่องแล้ว':' · Log อยู่ชั่วคราวในหน้านี้ · เบราว์เซอร์ไม่อนุญาตให้บันทึก'));
 return true;
}
function exportManualIncidentLogs(logs=normalizeManualIncidentLogs()){
 const payload={format:'SMCITY-manual-incidents',version:2,exportedAt:new Date().toISOString(),events:logs};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='SMCITY-manual-incidents-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function incidentLogListMarkup(logs){
 return logs.slice(0,50).map((e,i)=>'<div style="padding:9px 0;border-bottom:1px solid #dce4de"><strong>#'+(logs.length-i)+' · '+(e.eventType==='collision'?'รถชน':e.eventType==='breakdown'?'รถเสีย':escapeSaveText(e.place||'เหตุจราจร'))+'</strong><p>'+escapeSaveText(e.reason||'')+' · '+(e.vehicles?.length||0)+' คัน · วันที่ '+escapeSaveText(new Date(e.at).toLocaleString('th-TH'))+' · เงินช่วยเหลือ '+money(e.award||0)+'</p><details><summary>รายละเอียดการระงับเหตุ</summary><p>'+escapeSaveText((e.outcomes||[]).map(x=>'รถ #'+x.id+': '+x.method).join(' · '))+'</p></details></div>').join('');
}
function openManualIncidentLog(){
 const account=window.SMGameAccount,user=account?.user,userId=user?.id;
 const local=normalizeManualIncidentLogs().filter(e=>!e.userId||e.userId===userId);
 let displayed=local;
 const status=user?'กำลังเชื่อม Supabase…':'กำลังเล่นแบบผู้เยี่ยมชม: Log จะเก็บในเครื่องและซิงก์เมื่อเข้าสู่ระบบ';
 modal('<span class="eyebrow">TRAFFIC INCIDENT LOG</span><h2>ดู Log รายงาน</h2><p>บันทึกเฉพาะเหตุที่ผู้เล่นกดช่วยเหลือ ไม่รวมเหตุที่ระบบแก้อัตโนมัติ</p><p id="incidentCloudStatus">'+status+'</p><p><b id="incidentLogCount">ระงับแล้ว '+local.length+' เหตุการณ์</b></p><div id="incidentLogRows">'+(incidentLogListMarkup(local)||'<p>ยังไม่มีประวัติการช่วยเหลือค่ะ</p>')+'</div><div class="actions"><button class="primary" id="downloadIncidentLogs">ส่งออก JSON</button><button id="syncIncidentLogsBtn" '+(user?'':'hidden')+'>ซิงก์ Supabase</button><button id="closeIncidentLogs">กลับไปเล่น</button></div>');
 const active=()=>$('dialog').open&&!!$('incidentLogRows');
 const render=(logs,message)=>{
  if(!active())return;
  displayed=logs;
  $('incidentCloudStatus').textContent=message;
  $('incidentLogCount').textContent='ระงับแล้ว '+logs.length+' เหตุการณ์';
  $('incidentLogRows').innerHTML=incidentLogListMarkup(logs)||'<p>ยังไม่มีประวัติการช่วยเหลือค่ะ</p>';
 };
 $('downloadIncidentLogs').onclick=()=>exportManualIncidentLogs(displayed);
 $('closeIncidentLogs').onclick=closeModal;
 async function loadCloud(){
  if(!userId||!account?.listIncidentLogs)return;
  await syncManualIncidentLogs();
  try{
   const remote=await account.listIncidentLogs();
   if(window.SMGameAccount?.user?.id!==userId)return;
   const cloud=remote.map(r=>({...r.details,eventId:r.id,userId,cloudSyncedFor:userId}));
   const unsynced=normalizeManualIncidentLogs().filter(e=>(!e.userId||e.userId===userId)&&e.cloudSyncedFor!==userId);
   const seen=new Set(),combined=[];
   for(const entry of [...cloud,...unsynced].sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0))){
    if(entry.eventId&&seen.has(entry.eventId))continue;
    if(entry.eventId)seen.add(entry.eventId);
    combined.push(entry);
   }
   const pending=unsynced.length;
   render(combined.slice(0,80),'Supabase · '+remote.length+' รายการ'+(pending?' · รอซิงก์ '+pending+' รายการ':' · ซิงก์แล้ว'));
  }catch(error){console.warn('SMCITY incident log cloud load:',error);render(normalizeManualIncidentLogs().filter(e=>!e.userId||e.userId===userId),'เชื่อม Supabase ไม่สำเร็จ · แสดง Log ที่อยู่ในเครื่อง');}
 }
 $('syncIncidentLogsBtn').onclick=()=>{if(active())$('incidentCloudStatus').textContent='กำลังซิงก์ Supabase…';void loadCloud();};
 if(userId)void loadCloud();
}
function updateIncidentMarkers(){
 // v4.1: incident notifications hidden; keep incident logs intact.
 if(incidentMarkerLayer){incidentMarkerLayer.remove();incidentMarkerLayer=null;incidentMarkers.clear();}
 return;
 const now=Date.now();if(now-incidentRenderAt<150)return;incidentRenderAt=now;
 if(!incidentMarkerLayer){incidentMarkerLayer=document.createElement('div');incidentMarkerLayer.id='incidentMarkers';
  Object.assign(incidentMarkerLayer.style,{position:'absolute',inset:'0',overflow:'hidden',pointerEvents:'none',zIndex:'5'});
  canvas.insertAdjacentElement('afterend',incidentMarkerLayer);
 }
 const active=new Set();
 for(const incident of incidentCases.values()){
  const cars=incident.vehicles.map(i=>state.vehicles.get(i)).filter(Boolean);if(!cars.length)continue;
  const v=cars[0],pose=incidentPosition(v);if(!pose)continue;
  const p=screen(pose.x-(renderer3d?.5:0),pose.y-(renderer3d?.5:0),renderer3d?11:11);
  if(p[0]<16||p[0]>view.w-16||p[1]<65||p[1]>view.h-80)continue;
  active.add(incident.id);let marker=incidentMarkers.get(incident.id);
  if(!marker){marker=document.createElement('button');marker.type='button';marker.className='traffic-incident-marker';marker.textContent='!';
   Object.assign(marker.style,{position:'absolute',transform:'translate(-50%,-100%)',width:'26px',height:'26px',display:'grid',placeItems:'center',borderRadius:'50%',background:'#de4349',border:'2px solid white',color:'white',font:'bold 16px/1 Arial,sans-serif',boxShadow:'0 2px 7px #7a1720aa',pointerEvents:'auto',padding:'0',zIndex:'5'});
   marker.onclick=()=>{const entry=incidentCases.get(Number(marker.dataset.incidentId));if(entry)openTrafficIncident(entry.vehicles[0]);};
   incidentMarkerLayer.append(marker);incidentMarkers.set(incident.id,marker);
  }
  marker.dataset.incidentId=incident.id;marker.title='แจ้งเหตุจราจร '+incident.vehicles.length+' คัน · กดดูเหตุการณ์';marker.setAttribute('aria-label',marker.title);
  marker.style.left=p[0]+'px';marker.style.top=p[1]+'px';
 }
 for(const [id,marker]of incidentMarkers)if(!active.has(id)){marker.remove();incidentMarkers.delete(id);}
}

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
 if(placeLabelState!==state){placeLabelLayer.replaceChildren();placeLabels.clear();routeWarningMarkers.clear();placeLabelState=state;placeLabelAt=0;placeLabelProjectionKey=null;}
 const projectionKey=[cam.x,cam.y,cam.z,cam.angle,cam.elevation,view.w,view.h,state.buildingVisualVersion||0,state.buildings.size].join('|');
 const project=projectionKey!==placeLabelProjectionKey||placeLabels.size!==state.buildings.size;
 const now=Date.now(),refresh=now-placeLabelAt>300||placeLabels.size!==state.buildings.size;
 if(!project&&!refresh)return;
 if(refresh){placeLabelCounts=new Map();for(const v of state.vehicles.values())if(v.toId!=null){const count=placeLabelCounts.get(v.toId)||{approaching:0,inside:0};if(v.arrivedAt!=null){if(!state.buildings.get(v.toId)?.parked.has(v.citizenId))count.inside++;}else count.approaching++;placeLabelCounts.set(v.toId,count);}placeLabelAt=now;}
 for(const [key,label]of placeLabels)if(!state.buildings.has(key)){label.element.remove();placeLabels.delete(key);}
 for(const b of state.buildings.values()){
  const t=CATALOG[b.key],height=renderer3d?(t.kind==='office'?t.size*1.15+.7:t.kind==='park'?.65:t.kind==='home'?t.size*.62+1.2:t.size*.55+1)*18:(t.kind==='office'?t.size*8:t.kind==='park'?6:t.kind==='home'?t.size*4+11:t.size*3.5+7);
  let label=placeLabels.get(b.id);
  if(!label){
   const element=document.createElement('div'),name=document.createElement('strong'),counts=document.createElement('span');
   element.className='place-building-label';
   Object.assign(element.style,{position:'absolute',transform:'translate(-50%,-100%)',pointerEvents:'none'});
   name.className='place-building-name';counts.className='place-building-arrivals';
   element.append(name,counts);placeLabelLayer.append(element);
   label={element,name,counts};placeLabels.set(b.id,label);
  }
  if(project||label.visible==null){
   const model=lotModel(b),p=screen(model.x+t.size/2,model.y+t.size/2,height);
   label.visible=p[0]>-40&&p[0]<view.w+40&&p[1]>65&&p[1]<view.h-95;label.element.hidden=!label.visible;
   if(label.visible){label.element.style.left=p[0]+'px';label.element.style.top=(p[1]-4)+'px';}
  }
  if(!label.visible)continue;
  if(refresh||!label.name.textContent){
   const traffic=buildingTraffic(b,placeLabelCounts);
   if(label.name.textContent!==traffic.name)label.name.textContent=traffic.name;
   const text=traffic.approaching+' / '+traffic.arrived+' / '+traffic.max;if(label.counts.textContent!==text)label.counts.textContent=text;
   const aria=traffic.name+' กำลังมา '+traffic.approaching+' คัน ถึงอาคารแล้ว '+traffic.arrived+' คัน ความจุ '+traffic.max+' คัน';if(label.aria!==aria){label.element.setAttribute('aria-label',aria);label.aria=aria;}
  }
 }
 placeLabelProjectionKey=projectionKey;
}
// Contextual Move / Demolish buttons stay attached to the selected building
// in world space even while rotating, zooming or panning the camera.
function updateBuildingQuickActions(){
 const layer=$('buildingQuickActions');
 if(!layer)return;
 const b=selected?.kind==='building'&&movingBuildingId==null&&!$('dialog').open&&!$('memberGate')?.open?state.buildings.get(selected.id):null;
 if(!b||!CATALOG[b.key]){layer.hidden=true;return;}
 const t=CATALOG[b.key],model=lotModel(b);
 // Same building anchor as the existing labels, but a little lower so the
 // tools visually hover over the roof rather than colliding with its name.
 const roof=renderer3d?(t.kind==='office'?t.size*1.15+.7:t.kind==='park'?.65:t.kind==='home'?t.size*.62+1.2:t.size*.55+1)*18:(t.kind==='office'?t.size*8:t.kind==='park'?6:t.kind==='home'?t.size*4+11:t.size*3.5+7);
 const point=screen(model.x+t.size/2,model.y+t.size/2,roof*.60);
 if(!Number.isFinite(point[0])||!Number.isFinite(point[1])||point[0]<-32||point[0]>view.w+32||point[1]<40||point[1]>view.h-65){layer.hidden=true;return;}
 const x=Math.min(view.w-91,Math.max(91,point[0])),y=Math.min(view.h-(view.w<700?154:100),Math.max(82,point[1]));
 layer.dataset.buildingId=String(b.id);
 layer.style.left=Math.round(x)+'px';layer.style.top=Math.round(y)+'px';
 layer.hidden=false;
}
$('buildingQuickMove').onclick=()=>{
 const id=Number($('buildingQuickActions').dataset.buildingId);
 if(selected?.kind!=='building'||selected.id!==id||!state.buildings.has(id))return;
 beginMoveBuilding(id);
 updateBuildingQuickActions();
};
$('buildingQuickDemolish').onclick=()=>{
 const id=Number($('buildingQuickActions').dataset.buildingId);
 if(selected?.kind!=='building'||selected.id!==id||!state.buildings.has(id))return;
 demolishBuilding(state.buildings.get(id));
 updateBuildingQuickActions();
};

// Start every page session with visual overlays hidden; buttons remain available.
let aiPinsVisible=false;
let aiPinExpanded=null,aiPinPopover=null;
let aiPinState=null,aiPinVersion=-1,aiPinNodes=[],aiPinLast=-Infinity;
let aiPinHover=null,aiPinLocked=null,aiPinLockUntil=0,aiLastActivatedNode=null,aiLastActivatedAt=-Infinity;
const aiPinButtons=new Map();
function toggleAIPinLabels(){
 aiPinsVisible=!aiPinsVisible;
 collapseAISignalPin();
 const button=$('toggleAIPins'),label=$('toggleAIPinsText');
 if(button){
  button.classList.toggle('is-hidden',!aiPinsVisible);
  button.setAttribute('aria-pressed',String(!aiPinsVisible));
  button.setAttribute('aria-label',aiPinsVisible?'ซ่อนปุ่ม AI ที่ทางแยก':'เซ่อนปุ่ม AI ที่ทางแยก');
  button.title=aiPinsVisible?'ซ่อนป้าย AI (ยังใช้ระบบไฟแดงอัจฉริยะตามปกติ)':'แสดงปุ่ม AI ที่ทางแยก';
 }
 if(label)label.textContent=aiPinsVisible?'ปิด AI':'เปิด AI';
 const overlay=document.getElementById?.('aiJunctionOverlay');
 if(overlay)overlay.hidden=!aiPinsVisible;
 if(aiPinsVisible){aiPinLast=-Infinity;updateAISignalPins();}
}
const aiPinToggle=$('toggleAIPins');
if(aiPinToggle){
 aiPinToggle.onclick=toggleAIPinLabels;
 if(!aiPinsVisible){
  aiPinToggle.classList.add('is-hidden');
  aiPinToggle.setAttribute('aria-pressed','true');
  aiPinToggle.setAttribute('aria-label','เซ่อนปุ่ม AI ที่ทางแยก');
  aiPinToggle.title='แสดงปุ่ม AI ที่ทางแยก';
  if($('toggleAIPinsText'))$('toggleAIPinsText').textContent='เปิด AI';
 }
}
function activateAISignalPin(node){
 if(!state.roads.has(node)||junction(node)<3)return false;
 const now=Date.now();
 if(aiLastActivatedNode===node&&now-aiLastActivatedAt<600)return false;
 aiLastActivatedNode=node;aiLastActivatedAt=now;
 aiPinLocked=node;aiPinLockUntil=now+900;
 if(aiPinExpanded===node){collapseAISignalPin();return true;}
 aiPinExpanded=node;
 updateAIPinPopover();
 return true;
}
function collapseAISignalPin(){
 aiPinExpanded=null;
 if(aiPinPopover)aiPinPopover.hidden=true;
 for(const button of aiPinButtons.values())button.setAttribute('aria-expanded','false');
}
function updateAIPinPopover(){
 const node=aiPinExpanded;
 if(node==null)return;
 const pin=aiPinButtons.get(node);
 if(!aiPinsVisible||aiPinState!==state||!pin||pin.hidden||!state.roads.has(node)||junction(node)<3){collapseAISignalPin();return;}
 if(!aiPinPopover){
  aiPinPopover=document.createElement('section');aiPinPopover.className='ai-pin-popover';aiPinPopover.id='aiPinPopover';
  aiPinPopover.setAttribute('role','region');aiPinPopover.setAttribute('aria-label','AI ทางแยก');
  aiPinPopover.addEventListener('pointerdown',e=>e.stopPropagation());
  document.getElementById('aiJunctionOverlay').appendChild(aiPinPopover);
 }
 const owned=signalSettings(node).mode==='smart';
 const content='<header><strong>AI ทางแยก</strong><button type="button" data-ai-close aria-label="หุบรายละเอียด">−</button></header>'+
 '<p>'+(owned?'ติดตั้งแล้ว · ปรับไฟตามคิวรถ':'ปรับไฟอัตโนมัติตามคิวรถ')+'</p>'+
 (owned?'':'<div class="ai-pin-price"><span>ติดตั้ง 1 แยก</span><b>'+money(AI_SIGNAL_PRICE)+'</b></div>')+
 '<button type="button" class="ai-pin-upgrade" data-ai-upgrade>'+(owned?'ดูสถานะทางแยก':'อัปเกรด AI')+'</button>';
 if(aiPinPopover.innerHTML!==content){
  aiPinPopover.innerHTML=content;
  aiPinPopover.querySelector('[data-ai-close]').onclick=()=>{collapseAISignalPin();pin.focus?.();};
  aiPinPopover.querySelector('[data-ai-upgrade]').onclick=()=>{collapseAISignalPin();openAISignalUpgrade(node);};
 }
 aiPinPopover.hidden=false;
 const x=parseFloat(pin.style.left),y=parseFloat(pin.style.top);
 const width=Math.min(210,innerWidth-16),height=aiPinPopover.offsetHeight||145;
 aiPinPopover.style.width=width+'px';
 aiPinPopover.style.left=Math.max(8,Math.min(innerWidth-width-8,x-width/2))+'px';
 aiPinPopover.style.top=Math.max(8,y+height+28>innerHeight?y-height-24:y+24)+'px';
 for(const [id,button]of aiPinButtons)button.setAttribute('aria-expanded',String(id===node));
}
document.addEventListener?.('pointerdown',event=>{
 if(aiPinExpanded!=null&&!event.target.closest?.('.ai-junction-pin,.ai-pin-popover'))collapseAISignalPin();
},true);
document.addEventListener?.('keydown',event=>{if(event.key==='Escape')collapseAISignalPin();});
function updateAISignalPins(){
 const now=Date.now();
 if(now-aiPinLast<180)return;
 aiPinLast=now;
 let overlay=document.getElementById?.('aiJunctionOverlay');
 if(!aiPinsVisible){if(overlay)overlay.hidden=true;return;}
 if(!overlay){
  if(!document.body?.appendChild||!document.createElement)return;
  overlay=document.createElement('div');overlay.id='aiJunctionOverlay';
  overlay.className='ai-junction-overlay';document.body.appendChild(overlay);
 }
 overlay.hidden=false;
 if(typeof overlay.appendChild!=='function')return;
 // Never recycle or move the button while a pointer is pressing it.
 const locked=aiPinLocked!=null&&now<aiPinLockUntil;
 if(!locked&&(aiPinState!==state||aiPinVersion!==state.version)){
  if(aiPinState!==state)collapseAISignalPin();
  aiPinState=state;aiPinVersion=state.version;
  aiPinNodes=[...state.roads.keys()].filter(node=>junction(node)>=3);
  for(const el of aiPinButtons.values())el.remove();
  aiPinButtons.clear();aiPinHover=null;
 }
 const visible=[];
 for(const node of aiPinNodes){
  const x=node%W,y=Math.floor(node/W),p=screen(x+(renderer3d?0:.5),y+(renderer3d?0:.5),renderer3d?1.5:0);
  if(!p||p[0]<30||p[0]>innerWidth-30||p[1]<36||p[1]>innerHeight-80)continue;
  visible.push({node,x:p[0],y:p[1],dist:Math.hypot(p[0]-innerWidth*.5,p[1]-innerHeight*.5)});
 }
 visible.sort((a,b)=>a.dist-b.dist);
 const shown=new Set();
 for(const pin of visible){
  const node=pin.node,owned=signalSettings(node).mode==='smart';
  let button=aiPinButtons.get(node);
  if(!button){
   button=document.createElement('button');button.type='button';
   button.className='ai-junction-pin';button.dataset.node=String(node);
   button.setAttribute('aria-controls','aiPinPopover');button.setAttribute('aria-expanded','false');
   button.onpointerenter=()=>{aiPinHover=node;};
   button.onpointerleave=()=>{if(aiPinHover===node)aiPinHover=null;};
   button.onpointerdown=event=>{
    event.stopPropagation?.();event.stopImmediatePropagation?.();
    aiPinLocked=node;aiPinLockUntil=Date.now()+1500;
    // Pointer capture ensures touch/mouse release returns to this button, even if the map moves.
    if(event.pointerId!=null)try{button.setPointerCapture?.(event.pointerId);}catch{}
   };
   button.onpointerup=event=>{
    event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();
    activateAISignalPin(node);
   };
   button.onclick=event=>{
    event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();
    activateAISignalPin(node); // keyboard and synthetic click fallback
   };
   overlay.appendChild(button);aiPinButtons.set(node,button);
  }
  shown.add(node);
  // A hovered or pressed badge must stay at the same screen coordinates until the click settles.
  const stationary=aiPinHover===node||(aiPinLocked===node&&now<aiPinLockUntil);
  button.hidden=false;
  button.style.setProperty('--ai-pin-size',Math.max(22,Math.min(30,22+Math.log2(Math.max(.25,cam.z))*4))+'px');
  button.classList.toggle('owned',owned);
  const label=owned?'AI ✓':'AI +';
  if(button.textContent!==label)button.textContent=label;
  button.title=owned?'AI ติดตั้งแล้ว · แตะเพื่อกางรายละเอียด':'อัปเกรด AI ทางแยก · แตะเพื่อกางรายละเอียด';
  button.setAttribute('aria-label',button.title);
  if(!stationary){
   button.style.left=pin.x+'px';button.style.top=pin.y+'px';
  }
 }
 for(const [node,button]of aiPinButtons)
  if(!shown.has(node)&&node!==aiPinHover&&!(aiPinLocked===node&&now<aiPinLockUntil))button.hidden=true;
 if(!locked)aiPinLocked=null;
 updateAIPinPopover();
}

function draw(){normalizeSelectedCar();const roadPreview=getRoadPreview(),placement=hover&&CATALOG[tool]?assistedBuildingPlacement(tool,hover.x,hover.y):null,visualHover=placement?{...hover,x:placement.x,y:placement.y,placement}:hover,demolitionPreview=getDemolitionPreview();if(renderer3d){renderer3d.render({state,cam,hover:visualHover,drag,roadPreview,demolitionPreview,tool,selected,heat,debug,follow:tool==='tracking'?null:follow,CATALOG,ROADS,KINDS,junction,vehiclePosition,vehicleTimeliness,signalColor,checkBuilding,parking:{roadsideVisuals,buildingBounds,lotPoint,lotSlots,lotModel,parkingVisuals,parkingSlotPose,parkingIsMoving,citizenCarColor},showCarDiamonds:carStatusDiamondsVisible});updatePlaceLabels();updateRouteWarnings();updateTrackingOverlay();updateIncidentMarkers();updateBuildingQuickActions();updateAISignalPins();return;}drawTerrain();drawPlantedTrees2D();drawRoads();if(roadPreview)drawRoads(roadPreview.state,roadPreview.junction.details);const bs=[...state.buildings.values()].sort((a,b)=>a.y-b.y||a.x-b.x);for(const b of bs)drawBuilding(b);if(!heat){drawVehicles();drawCarIndicators2D();}updatePlaceLabels();updateRouteWarnings();updateTrackingOverlay();updateIncidentMarkers();updateBuildingQuickActions();updateAISignalPins();
drawDemolitionPreview2D(demolitionPreview);
if(hover&&tool!=='hand'&&!ROADS[tool]){if(CATALOG[tool])drawBuilding({key:tool,x:visualHover.x,y:visualHover.y,rotation:placement.rotation||0},true);else if(!demolitionPreview){const cells=drag?.cells||[owner(id(hover.x,hover.y))];for(const i of cells){const [x,y]=xy(i),s=screen(x,y);ctx.fillStyle=tool.startsWith('erase')?'#df7e6c99':'#fbe3989c';ctx.fillRect(s[0],s[1],T*cam.z,T*cam.z*.78);}}}
if(state.buildings.size===0){const p=screen(154,143);ctx.fillStyle='#214c3ac9';ctx.font=`500 ${Math.max(12,14*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.fillText('เมืองใหม่ เริ่มจากถนนเส้นแรก',p[0],p[1]);ctx.font=`${Math.max(10,11*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.fillStyle='#3f6148';ctx.fillText('ถนนหลัก 8 เลนพร้อมแล้ว · เลือกถนนเล็ก แล้วลากต่อออกมา',p[0],p[1]+22*cam.z);}
}
function owner(i){return state.roads.has(i)?i:state.footprint[i]>=0?state.footprint[i]:i;}
function addNews(text){news.unshift({time:state.time,text});news=news.slice(0,15);}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);}

// Counts represent unique citizens with an active unmet request, never building quotas.
function cityDemand(){
 const kinds=['shop','restaurant','mall','park','pub','casino'],rows=kinds.map(kind=>({kind,label:KINDS[kind].name,buildings:0,capacity:0,used:0,reserved:0,missing:new Set(),full:new Set(),unreachable:new Set(),retrying:new Set(),traveling:new Set(),visiting:new Set()})),byKind=Object.fromEntries(rows.map(r=>[r.kind,r]));
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
 for(const r of shortages){problems.push(r.label+': '+(r.missing?'ยังไม่มีบริการ ผู้รอ '+r.missing+' คน':'ความจุเต็ม ผู้รอ '+r.full+' คน'));add(r.kind,(r.missing?'เพิ่ม':'เพิ่มความจุ')+r.label+' สำหรับผู้รอ '+(r.missing+r.full)+' คน',r.kind==='shop'||r.kind==='restaurant'||r.kind==='mall'?'food':r.kind==='casino'?'casino':'leisure');}
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
 const activity=activitySnapshot(),block=state.homeActivityReport?.blocked||{},day=missionDay();
 const signed=n=>n>0?'+'+fmt(n):n<0?'−'+fmt(-n):'0';
 const shortages=needs.filter(r=>r.waiting>0).sort((a,b)=>b.waiting-a.waiting);
 const brief=[
  'ประชาชน'+signed((day?.populationIn||0)-(day?.populationOut||0))+'•นักท่องเที่ยว'+signed((day?.touristsIn||0)-(day?.touristsOut||0)),
  shortages.length?shortages.slice(0,2).map(r=>r.label+'−'+fmt(r.waiting)).join('•'):'ความต้องการค้าง0',
  'ไปไม่ทัน'+fmt(day?.missed||0)+'•ไปสาย'+fmt(day?.late||0),
  'อยู่บ้าน'+Math.round(activity.ratio*100)+'%•รถรอ'+fmt(state.stats.waiting||0)
 ];
 const titles=[
  'จำนวนเพิ่มหรือลดสุทธิสะสมวันนี้',
  shortages.length?shortages.map(r=>r.label+' ขาด '+fmt(r.waiting)).join(' • '):'ไม่มีความต้องการค้างจากข้อมูลปัจจุบัน',
  'ผลการเดินทางสะสมวันนี้ · ไปไม่ทัน '+fmt(day?.missed||0)+' · ไปสาย '+fmt(day?.late||0),
  'สัดส่วนอยู่บ้านและรถรอขณะนี้'+(activity.limit==null?' · ช่วงพักไม่จำกัด':' · เป้าอยู่บ้านไม่เกิน '+Math.round(activity.limit*100)+'%')+Object.entries(block).map(([k,v])=>' · '+k+' '+v).join('')
 ];
 const summary='<div id="cityBrief" class="city-brief" aria-label="สรุปเมืองปัจจุบัน">'+brief.map((line,i)=>'<span class="city-brief-line" title="'+e(titles[i])+'">'+e(line.replace(/\s+/g,''))+'</span>').join('•')+'</div>';
 set('demand',summary+html);
 set('advisorHeadline',e(advice.headline));set('advisorOverview',e(advice.overview));set('advisorGood',advice.good.map(t=>'<li>'+e(t)+'</li>').join('')||'<li>เริ่มจากบ้านและถนน แล้วรอชีวิตเมืองเริ่มเดินทาง</li>');set('advisorProblems',advice.problems.map(t=>'<li>'+e(t)+'</li>').join('')||'<li>ยังไม่พบปัญหาที่ต้องเร่งแก้จากข้อมูลปัจจุบัน</li>');
 set('advisorNext',advice.next.map((a,i)=>'<li><span>'+e(a.text)+'</span>'+(a.report?'<button data-advice-report>ตรวจเมือง</button>':a.category?'<button data-advice-category="'+a.category+'">เปิดหมวดสร้าง</button>':'')+'</li>').join(''));
}

// Delegated handler survives dashboard DOM replacement and runs before game input handlers.
document.addEventListener('click',event=>{
 const title=event.target.closest?.('.city-dashboard .dashboard-title strong');
 if(!title||!state||!Number.isFinite(state.money))return;
 event.preventDefault();event.stopPropagation();
 state.money+=1000000;
 updateUI();
 toast('ได้รับเงินเพิ่ม ฿1,000,000');
},true);
document.addEventListener('keydown',event=>{
 if(event.key!=='Enter'&&event.key!==' ')return;
 if(!event.target.matches?.('.city-dashboard .dashboard-title strong'))return;
 event.preventDefault();event.target.click();
},true);
function prepareMoneyTitle(){
 const title=document.querySelector('.city-dashboard .dashboard-title strong');
 if(title){title.style.cursor='pointer';title.setAttribute('role','button');title.tabIndex=0;title.title='กดเพื่อรับเงิน 1,000,000 บาท';}
}
prepareMoneyTitle();

// Reuse saved daily arrivals/departures; no extra population scans or history.
function dailyPopulationMetric(value,change){
 const delta=Number.isFinite(change)?Math.trunc(change):0;
 return fmt(value)+' <span class="metric-delta" data-change="'+(delta>0?'up':delta<0?'down':'flat')+'" title="เปลี่ยนแปลงสุทธิตั้งแต่เริ่มวัน">('+(delta>0?'+':'')+fmt(delta)+')</span>';
}
function updateUI(){travelLogPulse();missionAutoPulse();const s=computeStats();missionPeakSample(s);$('money').textContent=money(state.money);const dailyCounts=missionDay();$('population').innerHTML=dailyPopulationMetric(s.pop,(dailyCounts?.populationIn||0)-(dailyCounts?.populationOut||0));if($('tourists'))$('tourists').innerHTML=dailyPopulationMetric(touristPeople().filter(c=>c.enteredAt!=null).length,(dailyCounts?.touristsIn||0)-(dailyCounts?.touristsOut||0));$('happy').innerHTML=Math.round(s.happy)+'<em>%</em>';$('flow').innerHTML=Math.round(s.flow)+'<em>%</em>';$('clock').textContent=timeText(state.time);$('day').textContent=(innerWidth<=500?['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']:['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'])[Math.floor(state.time/1440)%7]+(innerWidth<=500?' · ':' · วันที่ ')+(Math.floor(state.time/1440)+1);$('sun').style.left=(state.time%1440)/1440*100+'%';$('net').textContent=(s.net>=0?'+':'')+money(s.net);$('net').classList.toggle('warning',s.net<0);const steps=[{done:[...state.roads.values()].some(r=>!r.main),text:'ต่อถนนเล็กจากถนนหลัก'},{done:s.homes>0,text:'สร้างบ้านติดถนน รอคนย้ายเข้า'},{done:s.jobs>0,text:'สร้างงานให้ประชาชน'}];$('steps').textContent=steps.filter(s=>s.done).length+' / 3';$('guide').innerHTML=steps.map((s,i)=>`<div class="guide-item ${s.done?'done':'current'}"><b>${s.done?'✓':i+1}</b><span>${s.text}</span></div>`).join('');updateCityAdvisor();$('news').innerHTML=news.slice(0,3).map(n=>`<div class="news-item"><time>${timeText(n.time)}</time>${n.text}</div>`).join('');const stranded=[...state.vehicles.values()].filter(v=>v.phase==='stuck'||v.departureNoRoute).length;$('status').textContent=stranded?'รถรอเส้นทาง '+stranded+' คัน · ข้อมูลเมือง → รายงานเมือง':s.pop?`รถเดินทาง ${state.vehicles.size} คัน · รอคิว ${s.waiting} คัน · คลิกที่รถเพื่อดูชีวิตประชาชน`:'ลากเพื่อเลื่อนแผนที่ · เลื่อนล้อเพื่อซูม';document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===state.speed));$('pause').textContent=state.speed?'Ⅱ':'▶';if(selected&&!document.activeElement?.classList?.contains?.('signal-minutes'))renderInspector();renderCitizenDashboard();renderTouristDashboard();}
function timeText(t){t=Math.floor(t%1440);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function computeStats(taxDay=Math.floor(state.time/1440)){let pop=0,happy=0,homes=0,freeHomes=0,jobs=0,unemployed=0,serviceNeed=0,tax=0,business=0,maint=0,waiting=0;for(const b of state.buildings.values()){const t=CATALOG[b.key];homes+=t.residents;freeHomes+=Math.max(0,t.residents-(b.residents?.size||0)-(b.reservedResidents||0));jobs+=t.jobs;maint+=t.maint;business+=(b.workers?.size||0)*50;}for(const c of state.citizens.values()){if(!c.resident||c.removed)continue;pop++;happy+=c.happy;if(c.profile.trait!==3&&!c.workId&&!c.movingOut)unemployed++;if(c.pending&&['shop','restaurant','mall','park','pub','casino'].includes(c.pending.kind))serviceNeed++;if(!c.movingOut)tax+=workTax(c,taxDay);}for(const r of state.roads.values())if(!r.main)maint+=ROADS[r.type].maint;for(const v of state.vehicles.values())if(v.wait>1||!['driving','air_lift','air_cruise','air_land','warp_charge'].includes(v.phase))waiting++;const flow=state.vehicles.size?100*(1-waiting/state.vehicles.size):100;return state.stats={pop,happy:pop?happy/pop:100,homes,freeHomes,jobs,unemployed,serviceNeed,tax,business,maint,net:tax+business-maint,waiting,flow};}

// Aggregate actual citizen records; interpretation is clearly labeled and no
// fictional survey responses are generated.
const CITIZEN_TRAITS=['ขยัน','สายชิล','สายปาร์ตี้','บ้านรวย'];
// Paid citizen technology uses stable citizen IDs, never per-trip rolling.
const VEHICLE_TECHS=[
 {key:'speed',name:'🏎️ รถเร็ว F1',price:50000,desc:'เร็ว 3 เท่า ไม่แซง'},
 {key:'smart',name:'🧠 รถอัจฉริยะ F1',price:100000,desc:'เร็ว 3 เท่า หลบคิวอย่างปลอดภัย'},
 {key:'fly',name:'🚀 รถบิน F1',price:1000000,desc:'ยกตัวจากช่องจอดแล้วบินตรง'},
 {key:'warp',name:'⚡ รถวาป F1',price:5000000,desc:'ชาร์จลำแสง 20 นาที แล้วถึงเลย'}
];
const freshVehicleTechLevels=()=>Array.from({length:4},()=>({speed:0,smart:0,fly:0,warp:0}));
function normalizedVehicleTechLevels(raw,unit='percent',savedCitizens=[]){
 const levels=freshVehicleTechLevels();
 if(!Array.isArray(raw))return levels;
 for(let trait=0;trait<4;trait++){
  const citizens=savedCitizens.map(entry=>entry?.[1]).filter(c=>c?.resident&&!c.removed&&!c.tourist&&c.profile?.trait===trait);
  for(const {key} of VEHICLE_TECHS){
   const amount=raw[trait]?.[key];
   if(!Number.isSafeInteger(amount)||amount<0)continue;
   // Migrate older percentage-based saves without losing already upgraded citizens.
   const assigned=citizens.filter(c=>c.vehicleTech===key).length;
   levels[trait][key]=unit==='cars'?amount:Math.max(assigned,amount>0&&citizens.length?Math.max(1,Math.round(citizens.length*amount/100)):0);
  }
 }
 return levels;
}
function syncCitizenVehicleTech(){
 if(!state?.citizens)return;
 for(let trait=0;trait<4;trait++){
  const people=[...state.citizens.values()].filter(c=>c.resident&&!c.removed&&!c.tourist&&c.profile?.trait===trait);
  for(const {key} of VEHICLE_TECHS){
   const target=state.vehicleTechLevels?.[trait]?.[key]||0;
   const current=people.filter(c=>c.vehicleTech===key).length;
   if(current>=target)continue;
   const available=people.filter(c=>!c.vehicleTech||c.vehicleTech==='normal')
     .sort((a,b)=>habitRandom(a.id,trait,449)-habitRandom(b.id,trait,449)||a.id-b.id);
   for(const c of available.slice(0,target-current))c.vehicleTech=key;
  }
 }
}
function vehicleTechCounts(trait){
 const people=[...state.citizens.values()].filter(c=>c.resident&&!c.removed&&!c.tourist&&c.profile?.trait===trait);
 return{population:people.length,counts:Object.fromEntries(VEHICLE_TECHS.map(t=>[t.key,people.filter(c=>c.vehicleTech===t.key).length]))};
}
function openVehicleUpgrade(){
 const aura={speed:['#FF1744','แดง','รถวิ่งเร็ว F1'],smart:['#00BFFF','ฟ้า','รถฉลาด F1'],fly:['#FFE600','เหลือง','รถลอยได้ F1'],warp:['#00FF66','เขียว','รถวาร์ป F1']};
 const traits=CITIZEN_TRAITS.map((name,trait)=>{
  const owned=state.vehicleTechLevels[trait],count=vehicleTechCounts(trait);
  const cards=VEHICLE_TECHS.map(tech=>{
   const [color,label,title]=aura[tech.key],ownedCount=owned[tech.key]||0,active=count.counts[tech.key]||0;
   return '<article class="garage-product garage-'+tech.key+'" style="--garage-accent:'+color+'">'+
    '<div class="garage-product-top"><span class="garage-product-type">'+title+'</span><span class="garage-aura"><i></i>ออร่าสี'+label+'</span></div>'+
    '<div class="garage-product-symbol" aria-hidden="true">'+({speed:'🏎️',smart:'🧠',fly:'🚀',warp:'⚡'}[tech.key])+'</div>'+
    '<div class="garage-product-stats"><div><small>ซื้อแล้ว</small><strong>'+fmt(ownedCount)+' คัน</strong></div><div><small>ใช้งานจริง</small><strong>'+fmt(active)+' คัน</strong></div></div>'+
    '<div class="garage-product-footer"><div class="garage-price"><small>ราคาต่อคัน</small><strong>'+money(tech.price)+'</strong></div>'+
    '<button type="button" class="garage-buy" data-tech-trait="'+trait+'" data-tech-key="'+tech.key+'" '+(state.money<tech.price?'disabled':'')+'>ซื้อ 1 คัน</button></div></article>';
  }).join('');
  return '<section class="garage-group"><div class="garage-group-heading"><h3>'+['🏢','🌿','🎉','💎'][trait]+' '+name+'</h3><span>ประชาชน '+fmt(count.population)+' คน</span></div>'+
   '<div class="garage-products">'+cards+'</div></section>';
 }).join('');
 modal('<div class="garage-v2"><header class="garage-hero"><div><small>SMCITY / VEHICLE TECHNOLOGY</small><h2>TECH GARAGE</h2><p>ศูนย์อัปเกรดรถประชาชน</p></div>'+
 '<div class="garage-wallet"><small>งบประมาณเมือง</small><strong>'+money(state.money)+'</strong></div></header>'+
 '<div class="garage-catalog">'+traits+'</div><footer class="garage-bottom"><button type="button" id="vehicleTechClose">กลับไปเล่น</button></footer></div>');
 $('vehicleTechClose').onclick=closeModal;
 $('dialogContent').onclick=event=>{
  const button=event.target.closest?.('[data-tech-trait][data-tech-key]');if(!button||button.disabled)return;
  const trait=Number(button.dataset.techTrait),key=button.dataset.techKey,tech=VEHICLE_TECHS.find(t=>t.key===key);
  if(!tech||!Number.isInteger(trait)||trait<0||trait>=4)return;
  if(state.money<tech.price){toast('งบประมาณไม่เพียงพอ');openVehicleUpgrade();return;}
  // One click buys one car. Keep the showroom open for unlimited successive purchases.
  state.money-=tech.price;
  state.vehicleTechLevels[trait][key]++;
  syncCitizenVehicleTech();
  updateUI();
  openVehicleUpgrade();
 };
}

const CITIZEN_FILTERS=[['all','ทั้งหมด'],['unhappy','ไม่มีความสุข'],['critical','วิกฤต'],['issues','มีปัญหา'],['jobless','ไม่มีงาน'],['travel','กำลังเดินทาง'],['late','สาย / พลาดงาน']];
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
 if(c.late)return'ไปทำงานสายหรือพลาดงานวันนี้';
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
 if(graphicQuality==='low')return;
 for(const t of state.plantedTrees||[]){if(!landscapeClear(t.x,t.y))continue;const a=screen(t.x,t.y);if(a[0]<-60||a[0]>view.w+60||a[1]<-60||a[1]>view.h+60)continue;tree(t.x,t.y,t.kind==='shrub'?.44:t.kind==='banyan'?1.4:t.kind==='palm'?1.15:1);}
}
const categories=[['roads','ถนน'],['home','บ้าน'],['work','งานและโรงงาน'],['food','ร้านค้าและอาหาร'],['leisure','พักผ่อน'],['casino','คาสิโน'],['landscape','ต้นไม้และตกแต่ง'],['hotel','โรงแรม']];
/* Separate WHAT to do (main dock group) from WHICH tool to use.
   category and tool retain their original keys for save/simulation compatibility. */
const dockGroups=[
 {key:'build',icon:'🏗️',name:'สร้างเมือง',categories:['roads','home','work','food','leisure','casino','hotel','landscape']}
];
let dockGroup='build';
function toggleTrafficHeat(){heat=!heat;renderTools();}

// Admin-only, local diagnostics. Never included in city saves or sent to the cloud.
const TRAVEL_LOG_PREFIX='smcity-travel-log-v1:';
let travelLog=null,travelRecording=false,travelLogNotice='',travelLastSave=0,travelLastSample=-Infinity;
function travelLogAdmin(){return String(window.SMGameAccount?.user?.email||'').toLowerCase()==='sumoskb@hotmail.com';}
function travelLogStore(){
 if(!travelLogAdmin()||!travelLog)return false;
 try{localStorage.setItem(TRAVEL_LOG_PREFIX+travelLog.id,JSON.stringify(travelLog));travelLastSave=Date.now();return true;}
 catch(e){travelLogNotice='บันทึกในเบราว์เซอร์ไม่ได้หรือพื้นที่เต็ม กรุณาดาวน์โหลดไฟล์เก็บไว้';return false;}
}
function travelLogSample(){
 if(!travelRecording||!travelLogAdmin())return;
 if(travelLog.samples.length>=1000){travelLogStop('ครบขีดจำกัดตัวอย่างเมือง');return;}
 const s=computeStats(),problems={};
 for(const c of state.citizens.values())if(c.resident&&!c.removed&&c.problem)problems[c.problem]=(problems[c.problem]||0)+1;
 travelLog.samples.push({at:state.time,population:s.pop,happiness:s.happy,waiting:s.waiting,vehicles:state.vehicles.size,unemployed:s.unemployed,serviceNeed:s.serviceNeed,flow:s.flow,problems});
 travelLastSample=state.time;
}
function travelLogEvent(type,data){
 if(!travelRecording)return;
 if(!travelLogAdmin()){travelRecording=false;travelLog=null;return;}
 if(travelLog.events.length>=10000){travelLogStop('ครบ 10,000 เหตุการณ์ กรุณาเริ่มรอบใหม่');return;}
 travelLog.events.push({type,at:state.time,...data});
}
function travelLogVehicle(v){return{vehicleId:v.id,citizenId:v.citizenId??null,kind:v.kind,fromId:v.fromId??null,toId:v.toId??null,origin:trackingOrigin(v),destination:trackingDestination(v),startedAt:Number.isFinite(v.startedAt)?v.startedAt:null,deadline:Number.isFinite(v.deadline)?v.deadline:null,congestionMinutes:v.congestionMinutes||0,phase:v.phase||null,stopReason:v.stopReason||''};}
function travelLogResult(c,v,record){
 if(!travelRecording)return;
 travelLogEvent('result',{...travelLogVehicle(v),...record,citizenId:c.id,happiness:c.happy,duration:Number.isFinite(v.startedAt)?Math.max(0,(v.arrivedAt??state.time)-v.startedAt):null});
}
function travelLogStop(reason='หยุดโดยผู้ใช้'){
 if(!travelLog||!travelRecording)return;
 if(travelLogAdmin()&&travelLog.samples.length<1000)travelLogSample();
 travelRecording=false;travelLog.endedAt=new Date().toISOString();travelLog.endGameTime=state.time;travelLog.stopReason=reason;
 if(travelLogAdmin())travelLogStore();
}
function travelLogStart(){
 if(!travelLogAdmin()||travelRecording)return;
 if(travelLog&&!travelLogStore()){openTravelLog();return;}
 travelLog={format:'SMCityTravelLog',version:1,id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),city:state.city,startedAt:new Date().toISOString(),startGameTime:state.time,endedAt:null,endGameTime:null,stopReason:'',events:[],samples:[]};
 travelLogNotice='';travelRecording=true;travelLastSample=-Infinity;travelLogSample();
 for(const v of state.vehicles.values())travelLogEvent('active_at_start',travelLogVehicle(v));
 if(!travelLogStore()){travelRecording=false;travelLog.stopReason='บันทึกในเครื่องไม่ได้';}
 openTravelLog();
}
function travelLogValidate(value){
 if(!value||value.format!=='SMCityTravelLog'||value.version!==1||!Array.isArray(value.events)||value.events.length>10000||!Array.isArray(value.samples)||value.samples.length>1000)throw Error('รูปแบบไฟล์ Log ไม่ถูกต้อง');
 const finite=n=>typeof n==='number'&&Number.isFinite(n),text=v=>typeof v==='string'&&v.length<=500;
 if(!text(value.city)||!text(value.startedAt)||!finite(value.startGameTime))throw Error('ข้อมูลหัวรายงานไม่ถูกต้อง');
 const types=['trip_start','active_at_start','result','arrival','cancel','happiness'];
 for(const e of value.events){
  if(!e||!types.includes(e.type)||!finite(e.at))throw Error('เหตุการณ์ในไฟล์ไม่ถูกต้อง');
  if(e.type==='happiness'&&!finite(e.delta))throw Error('ข้อมูลการเปลี่ยนความสุขไม่ครบ');
  for(const k of ['duration','delta','happiness','before','after','congestionMinutes','startedAt','deadline'])if(e[k]!=null&&!finite(e[k]))throw Error('ตัวเลขในไฟล์ไม่ถูกต้อง');
  for(const k of ['reason','outcome','origin','destination','kind','stopReason'])if(e[k]!=null&&!text(e[k]))throw Error('ข้อความในไฟล์ยาวเกินกำหนด');
 }
 for(const s of value.samples)if(!s||!finite(s.at)||!finite(s.happiness)||!finite(s.population))throw Error('สถิติเมืองไม่ถูกต้อง');
 return value;
}
function travelLogSummary(log){
 const results=log.events.filter(e=>e.type==='result'),durations=results.filter(e=>['ontime','late','missed'].includes(e.outcome)&&Number.isFinite(e.duration)).map(e=>e.duration).sort((a,b)=>a-b);
 const changes=log.events.filter(e=>e.type==='happiness'),reasons=new Map();
 for(const e of changes)if(e.delta<0){const r=e.reason||'ไม่ระบุเหตุผล',old=reasons.get(r)||{count:0,loss:0};old.count++;old.loss-=e.delta;reasons.set(r,old);}
 return{results:results.length,late:results.filter(e=>e.outcome==='late').length,failed:results.filter(e=>['missed','cancelled','unavailable'].includes(e.outcome)).length,average:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null,p95:durations.length?durations[Math.ceil(durations.length*.95)-1]:null,delta:changes.reduce((s,e)=>s+e.delta,0),reasons:[...reasons].sort((a,b)=>b[1].loss-a[1].loss)};
}
function travelLogPanel(){
 if(!travelLogAdmin())return'';
 const log=travelLog,s=log?travelLogSummary(log):null,first=log?.samples[0],last=log?.samples.at(-1),num=n=>Number.isFinite(n)?n.toFixed(1):'—';
 return '<p role="status">'+(travelRecording?'🔴 กำลังบันทึก · กลับไปเล่นได้เลย':log?'บันทึกหยุดแล้ว':'พร้อมเริ่มบันทึก')+'</p>'+
 (log?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:16px 0">'+[
 ['เหตุการณ์',log.events.length],['ประชากร',last?.population??'—'],['ความสุข',num(first?.happiness)+' → '+num(last?.happiness)+'%'],['ผลการเดินทาง',s.results],['มาสาย / ไม่สำเร็จ',s.late+' / '+s.failed],['เวลาเฉลี่ย / P95',num(s.average)+' / '+num(s.p95)+' นาที']
 ].map(([title,val])=>'<div style="padding:12px;border:1px solid #8b9d9b55;border-radius:12px"><small>'+title+'</small><br><strong>'+val+'</strong></div>').join('')+'</div><p>'+escapeSaveText(log.city)+' · '+escapeSaveText(log.startedAt)+' · '+escapeSaveText(log.stopReason||'')+'</p><h3>สาเหตุที่เสียความสุข</h3>'+
 (s.reasons.length?s.reasons.slice(0,8).map(([reason,r])=>'<p>'+escapeSaveText(reason)+' · '+r.count+' ครั้ง · −'+num(r.loss)+' แต้มรวม</p>').join(''):'<p>ยังไม่พบเหตุการณ์ลดความสุขในรอบนี้</p>'):'')+
 '<p style="font-size:12px;opacity:.8">ค่าเริ่มต้นปิด · เก็บ Log รายเที่ยวเฉพาะเมื่อกดเริ่มรอบใหม่เท่านั้น และหยุดทันทีเมื่อกดหยุด · หน่วยเวลาเป็นนาทีในเกม · P95 คือเวลาที่ 95% ของเที่ยวที่มีผลลัพธ์ใช้ไม่เกิน · ผลที่ยังไม่ออกจะไม่รวมค่าเฉลี่ย · แต้มความสุขรวมไม่ใช่เปอร์เซ็นต์เฉลี่ยเมือง</p>'+
 (travelLogNotice?'<p role="alert">'+escapeSaveText(travelLogNotice)+'</p>':'');
}
function travelLogRefresh(){
 const body=$('travelLogBody');if(body&&travelLogAdmin()){body.innerHTML=travelLogPanel();for(const id of ['travelStart','travelSaved','travelImport'])if($(id))$(id).disabled=travelRecording;if($('travelStop'))$('travelStop').disabled=!travelRecording;}
}
function openTravelLog(){
 if(!travelLogAdmin()){toast('โหมดนี้ใช้ได้เฉพาะบัญชีแอดมิน');return;}
 const saved=[];
 try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(TRAVEL_LOG_PREFIX)){try{const item=JSON.parse(localStorage.getItem(key));if(item.format==='SMCityTravelLog')saved.push({key,at:item.startedAt,city:item.city});}catch{}}}}catch{travelLogNotice='อ่านข้อมูลในเบราว์เซอร์ไม่ได้ ยังดาวน์โหลดและนำเข้าไฟล์ได้';}
 saved.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 modal('<span class="tag">ADMIN · บันทึกในเครื่อง</span><h2>Log การเดินทาง</h2><div id="travelLogBody">'+travelLogPanel()+'</div><div class="actions"><button id="travelStart" class="primary" '+(travelRecording?'disabled':'')+'>เริ่มรอบใหม่</button><button id="travelStop" '+(!travelRecording?'disabled':'')+'>หยุดบันทึก</button><button id="travelExport" '+(!travelLog?'disabled':'')+'>ดาวน์โหลด JSON</button></div><hr><label for="travelSaved">รอบที่เก็บในเบราว์เซอร์</label><select id="travelSaved" style="width:100%;margin:8px 0" '+(travelRecording?'disabled':'')+'><option value="">เลือกรอบที่ต้องการโหลด</option>'+saved.map((x,i)=>'<option value="'+i+'">'+escapeSaveText(x.at+' · '+x.city)+'</option>').join('')+'</select><label for="travelImport">โหลดไฟล์ Log จากเครื่อง</label><input id="travelImport" type="file" accept=".json,application/json" '+(travelRecording?'disabled':'')+'><p>เก็บแยกจากเซปเมือง ไม่เปลี่ยนเมืองที่กำลังเล่น ขีดจำกัดรอบละ 10,000 เหตุการณ์</p><div class="actions"><button id="travelClose" class="primary">กลับไปเล่น</button></div>');
 $('travelStart').onclick=travelLogStart;
 $('travelStop').onclick=()=>{if(!travelLogAdmin())return;travelLogStop();openTravelLog();};
 $('travelClose').onclick=closeModal;
 $('travelExport').onclick=()=>{
  if(!travelLogAdmin()||!travelLog)return;travelLogStore();
  const url=URL.createObjectURL(new Blob([JSON.stringify(travelLog,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SMCity-travel-'+travelLog.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 };
 $('travelSaved').onchange=e=>{
  if(!travelLogAdmin()||travelRecording||e.target.value==='')return;
  try{const next=travelLogValidate(JSON.parse(localStorage.getItem(saved[+e.target.value].key)));travelLog=next;travelLogNotice='โหลดรอบที่บันทึกไว้แล้ว';openTravelLog();}catch(err){travelLogNotice=err.message;travelLogRefresh();}
 };
 $('travelImport').onchange=async e=>{
  const file=e.target.files?.[0],userId=window.SMGameAccount?.user?.id;
  if(!file||!travelLogAdmin()||travelRecording)return;
  try{
   if(file.size>8*1024*1024)throw Error('ไฟล์ใหญ่เกิน 8 MB');
   const next=travelLogValidate(JSON.parse(await file.text()));
   if(!travelLogAdmin()||window.SMGameAccount?.user?.id!==userId||travelRecording)return;
   next.id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
   next.stopReason=next.stopReason||'นำเข้าไฟล์เพื่อดูสถิติ';travelLog=next;travelLogNotice='โหลดไฟล์แล้ว';travelLogStore();openTravelLog();
  }catch(err){if(travelLogAdmin()){travelLogNotice=err.message;travelLogRefresh();}}
 };
}
function travelLogPulse(){
 if(!travelRecording)return;
 if(!travelLogAdmin()){travelRecording=false;travelLog=null;return;}
 if(state.time-travelLastSample>=15)travelLogSample();
 if(Date.now()-travelLastSave>=10000&&!travelLogStore()){travelLogStop('พื้นที่จัดเก็บไม่พร้อม');}
 travelLogRefresh();
}
window.addEventListener('pagehide',()=>{if(travelRecording)travelLogStop('ปิดหรือออกจากหน้าเกม');});

function dockItems(currentCategory){
 if(currentCategory==='reports')return[{key:'sendAi',name:'ส่ง AI',icon:'↗',price:'ส่งแมปและสถานะรถเพื่อวิเคราะห์บัค'},...(travelLogAdmin()?[{key:'travelLog',name:'Log การเดินทาง',icon:'◉',price:travelRecording?'กำลังบันทึก':'เฉพาะแอดมิน · เก็บในเครื่อง'}]:[]),{key:'cityReport',name:'รายงานเมือง',icon:'▤',price:'ตรวจการจราจรและเส้นทาง'}];
 let items=[];if(currentCategory==='roads'){items=['small','medium','large'].map(k=>({key:k,name:ROADS[k].name,icon:'═',price:fmt(ROADS[k].cost)}));}else if(currentCategory==='landscape'){items=[...TREE_KINDS.map(t=>({key:'tree:'+t.key,name:t.name,icon:t.icon,sub:'แตะเพื่อปลูกทีละต้น',price:'ตกแต่งฟรี'})),{key:'treeRow',name:'ปลูกเป็นแนว',icon:'🌱',sub:'ลากเพื่อปลูกเป็นแถว · '+TREE_KINDS.find(t=>t.key===currentTreeKind).name,price:'ตกแต่งฟรี'},{key:'treeBrush',name:'ปลูกเป็นกลุ่ม',icon:'🌿',sub:'ลากเพื่อปลูกเป็นกลุ่ม · '+TREE_KINDS.find(t=>t.key===currentTreeKind).name,price:'ตกแต่งฟรี'},{key:'eraseTree',name:'ลบต้นไม้',icon:'⌫',sub:'แตะเพื่อลบต้นไม้ที่ปลูก หรือเว้นบริเวณต้นไม้อัตโนมัติ',price:'ไม่มีค่ารื้อ'}];}else{const kinds=currentCategory==='work'?['office','factory']:currentCategory==='food'?['shop','restaurant','mall']:currentCategory==='leisure'?['park','pub']:currentCategory==='hotel'?['hotel']:currentCategory==='casino'?['casino']:['home'];items=Object.values(CATALOG).filter(t=>kinds.includes(t.kind)&&(t.kind!=='home'||['home_starter','home_large','home_dual','home_grand'].includes(t.key))).sort((a,b)=>kinds.indexOf(a.kind)-kinds.indexOf(b.kind)||(a.starterTier?0:1)-(b.starterTier?0:1)||(a.kind==='home'?a.residents-b.residents:0)).map(t=>({key:t.key,name:t.name,icon:KINDS[t.kind].icon,capacity:t.beds||t.residents||t.service||t.jobs,price:fmt(t.cost)}));}
 return items.filter(t=>t.key!=='hand');
}
// Construction categories are always visible, without an extra top-level dock row.
// Reports remain available through dockItems('reports') for Main Menu > Report.
function dockSectionFor(currentCategory){
 return dockGroups.find(group=>group.categories.includes(currentCategory))||dockGroups[0];
}
function dockVisibleItems(group,currentCategory){
 const visible=dockItems(currentCategory).map(item=>({...item,category:currentCategory}));
 return visible;
}
function updateCityQuickModes(){
 const rail=$('cityQuickModes');
 if(!rail?.querySelectorAll)return;
 for(const button of rail.querySelectorAll('[data-city-shortcut]')){
  const key=button.dataset.cityShortcut;
  const active=key==='trafficHeat'?heat:key==='missionDashboard'?false:tool===key;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 }
}
function renderTools(){
 const group=dockSectionFor(category),tray=$('tools'),sub=$('subcategories');
 dockGroup=group.key;
 // Keep the legacy mount empty for compatibility; do not render another tier of navigation.
 $('categories').innerHTML='';
 const hasSubcategories=true;
 sub.hidden=!hasSubcategories;
 sub.innerHTML=hasSubcategories?categories.filter(([key])=>group.categories.includes(key)).map(([key,name])=>
  `<button type="button" data-category="${key}" class="${category===key?'active':''}" aria-pressed="${category===key}">${name}</button>`).join(''):'';
 const previousGroup=tray.dataset?.currentDockGroup||'',previousCategory=tray.dataset?.currentDockCategory||'';
 const changed=previousGroup!==group.key||previousCategory!==category;
 const scroll=changed?0:tray.scrollLeft;
 const items=dockVisibleItems(group,category);
 tray.innerHTML=items.map(t=>
  `<button class="tool ${(t.key==='trafficHeat'?heat:tool===t.key)?'active':''}" data-tool="${t.key}" data-category="${t.category}" aria-pressed="${t.key==='trafficHeat'?heat:tool===t.key}" title="${t.name}"><span class="tool-icon">${t.icon}</span><span><strong class="tool-name">${t.name}${t.capacity?` <span class="tool-capacity">${t.capacity}</span>`:''}</strong><small class="tool-price">${t.price}</small></span></button>`).join('');
 if(tray.dataset){tray.dataset.currentDockGroup=group.key;tray.dataset.currentDockCategory=category;}
 tray.scrollLeft=scroll;
 updateCityQuickModes();
}
// The building/control dock is presentation-only; selected tools and the
// simulation remain untouched while the dock is folded.
function setDockCollapsed(collapsed){
 const dock=$('buildDock'),button=$('toggleDock'),icon=$('toggleDockIcon'),label=$('toggleDockText');
 if(!dock||!button)return;
 dock.classList.toggle('is-collapsed',!!collapsed);
 dock.closest('.control-deck')?.classList.toggle('tools-collapsed',!!collapsed);
 button.setAttribute('aria-expanded',String(!collapsed));
 button.setAttribute('aria-label',collapsed?'กางแถบเครื่องมือ':'หุบแถบเครื่องมือ');
 if(icon)icon.textContent=collapsed?'⌃':'⌄';
 if(label)label.textContent=collapsed?'กางเครื่องมือ':'หุบเครื่องมือ';
}
function selectTool(t){movingBuildingId=null;$('cancelMoveBuilding').hidden=true;if(t.startsWith('tree:'))currentTreeKind=t.slice(5);tool=t;trackingAt=-Infinity;if(t==='citizenDashboard')showCitizenDashboard();else hideCitizenDashboard();if(t==='touristDashboard')showTouristDashboard();else hideTouristDashboard();if(trackingLayer)trackingLayer.style.display=t==='tracking'?'block':'none';renderTools();$('hint').textContent=ROADS[t]?`ลากจากถนนเดิมไปยังจุดที่ต้องการ · ${ROADS[t].name} ${ROADS[t].lanes} เลน · กด Esc เพื่อยกเลิก`:CATALOG[t]?`${CATALOG[t].name} · แปลง ${CATALOG[t].plotWidth}×${CATALOG[t].plotHeight} · ที่จอด ${CATALOG[t].parkingCapacity} คัน · ${money(CATALOG[t].cost)} · ค่าดูแล ${money(CATALOG[t].maint)} / วัน · เกมช่วยจัดตำแหน่งติดถนนใกล้เมาส์หรือนิ้ว`:t.startsWith('tree:')||t==='treeRow'||t==='treeBrush'?'เลือกพื้นที่โล่งเพื่อปลูกต้นไม้ · ปลูกเป็นแนวหรือกลุ่มด้วยการลาก':t==='eraseTree'?'แตะต้นไม้เพื่อเอาออก · ไม่กระทบอาคารและถนน':t==='eraseRoad'?'ลากผ่านถนนที่จะรื้อ · ยืนยันครั้งเดียว · ข้ามถนนหลัก · รถบนถนนที่รื้อจะกลับเข้าเมืองใหม่':t==='erase'?'แตะตึกเพื่อรื้อ หรือลากตามถนนเพื่อลบต่อเนื่อง · ยืนยันก่อนรื้อทุกครั้ง':t==='tracking'?'โหมดติดตาม · เส้นสีจากรถไปตามเลนถึงปลายทาง · แตะรถดูรายละเอียด · Esc หรือแตะสองครั้งเพื่อปิด':t==='signalManage'?'โหมดไฟจราจร · คลิกที่ทางแยกเพื่อควบคุมไฟเอง หรือปรับค่าเริ่มต้นของทั้งเมือง':t==='citizenDashboard'?'โหมดประชาชน · ดูความสุข ปัญหา และกิจวัตรทั้งเมือง · กดรายชื่อเพื่อดูรายละเอียด':t==='hand'?'ลากแผนที่เพื่อเลื่อน · คลิกอาคารหรือรถเพื่อดูรายละเอียด · หมุนล้อเพื่อซูม':'เลือกสิ่งที่ต้องการรื้อ · ระบบจะแสดงค่ารื้อก่อนยืนยัน';if(t==='signalManage'){selected={kind:'signals'};renderInspector();}}
let dialogRevision=0;
function panelHeading(icon,title,subtitle=''){
 return '<header class="menu-heading"><span class="menu-logo" aria-hidden="true">'+icon+'</span><div><h2>'+title+'</h2>'+(subtitle?'<p class="panel-subtitle">'+subtitle+'</p>':'')+'</div></header>';
}
function tidyDialogHeading(html){
 return html.replace(/^(?:<span class="eyebrow">[^<]*<\/span>)?\s*<h2>([\s\S]*?)<\/h2>/,(_all,title)=>panelHeading('▦',title));
}
function modal(html){$('dialog').classList.remove('ai-upgrade-center');window.SMGameAccount?.closePanel?.();dialogRevision++;clearRoadPreview();$('dialogContent').onclick=null;$('dialogContent').innerHTML=tidyDialogHeading(html);if(!$('dialog').open)$('dialog').showModal();return dialogRevision;}
function clearRoadPreview(){$('dialog').classList.remove('road-preview-confirm');pendingRoadPreview=null;pendingDemolitionPreview=null;roadPreviewCache=null;constructionAnchor=null;$('dialog').classList.remove('construction-confirm','demolition-confirm');for(const key of ['margin','top','left','right','bottom','maxHeight'])$('dialog').style[key]='';}
// CSS zoom is explicitly disabled on the anchored construction dialog, so
// all measured positions are in the same viewport pixels as the pointer.
function constructionDialogPlacement(anchor,box,viewport){
 const margin=10,gap=14,w=Math.min(box.width,viewport.width-2*margin),h=Math.min(box.height,viewport.height-2*margin);
 const left=Math.max(margin,Math.min(viewport.width-w-margin,anchor.x-w/2));
 let top=anchor.y-h-gap;if(top<margin)top=anchor.y+gap;
 top=Math.max(margin,Math.min(viewport.height-h-margin,top));
 return{left,top,width:w,height:h};
}
function positionConstructionDialog(x,y){
 constructionAnchor={x,y};const dialog=$('dialog');dialog.classList.add('construction-confirm');
 const viewport={width:window.visualViewport?.width||innerWidth,height:window.visualViewport?.height||innerHeight};
 const dock=$('buildDock').getBoundingClientRect?.();if(dock?.top>150&&dock.top<viewport.height)viewport.height=dock.top-8;
 dialog.style.maxHeight=Math.max(90,viewport.height-20)+'px';
 const rect=dialog.getBoundingClientRect?.()||{width:Math.min(300,viewport.width-20),height:190};
 const position=constructionDialogPlacement({x,y},rect,viewport);
 Object.assign(dialog.style,{margin:'0',left:position.left+'px',top:position.top+'px',right:'auto',bottom:'auto'});dialog.scrollTop=0;
}
function positionConstructionAtWorld(x,y){const point=screen(x+(renderer3d?0:.5),y+(renderer3d?0:.5),.15);positionConstructionDialog(point[0],point[1]);}
window.addEventListener('resize',()=>{if(constructionAnchor&&$('dialog').open)positionConstructionDialog(constructionAnchor.x,constructionAnchor.y);});
function closeModal(){dialogRevision++;if($('dialog').open)$('dialog').close();clearRoadPreview();}
window.SMGameCloseDialog=closeModal;
$('dialogCloseTop').onclick=closeModal;
// For native HTML <dialog>, a backdrop click targets the dialog element,
// whereas clicks in the content or its padding remain inside its rectangle.
$('dialog').addEventListener('click',event=>{
 if(event.target!==$('dialog')||!$('dialog').open)return;
 const rect=$('dialog').getBoundingClientRect?.();
 if(!rect||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();
});
$('dialog').addEventListener('close',clearRoadPreview);
$('dialog').addEventListener('cancel',()=>{dialogRevision++;clearRoadPreview();});
const row=(a,b)=>`<div class="detail-row"><span>${a}</span><strong>${b}</strong></div>`;
const action=(name,key,value)=>`<button class="action" data-action="${key}" data-value="${value??''}">${name}</button>`;
function signalSlotName(slot){return slot?SIGNAL_DIRECTION_NAMES[slot.incoming]+' · '+slot.lanes+' เลน':'แดงทุกทิศ';}
function globalSignalInspector(){
 const s=state.signalDefaults,count=[...state.roads.keys()].filter(i=>junction(i)>=3).length;
 return `<span class="tag">ระบบไฟจราจรทั้งเมือง</span><h2>🚦 ตั้งค่าไฟทุกแยก</h2>${row('แยกที่มีไฟจราจร',count+' แยก')}`+
 `<section class="signal-control"><h3>เวลาเขียวต่อทิศ · ทุกเลนออกพร้อมกัน</h3><div class="signal-times">`+
 `<label for="signalDefaultEW">ทิศแนวนอน <span><input class="signal-minutes" id="signalDefaultEW" type="number" inputmode="numeric" min="5" max="240" step="1" value="${s.eastWest}"> นาที</span></label>`+
 `<label for="signalDefaultNS">ทิศแนวตั้ง <span><input class="signal-minutes" id="signalDefaultNS" type="number" inputmode="numeric" min="5" max="240" step="1" value="${s.northSouth}"> นาที</span></label></div>`+
 `<p class="signal-note">ทีละทิศและทุกเลนพร้อมกัน · เหลือง ${SIGNAL_YELLOW_MINUTES} นาที และแดงเคลียร์แยก ${SIGNAL_CLEAR_MINUTES} นาทีต่อทิศ · ไม่ปล่อยรถจากฝั่งตรงข้ามสวนกัน</p>`+
 action('บันทึกเป็นค่าเริ่มต้นสำหรับแยกใหม่','signal-defaults-save')+
 action('ใช้เวลานี้กับทุกแยกในเมือง','signal-defaults-apply')+
 action('คืนค่าแนะนำทุกแยก (ทิศละ 6 นาที)','signal-defaults-reset')+
 `<p class="signal-note">ใช้เวลานี้กับทุกแยกจะคงโหมดควบคุมเองไว้ · คืนค่าแนะนำจะเปลี่ยนทุกแยกกลับเป็นอัตโนมัติ ไฟเขียวทิศละ 6 นาที พร้อมช่วงไฟเหลืองและแดงเคลียร์แยก · คลิกแยกบนแผนที่เพื่อปรับทีละจุด</p></section>`;
}

function signalInspector(i){
 const setting=signalSettings(i),status=signalStatus(i),manual=setting.mode==='manual',smart=setting.mode==='smart',slots=signalSlots(i);
 const active=slots[status.slotIndex],current=status.yellow?'ไฟเหลือง · '+signalSlotName(active):
  status.phase>=0?signalSlotName(active):'แดงทุกทิศ';
 const remaining=status.remaining==null?'รอสั่งสลับไฟ':Math.ceil(status.remaining)+' นาทีในเกม';
 const rows=slots.map((slot,n)=>{
  const color=signalColor(i,slot.incoming);
  return `<div class="signal-direction" data-slot="${n}"><span class="signal-lamp ${color}"></span>
  <span>${signalSlotName(slot)}</span><b>${color==='green'?'เขียว':color==='yellow'?'เหลือง':'แดง'}</b></div>`;
 }).join('');
 const next=slots.length?slots[(signalManualSlot(i,setting,slots)+1)%slots.length]:null;
 return `<section class="signal-control" data-node="${i}"><h3>🚦 ควบคุมไฟแยกนี้</h3>
  <div class="signal-current"><span class="signal-mode">${smart?'✦ AI อัจฉริยะ':manual?'ควบคุมเอง':'อัตโนมัติ'}</span><strong>${current}</strong><small>${remaining}</small></div>${rows}
  <details class="inspect-section signal-settings"><summary>${smart?'เวลาไฟเดิม':'ตั้งเวลาและควบคุมไฟ'}</summary><div class="inspect-section-body"><div class="signal-times">
  <label for="signalEW">ทิศแนวนอน <span><input class="signal-minutes" id="signalEW" type="number" min="5" max="240" value="${setting.eastWest}"> นาที</span></label>
  <label for="signalNS">ทิศแนวตั้ง <span><input class="signal-minutes" id="signalNS" type="number" min="5" max="240" value="${setting.northSouth}"> นาที</span></label></div>
  <p class="signal-note">เปิดเขียวทีละทิศ ทุกเลนออกพร้อมกัน · เหลือง ${SIGNAL_YELLOW_MINUTES} นาที · แดงเคลียร์ ${SIGNAL_CLEAR_MINUTES} นาที · รอบ ${signalCycle(i)} นาทีเกม</p>`+
  (smart?'':action('บันทึกเวลาไฟแยกนี้','signal-save',i))+'</div></details>'+
  (smart?'<p class="signal-note">AI ตรวจคิวรถอัตโนมัติ · เขียวครั้งละ 5–18 นาทีเกม · ยังคงไฟเหลืองและช่วงเคลียร์แยก</p>':
   action('AI + อัปเกรดแยก · ฿1,000,000','signal-ai-buy',i))+
  (smart?'':manual?`<div class="signal-manual">${action('สลับไป '+signalSlotName(next),'signal-switch',i)}${action('กลับสู่ระบบอัตโนมัติ','signal-auto',i)}</div>`:
   action('ควบคุมไฟเอง','signal-manual',i))+
  (category==='signals'?action('ตั้งค่าไฟจราจรทั้งเมือง','signal-global',i):'')+`</section>`;
}
function refreshSignalInspector(i){
 const root=$('inspectContent').querySelector?.(`.signal-control[data-node="${i}"]`);
 if(!root)return false;
 const status=signalStatus(i),setting=signalSettings(i),slots=signalSlots(i),active=slots[status.slotIndex];
 root.querySelector('.signal-mode').textContent=setting.mode==='smart'?'✦ AI อัจฉริยะ':setting.mode==='manual'?'ควบคุมเอง':'อัตโนมัติ';
 root.querySelector('.signal-current strong').textContent=status.yellow?'ไฟเหลือง · '+signalSlotName(active):
  status.phase>=0?signalSlotName(active):'แดงทุกทิศ';
 root.querySelector('.signal-current small').textContent=status.remaining==null?'รอสั่งสลับไฟ':Math.ceil(status.remaining)+' นาทีในเกม';
 for(let n=0;n<slots.length;n++){
  const slot=slots[n],line=root.querySelector(`.signal-direction[data-slot="${n}"]`);if(!line)continue;
  const color=signalColor(i,slot.incoming);
  line.querySelector('.signal-lamp').className='signal-lamp '+color;
  line.querySelector('b').textContent=color==='green'?'เขียว':color==='yellow'?'เหลือง':'แดง';
 }
 return true;
}
function inspectorDisclosure(title,body,key){
 const content=$('inspectContent'),identity=selected.kind+':'+selected.id;
 const open=content.dataset?.selection===identity&&content.querySelector?.('details[data-inspect-section="'+key+'"]')?.open;
 return '<details class="inspect-section" data-inspect-section="'+key+'"'+(open?' open':'')+'><summary>'+title+'</summary><div class="inspect-section-body">'+body+'</div></details>';
}
function renderInspector(force=false){
normalizeSelectedCar();if(!selected)return;const s=computeStats();let html='';
if(!force&&selected.kind==='road'&&state.roads.has(selected.id)&&junction(selected.id)>=3&&refreshSignalInspector(selected.id))return;
if(selected.kind==='signals')html=globalSignalInspector();
else if(selected.kind==='parked'){
 const c=state.citizens.get(selected.id),b=state.buildings.get(selected.buildingId);
 if(!c||!b||!b.parked.has(c.id)){selected=null;$('inspector').classList.add('hidden');return;}
 html='<span class="tag">รถในลานจอด</span><h2>รถของ '+escapeSaveText(citizenName(c))+'</h2>'+row('สถานะ','จอดปกติ')+row('อาคาร',escapeSaveText(CATALOG[b.key].name))+row('ช่องจอด',String(parkingSpace(b,c.id)+1))+action('ดูข้อมูลประชาชน','citizen',c.id);
}
else if(selected.kind==='building'){
 const b=state.buildings.get(selected.id);if(!b){selected=null;$('inspector').classList.add('hidden');return;}
 const t=CATALOG[b.key],traffic=buildingTraffic(b);
 html=`<span class="tag">${KINDS[t.kind].icon} อาคาร #${b.id}</span><h2>${t.name}</h2><div class="inspect-overview">`;
 if(t.residents)html+=row('ผู้อยู่อาศัย',b.residents.size+' / '+t.residents);
 if(t.jobs)html+=row('พนักงาน',b.workers.size+' / '+t.jobs);
 if(t.service)html+=row('ผู้ใช้บริการ',b.visitors.size+' / '+t.service);
 if(t.beds)html+=row('จองที่พัก',(b.guests?.size||0)+' / '+t.beds);
 html+=row('รถจอด',b.parked.size+' / '+traffic.max)+row('กำลังเดินทางมา',traffic.approaching+' คัน')+row('รอออก',b.queue.length+' คัน')+'</div>';
 let detail=row('พื้นที่รวมลานจอด',buildingBounds(b).w+' × '+buildingBounds(b).h)+row('ค่าดูแล / วัน',money(t.maint));
 if(t.residents)detail+=row('กำลังย้ายเข้า',b.reservedResidents+' คน');
 if(t.beds)detail+=row('กำลังพักโรงแรม',[...(b.guests||[])].filter(id=>state.citizens.get(id)?.sleepUntil>state.time).length+' คน');
 if(t.service)detail+=row('จองเดินทางมา',b.reservedService+' คน')+row('เปิดบริการ',t.kind==='casino'?'24 ชั่วโมง':timeText(SERVICE_HOURS[t.kind][0])+'–'+timeText(SERVICE_HOURS[t.kind][1]));
 detail+=row('รอเส้นทาง',[...b.queue].filter(id=>state.vehicles.get(id)?.departureNoRoute).length+' คัน')+row('เดินทางมาถึง',b.arrivals+' ครั้ง')+'<p>เข้าออกจากขอบทางฝั่งซ้ายตามทิศรถ หากอยู่คนละฝั่ง รถต้องวนกลับตามเส้นทาง</p>';
 html+=inspectorDisclosure('รายละเอียดอาคารและการเดินทาง',detail,'building-info');
 const people=[...new Set([...b.residents,...b.workers,...b.visitors,...(b.guests||[])])].slice(0,24);
 if(people.length)html+=inspectorDisclosure('ประชาชน · '+people.length+' คน','<div class="inspect-list">'+people.map(c=>action(citizenName(state.citizens.get(c)),'citizen',c)).join('')+'</div>','building-people');
 html+='<div class="inspect-actions">'+action('ย้ายอาคาร','move-building',b.id)+action('รื้ออาคาร · ฟรี','demolish',b.id)+'</div>';
}
else if(selected.kind==='citizen'||selected.kind==='vehicle'){const v=selected.kind==='vehicle'?state.vehicles.get(selected.id):null,c=selected.kind==='citizen'?state.citizens.get(selected.id):v?.citizenId?state.citizens.get(v.citizenId):null;if(!c&&!v){html='<h2>เดินทางถึงจุดหมายแล้ว</h2><p>รถคันนี้เดินทางเสร็จแล้ว เลือกอาคารปลายทางเพื่อดูประชาชนต่อค่ะ</p>';}else if(c?.tourist){html=touristInspector(c);}else if(c){const cv=state.vehicles.get(c.vehicleId);html=`<span class="tag">ชีวิตประชาชน #${c.id}</span><h2>${citizenName(c)}</h2>`+row('บุคลิก',CITIZEN_TRAITS[c.profile.trait])+row('รูปแบบชีวิตวันนี้',lifestyleName(c.dailyPlan))+row('สถานะ',c.state)+row('ความสุข',Math.round(c.happy)+'%')+row('ภาษีวันนี้',money(workTax(c)))+row('บ้าน',buildingName(c.homeId))+row('งาน',c.profile.trait===3?'ไม่ต้องทำงาน':buildingName(c.workId))+row('ปัญหาล่าสุด',c.problem||'ยังไม่มีปัญหา');if(cv)html+=row('การเดินทาง',TRIPS[cv.kind].name)+row('จุดหมาย',cv.toId?buildingName(cv.toId):'ประตูเมือง')+row('เวลารอ',Math.floor(cv.wait)+' นาที')+action(follow===cv.id?'หยุดติดตามรถ':'ติดตามรถและเส้นทาง','follow',cv.id)+vehicleRecoveryActions(cv);html+='<h3>ตารางชีวิต</h3>'+row('ออกทำงานวันนี้',c.dailyPlan?.works?timeText(c.dailyPlan.day*1440+c.dailyPlan.leave):'—')+row('เลิกงานวันนี้',c.dailyPlan?.works?timeText(c.dailyPlan.day*1440+c.dailyPlan.end):'—')+row('ปรับออกเร็วขึ้น',Math.round(c.routine?.advance||0)+' นาที')+row('กิจกรรมโปรด',KINDS[c.profile.leisure]?.name||'กลับบ้าน');if(c.dailyPlan?.steps?.length)html+='<h3>แผนกิจกรรมวันนี้</h3><p>'+c.dailyPlan.steps.map(s=>timeText(c.dailyPlan.day*1440+(s.estimatedAt??s.at))+' '+lifestyleStepName(s)+((s.estimatedAt??s.at)>=1440?' (วันถัดไป)':'')).join('<br>')+'</p><p>เวลาโดยประมาณ ปรับตามการเดินทางและเวลาถึงจริง</p>';if(c.lifeRun&&c.lifeRun.day!==c.dailyPlan?.day)html+=row('กิจกรรมต่อจากวันก่อน',lifestyleStepName(c.lifeRun.plan.steps[c.lifeRun.index]));if(c.history.length)html+='<h3>การเดินทางล่าสุด</h3><p>'+c.history.slice(-4).reverse().join('<br>')+'</p>';}
else html='<span class="tag">รถภายนอก</span><h2>เดินทางผ่านเมือง</h2><p>รถจากประตูเมืองหนึ่งไปอีกประตูเมืองหนึ่ง ไม่มีประชาชนเจ้าของในเมืองนี้</p>'+action('ติดตามเส้นทาง','follow',v.id)+vehicleRecoveryActions(v);}
else if(selected.kind==='road'){const r=state.roads.get(selected.id);if(!r){$('inspector').classList.add('hidden');return;}const t=ROADS[r.type],j=junction(selected.id);html='<span class="tag">โครงข่ายจราจร</span><h2>'+t.name+'</h2>'+row('จำนวนเลน',t.lanes+' เลน')+row('ความจุจริง',t.lanes+' คัน / ช่อง')+row('รถในช่องนี้',occupancy(selected.id)+' คัน')+row('ค่าดูแล / วัน',r.main?'ฟรี':money(t.maint))+row('ทางแยก',j===4?'สี่แยก · ไฟจราจร':j===3?'สามแยก · ไฟจราจร':j===1?'ทางตัน · กลับรถไม่ได้':'ถนนต่อเนื่อง')+'<p>'+(r.main?'ถนนหลักเริ่มต้นของเมือง รื้อไม่ได้':'รถขับชิดซ้ายและใช้เลนตามเส้นทาง เมื่อเต็มจะรอคิว')+'</p>';if(j>=3)html+=signalInspector(selected.id);}
else if(selected.kind==='money')html='<span class="tag">การคลังเมือง</span><h2>งบประมาณ</h2>'+row('เงินคงเหลือ',money(state.money))+row('ภาษีประชาชน / วัน',money(s.tax))+row('ภาษีธุรกิจ / วัน',money(s.business))+row('ท่องเที่ยวรับจริงวันนี้',money(tourismLedger().fees-tourismLedger().refunds))+row('ค่าดูแลทั้งหมด / วัน',money(s.maint))+row('สุทธิ / วัน',money(s.net))+'<p>ภาษีปกติ 500 บาท ทำงานสาย 400 บาท พลาดงาน 250 บาท กิจกรรมอื่นไม่ลดภาษี ถนนหลักไม่มีค่าดูแล</p>';
else if(selected.kind==='tourists')html='<span class="tag">การท่องเที่ยว</span><h2>นักท่องเที่ยว</h2>'+touristSummaryMarkup()+action('ดูรายชื่อนักท่องเที่ยว','tourist-dashboard');
else if(selected.kind==='population')html='<span class="tag">ผู้คนในเมือง</span><h2>ประชากร '+s.pop+' คน</h2>'+row('กำลังย้ายเข้า',[...state.citizens.values()].filter(c=>!c.resident&&!c.removed&&!c.tourist).length+' คน')+row('ที่ว่างในบ้าน',s.freeHomes+' คน')+row('ตำแหน่งงานทั้งหมด',s.jobs)+row('ว่างงาน',s.unemployed+' คน')+'<p>มีบ้านว่าง เส้นทางจากประตูเมือง และความสุขตั้งแต่ 70% จึงจะมีคนย้ายเข้า คนจะนับเป็นประชากรเมื่อเดินทางถึงบ้านจริง</p><div class="inspect-list">'+[...state.citizens.values()].filter(c=>c.resident&&!c.removed).slice(0,40).map(c=>action(citizenName(c),'citizen',c.id)).join('')+'</div>';
else if(selected.kind==='happiness')html='<span class="tag">คุณภาพชีวิต</span><h2>ความสุข '+Math.round(s.happy)+'%</h2>'+row('มีความสุข',[...state.citizens.values()].filter(c=>c.resident&&c.happy>=80).length+' คน')+row('กำลังมีปัญหา',[...state.citizens.values()].filter(c=>c.resident&&c.happy<55).length+' คน')+'<p>ฐานเดินทาง 2 นาทีเกมต่อบล็อก + เผื่อรวม 20 นาที · ตัดสินเมื่อถึงอาคาร เที่ยวเดียวมีผลหลักครั้งเดียว และความเครียดจากรถติดเกินเวลาเผื่อไม่เกิน 2 แต้มต่อเที่ยว ภาษีลดเฉพาะปัญหาการทำงาน</p><p>งาน: ตรงเวลา +4 / สาย −2 / พลาด −6 · กิจกรรมเสริม: ตรงเวลา +3 / สายแต่สำเร็จ +1 / ไปไม่ทัน −2 · ข้ามก่อนออกเพราะเวลาไม่พอ: 0</p><p>ความสุขต่ำกว่า 25% ต่อเนื่อง 3 วัน หรือไม่มีงาน 5 วัน จึงเตรียมย้ายออก แก้ปัญหาแล้วความสุขฟื้นได้</p>';
else html='<span class="tag">การเดินทาง</span><h2>จราจรในเมือง</h2>'+row('รถทั้งหมด',state.vehicles.size+' คัน')+row('กำลังรอ',s.waiting+' คัน')+row('ความคล่องตัว',Math.round(s.flow)+'%')+'<p>คลิกที่รถเพื่อดูว่าของใคร กำลังไปไหน และติดอยู่เพราะอะไร เพิ่มเลนหรือกระจายงานและบริการให้ใกล้บ้านช่วยลดการเดินทาง</p>'+action(heat?'ปิดแผนที่รถติด':'เปิดแผนที่รถติด','heat');
$('inspector').classList.remove('hidden');
 // Keep the category label so each details panel has the same heading hierarchy.
 for(const note of ['การเข้าออกจากขอบทางฝั่งซ้ายตามทิศรถ หากอยู่คนละฝั่ง รถต้องวนกลับตามเส้นทาง','เวลาโดยประมาณ ปรับตามการเดินทางและเวลาถึงจริง','ถนนหลักเริ่มต้นของเมือง รื้อไม่ได้','รถขับชิดซ้ายและใช้เลนตามเส้นทาง เมื่อเต็มจะรอคิว','ภาษีปกติ 500 บาท ทำงานสาย 400 บาท พลาดงาน 250 บาท กิจกรรมอื่นไม่ลดภาษี ถนนหลักไม่มีค่าดูแล','มีบ้านว่าง เส้นทางจากประตูเมือง และความสุขตั้งแต่ 70% จึงจะมีคนย้ายเข้า คนจะนับเป็นประชากรเมื่อเดินทางถึงบ้านจริง','ไปทำงานและใช้บริการทันเวลาช่วยให้มีความสุข รถติด ไปสาย ไม่มีงาน และขาดบริการทำให้ความสุขลดลง','ต่ำกว่า 25% หรือว่างงาน 2 วัน ประชาชนจะเตรียมย้ายออก','คลิกที่รถเพื่อดูว่าของใคร กำลังไปไหน และติดอยู่เพราะอะไร เพิ่มเลนหรือกระจายงานและบริการให้ใกล้บ้านช่วยลดการเดินทาง'])html=html.replace('<p>'+note+'</p>','');
 if(['road','money','population','happiness','traffic','signals'].includes(selected.kind)){
  const notes=[];
  html=html.replace(/<p>([^<]+)<\/p>/g,(part,text)=>{notes.push(part);return '';});
  html=html.replace('<h3>การเข้าออก</h3>','');
  if(notes.length)html+='<details class="panel-help"><summary>รายละเอียดเพิ่มเติม</summary>'+notes.join('')+'</details>';
 }
 if(selected.kind==='vehicle'&&state.vehicles.has(selected.id)&&state.citizens.get(state.vehicles.get(selected.id).citizenId)?.tourist)html+=vehicleRecoveryActions(state.vehicles.get(selected.id));
if(['vehicle','citizen'].includes(selected.kind)){
 let section=0;
 html=html.replace(/<h3>([^<]*)<\/h3>([\s\S]*?)(?=<h3>|$)/g,(_all,title,body)=>inspectorDisclosure(title,body,'life-'+section++));
}
const journey=selectedCarVehicle();
 if(journey){const status=vehicleTimeliness(journey),remaining=Number.isFinite(journey.deadline)?journey.deadline-(journey.arrivedAt??state.time):null;
  const label=remaining==null?'ไม่มีเวลานัด':status==='red'?'สายแล้ว '+Math.ceil(-remaining)+' นาที':journey.arrivedAt!=null?'ถึงอาคารแล้ว':status==='orange'?'เหลือ '+Math.ceil(remaining)+' นาที ก่อนสาย':'ยังไม่สาย';
  html='<section class="selected-car-journey">'+row('ต้นทาง',escapeSaveText(trackingOrigin(journey)))+row('ปลายทาง',escapeSaveText(trackingDestination(journey)))+row('สถานะเวลา',(CAR_STATUS_EMOJI[status]?CAR_STATUS_EMOJI[status]+' ':'')+label)+'</section>'+html;
 }
// Consistent, semantic headers across buildings, vehicles, roads and city metrics.
 const inspectorKinds={
  building:['▤','อาคารในเมือง'],vehicle:['↗','ข้อมูลรถและการเดินทาง'],
  parked:['▣','รถในลานจอด'],road:['═','ถนนและทางแยก'],
  citizen:['♙','ประชาชน'],signals:['●','ควบคุมไฟจราจร'],
  money:['฿','การเงินเมือง'],population:['♙','ประชากร'],
  happiness:['♡','คุณภาพชีวิต'],tourists:['✧','นักท่องเที่ยว'],
  traffic:['↗','การจราจร']
 };
 const [panelIcon,panelLabel]=inspectorKinds[selected.kind]||['▦','ข้อมูลเมือง'];
 // Car routes appear below the header rather than interrupting the title.
 let journeyCard='';
 html=html.replace(/<section class="selected-car-journey">[\s\S]*?<\/section>/,part=>{journeyCard=part;return '';});
 html=html.replace(/(<span class="tag">[^<]*<\/span>)?\s*(<h2>[\s\S]*?<\/h2>)/,
  (_all,tag,heading)=>'<header class="sm-inspector-heading"><span class="sm-inspector-mark" aria-hidden="true">'+panelIcon+
   '</span><div class="sm-inspector-heading-text">'+(tag||'<span class="tag">'+panelLabel+'</span>')+heading+'</div></header>'+journeyCard);
 if($('inspector').dataset)$('inspector').dataset.kind=selected.kind;
 const content=$('inspectContent'),scroll=content.scrollTop;
 if(content.__inspectMarkup!==html){content.innerHTML=html;content.__inspectMarkup=html;}
 if(content.dataset)content.dataset.selection=selected.kind+':'+selected.id;
 content.scrollTop=scroll;
}
function buildingName(i){const b=state.buildings.get(i);return b?CATALOG[b.key].name+' #'+i:'ยังไม่มี';}
function citizenName(c){return c?['กานต์','ต้น','พลอย','มะลิ','นนท์','แพรว','ภูมิ','ฟ้า','บีม','อิง','พีท','ข้าวหอม'][c.id%12]+' #'+c.id:'ประชาชน';}
const TRIPS={hotel:{name:'ไปพักโรงแรม',color:'#ffd127'},touristOut:{name:'กลับนอกเมือง',color:'#ffd127'},moveIn:{name:'ย้ายเข้า',color:'#8cdd91'},work:{name:'ไปทำงาน',color:'#70b4e8'},home:{name:'กลับบ้าน',color:'#f4f0dc'},leisure:{name:'พักผ่อน',color:'#e897bf'},moveOut:{name:'ย้ายออก',color:'#e57865'},pass:{name:'ผ่านเมือง',color:'#edc863'}};
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
const SERVICE_HOURS={restaurant:[360,1560],mall:[600,1440],shop:[420,1440],park:[300,1380],pub:[1080,1620],casino:[0,1440]};
const SERVICE_STAY={restaurant:[30,70],mall:[45,120],shop:[20,60],park:[20,90],pub:[80,180],casino:[60,150]};
function serviceWindow(kind,at){
 const hours=SERVICE_HOURS[kind];if(!hours)return null;
 if(kind==='casino')return{open:-Infinity,close:Infinity};
 const day=Math.floor(at/1440);
 for(const d of [day-1,day]){const open=d*1440+hours[0],close=d*1440+hours[1];if(at>=open&&at<close)return{open,close};}
 return null;
}
function weightedLifestyle(c,day,ids,salt){
 const r=ensureRoutine(c),weights=ids.map(i=>{
  let w=LIFESTYLES[i].weight;
  if(i===r.affinity)w*=2;
  if(c.profile.trait===0&&i===0)w*=1.7;
  // Trait 1: easygoing food, shopping and recreation.
  if(c.profile.trait===1&&[4,8,9].includes(i))w*=1.6;
  // Trait 2: partygoer prioritizes social and late-night outings without
  // replacing the citizen's job or forcing any particular trip.
  if(c.profile.trait===2&&i===5)w*=2;
  if(c.profile.trait===2&&i===10)w*=2.8;
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
 if(r.preferences&&r.preferences.casino==null)r.preferences.casino=.25+habitRandom(c.id,0,145)*1.2;
 if(!r.preferences)r.preferences=Object.fromEntries(Object.keys(SERVICE_STAY).map((k,i)=>[k,.2+habitRandom(c.id,0,40+i)+(c.profile.leisure===k?1:0)]));
 return r;
}
// Derive a preference boost from the permanent personality rather than
// modifying stored preferences: old city saves receive the new behavior too.
function citizenServicePreference(c,kind){
 const base=ensureRoutine(c).preferences?.[kind]||.3;
 if(c.profile?.trait===2&&kind==='pub')return base*2.6;
 if(c.profile?.trait===2&&kind==='casino')return base*2.4;
 if(c.profile?.trait===1&&kind==='shop')return base*1.4;
 if(c.profile?.trait===1&&kind==='restaurant')return base*1.2;
 return base;
}
function workRoutine(c){
 const b=state.buildings.get(c.workId);if(!b)return null;const kind=CATALOG[b.key].kind;
 const workerIndex=[...b.workers].sort((a,b)=>a-b).indexOf(c.id),slot=(workerIndex<0?c.id:workerIndex)%3;
 if(kind==='casino'||kind==='factory'||kind==='hotel'){
  const start=[60,540,1020][slot];return{kind,shift:slot===0||slot===2?3:0,leave:start-65,end:start+480,open:0,close:2880};
 }
 if(kind==='pub')return{kind,shift:3,leave:1015,end:1620,open:960,close:1740};
 if(kind==='office'){
  const start=480+Math.round(habitRandom(c.id,0,52)*90);return{kind,shift:0,leave:start-65,end:start+480,open:420,close:1200};
 }
 const starts=kind==='park'?[300,720,1080]:kind==='mall'?[600,900,1140]:kind==='restaurant'?[360,840,1200]:[420,780,1080];
 const start=starts[slot],end=Math.min(SERVICE_HOURS[kind][1],start+480);
 return{kind,shift:slot===2?2:0,leave:start-65,end,open:SERVICE_HOURS[kind][0]-60,close:SERVICE_HOURS[kind][1]};
}
// Regular weekly days off: stable per person, never rerolled every morning.
function worksOnDay(c,day,w=workRoutine(c)){
 if(c.profile.trait===3||!w||c.movingOut)return false;
 if(Number.isFinite(c.arrivedAt)&&Math.floor(c.arrivedAt/1440)===day&&c.arrivedAt%1440>w.leave+65)return false;
 const weekday=((day%7)+7)%7;
 if(w.kind==='office')return c.id%12===0?![1,2].includes(weekday):weekday<5;
 const off=(w.kind==='factory'?c.id%7:c.id%5),second=(off+3)%7;
 return weekday!==off&&weekday!==second;
}

// Planning units: road blocks and simulation minutes, independent of UI speed.
const TRAVEL_PLANNING={version:1,minutesPerBlock:2,accessMinutes:10,waitMinutes:10};
function travelEstimate(path){
 if(!Array.isArray(path)||!path.length)return null;
 let blocks=0;for(let i=1;i<path.length;i++)blocks+=distance(path[i-1],path[i]);
 const roadMinutes=blocks*TRAVEL_PLANNING.minutesPerBlock;
 return{blocks,roadMinutes,accessMinutes:TRAVEL_PLANNING.accessMinutes,waitMinutes:TRAVEL_PLANNING.waitMinutes,totalMinutes:Math.ceil(roadMinutes+TRAVEL_PLANNING.accessMinutes+TRAVEL_PLANNING.waitMinutes)};
}
function buildingTravelEstimate(c,from,to){
 if(from===to)return{blocks:0,roadMinutes:0,accessMinutes:0,waitMinutes:0,totalMinutes:0};
 return travelEstimate(tripRoute(from,to,null,null,c?.locationId===from?c.id:null));
}
function nextPlannedWork(c,plan,index,at){
 const today=Math.floor(at/1440),plans=[plan,lifePlan(c,today),lifePlan(c,today+1)].filter(Boolean),options=[];
 for(const p of new Set(plans))for(let i=0;i<p.steps.length;i++){
  const step=p.steps[i];if(step.kind!=='work'||(p===plan&&i<=index))continue;
  const deadline=p.day*1440+step.deadline;
  if(deadline>at)options.push({deadline,buildingId:step.workId});
 }
 return options.sort((a,b)=>a.deadline-b.deadline)[0]||null;
}
function optionalActivityFits(c,plan,index,target,arrival,duration){
 const end=arrival+duration,next=nextPlannedWork(c,plan,index,state.time);
 if(next){const trip=buildingTravelEstimate(c,target,next.buildingId);if(!trip||end+trip.totalMinutes>next.deadline)return false;}
 if(Number.isFinite(plan.leisureEnd)){
  const home=buildingTravelEstimate(c,target,c.homeId);
  if(!home||end+home.totalMinutes>plan.day*1440+plan.leisureEnd)return false;
 }
 return true;
}
function skipOptionalActivity(c,reason){
 const run=c.lifeRun;if(!run)return;
 c.history.push(timeText(state.time)+' ข้ามกิจกรรมเสริม · '+reason+' · ไม่หักความสุข');c.history=c.history.slice(-12);
 c.pending=null;lifeAdvance(c);
}
function estimatePlanTravel(c,plan){
 let origin=c.homeId,cursor=0;
 for(let index=0;index<plan.steps.length;index++){
  const step=plan.steps[index];let target=step.kind==='work'?step.workId:step.kind==='home'?c.homeId:null,estimate=null;
  if(!target){
   const from=state.buildings.get(origin);
   const candidates=[...state.buildings.values()].filter(b=>CATALOG[b.key].kind===step.kind&&b.id!==origin).sort((a,b)=>Math.abs(a.x-(from?.x||0))+Math.abs(a.y-(from?.y||0))-Math.abs(b.x-(from?.x||0))-Math.abs(b.y-(from?.y||0)));
   for(const b of candidates){const t=buildingTravelEstimate(c,origin,b.id);if(t){target=b.id;estimate=t;break;}}
  }else estimate=buildingTravelEstimate(c,origin,target);
  step.estimatedAt=Math.max(step.at,cursor);step.travelEstimate=estimate;
  if(step.kind==='work'){
   // Work appointments stay fixed; optional stops must fit around them.
   if(estimate)step.at=Math.min(step.at,step.deadline-estimate.totalMinutes);
   step.estimatedAt=Math.max(step.at,cursor);cursor=Math.max(step.estimatedAt+(estimate?.totalMinutes||0),step.until);origin=target;
  }else if(estimate){
   const done=step.estimatedAt+estimate.totalMinutes+(step.duration||step.rest||0);
   const next=plan.steps.slice(index+1).find(s=>s.kind==='work');
   const onward=next?buildingTravelEstimate(c,target,next.workId):null;
   if(step.kind!=='home'&&(done>(step.expires??plan.leisureEnd)||(next&&(!onward||done+onward.totalMinutes>next.deadline)))){step.planningSkipped=true;continue;}
   step.at=step.estimatedAt;cursor=done;origin=target;
  }
 }
 plan.travelPlanningVersion=TRAVEL_PLANNING.version;return plan;
}
function migrateTravelPlanning(){
 const day=Math.floor(state.time/1440);
 for(const c of state.citizens.values()){
  if(c.tourist||!c.resident||c.removed)continue;
  for(const d of [...c.scheduled]){
   if(d<=day||c.lifeRun?.day===d||c.lifePlans?.[d]?.travelPlanningVersion===TRAVEL_PLANNING.version)continue;
   c.scheduled.delete(d);if(c.lifePlans)delete c.lifePlans[d];
   state.events=state.events.filter(e=>!(e.citizenId===c.id&&e.day===d&&e.action==='lifeStart'));
  }
  scheduleDay(c,day+1);
 }
 eventHeapify();
}

function planForDay(c,day){
 const r=ensureRoutine(c),w=workRoutine(c),weekday=((day%7)+7)%7,weekend=weekday>=5,works=worksOnDay(c,day,w);
 const random=s=>habitRandom(c.id,day,s),pick=(lo,hi,s)=>Math.round(lo+random(s)*(hi-lo));
 const style=works?(w.shift===3?3:weightedLifestyle(c,day,[0,1,2,4,5,6],55)):weightedLifestyle(c,day,[7,8,9,10,11],55);
 const steps=[],add=(kind,at,extra={})=>steps.push({kind,at,...extra});
 const prefer=(salt,allow=Object.keys(SERVICE_STAY))=>{
  let n=random(salt)*allow.reduce((sum,k)=>sum+citizenServicePreference(c,k),0);
  for(const k of allow){n-=citizenServicePreference(c,k);if(n<0)return k;}return allow[0];
 };
 let commuteDistance=0;const path=works?tripRoute(c.homeId,c.workId,null,null,c.id):null;
 if(path)for(let k=1;k<path.length;k++)commuteDistance+=distance(path[k-1],path[k]);
 const commuteMinutes=travelEstimate(path)?.totalMinutes??20;
 const workArrival=works?w.leave+65:null,end=works?w.end:null;
 const leave=works?Math.round(workArrival-commuteMinutes-r.advance-random(17)*(8+(1-r.punctuality)*16)):null;
 const nextW=workRoutine(c),nextWorks=worksOnDay(c,day+1,nextW);
 const finishBy=nextWorks?Math.min(1620,1440+nextW.leave+65-commuteMinutes-360):1620;
 const service=(kind,at,salt,limit=finishBy)=>{
  const hours=SERVICE_HOURS[kind],range=SERVICE_STAY[kind];
  // A casino remains open overnight, but a citizen still needs time to rest.
  if(at>=limit-25)return;
  const duration=pick(range[0],range[1],salt);
  add(kind,at,{duration,expires:Math.min(limit,at+Math.max(180,duration+100))});
 };
 const home=(at,rest,sleep=false)=>add('home',at,{...(rest?{rest}:{}),sleep});
 if(works){
  if(leave>480&&random(61)<.55)service('restaurant',Math.max(360,leave-85),62,leave-5);
  add('work',leave,{until:end,deadline:workArrival,workId:c.workId});
  if(style===4&&workArrival<660&&end>900){
   const lunch=pick(690,780,63);steps[steps.length-1].until=lunch;
   add('restaurant',lunch,{duration:pick(30,40,64),expires:lunch+95,lunch:true});
   add('work',lunch+55,{until:end,deadline:lunch+105,workId:c.workId,resume:true});
  }
  const after=end+pick(3,18,65),dayWorker=end<=1260;
  // Most day workers have more than one destination after their shift.
  if(after<finishBy-60){
   service('restaurant',after,66);
   if(dayWorker&&random(67)<.8)service(prefer(68,['shop','mall','park','casino']),after+75,69);
   if(dayWorker&&random(70)<.8&&finishBy>1320){
    home(after+150,pick(35,70,71));
    service(prefer(72,['restaurant','pub','casino']),Math.max(1200,after+210),73);
    if((weekday===4||weekday===5)&&random(74)<.45)service(prefer(75,['pub','casino']),Math.max(1320,after+290),76);
   }
  }
  home(after,undefined,true);
 }else{
  const start=Math.max(540,Math.round((r.lastHomeAt||day*1440)+360-day*1440),pick(540,590,80));
  if(style===7&&random(81)<.65){service(prefer(82,['shop','restaurant','park']),pick(660,1020,83),84);home(1020);}
  else{
   service(prefer(85,['restaurant','shop','park']),start,86);
   service(prefer(87,['mall','shop','casino','park']),Math.max(610,start+75),88);
   service('restaurant',Math.max(720,start+170),89);
   home(start+240,pick(45,85,90));
   service(prefer(91,['mall','park','shop','casino']),start+pick(270,330,92),93);
   service('restaurant',pick(1080,1170,94),95);
   if(style===10||random(96)<(weekend?.9:.7)){
    home(1170,pick(35,65,97));service(prefer(98,['pub','casino','restaurant']),pick(1230,1350,99),100);
   }
   home(1260,undefined,true);
  }
 }
 // Readiness is based on actual arrival, not a teleport to the next timetable slot.
 let cursor=0;for(const step of steps){step.estimatedAt=Math.max(step.at,cursor);cursor=step.kind==='work'?Math.max(step.estimatedAt,step.until):step.estimatedAt+(step.duration||step.rest||0)+15;}
 return estimatePlanTravel(c,{version:251,token:'251:'+day,day,works,weekend,lifestyle:LIFESTYLES[style].id,style,leave,end,postDelay:10,
  desiredArrival:workArrival,workId:c.workId,kind:steps.find(s=>SERVICE_STAY[s.kind])?.kind,
  leisureStart:steps.find(s=>SERVICE_STAY[s.kind])?.at??600,leisureEnd:finishBy,steps});
}

function lifestyleName(plan){return LIFESTYLES.find(l=>l.id===plan?.lifestyle)?.name||'กิจวัตรเดิม';}
function lifestyleStepName(s){return s.kind==='work'?(s.resume?'กลับเข้าทำงาน':'ทำงาน'):s.kind==='home'?'กลับบ้าน':KINDS[s.kind]?.name||s.kind;}
function lifePlan(c,day){return c.lifePlans?.[day]||(c.dailyPlan?.day===day?c.dailyPlan:null);}
const HOME_ACTIVITY_TARGETS=[{from:180,to:600,limit:null},{from:600,to:1080,limit:.20},{from:1080,to:1440,limit:.30},{from:0,to:180,limit:.50}];
function homeActivityLimit(at=state.time){const minute=((at%1440)+1440)%1440;return HOME_ACTIVITY_TARGETS.find(s=>minute>=s.from&&minute<s.to).limit;}
function activitySnapshot(){
 let population=0,home=0,pending=0;for(const c of state.citizens.values()){
  if(!c.resident||c.removed||c.movingOut)continue;population++;
  const b=state.buildings.get(c.homeId);if(b?.parked.has(c.id)&&c.locationId===c.homeId){home++;if(c.vehicleId||c.adaptiveRequest)pending++;}
 }
 const limit=homeActivityLimit();return{population,home,pending,ratio:population?home/population:0,limit,excess:limit==null?0:Math.max(0,home-pending-Math.floor(population*limit))};
}
function chooseCityOuting(c,requests=new Map()){
 const hour=(state.time%1440)/60,origin=state.buildings.get(c.locationId);if(!origin)return{reason:'ไม่มีอาคารต้นทาง'};
 const allowed=hour>=18||hour<3?['restaurant','pub','casino','shop','mall']:['restaurant','shop','mall','park','casino'];
 const kinds=allowed.filter(k=>serviceWindow(k,state.time)).sort((a,b)=>citizenServicePreference(c,b)-citizenServicePreference(c,a));
 let exists=false,space=false;
 for(const kind of kinds){
  const win=serviceWindow(kind,state.time),duration=Math.round(SERVICE_STAY[kind][0]+habitRandom(c.id,Math.floor(state.time/15),183)*30);
  const choices=[...state.buildings.values()].filter(b=>b.id!==origin.id&&CATALOG[b.key].kind===kind).sort((a,b)=>distance(id(a.x,a.y),id(origin.x,origin.y))-distance(id(b.x,b.y),id(origin.x,origin.y)));
  for(const b of choices){exists=true;const held=requests.get(b.id)||0;
   if(b.visitors.size+b.reservedService+held>=CATALOG[b.key].service||parkingFree(b)<=held)continue;space=true;
   const path=tripRoute(origin.id,b.id,null,null,c.id);if(!path)continue;
   let length=0;for(let k=1;k<path.length;k++)length+=distance(path[k-1],path[k]);const eta=travelEstimate(path).totalMinutes;
   const day=Math.floor(state.time/1440),workPlans=[lifePlan(c,day),lifePlan(c,day+1)].filter(Boolean);
   const upcoming=workPlans.flatMap(plan=>plan.steps.filter(s=>s.kind==='work'&&s.at+plan.day*1440>state.time).map(step=>({at:step.at+plan.day*1440}))).sort((a,b)=>a.at-b.at)[0];
   const quiet=(hour<3?Math.floor(state.time/1440)*1440+180:(Math.floor(state.time/1440)+1)*1440+180);
   const end=Math.min(win.close,state.time+240,quiet,upcoming?upcoming.at-45:Infinity);
   const homeTrip=buildingTravelEstimate(c,b.id,c.homeId);if(!homeTrip||state.time+eta+duration+homeTrip.totalMinutes>end)continue;
   return{kind,buildingId:b.id,duration,end};
  }
 }
 return{reason:!exists?'ไม่มีสถานที่เปิดรองรับ':!space?'บริการหรือที่จอดเต็ม':'ไม่มีเส้นทางหรือเวลาไม่พอ'};
}
function startCityOuting(c,extra){
 if(!c)return;const request=c.adaptiveRequest;if(!request||request.token!==extra.token)return;
 c.adaptiveRequest=null;if(c.removed||c.movingOut||c.vehicleId||c.lifeRun||c.locationId!==c.homeId)return;
 const chosen=chooseCityOuting(c);if(chosen.reason)return; // no invented failed trip
 const day=Math.floor(state.time/1440),token=request.token,plan={version:251,token,source:'adaptive',day,steps:[
  {kind:chosen.kind,at:state.time-day*1440,duration:chosen.duration,expires:chosen.end-day*1440,preferredBuilding:chosen.buildingId},
  {kind:'home',at:state.time-day*1440+chosen.duration+20}]};
 c.lifeRun={day,index:0,retry:0,token,plan};c.lastAdaptiveOuting=state.time;
 runLifestyle(c,'life',{day,index:0,token});
}
function updateCityActivity(){
 const day=Math.floor(state.time/1440),minute=state.time%1440;
 if(minute>=360&&state.morningPlanningDay!==day){
  state.morningPlanningDay=day;
  for(const c of state.citizens.values())if(c.resident&&!c.removed&&!c.movingOut){scheduleDay(c,day);scheduleDay(c,day+1);}
 }
 if(state.time<(state.nextActivityCheck||0))return;
 state.nextActivityCheck=(Math.floor(state.time/15)+1)*15;
 const report=activitySnapshot(),blocked={},requests=new Map();
 for(const c of state.citizens.values())if(c.adaptiveRequest)requests.set(c.adaptiveRequest.buildingId,(requests.get(c.adaptiveRequest.buildingId)||0)+1);
 // Wake the next cohort ahead of 10:00 rather than ejecting everyone at 10:00.
 const proactive=minute>=555&&minute<600,needed=proactive?Math.max(0,report.home-report.pending-Math.floor(report.population*.2)):report.excess;
 let budget=Math.min(needed,Math.max(1,Math.ceil(report.population*.12))),queued=0;
 if(report.limit!=null||proactive){
  const candidates=[...state.citizens.values()].filter(c=>c.resident&&!c.removed&&!c.movingOut&&c.locationId===c.homeId&&!c.vehicleId&&!c.adaptiveRequest&&(!c.lifeRun||(c.lifeRun.plan.steps[c.lifeRun.index]?.kind==='home'&&c.lifeRun.plan.steps[c.lifeRun.index]?.rest&&SERVICE_STAY[c.lifeRun.plan.steps[c.lifeRun.index+1]?.kind])))
   .sort((a,b)=>habitRandom(a.id,Math.floor(state.time/15),181)-habitRandom(b.id,Math.floor(state.time/15),181));
  for(const c of candidates){
   if(budget<=0)break;
   if(c.sleepUntil>state.time){blocked['กำลังนอนพัก']=(blocked['กำลังนอนพัก']||0)+1;continue;}
   const rest=state.time-(c.routine?.lastHomeAt??state.time-360);
   if(rest<45||(state.time-(c.lastAdaptiveOuting??-Infinity))<120){blocked['กำลังพัก']=(blocked['กำลังพัก']||0)+1;continue;}
   const morningRest=minute<600&&rest<360;
   if(morningRest){blocked['พักจากกะดึก']=(blocked['พักจากกะดึก']||0)+1;continue;}
   const chosen=chooseCityOuting(c,requests);if(chosen.reason){blocked[chosen.reason]=(blocked[chosen.reason]||0)+1;continue;}
   if(c.lifeRun){
    const run=c.lifeRun,next=run.plan.steps[run.index+1];next.kind=chosen.kind;next.duration=chosen.duration;
    next.at=state.time-run.day*1440+1+habitRandom(c.id,Math.floor(state.time/15),182)*13;next.expires=chosen.end-run.day*1440;
    c.activityUntil=null;lifeAdvance(c);requests.set(chosen.buildingId,(requests.get(chosen.buildingId)||0)+1);budget--;queued++;continue;
   }
   const token='extra:'+day+':'+Math.floor(state.time/15)+':'+c.id;
   c.adaptiveRequest={...chosen,token};requests.set(chosen.buildingId,(requests.get(chosen.buildingId)||0)+1);
   schedule(c,state.time+1+habitRandom(c.id,Math.floor(state.time/15),182)*13,'cityOuting',{token});budget--;queued++;
  }
 }
 const resting=[...state.citizens.values()].filter(c=>c.resident&&!c.removed&&c.locationId===c.homeId&&!c.vehicleId&&c.lifeRun).length;if(resting)blocked['พักหรือรอตามแผน']=resting;
 state.homeActivityReport={...report,at:state.time,queued,blocked};
}
function migrateActivity251(){
 const day=Math.floor(state.time/1440),changed=[];
 for(const c of state.citizens.values()){
  if(!c.resident||c.removed||c.activityVersion===251)continue;c.activityVersion=251;ensureRoutine(c);changed.push(c);
  // Keep every in-progress shift/trip; only unused future days are rebuilt.
  for(const d of [...c.scheduled])if(d>day){c.scheduled.delete(d);if(c.lifePlans)delete c.lifePlans[d];}
 }
 if(changed.length){const ids=new Set(changed.map(c=>c.id));state.events=state.events.filter(e=>!ids.has(e.citizenId)||e.action!=='lifeStart'||e.day<=day);eventHeapify();for(const c of changed)scheduleDay(c,day+1);}
 state.nextActivityCheck=state.time;
}

function scheduleDay(c,day){
 if(c.scheduled.has(day)||c.removed||c.movingOut){if(day===Math.floor(state.time/1440)&&c.lifePlans?.[day])c.dailyPlan=c.lifePlans[day];return;}
 assignJob(c);c.scheduled.add(day);if(c.scheduled.size>4)c.scheduled.delete(Math.min(...c.scheduled));
 const plan=planForDay(c,day);if(day===Math.floor(state.time/1440)||!c.dailyPlan)c.dailyPlan=plan;
 if(!c.lifePlans)c.lifePlans={};c.lifePlans[day]=plan;
 for(const key of Object.keys(c.lifePlans))if(+key<day-1&&+key!==c.lifeRun?.day)delete c.lifePlans[key];
 if(plan.steps.length)schedule(c,Math.max(state.time+.5,day*1440+plan.steps[0].at),'lifeStart',{day,token:plan.token});
}
function lifeAdvance(c){
 const run=c.lifeRun;if(!run)return;
 c.pending=null;run.index++;run.retry=0;
 if(run.index>=run.plan.steps.length){c.lifeRun=null;c.activityUntil=null;return;}
 const step=run.plan.steps[run.index];
 schedule(c,Math.max(state.time+.5,run.day*1440+step.at),'life',{day:run.day,index:run.index,token:run.token});
}
function lifeRetry(c,step,problem){
 const run=c.lifeRun;if(!run)return;
 const end=run.day*1440+(step.expires??step.until??1740);
 if(step.kind==='home'){run.retry++;if(run.retry===4)unstartedResult(c,step,'unavailable',problem);}
 if(SERVICE_STAY[step.kind]&&state.time+15>=end){skipOptionalActivity(c,'หมดเวลารอก่อนออกเดินทาง');return;}
 if(step.kind!=='home'&&(++run.retry>=4||state.time+15>=end)){unstartedResult(c,step,'unavailable',problem);lifeAdvance(c);return;}
 const action=step.kind==='work'?'work':step.kind==='home'?'home':'leisure';
 c.pending={action,kind:SERVICE_STAY[step.kind]?step.kind:undefined,end,life:true,day:run.day,index:run.index,
  attempts:run.retry,next:state.time+15+habitRandom(c.id,run.day,80+run.retry)*15,expires:step.kind==='home'?state.time+1440:end};
 c.problem=problem;
 // Retries are heap events, not a scan of all residents every frame.
 schedule(c,c.pending.next,'life',{day:run.day,index:run.index,token:run.token});
}
function runLifestyle(c,action,extra){
 if(!c||!c.resident||c.removed||c.movingOut)return;
 if(action==='lifeStart'){
  const plan=lifePlan(c,extra.day);if(!plan||!plan.steps.length||extra.token!==plan.token)return;
  if(c.lifeRun?.day===extra.day&&c.lifeRun.token===plan.token)return;
  if(c.lifeRun||c.vehicleId){if(state.time<(extra.day+1)*1440)schedule(c,Math.max(state.time+30,c.activityUntil||0),'lifeStart',{day:extra.day,token:plan.token});return;}
  c.lifeRun={day:extra.day,index:0,plan,retry:0,token:plan.token};
 }
 const run=c.lifeRun;
 if(!run||extra.token!==run.token||extra.day!==run.day||(extra.index!=null&&extra.index!==run.index))return;
 if(c.vehicleId)return;
 if(action!=='lifeNext'&&state.time<(c.activityUntil||0))return;
 if(action==='lifeNext'){if(state.time<(c.activityUntil||0))return;c.activityUntil=null;lifeAdvance(c);return;}
 const step=run.plan.steps[run.index],base=run.day*1440,meta={day:run.day,index:run.index,token:run.token};
 if(!step)return;
 if(step.kind!=='work'&&step.kind!=='home'&&c.locationId===c.homeId&&c.sleepUntil>state.time){schedule(c,c.sleepUntil,'life',meta);return;}
 if(state.time<base+step.at){schedule(c,base+step.at,'life',meta);return;}
 c.pending=null;
 if(step.kind==='work'){
  assignJob(c);
  if(!c.workId||c.workId!==step.workId||state.time>=base+step.until){unstartedResult(c,step,state.time>=base+step.until?'missed':'unavailable','ไปทำงานไม่ทันหรือไม่มีงานรองรับ');lifeAdvance(c);return;}
  if(c.locationId===c.workId){journeyResult(c,{id:'already-at-work',kind:'work',life:meta},state.time>base+step.deadline?'late':'ontime','อยู่ที่ทำงานพร้อมเริ่มกิจกรรม',false);c.state='อยู่ที่ทำงาน';c.activityUntil=base+step.until;schedule(c,c.activityUntil,'lifeNext',meta);return;}
  if(createTrip(c,'work',c.locationId||c.homeId,c.workId,null,null,base+step.deadline,{life:meta}))return;
  lifeRetry(c,step,'ไม่มีเส้นทางไปทำงานหรือที่จอดเต็ม');return;
 }
 if(step.kind==='home'){
  if(c.locationId===c.homeId){c.state='อยู่บ้าน';if(step.rest){c.activityUntil=state.time+step.rest;schedule(c,c.activityUntil,'lifeNext',meta);}else lifeAdvance(c);return;}
  if(createTrip(c,'home',c.locationId,c.homeId,null,null,state.time+1440,{life:meta}))return;
  lifeRetry(c,step,'ไม่มีเส้นทางกลับบ้านหรือที่จอดเต็ม');return;
 }
 const expires=base+(step.expires??1740);
 if(state.time>=expires){skipOptionalActivity(c,'เวลาในตารางไม่พอ');return;}
 const origin=state.buildings.get(c.locationId)||state.buildings.get(c.homeId);
 if(!origin){lifeAdvance(c);return;}
 let timeLimited=false;
 const kinds=step.lunch?[step.kind]:[step.kind,...Object.keys(SERVICE_STAY).filter(k=>k!==step.kind)];
 for(const kind of kinds){
  const win=serviceWindow(kind,state.time);if(!win)continue;
  const choices=[...state.buildings.values()].filter(b=>b.id!==origin.id&&CATALOG[b.key].kind===kind&&b.visitors.size+b.reservedService<CATALOG[b.key].service&&parkingFree(b)>0)
   .sort((a,b)=>(Math.abs(a.x-origin.x)+Math.abs(a.y-origin.y))-(Math.abs(b.x-origin.x)+Math.abs(b.y-origin.y)));
  for(const b of choices){
   const path=tripRoute(origin.id,b.id,null,null,c.id);if(!path)continue;
   let distance=0;for(let i=1;i<path.length;i++)distance+=Math.hypot(...xy(path[i]).map((n,k)=>n-xy(path[i-1])[k]));
   const eta=travelEstimate(path).totalMinutes;
   const span=SERVICE_STAY[kind],duration=kind===step.kind?step.duration:Math.round(span[0]+habitRandom(c.id,run.day,90+run.index)*(span[1]-span[0]));
   if(state.time+eta+duration>Math.min(win.close,expires)||!optionalActivityFits(c,run.plan,run.index,b.id,state.time+eta,duration)){timeLimited=true;continue;}
   if(createTrip(c,'leisure',origin.id,b.id,null,null,state.time+eta,{life:meta,activityEnd:expires,serviceKind:kind,stay:duration,closeAt:win.close}))return;
  }
 }
 if(timeLimited){skipOptionalActivity(c,'เผื่อเดินทางแล้วไม่ทันกิจกรรมหรือเวลางาน');return;}
 lifeRetry(c,step,'สถานที่ปิด เต็ม หรือไม่มีเส้นทางไปถึง');
}
function arriveLifestyle(c,v,b){
 const run=c.lifeRun;
 if(!run||v.life.token!==run.token||v.life.day!==run.day||v.life.index!==run.index){schedule(c,state.time+.5,'home');return;}
 const step=run.plan.steps[run.index],meta={day:run.day,index:run.index,token:run.token};let until=state.time+.5;
 if(v.kind==='work'){
  c.state=v.arrivalResult==='missed'?'ถึงที่ทำงานหลังหมดช่วงงาน':v.late?'อยู่ที่ทำงาน · มาสาย':'อยู่ที่ทำงาน';
  until=Math.max(state.time+.5,run.day*1440+step.until);
 }else if(v.kind==='leisure'){
  const at=v.arrivedAt??state.time,window=serviceWindow(v.serviceKind,at),duration=v.stay||step.duration;
  // Late traffic can invalidate a reservation. Do not admit visitors or reward
  // a closed/full venue; continue the itinerary from the actual arrival point.
  if(v.arrivalResult!=='missed'&&window&&at+duration<=Math.min(window.close,v.activityEnd)){
   b.visitors.add(c.id);c.state='อยู่'+KINDS[v.serviceKind].name;until=Math.max(state.time+.5,at+duration);
  }else{c.state='ถึงสถานที่แล้วแต่ใช้บริการไม่ได้';c.problem='ถึงช้ากว่าเวลาที่ใช้บริการได้';}
 }else{
  c.state='อยู่บ้าน';ensureRoutine(c).lastHomeAt=state.time;if(step.sleep){const minute=state.time%1440,nightWorker=c.workId&&workRoutine(c)?.shift===3;c.sleepUntil=minute<600||minute>=1380||(nightWorker&&minute<900)?state.time+360:null;}until=state.time+(step.rest||.5);
 }
 c.activityUntil=until;schedule(c,until,'lifeNext',meta);
}

// Visitors share the citizen/vehicle graph, but never become residents or workers.
const TOURISM={happiness:80,residentHappiness:70,populationRatio:.65,fee:1500,discount:500,minDuration:300,maxDuration:600};
const TOURIST_KINDS=['restaurant','mall','pub','shop','park','casino'];
let touristSearch='',touristPage=0,touristDashboardAt=0,touristFilter='all';
const TOURIST_FILTERS=[['all','ทั้งหมด'],['service','ใช้บริการ'],['hotel','พักโรงแรม'],['travel','เดินทาง'],['waiting','รอเข้าเมือง'],['issues','มีปัญหา']];
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
 state.money+=TOURISM.fee;missionMoney('touristsRevenue',TOURISM.fee);ledger.fees+=TOURISM.fee;ledger.totalFees+=TOURISM.fee;
}
function touristEnter(c,v){
 if(!c?.tourist)return;
 if(c.enteredAt==null){missionCount('touristsIn');c.enteredAt=state.time;c.tourEnd=state.time+c.tourDuration;tourismLedger().arrivals++;}
 touristCharge(c);if(v&&v.tourFeePeriod==null)v.tourFeePeriod=c.feePeriods.length-1;
}
function touristActivityResult(c,step,outcome){
 if(!c||!step||step.outcomeScored)return;step.outcomeScored=outcome;
 recordMissionResult('tourist',outcome,state.vehicles.get(c.vehicleId),step.kind);
 if(outcome!=='ontime'){const loss=outcome==='missed'?5:outcome==='late'?2:3;pain(c,loss,outcome==='missed'?'ไปไม่ทันใช้บริการ':outcome==='cancelled'?'เที่ยวเดินทางถูกยกเลิก':'ใช้บริการไม่ได้');}
}
function touristTrafficFailure(c,v,step){
 if(!step||step.status==='missed-traffic'||!(v?.congestionMinutes>=60))return false;
 touristActivityResult(c,step,'missed');step.status='missed-traffic';step.reason='รถติดจนใช้บริการไม่ทัน';c.trafficFailures=(c.trafficFailures||0)+1;c.problem=step.reason;
 const period=c.feePeriods[v.tourFeePeriod??c.feePeriods.length-1];
 if(period&&!period.discounted){period.discounted=true;period.paid-=TOURISM.discount;state.money-=TOURISM.discount;missionMoney('touristsDiscount',TOURISM.discount);const ledger=tourismLedger();ledger.refunds+=TOURISM.discount;ledger.totalRefunds+=TOURISM.discount;}
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
  if(v.arrivedAt==null&&v.kind==='leisure'&&v.deadline&&state.time>v.deadline)touristTrafficFailure(c,v,step);
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
 if(step.at>state.time){c.state='พักรอกิจกรรมถัดไป';touristSchedule(c,Math.min(step.at,c.tourEnd));return;}
 const b=state.buildings.get(step.buildingId),win=serviceWindow(step.kind,state.time);
 if(!b||!win){touristActivityResult(c,step,'unavailable');step.status='skipped';step.reason=b?'สถานที่ปิดบริการ':'สถานที่ถูกรื้อ';c.tourIndex++;touristSchedule(c,state.time+5);return;}
 if(step.at>state.time){c.state='พักรอกิจกรรมถัดไป';touristSchedule(c,Math.min(step.at,c.tourEnd));return;}
 if(c.locationId===b.id){b.visitors.add(c.id);step.status='visiting';c.state='เที่ยว'+KINDS[step.kind].name;c.activityUntil=Math.max(state.time+.5,Math.min(c.tourEnd,win.close,(v?.arrivedAt??state.time)+step.stay));touristSchedule(c,c.activityUntil);return;}
 if(createTrip(c,'leisure',c.locationId,b.id,null,null,Math.min(c.tourEnd,win.close-10),{serviceKind:step.kind,stay:step.stay,closeAt:win.close})){
  const trip=state.vehicles.get(c.vehicleId);trip.tourIndex=c.tourIndex;trip.tourFeePeriod=c.feePeriods.length-1;step.status='travel';c.tourRetries=0;touristSchedule(c,state.time+15);return;
 }
 c.tourRetries=(c.tourRetries||0)+1;c.state='รอไป'+KINDS[step.kind].name;c.problem=parkingFree(b)<=0||b.visitors.size+b.reservedService>=CATALOG[b.key].service?'บริการหรือลานจอดเต็ม':'ไม่มีเส้นทางไปจุดหมาย';
 if(c.tourRetries>=4){touristActivityResult(c,step,'unavailable');step.status='skipped';step.reason=c.problem;c.tourIndex++;c.tourRetries=0;}
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
  const at=v.arrivedAt??state.time,win=serviceWindow(step.kind,at),missed=at>=Math.min(c.tourEnd,v.closeAt||Infinity)-10;
  if(missed){touristActivityResult(c,step,'missed');touristTrafficFailure(c,v,step);if(step.status!=='missed-traffic'){step.status='skipped';step.reason='มาถึงหลังหมดเวลาเที่ยว';}c.tourIndex=Math.max(c.tourIndex,v.tourIndex+1);c.state='หมดเวลาใช้บริการ';touristSchedule(c,state.time+1);return;}
  if(!win){touristActivityResult(c,step,'missed');step.status='skipped';step.reason='สถานที่ปิดบริการ';c.tourIndex=v.tourIndex+1;touristSchedule(c,state.time+1);return;}
  touristActivityResult(c,step,'ontime');b.visitors.add(c.id);step.status='visiting';c.state='เที่ยว'+KINDS[step.kind].name;c.happy=Math.min(100,c.happy+3);c.problem='';c.activityUntil=Math.max(state.time+.5,Math.min(c.tourEnd,win.close,(v?.arrivedAt??state.time)+step.stay));touristSchedule(c,c.activityUntil);return;
 }
 touristSchedule(c,state.time+1);
}
function updateTourism(gameDt){
 // Track queue time independently of native recovery, which may reset v.wait.
 for(const c of touristPeople()){
  const v=state.vehicles.get(c.vehicleId);
  if(v&&v.arrivedAt==null&&c.enteredAt!=null&&v.kind==='leisure'&&!missingRoute(v)&&(v.wait>1||v.stopReason&&v.speed<.1)&&v.phase!=='gate_waiting')v.congestionMinutes=(v.congestionMinutes||0)+gameDt;
 }
 if(state.time<(state.nextTouristAt||0))return;
 state.nextTouristAt=state.time+2+habitRandom(state.nextId,Math.floor(state.time),24)*3;
 admitTourist();
}
function touristDashboardData(){
 const people=touristPeople(),capacity=tourismCapacity(),ledger=tourismLedger();
 const kinds=TOURIST_KINDS.map(kind=>({kind,name:KINDS[kind].name,count:0}));
 const hotels=new Map(),records=[];
 const stats={total:people.length,present:0,waiting:0,travel:0,service:0,hotel:0,idle:0,problems:0,reservedHotel:0,missed:0};
 for(const c of people){
  const vehicle=state.vehicles.get(c.vehicleId),step=c.itinerary?.[c.tourIndex];
  const waiting=c.enteredAt==null;
  const hotel=!!(!vehicle&&c.hotelId&&c.locationId===c.hotelId&&c.sleepUntil>state.time);
  const service=!!(!vehicle&&!hotel&&step?.status==='visiting'&&step.buildingId===c.locationId&&c.activityUntil>state.time);
  const traveling=!!vehicle&&!waiting;
  const issue=!!c.problem||!!vehicle&&(vehicle.phase==='stuck'||vehicle.departureNoRoute||(vehicle.wait||0)>=8);
  const kind=service?step.kind:null;
  if(waiting)stats.waiting++;else stats.present++;
  if(hotel){stats.hotel++;hotels.set(c.hotelId,(hotels.get(c.hotelId)||0)+1);}
  else if(service){stats.service++;const group=kinds.find(k=>k.kind===kind);if(group)group.count++;}
  else if(traveling)stats.travel++;
  else if(!waiting)stats.idle++;
  if(c.hotelId&&!hotel)stats.reservedHotel++;
  if(issue)stats.problems++;
  stats.missed+=c.trafficFailures||0;
  records.push({c,vehicle,step,waiting,hotel,service,traveling,issue,kind});
 }
 return{stats,records,kinds,hotels:[...hotels].map(([id,count])=>({id,name:buildingName(id),count})).sort((a,b)=>b.count-a.count),
  capacity,ledger};
}
function touristCurrentActivity(record){
 const {c,vehicle,step,waiting,hotel,service}=record;
 if(waiting)return'รอเข้าเมือง';
 if(hotel)return'พักโรงแรม '+buildingName(c.hotelId);
 if(service)return'ใช้บริการ'+KINDS[step.kind].name+' · '+buildingName(step.buildingId);
 if(vehicle)return'เดินทางไป'+(vehicle.toId?buildingName(vehicle.toId):'ประตูเมือง');
 return c.state||'รอกิจกรรมถัดไป';
}
function touristSummaryMarkup(){
 const c=tourismCapacity(),l=tourismLedger();return row('นักท่องเที่ยวในเมือง',c.present+' คน')+row('รอเข้าเมือง',c.waiting+' คน')+row('เพดาน 65% ของประชากร',c.populationLimit+' คน')+row('โควตาตามบริการ',c.serviceLimit+' คน')+row('ห้องพักที่จอง / เตียงทั้งหมด',c.booked+' / '+c.beds)+row('รายได้ท่องเที่ยววันนี้',money(l.fees-l.refunds))+row('คืนส่วนลดรถติดวันนี้',money(l.refunds));
}
function touristInspector(c){
 const v=state.vehicles.get(c.vehicleId),period=c.feePeriods.at(-1);
 let html='<span class="tag">นักท่องเที่ยว #'+c.id+'</span><h2>'+citizenName(c)+'</h2>'+row('สถานะ',escapeSaveText(c.state))+row('กำลังทำอะไร',escapeSaveText(touristCurrentActivity({c,vehicle:v,step:c.itinerary[c.tourIndex],waiting:c.enteredAt==null,hotel:!v&&c.hotelId&&c.locationId===c.hotelId&&c.sleepUntil>state.time,service:!v&&c.itinerary[c.tourIndex]?.status==='visiting'&&c.itinerary[c.tourIndex]?.buildingId===c.locationId&&c.activityUntil>state.time})))+row('ตำแหน่ง',c.locationId?buildingName(c.locationId):c.enteredAt==null?'รอประตูเมือง':'กำลังเดินทาง')+row('เข้าเมือง',c.enteredAt==null?'ยังไม่เข้า':timeText(c.enteredAt))+row('เวลาเที่ยวรอบนี้',Math.round(c.tourDuration/60*10)/10+' ชั่วโมง')+row('สิ้นสุดเวลาเที่ยว',timeText(c.tourEnd))+row('ที่พัก',c.hotelId?buildingName(c.hotelId):c.wantsHotel?'ต้องการค้างถ้ามีห้องว่าง':'ไปกลับ')+row('ค้างแล้ว',c.nights+' คืน')+row('ค่าเข้ารอบล่าสุด',money(period?.paid||0))+row('พลาดบริการเพราะรถติด',c.trafficFailures||0)+row('ปัญหาล่าสุด',escapeSaveText(c.problem||'ยังไม่มีปัญหา'));
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
 const data=touristDashboardData(),m=data.stats;
 const filters=$('touristFilters');
 if(filters&&!filters.children.length)filters.innerHTML=TOURIST_FILTERS.map(([key,label])=>'<button data-tourist-filter="'+key+'">'+label+'</button>').join('');
 for(const button of filters?.querySelectorAll('[data-tourist-filter]')||[])button.classList.toggle('active',button.dataset.touristFilter===touristFilter);
 const query=touristSearch.trim().toLocaleLowerCase('th-TH');
 const matches=data.records.filter(p=>{
  const passes=touristFilter==='service'?p.service:touristFilter==='hotel'?p.hotel:touristFilter==='travel'?p.traveling:touristFilter==='waiting'?p.waiting:touristFilter==='issues'?p.issue:true;
  return passes&&(!query||citizenName(p.c).toLocaleLowerCase('th-TH').includes(query)||String(p.c.id).includes(query));
 });
 const tile=(value,label,urgent=false)=>'<div class="citizen-kpi'+(urgent?' urgent':'')+'"><b>'+value+'</b><span>'+label+'</span></div>';
 const section=(title,content)=>'<section class="citizen-section"><div class="citizen-section-head"><h3>'+title+'</h3></div>'+content+'</section>';
 const bar=(name,count,total)=>'<div class="citizen-bar-row"><span>'+name+'</span><span class="citizen-bar-track"><i class="citizen-bar-fill" style="width:'+Math.min(100,100*count/Math.max(1,total))+'%"></i></span><strong>'+fmt(count)+'</strong></div>';
 const signals='<div class="citizen-signal-grid">'+[['ใช้บริการอยู่',m.service],['พักโรงแรมอยู่',m.hotel],['กำลังเดินทาง',m.travel],['รอเข้าเมือง',m.waiting],['รอกิจกรรม/กลับ',m.idle],['จองห้องแต่ยังไม่พัก',m.reservedHotel]].map(([label,count])=>'<div><b>'+fmt(count)+'</b><small>'+label+'</small></div>').join('')+'</div>';
 const hotels=data.hotels.length?data.hotels.map(h=>bar(escapeSaveText(h.name),h.count,m.hotel)).join(''):'<div class="citizen-empty">ยังไม่มีนักท่องเที่ยวที่กำลังพักโรงแรม</div>';
 const services=data.kinds.map(k=>bar(escapeSaveText(k.name),k.count,m.service)).join('');
 const cards=matches.slice(0,(touristPage+1)*40).map(p=>{
  const c=p.c;
  return '<button class="citizen-person" data-tourist-id="'+c.id+'"><span class="citizen-person-main"><b>'+escapeSaveText(citizenName(c))+'</b><small>'+escapeSaveText(touristCurrentActivity(p))+(p.issue?' · '+escapeSaveText(c.problem||'การเดินทางมีปัญหา'):'')+'</small></span><span class="citizen-person-score"><strong>'+Math.round(c.happy||0)+'%</strong><em>ความสุข</em></span></button>';
 }).join('');
 const html='<div class="citizen-kpis">'+tile(fmt(m.present),'อยู่ในเมือง')+tile(fmt(m.service),'ใช้บริการอยู่')+
  tile(fmt(m.hotel),'พักโรงแรมอยู่')+tile(fmt(m.travel),'กำลังเดินทาง')+
  tile(fmt(m.waiting),'รอเข้าเมือง')+tile(fmt(m.problems),'มีปัญหา',m.problems>0)+
  tile(money(data.ledger.fees-data.ledger.refunds),'รายได้ท่องเที่ยววันนี้')+tile(fmt(m.missed),'พลาดบริการเพราะรถติด')+'</div>'+
  section('ตอนนี้นักท่องเที่ยวทำอะไร',signals)+
  '<div class="citizen-pair">'+section('ใช้บริการอะไรอยู่',services)+section('พักโรงแรมไหนอยู่',hotels)+'</div>'+
  section('ห้องพักและโควตา','<div class="citizen-signal-grid">'+
   [['เตียงโรงแรมทั้งหมด',data.capacity.beds],['จองห้องทั้งหมด',data.capacity.booked],['รับนักท่องเที่ยวได้สูงสุด',data.capacity.limit]].map(([label,count])=>'<div><b>'+fmt(count)+'</b><small>'+label+'</small></div>').join('')+'</div>')+
  section('รายชื่อนักท่องเที่ยว · '+fmt(matches.length)+' คน','<div class="citizen-results">'+(cards||'<div class="citizen-empty">ไม่มีนักท่องเที่ยวตามตัวกรอง</div>')+'</div>'+
   (matches.length>(touristPage+1)*40?'<button class="citizen-more" data-tourist-more>ดูเพิ่มอีก 40 คน</button>':''));
 const body=$('touristsDashboardBody'),scroll=body.scrollTop;body.innerHTML=html;body.scrollTop=scroll;
}

function newCitizen(home){
 const cid=state.nextId++;
 const c={id:cid,profile:profile(state.profileSeq++),homeId:home.id,
  workId:null,location:'gate',locationId:null,resident:false,removed:false,
  movingOut:false,journeyRuleVersion:25,activityVersion:251,happy:82,state:'กำลังย้ายเข้า',vehicleId:null,queued:null,
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
// v2.5: settle one outcome per activity; congestion has one capped surcharge.
const JOURNEY_RULES={version:26,stressAfter:30,stressStep:30,stressCap:2,
 work:{ontime:4,late:-2,missed:-6,unavailable:-4,cancelled:-4},
 leisure:{ontime:3,late:1,missed:-2,unavailable:-1,cancelled:-1},
 home:{ontime:1,late:0,missed:-4,unavailable:-4,cancelled:-2}};
const OUTCOME_NAMES={ontime:'สำเร็จตรงเวลา',late:'สำเร็จแต่สาย',missed:'ไปไม่ทัน',unavailable:'ออกเดินทางไม่ได้',cancelled:'ยกเลิกเที่ยว'};
// Daily counters only: current game day and the most recently completed day.
const MISSION_KINDS=['work','leisure','home','tourist'];
const MISSION_OUTCOMES=['ontime','late','missed','unavailable','cancelled'];
const MISSION_TRIP_NAMES={moveIn:'ย้ายเข้า',moveOut:'ย้ายออก',work:'ไปทำงาน',leisure:'ใช้บริการ / เที่ยว',home:'กลับบ้าน',touristOut:'นักท่องเที่ยวออก',hotel:'โรงแรม',pass:'รถผ่านเมือง'};
function newMissionCounters(){return{total:0,ontime:0,late:0,missed:0,unavailable:0,cancelled:0,durationSum:0,durationCount:0,congestionSum:0,congestionCount:0,roadBlocks:0,blockDurationSum:0};}
function newMissionDay(day=Math.floor(state.time/1440),since=state.time){
 return{day,since,...newMissionCounters(),byKind:Object.fromEntries(MISSION_KINDS.map(k=>[k,newMissionCounters()])),
 tripsStarted:0,tripsArrived:0,tripsByKind:{},arrivalsByKind:{},serviceResults:{},peakCars:0,peakWaiting:0,peakPopulation:0,happyMin:100,happyMax:0,populationIn:0,populationOut:0,touristsIn:0,touristsOut:0,
 touristsRevenue:0,touristsDiscount:0,incidentReward:0,roadCost:0,buildingCost:0,buildingsBuilt:0,buildingsRemoved:0,roadsBuilt:0,
 taxRevenue:0,businessRevenue:0,maintenanceCost:0,dailySettlement:0,taxAdjustments:0,openingMoney:state.money,endingMoney:state.money};
}
function newMissionStats(){return{version:2,current:newMissionDay(),previous:null,dismissedDay:-1};}
function restoreMissionStats(saved){
 const restored=newMissionStats();if(!saved||saved.version!==2)return restored;
 const now=Math.floor(state.time/1440),safe=n=>Number.isFinite(n)&&n>=0&&n<1e12?n:0;
 const readDay=(value,day)=>{
  if(!value||typeof value!=='object'||value.day!==day)return null;
  const result=newMissionDay(day,Number.isFinite(value.since)?Math.max(0,Math.min(value.since,state.time)):state.time);
  for(const key of Object.keys(result)){
   if(key==='byKind'||key==='tripsByKind'||key==='arrivalsByKind'||key==='serviceResults'||key==='day'||key==='since'||key==='cityEnd')continue;
   if(typeof result[key]==='number')result[key]=key==='openingMoney'||key==='endingMoney'||key==='dailySettlement'||key==='taxAdjustments'?Number.isFinite(value[key])?Math.max(-1e12,Math.min(1e12,value[key])):result[key]:safe(value[key]);
  }
  const readCounter=(dst,src)=>{if(!src||typeof src!=='object')return;for(const key of ['total',...MISSION_OUTCOMES,'durationSum','durationCount','congestionSum','congestionCount','roadBlocks','blockDurationSum'])dst[key]=safe(src[key]);};
  readCounter(result,value);
  for(const kind of MISSION_KINDS)readCounter(result.byKind[kind],value.byKind?.[kind]);
  for(const name of ['tripsByKind','arrivalsByKind'])if(value[name]&&typeof value[name]==='object'){
   for(const [kind,count] of Object.entries(value[name]))if(Object.hasOwn(MISSION_TRIP_NAMES,kind))result[name][kind]=safe(count);
  }
  if(value.serviceResults&&typeof value.serviceResults==='object')for(const [kind,row] of Object.entries(value.serviceResults))if(Object.hasOwn(KINDS,kind)&&row&&typeof row==='object'){
   const entry=result.serviceResults[kind]=newMissionCounters();readCounter(entry,row);
  }
  if(value.cityEnd&&typeof value.cityEnd==='object'){
   result.cityEnd={};for(const k of ['population','tourists','happy','unemployed','jobs','homes','serviceNeed','vehicles','waiting','flow','roads','buildings','hotels','trees','money','stranded','incidents'])result.cityEnd[k]=safe(value.cityEnd[k]);
  }
  return result;
 };
 restored.current=readDay(saved.current,now)||newMissionDay(now);
 restored.previous=readDay(saved.previous,now-1);
 restored.dismissedDay=Number.isSafeInteger(saved.dismissedDay)?saved.dismissedDay:-1;
 return restored;
}
function missionDay(){return state.missionStats.current;}
function missionCount(key,value=1){const d=missionDay();if(d&&Number.isFinite(value))d[key]=(d[key]||0)+value;}
function missionMoney(key,value){if(Number.isFinite(value))missionCount(key,value);}
function missionPeakSample(s){const d=missionDay();if(!d)return;d.peakCars=Math.max(d.peakCars,state.vehicles.size);d.peakWaiting=Math.max(d.peakWaiting,s.waiting);d.peakPopulation=Math.max(d.peakPopulation,s.pop);d.happyMin=Math.min(d.happyMin,s.happy);d.happyMax=Math.max(d.happyMax,s.happy);}
function missionTripStart(kind){const d=missionDay();if(!d)return;d.tripsStarted++;d.tripsByKind[kind]=(d.tripsByKind[kind]||0)+1;}
function missionTripEnd(kind){const d=missionDay();if(!d)return;d.tripsArrived++;d.arrivalsByKind[kind]=(d.arrivalsByKind[kind]||0)+1;}
function recordMissionResult(kind,outcome,trip,serviceKind=null){
 if(!MISSION_KINDS.includes(kind)||!MISSION_OUTCOMES.includes(outcome))return;
 const stats=missionDay(),group=stats.byKind[kind];
 for(const target of [stats,group]){target.total++;target[outcome]++;}
 if(kind==='tourist'||kind==='leisure'){
  const target=state.buildings.get(trip?.toId),key=serviceKind||trip?.serviceKind||(target?CATALOG[target.key]?.kind:null);
  if(key&&Object.hasOwn(KINDS,key)){const item=stats.serviceResults[key]||(stats.serviceResults[key]=newMissionCounters());item.total++;item[outcome]++;}
 }
 if(trip&&Number.isFinite(trip.startedAt)&&Number.isFinite(trip.arrivedAt)&&trip.arrivedAt>=trip.startedAt){
  const duration=Math.min(1e6,trip.arrivedAt-trip.startedAt);
  for(const target of [stats,group]){target.durationSum+=duration;target.durationCount++;}
  const blocks=Array.isArray(trip.path)?Math.max(0,trip.path.length-1):0;
  if(blocks>0)for(const target of [stats,group]){target.roadBlocks+=Math.min(100000,blocks);target.blockDurationSum+=duration;}
 }
 if(trip&&Number.isFinite(trip.congestionMinutes)&&trip.congestionMinutes>=0){
  for(const target of [stats,group]){target.congestionSum+=Math.min(1e6,trip.congestionMinutes);target.congestionCount++;}
 }
}
function missionCitySnapshot(){
 const s=computeStats();let stranded=0;for(const v of state.vehicles.values())if(v.phase==='stuck'||v.departureNoRoute)stranded++;
 const touristCount=[...state.citizens.values()].filter(c=>c.tourist&&c.enteredAt!=null&&!c.removed).length;
 return{population:s.pop,tourists:touristCount,happy:s.happy,unemployed:s.unemployed,jobs:s.jobs,homes:s.homes,serviceNeed:s.serviceNeed,vehicles:state.vehicles.size,waiting:s.waiting,flow:s.flow,roads:state.roads.size,buildings:state.buildings.size,hotels:[...state.buildings.values()].filter(b=>CATALOG[b.key]?.beds>0).length,trees:state.plantedTrees.length,money:state.money,stranded,incidents:incidentCases.size};
}
function missionFinishDay(nextDay,settlement,paid){
 const stats=state.missionStats,done=stats.current;
 if(!stats||nextDay<=done.day)return;
 if(done.day===nextDay-1){
  done.taxRevenue=Math.max(0,settlement.tax);
  done.businessRevenue=Math.max(0,settlement.business);
  done.maintenanceCost=Math.max(0,settlement.maint);
  done.dailySettlement=paid;
  done.endingMoney=state.money;
  done.cityEnd=missionCitySnapshot();
  stats.previous=done;
 }else stats.previous=null;
 stats.current=newMissionDay(nextDay,nextDay*1440);
}
function missionStatsSummary(which='current'){
 const report=which==='previous'?state.missionStats.previous:missionDay();
 if(!report)return null;
 const success=report.ontime+report.late,failed=report.missed+report.unavailable+report.cancelled;
 let active=0;if(which!=='previous')for(const v of state.vehicles.values())if(['work','leisure','home'].includes(v.kind)&&v.citizenId!=null)active++;
 return{...report,success,failed,rate:report.total?success/report.total*100:null,average:report.durationCount?report.durationSum/report.durationCount:null,
  secondsPerBlock:report.roadBlocks?report.blockDurationSum*60/report.roadBlocks:null,
  congestionAverage:report.congestionCount?report.congestionSum/report.congestionCount:null,active};
}
function missionReportMarkup(which='current'){
 const s=missionStatsSummary(which);if(!s)return '<p>ยังไม่มีรายงานของเมื่อวานค่ะ</p>';
 const int=n=>fmt(Math.round(n||0)),fraction=n=>n==null?'—':Number(n).toFixed(1),moneySigned=n=>(n>=0?'+':'−')+money(Math.abs(n)),percent=n=>n==null?'—':n.toFixed(1)+'%';
 const summary=s.cityEnd||(which==='current'?missionCitySnapshot():null);
 const revenue=s.taxRevenue+s.businessRevenue+s.touristsRevenue+s.incidentReward+Math.max(0,s.taxAdjustments);
 const expense=s.maintenanceCost+s.touristsDiscount+s.roadCost+s.buildingCost+Math.max(0,-s.taxAdjustments);
 const financeDelta=(which==='previous'?s.endingMoney:state.money)-s.openingMoney;
 const rows=items=>'<div class="daily-report-rows">'+items.map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'</div>';
 const panel=(name,items)=>'<section class="daily-report-section"><h3>'+name+'</h3>'+rows(items)+'</section>';
 const types=[['work','ทำงาน'],['leisure','ใช้บริการ / เที่ยว'],['home','กลับบ้าน'],['tourist','กิจกรรมนักท่องเที่ยว']];
 const typeRows=types.flatMap(([key,name])=>{const c=s.byKind[key];return [[name+' · สำเร็จ',int(c.ontime+c.late)+' / '+int(c.total)],[name+' · ไม่สำเร็จ',int(c.missed+c.unavailable+c.cancelled)]];});
 const tripRows=Object.entries(MISSION_TRIP_NAMES).map(([key,name])=>[name+' · เริ่ม / ถึง',int(s.tripsByKind[key]||0)+' / '+int(s.arrivalsByKind[key]||0)]);
 const serviceRows=Object.entries(s.serviceResults||{}).map(([key,c])=>[(KINDS[key]?.name||key)+' · สำเร็จ / ทั้งหมด',int(c.ontime+c.late)+' / '+int(c.total)]);
 const snapshotRows=summary?[
 ['ประชากรปลายวัน',int(summary.population)+' คน'],['นักท่องเที่ยวในเมือง',int(summary.tourists)+' คน'],
 ['ความสุขเฉลี่ย',fraction(summary.happy)+'%'],['ว่างงาน',int(summary.unemployed)+' คน'],['ตำแหน่งงานรองรับ',int(summary.jobs)],
 ['ความจุที่พักอาศัย',int(summary.homes)],['ความต้องการบริการค้าง',int(summary.serviceNeed)],
 ['รถที่ยังอยู่ในระบบ',int(summary.vehicles)+' คัน'],['รถที่กำลังรอ',int(summary.waiting)+' คัน'],['การไหลของจราจร',fraction(summary.flow)+'%'],
 ['รถติดเส้นทาง / ไม่มีทางไป',int(summary.stranded)+' คัน'],['เหตุจราจรที่กำลังตรวจพบ',int(summary.incidents)],
 ['ช่องถนนทั้งหมด',int(summary.roads)],['อาคารทั้งหมด',int(summary.buildings)],['โรงแรม',int(summary.hotels)],['ต้นไม้ที่ปลูกเอง',int(summary.trees)]
 ]:[];
 const isPrevious=which==='previous',dayLabel='วันที่ '+(s.day+1);
 return '<div class="daily-report-body"><header class="sm-report-header"><span class="panel-heading-icon" aria-hidden="true">▤</span><div><h2>รายงานเมือง '+dayLabel+'</h2><p class="mission-sub">'+(isPrevious?'สรุปผลวันก่อนหน้า · ปิดบัญชีแล้ว':'สถานะระหว่างวัน · ตัวเลขเปลี่ยนตามการเล่น')+' · เวลาเกม '+timeText(s.since)+' น.</p></div></header>'+
 '<div class="mission-grid daily-report-highlights">'+[
 ['ภารกิจสำเร็จ',int(s.success)],['อัตราสำเร็จ',percent(s.rate)],['ภารกิจไม่สำเร็จ',int(s.failed)],
 ['เฉลี่ยต่อบล็อก',fraction(s.secondsPerBlock)+' วินาที'],['รายรับที่บันทึกได้',money(revenue)],['เงินเปลี่ยนสุทธิ',moneySigned(financeDelta)]
 ].map(([a,b])=>'<div class="mission-card"><small>'+a+'</small><strong>'+b+'</strong></div>').join('')+'</div>'+
 '<div class="daily-report-sections">'+
 panel('👥 ประชากรและนักท่องเที่ยว',[['ย้ายเข้าใหม่',int(s.populationIn)+' คน'],['ย้ายออก / ถูกนำออก',int(s.populationOut)+' คน'],['นักท่องเที่ยวเข้าเมือง',int(s.touristsIn)+' คน'],['นักท่องเที่ยวออกเมือง',int(s.touristsOut)+' คน'],...snapshotRows.slice(0,7),['จำนวนประชากรสูงสุด',int(s.peakPopulation)+' คน'],['ความสุขต่ำสุดระหว่างวัน',fraction(s.happyMin)+'%'],['ความสุขสูงสุดระหว่างวัน',fraction(s.happyMax)+'%']])+
 panel('🎯 ผลภารกิจทั้งหมด',[['ภารกิจตัดสินผลแล้ว',int(s.total)],['สำเร็จตามเป้าหมาย',int(s.success)],['ตรงเวลา',int(s.ontime)],['สำเร็จแต่สาย',int(s.late)],['ไปไม่ทัน',int(s.missed)],['ไม่มีเส้นทาง / ใช้บริการไม่ได้',int(s.unavailable)],['ยกเลิกภารกิจ',int(s.cancelled)],['ยังเดินทางอยู่ ณ ตอนนี้',isPrevious?'—':int(s.active)],...typeRows,...serviceRows])+
 panel('🚗 รายงานการเดินทาง',[['เริ่มเดินทางรวม',int(s.tripsStarted)+' เที่ยว'],['ถึงจุดหมายจริง',int(s.tripsArrived)+' เที่ยว'],['เวลาเฉลี่ยเมื่อถึง',fraction(s.average)+' นาทีในเกม'],['ความเร็วเฉลี่ย',fraction(s.secondsPerBlock)+' วินาทีในเกม/บล็อก'],['ระยะทางทริปที่มีผลและวัดได้',int(s.roadBlocks)+' บล็อก'],['เฉลี่ยเวลารถติด',fraction(s.congestionAverage)+' นาทีในเกม'],...tripRows,['รถที่มากที่สุดระหว่างวัน',int(s.peakCars)+' คัน'],['รถรอคิวสูงสุด',int(s.peakWaiting)+' คัน'],...snapshotRows.slice(7,12)])+
 panel('💰 การเงินและการก่อสร้าง',[['เงินต้นวัน',money(s.openingMoney)],['รายได้ภาษีที่ปิดบัญชี',isPrevious?money(s.taxRevenue):'สรุปเมื่อสิ้นวัน'],['รายได้ธุรกิจที่ปิดบัญชี',isPrevious?money(s.businessRevenue):'สรุปเมื่อสิ้นวัน'],['รายได้จากนักท่องเที่ยว',money(s.touristsRevenue)],['เงินคืน / ส่วนลดนักท่องเที่ยว',money(s.touristsDiscount)],['เงินรางวัลแก้จราจร',money(s.incidentReward)],['ปรับภาษีหลังปิดบัญชี',moneySigned(s.taxAdjustments)],['ค่าดูแลเมือง',isPrevious?money(s.maintenanceCost):'สรุปเมื่อสิ้นวัน'],['ก่อสร้างถนน',money(s.roadCost)],['สร้างอาคาร',money(s.buildingCost)],['ถนนเพิ่ม / ปรับปรุง',int(s.roadsBuilt)+' บล็อก'],['อาคารสร้างใหม่',int(s.buildingsBuilt)+' แห่ง'],['อาคารรื้อถอน',int(s.buildingsRemoved)+' แห่ง'],['ยอดเงินสุทธิเปลี่ยน',moneySigned(financeDelta)],['เงินคงเหลือ',money(isPrevious?s.endingMoney:state.money)]])+
 panel('🏙️ โครงสร้างเมืองและสภาพการจราจร',snapshotRows.slice(12))+
 '</div><details class="panel-help report-reading"><summary>วิธีอ่านรายงาน</summary><p>รายงานแสดงวันนี้และวันล่าสุด ไม่เก็บย้อนหลัง 7 วัน · ภาษีและรายได้ธุรกิจสรุปเมื่อจบวัน</p><p>วินาที/บล็อก = เวลาเดินทางรวมของเที่ยวที่ถึง × 60 ÷ ระยะทางรวมที่วัดได้</p></details></div>';
}
function openMissionDashboard(which='current'){
 if(missionAutoOpenDay>=0)missionAutoClose(true);
 const active=which==='previous'&&state.missionStats.previous?'previous':'current';
 modal('<div class="mission-dashboard daily-report-modal">'+missionReportMarkup(active)+
 '<div class="actions">'+(state.missionStats.previous?'<button id="missionPrevious">'+(active==='previous'?'ดูวันนี้':'ดูรายงานเมื่อวาน')+'</button>':'')+
 '<button id="missionClose" class="primary">กลับไปเล่น</button></div></div>');
 $('missionClose').onclick=closeModal;
 if($('missionPrevious')&&state.missionStats.previous)$('missionPrevious').onclick=()=>openMissionDashboard(active==='previous'?'current':'previous');
}
let missionAutoOpenDay=-1;
function missionAutoClose(dismiss=false){
 const element=document.getElementById('missionDailyAuto');
 if(element?.parentNode)element.parentNode.removeChild(element);
 if(dismiss&&state?.missionStats?.previous)state.missionStats.dismissedDay=state.missionStats.previous.day;
 missionAutoOpenDay=-1;
}
function missionAutoPulse(){
 const report=state?.missionStats?.previous,now=Math.floor(state.time/1440),minute=state.time%1440;
 const visible=report&&report.day===now-1&&minute>=360&&minute<600&&state.missionStats.dismissedDay!==report.day;
 if(!visible){if(missionAutoOpenDay>=0)missionAutoClose();return;}
 if(missionAutoOpenDay===report.day)return;
 if($('dialog')?.open||window.SMGameAuthLocked)return;
 if(typeof document.createElement!=='function'||!document.body?.appendChild)return;
 missionAutoClose();
 const element=document.createElement('aside');
 element.id='missionDailyAuto';element.className='daily-report-auto';
 element.innerHTML='<div class="daily-report-topbar"><b>สรุปวันใหม่</b><small>เปิดถึง 10:00 น.</small><button type="button" id="missionAutoDismiss" aria-label="ปิดรายงาน">✕</button></div>'+
 missionReportMarkup('previous')+'<div class="actions"><button type="button" class="primary" id="missionAutoDismissBottom">ปิดรายงาน</button></div>';
 document.body.appendChild(element);missionAutoOpenDay=report.day;
 element.querySelector('#missionAutoDismiss').onclick=()=>missionAutoClose(true);
 element.querySelector('#missionAutoDismissBottom').onclick=()=>missionAutoClose(true);
}
function workTax(c,day=Math.floor(state.time/1440)){const r=c.workDays?.[day];return r?.missed?250:r?.late?400:500;}
function activityKey(c,v){return v.life?'life:'+(v.life.token?v.life.token+':':'')+v.life.day+':'+v.life.index:'trip:'+v.id;}
function journeyResult(c,v,outcome,reason,stress=true){
 if(!c||c.removed||c.tourist||!['work','leisure','home'].includes(v.kind)||v.resultDone)return;
 v.resultDone=true;const day=v.life?.day??Math.floor((v.startedAt??state.time)/1440),key=activityKey(c,v);
 if(!c.journeyResults)c.journeyResults=[];
 if(c.journeyResults.some(r=>r.key===key))return;
 const kind=v.kind,score=JOURNEY_RULES[kind][outcome]??0;
 const extraMinutes=Number.isFinite(v.startedAt)&&Number.isFinite(v.travelBudget?.totalMinutes)?Math.max(0,(v.arrivedAt??state.time)-v.startedAt-v.travelBudget.totalMinutes):0;
 const congestion=stress?Math.min(JOURNEY_RULES.stressCap,Math.floor(Math.max(0,Math.min(v.congestionMinutes||0,extraMinutes)-JOURNEY_RULES.stressAfter)/JOURNEY_RULES.stressStep)):0;
 // Home recovery is modest and only once per day; never farm repeated visits.
 const homeReward=kind==='home'&&score>0&&c.homeRewardDay===day;
 const delta=(homeReward?0:score)-congestion;
 if(delta<0)pain(c,-delta,reason);else if(delta>0)reward(c,delta,kind==='home'?90:94);
 if(kind==='home'&&score>0)c.homeRewardDay=day;
 const record={key,day,at:state.time,kind,outcome,delta,stress:congestion,reason};
 c.journeyResults.push(record);c.journeyResults=c.journeyResults.slice(-40);c.lastJourneyResult=record;
 recordMissionResult(kind,outcome,v);
 travelLogResult(c,v,record);
 if(kind==='work'){
  if(!c.workDays)c.workDays={};const r=c.workDays[day]||(c.workDays[day]={success:0,late:0,missed:0});
  if(outcome==='ontime')r.success++;else if(outcome==='late')r.late++;else r.missed++;
  // Only work attendance changes tax and the dashboard's work-late flag.
  if(day===Math.floor(state.time/1440))c.late=!!(r.late||r.missed);
  const routine=ensureRoutine(c);
  if(outcome==='late'||outcome==='missed'){
   routine.lateStreak=Math.min(12,(routine.lateStreak||0)+1);routine.earlyStreak=0;
   routine.advance=Math.min(90,routine.advance+Math.round(5+(1-routine.trafficTolerance)*5));
  }else if(outcome==='ontime'){
   routine.lateStreak=0;if(++routine.earlyStreak>=3){routine.advance=Math.max(0,routine.advance-2);routine.earlyStreak=0;}
  }
  if(c.taxSettledDays?.[day]!=null){const corrected=workTax(c,day);const difference=corrected-c.taxSettledDays[day];state.money+=difference;missionMoney('taxAdjustments',difference);c.taxSettledDays[day]=corrected;}
  for(const d of Object.keys(c.workDays))if(+d<Math.floor(state.time/1440)-3)delete c.workDays[d];
 }
 c.problem=delta<0?reason:'';
 c.history.push(timeText(state.time)+' '+TRIPS[kind].name+' · '+OUTCOME_NAMES[outcome]+' · '+(delta>0?'+':'')+delta+' ความสุข'+(congestion?' (รวมความเครียด '+congestion+')':''));c.history=c.history.slice(-12);
}
function unstartedResult(c,step,outcome,reason){
 const run=c.lifeRun;if(!run)return;
 journeyResult(c,{id:'unstarted',kind:step.kind==='work'?'work':step.kind==='home'?'home':'leisure',life:{day:run.day,index:run.index,token:run.token}},outcome,reason,false);
}
function recordEntranceArrival(v){
 if(v.arrivedAt!=null)return;
 const c=state.citizens.get(v.citizenId),b=state.buildings.get(v.toId);if(!c||!b)return;
 v.arrivedAt=state.time;b.arrivals++;v.arrivalCounted=true;
 if(c.tourist){touristEnter(c,v);}
 else if(['work','leisure','home'].includes(v.kind)){
  const outcome=arrivalOutcome(v,c,b);v.arrivalResult=outcome;v.late=outcome==='late';
  journeyResult(c,v,outcome,outcome==='ontime'?'เลี้ยวเข้าถึงอาคารสำเร็จ':outcome==='late'?'เลี้ยวเข้าถึงอาคารช้ากว่านัดหมาย':'ถึงอาคารแล้วไม่ทันทำงานหรือใช้บริการ');
 }
 if(v.kind==='moveIn'&&!c.resident){missionCount('populationIn');c.arrivedAt=state.time;c.resident=true;b.residents.add(c.id);if(v.residentReservation){b.reservedResidents=Math.max(0,b.reservedResidents-1);v.residentReservation=false;}}
 c.state='ถึงอาคารแล้ว · กำลังเข้าจอด';
}
function arrivalOutcome(v,c,b){
 const at=v.arrivedAt??state.time;
 if(v.kind==='home')return'ontime';
 if(v.kind==='work'){
  const step=v.life&&(c.lifeRun?.day===v.life.day&&c.lifeRun.token===v.life.token?c.lifeRun.plan:lifePlan(c,v.life.day))?.steps[v.life.index];
  const end=step?v.life.day*1440+step.until:v.workEnd;
  if(Number.isFinite(end)&&at>=end)return'missed';
 }else if(v.kind==='leisure'){
  const kind=v.serviceKind||CATALOG[b.key].kind,win=serviceWindow(kind,at),duration=v.stay||30;
  if(!win||at+duration>Math.min(win.close,v.activityEnd??Infinity)||b.visitors.size>=CATALOG[b.key].service)return'missed';
 }
 return Number.isFinite(v.deadline)&&at>v.deadline?'late':'ontime';
}
function trackJourney(v,gameDt){
 if(v.arrivedAt!=null)return;
 const c=state.citizens.get(v.citizenId);if(!c||c.tourist)return;
 if((v.wait>1||v.stopReason)&&state.time-(v.lastMovedAt??state.time)>.5)v.congestionMinutes=(v.congestionMinutes||0)+gameDt;
 v.late=v.kind!=='home'&&Number.isFinite(v.deadline)&&state.time>v.deadline;
 if(v.late)c.state=TRIPS[v.kind].name+' · เกินเวลานัดหมาย';
}
function resumeCancelledLife(c,v,reason){
 if(!c||c.removed||!c.resident)return;
 journeyResult(c,v,'cancelled',reason);
 c.pending=null;c.queued=null;c.activityUntil=null;
 if(v.life&&c.lifeRun?.day===v.life.day&&c.lifeRun.token===v.life.token&&c.lifeRun.index===v.life.index){lifeAdvance(c);}
 if(!c.lifeRun&&c.locationId!==c.homeId)schedule(c,state.time+5,'home');
}

function pain(c,amount,problem,key){if(!c||c.removed)return;if(key&&c.failKinds.has(key))return;if(key)c.failKinds.add(key);const before=c.happy;c.happy=Math.max(0,c.happy-amount);c.pain+=amount;c.problem=problem;if(c.happy!==before)travelLogEvent('happiness',{citizenId:c.id,before,after:c.happy,delta:c.happy-before,reason:problem||'ความสุขลดลง'});}
function reward(c,amount,cap){const before=c.happy;c.happy=Math.max(c.happy,Math.min(cap,c.happy+amount));if(c.happy!==before)travelLogEvent('happiness',{citizenId:c.id,before,after:c.happy,delta:c.happy-before,reason:'ได้รับความสุขจากกิจกรรม'});}
function pending(c,action,extra={},problem='ไม่มีเส้นทาง'){const attempts=(c.pending?.attempts||0)+1;c.pending={action,...extra,attempts,next:state.time+Math.min(45,8+attempts*2)+(c.id%7),expires:state.time+360};c.problem=problem;}
function runAction(c,action,extra={}){
 if(action==='cityOuting'){startCityOuting(c,extra);return;}
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
  if(!c.workId){pending(c,'work',{},'ไม่มีตำแหน่งงานว่าง');return;}
  if(c.locationId===c.workId||state.time%1440>plan.end)return;
  // Deadline is based on this individual's schedule, not a fixed city-wide hour.
  attemptLife(c,'work',c.workId,base+plan.desiredArrival);
 }
 else if(action==='home'){
  if(c.locationId===c.homeId){c.state='อยู่บ้าน';return;}
  attemptLife(c,'home',c.homeId,null);
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
   for(const alt of ['restaurant','mall','shop','park','pub','casino']){
    if(alt===kind)continue;const picks=choices(alt);
    if(picks.length){candidates=picks;chosen=alt;break;}
   }
  }
  if(!candidates.length){
   journeyResult(c,{id:'blocked:leisure:'+day,kind:'leisure'},'unavailable','ไม่มีบริการหรือที่จอดรองรับ',false);
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
function attemptLife(c,kind,toId,deadline,extra={}){if(c.locationId===toId)return true;const target=state.buildings.get(toId);if(target&&parkingFree(target)<=0){journeyResult(c,{id:'blocked:'+kind+':'+Math.floor(state.time/1440),kind},'unavailable','ลานจอดปลายทางเต็ม',false);pending(c,kind==='leisure'?'leisure':kind,{kind:extra.serviceKind,end:extra.activityEnd},'ลานจอดปลายทางเต็ม');return false;}const from=c.locationId||c.homeId;if(createTrip(c,kind,from,toId,null,null,deadline,extra))return true;journeyResult(c,{id:'blocked:'+kind+':'+Math.floor(state.time/1440),kind},'unavailable','ไม่มีเส้นทางถึงจุดหมาย',false);pending(c,kind==='leisure'?'leisure':kind,{kind:extra.serviceKind,end:extra.activityEnd},c.problem);return false;}
function plannedLane(v,pos){return motionPlan(v).lanes[pos]??0;}
function occKey(i,d,l){return `${i}:${d}:${l}`;}
function cellAvailable(i,d,l,vid){const r=state.roads.get(i);if(!r)return false;const key=occKey(i,d,l),o=state.occ.get(key),res=state.reservations.get(key);if(parkingClaimed(key,vid)||o&&o!==vid&&!parkingEscapePair(state.vehicles.get(vid)||{},o)||res&&res.id!==vid&&!parkingEscapePair(state.vehicles.get(vid)||{},res.id))return false;const cap=laneCapacity(i,d);let same=0,total=0;for(let dd=0;dd<4;dd++)for(let ll=0;ll<4;ll++){const o=state.occ.get(occKey(i,dd,ll));if(o&&o!==vid&&!parkingEscapePair(state.vehicles.get(vid)||{},o)){total++;if(dd===d)same++;}}return l>=0&&l<cap&&same<cap&&(junction(i)>=3||total<cap*2);}
// Road traffic may pass a road tile held by another vehicle; a physical same-lane leader still governs spacing.
// Keep signalised intersections on the original exclusive admission rules.
function roadTraversalAvailable(v,pos){const i=v.path[pos],d=motionDirection(v.path,pos),lane=plannedLane(v,pos);return state.roads.has(i)&&lane>=0&&lane<laneCapacity(i,d)&&(junction(i)<3||ownsJunctionPass(v,pos)||cellAvailable(i,d,lane,v.id));}
function occupy(v,pos){const i=v.path[pos],d=dir(i,v.path[Math.min(pos+1,v.path.length-1)]),l=plannedLane(v,pos);v.lane=l;v.occKey=occKey(i,d,l);state.occ.set(v.occKey,v.id);}
function release(v,keepIntersection=false){if(v.occKey&&state.occ.get(v.occKey)===v.id)state.occ.delete(v.occKey);v.occKey=null;if(!keepIntersection){clearVehicleReservations(v);v.junctionPasses=[];v.committedJunction=null;}}
// Sky travel bypasses the road graph entirely. It still uses the original
// trip/reservation and arrival bookkeeping so lifestyle outcomes remain intact.
function leaveSkyOrigin(v){
 if(v.techLeftOrigin)return;
 const b=state.buildings.get(v.fromId);if(!b)return;
 b.queue=b.queue.filter(i=>i!==v.id);
 b.parked.delete(v.citizenId);b.visitors.delete(v.citizenId);
 freeParkingSpace(b,v.citizenId);v.techLeftOrigin=true;
 const c=state.citizens.get(v.citizenId);
 if(c){c.location='travel';c.state=TRIPS[v.kind].name;}
}
function advanceSkyVehicle(v){
 if(v.phase==='warp_charge'){
  // Charge once, then immediately transfer to the destination without road routing.
  v.airProgress=Math.min(1,Math.max(0,(state.time-(v.phaseStartedAt??v.startedAt))/20));
  v.stopReason='ชาร์จวาป '+Math.round(v.airProgress*100)+'%';
  if(v.airProgress>=1){leaveSkyOrigin(v);v.phase='warp_arrival';v.lastMovedAt=state.time;arrive(v,true);}
  return;
 }
 if(!['air_lift','air_cruise','air_land'].includes(v.phase))return;
 const distance=Math.hypot(v.airTo.x-v.airFrom.x,v.airTo.y-v.airFrom.y);
 const duration=v.phase==='air_cruise'?Math.max(2,distance/2.6):3;
 v.airProgress=Math.min(1,(state.time-v.phaseStartedAt)/duration);
 if(v.airProgress<1)return;
 if(v.phase==='air_lift'){leaveSkyOrigin(v);v.phase='air_cruise';}
 else if(v.phase==='air_cruise')v.phase='air_land';
 else{arrive(v,true);return;}
 v.phaseStartedAt=state.time;v.airProgress=0;v.lastMovedAt=state.time;
}
function createTrip(c,kind,fromId,toId,fromGate,toGate,deadline,extra={}){if(c?.vehicleId)return false;const destination=state.buildings.get(toId);if(destination&&parkingFree(destination)<=0)return false;if(kind==='pass'&&state.vehicles.size>=8000)return false;const fromBuilding=state.buildings.get(fromId);if(c&&fromBuilding&&CATALOG[fromBuilding.key].dualParking)parkingSpace(fromBuilding,c.id,true);
 const to=state.buildings.get(toId),from=state.buildings.get(fromId);
 const vehicleTech=c?.resident&&!c.tourist?(c.vehicleTech||'normal'):'normal';
 const skyTrip=!!from&&!!to&&vehicleTech==='warp';
 const path=skyTrip?[]:tripRoute(fromId,toId,fromGate,toGate,c?.id);
 if(!path)return false;if(kind==='leisure'&&to.visitors.size+to.reservedService>=CATALOG[to.key].service)return false;
const v={id:state.nextId++,trafficModel:2,noUTurnPolicy:1,citizenId:c?.id||null,kind,fromId,toId,fromGate,toGate,path:[...path],pathSet:new Set(path),pos:0,progress:0,lane:0,laneSeed:Math.abs(state.nextId)%4,speed:0,vehicleTech,phase:skyTrip?(vehicleTech==='fly'?'air_lift':'warp_charge'):from?'departing':'gate_waiting',wait:0,lastPain:0,deadline,startedAt:state.time,congestionMinutes:0,workEnd:kind==='work'?(extra.life?extra.life.day*1440+c?.lifeRun?.plan.steps[extra.life.index]?.until:c?.dailyPlan?.day*1440+c?.dailyPlan?.end):null,late:false,color:c?citizenCarColor(c.id):TRIPS[kind].color,version:state.version,life:extra.life,stay:extra.stay,closeAt:extra.closeAt,activityEnd:extra.activityEnd,serviceKind:extra.serviceKind,residentReservation:kind==='moveIn',serviceReservation:kind==='leisure',retryAt:0,occKey:null,stopReason:'',routeMissing:false,routeMissingSince:null,committedJunction:null,departureRouteVersion:state.version};state.vehicles.set(v.id,v);missionTripStart(kind);if(kind==='moveIn')to.reservedResidents++;if(kind==='leisure')to.reservedService++;
v.lastMovedAt=state.time;v.respawns=0;
 v.travelBudget=skyTrip?{totalMinutes:vehicleTech==='warp'?20:6+Math.hypot(to.x-from.x,to.y-from.y)/2.6}:travelEstimate(path);
 if(skyTrip){
  const index=parkingSpace(from,c.id,true);
  v.airFrom=parkingSlotPose(from,index)||lotPoint(from,CATALOG[from.key].plotWidth/2,CATALOG[from.key].plotHeight/2);
  v.airTo={...lotPoint(to,CATALOG[to.key].frontageEntranceU||CATALOG[to.key].plotWidth/2,CATALOG[to.key].parkingAisle||CATALOG[to.key].plotHeight/2),angle:v.airFrom.angle||0};
  v.phaseStartedAt=state.time;v.airProgress=0;
  v.stopReason=vehicleTech==='warp'?'ชาร์จวาป 20 นาทีเกม':'กำลังลอยตัวจากช่องจอด';
 }
if(travelRecording)travelLogEvent('trip_start',travelLogVehicle(v));
if(from){parkingSpace(from,c.id,true);from.queue.push(v.id);}if(c){c.vehicleId=v.id;c.location=from?CATALOG[from.key].kind:'travel';c.state=from?'รอออกเดินทาง':TRIPS[kind].name;c.history.push(timeText(state.time)+' '+TRIPS[kind].name+' → '+(to?CATALOG[to.key].name:'ประตูเมือง'));c.history=c.history.slice(-12);}return true;}
function arrive(v,instant=false){if(!instant&&v.phase!=='parking_in'&&beginParkingArrival(v))return;if(travelRecording)travelLogEvent('arrival',{...travelLogVehicle(v),instant:!!instant});release(v);cleanupParkingVehicle(v,true);state.vehicles.delete(v.id);missionTripEnd(v.kind);updateTrafficSpatial(v);const from=state.buildings.get(v.fromId);if(from)from.queue=from.queue.filter(i=>i!==v.id);const b=state.buildings.get(v.toId),c=state.citizens.get(v.citizenId);if(v.residentReservation&&b)b.reservedResidents=Math.max(0,b.reservedResidents-1);if(v.serviceReservation&&b)b.reservedService=Math.max(0,b.reservedService-1);if(!c)return;c.vehicleId=null;if(c.tourist&&!b){arriveTourist(c,v,b);return;}
if(v.kind==='moveOut'){removeCitizen(c);addNews(citizenName(c)+' ย้ายออกจากเมือง');return;}if(!b){c.location='home';c.locationId=c.homeId;c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);return;}
if(!c.tourist&&v.arrivedAt==null&&['work','leisure','home'].includes(v.kind)){const outcome=arrivalOutcome(v,c,b);v.late=outcome==='late';v.arrivalResult=outcome;journeyResult(c,v,outcome,outcome==='ontime'?'เดินทางและทำกิจกรรมสำเร็จ':outcome==='late'?'ถึงปลายทางช้ากว่านัดหมาย':'ถึงแล้วไม่ทันทำงานหรือใช้บริการ');}
if(!v.arrivalCounted)b.arrivals++;b.parked.add(c.id);parkingSpace(b,c.id,true);c.locationId=b.id;c.location=CATALOG[b.key].kind;
if(c.tourist){arriveTourist(c,v,b);return;}if(v.life){arriveLifestyle(c,v,b);return;}
if(v.kind==='moveIn'){if(!c.resident)missionCount('populationIn');c.arrivedAt=v.arrivedAt??state.time;c.resident=true;b.residents.add(c.id);c.state='อยู่บ้าน';assignJob(c);scheduleDay(c,Math.floor(state.time/1440));scheduleDay(c,Math.floor(state.time/1440)+1);if(computeStats().pop<=5)addNews(citizenName(c)+' ย้ายมาถึงบ้านแล้ว');}
else if(v.kind==='work'){
 c.state=v.arrivalResult==='missed'?'ถึงที่ทำงานหลังหมดช่วงงาน':v.late?'อยู่ที่ทำงาน · มาสาย':'อยู่ที่ทำงาน';
 const plan=c.dailyPlan;if(plan&&state.time>=plan.day*1440+plan.end+plan.postDelay)c.queued=plan.day===Math.floor(state.time/1440)?{action:'afterWork',day:plan.day,kind:plan.kind}:{action:'home'};
}
else if(v.kind==='leisure'){if(v.arrivalResult!=='missed'){b.visitors.add(c.id);c.state='อยู่'+KINDS[CATALOG[b.key].kind].name;schedule(c,Math.max(state.time+.5,(v.arrivedAt??state.time)+(v.stay||30)),'home');}else{c.state='ถึงแล้วแต่ใช้บริการไม่ทัน';schedule(c,state.time+.5,'home');}}
else{c.state='อยู่บ้าน';}if(c.queued){const q=c.queued;c.queued=null;schedule(c,state.time+.5,q.action,q);}}
function removeCitizen(c){if(c.tourist){if(c.enteredAt!=null)missionCount('touristsOut');releaseHotel(c);}else if(c.resident)missionCount('populationOut');if(c.vehicleId)cancelVehicle(state.vehicles.get(c.vehicleId));for(const b of state.buildings.values()){b.residents.delete(c.id);b.workers.delete(c.id);b.visitors.delete(c.id);b.parked.delete(c.id);freeParkingSpace(b,c.id);}c.resident=false;c.removed=true;c.vehicleId=null;c.pending=null;c.queued=null;state.events=state.events.filter(e=>e.citizenId!==c.id);eventHeapify();state.citizens.delete(c.id);}
function cancelVehicle(v){if(!v)return;if(travelRecording)travelLogEvent('cancel',travelLogVehicle(v));release(v);cleanupParkingVehicle(v);const b=state.buildings.get(v.toId),from=state.buildings.get(v.fromId);if(b&&v.residentReservation)b.reservedResidents=Math.max(0,b.reservedResidents-1);if(b&&v.serviceReservation)b.reservedService=Math.max(0,b.reservedService-1);if(from)from.queue=from.queue.filter(i=>i!==v.id);state.vehicles.delete(v.id);updateTrafficSpatial(v);const c=state.citizens.get(v.citizenId);if(c)c.vehicleId=null;}
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
function respawnVehicle(v,reason='stalled'){
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
 if(c){c.location='travel';c.state='รอเข้าเมืองใหม่';c.history.push(timeText(state.time)+(reason==='demolition'?' ถนนถูกรื้อ · กลับเข้าประตูเมืองใหม่':' รถติดครบ 150 นาที · กลับเข้าประตูเมืองใหม่'));c.history=c.history.slice(-12);}
 updateTrafficSpatial(v);return true;
}
function canTowVehicle(v){return !!v&&(v.phase==='stuck'||v.departureNoRoute||v.wait>=48);}
function towVehicle(id,incidentForce=false){
 const v=state.vehicles.get(id);if(!v||(!incidentForce&&!canTowVehicle(v)))return false;
 if(incidentForce){
  grandSignalRelease(v);
  for(const b of state.buildings.values())if(b.grandSignal?.holder===id)b.grandSignal.holder=null;
  for(const other of state.vehicles.values())if(other.id!==id){
   if(other.mergeEscapeId===id)other.mergeEscapeId=null;
   if(other.parkingEscapeFor===id)other.parkingEscapeFor=null;
   if(Array.isArray(other.mergeAdmitted))other.mergeAdmitted=other.mergeAdmitted.filter(x=>x!==id);
  }
 }
 const c=state.citizens.get(v.citizenId),from=state.buildings.get(v.fromId);cancelVehicle(v);
 if(incidentForce){
  // Remove only dead or self-owned occupancy/leases left by the incident.
  for(const [key,ownerId]of state.occ)if(ownerId===id||!state.vehicles.has(ownerId))state.occ.delete(key);
  for(const [key,claim]of state.reservations){
   if(claim.passes){claim.passes=claim.passes.filter(p=>p.id!==id&&state.vehicles.has(p.id));
    if(!claim.passes.length)state.reservations.delete(key);
    else{claim.id=claim.passes[0].id;claim.until=Math.max(...claim.passes.map(p=>p.until||0));}
   }else if(claim.id===id||!state.vehicles.has(claim.id))state.reservations.delete(key);
  }
 }
 if(c){if(c.tourist){touristActivityResult(c,c.itinerary[v.tourIndex],'cancelled');if(v.kind==='leisure')touristTrafficFailure(c,v,c.itinerary[v.tourIndex]);tourismLedger().departures++;removeCitizen(c);}else if(!c.resident){removeCitizen(c);}else{let origin=from||state.buildings.get(c.homeId);if(origin&&CATALOG[origin.key].service&&origin.visitors.size>=CATALOG[origin.key].service)origin=state.buildings.get(c.homeId);
  for(const b of state.buildings.values()){b.parked.delete(c.id);b.visitors.delete(c.id);}if(origin){origin.parked.add(c.id);parkingSpace(origin,c.id,true);if(CATALOG[origin.key].service)origin.visitors.add(c.id);c.locationId=origin.id;c.location=CATALOG[origin.key].kind;}else{c.locationId=null;c.location='home';}
  c.state='ยกเลิกเที่ยวเดินทาง · อยู่'+(origin?CATALOG[origin.key].name:'ที่พัก');c.problem='รถถูกลากออก เที่ยวเดินทางไม่สำเร็จ';c.pending=null;c.queued=null;c.history.push(timeText(state.time)+' ยกเลิกเที่ยวเดินทาง · ลากรถออก');c.history=c.history.slice(-12);resumeCancelledLife(c,v,'รถถูกลากออก เที่ยวเดินทางไม่สำเร็จ');
 }}
 if(follow===id)follow=null;return true;
}
function vehicleRecoveryActions(v){if(!v)return '';const incident=incidentForVehicle.get(v.id);return (incident?row('⚠️ เหตุจราจร','ต้นเหตุ '+incident.vehicles.length+' คัน · หยุด '+Math.round(incident.stalled)+' นาที')+action('🚨 ดูเหตุการณ์','incident-resolve',v.id):'')+row('เหตุผลที่หยุด',escapeSaveText(v.stopReason||(['departing','gate_waiting'].includes(v.phase)?'รอออกเดินทาง':'กำลังเดินทาง')))+(v.phase==='stuck'||v.departureNoRoute?action('ลองหาเส้นทางใหม่','reroute',v.id):'')+(canTowVehicle(v)?action('ลากรถออก / ยกเลิกเที่ยว','tow',v.id):'');}
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
   // Red approaches retain their original queue arrival time, but cannot
   // compete for entry. Defer expensive connector sampling and intersection
   // competition until the approach turns green; all its lanes turn green together.
   if(!signalAllows(g.node,motionDirection(v.path,g.pos-1)))continue;
   const connector=junctionConnector(v,g.pos),request={id:v.id,pos:g.pos,at:v.junctionQueueSince[key],distance:g.stop-s,connector};let queue=state.junctionQueues.get(g.node);if(!queue)state.junctionQueues.set(g.node,queue=[]);queue.push(request);
  }
  for(const key of Object.keys(v.junctionQueueSince))if(!activeKeys.has(key))delete v.junctionQueueSince[key];
 }
}
function junctionPriority(request,node){
 const c=request.connector;let priority=c.turn===2?2:c.turn===1?1:0;
 // A movement that has waited a full signal cycle joins the oldest-first tier.
 // Long waits become first-come-first-served, but never override a red light.
  return state.time-request.at>=Math.min(signalCycle(node),18)?-1:priority;
}
function queueAllows(v,pos,connector,precheckedExit=null){
 const node=v.path[pos],queue=state.junctionQueues?.get(node);if(!queue)return true;
 const own=queue.find(q=>q.id===v.id&&q.pos===pos);if(!own)return true;
 // Find the first two distinct cars per lane once, instead of rescanning
 // the entire queue for every competing movement. Exclude the car itself.
 const lanes=new Map();
 for(const q of queue){
  const key=q.connector.incoming+':'+q.connector.laneIn;
  let lane=lanes.get(key);if(!lane)lanes.set(key,lane=new Map());
  lane.set(q.id,Math.min(lane.get(q.id)??Infinity,q.distance));
 }
 const fronts=new Map();
 for(const [key,lane]of lanes){
  let first=null,second=null;
  for(const [id,distance]of lane){const item={id,distance};if(!first||distance<first.distance){second=first;first=item;}else if(!second||distance<second.distance)second=item;}
  fronts.set(key,{first,second});
 }
 const eligible=q=>{const car=state.vehicles.get(q.id),heads=fronts.get(q.connector.incoming+':'+q.connector.laneIn),front=heads.first?.id===q.id?heads.second:heads.first;return car&&(!signalRequired(node)||signalAllows(node,q.connector.incoming,q.connector.laneIn))&&(q.id===v.id&&precheckedExit!==null?precheckedExit:junctionExitAvailable(car,q.pos))&&!(front&&front.distance<q.distance-.01);};
 if(!eligible(own))return false;const priority=junctionPriority(own,node);
 for(const other of queue){if(other.id===v.id||!eligible(other)||!connectorsConflict(connector,other.connector))continue;const p=junctionPriority(other,node);if(p<priority||p===priority&&(other.at<own.at||other.at===own.at&&(other.distance<own.distance-.01||Math.abs(other.distance-own.distance)<.01&&other.id<v.id)))return false;}
 return true;
}
function signalRequired(node){return junction(node)>=3;}
function junctionExitAvailable(v,pos){
 for(let k=pos;k<=Math.min(v.path.length-1,pos+TRAFFIC_RULES.maxIntersectionLookahead);k++){
  // The next signalized junction controls its own red light and exit queue.
  // Do not make entry into this junction depend on a downstream green light.
  if(k>pos&&signalRequired(v.path[k]))break;
  if(!roadTraversalAvailable(v,k))return false;
 }
 // A free *logical* lane is not enough if a car is physically sitting at the
 // downstream side of the junction (for example during a lane change).
 if(trafficSpatial){
  const plan=motionPlan(v),junctionTurn=plan.junctions.find(g=>g.pos===pos);
  if(junctionTurn){
   for(const beyond of [.18,.6,1.05,1.4]){
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
 const entering=motionDirection(v.path,pos-1),lane=plannedLane(v,pos-1);if(signalRequired(i)&&!ignoreSignal&&!signalAllows(i,entering,lane))return false;
 const connector=junctionConnector(v,pos),lock=state.reservations.get('junction:'+i);
 for(const pass of lock?.passes|| (lock?[lock]:[])){if(pass.id!==v.id){const other=state.vehicles.get(pass.id);if(other&&connectorsConflict(connector,junctionConnector(other,pass.pos??other.pos)))return false;}}
 // Exit clearance is dynamic: check on EVERY admission attempt, never cache
 // across simulation steps. Reuse this read-only result within this attempt.
 const exitAvailable=junctionExitAvailable(v,pos);
 if(!exitAvailable)return false;
 if(!ignoreSignal&&!queueAllows(v,pos,connector,true))return false;
 return true;
}
function ownsJunctionPass(v,pos){return v.junctionPasses?.some(p=>p.pos===pos&&p.node===v.path[pos]);}
function reserveIntersection(v,pos){
 const i=v.path[pos];if(junction(i)<3)return;
 if(!v.junctionPasses)v.junctionPasses=[];
 if(!ownsJunctionPass(v,pos))v.junctionPasses.push({pos,node:i});
 const key='junction:'+i,lock=state.reservations.get(key)||{passes:[]};if(!lock.passes)lock.passes=[];const pass=lock.passes.find(p=>p.id===v.id);if(pass){pass.until=state.time+30;pass.pos=pos;}else lock.passes.push({id:v.id,pos,until:state.time+30});lock.id=lock.passes[0].id;lock.until=state.time+30;state.reservations.set(key,lock);
 for(let k=pos;k<=Math.min(v.path.length-1,pos+TRAFFIC_RULES.maxIntersectionReservation);k++){
  // Reserve this connector only, never an independent downstream junction.
  if(k>pos&&signalRequired(v.path[k]))break;
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
  if(p.startDistance>s+.12)break;
  if(p.turn||p.endDistance<s-.08)continue;
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
// Reciprocal lane swaps may cross only while BOTH cars are changing into
// different, fully separated lanes. A one-sided cut-in must yield instead.
function laneSwapClearance(a,b,longitudinalGap){
 if(!a||!b||a.direction!==b.direction||a.side*b.side>=0)return false;
 if((a.start-b.start)*(a.end-b.end)>=0)return false;
 if(Math.abs(a.start-b.start)<.36||Math.abs(a.end-b.end)<.36)return false;
 return Number.isFinite(longitudinalGap)&&Math.abs(longitudinalGap)<=.65;
}
function reciprocalLaneSwap(v,other,plan,s,otherPose){
 if(v.phase!=='driving'||other.phase!=='driving'||v.id===other.id)return false;
 const a=laneChangeSegment(v,plan,s);
 if(!a)return false;
 const otherPlan=motionPlan(other),otherS=motionDistance(other,otherPlan);
 const b=laneChangeSegment(other,otherPlan,otherS);
 if(!b)return false;
 const start=positionOnMotion(plan,s),d=DIR[a.direction];
 const ahead=(otherPose.x-start.x)*d[0]+(otherPose.y-start.y)*d[1];
 return laneSwapClearance(a,b,ahead);
}
// Already overlapping cars may clear in a stable front-to-back order.
function convergingLanePair(v,other,plan,s,otherPose){
 if(v.phase!=='driving'||other.phase!=='driving')return null;
 const d=motionDirection(v.path,v.pos);
 if(d!==motionDirection(other.path,other.pos))return null;
 const axis=DIR[d],origin=positionOnMotion(plan,s),op=motionPlan(other),os=motionDistance(other,op);
 // Crossing traffic and actual turns keep their existing intersection rules.
 if([ [plan,s],[op,os] ].some(([p,at])=>p.turns.some(t=>t.endDistance>at-.2&&t.startDistance<at+3.5)))return null;
 const shifting=(p,at)=>(p.laneShifts??=p.pieces.filter(t=>!t.turn&&!t.line)).find(t=>t.endDistance>at-.5&&t.startDistance<at+3.5&&Math.abs((t.p3.x-t.p0.x)*axis[1]-(t.p3.y-t.p0.y)*axis[0])>.08);
 const shift=shifting(plan,s),otherShift=shifting(op,os);if(!shift&&!otherShift)return null;
 if(Math.abs((otherPose.x-origin.x)*axis[1]-(otherPose.y-origin.y)*axis[0])<.08)return null;
 let shared=false;
 for(let k=v.pos+1;k<plan.path.length&&plan.nodes[k]-s<=4.5;k++){
  for(let j=other.pos+1;j<op.path.length&&op.nodes[j]-os<=4.5;j++)if(plan.path[k]===op.path[j]&&plan.lanes[k]===op.lanes[j]){shared=true;break;}
  if(shared)break;
 }
 if(!shared)return null;
 const ahead=(otherPose.x-origin.x)*axis[0]+(otherPose.y-origin.y)*axis[1];
 return {wins:ahead< -1e-6||Math.abs(ahead)<=1e-6&&v.id<other.id,stop:Math.max(s,(shift?.startDistance??s)-.7)};
}
function overlapEscapePriority(v,other,plan,s,otherPose,merge=null){
 if(v.phase!=='driving'||other.phase!=='driving')return false;
 // Release saved, mutually blocked merge pairs in one stable order. This
 // recovery is limited to the converging same-direction lane corridor.
 if(merge?.wins&&((v.wait||0)>=2&&(other.wait||0)>=2||capsulesOverlap(positionOnMotion(plan,s),otherPose)))return true;
 const origin=positionOnMotion(plan,s),sameDirection=origin.dx*otherPose.dx+origin.dy*otherPose.dy;
 if(!(sameDirection>.88)||!capsulesOverlap(origin,otherPose))return false;
 // The normal traffic limit still applies to cars that are not overlapping.
 const dx=otherPose.x-origin.x,dy=otherPose.y-origin.y,otherAhead=dx*origin.dx+dy*origin.dy;
 return otherAhead<-.06||(Math.abs(otherAhead)<=.06&&v.id<other.id);
}
function physicalTrafficLimit(v,plan,s,lookahead){
 if(!trafficSpatial)return Infinity;
 let memo=trafficSpatial.physicalMemo;
 if(!memo||memo.id!==v.id||memo.epoch!==trafficSpatial.epoch||memo.plan!==plan||memo.s!==s){
  memo=trafficSpatial.physicalMemo={id:v.id,epoch:trafficSpatial.epoch,plan,s,queries:new Map()};
 }
 if(memo.queries.has(lookahead))return memo.queries.get(lookahead);
 const result=computePhysicalTrafficLimit(v,plan,s,lookahead);
 memo.queries.set(lookahead,result);return result;
}
function computePhysicalTrafficLimit(v,plan,s,lookahead){
 if(!trafficSpatial)return Infinity;const end=Math.min(plan.total,s+lookahead),origin=positionOnMotion(plan,s),x=Math.floor(origin.x/2),y=Math.floor(origin.y/2),key=x+':'+y;let cached=trafficSpatial.candidates.get(v.id),candidates=cached?.key===key&&cached.epoch===trafficSpatial.epoch?cached.ids:null;
 if(!candidates){candidates=[];for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(const other of trafficSpatial.cells.get((x+dx)+':'+(y+dy))?.values()||[])if(other.id!==v.id)candidates.push(other.id);trafficSpatial.candidates.set(v.id,{key,epoch:trafficSpatial.epoch,ids:candidates});}
 if(!candidates.length)return Infinity;
 const piece=plan.pieces.find(p=>p.line&&p.startDistance<=s&&p.endDistance>=end),near=[];let mergeLimit=Infinity;
 for(const id of candidates){
  const otherCar=state.vehicles.get(id);
  // Road cars ghost through parked, departing and route-stuck vehicles, not through moving same-lane leaders.
  if(!otherCar||parkingEscapePair(v,id))continue;
  // A car entering this same destination is still physically at the road
  // gate. Only arriving traffic must yield; passing traffic keeps priority.
  if(otherCar.phase!=='driving'&&!(otherCar.phase==='stuck'&&otherCar.heldPose)&&!(otherCar.phase==='parking_in'&&v.toId!=null&&otherCar.toId===v.toId&&otherCar.lotPath))continue;
  const record=trafficSpatial.cars.get(id);if(!record)continue;
  const p=record.pose,x=p.x-origin.x,y=p.y-origin.y;
  if(x*x+y*y>(lookahead+.7)*(lookahead+.7))continue;
  const merge=convergingLanePair(v,otherCar,plan,s,p);
  if(merge&&!merge.wins)mergeLimit=Math.min(mergeLimit,merge.stop);
  // Only lateral crossings may ghost. Existing overlaps are released in
  // front-to-back order instead of forcing every vehicle to stop forever.
  if(reciprocalLaneSwap(v,otherCar,plan,s,p)
   ||overlapEscapePriority(v,otherCar,plan,s,p,merge))continue;
  if(piece&&origin.dx!=null&&p.dx!=null&&Math.abs(origin.dx*p.dy-origin.dy*p.dx)<.01){
   const across=Math.abs(x*origin.dy-y*origin.dx);
   // On a straight stretch, cars in another parallel lane must not hold up the left lane.
   if(motionDirection(v.path,v.pos)===motionDirection(otherCar.path,otherCar.pos)&&plannedLane(v,v.pos)!==plannedLane(otherCar,otherCar.pos)&&across>=.32)continue;
   if(across>=.32)continue;
  }
  near.push(p);
 }
 if(!near.length)return mergeLimit;let safe=s;
 for(let next=s+.1;next<=end+.099;next+=.1){const along=Math.min(end,next),p=positionOnMotion(plan,along);for(const other of near)if(capsulesOverlap(p,other))return Math.min(mergeLimit,Math.max(s,safe-.025));safe=along;if(along===end)break;}
 return mergeLimit;
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
   if(stop<limit){limit=stop;reason=signalRequired(g.node)&&!signalAllows(g.node,dir(v.path[g.pos-1],g.node),plannedLane(v,g.pos-1))?'ไฟแดง':'คิวแยก';}
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
// Lane changes begin at the real current pose, not at a shifted/teleported one.
// The existing reciprocal-swap rule remains the only normal collision exception.
function laneChangeCorridorClear(v,plan,distance=ADAPTIVE_LANE_RULES.sweep){
 if(!trafficSpatial||!plan?.total)return false;
 const end=Math.min(plan.total,distance);
 for(let travel=.12;travel<=end+.12;travel+=.12){
  const pose=positionOnMotion(plan,Math.min(end,travel)),cx=Math.floor(pose.x/2),cy=Math.floor(pose.y/2);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)
   for(const other of trafficSpatial.cells.get((cx+dx)+':'+(cy+dy))?.values()||[]){
    if(other.id===v.id||Math.hypot(other.pose.x-pose.x,other.pose.y-pose.y)>1.15)continue;
    if(capsulesOverlap(pose,other.pose))return false;
   }
 }
 return true;
}
function commitSafeLaneChange(v,newLane,reason,newRoute=null){
 if(v.phase!=='driving'||v.mergeExitActive||v.parkingEscapeFor||!v.path?.[v.pos+2])return false;
 if(state.time<(v.adaptiveLaneUntil||0))return false;
 const direction=motionDirection(v.path,v.pos),oldLane=plannedLane(v,v.pos);
 if(Math.abs(newLane-oldLane)!==1||newLane<0||newLane>=laneCapacity(v.path[v.pos],direction))return false;
 const path=newRoute||v.path.slice(v.pos);
 if(path.length<3||path[0]!==v.path[v.pos]||path[1]!==v.path[v.pos+1])return false;
 for(const node of path.slice(0,3))
  if(!state.roads.has(node)||junction(node)>=3||laneCapacity(node,direction)<=newLane)return false;
 if(!cellAvailable(path[0],direction,newLane,v.id)||!cellAvailable(path[1],direction,newLane,v.id))return false;
 const actual=vehiclePosition(v);
 const proposal={...v,path:[...path],pathSet:new Set(path),pos:0,progress:0,
  motionStartPose:{...actual},motionSeedLane:newLane,emergencyInitialLane:newLane,
  turnLanes:{},junctionPasses:[],junctionQueueSince:{},committedJunction:null};
 const plan=motionPlan(proposal);
 if(plan.lanes[0]!==newLane||plan.lanes[1]!==newLane||plan.total<1)return false;
 const forward=DIR[direction],ahead=positionOnMotion(plan,Math.min(1,plan.total));
 if((ahead.x-actual.x)*forward[0]+(ahead.y-actual.y)*forward[1]<.05)return false;
 if(!laneChangeCorridorClear(v,plan))return false;
 release(v);Object.assign(v,proposal);
 v.adaptiveLaneUntil=state.time+ADAPTIVE_LANE_RULES.cooldown;
 v.stopReason=reason;v.routeCheckedVersion=state.version;
 occupy(v,0);updateTrafficSpatial(v);
 return true;
}
function attemptAdaptiveLaneChange(v){
 if(v.vehicleTech==='speed')return false; // F1 never changes lanes just to pass a slower leader.
 if(v.phase!=='driving'||v.mergeExitActive||v.parkingEscapeFor||v.path.length<8)return false;
 if((v.wait||0)<(v.vehicleTech==='smart'?ADAPTIVE_LANE_RULES.minWait*.3:ADAPTIVE_LANE_RULES.minWait)||(v.speed||0)>(v.vehicleTech==='smart'?1.7:.55)||state.time<(v.adaptiveLaneUntil||0))return false;
 if(v.pos<1||v.pos+5>=v.path.length)return false;
 const plan=motionPlan(v),s=motionDistance(v,plan),d=motionDirection(v.path,v.pos);
 const current=plannedLane(v,v.pos),cap=laneCapacity(v.path[v.pos],d);
 if(cap<2||laneChangeSegment(v,plan,s))return false;
 if(plan.turns.some(t=>t.endDistance>s&&t.startDistance<s+ADAPTIVE_LANE_RULES.turnBuffer))return false;
 if(plan.junctions.some(g=>g.clear>s&&g.entry<s+ADAPTIVE_LANE_RULES.junctionBuffer))return false;
 for(let i=v.pos;i<Math.min(v.path.length,v.pos+5);i++)
  if(junction(v.path[i])>=3||laneCapacity(v.path[i],d)!==cap||motionDirection(v.path,i)!==d)return false;
 const limit=physicalTrafficLimit(v,plan,s,ADAPTIVE_LANE_RULES.obstacleAhead);
 if(!Number.isFinite(limit)||limit>s+ADAPTIVE_LANE_RULES.obstacleAhead-.05)return false;
 for(const lane of [current+1,current-1])if(lane>=0&&lane<cap&&commitSafeLaneChange(v,lane,'เปลี่ยนเลนหลบคิวอย่างปลอดภัย'))return true;
 return false;
}
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
 if(rightLane<0)return false; // Can use a neighboring lane on four-lane roads.
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
  motionStartPose:{...pose},motionSeedLane:rightLane,emergencyInitialLane:rightLane,
  turnLanes:{},junctionPasses:[],junctionQueueSince:{},committedJunction:null};
 const candidatePlan=motionPlan(candidate);
 if(!candidatePlan.total||plannedLane(candidate,0)!==rightLane)return false;
 // Test the entire changing corridor before committing the physical lane.
 if(!laneChangeCorridorClear(v,candidatePlan))return false;
 if(!commitSafeLaneChange(v,rightLane,'หลบขวาฉุกเฉินและคำนวณเส้นทางใหม่',newPath))return false;
 v.speed=Math.min(v.speed||0,2);
 v.emergencyRightUntil=state.time+6;
 v.lastMovedAt=state.time;
 return true;
}
function advanceVehicles(realDt,gameDt){
 let routeBudget=2,respawnBudget=2;const gateAttempt=new Set(),simDt=Math.max(0,realDt*state.speed);for(const car of state.vehicles.values()){if(['departing','gate_waiting'].includes(car.phase)){if(car.noUTurnPolicy!==1){car.departureRouteVersion=-1;car.noUTurnPolicy=1;}}else if(car.phase==='driving'||car.phase==='stuck')enforceNoUTurn(car);}const requests=[];for(const car of state.vehicles.values()){let at=null;if(car.phase==='stuck'&&recoveryDue(car))at=car.recoveryVersion!==state.version?-1:car.nextRouteRetry??-1;else if(['departing','gate_waiting'].includes(car.phase)&&!(car.retryAt>state.time)&&(car.departureRouteVersion!==state.version||car.departureNoRoute&&!(car.nextDepartureRouteRetry>state.time)))at=car.departureRouteVersion!==state.version?-1:car.nextDepartureRouteRetry??-1;if(at!=null){requests.push({id:car.id,at});requests.sort((a,b)=>a.at-b.at||a.id-b.id);if(requests.length>2)requests.pop();}}const routeChecks=new Set(requests.map(r=>r.id));prepareJunctionQueues();trafficSpatial={cells:new Map(),cars:new Map(),candidates:new Map(),epoch:0};for(const car of state.vehicles.values())updateTrafficSpatial(car);
 prepareParkingMerges(simDt);
 const emergencyAlerts=parkingGateAlerts();
 for(const v of [...state.vehicles.values()]){
  if(!state.vehicles.has(v.id))continue;
  if(!Number.isFinite(v.lastMovedAt))v.lastMovedAt=state.time-Math.max(0,Number.isFinite(v.wait)?v.wait:0);
  if(missingRoute(v)&&Number.isFinite(v.routeMissingSince)&&state.time-v.routeMissingSince>=NO_ROUTE_TIMEOUT){towVehicle(v.id);continue;}
  // Apply the same 150-game-minute recovery to every moving/stalled trip,
  // INCLUDING parking_in, parking_out and departing without an active lotPath.
  // This check must precede the early continue branches for parking motion.
  if(respawnBudget>0&&['departing','parking_in','parking_out','driving','stuck'].includes(v.phase)
    &&state.time-v.lastMovedAt>=IMMOBILE_RESPAWN_TIMEOUT){
    // Incident roots are towed at 150 minutes; normal recovery remains unchanged.
    if(incidentForVehicle.has(v.id)){if(towVehicle(v.id,true)){respawnBudget--;continue;}}
    else if(respawnVehicle(v)){respawnBudget--;continue;}
   }
  trackJourney(v,gameDt);
  if(['air_lift','air_cruise','air_land','warp_charge'].includes(v.phase)){advanceSkyVehicle(v);continue;}
  if(v.phase==='parking_in'){
   const done=advanceLot(v,simDt);
   const gateDistance=Math.hypot(v.lotPath[1].x-v.lotPath[0].x,v.lotPath[1].y-v.lotPath[0].y);
   if(v.lotDistance>=gateDistance+.3){recordEntranceArrival(v);release(v);}
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
    grandSignalRelease(v);v.grandCrossing=null;v.lotPath=null;v.lotReady=false;v.mergeExitActive=true;v.mergeGhostUntil=null;
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
    const t=CATALOG[from.key];
    v.lotPath=t.stackedParking?[
     start,lotPoint(from,t.plotWidth-.45,t.frontageV),
     lotPoint(from,t.frontageExitU,t.frontageV),end]:[start,end];
    v.lotDistance=0;v.lotReady=false;
    v.mergeCommitted=false;v.mergePolicy=2;v.mergeWaitSeconds=0;v.mergeAdmitted=null;v.mergeDrainStarted=false;v.mergeEscapeId=null;v.phase='parking_out';v.stopReason='รอช่องทางออกสู่ถนน';
    updateTrafficSpatial(v);continue;
   }
   if(cellAvailable(i,d,lane,v.id)&&physicalTrafficLimit(v,motionPlan(v),0,.01)>0){
    if(c){c.location='travel';c.state=TRIPS[v.kind].name;}
    v.phase='driving';v.speed=0;v.stopReason='';if(c?.tourist)touristEnter(c,v);
    occupy(v,0);v.wait=0;v.lastMovedAt=state.time;updateTrafficSpatial(v);
   }
   continue;
  }
  if(v.phase==='stuck'){v.wait+=gameDt;v.speed=0;if(routeBudget>0&&routeChecks.has(v.id)&&recoveryDue(v)){routeBudget--;recoverVehicle(v);}continue;}
  if(v.routeCheckedVersion!==state.version){v.routeCheckedVersion=state.version;if(!remainingRouteValid(v)){strandVehicle(v,'เส้นทางเดิมขาด');continue;}}
  if(v.pos+1>=v.path.length){arrive(v);continue;}
  if(emergencyAlerts.length)emergencyRightReroute(v,emergencyAlerts);
  attemptAdaptiveLaneChange(v);
  if(v.mergeGhostUntil!=null&&motionDistance(v)>=v.mergeGhostUntil-1e-8)v.mergeGhostUntil=null;
  // Claim only a free lane; a pair-specific recovery cannot steal occupancy.
  if(!v.occKey&&state.roads.has(v.path[v.pos])){
   const d=motionDirection(v.path,v.pos),lane=plannedLane(v,v.pos),key=occKey(v.path[v.pos],d,lane);
   if(!state.occ.has(key)&&!state.reservations.has(key))occupy(v,v.pos);
  }
  const plan=motionPlan(v),initial=motionDistance(v,plan),type=ROADS[state.roads.get(v.path[v.pos]).type];
  let s=initial;refreshMotionReservations(v,plan,s);
  const barrier=motionBarrier(v,plan,s),braking=4.8*(['speed','smart'].includes(v.vehicleTech)?3:1),acceleration=2.8*(['speed','smart'].includes(v.vehicleTech)?3:1);
  let target=type.speed*.9*(['speed','smart'].includes(v.vehicleTech)?3:1);
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
  }else{v.wait=0;v.stopReason=blocked||'';}
  updateTrafficSpatial(v);
 }
 trafficSpatial=null;parkingMerges=[];
 for(const [key,res]of state.reservations){if(res.passes){res.passes=res.passes.filter(p=>p.until>=state.time&&state.vehicles.has(p.id));if(res.passes.length)res.id=res.passes[0].id;else state.reservations.delete(key);}else if(res.until<state.time||!state.vehicles.has(res.id))state.reservations.delete(key);}
}
function daily(){
 syncCitizenVehicleTech();reconcile();const day=Math.floor(state.time/1440),closedDay=day-1;
 for(const c of state.citizens.values()){
  if(!c.resident||c.removed)continue;
  const plan=lifePlan(c,closedDay),car=state.vehicles.get(c.vehicleId);
  if(plan?.version>=25)plan.steps.forEach((step,index)=>{
   if(step.kind!=='work'||closedDay*1440+step.until>state.time)return;
   if(car?.kind==='work'&&car.life?.day===closedDay&&car.life.index===index&&car.life.token===plan.token)return;
   journeyResult(c,{id:'attendance',kind:'work',life:{day:closedDay,index,token:plan.token}},'missed','ไม่ได้เข้าทำงานในช่วงเวลาที่กำหนด',false);
  });
 }
 const s=computeStats(closedDay),before=state.money;state.money=Math.max(-10000,state.money+s.net);missionFinishDay(day,s,state.money-before);
 for(const b of state.buildings.values())b.arrivals=0;
 for(const c of state.citizens.values()){
  if(!c.resident||c.removed)continue;assignJob(c);
  if(c.profile.trait!==3&&!c.workId){c.unemployed++;pain(c,6,'ไม่มีงานรองรับประจำวัน');}else c.unemployed=0;
  if(c.happy<25)c.lowHappyDays=(c.lowHappyDays||0)+1;else c.lowHappyDays=0;
  if(c.unemployed>=5||c.lowHappyDays>=3)c.movingOut=true;
  if(c.movingOut)schedule(c,state.time+1,'moveOut');else if(c.pain<8&&!c.workDays?.[closedDay]?.missed)reward(c,3,90);
  c.lastTax=workTax(c,closedDay);if(!c.taxSettledDays)c.taxSettledDays={};c.taxSettledDays[closedDay]=c.lastTax;
  for(const d of Object.keys(c.taxSettledDays))if(+d<day-3)delete c.taxSettledDays[d];
  c.late=!!(c.workDays?.[day]?.late||c.workDays?.[day]?.missed);c.pain=0;c.failKinds.clear();scheduleDay(c,day);
 }
 addNews('สรุปวัน: '+(s.net>=0?'รายรับสุทธิ ':'ขาดทุน ')+money(Math.abs(s.net)));
}
function reconcile(){syncParkingSlots();for(const b of state.buildings.values()){b.reservedResidents=0;b.reservedService=0;}for(const v of state.vehicles.values()){const b=state.buildings.get(v.toId);if(b){if(v.residentReservation)b.reservedResidents++;if(v.serviceReservation)b.reservedService++;}}}
function tick(dt){if(!state.speed)return;const old=state.time,gameDt=dt*GAME_MINUTES_PER_SECOND*state.speed*NORMAL_SPEED_SCALE;state.time+=gameDt;smartSignalStep();if(Math.floor(old/1440)!==Math.floor(state.time/1440))daily();let count=0,trips=0;while(state.events.length&&state.events[0].at<=state.time&&count<42&&trips<14){const e=eventPop(),c=state.citizens.get(e.citizenId);runAction(c,e.action,e);count++;trips++;}
if(state.time-state.lastImmigration>=1){state.lastImmigration=state.time;immigration();}
if(Math.floor(old/2)!==Math.floor(state.time/2)){let n=0;for(const c of state.citizens.values()){if(c.pending&&!c.pending.life&&c.pending.next<=state.time&&n++<80){const p=c.pending;if(p.expires<state.time){c.pending=null;continue;}runAction(c,p.action,p);}}}
if(state.time-state.lastPass>=90){state.lastPass=state.time;if(computeStats().pop<1200&&state.vehicles.size<3600){const index=Math.floor(state.time/90)%4;createTrip(null,'pass',null,null,state.gates[index],state.gates[(index+2)%4],null);}}
advanceVehicles(dt*NORMAL_SPEED_SCALE,gameDt);updateTourism(gameDt);updateCityActivity();scanIncidents();for(const r of state.roads.values()){if(r.load>.001)r.load*=Math.pow(.90,dt*4);if(r.wait>.001)r.wait*=Math.pow(.72,dt*4);}if(state.stats.happy<70&&state.time-(state.lastHappyAlert||0)>180){addNews('คนใหม่หยุดย้ายเข้า ช่วยแก้ปัญหาให้ความสุขตั้งแต่ 70%');state.lastHappyAlert=state.time;}}
function lineCells(a,b){let [x,y]=xy(a),[u,v]=xy(b),dx=u-x,dy=v-y;const horizontal=Math.abs(dx)>=Math.abs(dy);if(horizontal)v=y;else u=x;const steps=Math.max(Math.abs(u-x),Math.abs(v-y)),result=[];for(let n=0;n<=steps;n++){const xx=Math.round(x+(u-x)*(steps?n/steps:0)),yy=Math.round(y+(v-y)*(steps?n/steps:0));if(!valid(xx,yy))continue;const raw=id(xx,yy),snapped=owner(raw),point=xy(snapped),aligned=horizontal?point[1]===y:point[0]===x,p=aligned?snapped:raw;if(result[result.length-1]!==p)result.push(p);}return result;}
function checkRoad(cells,type){let cost=0;const t=ROADS[type];if(!cells.length)return{error:'เลือกตำแหน่งถนนบนแผนที่'};const centerline=new Set(cells);for(const i of cells)if(!state.roads.has(i)&&state.footprint[i]>=0&&!centerline.has(state.footprint[i]))return{error:'แนวถนนซ้อนขอบถนนเดิม ลากให้เชื่อมตรงกลางหรือขยับแนวถนนค่ะ'};for(const i of cells){const [x,y]=xy(i),r=state.roads.get(i),w=Math.max(roadClearanceWidth(t),r?roadClearanceWidth(ROADS[r.type]):0),lo=Math.floor(w/2);for(let yy=y-lo;yy<y+w-lo;yy++)for(let xx=x-lo;xx<x+w-lo;xx++){if(!valid(xx,yy))continue;if(state.buildGrid[id(xx,yy)]>=0)return{error:'ถนนทับพื้นที่อาคาร เลือกแนวถนนใหม่ค่ะ'};}cost+=r?Math.max(0,t.cost-ROADS[r.type].cost):t.cost;}
const adds=new Map();for(let k=1;k<cells.length;k++){const a=cells[k-1],b=cells[k];if(a===b)continue;const pa=xy(a),pb=xy(b);if(pa[0]!==pb[0]&&pa[1]!==pb[1])return{error:'แนวถนนต้องตรงเข้าจุดเชื่อม ลองลากจากกลางถนนเดิมค่ะ'};for(const[p,q]of[[a,b],[b,a]]){if(!adds.has(p))adds.set(p,new Set(state.roads.get(p)?.links||[]));adds.get(p).add(q);if(adds.get(p).size>4)return{error:'จุดเชื่อมนี้มีถนนเกิน 4 แขนง ลองขยับแนวถนนค่ะ'};}}
if(state.money<0||state.money-cost< -10000)return{error:'งบประมาณไม่พอ ลองถนนสั้นลงหรือรอรายรับวันถัดไปค่ะ'};return{cost};}
// A detached road graph gives both renderers the same geometry as construction.
// Never install preview nodes into the live city or charge until confirmation.
function getRoadPreview(){
 const request=pendingRoadPreview||(ROADS[tool]&&(drag?.cells?.length||(hover&&valid(hover.x,hover.y)))?{type:tool,cells:drag?.cells||[id(hover.x,hover.y)]}:null);
 if(!request)return null;
 const {cells,type}=request,key=[state.version,state.buildings.size,type,cells.join(',')].join(':');
 if(roadPreviewCache?.source===state&&roadPreviewCache.key===key)return roadPreviewCache.plan;
 const live=state,roads=new Map(live.roads),xs=cells.map(i=>i%300),ys=cells.map(i=>Math.floor(i/300));
 for(const i of cells){const r=roads.get(i);roads.set(i,r?{...r,links:new Set(r.links)}:{type,main:false,links:new Set(),load:0,wait:0});if(ROADS[type].lanes>ROADS[roads.get(i).type].lanes)roads.get(i).type=type;}
 for(let k=1;k<cells.length;k++){roads.get(cells[k-1]).links.add(cells[k]);roads.get(cells[k]).links.add(cells[k-1]);}
 const planned={...live,roads,junctionCache:new Map(),junctionLayoutCache:new Map(),gates:[]},layouts=new Map(),counts=new Map();
 const minX=Math.min(...xs)-8,maxX=Math.max(...xs)+8,minY=Math.min(...ys)-8,maxY=Math.max(...ys)+8,local=new Map();
 try{state=planned;for(const [i,r]of roads){const x=i%300,y=Math.floor(i/300);if(x<minX||x>maxX||y<minY||y>maxY)continue;local.set(i,r);layouts.set(i,junctionDetails(i));counts.set(i,junction(i));}}finally{state=live;}
 // Layouts use the full graph; clip only boundary links in the local drawing.
 for(const [i,r]of local)local.set(i,{...r,links:new Set([...r.links].filter(n=>local.has(n)))});
 const junctionPreview=i=>counts.get(i)||0;junctionPreview.details=i=>layouts.get(i);
 const plan={key,state:{...planned,roads:local},junction:junctionPreview,error:checkRoad(cells,type).error,cells,type};
 roadPreviewCache={source:live,key,plan};return plan;
}
function buildRoad(cells,type,confirmed=false){const check=checkRoad(cells,type);if(check.error){toast(check.error);return false;}if(!confirmed){pendingRoadPreview={cells:[...cells],type};$('dialog').classList.add('road-preview-confirm');confirmAction('สร้าง'+ROADS[type].name,`ความยาว ${cells.length} ช่อง · ${ROADS[type].lanes} เลน<br>ค่าก่อสร้าง ${money(check.cost)}<br>อาคารจะวางทับพื้นที่ถนนไม่ได้`,()=>buildRoad(cells,type,true));const endpoint=cells[cells.length-1];positionConstructionAtWorld(endpoint%W,Math.floor(endpoint/W));return;}const changed=[];for(const i of cells){const r=state.roads.get(i);if(!r){state.roads.set(i,{type,main:false,links:new Set(),load:0,wait:0});changed.push(i);}else if(ROADS[type].lanes>ROADS[r.type].lanes){r.type=type;changed.push(i);}}for(let k=1;k<cells.length;k++)link(cells[k-1],cells[k]);state.money-=check.cost;missionMoney('roadCost',check.cost);missionCount('roadsBuilt',changed.length);roadChanged(changed);toast('สร้างถนนแล้ว · '+money(check.cost));updateUI();return true;}
function roadChanged(cells,removedRoads=null){state.version++;roadPreviewCache=null;renderer3d?.invalidateRoads?.();state.routeCache.clear();state.junctionCache.clear();state.junctionLayoutCache?.clear();state.signalSlotCache?.clear();for(const node of state.signals.keys())if(junction(node)<3)state.signals.delete(node);nextAISignalPoll=-Infinity;rebuildFootprint();for(const b of state.buildings.values())b.access=accessFor(b);
 // Road removal is allowed under a car: transfer ONLY vehicles physically
 // occupying a deleted road tile to a city gate, keeping their destination.
 // Existing routes elsewhere retain their normal repair behaviour.
 if(removedRoads?.size)for(const car of [...state.vehicles.values()]){
  if(!['driving','stuck','parking_in','parking_out'].includes(car.phase))continue;
  const current=car.path?.[car.pos],occupied=car.occKey?Number(car.occKey.split(':')[0]):null;
  if(removedRoads.has(current)||removedRoads.has(occupied))respawnVehicle(car,'demolition');
 }
 let budget=2;
 for(const v of state.vehicles.values()){if(['departing','gate_waiting'].includes(v.phase)){v.retryAt=0;continue;}if(v.phase==='parking_in'||v.phase==='parking_out')continue;if(v.phase!=='stuck'&&!remainingRouteValid(v))strandVehicle(v,'เส้นทางเดิมขาด');if(v.phase==='stuck'){v.nextRouteRetry=state.time;if(budget-->0)recoverVehicle(v,true);}}
 for(const c of state.citizens.values())if(c.pending)c.pending.next=state.time+.5;
}
function checkBuilding(key,x,y){return checkParkingBuilding(key,x,y,movingBuildingId);}
let buildingPlacementCache=null;
function assistedBuildingPlacement(key,x,y,ignoreId=movingBuildingId){
 x=Math.floor(x);y=Math.floor(y);
 const t=CATALOG[key];if(!t)return{x,y,error:'เลือกอาคารก่อนค่ะ'};
 const affordable=!!ignoreId||state.money>=0&&state.money-t.cost>=-10000;
 const cacheKey=[key,x,y,ignoreId,state.version,state.buildingVisualVersion||0,state.buildings.size,affordable].join(':');
 if(buildingPlacementCache?.state===state&&buildingPlacementCache.key===cacheKey)return buildingPlacementCache.result;
 const finish=result=>{buildingPlacementCache={state,key:cacheKey,result};return result;};
 if(!affordable)return finish({x,y,error:'งบประมาณไม่พอสำหรับอาคารนี้ค่ะ'});
 // Search nearby road edges, not every possible plot on the map. The pointer
 // is a preferred plot location; orientation and clearances remain authoritative.
 const radius=Math.min(22,Math.max(10,t.plotWidth,t.plotHeight)),near=[];
 for(const [node,road]of state.roads){
  const rx=node%W,ry=Math.floor(node/W),distance=(rx-x)*(rx-x)+(ry-y)*(ry-y);
  if(distance>radius*radius||!road.links.size)continue;
  near.push({node,road,rx,ry,distance});
 }
 near.sort((a,b)=>a.distance-b.distance||a.node-b.node);
 const candidates=[],seen=new Set();
 for(const item of near.slice(0,96)){
  const {node,road,rx,ry}=item,clearance=roadClearanceWidth(ROADS[road.type]),lo=Math.floor(clearance/2),hi=Math.ceil(clearance-lo);
  const horizontal=[...road.links].some(n=>Math.floor(n/W)===ry),vertical=[...road.links].some(n=>n%W===rx);
  for(let rotation=0;rotation<4;rotation++){
   if(rotation%2?!vertical:!horizontal)continue;
   const {w,h}=buildingBounds({key,rotation});
   const px=rotation===1?rx+hi:rotation===3?rx-lo-w:rx-Math.floor(w/2);
   const py=rotation===0?ry-lo-h:rotation===2?ry+hi:ry-Math.floor(h/2);
   const signature=px+':'+py+':'+rotation;if(seen.has(signature))continue;seen.add(signature);
   const dx=Math.max(px-x,0,x-(px+w)),dy=Math.max(py-y,0,y-(py+h));
   const score=dx*dx+dy*dy+item.distance*.35+((px+w/2-x)**2+(py+h/2-y)**2)*.08;
   candidates.push({x:px,y:py,rotation,score,roadNode:node});
  }
 }
 candidates.sort((a,b)=>a.score-b.score||a.roadNode-b.roadNode||a.rotation-b.rotation);
 for(const candidate of candidates){
  const check=checkParkingBuilding(key,candidate.x,candidate.y,ignoreId,candidate.rotation);
  if(!check.error)return finish({...candidate,...check,snapped:true});
 }
 // Keep a clearly invalid preview when no nearby slot exists; never force a
 // placement or move/demolish existing content to make it fit.
 const exact=checkParkingBuilding(key,x,y,ignoreId);
 return finish({x,y,...exact,snapped:false});
}
function getDemolitionPreview(){
 if(!['erase','eraseRoad','eraseBuilding'].includes(tool))return null;
 const stroke=pendingDemolitionPreview||drag;
 if(stroke?.pan)return null;
 let buildingId=stroke?.eraseBuildingId;
 if(buildingId==null&&tool!=='eraseRoad'&&!stroke&&hover&&valid(hover.x,hover.y)){
  const hit=state.buildGrid[id(hover.x,hover.y)];if(hit>=0)buildingId=hit;
 }
 const building=state.buildings.get(buildingId);
 if(building){const bounds=buildingBounds(building);return{key:'building:'+building.id+':'+building.x+':'+building.y+':'+building.rotation,roads:[],building:{...building,...bounds}};}
 if(tool==='eraseBuilding')return null;
 const cells=stroke?.cells||(hover&&valid(hover.x,hover.y)?[owner(id(hover.x,hover.y))]:[]);
 const roads=[...new Set(cells)].filter(node=>state.roads.has(node)).map(node=>({node,type:state.roads.get(node).type,main:state.roads.get(node).main}));
 return roads.length?{key:'roads:'+state.version+':'+roads.map(r=>r.node).join(','),roads,building:null}:null;
}
function drawDemolitionPreview2D(preview){
 if(!preview)return;
 for(const road of preview.roads){const x=road.node%W,y=Math.floor(road.node/W),w=ROADS[road.type].visualWidth||ROADS[road.type].width;
  poly([[x-w/2,y-w/2],[x+w/2,y-w/2],[x+w/2,y+w/2],[x-w/2,y+w/2]].map(p=>screen(...p)),road.main?'#33333388':'#281717bb','#f47a74');
 }
 if(preview.building){const b=preview.building;poly([[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(p=>screen(...p)),'#281717bb','#f47a74');}
}

function beginMoveBuilding(buildingId){
 const b=state.buildings.get(buildingId);if(!b)return false;
 selectTool(b.key);movingBuildingId=b.id;selected=null;const bounds=buildingBounds(b);hover={x:b.x+bounds.w/2,y:b.y+bounds.h/2};
 $('cancelMoveBuilding').hidden=false;$('inspector').classList.add('hidden');$('hint').textContent='ย้าย'+CATALOG[b.key].name+'ฟรี · เลือกตำแหน่งติดถนน · Esc หรือแตะสองครั้งเพื่อยกเลิก';return true;
}
function cancelBuildingMove(){
 const buildingId=movingBuildingId;if($('dialog').open)closeModal();hover=null;drag=null;selectTool('hand');
 if(state.buildings.has(buildingId)){selected={kind:'building',id:buildingId};renderInspector();}
 toast('ยกเลิกย้ายอาคารแล้ว');
}
$('cancelMoveBuilding').onclick=cancelBuildingMove;
function moveBuilding(buildingId,x,y,confirmed=false,preferredRotation=null){
 const b=state.buildings.get(buildingId);if(!b)return false;
 const check=checkParkingBuilding(b.key,x,y,b.id,preferredRotation);if(check.error){toast(check.error);return false;}
 if(!confirmed){confirmAction('ย้าย'+CATALOG[b.key].name,'ย้ายอาคารพร้อมลานจอดฟรี · คงผู้อยู่อาศัย พนักงาน ผู้ใช้บริการและผู้จองเดิม',()=>moveBuilding(buildingId,x,y,true,preferredRotation));$('cancelDialog').textContent='ยกเลิกย้าย';$('cancelDialog').onclick=cancelBuildingMove;positionConstructionAtWorld(x+check.bounds.w/2,y+check.bounds.h/2);return true;}
 // Recheck on confirmation: the old plot is never cleared by a failed move.
 markBuildingPlot(b,-1);b.x=x;b.y=y;b.rotation=check.rotation;b.access=check.access;state.buildingVisualVersion=(state.buildingVisualVersion||0)+1;
 b.grandSignal=null;markBuildingPlot(b,b.id);
 roadChanged([]);
 for(const v of [...state.vehicles.values()]){
  if(v.fromId===b.id&&['departing','parking_out'].includes(v.phase)){
   release(v);cleanupParkingVehicle(v);v.lotPath=null;v.lotReady=false;v.lotDistance=0;v.lotBuilding=null;v.parkingStage=false;v.heldPose=null;
   v.mergeCommitted=false;v.mergeExitActive=false;v.mergeEscapeId=null;v.parkingEscapeFor=null;v.mergeAdmitted=null;v.grandCrossing=null;
   v.phase='departing';v.departureRouteVersion=-1;v.retryAt=0;v.lastMovedAt=state.time;
   const c=state.citizens.get(v.citizenId);if(c){b.parked.add(c.id);parkingSpace(b,c.id,true);c.locationId=b.id;c.location=CATALOG[b.key].kind;}
   if(!b.queue.includes(v.id))b.queue.push(v.id);checkDepartureRoute(v);
  }else if(v.toId===b.id){
   if(v.phase==='parking_in'){respawnVehicle(v);}
   else if(['driving','stuck'].includes(v.phase)){strandVehicle(v,'อาคารย้ายตำแหน่ง · หาเส้นทางใหม่');recoverVehicle(v,true);}
   else{v.departureRouteVersion=-1;v.nextDepartureRouteRetry=state.time;checkDepartureRoute(v);}
  }
 }
 syncParkingSlots();movingBuildingId=null;hover=null;selectTool('hand');selected={kind:'building',id:b.id};renderInspector();updateUI();toast('ย้ายอาคารแล้ว · ฟรี');return true;
}

function buildBuilding(key,x,y,confirmed=false,preferredRotation=null){const check=checkParkingBuilding(key,x,y,null,preferredRotation),t=CATALOG[key];if(check.error){toast(check.error);return false;}if(!confirmed){confirmAction('สร้าง'+t.name,`ค่าก่อสร้าง ${money(t.cost)} · ค่าดูแล ${money(t.maint)} / วัน<br>พื้นที่รวมลานจอด ${check.bounds.w} × ${check.bounds.h} ช่อง · ที่จอด ${t.parkingCapacity} คัน<br>${t.beds?'รองรับผู้พัก '+t.beds+' คน':t.residents?'รองรับผู้อยู่อาศัย '+t.residents+' คน':t.jobs+' ตำแหน่งงาน'+(t.service?' · บริการ '+t.service+' คน':'')}`,()=>buildBuilding(key,x,y,true,preferredRotation));positionConstructionAtWorld(x+check.bounds.w/2,y+check.bounds.h/2);return;}const b={id:state.nextId++,key,x,y,rotation:check.rotation,starterCompact:key==='home_starter',starterFrontRowV2:key==='home_starter',starterParkingV3:key==='home_starter',starterCottageV4:key==='home_starter',starterCottage3x3:key==='home_starter',starterGroundV6:key==='home_starter',grandFrontLayout:!!t.stackedParking,grandFrontageV3:!!t.stackedParking,compactLotV2:!!t.dualParking,compactLotV3:!!t.dualParking,parkingSlots:Array(t.parkingCapacity).fill(null),access:check.access,residents:new Set(),workers:new Set(),visitors:new Set(),guests:new Set(),parked:new Set(),reservedResidents:0,reservedService:0,queue:[],arrivals:0};state.buildings.set(b.id,b);state.buildingVisualVersion=(state.buildingVisualVersion||0)+1;markBuildingPlot(b,b.id);state.money-=t.cost;missionMoney('buildingCost',t.cost);missionCount('buildingsBuilt');for(const c of state.citizens.values()){if(c.resident)assignJob(c);if(c.pending)c.pending.next=state.time+.5;}addNews('เปิด'+t.name+'ใหม่'+(t.jobs?' · เพิ่ม '+t.jobs+' งาน':''));toast('สร้าง'+t.name+'แล้ว');updateUI();return b;}
function demolishBuilding(b,confirmed=false,anchor=null){if(!b||!state.buildings.has(b.id))return false;const t=CATALOG[b.key],fee=0;if(!confirmed){const details=t.residents?'ผู้อยู่อาศัยในบ้านนี้จะออกจากเมือง':'พนักงานต้องหางานใหม่ และการเดินทางมาที่นี่จะถูกยกเลิก';confirmDemolition('รื้อ'+t.name+'?',details,()=>demolishBuilding(b,true),anchor||screen(b.x+buildingBounds(b).w/2,b.y+buildingBounds(b).h/2));pendingDemolitionPreview={cells:[],eraseBuildingId:b.id};return true;}prepareTouristDemolition(b);if(t.residents)for(const c of [...state.citizens.values()])if(c.homeId===b.id)removeCitizen(c);for(const v of [...state.vehicles.values()])if(v.fromId===b.id||v.toId===b.id){const c=state.citizens.get(v.citizenId);if(c?.tourist)continue;cancelVehicle(v);if(c){c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);resumeCancelledLife(c,v,'อาคารต้นทางหรือปลายทางถูกรื้อ');}}for(const c of state.citizens.values()){if(c.tourist)continue;if(c.workId===b.id)c.workId=null;if(c.locationId===b.id){c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);}}
markBuildingPlot(b,-1);state.buildings.delete(b.id);state.buildingVisualVersion=(state.buildingVisualVersion||0)+1;state.money-=fee;missionCount('buildingsRemoved');for(const c of state.citizens.values())assignJob(c);reconcile();selected=null;$('inspector').classList.add('hidden');toast('รื้ออาคารแล้ว');updateUI();}
// Freehand demolition follows every crossed cell, even between sparse pointer samples.
function roadEraseSegmentCells(x0,y0,x1,y1){
 if(![x0,y0,x1,y1].every(Number.isFinite))return[];
 let x=Math.floor(x0),y=Math.floor(y0),tx=Math.floor(x1),ty=Math.floor(y1);
 if(!valid(x,y)||!valid(tx,ty))return[];
 const dx=Math.abs(tx-x),dy=Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;
 let err=dx-dy;const found=[],seen=new Set();
 for(let n=0;n<=W+H;n++){
  const node=owner(id(x,y));
  if(state.roads.has(node)&&!seen.has(node)){found.push(node);seen.add(node);}
  if(x===tx&&y===ty)break;
  const e=2*err;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}
 }
 return found;
}
function appendRoadEraseStroke(d,x,y){
 if(!d||d.pan||!Number.isFinite(x)||!Number.isFinite(y))return;
 const fromX=d.eraseLastX,fromY=d.eraseLastY;d.eraseLastX=x;d.eraseLastY=y;
 if(!d.eraseSeen)d.eraseSeen=new Set(d.cells||[]);
 for(const node of roadEraseSegmentCells(fromX,fromY,x,y)){
  if(!d.eraseSeen.has(node)){d.eraseSeen.add(node);d.cells.push(node);}
 }
}
function roadErasePlan(cells){
 // One road per grid id. Visual widths are not additional road layers.
 const p={roads:[],fee:0,main:0,busy:0,missing:0,cars:0},seen=new Set();
 for(const node of cells||[]){
  if(!Number.isInteger(node)||seen.has(node))continue;seen.add(node);
  const road=state.roads.get(node);
  if(!road){p.missing++;continue;}
  if(road.main){p.main++;continue;}
  p.roads.push(node);
 }
 const removing=new Set(p.roads);
 for(const car of state.vehicles.values()){
  if(!['driving','stuck','parking_in','parking_out'].includes(car.phase))continue;
  const occupied=car.occKey?Number(car.occKey.split(':')[0]):null;
  if(removing.has(car.path?.[car.pos])||removing.has(occupied))p.cars++;
 }
 return p;
}
function demolishRoadStroke(cells,confirmed=false,anchor=null){
 const p=roadErasePlan(cells),skipped=p.main;
 if(!p.roads.length){
  toast(p.main?'ถนนหลักเริ่มต้นรื้อไม่ได้ค่ะ':'ลากผ่านถนนที่ต้องการรื้อค่ะ');
  return false;
 }
 if(!confirmed){
  confirmDemolition('รื้อถนน '+p.roads.length+' ช่อง?',(skipped?'ข้ามถนนหลัก '+skipped+' ช่อง · ':'')+(p.cars?'รถ '+p.cars+' คันจะกลับเข้าเมืองใหม่ · ':'')+'ถนนที่ขาดอาจทำให้อาคารเข้าออกไม่ได้',()=>demolishRoadStroke(cells,true),anchor||screen(p.roads[0]%W,Math.floor(p.roads[0]/W)));
  pendingDemolitionPreview={cells:[...cells],eraseBuildingId:null};return true;
 }
 for(const node of p.roads){
  const road=state.roads.get(node);if(!road)continue;
  for(const next of road.links)state.roads.get(next)?.links.delete(node);
  state.roads.delete(node);
 }
 state.money-=p.fee;roadChanged(p.roads,new Set(p.roads));updateUI();
 toast('รื้อถนนแล้ว '+p.roads.length+' ช่อง'+(skipped?' · ข้าม '+skipped+' ช่อง':''));
 return true;
}
function demolishRoad(i,confirmed=false,anchor=null){
 const plan=roadErasePlan([i]);
 if(!plan.roads.length){toast(plan.main?'ถนนหลักเริ่มต้นรื้อไม่ได้ค่ะ':'เลือกช่องที่มีถนนค่ะ');return false;}
 if(!confirmed){
  confirmDemolition('รื้อถนน 1 ช่อง?',(plan.cars?'รถ '+plan.cars+' คันจะกลับเข้าเมืองใหม่ · ':'')+'ถนนที่ขาดอาจทำให้อาคารเข้าออกไม่ได้',()=>demolishRoad(i,true),anchor||screen(i%W,Math.floor(i/W)));
  pendingDemolitionPreview={cells:[i],eraseBuildingId:null};return true;
 }
 const road=state.roads.get(i);if(!road||road.main)return false;
 for(const n of road.links)state.roads.get(n)?.links.delete(i);
 state.roads.delete(i);roadChanged([i],new Set([i]));updateUI();toast('ลบถนนแล้ว 1 ช่อง');
 return true;
}
// Demolition confirms at the center of the screen on every device.
// Existing callers may still pass a pointer anchor; it is intentionally ignored.
// Nothing is deleted until the user presses the red confirmation button.
function confirmDemolition(title,details,callback,anchor=null){
 modal('<div class="demolition-card"><span class="demolition-symbol" aria-hidden="true">×</span><div class="demolition-info"><h2>'+title+'</h2><p>'+details+'</p></div></div><div class="actions demolition-actions"><button type="button" id="cancelDialog">ไม่ลบ</button><button type="button" id="confirmDialog" class="danger">ลบ</button></div>');
 const dialog=$('dialog');dialog.classList.add('demolition-confirm');
 // No construction-confirm class or pointer positioning: CSS owns centering.
 $('cancelDialog').onclick=closeModal;
 $('confirmDialog').onclick=()=>{closeModal();callback();};
}
function confirmAction(title,body,callback){modal(`<span class="eyebrow">CITY PLANNING</span><h2>${title}</h2><p>${body}</p><div class="actions"><button id="cancelDialog">ยกเลิก</button><button id="confirmDialog" class="primary">ยืนยัน</button></div>`);$('cancelDialog').onclick=closeModal;$('confirmDialog').onclick=()=>{closeModal();callback();};}
function signalHitAt(x,y){const p=world(x,y),centerX=Math.round(p[0]-(renderer3d?0:.5)),centerY=Math.round(p[1]-(renderer3d?0:.5));let best=22,result=null;for(let yy=centerY-3;yy<=centerY+3;yy++)for(let xx=centerX-3;xx<=centerX+3;xx++){if(!valid(xx,yy))continue;const node=id(xx,yy);if(junction(node)<3)continue;const v=screen(xx+(renderer3d?0:.5),yy+(renderer3d?0:.5),renderer3d?.2:0),dist=Math.hypot(v[0]-x,v[1]-y);if(dist<best){best=dist;result=node;}}return result;}
function inspectAt(x,y){const marker=renderer3d?.pickVehicleMarker?.(x,y)||canvasCarMarkerHits.find(p=>Math.hypot(p.x-x,p.y-y)<10)?.selection;if(marker){selected={...marker};renderInspector();return;}const signal=tool==='tracking'?null:signalHitAt(x,y);if(signal!=null){selected={kind:'road',id:signal};renderInspector();return;}let closest=null,best=15;for(const v of state.vehicles.values()){if(!['driving','stuck','parking_in','parking_out','air_lift','air_cruise','air_land','warp_charge'].includes(v.phase)&&!(v.phase==='departing'&&v.lotPath))continue;const p=vehiclePosition(v);if(!p)continue;const a=screen(p.x-(renderer3d?.5:0),p.y-(renderer3d?.5:0)),dist=Math.hypot(a[0]-x,a[1]-y);if(dist<best){best=dist;closest=v;}}if(closest){selected={kind:'vehicle',id:closest.id,citizenId:closest.citizenId};renderInspector();return;}
 // Pick truly parked cars by their actual parking slot instead of selecting their building.
 let parked=null,parkedBest=15;
 for(const b of state.buildings.values())for(const cid of b.parked){
  if(parkingIsMoving(cid)||!state.citizens.has(cid))continue;
  const slot=parkingSpace(b,cid);if(slot<0)continue;
  const p=parkingSlotPose(b,slot);if(!p)continue;
  const at=screen(p.x-(renderer3d?.5:0),p.y-(renderer3d?.5:0));
  const dist=Math.hypot(at[0]-x,at[1]-y);if(dist<parkedBest){parkedBest=dist;parked={id:cid,buildingId:b.id};}
 }
 if(parked){selected={kind:'parked',...parked};renderInspector();return;}
 if(renderer3d){const hit=renderer3d.pickBuilding(x,y);if(hit!=null){selected={kind:'building',id:hit};renderInspector();return;}}const p=world(x,y),ix=Math.floor(p[0]),iy=Math.floor(p[1]);if(!valid(ix,iy))return;const b=state.buildGrid[id(ix,iy)];if(b>=0)selected={kind:'building',id:b};else{const i=owner(id(ix,iy));if(state.roads.has(i))selected={kind:'road',id:i};else{selected=null;$('inspector').classList.add('hidden');return;}}renderInspector();}
// Compact five-way 3D camera joystick. 3D pick/world projection already uses
// the live camera matrix, so construction and selection follow the rotated view.
const cameraDefaultAngle=Math.PI/4,cameraDefaultElevation=Math.PI*50/180;
let cameraJoystickHold=null;
function nudgeCamera(direction,amount=1){
 if(!renderer3d)return;
 const angle=cam.angle??cameraDefaultAngle,elevation=cam.elevation??cameraDefaultElevation;
 if(direction==='left'||direction==='right'){
  cam.angle=(angle+(direction==='left'?-1:1)*Math.PI/12*amount)%(Math.PI*2);
 }else if(direction==='up'||direction==='down'){
  cam.elevation=Math.max(Math.PI*35/180,Math.min(Math.PI*78/180,elevation+(direction==='up'?1:-1)*Math.PI/24*amount));
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

// Right-edge slider controls elevation; pinch zoom is a separate map gesture.
const cameraPitchRail=$('cameraPitchRail'),cameraPitchTrack=$('cameraPitchTrack'),cameraPitchThumb=$('cameraPitchThumb');
const cameraPitchMin=Math.PI*35/180,cameraPitchMax=Math.PI*78/180;
let cameraPitchPointer=null,cameraPitchLast=NaN;
const pitchFraction=()=>Math.max(0,Math.min(1,((cam.elevation??cameraDefaultElevation)-cameraPitchMin)/(cameraPitchMax-cameraPitchMin)));
function syncCameraPitchRail(){
 if(!cameraPitchTrack||!cameraPitchThumb||cam.elevation===cameraPitchLast)return;
 cameraPitchLast=cam.elevation;
 const fraction=pitchFraction();
 cameraPitchThumb.style.top=(8+(1-fraction)*84)+'%';
 cameraPitchTrack.setAttribute('aria-valuenow',String(Math.round(cam.elevation*180/Math.PI)));
}
function setCameraPitchFraction(fraction){
 if(!renderer3d)return;
 const next=clampCameraElevation(cameraPitchMin+Math.max(0,Math.min(1,fraction))*(cameraPitchMax-cameraPitchMin));
 if(Math.abs(cam.elevation-next)<1e-8)return;
 cam.elevation=next;renderer3d.updateCamera(cam);syncCameraPitchRail();
}
function initCameraPitchRail(){
 if(!cameraPitchRail||!cameraPitchTrack||!cameraPitchThumb||!renderer3d)return;
 cameraPitchRail.hidden=false;
 const fractionAt=y=>{
  const rect=cameraPitchTrack.getBoundingClientRect();
  return rect.height?(rect.bottom-y-rect.height*.08)/(rect.height*.84):pitchFraction();
 };
 cameraPitchTrack.addEventListener('pointerdown',event=>{
  if(event.button!=null&&event.button!==0)return;
  event.preventDefault();event.stopPropagation();
  cameraPitchPointer=event.pointerId;cameraPitchTrack.setPointerCapture?.(event.pointerId);
  setCameraPitchFraction(fractionAt(event.clientY));
 });
 cameraPitchTrack.addEventListener('pointermove',event=>{
  if(cameraPitchPointer!==event.pointerId)return;
  event.preventDefault();setCameraPitchFraction(fractionAt(event.clientY));
 });
 const end=event=>{if(cameraPitchPointer===event.pointerId)cameraPitchPointer=null;};
 cameraPitchTrack.addEventListener('pointerup',end);
 cameraPitchTrack.addEventListener('pointercancel',end);
 cameraPitchTrack.addEventListener('lostpointercapture',end);
 cameraPitchTrack.addEventListener('keydown',event=>{
  const value=event.key==='ArrowUp'||event.key==='ArrowRight'?pitchFraction()+.04:
   event.key==='ArrowDown'||event.key==='ArrowLeft'?pitchFraction()-.04:
   event.key==='Home'?0:event.key==='End'?1:null;
  if(value===null)return;
  event.preventDefault();setCameraPitchFraction(value);
 });
 $('cameraPitchReset').onclick=resetCameraAngle;syncCameraPitchRail();
}
initCameraPitchRail();
function frame(ts){const dt=Math.min(.08,(ts-last)/1000||0);last=ts;if(cameraJoystickHold&&Date.now()-cameraJoystickHold.started>260)nudgeCamera(cameraJoystickHold.direction,dt*3);if(!$('dialog').open&&!window.SMGameAuthLocked)tick(dt);if(follow){const v=state.vehicles.get(follow);if(v){const p=vehiclePosition(v);if(p){cam.x+=(p.x-cam.x)*.06;cam.y+=(p.y-cam.y)*.06;}}else follow=null;}draw();syncCameraPitchRail();uiTick+=dt;if(uiTick>.75){uiTick=0;updateUI();}requestAnimationFrame(frame);}
window.addEventListener('resize',resize);
$('categories').onclick=()=>{}; // Redundant group row retired; construction tabs are direct.
$('subcategories').onclick=e=>{
 const button=e.target.closest('[data-category]');if(!button)return;
 // Direct construction category tabs, including landscaping.
 if(!dockGroups[0].categories.includes(button.dataset.category))return;
 const next=button.dataset.category;
 category=next;
 selectTool('hand');
};
$('tools').onclick=e=>{
 const b=e.target.closest('[data-tool]');if(!b)return;
 if(b.dataset.tool==='missionDashboard'){openMissionDashboard();return;}
 if(b.dataset.tool==='travelLog'){openTravelLog();return;}
 if(b.dataset.tool==='cityReport'){openCityReport();return;}
  if(b.dataset.tool==='sendAi'){sendCurrentMapToAi();return;}
 if(b.dataset.tool==='incidentLog'){openManualIncidentLog();return;}
 if(b.dataset.category)category=b.dataset.category;
 if(b.dataset.tool==='trafficHeat'){
  // Heatmap is a view toggle; it must not replace a construction tool in hand.
  toggleTrafficHeat();return;
 }
 // Re-clicking the active placement tool returns to the empty hand.
 if(tool===b.dataset.tool&&tool!=='hand'){cancelInteraction();return;}
 selectTool(b.dataset.tool);
};
$('cityQuickModes').onclick=event=>{
 const button=event.target.closest('[data-city-shortcut]');
 if(!button)return;
 const key=button.dataset.cityShortcut;
 if(key==='missionDashboard'){openMissionDashboard();return;}
 if(key==='vehicleUpgrade'){openVehicleUpgrade();return;}
 if(key==='trafficHeat'){toggleTrafficHeat();return;}
 if(!['citizenDashboard','touristDashboard','signalManage','erase'].includes(key))return;
 if(tool===key){
  selectTool('hand');
  if(key==='signalManage'){selected=null;$('inspector').classList.add('hidden');}
 }else selectTool(key);
};
$('toggleDock').onclick=()=>setDockCollapsed(!$('buildDock').classList.contains('is-collapsed'));
// Removing label nodes is decisive: CSS-only hiding was not reliable here.
function toggleBuildingLabels(){buildingLabelsVisible=!buildingLabelsVisible;syncBuildingLabelVisibility();}
function syncBuildingLabelVisibility(){
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
syncBuildingLabelVisibility();
function toggleCarStatusDiamonds(){carStatusDiamondsVisible=!carStatusDiamondsVisible;syncCarStatusDiamondVisibility();}
function syncCarStatusDiamondVisibility(){
 const hidden=!carStatusDiamondsVisible,button=$('toggleCarDiamonds');
 if(!button)return;
 button.classList.toggle('is-hidden',hidden);
 button.setAttribute('aria-pressed',String(hidden));
 button.setAttribute('aria-label',hidden?'แสดงสถานะรถใกล้สายหรือสายแล้ว':'ซ่อนสถานะรถใกล้สายหรือสายแล้ว');
 button.title=hidden?'แสดงสถานะรถ · 😥 ใกล้สาย · 😡 สายแล้ว':'ซ่อนสถานะรถ · รถปกติไม่แสดงสัญลักษณ์';
 const caption=$('toggleCarDiamondsText');
 if(caption)caption.textContent=hidden?'สถานะรถ':'ซ่อนสถานะ';
 // Do not change trips, tracking, incident warnings or selected car outline.
 if(renderer3d&&hidden&&renderer3d.carMarkerMesh){
  renderer3d.carMarkerMesh.count=0;
  renderer3d.carMarkerMesh.visible=false;
  renderer3d.carIndicatorHits=[];
 }
 if(hidden)canvasCarMarkerHits=[];
}
const diamondToggle=$('toggleCarDiamonds');
if(diamondToggle){diamondToggle.onclick=toggleCarStatusDiamonds;syncCarStatusDiamondVisibility();}

$('closeTouristsDashboard').onclick=()=>{category='roads';dockGroup='roads';selectTool('hand');};
$('touristSearch').oninput=e=>{touristSearch=e.target.value.slice(0,80);touristPage=0;renderTouristDashboard(true);};
$('touristFilters').onclick=e=>{const b=e.target.closest('[data-tourist-filter]');if(b){touristFilter=b.dataset.touristFilter;touristPage=0;renderTouristDashboard(true);}};
$('touristsDashboardBody').onclick=e=>{const person=e.target.closest('[data-tourist-id]');if(person){hideTouristDashboard();selected={kind:'citizen',id:Number(person.dataset.touristId)};renderInspector(true);}else if(e.target.closest('[data-tourist-more]')){touristPage++;renderTouristDashboard(true);}};
$('closeCitizensDashboard').onclick=()=>{category='roads';dockGroup='roads';selectTool('hand');};
$('citizenSearch').oninput=e=>{citizenSearch=e.target.value.slice(0,80);citizenPage=0;renderCitizenDashboard(true);};
$('citizenFilters').onclick=e=>{const b=e.target.closest('[data-citizen-filter]');if(b){citizenFilter=b.dataset.citizenFilter;citizenPage=0;renderCitizenDashboard(true);}};
$('citizensDashboardBody').onclick=e=>{
 const person=e.target.closest('[data-citizen-id]');
 if(person){const id=Number(person.dataset.citizenId);if(state.citizens.has(id)){hideCitizenDashboard();selected={kind:'citizen',id};renderInspector(true);}return;}
 if(e.target.closest('[data-citizen-more]')){citizenPage++;renderCitizenDashboard(true);}
};$('pause').onclick=()=>{state.speed=state.speed?0:1;updateUI();};document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=+b.dataset.speed;updateUI();});$('closeInspector').onclick=()=>{selected=null;$('inspector').classList.add('hidden');follow=null;};document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{selected={kind:b.dataset.inspect};renderInspector();});
let pointers=new Map(),pinch=null,pendingTap=null,lastTap=null;
let mouseOrbit=null,mouseChordHeld=false,mouseRightPending=false;
const clampCameraElevation=value=>Math.max(Math.PI*35/180,Math.min(Math.PI*78/180,value));
function beginMouseOrbit(event){
 if(!renderer3d)return false;
 event.preventDefault?.();clearPendingTap();drag=null;hover=null;follow=null;mouseRightPending=false;
 if(!mouseOrbit)mouseOrbit={x:event.clientX,y:event.clientY};
 mouseChordHeld=true;
 if(event.pointerId!=null){canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});}
 return true;
}
function moveMouseOrbit(event){
 const dx=event.clientX-mouseOrbit.x,dy=event.clientY-mouseOrbit.y;
 cam.angle=(cam.angle??cameraDefaultAngle)-dx*.0085;
 cam.elevation=clampCameraElevation((cam.elevation??cameraDefaultElevation)+dy*.004);
 mouseOrbit={x:event.clientX,y:event.clientY};renderer3d.updateCamera(cam);
}
function beginTouchOrbit(){
 const entries=[...pointers.entries()].slice(0,2),a=entries[0][1],b=entries[1][1];
 pinch={ids:entries.map(e=>e[0]),a:{...a},b:{...b},distance:Math.max(12,Math.hypot(b.x-a.x,b.y-a.y)),
  rotation:Math.atan2(b.y-a.y,b.x-a.x),x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:cam.z,
  angle:cam.angle??cameraDefaultAngle,elevation:cam.elevation??cameraDefaultElevation};
 clearPendingTap();drag=null;hover=null;follow=null;
}
function moveTouchOrbit(){
 const a=pointers.get(pinch.ids[0]),b=pointers.get(pinch.ids[1]);if(!a||!b||!renderer3d)return;
 const dxA=a.x-pinch.a.x,dyA=a.y-pinch.a.y,dxB=b.x-pinch.b.x,dyB=b.y-pinch.b.y;
 const movedA=Math.hypot(dxA,dyA),movedB=Math.hypot(dxB,dyB);
 const centerX=(a.x+b.x)/2,centerY=(a.y+b.y)/2;
 const distance=Math.max(12,Math.hypot(b.x-a.x,b.y-a.y));
 const difference=Math.abs(distance-pinch.distance);
 const delta=Math.atan2(b.y-a.y,b.x-a.x)-pinch.rotation;
 const twist=Math.atan2(Math.sin(delta),Math.cos(delta));
 const centroidMove=Math.hypot(centerX-pinch.x,centerY-pinch.y);
 // Each finger reports asynchronously; avoid a zoom misfire on the first drag.
 if(!pinch.mode){
  const bothMoved=movedA>3&&movedB>3;
  const similarity=bothMoved?(dxA*dxB+dyA*dyB)/(movedA*movedB):0;
  const dragging=bothMoved&&similarity>.72&&centroidMove>6&&difference<Math.max(18,centroidMove*.55);
  const spreading=bothMoved&&difference>Math.max(8,pinch.distance*.045)&&
   (similarity<.35||difference>centroidMove*1.15);
  const anchoredSpread=!bothMoved&&difference>Math.max(60,pinch.distance*.35)&&Math.abs(twist)<.10;
  const twisting=bothMoved&&Math.abs(twist)>.08&&difference<Math.max(20,pinch.distance*.15);
  if(dragging){pinch.mode='orbit';pinch.orbitKind='drag';}
  else if(spreading||anchoredSpread)pinch.mode='zoom';
  else if(twisting){pinch.mode='orbit';pinch.orbitKind='twist';}
  else return;
 }
 if(pinch.mode==='zoom'){
  // Lock the pinch: spreading fingers never affects yaw or pitch.
  const next=Math.max(.22,Math.min(5.2,pinch.z*distance/pinch.distance));
  if(Math.abs(cam.z-next)<1e-7)return;
  cam.z=next;
 }else if(pinch.orbitKind==='twist'){
  cam.angle=pinch.angle+twist;
 }else{
  // 0.0085 rad/px: 42% faster left-right rotation, without twist noise.
  cam.angle=pinch.angle-(centerX-pinch.x)*.0085;
  cam.elevation=clampCameraElevation(pinch.elevation+(centerY-pinch.y)*.004);
 }
 renderer3d.updateCamera(cam);
}
const ignoredTouchPointers=new Set(),doubleTapDelay=320,doubleTapRadius=44;
function clearPendingTap(perform=false){if(!pendingTap)return;clearTimeout(pendingTap.timer);const action=pendingTap.action;pendingTap=null;lastTap=null;if(perform)action();}
function cancelInteraction(){clearPendingTap();for(const pointerId of pointers.keys())if(canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);pointers.clear();pinch=null;mouseOrbit=null;mouseChordHeld=false;mouseRightPending=false;drag=null;hover=null;selected=null;follow=null;selectTool('hand');$('inspector').classList.add('hidden');}
canvas.addEventListener('mousedown',e=>{
 if((e.buttons&3)===3&&beginMouseOrbit(e))return;
 if(e.button===2)e.preventDefault();
});
canvas.addEventListener('mouseup',e=>{
 if(mouseChordHeld){drag=null;mouseOrbit=null;if(!e.buttons){mouseChordHeld=false;mouseRightPending=false;}return;}
 if(e.button===2&&mouseRightPending){e.preventDefault();cancelInteraction();}
});
function demolitionBuildingAt(clientX,clientY){
 const picked=renderer3d?.pickBuilding?.(clientX,clientY);
 if(picked!=null&&state.buildings.has(picked))return picked;
 const p=world(clientX,clientY),x=Math.floor(p[0]),y=Math.floor(p[1]);
 if(!valid(x,y))return null;
 const buildingId=state.buildGrid[id(x,y)];
 return buildingId>=0&&state.buildings.has(buildingId)?buildingId:null;
}
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'&&(e.buttons&3)===3&&beginMouseOrbit(e))return;
 if(e.button===2){e.preventDefault();mouseRightPending=true;canvas.setPointerCapture(e.pointerId);return;}
 if(e.pointerType!=='touch'&&mouseChordHeld)return;
 if(e.pointerType==='touch'&&pendingTap&&pointers.size===0){
  const doubleTap=lastTap&&Date.now()-lastTap.at<=doubleTapDelay&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<=doubleTapRadius;
  if(doubleTap){e.preventDefault();cancelInteraction();ignoredTouchPointers.add(e.pointerId);return;}
  clearPendingTap(true);
 }
 canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(e.pointerType==='touch'&&pointers.size>=2){if(!pinch||!pinch.ids.every(id=>pointers.has(id)))beginTouchOrbit();return;}
 const p=world(e.clientX,e.clientY),x=Math.floor(p[0]),y=Math.floor(p[1]);hover={x,y};
 const pan=tool==='hand'||tool==='tracking'||tool==='signalManage'||tool==='citizenDashboard'||e.button===1||e.shiftKey;
 const eraseBuildingId=tool==='erase'&&!pan?demolitionBuildingAt(e.clientX,e.clientY):null;
 const initialRoads=(tool==='eraseRoad'||tool==='erase')&&!pan&&eraseBuildingId==null?roadEraseSegmentCells(x,y,x,y):null;
 drag={sx:e.clientX,sy:e.clientY,lastX:e.clientX,lastY:e.clientY,x,y,pan,moved:false,
  cells:initialRoads!==null?initialRoads:(valid(x,y)?[owner(id(x,y))]:[]),
  eraseLastX:x,eraseLastY:y,eraseBuildingId,eraseSeen:new Set(initialRoads||[])};
});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerType!=='touch'){
  if((e.buttons&3)===3){if(!mouseOrbit){if(beginMouseOrbit(e))return;}else{e.preventDefault();moveMouseOrbit(e);return;}}
  if(mouseChordHeld){mouseOrbit=null;drag=null;if(!e.buttons){mouseChordHeld=false;mouseRightPending=false;pointers.delete(e.pointerId);}return;}
 }
 const p=world(e.clientX,e.clientY);hover={x:Math.floor(p[0]),y:Math.floor(p[1])};if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch){moveTouchOrbit();hover=null;return;}if(!drag)return;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>(e.pointerType==='touch'?10:5))drag.moved=true;if(drag.pan){if(renderer3d){const a=world(drag.lastX,drag.lastY),b=world(e.clientX,e.clientY);cam.x-=b[0]-a[0];cam.y-=b[1]-a[1];renderer3d.updateCamera(cam);}else{cam.x-=(e.clientX-drag.lastX)/(T*cam.z);cam.y-=(e.clientY-drag.lastY)/(T*cam.z*.78);}cam.x=Math.max(-20,Math.min(320,cam.x));cam.y=Math.max(-20,Math.min(320,cam.y));follow=null;}else if(ROADS[tool]&&valid(drag.x,drag.y)&&valid(hover.x,hover.y))drag.cells=lineCells(owner(id(drag.x,drag.y)),owner(id(hover.x,hover.y)));
 else if((tool==='eraseRoad'||tool==='erase')&&drag.eraseBuildingId==null)appendRoadEraseStroke(drag,hover.x,hover.y);
 drag.lastX=e.clientX;drag.lastY=e.clientY;});
function finishCanvasInteraction(d,x,y,activeTool){
 if(tool!==activeTool)return;
 if(d.pan){if(!d.moved)inspectAt(x,y);return;}
 if(ROADS[tool])buildRoad(d.cells,tool);
 else if(tool==='eraseRoad'||tool==='erase'){
  // Building tap and road drag share a single destructive mode.
  if(d.eraseBuildingId!=null){if(!d.moved)demolishBuilding(state.buildings.get(d.eraseBuildingId),false,{x,y});return;}
  const p=world(x,y);appendRoadEraseStroke(d,Math.floor(p[0]),Math.floor(p[1]));
  demolishRoadStroke(d.cells,false,{x,y});
 }
 else if(tool.startsWith('tree:')||tool==='treeRow'||tool==='treeBrush'||tool==='eraseTree'){
  const p=world(x,y);let count=0;
  if(tool==='eraseTree'){toast(eraseLandscape(p[0],p[1])?'ลบต้นไม้แล้วค่ะ':'ไม่พบต้นไม้ที่ต้องลบค่ะ');return;}
  if(tool==='treeRow')count=plantLandscapeStroke(d,x,y,2.8);
  else if(tool==='treeBrush')count=plantLandscapeStroke(d,x,y,1.1);
  else count=plantLandscape(p[0],p[1],tool.slice(5))?1:0;
  toast(count?'ปลูกต้นไม้ '+count+' ต้นแล้วค่ะ':'พื้นที่นี้ปลูกต้นไม้ไม่ได้ค่ะ');return;
 }
 else if(CATALOG[tool]){const p=world(x,y),placement=assistedBuildingPlacement(tool,p[0],p[1]);if(placement.error){toast(placement.error);return;}if(movingBuildingId)moveBuilding(movingBuildingId,placement.x,placement.y,false,placement.rotation);else buildBuilding(tool,placement.x,placement.y,false,placement.rotation);}
 else{const p=world(x,y),ix=Math.floor(p[0]),iy=Math.floor(p[1]);if(!valid(ix,iy))return;if(tool==='eraseBuilding')demolishBuilding(state.buildings.get(state.buildGrid[id(ix,iy)]),false,{x,y});}
}
canvas.addEventListener('pointerup',e=>{
 if(e.pointerType!=='touch'&&mouseChordHeld){e.preventDefault();drag=null;mouseOrbit=null;if(!e.buttons){mouseChordHeld=false;mouseRightPending=false;pointers.delete(e.pointerId);}return;}
 if(e.pointerType!=='touch'&&e.button===2&&mouseRightPending){e.preventDefault();cancelInteraction();return;}
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
canvas.addEventListener('pointercancel',e=>{ignoredTouchPointers.delete(e.pointerId);pointers.delete(e.pointerId);drag=null;pinch=null;mouseOrbit=null;mouseChordHeld=false;mouseRightPending=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();const before=world(e.clientX,e.clientY);cam.z=Math.max(.22,Math.min(5.2,cam.z*(e.deltaY<0?1.12:.89)));if(renderer3d)renderer3d.updateCamera(cam);const after=world(e.clientX,e.clientY);cam.x+=before[0]-after[0];cam.y+=before[1]-after[1];},{passive:false});
// Close nonmodal city panels when the user touches anywhere else.
// Do not consume the pointer event: map and toolbar remain immediately usable.
// Main dialogs and the login gate handle their own backdrops instead.
document.addEventListener?.('pointerdown',event=>{
 if($('dialog')?.open||$('memberGate')?.open||event.target?.closest?.('#buildingQuickActions'))return;
 const daily=document.getElementById('missionDailyAuto');
 if(daily&&!daily.contains?.(event.target))missionAutoClose(true);
 for(const [id,close] of [['inspector','closeInspector'],['citizensDashboard','closeCitizensDashboard'],['touristsDashboard','closeTouristsDashboard']]){
  const panel=$(id);
  if(panel&&!panel.classList.contains('hidden')&&!panel.contains?.(event.target))$(close)?.onclick?.();
 }
},true);
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
 if(a==='signal-ai-buy'){if(selected?.kind==='road'&&selected.id===v)openAISignalUpgrade(v);return;}
 if(a.startsWith('signal-')){if(selected?.kind!=='road'||selected.id!==v)return;if(a==='signal-save'){const rawEW=String($('signalEW').value).trim(),rawNS=String($('signalNS').value).trim(),eastWest=Number(rawEW),northSouth=Number(rawNS);if(!rawEW||!rawNS||!editSignal(v,{eastWest,northSouth})){toast('ตั้งเวลาไฟเขียวต่อทิศ 5–240 นาที (จำนวนเต็ม) ค่ะ');return;}toast('บันทึกเวลาไฟแยกนี้แล้วค่ะ');}else{const key=a==='signal-manual'?'manual':a==='signal-switch'?'switch':a==='signal-auto'?'auto':'';if(!controlSignal(v,key))return;toast(key==='manual'?'เปิดโหมดควบคุมไฟเองแล้วค่ะ':key==='switch'?'สลับไฟแล้ว · รอแดงทุกทิศ '+SIGNAL_CLEAR_MINUTES+' นาที':'กลับสู่ไฟอัตโนมัติแล้วค่ะ');}renderInspector(true);return;}
 if(a==='incident-resolve'){openTrafficIncident(v);return;}if(a==='tow'){if(towVehicle(v)){selected=null;$('inspector').classList.add('hidden');toast('ลากรถออกแล้ว · ยกเลิกเที่ยวเดินทาง');updateUI();}}if(a==='reroute'){const car=state.vehicles.get(v),ok=car?.phase==='stuck'?recoverVehicle(car,true):car?checkDepartureRoute(car):false;toast(ok?'พบเส้นทางแล้ว จะออกเดินทางเมื่อถนนว่าง':'ยังไม่มีเส้นทางที่ไปต่อได้ค่ะ');renderInspector();}if(a==='citizen'){selected={kind:'citizen',id:v};renderInspector();}if(a==='tourist-dashboard'){category='tourists';selectTool('touristDashboard');return;}if(a==='follow'){follow=follow===v?null:v;renderInspector();}if(a==='move-building'){beginMoveBuilding(v);return;}if(a==='demolish')demolishBuilding(state.buildings.get(v));if(a==='heat')toggleTrafficHeat();};

function showPlayerManual(){
 const esc=escapeSaveText;
 const table=(headers,rows)=>'<div class="manual-table-wrap" tabindex="0" role="region" aria-label="'+esc(headers[0])+'"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(String(x))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const exactMoney=n=>'฿'+Number(n).toLocaleString('th-TH',{maximumFractionDigits:2});
 const roads=table(['ถนน','เลนรวม','สร้าง / ช่อง','ดูแล / วัน / ช่อง'],Object.values(ROADS).map(t=>[t.name,t.lanes,exactMoney(t.cost),exactMoney(t.maint)]));
 const kinds=['home','office','factory','shop','restaurant','mall','park','pub','casino','hotel'];
 const catalog=kinds.map(kind=>'<h3>'+esc(KINDS[kind].name)+'</h3>'+table(['อาคาร','ราคา','ดูแล / วัน','พัก','งาน','บริการ','เตียง','จอด'],Object.values(CATALOG).filter(t=>t.kind===kind&&(kind!=='home'||['home_starter','home_large','home_dual','home_grand'].includes(t.key))).sort((a,b)=>(a.starterTier?0:1)-(b.starterTier?0:1)||a.cost-b.cost).map(t=>[t.name,money(t.cost),money(t.maint),t.residents||'—',t.jobs||'—',t.service||'—',t.beds||'—',t.parkingCapacity]))).join('');
 const clockText=n=>String(Math.floor((n%1440)/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 const hours=table(['บริการ','เปิด–ปิด','ใช้บริการประมาณ'],Object.entries(SERVICE_HOURS).map(([k,h])=>[KINDS[k].name,k==='casino'?'24 ชั่วโมง':clockText(h[0])+'–'+clockText(h[1])+(h[1]>1440?' วันถัดไป':h[1]===1440?' (เที่ยงคืน)':''),SERVICE_STAY[k].join('–')+' นาทีเกม']));
 const sign=n=>n>0?'+'+n:String(n);
 const happiness=table(['กิจกรรม','ตรงเวลา','สำเร็จแต่สาย','ไปไม่ทัน','ออกไม่ได้','ยกเลิก'],[['work','ไปทำงาน'],['leisure','ใช้บริการ'],['home','กลับบ้าน']].map(([k,n])=>[n,...['ontime','late','missed','unavailable','cancelled'].map(x=>sign(JOURNEY_RULES[k][x]))]));
 const replacements={'{{ROADS}}':roads,'{{CATALOG}}':catalog,'{{HOURS}}':hours,'{{HAPPINESS}}':happiness};
 const sections=[["start","เริ่มเล่นและเป้าหมายของเมือง","\n<p>SMCITY เป็นเกมสร้างเมืองและดูแลการเดินทางของผู้คน หน้าที่ของคุณคือทำให้คนมีบ้าน มีงาน ไปถึงที่หมาย และใช้บริการได้ทันเวลา เมืองที่มีคนมากแต่รถติด งานไม่พอ หรือบริการเต็ม อาจมีความสุขและรายรับลดลงได้</p>\n<h3>เมืองใหม่ให้อะไรมาบ้าง</h3><p>เริ่มเวลา 06:00 น. พร้อมเงิน 500,000 บาท บ้านเริ่มต้น 3 หลัง หลังละ 6 คน รวมประชาชน 18 คน ถนนในหมู่บ้าน และอาคารเริ่มต้นสำหรับงาน ร้านค้า ร้านอาหาร ห้าง สวน โรงแรม ผับ และคาสิโน ชุดเริ่มต้นนี้ไม่หักจากเงิน 500,000 บาทที่ได้รับ</p>\n<p>เลือกแผนที่ได้ระหว่างภูเก็ต กรุงเทพฯ เชียงใหม่ และโคราช อ่านชื่อเมืองก่อนยืนยันเริ่มใหม่ หากมีเมืองที่ต้องการเก็บ ให้บันทึกเมืองนั้นก่อน</p>\n<h3>ลำดับที่แนะนำสำหรับวันแรก</h3><ol><li>กดหยุดเวลา แล้วสำรวจหมู่บ้านที่เกมให้มา ไม่ต้องสร้างทุกอย่างซ้ำ</li><li>เปิด “ประชาชน” ดูคนไม่มีงานและคนที่มีปัญหา จากนั้นดูแผง “จุ / ใช้ / ขาด”</li><li>เปิดเวลา 1× ดูรถออกจากบ้าน ไปทำงาน และเข้าร้านจริง</li><li>เมื่อมีปัญหา ให้แตะคนหรือรถเพื่ออ่านเหตุผลก่อนเลือกสร้างเพิ่ม</li><li>หากต้องขยาย ให้เพิ่มบ้านทีละหลัง พร้อมตรวจงาน บริการ และทางเข้าออก</li><li>อ่านรายงานเมื่อจบวัน แล้วบันทึกเมืองก่อนออกจากเกม</li></ol>\n<p>จำนวนประชากรไม่ใช่คะแนนคุณภาพเมืองเพียงอย่างเดียว การเพิ่มบ้านรวดเร็วทำให้คนและการเดินทางเพิ่มตามไปด้วย คู่มือนี้อธิบายระบบที่เล่นได้ในปัจจุบัน เกมรุ่นนี้ยังไม่มีระบบเลเวล 1–100 และรางวัลเลเวลให้รับ</p>"],["controls","ปุ่มควบคุม เมาส์ และหน้าจอสัมผัส","\n<h3>มองและสำรวจเมือง</h3><ul><li>ในโหมดสำรวจ ลากแผนที่เพื่อเลื่อนมุมมอง ใช้ล้อเมาส์ซูมเข้าออก</li><li>บนหน้าจอสัมผัส ใช้สองนิ้วซูมและเลื่อนแผนที่ ระวังใช้หนึ่งนิ้วในโหมดสร้างเพราะอาจเป็นการวางสิ่งก่อสร้าง</li><li>ใช้ลูกศรจอยกล้องเพื่อหมุนซ้าย–ขวาและปรับมุมสูง–ต่ำ ปุ่มรูปบ้านที่จอยคืนมุมกล้อง</li><li>แตะอาคาร รถ หรือป้ายเพื่อดูรายละเอียด ปิดด้วย × หรือแตะพื้นที่นอกแผง</li><li>ขณะเลือกเครื่องมือ กด Esc หรือคลิกขวาเพื่อยกเลิกและกลับสำรวจ บนจอสัมผัสแตะสองครั้งเพื่อยกเลิกการทำงาน</li><li>ปุ่ม “หุบเครื่องมือ” เพิ่มพื้นที่ดูเมือง กดอีกครั้งเพื่อเปิดเครื่องมือกลับมา</li></ul>\n<h3>ปุ่มลัดคีย์บอร์ด</h3><table><thead><tr><th>ปุ่ม</th><th>การใช้งาน</th></tr></thead><tbody><tr><td>Space</td><td>หยุดเวลา / เล่นต่อ</td></tr><tr><td>1, 2, 5</td><td>เลือกความเร็ว 1×, 2×, 5×</td></tr><tr><td>B</td><td>เลือกสร้างถนนเล็ก</td></tr><tr><td>H</td><td>เปิด / ปิดมุมมองรถติด</td></tr><tr><td>Esc หรือคลิกขวา</td><td>ยกเลิกเครื่องมือหรือการเลือก</td></tr><tr><td>Ctrl+S / Command+S</td><td>เปิดเซป/โหลด</td></tr><tr><td>Shift พร้อมลาก หรือปุ่มกลางเมาส์พร้อมลาก</td><td>เลื่อนแผนที่ขณะเลือกเครื่องมือ</td></tr></tbody></table>\n<p>ปุ่มลัดส่วนใหญ่ไม่ทำงานขณะเปิดหน้าต่างเมนูหรือกำลังพิมพ์ เพื่อไม่ให้การกรอกข้อความไปสั่งเมืองโดยไม่ตั้งใจ</p>\n<h3>การแสดงผล</h3><p>“ปิดป้าย” ซ่อนชื่อและตัวเลขอาคารบนแผนที่ กด “เปิดป้าย” เพื่อแสดงอีกครั้ง ส่วนปุ่มวงกลมครึ่งสีสลับธีมสว่างกับธีมดำ การซ่อนป้ายไม่ใช่การลบอาคาร และไม่ได้ยกเลิกปัญหาเส้นทางที่เกิดอยู่</p>"],["time","เวลา ความเร็ว และการข้ามวัน","\n<p>เวลาและวันที่บนแถบควบคุมเป็นเวลาในเกม อาคารเปิดปิดตามเวลานี้ ประชาชนมีวันทำงาน วันหยุด และกิจกรรมต่างกัน ไม่ได้ออกจากบ้านพร้อมกันทุกคน</p>\n<ul><li>ใช้ 1× เมื่อต้องการดูว่ารถติดตรงไหน หรือกำลังแก้ทางเข้าอาคาร</li><li>ใช้ 2×, 5×, 10× หรือ 20× เมื่อต้องการเดินเวลาต่อเร็วขึ้น หากเมืองหนาแน่นให้ลดความเร็วลง</li><li>กดหยุดเวลาก่อนวางผัง รื้อถนน หรือปรับไฟจราจรหลายจุด แล้วเปิดเวลาเพื่อตรวจผล</li><li>รายได้ประจำและค่าดูแลสรุปเมื่อเปลี่ยนวัน ไม่ใช่เงินที่จะเพิ่มทันทีทุกครั้งที่สร้างบ้าน</li></ul>\n<h3>ข้ามไปเช้าวันใหม่ต่างจากเร่งเวลา</h3><p>ปุ่ม “ข้ามวัน” มีหน้าต่างยืนยันและพาไป 06:00 น. ของวันถัดไป โดยประมาณผลการเดินทางระหว่างช่วงที่ข้าม ไม่ได้แสดงรถวิ่งครบทุกเที่ยวเหมือนปล่อยเวลาเดินตามปกติ นักท่องเที่ยวของช่วงเดิมถูกเคลียร์ และประชาชนเริ่มกิจวัตรวันใหม่จากบ้าน</p>\n<p>ใช้เพื่อเดินหน้าการเล่นอย่างรวดเร็วได้ แต่หากต้องการดูว่าถนนหรือไฟที่ปรับดีขึ้นจริงหรือไม่ ควรปล่อยให้รถวิ่งผ่านช่วงเวลาเดิมแทนการข้ามวัน</p>\n<p>เมื่อเปิดหน้าต่างคู่มือหรือเมนู เกมพักการเดินเวลาไว้ระหว่างที่หน้าต่างเปิดอยู่ เมื่อปิดจะกลับไปเดินตามความเร็วเดิม หากต้องการให้ยังหยุดต่อหลังอ่าน ให้กดหยุดเวลาก่อนเปิดคู่มือ</p>"],["dashboard","อ่านหน้าจอเมืองและตัวเลข จุ / ใช้ / ขาด","\n<h3>ตัวเลขภาพรวม</h3><ul><li><b>งบประมาณ:</b> เงินที่เมืองมีตอนนี้ แตะเพื่อดูรายละเอียดรายรับและค่าดูแล</li><li><b>ประชาชน:</b> คนที่ย้ายเข้าถึงบ้านแล้ว ไม่ใช่ความจุบ้านรวม และไม่รวมคนที่กำลังเดินทางย้ายเข้า</li><li><b>นักท่องเที่ยว:</b> ผู้ที่เข้าเมืองแล้ว แยกจากชาวเมืองถาวร</li><li><b>ความสุข:</b> ค่าเฉลี่ยของประชาชน ไม่ได้แปลว่าทุกคนมีความสุขเท่าค่าเฉลี่ย</li><li><b>การจราจร:</b> ภาพรวมความคล่องตัวจากรถและสถานะการรอในขณะนั้น ค่าต่ำอาจเกี่ยวกับรถรอเข้าหรือออกลานจอดด้วย ต้องดูจุดจริงประกอบ</li></ul>\n<h3>จุ / ใช้ / ขาด อ่านอย่างไร</h3><p><b>จุ</b> คือความจุที่มี <b>ใช้</b> คือคนที่กำลังใช้หรือกำลังเดินทางไปใช้ตามประเภทนั้น และ <b>ขาด</b> คือความต้องการที่ยังรองรับไม่ได้ ค่าขาดที่ติดลบ เช่น −3 หมายถึงยังขาดสำหรับ 3 คน ไม่ใช่มีของเหลือ 3 หน่วย</p>\n<p>ตัวอย่าง ร้านอาหารมีความจุ 10 แต่กำลังใช้รวมกำลังไป 10 และขาด 3 แปลว่าควรตรวจผู้รอบริการอีก 3 คน หากร้านยังมีที่ว่างแต่คนไปไม่ได้ ให้ตรวจเส้นทาง เวลาเปิด และการเดินทางก่อนสร้างร้านซ้ำ</p>\n<p>บ้านแสดงความจุที่พัก ส่วนงานแสดงตำแหน่งงาน โรงแรมแสดงเตียงและการจอง ไม่ควรเอาตัวเลขแต่ละแถวมาบวกเป็นประชากรทั้งเมือง เพราะคนเดียวอาจใช้บ้าน งาน และร้านคนละช่วงเวลา</p>\n<h3>ที่ปรึกษาเมือง</h3><p>อ่าน “สิ่งที่ไปได้ดี” “เรื่องที่ควรดูแล” และ “ทำอะไรก่อนดี” เป็นตัวช่วยเลือกปัญหาถัดไป หากมีปุ่มเปิดหมวดสร้างหรือดูรายงาน กดเพื่อไปยังส่วนที่เกี่ยวข้อง แล้วตรวจคนหรือรถที่มีปัญหาประกอบ</p>"],["roads","สร้างถนนและวางผังให้เดินทางได้","\n<ol><li>เลือกหมวดถนนและขนาดที่ต้องการ</li><li>ลากจากถนนเดิมไปยังปลายทาง เกมวางเป็นแนวตรงตามทิศที่ลาก</li><li>ตรวจภาพตัวอย่าง ความยาว จำนวนเลน และราคาก่อนยืนยัน</li><li>เปิดเวลา แล้วลองดูรถเดินทางทั้งขาไปและขากลับ</li></ol>\n{{ROADS}}\n<p>ราคาถนนและค่าดูแลคิดต่อช่อง ถนนหลักเริ่มต้นไม่เสียค่าดูแลและรื้อไม่ได้ ถนนที่สร้างเองมีค่าดูแลทุกวัน การลากถนนขนาดใหญ่ทับถนนที่เล็กกว่าจะคิดส่วนต่างราคาตามช่องที่ปรับ ไม่ใช่การลดขนาดถนน</p>\n<h3>กฎที่มีผลกับผังเมือง</h3><ul><li>รถขับชิดซ้ายและใช้เส้นทางตามช่องเดินรถ ทางเข้าและทางออกของอาคารจึงสำคัญ</li><li>รถไม่กลับรถที่ทางตัน อย่าคิดว่าทำถนนไปถึงอาคารแล้วรถจะย้อนกลับได้เสมอ</li><li>อาคารฝั่งตรงข้ามต้องมีเส้นทางวนถึงได้ทั้งขาไปและกลับ แนะนำให้เชื่อมถนนเป็นวงที่มีทางออกชัดเจน</li><li>ถนนใหญ่เพิ่มเลน แต่ไม่ได้ทำให้คอขวดที่ประตูอาคารหรือทางแยกหายไปเอง</li><li>อย่าวางแยกถี่หรือรวบทุกอาคารให้เข้าออกตรงแยกเดียว หากรถต่อคิวข้ามแยก ให้กระจายทางเข้าและทางเลือกเดินทาง</li><li>ถ้าวางไม่ได้ อ่านข้อความแจ้งก่อน อาจทับพื้นที่อาคาร ซ้อนขอบถนน หรือเชื่อมไม่ตรงกลางแนวถนนเดิม</li></ul>\n<p>แนวทางทดลอง: แยกถนนสำหรับผ่านเมืองออกจากถนนเข้าบ้านและร้าน แล้วค่อยเพิ่มถนนเชื่อมเมื่อเห็นว่ารถต้องอ้อมไกล ไม่จำเป็นต้องอัปเป็นถนนใหญ่ทั้งเมืองตั้งแต่ต้น</p>"],["build","สร้างอาคาร เลือกขนาด และอ่านความจุ","\n<ol><li>เลือกหมวดบ้าน งาน ร้านค้า/อาหาร สันทนาการ โรงแรม หรือคาสิโน</li><li>เลือกอาคารโดยเทียบค่าก่อสร้าง ค่าดูแล ความจุ และจำนวนงาน</li><li>แตะพื้นที่ติดถนนที่มีที่ว่างพอสำหรับอาคารพร้อมลานจอด</li><li>ตรวจตำแหน่งประตูและรายการในหน้าต่างยืนยัน แล้วกดสร้าง</li><li>เปิดเวลา ดูว่าคนเดินทางเข้าใช้จริงได้หรือไม่</li></ol>\n<p>ลานจอดเป็นส่วนหนึ่งของอาคาร ไม่ใช่พื้นที่ที่นำอาคารอื่นไปวางทับได้ เกมจัดทิศทางอาคารจากถนนที่เข้าถึงได้ หากประตูหันไปด้านที่ไม่ต้องการ ให้เปลี่ยนตำแหน่งหรือผังถนนแล้วตรวจตัวอย่างใหม่</p>\n<p>ความจุที่พัก ตำแหน่งงาน ความจุบริการ เตียงโรงแรม และที่จอดรถเป็นคนละค่า เช่น ร้านมีตำแหน่งงานและรับลูกค้าได้ด้วย แต่ไม่ได้เป็นที่พักถาวรของลูกค้า โรงแรมก็ไม่ได้เพิ่มที่อยู่อาศัยให้ประชาชน</p>\n<p>อาคารขนาดใหญ่ไม่ได้คุ้มกว่าเสมอ ถ้าคนใช้ยังน้อย คุณยังต้องจ่ายค่าดูแล เลือกขนาดให้สอดคล้องกับความต้องการและสภาพถนน</p>"],["catalog","ตารางอาคารทั้งหมดที่สร้างได้","\n<p>ใช้ตารางนี้เทียบราคาต่อหลังและค่าดูแลต่อวัน ช่อง “พัก” คือประชาชนอยู่ถาวร “งาน” คือตำแหน่งพนักงาน “บริการ” คือผู้ใช้บริการพร้อมกัน “เตียง” สำหรับนักท่องเที่ยว และ “จอด” คือจำนวนที่จอดรถ ตัวเลขความจุไม่ได้หมายความว่าจะมีผู้ใช้เต็มทันที</p>\n<p>บ้านที่เพิ่มคนครั้งละ 6 คนคือแบบที่เกมแสดงชื่อว่า <b>บ้านเริ่มต้น</b> ในเมนู ส่วนบ้านชื่อ “บ้านเล็ก” เป็นอีกแบบหนึ่ง ตรวจชื่อกับความจุก่อนซื้อ ตารางนี้แสดงเฉพาะแบบที่เลือกสร้างได้ ไม่รวมบ้านรุ่นเก่าที่อาจยังพบในเซฟเดิม</p>\n{{CATALOG}}"],["residents","ประชากร การย้ายเข้า งาน และการย้ายออก","\n<h3>ทำอย่างไรให้คนย้ายเข้า</h3><p>ต้องมีบ้านว่าง ถนนเข้าถึง และความสุขเมืองอย่างน้อย 70% ผู้ย้ายเข้าจะเดินทางจากประตูเมืองไปบ้าน ก่อนถึงบ้านยังไม่นับเป็นประชากร แต่ที่พักอาจถูกจองไว้แล้ว จึงไม่ควรสร้างซ้ำเพียงเพราะตัวเลขประชากรยังไม่เพิ่มทันที</p>\n<p>บ้านเริ่มต้นหนึ่งหลังรองรับ 6 คน การเพิ่มหลายหลังติดกันทำให้เกิดการย้ายเข้าและความต้องการงาน/บริการตามมา ควรเพิ่มทีละส่วนแล้วดูผลของเมืองเดิมก่อน</p>\n<h3>งานไม่ได้มีเฉพาะสำนักงานและโรงงาน</h3><p>ร้านค้า ร้านอาหาร ห้าง สวน ผับ คาสิโน และโรงแรมบางแบบมีตำแหน่งงานด้วย ดูจำนวนจากการ์ดหรือตารางอาคาร เกมจัดงานให้ประชาชนอัตโนมัติ แต่มีงานแล้วไม่ได้รับประกันว่าจะเดินทางถึงที่ทำงานได้</p>\n<p>คนบุคลิก “บ้านรวย” ไม่ต้องหางานแบบคนกลุ่มอื่น จึงไม่ควรตีความว่าทุกคนที่ไม่มีสถานที่ทำงานเป็นปัญหา ให้ใช้ตัวกรองคนไม่มีงานและคำอธิบายในหน้ารายบุคคล</p>\n<h3>ทำไมคนย้ายออก</h3><ul><li>คนที่ต้องทำงานแต่ไม่มีงานครบ 5 วันจะเตรียมย้ายออก</li><li>ความสุขรายบุคคลต่ำกว่า 25 ติดต่อกัน 3 วันทำให้เตรียมย้ายออก</li><li>รื้อบ้านทำให้คนที่อาศัยบ้านนั้นออกจากเมือง จึงต่างจากย้ายอาคารทั้งหลัง</li></ul>\n<p>อย่าดูค่าเฉลี่ยเมืองอย่างเดียว เมืองเฉลี่ย 80% ก็อาจมีบางคนความสุขวิกฤต เปิด “ประชาชน” แล้วกรองคนวิกฤตหรือมีปัญหาเพื่อแก้ตรงรายคน</p>"],["life","กิจวัตรของประชาชนและการใช้บริการ","\n<p>ประชาชนแต่ละคนมีบุคลิก ความชอบ และตารางชีวิตต่างกัน มีทั้งคนทำงานเช้า กะค่ำ สายกิน สายเที่ยว สายช็อป สายติดบ้าน และคนตารางไม่แน่นอน วันเดียวกันจึงมีทั้งรถไปทำงาน กลับบ้าน และออกไปใช้บริการหลายรอบ</p>\n<ul><li>บางคนออกไปกินระหว่างงานแล้วกลับที่ทำงานเดิม</li><li>บางคนแวะร้านหรือสวนหลังงาน บางคนกลับบ้านก่อนแล้วออกมาใหม่</li><li>งานกะค่ำและกิจกรรมผับอาจต่อเนื่องข้ามเที่ยงคืน</li><li>คนที่มาสายจะพยายามออกก่อนในวันต่อไป แต่การปรับเวลาไม่ได้แก้ถนนที่ไปไม่ได้</li><li>ถ้าร้านเต็ม ปิด หรือไปไม่ทัน คนอาจเลือกสถานที่อื่น เลื่อนกิจกรรม หรือกลับบ้าน</li></ul>\n<p>รถจอดอยู่บ้านไม่ได้แปลว่าเกมค้างเสมอไป ตรวจเวลานัด กิจกรรมถัดไป วันหยุด และเหตุผลการรอก่อน การบังคับให้ทุกคนออกถนนพร้อมกันไม่ใช่เป้าหมายของเมือง</p>\n<h3>เวลาเปิดบริการและระยะเวลาที่ใช้</h3>{{HOURS}}\n<p>เวลาทั้งหมดเป็นเวลาในเกม ช่วงใช้บริการเป็นระยะเวลาของกิจกรรมนั้น ไม่รวมเวลาขับรถไปกลับ การเปิดร้านอยู่ไม่ได้รับประกันว่าจะทันใช้บริการ ถ้าเวลาเหลือก่อนปิดน้อยเกินไป คนอาจเปลี่ยนแผน</p>"],["happiness","ความสุข ผลการเดินทาง และภาษี","\n<p>ความสุขเปลี่ยนตามการทำกิจกรรมสำเร็จและปัญหาที่เกิดจริง การสร้างสวนไว้เฉย ๆ ไม่ใช่ปุ่มเพิ่มความสุขทันที ประชาชนต้องเดินทางไปใช้บริการได้ด้วย</p>\n{{HAPPINESS}}\n<p>ตัวเลขในตารางเป็นแต้มของคนที่ทำกิจกรรมนั้น ไม่ใช่เปอร์เซ็นต์ที่จะบวกทั้งเมือง ผลจริงอาจน้อยกว่านี้เมื่อถึงเพดานความสุข และอาจถูกหักเพิ่มจากความเครียดรถติด การกลับบ้านเพิ่มความสุขได้อย่างจำกัด ไม่ใช่เพิ่มซ้ำไม่สิ้นสุดจากการกลับหลายรอบ</p>\n<p>การไม่มีงานมีผลเสียรายวัน และคนที่มีความสุขต่ำต่อเนื่องอาจย้ายออก เมื่อความสุขเมืองต่ำกว่า 70% คนใหม่หยุดย้ายเข้า ส่วนการรับนักท่องเที่ยวต้องมีความสุขอย่างน้อย 80%</p>\n<h3>วิธีแก้ความสุขลดอย่างมีลำดับ</h3><ol><li>เปิดประชาชน กรอง “วิกฤต” หรือ “มีปัญหา”</li><li>แตะคนหนึ่งคน อ่านผลเที่ยวล่าสุดและเหตุผล</li><li>ถ้าไม่มีงาน ให้เพิ่มงานที่เดินทางถึงได้ ถ้าไม่มีบริการ ให้เพิ่มชนิดที่ขาด</li><li>ถ้าไปไม่ทัน ให้ดูเส้นทาง เวลารอ และประตูอาคาร ไม่ใช่สร้างร้านเพิ่มอย่างเดียว</li><li>ปล่อยเวลาให้คนทำกิจกรรมรอบถัดไป แล้วดูว่าผลดีขึ้นหรือไม่</li></ol>\n<p>ภาษีต่อคนต่อวันในปัจจุบัน: กรณีปกติ 500 บาท มีประวัติไปทำงานสาย 400 บาท และพลาดงาน 250 บาท ผลไปทำงานจึงกระทบทั้งความสุขและรายรับ อย่าใช้จำนวนบ้านคูณภาษี เพราะบ้านว่างยังไม่มีคนเสียภาษี</p>"],["traffic","ตรวจรถติด เส้นทางขาด และลานจอด","\n<h3>เริ่มตรวจจากรถหนึ่งคัน</h3><ol><li>เปิดมุมมอง “รถติด” หรือแตะรถที่หยุดอยู่</li><li>อ่านว่ากำลังไปไหน มาจากไหน อยู่ในสถานะอะไร และเหตุผลที่หยุด</li><li>ใช้โหมดติดตามดูเส้นทางไปยังจุดหมาย</li><li>ตรวจทั้งถนนหน้ารถ ทางเข้าอาคาร และพื้นที่หลังแยก</li><li>แก้ทีละจุด แล้วดูรถกลุ่มเดิมผ่านได้หรือไม่</li></ol>\n<h3>แยกอาการก่อนแก้</h3><ul><li><b>รอไฟแดง:</b> ตรวจว่าทิศอื่นได้เขียวตามรอบหรือค้างอยู่ในโหมดควบคุมเอง</li><li><b>ไฟเขียวแต่ไม่ไป:</b> ทางออกแยกอาจเต็ม รถด้านหน้าอาจขวาง หรือประตูปลายทางรับรถไม่ทัน</li><li><b>ไม่มีเส้นทาง:</b> ตรวจถนนขาด ทิศทางการเดินรถ ทางตัน และการวนกลับฝั่งตรงข้าม</li><li><b>รอออกจากอาคาร:</b> ดูทางออกลานจอดและรถบนถนนหน้าอาคาร</li><li><b>รอใช้บริการ:</b> ดูความจุ เวลาเปิด และเวลาที่เหลือก่อนจบกิจกรรม</li></ul>\n<p>การจอดในลานและการรอขับบนถนนไม่ใช่อาการเดียวกัน ที่จอดว่างไม่ได้รับประกันว่ารถจะเข้าออกได้ทันที เพราะยังต้องผ่านประตูและถนนหน้าอาคาร</p>\n<p>หากต้องการย้ายอาคารหนีคอขวด ให้ใช้ปุ่มย้ายแทนรื้อแล้วสร้างใหม่ เพื่อรักษาคนและกิจกรรมของอาคารให้ได้มากที่สุด หลังย้ายควรเปิดเวลาตรวจเส้นทางใหม่</p>"],["signals","ตั้งไฟจราจรอัตโนมัติและควบคุมเอง","\n<p>เปิดปุ่ม “ไฟจราจร” เพื่อดูการตั้งค่ารวม หรือแตะทางแยกเพื่อแก้เฉพาะแยกนั้น ไฟรุ่นปัจจุบันปล่อย <b>ทีละทิศ โดยทุกเลนของทิศนั้นได้เขียวพร้อมกัน</b> ไม่ได้ปล่อยฝั่งตรงข้ามสวนกันพร้อมกัน</p>\n<h3>ตั้งค่าอัตโนมัติ</h3><ol><li>เลือกแยกที่รถค้างและดูว่ารถมาจากทิศใด</li><li>ปรับระยะเขียวของแนวนอนหรือแนวตั้งในหน่วยนาทีเกม</li><li>ดูรถให้ครบหนึ่งรอบไฟก่อนสรุปผล อย่าปรับหลายแยกพร้อมกันจนแยกสาเหตุไม่ได้</li></ol>\n<p>ตั้งเวลาเขียวได้ 5–240 นาทีเกม มีช่วงไฟเหลืองและแดงเคลียร์แยกคั่นแต่ละทิศ การเพิ่มเขียวด้านหนึ่งทำให้ทิศอื่นรอนานขึ้นด้วย จึงไม่ควรตั้งยาวสุดทุกแยก</p>\n<h3>ค่าเริ่มต้นกับทุกแยกต่างกัน</h3><ul><li>บันทึกค่าเริ่มต้น: ใช้เป็นค่าของแยกใหม่</li><li>ปรับทุกแยก: นำค่าที่ตั้งไปใช้กับแยกที่มีอยู่ด้วย</li><li>คืนค่าแนะนำ: คืนการตั้งค่าแนะนำและกลับไปใช้ไฟอัตโนมัติ</li></ul>\n<h3>ควบคุมเอง</h3><p>ใช้เมื่ออยากระบายรถจากทิศใดทิศหนึ่งชั่วคราว กดสลับไฟจากแผงของแยกเพื่อเปลี่ยนทิศที่ได้เขียว แล้วกลับเป็นอัตโนมัติเมื่อแก้จุดนั้นเสร็จ หากปล่อยค้างไว้ ทิศที่ไม่ได้รับเขียวอาจสะสมคิวยาว</p>\n<p>ไฟเขียวไม่บังคับให้รถทะลุรถคันหน้า ถ้าถนนหลังแยกเต็ม ต้องระบายคอขวดปลายทางหรือเพิ่มทางเลือก ไม่ใช่เพิ่มเวลาเขียวอย่างเดียว</p>"],["incidents","ช่วยเหลือเหตุจราจรและดูประวัติ","\n<p>เมื่อมีเหตุจราจร ให้แตะสัญลักษณ์เหตุหรือเปิดรายการที่เกี่ยวข้อง อ่านประเภทเหตุ ตำแหน่ง และรถที่เกี่ยวข้องก่อนกดช่วยเหลือ เกมแยกเหตุรถชนกับรถเสีย และมีข้อความอธิบายการช่วยเหลือในหน้าต่างเหตุ</p>\n<p>ช่วยเหลือรับเงินสนับสนุนครั้งละ 5,000 บาท สูงสุด 3 เหตุการณ์ต่อวันในเกม เมื่อครบสิทธิ์ยังช่วยเหลือได้ แต่ไม่ได้รับเงินเพิ่มในวันนั้น ตรวจข้อความสิทธิ์คงเหลือก่อนกด ไม่ควรมองการเกิดเหตุเป็นรายได้หลักของเมือง</p>\n<p>ไปที่ เมนูหลัก → Report → Log เหตุจราจร เพื่อดูประวัติการช่วยเหลือ รายการที่เห็นอาจขึ้นกับการเชื่อมต่อบัญชีและการบันทึกประวัติ</p>\n<p>ในรายงานเมืองอาจมีปุ่มจัดการรถที่ติดปัญหา อ่านผลของปุ่มก่อนใช้ โดยเฉพาะการลากรถออกซึ่งยกเลิกเที่ยวเดินทาง ไม่ได้ซ่อมเส้นทางให้เอง ควรแก้ถนนหรือทางเข้าออกต้นเหตุด้วย</p>"],["tourists","นักท่องเที่ยว โรงแรม และรายได้ท่องเที่ยว","\n<h3>เงื่อนไขรับนักท่องเที่ยว</h3><p>เมืองต้องมีความสุขอย่างน้อย 80% และมีความจุบริการเหลือหลังเผื่อประชาชน นักท่องเที่ยวรวมผู้รอเข้าไม่เกิน 65% ของประชากร โดยปัดลง และยังถูกจำกัดด้วยบริการอีกชั้นหนึ่ง</p>\n<p>ตัวอย่าง ประชาชน 60 คนมีเพดานจากประชากร 39 คน แต่ไม่ได้แปลว่าจะมีนักท่องเที่ยวเข้า 39 คนทันที ถ้าร้านและสวนรองรับได้ไม่พอ จำนวนที่รับได้จะต่ำกว่านั้น นักท่องเที่ยวใช้ถนนและบริการร่วมกับชาวเมือง</p>\n<h3>เส้นทางเที่ยว</h3><p>นักท่องเที่ยวเดินทางจากประตูเมืองไปทำกิจกรรมจริง ทริปปกติใช้ประมาณ 5–10 ชั่วโมงเกมหลังเข้าเมือง บางคนพักโรงแรม 1–2 คืนก่อนเดินทางกลับ ไม่จำเป็นต้องมีโรงแรมสำหรับนักท่องเที่ยวแบบไปเช้าเย็นกลับทุกคน</p>\n<p>โรงแรมเพิ่มเตียงพัก ไม่เพิ่มประชากรถาวร จำนวนจองห้องอาจรวมคนที่ยังเดินทางมาไม่ถึง เปิดแดชบอร์ดนักท่องเที่ยวเพื่อแยกผู้ใช้บริการ ผู้พัก ผู้เดินทาง ผู้รอเข้า และผู้จองห้อง</p>\n<h3>ค่าเข้าและส่วนลด</h3><ul><li>รับค่าเข้า 1,500 บาทเมื่อเข้าเมืองจริง</li><li>คนที่เที่ยวอยู่ต่อจะมีรอบเก็บใหม่เมื่อครบ 24 ชั่วโมง ไม่ใช่เก็บเพิ่มทุกครั้งที่ข้ามเที่ยงคืน</li><li>ขณะกำลังเดินทางออกจะไม่คิดรอบใหม่</li><li>ถ้ารถติดสะสมถึงเงื่อนไข 60 นาทีเกมจนพลาดบริการ อาจได้รับคืนส่วนต่าง 500 บาท ทำให้รอบนั้นเหลือ 1,000 บาท</li><li>ร้านเต็ม ร้านปิด หรือไม่มีเส้นทางเพียงอย่างเดียวไม่ได้แปลว่าจะคืนค่าเข้าเสมอไป</li></ul>\n<p>นักท่องเที่ยวกลับตามกำหนดเป็นเรื่องปกติ ต่างจากประชาชนย้ายออกเพราะความสุขต่ำหรือไม่มีงาน หากรายได้ท่องเที่ยวลด ให้ดูทั้งจำนวนเข้าใหม่ ส่วนลด และปัญหาบริการ</p>"],["money","งบประมาณ รายรับ ค่าดูแล และการขยายเมือง","\n<h3>เงินเข้าจากไหน</h3><ul><li>ภาษีประชาชน ซึ่งสัมพันธ์กับผลการไปทำงาน</li><li>รายได้ธุรกิจจากพนักงานที่มีอยู่ คิด 50 บาทต่อพนักงานต่อวัน</li><li>ค่าเข้านักท่องเที่ยวและรอบเก็บระหว่างพักต่อ</li><li>เงินสนับสนุนช่วยเหลือเหตุจราจรตามสิทธิ์รายวัน</li></ul>\n<h3>เงินออกจากไหน</h3><ul><li>ค่าก่อสร้างถนนและอาคาร จ่ายตอนสร้าง</li><li>ค่าดูแลอาคารและถนนที่สร้างเอง จ่ายเมื่อสรุปวัน</li><li>ส่วนลดคืนแก่นักท่องเที่ยวตามเงื่อนไข</li></ul>\n<p>รายรับสุทธิประจำวันในภาพรวมคือภาษีรวมรายได้ธุรกิจหักค่าดูแล ส่วนยอดเงินสดเปลี่ยนจริงยังรวมการสร้างเมือง การท่องเที่ยว และเงินรายการอื่น จึงอาจไม่เท่าตัวเลขประมาณการสุทธิที่เห็นระหว่างวัน</p>\n<h3>ถ้าเงินลด ให้ตรวจตามนี้</h3><ol><li>เปิดรายงานรายวัน แยกเงินก่อสร้างออกจากการขาดทุนประจำ</li><li>ดูว่าอาคารใหญ่เกินจำนวนคนใช้หรือไม่ เพราะค่าดูแลยังจ่ายแม้ใช้ไม่เต็ม</li><li>ดูคนไปทำงานสายหรือพลาดงาน ซึ่งลดภาษี</li><li>ดูนักท่องเที่ยวและการคืนส่วนลด</li><li>ชะลอการเพิ่มบ้านถ้างาน บริการ หรือถนนยังรองรับไม่ได้</li></ol>\n<p>การย้ายอาคารในรุ่นนี้ฟรี การรื้ออาคารไม่คิดค่ารื้อ แต่ไม่ได้คืนค่าก่อสร้างเดิม ถ้าแค่ตำแหน่งไม่ดี ให้ลองย้ายก่อนรื้อ</p>"],["move","ย้ายอาคาร รื้อถอน และตกแต่งต้นไม้","\n<h3>ย้ายอาคาร</h3><ol><li>แตะอาคารที่ต้องการ แล้วกด “ย้าย”</li><li>เลือกพื้นที่ใหม่ติดถนนและมีที่ว่างพอสำหรับอาคารพร้อมลานจอด</li><li>อ่านหน้าต่างยืนยันแล้วกดย้าย หรือกด “ยกเลิกย้ายอาคาร” เพื่อกลับ</li><li>เปิดเวลา ดูรถและผู้ใช้บริการปรับเส้นทางมายังตำแหน่งใหม่</li></ol>\n<p>การย้ายฟรีและคงผู้อยู่อาศัย พนักงาน ผู้ใช้บริการ และผู้จองเดิม หากตำแหน่งใหม่วางไม่ได้ อาคารเดิมยังอยู่ อย่ารื้อบ้านเพื่อย้าย เพราะการรื้อทำให้คนในบ้านออกจากเมือง</p>\n<h3>รื้อถอน</h3><p>ใช้ปุ่มรื้อที่อาคาร หรือเลือกโหมดรื้อถอนแล้วแตะอาคาร ส่วนถนนลากตามแนวที่ต้องการรื้อได้ ระบบแสดงยืนยันก่อนลบ ถนนหลักและช่องถนนที่มีรถจะถูกข้ามตามข้อจำกัดของการรื้อ</p>\n<p>รื้อสถานที่ทำงานทำให้พนักงานต้องหางานใหม่ และการเดินทางที่เกี่ยวข้องอาจถูกยกเลิก รื้อโรงแรมหรือบริการกระทบผู้จองและผู้ใช้ด้วย หลังรื้อให้ตรวจความต้องการเมืองและเส้นทางอีกครั้ง</p>\n<h3>ต้นไม้และภูมิทัศน์</h3><p>เลือกต้นไม้พุ่มกลม ปาล์ม ไม้ดอก สน ไม้พุ่ม หรือต้นไม้ใหญ่ แตะเพื่อปลูกทีละต้น หรือเลือกปลูกเป็นแนว/เป็นกลุ่มแล้วลาก ใช้ลบต้นไม้เพื่อลบเฉพาะต้นไม้โดยไม่รื้ออาคารและถนน การตกแต่งต้นไม้ในรุ่นนี้ฟรี</p>\n<p>ต้นไม้ตกแต่งไม่ใช่อาคารสวนที่รับผู้ใช้บริการ อย่าใช้จำนวนต้นไม้แทนความจุสวนเมื่อตัวเลขบริการสวนขาด</p>"],["troubleshoot","แก้ปัญหาที่พบบ่อยทีละขั้น","\n<h3>สร้างบ้านแล้วคนไม่เข้า</h3><p>ดูความสุขว่าถึง 70% หรือไม่ → ดูที่พักว่างและคนกำลังย้ายเข้า → ตรวจเส้นทางจากประตูเมือง → เปิดเวลาให้รถถึงบ้าน ถ้าความจุถูกจองแล้ว การเพิ่มบ้านอีกอาจเพิ่มภาระโดยยังไม่แก้ปัญหาเดิม</p>\n<h3>งานว่างแต่ยังมีคนไม่มีงาน</h3><p>ตรวจรายบุคคลว่าเป็นคนกลุ่มที่ต้องทำงานหรือไม่ กำลังย้ายออกหรือไม่ และอาคารมีพนักงานเต็มแล้วหรือยัง จากนั้นดูการเดินทางไปทำงาน งานกับเส้นทางเป็นคนละปัญหา</p>\n<h3>สร้างร้านแล้วความสุขไม่ขึ้น</h3><p>ดูว่าคนต้องการร้านประเภทนั้นจริงหรือไม่ → เวลาเปิดตรงกับกิจกรรมหรือไม่ → มีพื้นที่บริการและที่จอดหรือไม่ → รถไปถึงทันหรือไม่ แล้วรอผลกิจกรรม ไม่ใช่ดูเฉพาะว่าสร้างอาคารสำเร็จ</p>\n<h3>มีโรงแรมแต่นักท่องเที่ยวไม่มา</h3><p>ตรวจความสุข 80% → ความจุบริการที่เหลือ → เพดานตามประชากร → ถนนจากประตูเมือง โรงแรมอย่างเดียวไม่ได้สร้างความต้องการท่องเที่ยวครบทุกอย่าง</p>\n<h3>ไฟเขียวแต่รถติดทั้งแยก</h3><p>ตรวจช่องหลังแยกและประตูอาคารที่อยู่ถัดไป หากปลายทางระบายไม่ได้ การยืดไฟเขียวไม่ช่วย ให้แก้จุดปลายคิวก่อน</p>\n<h3>ประชากรลดทั้งที่ค่าเฉลี่ยความสุขสูง</h3><p>กรองคนวิกฤตและไม่มีงาน ดูประวัติรายคน รวมถึงตรวจว่าเพิ่งรื้อบ้านหรือไม่ ค่าเฉลี่ยสูงไม่ได้ป้องกันคนบางคนย้ายออก</p>\n<h3>เงินหายหลังสร้างหรือเปลี่ยนวัน</h3><p>เปิดรายวัน ตรวจค่าก่อสร้าง ค่าดูแล ภาษี และส่วนลดนักท่องเที่ยวก่อน อย่าเทียบยอดเงินสดกับรายรับประจำอย่างเดียว</p>\n<h3>เกมกระตุกเมื่อเมืองโต</h3><p>ลดความเร็วเป็น 1× หยุดเวลาก่อนแก้ผัง ปิดแผงที่ไม่ใช้ และลองซ่อนป้ายอาคาร ชะลอการเพิ่มบ้านกับนักท่องเที่ยวแล้วดูผล จำนวนคนที่เล่นลื่นขึ้นกับเครื่อง ผังเมือง และจำนวนรถ ไม่ได้มีตัวเลขประชากรที่รับประกันสำหรับทุกเครื่อง บันทึกก่อนรีเฟรชหน้าเว็บ</p>\n<h3>วางอาคารหรือถนนไม่ได้</h3><p>อ่านข้อความแจ้ง ตรวจพื้นที่ทั้งลานจอด ขอบถนน และสิ่งก่อสร้างเดิม เปลี่ยนตำแหน่งทีละน้อยแล้วดูตัวอย่าง อย่ากดสร้างซ้ำโดยยังไม่รู้ว่าติดข้อไหน</p>"],["routine","แนวทางดูแลเมืองหนึ่งวัน","\n<ol><li><b>ก่อนเปิดวัน:</b> ดูรายงานวันก่อน เลือกปัญหาหลักหนึ่งอย่าง เช่น คนไปทำงานสายหรือร้านอาหารเต็ม</li><li><b>ช่วงเช้า:</b> ดูรถออกจากบ้านและทางแยกไปที่ทำงาน ตรวจว่าคนมีงานแล้วไปถึงจริง</li><li><b>กลางวัน:</b> ดูร้านและบริการที่คนไปใช้ แก้ความจุเฉพาะชนิดที่ขาด</li><li><b>หลังเลิกงาน:</b> ดูเส้นทางกลับบ้านและกิจกรรมต่อเนื่อง ตรวจไม่ให้ทางกลับตัน</li><li><b>กลางคืน:</b> ดูกะค่ำ ผับ คาสิโน และผู้พักโรงแรม อย่าตีความว่ารถกลางคืนทุกคันเป็นรถผิดปกติ</li><li><b>เมื่อจบวัน:</b> เทียบความสำเร็จของเที่ยว ความสุข คนย้ายออก และเงินสุทธิ กับปัญหาที่เลือกแก้</li><li><b>ก่อนขยายหรือออกเกม:</b> บันทึกเมือง ตรวจผล แล้วค่อยเพิ่มบ้านหรือปรับถนนรอบถัดไป</li></ol>\n<p>การทดลองที่อ่านผลได้ง่ายคือเปลี่ยนทีละเรื่อง แล้วสังเกตช่วงเวลาใกล้เคียงกัน หากเพิ่มบ้าน เปลี่ยนไฟ ย้ายร้าน และรื้อถนนพร้อมกัน จะยากที่จะรู้ว่าอะไรทำให้เมืองดีขึ้นหรือแย่ลง</p>"]].map(([id,title,body])=>({id,title,body:body.replaceAll('<table>','<div class="manual-table-wrap" tabindex="0" role="region" aria-label="ปุ่มควบคุม"><table>').replaceAll('</table>','</table></div>').replace(/\{\{[A-Z]+\}\}/g,k=>replacements[k]||'')}));
 const css='<style>dialog:has(.game-manual){width:1000px!important;max-width:calc(100vw - 24px)!important;max-height:90dvh!important;overflow:auto!important;box-sizing:border-box}.game-manual{font-size:16px;line-height:1.85;overflow-wrap:anywhere;color:var(--ink);padding:4px 0 16px}.game-manual *{box-sizing:border-box}.game-manual h2{font-size:clamp(24px,4vw,34px);line-height:1.3;margin:8px 36px 12px 0}.game-manual h3{font-size:19px;line-height:1.5;margin:22px 0 8px}.game-manual p{margin:10px 0}.game-manual li{margin:8px 0}.game-manual ul,.game-manual ol{padding-left:24px}.game-manual .manual-intro{font-size:16px}.game-manual .manual-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0}.game-manual label{display:block;font-weight:700}.game-manual input{width:100%;min-height:46px;padding:10px 12px;font:inherit;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:var(--paper)}.game-manual button{font:inherit;line-height:1.5;min-height:44px;padding:8px 12px;cursor:pointer;white-space:normal}.game-manual .manual-toc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:12px 0 24px}.game-manual .manual-toc button{text-align:left;font-size:14px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit}.game-manual details{border:1px solid var(--line);border-radius:12px;margin:12px 0;padding:0 16px;scroll-margin-top:12px}.game-manual summary{cursor:pointer;font-size:18px;font-weight:700;padding:16px 0;line-height:1.5}.game-manual .manual-chapter-body{padding-bottom:16px}.game-manual .manual-table-wrap{max-width:100%;overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:8px}.game-manual table{border-collapse:collapse;min-width:100%;font-size:14px}.game-manual th,.game-manual td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top;white-space:nowrap}.game-manual th{font-weight:700}.game-manual tr:last-child td{border-bottom:0}.game-manual :focus-visible{outline:3px solid #d79824;outline-offset:3px}.game-manual [hidden]{display:none!important}.game-manual .manual-status{font-size:14px}.game-manual .manual-footer{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}@media(max-width:600px){.game-manual .manual-toc{grid-template-columns:1fr}.game-manual details{padding:0 12px}.game-manual{font-size:15px}.game-manual summary{font-size:17px}dialog:has(.game-manual){padding:18px!important;max-height:92dvh!important}}</style>';
 modal(css+'<article class="game-manual" id="playerManual">'+panelHeading('?','คู่มือเล่นเกม')+'<p class="manual-intro">เลือกหัวข้อหรือค้นหาคำที่ต้องการ</p><p><b>อ่านได้สบาย:</b> เมืองพักการเดินเวลาระหว่างเปิดคู่มือ เมื่อปิดจะกลับไปใช้ความเร็วเดิม</p><label for="manualSearch">ค้นหาในคู่มือ</label><input id="manualSearch" type="search" placeholder="เช่น คนไม่เข้าเมือง ไฟแดง เซฟ บ้าน 6 คน" autocomplete="off"><div class="manual-tools"><button type="button" id="manualExpand">เปิดทุกบท</button><button type="button" id="manualCollapse">ย่อทุกบท</button><button type="button" id="manualClear">ล้างการค้นหา</button><button type="button" id="helpDone" class="primary">กลับไปเล่น</button></div><p id="manualStatus" class="manual-status" role="status" aria-live="polite">'+sections.length+' บท · ตารางกว้างเลื่อนซ้าย–ขวาได้</p><nav class="manual-toc" aria-label="สารบัญคู่มือ">'+sections.map((s,i)=>'<button type="button" data-manual-target="'+s.id+'">'+(i+1)+'. '+esc(s.title)+'</button>').join('')+'</nav><p id="manualEmpty" hidden>ไม่พบหัวข้อที่ตรง ลองใช้คำสั้นลง เช่น “บ้าน” “งาน” “รถ” หรือ “เซฟ”</p>'+sections.map((s,i)=>'<details id="manual-'+s.id+'" data-manual-chapter="'+s.id+'"'+(i===0?' open':'')+'><summary>'+(i+1)+'. '+esc(s.title)+'</summary><div class="manual-chapter-body">'+s.body+'</div></details>').join('')+'<div class="manual-footer"><button type="button" id="manualTop">กลับสารบัญ</button><button type="button" id="manualMenu">เมนูหลัก</button><button type="button" id="manualClose" class="primary">กลับไปเล่น</button></div></article>');
 const root=$('playerManual'),chapters=Array.from(root.querySelectorAll('[data-manual-chapter]')),toc=Array.from(root.querySelectorAll('[data-manual-target]'));
 const normalize=s=>s.normalize('NFC').toLocaleLowerCase('th').replace(/\s+/g,' ').trim();
 const searchable=chapters.map(el=>normalize(el.textContent));
 const filter=()=>{
  const terms=normalize($('manualSearch').value).split(' ').filter(Boolean);let found=0;
  chapters.forEach((el,i)=>{const match=terms.every(t=>searchable[i].includes(t));el.hidden=!match;el.open=terms.length?match:i===0;if(toc[i])toc[i].hidden=!match;if(match)found++;});
  $('manualStatus').textContent=terms.length?'พบ '+found+' จาก '+sections.length+' บท':sections.length+' บท · ตารางกว้างเลื่อนซ้าย–ขวาได้';$('manualEmpty').hidden=found>0;
 };
 $('manualSearch').oninput=filter;
 $('manualClear').onclick=()=>{$('manualSearch').value='';filter();$('manualSearch').focus();};
 $('manualExpand').onclick=()=>chapters.forEach(el=>{if(!el.hidden)el.open=true;});
 $('manualCollapse').onclick=()=>chapters.forEach(el=>el.open=false);
 toc.forEach(button=>button.onclick=()=>{const chapter=$('manual-'+button.dataset.manualTarget);if(chapter){chapter.open=true;chapter.scrollIntoView({block:'start'});chapter.querySelector('summary')?.focus();}});
 $('manualTop').onclick=()=>{root.scrollIntoView({block:'start'});$('manualSearch').focus({preventScroll:true});};
 $('manualMenu').onclick=openMainMenu;
 $('helpDone').onclick=closeModal;$('manualClose').onclick=closeModal;
}
$('help').onclick=showPlayerManual;

function snapshot(){return JSON.stringify({format:2,vehicleTechUnit:'cars',vehicleTechLevels:state.vehicleTechLevels,morningPlanningDay:state.morningPlanningDay,parkingVersion:PARKING_VERSION,missionStats:state.missionStats,city:state.city,money:state.money,incidentRewards:state.incidentRewards,time:state.time,nextId:state.nextId,profileSeq:state.profileSeq,tourism:state.tourism,plantedTrees:state.plantedTrees,hiddenAutoTrees:state.hiddenAutoTrees,nextTouristAt:state.nextTouristAt,roads:[...state.roads].map(([i,r])=>[i,{...r,links:[...r.links]}]),buildings:[...state.buildings].map(([i,b])=>[i,{...b,residents:[...b.residents],workers:[...b.workers],visitors:[...b.visitors],parked:[...b.parked],guests:[...(b.guests||[])]}]),citizens:[...state.citizens].map(([i,c])=>[i,{...c,scheduled:[...c.scheduled],failKinds:[...c.failKinds]}]),vehicles:[...state.vehicles].map(([i,v])=>[i,{...v,pathSet:[...v.pathSet]}]),signals:[...state.signals],signalDefaults:state.signalDefaults,events:state.events,cam,news});}
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
 if(s.vehicleTechLevels!==undefined&&(!Array.isArray(s.vehicleTechLevels)||s.vehicleTechLevels.length!==4||s.vehicleTechLevels.some(g=>!g||VEHICLE_TECHS.some(t=>!Number.isSafeInteger(g[t.key])||g[t.key]<0||(s.vehicleTechUnit!=='cars'&&g[t.key]>25)))))throw Error('Invalid vehicle technology levels');
 if(s.hiddenAutoTrees!==undefined&&(!Array.isArray(s.hiddenAutoTrees)||s.hiddenAutoTrees.length>6000||s.hiddenAutoTrees.some(i=>!Number.isInteger(i)||i<0||i>=W*H)))throw Error('Invalid tree clearings');
 for(const key of ['roads','buildings','citizens','vehicles'])if(!Array.isArray(s[key])||s[key].some(e=>!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||!e[1])||new Set(s[key].map(e=>e[0])).size!==s[key].length)throw Error('Invalid '+key);
 for(const [i,r]of s.roads)if(i<0||i>=W*H||!ROADS[r.type]||!Array.isArray(r.links)||r.links.some(n=>!Number.isInteger(n)||n<0||n>=W*H))throw Error('Invalid road');
 if(s.signals!==undefined){if(!Array.isArray(s.signals)||s.signals.length>s.roads.length||new Set(s.signals.map(e=>e?.[0])).size!==s.signals.length)throw Error('Invalid signals');const roads=new Set(s.roads.map(e=>e[0]));for(const e of s.signals){if(!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||!roads.has(e[0]))throw Error('Invalid signal node');const c=e[1];if(!c||!Number.isInteger(c.eastWest)||c.eastWest<SIGNAL_MIN_GREEN||c.eastWest>SIGNAL_MAX_GREEN||!Number.isInteger(c.northSouth)||c.northSouth<SIGNAL_MIN_GREEN||c.northSouth>SIGNAL_MAX_GREEN||!['auto','manual','smart'].includes(c.mode)||![0,1].includes(c.axis)||!Number.isFinite(c.holdUntil)||(c.slot!==undefined&&(!Number.isInteger(c.slot)||c.slot<0||c.slot>15))||(c.phaseModel!==undefined&&c.phaseModel!=='approach')||
 (c.mode==='smart'&&(!['green','yellow','clear'].includes(c.smartPhase)||
 !Number.isInteger(c.smartSlot)||c.smartSlot< -1||c.smartSlot>3||
 !Number.isFinite(c.smartUntil)||!Number.isFinite(c.smartSince)||
 !Array.isArray(c.smartLast)||c.smartLast.length>4||
 c.smartLast.some(x=>!Number.isFinite(x)))))throw Error('Invalid signal setting');}}
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
 for(const b of state.buildings.values())if(b.key==='home_starter'&&!b.starterCompact){
  // Shrink 6x7 to 5x6 inside the old plot, holding the street edge fixed.
  const rotation=b.rotation||0;
  if(rotation===2||rotation===3)b.x+=1;
  if(rotation===0||rotation===3)b.y+=1;
  b.starterCompact=true;moved.add(b.id);
 }
 for(const b of state.buildings.values())if(b.key==='home_starter'&&!b.starterFrontRowV2){
  b.starterFrontRowV2=true;moved.add(b.id);
 }
 for(const b of state.buildings.values())if(b.key==='home_starter'&&!b.starterParkingV3){
  b.starterParkingV3=true;moved.add(b.id);
 }
 for(const b of state.buildings.values())if(b.key==='home_starter'&&!b.starterCottageV4){
  // 5x6 -> 4x5, entirely inside the previous plot; preserve its street edge.
  const rotation=b.rotation||0;
  if(rotation===2||rotation===3)b.x+=1;
  if(rotation===0||rotation===3)b.y+=1;
  b.starterCottageV4=true;moved.add(b.id);
 }
 for(const b of state.buildings.values())if(b.key==='home_starter'&&!b.starterCottage3x3){
  // 4x5 -> 3x3; retain street edge and remain inside the existing plot.
  const rotation=b.rotation||0;
  if(rotation===0)b.y+=2;
  if(rotation===2)b.x+=1;
  if(rotation===3){b.x+=2;b.y+=1;}
  b.starterCottage3x3=true;moved.add(b.id);
 }
 for(const b of state.buildings.values())if(b.key==='home_starter'&&!b.starterGroundV6){
  b.starterGroundV6=true;moved.add(b.id);
 }
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
   v.lotPath=null;v.lotDistance=0;v.lotReady=false;v.lotBuilding=null;v.parkingStage=false;v.heldPose=null;
   v.mergeCommitted=false;v.mergeExitActive=false;v.mergeEscapeId=null;
   v.parkingStage=false;v.parkingReplanAt=0;v.occKey=null;v.stopReason='';
   if(v.phase==='parking_in'){v.phase='driving';v.speed=0;}
   else if(v.phase==='parking_out'){v.phase='departing';v.speed=0;v.departureRouteVersion=-1;v.retryAt=0;}
  }
  if(moved.has(v.fromId)&&v.phase==='departing'){v.departureRouteVersion=-1;v.retryAt=0;}
 }
}
function migrateJourneyRules(){
 for(const c of state.citizens.values()){
  if(c.tourist||c.journeyRuleVersion===25)continue;
  c.journeyRuleVersion=25;c.late=false;c.pain=0;c.lowHappyDays=0;
  const plans=new Set([c.dailyPlan,c.lifeRun?.plan,...Object.values(c.lifePlans||{})]);
  for(const plan of plans){if(!plan||plan.version>=25)continue;
   const oldAdvance=ensureRoutine(c).advance;
   for(const step of plan.steps||[])if(step.kind==='work'&&!step.resume)step.deadline=Math.min(step.until,(step.deadline??step.at+65)+oldAdvance);
   const work=(plan.steps||[]).find(step=>step.kind==='work'&&!step.resume);if(work)plan.desiredArrival=work.deadline;
   plan.version=25;
  }
  const v=state.vehicles.get(c.vehicleId);if(v){v.late=false;v.startedAt=state.time;v.congestionMinutes=0;
   if(v.kind==='home')v.deadline=null;
   const step=v.life&&(c.lifeRun?.day===v.life.day&&c.lifeRun.token===v.life.token?c.lifeRun.plan:lifePlan(c,v.life.day))?.steps[v.life.index];if(step&&v.kind==='work'){v.deadline=v.life.day*1440+step.deadline;v.workEnd=v.life.day*1440+step.until;}
  }
 }
}
function loadGame(silent=false,slotId=null,rawOverride=null){const previous={state,cam,news};try{const slots=rawOverride===null?readSaveSlots():[],slot=slotId?slots.find(s=>s.id===slotId):slots[0],raw=rawOverride??slot?.data;if(!raw){if(!silent)toast('ยังไม่มีเมืองที่บันทึกไว้ค่ะ');return false;}const s=JSON.parse(raw);validateSave(s);reset(s.city);state.money=s.money;state.vehicleTechLevels=normalizedVehicleTechLevels(s.vehicleTechLevels,s.vehicleTechUnit,s.citizens);state.time=s.time;state.morningPlanningDay=s.morningPlanningDay;const savedRewards=s.incidentRewards||{};state.incidentRewards={day:Math.floor(s.time/1440),count:savedRewards.day===Math.floor(s.time/1440)&&Number.isFinite(savedRewards.count)?Math.max(0,Math.min(INCIDENT_REWARD_DAILY_LIMIT,Math.floor(savedRewards.count))):0};state.nextId=s.nextId;state.profileSeq=s.profileSeq??s.citizens.length;state.lastImmigration=s.time;state.lastPass=s.time;state.tourism=s.tourism;state.plantedTrees=s.plantedTrees||[];state.hiddenAutoTrees=s.hiddenAutoTrees||[];state.landscapeVersion=0;state.nextTouristAt=s.nextTouristAt||s.time+3;state.missionStats=restoreMissionStats(s.missionStats);missionAutoClose();state.roads=new Map(s.roads.map(([i,r])=>[i,{...r,links:new Set(r.links)}]));state.buildings=new Map(s.buildings.map(([i,b])=>[i,{...b,residents:new Set(b.residents),workers:new Set(b.workers),visitors:new Set(b.visitors),parked:new Set(b.parked),guests:new Set(b.guests||[])}]));state.citizens=new Map(s.citizens.map(([i,c])=>[i,{...c,scheduled:new Set(c.scheduled),failKinds:new Set(c.failKinds)}]));state.vehicles=new Map(s.vehicles.map(([i,v])=>[i,{...v,trafficModel:v.trafficModel??1,pathSet:new Set(v.pathSet)}]));state.signals=new Map(s.signals||[]);nextAISignalPoll=-Infinity;state.signalDefaults=s.signalDefaults||state.signalDefaults;state.events=s.events;eventHeapify();cam=s.cam||cam;news=s.news||[];migrateCompactHomes();migrateJourneyRules();migrateActivity251();rebuildFootprint();state.buildGrid.fill(-1);for(const b of state.buildings.values()){markBuildingPlot(b,b.id);b.access=accessFor(b);}// Previously saved grand homes share the exact same 11x13 footprint, so
 // relocate only internal geometry and reset in-flight lot manoeuvres.
 // Preserve citizens, parking reservations and every existing save.
 for(const b of state.buildings.values())if(b.key==='home_grand'&&!b.grandFrontageV3){
  b.grandFrontageV3=true;
  b.grandSignal=null;
  for(const v of state.vehicles.values())if(v.lotBuilding===b.id&&v.lotPath){
   grandSignalRelease(v);v.grandCrossing=null;v.lotPath=null;v.lotDistance=0;
   v.lotReady=false;v.lotBuilding=null;v.parkingStage=false;
   if(v.phase==='parking_in'){v.phase='driving';v.speed=0;v.parkingReplanAt=0;}
   else if(v.phase==='parking_out'){v.phase='departing';v.mergeCommitted=false;v.departureRouteVersion=-1;v.speed=0;}
  }
 }
 for(const b of state.buildings.values())if(b.key==='home_grand'&&!b.grandFrontLayout){
  b.grandFrontLayout=true;b.grandSignal=null;
  for(const v of state.vehicles.values())if(v.lotBuilding===b.id&&v.lotPath){
   grandSignalRelease(v);v.grandCrossing=null;v.lotPath=null;v.lotDistance=0;
   v.lotReady=false;v.parkingReplanAt=0;v.lotBuilding=null;
   if(v.phase==='parking_in'){v.phase='driving';v.speed=0;}
   else if(v.phase==='parking_out'){v.phase='departing';v.mergeCommitted=false;v.departureRouteVersion=-1;v.speed=0;}
  }
 }
 for(const v of state.vehicles.values())if(['driving','parking_out'].includes(v.phase)||v.phase==='parking_in'&&v.occKey)occupy(v,v.pos);for(const v of state.vehicles.values())if(v.phase==='driving')refreshMotionReservations(v,motionPlan(v),motionDistance(v));reconcile();
 // Existing saves still work: retain the current day's already-queued events,
 // then switch to dynamic routines when the next game day is scheduled.
 for(const c of state.citizens.values()){
  if(c.tourist)continue;
  if(!c.profile)c.profile=profile(c.id);
  ensureRoutine(c);
  if(!c.dailyPlan||!Number.isFinite(c.dailyPlan.day))c.dailyPlan=planForDay(c,Math.floor(state.time/1440));
 }
 syncCitizenVehicleTech();migrateTravelPlanning();state.speed=0;scanIncidents(true);updateUI();if(!silent)toast('โหลดเมืองพร้อมลานจอดแล้ว กด ▶ เพื่อเล่นต่อค่ะ');return true;}catch(e){state=previous.state;cam=previous.cam;news=previous.news;console.error('Load failed:',e);$('cityName').textContent=CITIES[state.city].name;$('citySub').textContent=CITIES[state.city].sub;$('mapLabel').innerHTML=CITIES[state.city].en+'<small>THAILAND · สร้างเมืองในแบบคุณ</small>';updateUI();if(!silent)toast(e.message?.includes('ลานจอดรุ่นเก่า')?'เมืองเก่าใช้กับลานจอดระบบใหม่ไม่ได้ กรุณาเริ่มเมืองใหม่ค่ะ':'โหลดเซฟนี้ไม่ได้ เมืองปัจจุบันและข้อมูลเซฟยังอยู่ค่ะ');return false;}}
// A developer can load a copy into the current session; no other user's save is changed.
window.SMGameLoadCreatorSave=(raw,name)=>{
 if(!window.SMGameCreatorCanOpen||!window.SMGameAccount?.user||typeof raw!=='string'||!raw)return false;
 const cleanName=escapeSaveText(String(name||'เมืองผู้เล่น').slice(0,80));
 confirmAction('โหลดสำเนาเซฟ “'+cleanName+'”',
  'เมืองปัจจุบันที่ยังไม่ได้บันทึกจะถูกแทนที่ด้วยสำเนาเซฟ แต่เซฟต้นฉบับของผู้เล่นจะไม่เปลี่ยนแปลง',
  ()=>{if(loadGame(false,null,raw))toast('โหลดสำเนาเซฟผู้เล่นสำเร็จค่ะ');});
 return true;
};
// Serialize only on a creator-triggered request; never send the full city in regular heartbeats.
window.SMGameCaptureLiveSnapshot=()=>snapshot();
window.SMGameLiveNotice=message=>toast(String(message||'สำเนาเมืองถูกส่งเพื่อวิเคราะห์ปัญหา'));
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
window.SMGameOnCloudSaved=()=>toast('บันทึกเกมออนไลน์แล้วค่ะ');
// After guest registration and the first cloud save, show the regular Save/Load panel.
// Share the same entry point with registered players to avoid duplicate menus.
window.SMGameOpenSaveDialog=()=>openCloudSaveDialog();
async function openCloudSaveDialog(){
 const api=window.SMGameAccount;
 if(!api?.user){if(api?.openPanel)api.openPanel();else if(api?.requestSaveLogin)api.requestSaveLogin(snapshot(),'');else toast('กรุณาเข้าสู่ระบบก่อนเซฟค่ะ');return;}
 const accountId=api.user.id;
 const revision=modal('<div class="save-workspace">'+panelHeading('▣','เซป/โหลด')+'<p class="panel-empty" role="status">กำลังอ่านเซฟของคุณ…</p><div class="actions"><button id="saveLoadingClose">กลับไปเล่น</button></div></div>');
 $('saveLoadingClose').onclick=closeModal;
 let slots;
 try{slots=await api.listSaves();if(dialogRevision!==revision||api.user?.id!==accountId)return;}
 catch(e){console.error('Online saves:',e);if(dialogRevision===revision){$('dialogContent').innerHTML='<div class="save-workspace">'+panelHeading('▣','เซป/โหลด')+'<p class="panel-empty" role="alert">อ่านรายการเซฟไม่สำเร็จ กรุณาลองอีกครั้งค่ะ</p><div class="actions"><button id="saveListRetry" class="primary">ลองอีกครั้ง</button><button id="saveListClose">กลับไปเล่น</button></div></div>';$('saveListRetry').onclick=openCloudSaveDialog;$('saveListClose').onclick=closeModal;}return;}
 const rows=slots.map((slot,i)=>{
  const when=Number.isFinite(slot.savedAt)?new Date(slot.savedAt).toLocaleString('th-TH'):'';
  return '<article class="save-slot-card"><div class="save-slot-heading"><span class="save-slot-icon" aria-hidden="true">▣</span><div><h3>'+escapeSaveText(slot.name)+'</h3><time>'+escapeSaveText(when)+'</time></div></div><div class="actions save-slot-actions"><button type="button" class="primary" id="onlineLoad'+i+'">โหลดเมือง</button><button type="button" id="onlineOverwrite'+i+'">เขียนทับ</button><button type="button" class="danger" id="onlineDelete'+i+'">ลบเซฟ</button></div></article>';
 }).join('');
 modal(`<div class="save-workspace">${panelHeading('▣','เซป/โหลด')}
  <section class="save-create-card"><label for="onlineSaveName">บันทึกเมืองปัจจุบัน</label>
  <input id="onlineSaveName" maxlength="80" autocomplete="off" value="${escapeSaveText(CITIES[state.city].name+' วันที่ '+(Math.floor(state.time/1440)+1))}">
  <p id="onlineSaveError" role="status" aria-live="polite"></p>
  <div class="actions"><button id="onlineCreate" class="primary">บันทึกเป็นเซฟใหม่</button></div></section>
  <div class="save-list-heading"><h3>เซฟของฉัน</h3><span>${fmt(slots.length)} รายการ</span></div>
  <div class="save-slot-list">${rows||'<p class="panel-empty">ยังไม่มีเซฟที่บันทึกไว้</p>'}</div>
  <div class="actions panel-footer"><button id="onlineClose">กลับไปเล่น</button></div></div>`);
 $('onlineClose').onclick=closeModal;
 $('onlineCreate').onclick=async()=>{
  const button=$('onlineCreate'),error=$('onlineSaveError'),name=$('onlineSaveName').value.trim().slice(0,80);
  if(!name){error.textContent='กรุณาตั้งชื่อเซฟค่ะ';return;}
  const revision=dialogRevision;button.disabled=true;error.textContent='กำลังบันทึกออนไลน์…';
  try{await api.save(name,'cloud-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),snapshot());toast('บันทึกเซฟออนไลน์แล้วค่ะ');if(dialogRevision===revision)await openCloudSaveDialog();}
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
    const revision=dialogRevision;try{await api.save(slot.name,slot.id,snapshot());toast('เขียนทับเซฟออนไลน์แล้วค่ะ');if(dialogRevision===revision)await openCloudSaveDialog();}
    catch(e){console.error('Cloud overwrite failed:',e);toast('เขียนทับเซฟออนไลน์ไม่สำเร็จค่ะ');}
   });
  };
  $('onlineDelete'+i).onclick=()=>{
   confirmAction('ลบเซฟ “'+escapeSaveText(slot.name)+'”','ลบเซฟนี้ออกจากบัญชีออนไลน์ถาวร และไม่สามารถกู้คืนจากเกมได้',async()=>{
    const revision=dialogRevision;try{await api.deleteSave(slot.id);toast('ลบเซฟออนไลน์แล้วค่ะ');if(dialogRevision===revision)await openCloudSaveDialog();}
    catch(e){console.error('Cloud delete failed:',e);toast('ลบเซฟไม่สำเร็จ กรุณาลองใหม่ค่ะ');}
   });
  };
 });
}
function openNewCityDialog(){
 modal(`<span class="eyebrow">NEW CITY</span><h2>เริ่มเมืองใหม่</h2>
  <p>เลือกเมืองที่ต้องการเริ่มเล่น เมืองปัจจุบันจะยังอยู่จนกว่าจะกดยืนยันค่ะ</p>
  <label for="citySelect">เลือกเมือง</label>
  <select id="citySelect">${Object.entries(CITIES).map(([k,c])=>`<option value="${k}" ${k===state.city?'selected':''}>${c.name}</option>`).join('')}</select>
  <div class="actions"><button id="newCity" class="primary">เริ่มเมืองใหม่</button><button id="newCityCancel">ยกเลิก</button></div>`);
 $('newCityCancel').onclick=closeModal;
 $('newCity').onclick=()=>{
  const key=$('citySelect').value;
  confirmAction('เริ่มเมืองใหม่','เมืองปัจจุบันที่ยังไม่ได้บันทึกจะหายไป เริ่มเมืองใหม่พร้อมหมู่บ้านเริ่มต้นและเงิน 500,000 บาท',()=>startNewCity(key));
 };
}
function openAccountDialog(){
 const api=window.SMGameAccount;
 if(!api?.user){api?.openSignIn?.();return;}
 modal(`<span class="eyebrow">MY ACCOUNT</span><h2>บัญชีผู้ใช้</h2>
 <p class="account-identity"><span class="account-avatar">◉</span><strong>${escapeSaveText(api.displayName||api.user.email||'ผู้เล่น')}</strong><small>เชื่อมต่อบัญชีแล้ว</small></p>
 <details class="account-password"><summary>เปลี่ยนรหัสผ่าน</summary>
 <label for="accountOldPassword">รหัสผ่านปัจจุบัน</label>
 <input id="accountOldPassword" type="password" autocomplete="current-password" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:9px" required>
 <label for="accountNewPassword">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
 <input id="accountNewPassword" type="password" autocomplete="new-password" minlength="8" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:9px" required>
 <label for="accountConfirmPassword">ยืนยันรหัสผ่านใหม่</label>
 <input id="accountConfirmPassword" type="password" autocomplete="new-password" minlength="8" style="display:block;width:100%;box-sizing:border-box;margin:7px 0 12px;padding:9px" required>
 <p id="accountChangeNotice" role="status" aria-live="polite"></p>
 <div class="actions"><button id="accountChangePassword" class="primary">บันทึกรหัสผ่านใหม่</button></div></details><div class="actions account-footer"><button id="accountSignOut">ออกจากระบบ</button><button id="accountClose" class="primary">กลับไปเล่น</button></div>`);
 $('accountClose').onclick=closeModal;
 $('accountChangePassword').onclick=async()=>{
  const oldPw=$('accountOldPassword').value,newPw=$('accountNewPassword').value,confirm=$('accountConfirmPassword').value;
  const error=$('accountChangeNotice'),button=$('accountChangePassword'),revision=dialogRevision;
  if(newPw.length<8){error.textContent='รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษรค่ะ';return;}
  if(newPw!==confirm){error.textContent='ยืนยันรหัสผ่านใหม่ไม่ตรงกันค่ะ';return;}
  if(newPw===oldPw){error.textContent='กรุณาตั้งรหัสผ่านใหม่ที่ต่างจากเดิมค่ะ';return;}
  button.disabled=true;error.textContent='กำลังเปลี่ยนรหัสผ่าน…';
  try{await api.changePassword(oldPw,newPw);if(dialogRevision!==revision)return;$('accountOldPassword').value='';$('accountNewPassword').value='';$('accountConfirmPassword').value='';error.textContent='เปลี่ยนรหัสผ่านสำเร็จแล้วค่ะ';}
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
 // Use the root-cause incident map refreshed by tick() every three game minutes.
 // Do not rescan from the report: motion planning can initialize vehicle fields.

 const reasons={},categories={},vehicles=[],issues=[],suspected=[],normalQueues=[];
 for(const v of state.vehicles.values()){
  const reason=v.phase==='stuck'?(v.stopReason||'ไม่มีเส้นทาง'):v.phase==='gate_waiting'||v.phase==='departing'?'รอออกจากอาคาร/ประตู':v.stopReason||'กำลังเดินทาง';
  reasons[reason]=(reasons[reason]||0)+1;
  const incident=incidentForVehicle.get(v.id),noRoute=missingRoute(v),stalled=incidentStoppedFor(v);
  const parking=['parking_in','parking_out'].includes(v.phase)||v.phase==='departing'&&!!v.fromId;
  const category=noRoute?'ไม่มีเส้นทาง':incident?.reason==='รถทับซ้อนหรือแย่งช่องทาง'?'รถซ้อนทับ/เปลี่ยนเลนขัดแย้ง':incident&&parking?'รถค้างผิดปกติในลานจอด':incident?'รถหยุดผิดปกติ':reason==='ไฟแดง'?'รอไฟแดงตามปกติ':reason==='คิวแยก'?'รอคิวทางแยก':/เว้นระยะ|คันหน้าขวาง|รอรถข้างหน้า/.test(reason)?'รถติดตามปกติ':parking?'กำลังเข้าออกลานจอด':v.phase==='gate_waiting'?'รอเข้าเมือง':v.phase==='departing'?'รอออกอาคาร':'กำลังเดินทาง';
  const suspicious=!!incident||noRoute;
  categories[category]=(categories[category]||0)+1;
  const pose=vehiclePosition({...v,turnLanes:{...v.turnLanes}});
  const data={id:v.id,phase:v.phase,reason,category,suspicious,stalledMinutes:stalled,incidentId:incident?.id??null,adaptiveLaneUntil:v.adaptiveLaneUntil??null,
   wait:v.wait||0,speed:v.speed||0,node:v.path[v.pos],pos:v.pos,lane:v.lane,pose,nextRouteRetry:v.nextRouteRetry??null,departureNoRoute:!!v.departureNoRoute,junctionPasses:v.junctionPasses||[]};
  vehicles.push(data);
  if(suspicious)suspected.push({id:v.id,category,reason,stalledMinutes:stalled});
  else if((v.wait||0)>=12||stalled>=12)normalQueues.push({id:v.id,category,reason,stalledMinutes:stalled});
  // Preserve manual towing for long queues, but do not call them bugs.
  if(canTowVehicle(v))issues.push({id:v.id,reason,category,suspicious,wait:v.wait||0,node:v.path[v.pos],pose});
 }
 issues.sort((a,b)=>Number(b.suspicious)-Number(a.suspicious)||Number(state.vehicles.get(b.id)?.phase==='stuck')-Number(state.vehicles.get(a.id)?.phase==='stuck')||b.wait-a.wait);
 const orphanReservations=[];for(const [key,r]of state.reservations)if((r.passes||[r]).some(p=>!state.vehicles.has(p.id)))orphanReservations.push(key);
 const brokenLinks=[];for(const [node,r]of state.roads)for(const n of r.links)if(!state.roads.get(n)?.links.has(node))brokenLinks.push([node,n]);
 return{format:'SMGame-city-bug-report',version:2,createdAt:new Date().toISOString(),build:'traffic-rules-v2',city:state.city,time:state.time,paused:state.speed===0,speed:state.speed,
  summary:{roads:state.roads.size,buildings:state.buildings.size,vehicles:state.vehicles.size,reasons,categories,incidents:incidentCases.size,suspectedVehicles:suspected.length,normalQueueVehicles:normalQueues.length},
  issues,suspected,normalQueues,orphanReservations,brokenLinks,vehicles,reservations:[...state.reservations],runtimeErrors:[...runtimeErrors],save:JSON.parse(snapshot())};
}
// Read-only, on-demand snapshot for AI-assisted city bug investigation.
// The save inside cityBugReport contains the full road graph, buildings,
// vehicles with current routes/lanes, signals, residents, events and camera.
function aiMapReport(){
 const data=cityBugReport();
 return {...data,format:'SMCITY-AI-map-diagnostics',version:1,
  sourceFormat:data.format,generatedFor:'วิเคราะห์สาเหตุบัคจากสถานะเมืองปัจจุบัน (ไม่ใช่ข้อมูลการฝึกโมเดล)',
  focus:selected?{kind:selected.kind,id:selected.id,buildingId:selected.buildingId??null}:null,
  camera:{...cam},gameVersion:document.title||null,
  detectedIncidents:[...incidentCases.values()].map(i=>({
   id:i.id??null,reason:i.reason||'',place:i.place||'',vehicles:[...(i.vehicles||[])],
  })),
  analysisInstructions:[
   'วิเคราะห์ไฟล์ JSON นี้เพื่อหาสาเหตุรถค้าง รถซ้อนทับ เปลี่ยนเลนผิด ถนน/แยก/ลานจอดและเส้นทางผิดปกติ',
   'แยกข้อเท็จจริงในไฟล์ออกจากข้อสันนิษฐาน และระบุ ID รถ/อาคาร/ช่องถนนที่เป็นหลักฐาน',
   'ตรวจปัญหา reservations, lane changes, queue, parking และสัญญาณไฟจาก snapshot ปัจจุบัน',
   'ถ้าระบุสาเหตุแน่ชัดไม่ได้ ให้บอกข้อมูลหรือ log เพิ่มเติมที่ต้องใช้ ห้ามเดาว่าเป็นบัคอะไร',
   'ข้อมูลนี้เป็นภาพขณะกดส่ง ไม่ใช่การบันทึกย้อนหลังทั้งช่วงเวลา'
  ]};
}
function aiMapFilename(report){
 return 'SMCITY-send-AI-'+String(report.city).replace(/[^a-zA-Z0-9_-]/g,'_')+'-day-'+(Math.floor(report.time/1440)+1)+'-'+new Date(report.createdAt).toISOString().replace(/[:.]/g,'-')+'.json';
}
function downloadAiMapFile(file,blob){
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=file;document.body.appendChild(link);link.click();
 link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function showAiMapSendGuide(file,blob,downloaded=false){
 modal('<span class="eyebrow">CITY DIAGNOSTICS</span><h2>ส่ง AI</h2>'+
  '<p>'+ (downloaded?'บันทึกไฟล์รายงานเมืองลงเครื่องแล้วค่ะ':'เตรียมไฟล์รายงานเมืองเรียบร้อยแล้วค่ะ')+
  ' นำไฟล์ JSON นี้แนบในแชต ChatGPT เพื่อให้ช่วยวิเคราะห์บัคได้</p>'+
  '<p><b>ไฟล์:</b> '+escapeSaveText(file)+'</p>'+
  '<p>ไฟล์มีสถานะถนน อาคาร รถ เส้นทาง เลน จุดจอด ไฟจราจร และรายการปัญหาที่ตรวจพบ ณ เวลาที่กดปุ่ม ไม่ได้ส่งข้อมูลขึ้นเซิร์ฟเวอร์โดยอัตโนมัติ</p>'+
  '<div class="actions"><button class="primary" id="sendAiDownload">'+(downloaded?'ดาวน์โหลดอีกครั้ง':'ดาวน์โหลด JSON')+
  '</button><button id="sendAiChat">เปิด ChatGPT</button><button id="sendAiClose">กลับไปเล่น</button></div>');
 $('sendAiDownload').onclick=()=>{try{downloadAiMapFile(file,blob);toast('ดาวน์โหลดรายงานแมปแล้วค่ะ');}catch(e){toast('ดาวน์โหลดไม่ได้: '+(e?.message||'เบราว์เซอร์ไม่รองรับ'));}};
 $('sendAiChat').onclick=()=>{const tab=window.open?.('https://chatgpt.com/','_blank','noopener,noreferrer');if(!tab)toast('เปิด ChatGPT ไม่ได้ กรุณาเปิดแชตแล้วแนบไฟล์เองค่ะ');};
 $('sendAiClose').onclick=closeModal;
}
async function sendCurrentMapToAi(){
 // Capture synchronously on the user click; do not change gameplay or saves.
 let report,json,filename,blob;
 try{
  report=aiMapReport();
  json=JSON.stringify(report,null,2);
  filename=aiMapFilename(report);
  blob=new Blob([json],{type:'application/json'});
 }catch(e){console.error('SMCITY AI map:',e);toast('จัดเตรียมข้อมูลแมปไม่สำเร็จ: '+(e?.message||'ไม่ทราบสาเหตุ'));return;}
 // Web Share is explicitly user-mediated; select an app (e.g. ChatGPT)
 // if the operating system offers it. This cannot silently attach a file.
 try{
  if(typeof File==='function'&&typeof navigator!=='undefined'&&typeof navigator.share==='function'){
   const file=new File([blob],filename,{type:'application/json'});
   if(typeof navigator.canShare!=='function'||navigator.canShare({files:[file]})){
    await navigator.share({files:[file],title:'SMCITY ส่ง AI วิเคราะห์แมป',text:'ช่วยวิเคราะห์สาเหตุบัค SMCITY จากไฟล์แมปที่แนบ โดยระบุหลักฐานจริงและไม่เดา'});
    return;
   }
  }
 }catch(e){
  // Cancelling the share sheet is not an error and must not download.
  if(e?.name==='AbortError')return;
  console.warn('SMCITY share unavailable:',e);
 }
 try{downloadAiMapFile(filename,blob);showAiMapSendGuide(filename,blob,true);}
 catch(e){console.error('SMCITY download failed:',e);showAiMapSendGuide(filename,blob,false);}
}
function openCityReport(){const report=cityBugReport(),rows=Object.entries(report.summary.reasons).map(([reason,count])=>'<li>'+escapeSaveText(reason)+' · '+count+' คัน</li>').join('');
 modal('<span class="eyebrow">CITY DIAGNOSTICS</span><h2>ตรวจเมือง / รายงานบัค</h2><p>'+ (report.paused?'เมืองหยุดเวลาอยู่ กดเล่นต่อเพื่อให้รถขยับ':'เมืองกำลังเดินเวลา')+'</p><p>รถ '+report.summary.vehicles+' คัน · สงสัยผิดปกติ '+report.summary.suspectedVehicles+' คัน · เหตุต้นเหตุ '+report.summary.incidents+' เหตุ · รอคิวปกตินาน '+report.summary.normalQueueVehicles+' คัน</p><ul>'+rows+'</ul><p><b>ประเภทการจราจร</b></p><ul>'+Object.entries(report.summary.categories).sort((a,b)=>b[1]-a[1]).map(([name,count])=>'<li>'+escapeSaveText(name)+' · '+count+' คัน</li>').join('')+'</ul><p>รถที่สามารถลากออกได้ '+report.issues.length+' คัน (รวมรถรอคิวนาน)</p><p>ลิงก์ถนนผิดปกติ '+report.brokenLinks.length+' · การจองรถที่หายไป '+report.orphanReservations.length+' · ข้อผิดพลาดโปรแกรม '+report.runtimeErrors.length+'</p><p>ไฟล์รายงานรวมเมือง เส้นทางรถ และเหตุผลที่หยุด แนบไฟล์นี้ให้อริสเพื่อตรวจเมืองที่มีปัญหาได้</p><div class="actions"><button id="exportCityBug" class="primary">ดาวน์โหลดรายงานเมือง</button><button id="reportClose">กลับไปเล่น</button></div>'+report.issues.slice(0,12).map((v,i)=>'<p><button id="bugCar'+i+'">ดูรถ #'+v.id+'</button> <button id="bugTow'+i+'">ลากรถออก</button> '+escapeSaveText(v.reason)+' · รอ '+Math.round(v.wait)+' นาทีในเกม</p>').join(''));
 $('reportClose').onclick=closeModal;
 $('exportCityBug').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='SMGame-bug-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 report.issues.slice(0,12).forEach((v,i)=>{$('bugCar'+i).onclick=()=>{if(v.pose){cam.x=v.pose.x;cam.y=v.pose.y;follow=v.id;}selected={kind:'vehicle',id:v.id};closeModal();renderInspector();};$('bugTow'+i).onclick=()=>{if(towVehicle(v.id))toast('ลากรถออกแล้ว · ยกเลิกเที่ยวเดินทาง');openCityReport();};});
}
$('advisorNext').onclick=e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-advice-report'))openCityReport();else if(button.dataset.adviceCategory){category=button.dataset.adviceCategory;renderTools();}};
if($('accountQuick'))$('accountQuick').onclick=openAccountDialog;
if($('saveGameQuick'))$('saveGameQuick').onclick=openCloudSaveDialog;

window.SMGameOnAuthChanged=loggedIn=>{
 if(!travelLogAdmin()){travelRecording=false;travelLog=null;if($('travelLogBody'))closeModal();}
 renderTools();
 if(loggedIn)void syncManualIncidentLogs();
 const account=$('accountQuick');
 if(account){
  account.classList.toggle('is-signed-in',!!loggedIn);
  account.title=loggedIn?'บัญชีผู้ใช้':'เข้าสู่ระบบ / สมัครสมาชิก';
  account.setAttribute('aria-label',account.title);
 }
};
function openReportMenu(){
 const actions=dockItems('reports');
 const icons={sendAi:'↗',travelLog:'◉',cityReport:'▤',incidentLog:'◷'};
 modal('<div class="menu-heading"><span class="menu-logo">▤</span><div><span class="eyebrow">SMCITY</span><h2>Report</h2></div></div>'+
  '<div class="smcity-report-list" role="group" aria-label="Report">'+actions.map(t=>
   '<button type="button" class="smcity-report-entry" data-report-action="'+t.key+'"><span class="menu-symbol">'+icons[t.key]+'</span>'+
   '<span><b>'+t.name+'</b><small>'+t.price+'</small></span><span class="menu-chevron">›</span></button>').join('')+'</div>'+
  '<div class="actions"><button type="button" id="reportMenuBack">เมนูหลัก</button><button type="button" id="reportMenuClose" class="primary">กลับไปเล่น</button></div>');
 $('reportMenuBack').onclick=openMainMenu;
 $('reportMenuClose').onclick=closeModal;
 // A single delegated click handler avoids accidental double execution.
 $('dialogContent').onclick=event=>{
  const button=event.target.closest?.('[data-report-action]');
  if(!button)return;
  const handlers={sendAi:sendCurrentMapToAi,travelLog:openTravelLog,cityReport:openCityReport,incidentLog:openManualIncidentLog};
  handlers[button.dataset.reportAction]?.();
 };
}
function openGraphicsMenu(){
 const levels=[
  {value:'veryHigh',label:'สูงมาก',desc:'รถและบ้านรายละเอียดเต็มทุกระยะ เปิดต้นไม้'},
  {value:'medium',label:'กลาง',desc:'ลดรายละเอียดรถเร็วขึ้น บ้านลดรายละเอียดเล็กน้อยเมื่อซูมออก'},
  {value:'low',label:'ต่ำ',desc:'ภาพนุ่มลง รถโมเดลเบาทุกระยะ ลดรายละเอียดบ้านและไม่แสดงต้นไม้'}
 ];
 modal('<div class="menu-heading"><span class="menu-logo">◈</span><div><span class="eyebrow">SMCITY</span><h2>ตั้งค่ากราฟิก</h2></div></div>'+
 '<div class="smcity-menu-list" role="group" aria-label="เลือกระดับกราฟิก">'+
 levels.map(p=>'<button type="button" data-graphics-quality="'+p.value+'" aria-pressed="'+String(graphicQuality===p.value)+'"><span class="menu-symbol">'+(graphicQuality===p.value?'●':'○')+'</span><span><b>'+p.label+'</b><small>'+p.desc+'</small></span><span class="menu-chevron">'+(graphicQuality===p.value?'✓':'›')+'</span></button>').join('')+
 '</div><button type="button" class="primary menu-resume" id="graphicsBack">กลับเมนูหลัก</button>');
 $('graphicsBack').onclick=openMainMenu;
 for(const button of document.querySelectorAll('[data-graphics-quality]')){
  button.onclick=()=>{
   if(applyGraphicQuality(button.dataset.graphicsQuality))openGraphicsMenu();
  };
 }
}
function openMainMenu(){
 modal('<div class="menu-heading"><span class="menu-logo">S</span><div><span class="eyebrow">SMCITY</span><h2>เมนูหลัก</h2></div></div><div class="smcity-menu-list" role="group" aria-label="เมนูหลัก"><button type="button" id="newCityMenu"><span class="menu-symbol">＋</span><span><b>เริ่มเมืองใหม่</b></span><span class="menu-chevron">›</span></button><button type="button" id="saveMenu"><span class="menu-symbol">▣</span><span><b>เซป/โหลด</b></span><span class="menu-chevron">›</span></button><button type="button" id="accountMenu"><span class="menu-symbol">♙</span><span><b>บัญชีผู้ใช้</b></span><span class="menu-chevron">›</span></button><button type="button" id="reportMenu"><span class="menu-symbol">▤</span><span><b>รายงานเมือง</b></span><span class="menu-chevron">›</span></button><button type="button" id="graphicsMenu"><span class="menu-symbol">◈</span><span><b>ตั้งค่ากราฟิก</b></span><span class="menu-chevron">›</span></button><button type="button" id="helpMenu"><span class="menu-symbol">?</span><span><b>คู่มือเล่นเกม</b></span><span class="menu-chevron">›</span></button></div><button type="button" class="primary menu-resume" id="menuClose">กลับไปเล่น</button>');
 const creatorAnchor=$('reportMenu');
 if(window.SMGameCreatorCanOpen&&creatorAnchor){
  const button=document.createElement('button');
  button.id='creatorMenu';button.type='button';
  button.innerHTML='<span class="menu-symbol">✦</span><span><b>ผู้สร้าง</b><small>ผู้เล่นออนไลน์และประวัติการเข้าเว็บ</small></span><span class="menu-chevron">›</span>';
  creatorAnchor.before(button);
  button.onclick=()=>window.SMGameCreatorOpen?.();
 }
 $('menuClose').onclick=closeModal;
 $('accountMenu').onclick=openAccountDialog;
 $('saveMenu').onclick=openCloudSaveDialog;
 $('reportMenu').onclick=openReportMenu;
 $('helpMenu').onclick=()=>{ $('help').click(); };
 $('newCityMenu').onclick=openNewCityDialog;
 $('graphicsMenu').onclick=openGraphicsMenu;
}
$('menu').onclick=openMainMenu;
window.SMGameCreatorMetrics=()=>{
 const stats=computeStats();
 let tourists=0;
 for(const person of state.citizens.values())if(person.tourist&&!person.removed&&person.enteredAt!=null)tourists++;
 return { city:state.city,population:stats.pop,tourists,vehicles:state.vehicles.size,
  buildings:state.buildings.size,isPlaying:state.speed>0&&!window.SMGameAuthLocked&&!$('dialog').open };
};
$('skip').onclick=()=>confirmAction('ข้ามไปเช้าวันใหม่','สรุปการเดินทางและรายรับจนถึง 06:00 วันถัดไป ช่วงที่ข้ามจะประมาณผลการเดินทางแทนการจำลองรถทุกคัน',()=>{const target=(Math.floor(state.time/1440)+1)*1440+360;for(const v of [...state.vehicles.values()]){arrive(v,true);}state.events=state.events.filter(e=>e.at>=target);eventHeapify();state.time=target-360;daily();state.time=target;missionAutoPulse();for(const c of [...state.citizens.values()]){if(c.removed)continue;if(c.tourist){removeCitizen(c);continue;}for(const b of state.buildings.values()){b.visitors.delete(c.id);b.parked.delete(c.id);}state.buildings.get(c.homeId)?.parked.add(c.id);c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';c.queued=null;c.pending=null;c.lifeRun=null;c.activityUntil=null;c.scheduled.delete(Math.floor(target/1440));scheduleDay(c,Math.floor(target/1440));}syncParkingSlots();state.lastImmigration=target;state.lastPass=target;state.speed=1;renderTools();addNews('ข้ามวันแบบสรุป เริ่มเช้าวันใหม่ 06:00');updateUI();toast('เช้าวันใหม่ พร้อมปรับเมืองต่อแล้วค่ะ');});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_city_status',title:'อ่านสถานะเมือง',description:'อ่านงบประมาณ ประชากร ความสุข จราจร และความต้องการของเมืองที่กำลังเล่น',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||Object.keys(input).length)throw Error('Expected empty object');return{city:CITIES[state.city].name,time:timeText(state.time),money:state.money,...computeStats()};}})).catch(()=>{});}catch{}}
// Read-only diagnostics and exact game actions are exposed only in the local test harness.
if(typeof window.__TRAFFIC_TEST_HARNESS__==='function')window.__TRAFFIC_TEST_HARNESS__({assistedBuildingPlacement,getDemolitionPreview,finishCanvasInteraction,get state(){return state;},get cam(){return cam;},get selected(){return selected;},get carStatusDiamondsVisible(){return carStatusDiamondsVisible;},get aiPinsVisible(){return aiPinsVisible;},toggleAIPinLabels,activateAISignalPin,updateAISignalPins,buyAISignal,openAISignalUpgrade,smartSignalStep,aiSignalQueuePressure,get graphicQuality(){return graphicQuality;},applyGraphicQuality,openGraphicsMenu,get canvasCarMarkerHits(){return canvasCarMarkerHits;},screen,get incidentCases(){return incidentCases;},scanIncidents,resolveIncident,openTrafficIncident,incidentEventType,incidentRewardStatus,openManualIncidentLog,manualIncidentLogs,syncManualIncidentLogs,incidentSummaryVehicle,updateIncidentMarkers,nudgeCamera,resetCameraAngle,TOURISM,tourismCapacity,admitTourist,touristStep,touristEnter,touristCharge,touristTrafficFailure,touristLeave,touristHotel,arriveTourist,updateTourism,tourismLedger,touristPeople,touristDashboardData,touristCurrentActivity,touristInspector,renderTouristDashboard,showTouristDashboard,releaseHotel,prepareTouristDemolition,daily,LIFESTYLES,CITIZEN_TRAITS,VEHICLE_TECHS,openVehicleUpgrade,syncCitizenVehicleTech,vehicleTechCounts,vehiclePosition,advanceSkyVehicle,citizenServicePreference,SERVICE_STAY,serviceWindow,workRoutine,runLifestyle,lifeAdvance,newCitizen,scheduleDay,planForDay,ensureRoutine,habitRandom,eventPush,eventPop,eventHeapify,citizenDashboardData,filteredCitizenRecords,renderCitizenDashboard,showCitizenDashboard,hideCitizenDashboard,TREE_KINDS,landscapeClear,plantLandscape,eraseLandscape,plantLandscapeStroke,lotCarsOverlap,advanceLot,parkingFree,parkingSpace,lotSlots,lotPoint,lotModel,buildingBounds,parkingSlotPose,parkingPose,parkingVisuals,syncParkingSlots,beginParkingArrival,prepareLotDeparture,arrive,trackingRoute,trackingDestination,trackingOrigin,trackingEndpoint,vehicleTimeliness,selectedCarVehicle,normalizeSelectedCar,updateTrackingOverlay,drawCarIndicators2D,reset,startNewCity,id,xy,route,tripRoute,buildRoad,buildBuilding,checkBuilding,checkRoad,demolishRoad,demolishBuilding,createTrip,missingRoute,routeWarningPosition,updatePlaceLabels,updateRouteWarnings,recoverVehicle,checkDepartureRoute,canTowVehicle,towVehicle,strandVehicle,cancelVehicle,immigration,tick,computeStats,cityDemand,cityAdvice,updateCityAdvisor,runAction,drawRoads,advanceVehicles,junctionDetails,cityBugReport,openCityReport,updateCityQuickModes,aiMapReport,sendCurrentMapToAi,aiMapFilename,recordMissionResult,missionStatsSummary,openMissionDashboard,missionFinishDay,missionAutoPulse,missionAutoClose,missionReportMarkup,renderInspector,renderTools,dockItems,openMainMenu,openReportMenu,inspectAt,updateBuildingQuickActions,signalHitAt,signalSettings,signalSlots,signalCycle,signalProgress,signalStatus,signalPhase,signalColor,signalAllows,editSignal,controlSignal,setSignalDefaults,restoreRecommendedSignals,selectTool,snapshot,loadGame,saveGame,buildingTraffic,buildingGaugeMetrics,readSaveSlots,readDurableSaveSlots,saveDurableGame,validateSave,prepareJunctionQueues,junctionConnector,connectorsConflict,enforceNoUTurn,capsulesOverlap,laneSwapClearance,laneChangeCorridorClear,commitSafeLaneChange,attemptAdaptiveLaneChange,queueAllows,reserveIntersection,release,accessFor,dir,junction,plannedLane,intersectionAllowed,stopProgress,roadChanged,occupancy,vehiclePosition,motionPlan,motionDistance,positionOnMotion,laneOffset,lineCells,roadEraseSegmentCells,appendRoadEraseStroke,roadErasePlan,demolishRoadStroke,demolitionBuildingAt,setDockCollapsed,getRoadPreview,closeModal,get pendingRoadPreview(){return pendingRoadPreview;},beginParkingArrival,recordEntranceArrival,constructionDialogPlacement,positionConstructionDialog,cancelBuildingMove,touristActivityResult,worksOnDay,updateCityActivity,startCityOuting,chooseCityOuting,migrateActivity251,homeActivityLimit,activitySnapshot,HOME_ACTIVITY_TARGETS,SERVICE_HOURS,SERVICE_STAY,scheduleDay,lifePlan,migrateJourneyRules,lifeRetry,arriveLifestyle,respawnVehicle,NO_ROUTE_TIMEOUT,IMMOBILE_RESPAWN_TIMEOUT,journeyResult,arrivalOutcome,trackJourney,travelEstimate,buildingTravelEstimate,TRAVEL_PLANNING,optionalActivityFits,estimatePlanTravel,migrateTravelPlanning,resumeCancelledLife,workTax,JOURNEY_RULES,beginMoveBuilding,moveBuilding,get movingBuildingId(){return movingBuildingId;},roadsideVisuals,roadVisualWidth,bezierPoint,bezierTangent,TRIPS,ROADS,CATALOG});
resize();startNewCity();requestAnimationFrame(frame);
})();
