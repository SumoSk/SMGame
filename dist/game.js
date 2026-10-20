'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('world');
let renderer3d=null;try{if(window.createTrafficRenderer)renderer3d=window.createTrafficRenderer(canvas);}catch(e){console.error('3D renderer:',e);}
const ctx=renderer3d?null:canvas.getContext('2d');
const W=300,H=300,T=18,DIR=[[1,0],[0,1],[-1,0],[0,-1]],fmt=n=>Math.round(n).toLocaleString('th-TH'),money=n=>'฿'+fmt(n);
const ROADS={small:{name:'ถนนเล็ก',lanes:2,cost:50,maint:.5,speed:3,width:2,visualWidth:1.55},medium:{name:'ถนนกลาง',lanes:4,cost:150,maint:1,speed:4.5,width:2,visualWidth:2.35},large:{name:'ถนนใหญ่',lanes:8,cost:600,maint:5,speed:6,width:4,visualWidth:3.72}};
const TRAFFIC_RULES={stopLineOffset:.52,vehicleHalfLength:.28,maxIntersectionLookahead:3,maxIntersectionReservation:3};
const CITIES={phuket:{name:'ภูเก็ต',en:'PHUKET ISLAND',sub:'เกาะเล็ก ๆ กับความเป็นไปได้ที่ยิ่งใหญ่',terrain:'island'},bangkok:{name:'กรุงเทพฯ',en:'BANGKOK METROPOLIS',sub:'เชื่อมสองฝั่งเมือง ให้ทุกชีวิตไปต่อ',terrain:'river'},chiangmai:{name:'เชียงใหม่',en:'CHIANG MAI',sub:'เมืองเหนือที่เติบโต ในจังหวะของคุณ',terrain:'mountain'},korat:{name:'โคราช',en:'NAKHON RATCHASIMA',sub:'ประตูสู่อีสาน ทุกเส้นทางเริ่มที่นี่',terrain:'through'}};
const KINDS={home:{name:'บ้าน',icon:'⌂',color:'#e9b871',roof:'#db8558'},shop:{name:'ร้านค้า',icon:'▤',color:'#f4c76c',roof:'#d79c3e'},restaurant:{name:'ร้านอาหาร',icon:'♨',color:'#eaa080',roof:'#c76251'},mall:{name:'ห้าง',icon:'▥',color:'#cee7db',roof:'#5d9c98'},office:{name:'สำนักงาน',icon:'▥',color:'#b9d5da',roof:'#4f8598'},factory:{name:'โรงงาน',icon:'⚙',color:'#c4c9b4',roof:'#7d8c81'},park:{name:'สวน',icon:'♧',color:'#8aba70',roof:'#5b9658'},pub:{name:'ผับ',icon:'♫',color:'#bfa6c8',roof:'#88618e'}};
const CATALOG={};
const catalogData={home:[[2,6000,20,2],[3,35000,100,10],[4,130000,350,30]],shop:[[2,8000,100,0,3,12],[3,24000,250,0,8,35],[4,70000,650,0,18,80]],restaurant:[[3,12000,180,0,5,18],[4,35000,450,0,14,50],[5,85000,900,0,30,95]],mall:[[4,45000,450,0,12,45],[5,95000,1100,0,30,100],[6,190000,2300,0,65,180]],office:[[3,18000,250,0,18],[4,60000,700,0,50],[5,120000,1300,0,90]],factory:[[4,22000,450,0,25],[5,70000,1300,0,65],[6,140000,2400,0,110]],park:[[3,6000,40,0,1,20],[4,18000,140,0,3,60],[5,45000,350,0,8,130]],pub:[[3,14000,200,0,5,18],[4,38000,550,0,13,45],[5,85000,1200,0,28,85]]};
for(const [kind,rows] of Object.entries(catalogData))rows.forEach((r,i)=>{const key=kind+'_'+['small','medium','large'][i];CATALOG[key]={key,kind,name:KINDS[kind].name+['เล็ก','กลาง','ใหญ่'][i],size:r[0],cost:r[1],maint:r[2],residents:r[3]||0,jobs:r[4]||0,service:r[5]||0};});
const runtimeErrors=[];for(const type of ['error','unhandledrejection'])window.addEventListener(type,e=>{runtimeErrors.push({at:new Date().toISOString(),message:String(e.message||e.reason?.stack||e.reason||type).slice(0,4000)});if(runtimeErrors.length>20)runtimeErrors.shift();});
let state,cam={x:150,y:150,z:1.25},view={w:innerWidth,h:innerHeight,dpr:1},tool='hand',category='roads',selected=null,hover=null,drag=null,heat=false,debug=false,last=0,uiTick=0,news=[],toastTimer,follow=null;
const id=(x,y)=>y*W+x,xy=i=>[i%W,Math.floor(i/W)],valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
function reset(city='phuket'){
state={city,money:500000,time:360,speed:1,roads:new Map(),buildings:new Map(),citizens:new Map(),vehicles:new Map(),footprint:new Int32Array(W*H).fill(-1),buildGrid:new Int32Array(W*H).fill(-1),nextId:1,profileSeq:0,version:0,routeCache:new Map(),occ:new Map(),reservations:new Map(),events:[],lastMinute:359,lastDay:0,lastImmigration:0,lastPass:0,stats:{},alerts:[],roadChanges:[],activeTraffic:new Set(),junctionCache:new Map(),skip:false};
for(let n=0;n<300;n++){state.roads.set(id(150,n),{type:'large',main:true,links:new Set(),load:0,wait:0});state.roads.set(id(n,150),{type:'large',main:true,links:new Set(),load:0,wait:0});}
for(let n=0;n<299;n++){link(id(150,n),id(150,n+1));link(id(n,150),id(n+1,150));}
state.gates=[id(150,0),id(299,150),id(150,299),id(0,150)];rebuildFootprint();cam={x:149,y:149,z:innerWidth<700?.94:1.24};selected=null;follow=null;news=[];tool='hand';$('inspector').classList.add('hidden');$('cityName').textContent=CITIES[city].name;$('citySub').textContent=CITIES[city].sub;$('mapLabel').innerHTML=CITIES[city].en+'<small>THAILAND · สร้างเมืองในแบบคุณ</small>';addNews('เริ่มเมืองใหม่ เชื่อมถนน สร้างบ้าน และสร้างงาน');updateUI();renderTools();}
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
for(let y=Math.floor(y0/3)*3;y<y1;y+=3)for(let x=Math.floor(x0/3)*3;x<x1;x+=3){const h=Math.abs(Math.sin(x*32.13+y*14.79)),tx=x+Math.sin(x*13+y)*1.1,ty=y+Math.cos(y*9+x)*.8,ix=Math.floor(tx),iy=Math.floor(ty);if(h<.67||!valid(ix,iy)||terrain==='island'&&tx<134||terrain==='river'&&Math.abs(tx-(112+Math.sin(ty/29)*8))<8)continue;if(state.footprint[id(ix,iy)]>=0||state.buildGrid[id(ix,iy)]>=0)continue;tree(tx,ty,.6+h*.65);}
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
 else if(cam.z>.4){const phase=signalPhase(l.node);for(const port of l.ports){const d=port.dir,[vx,vy]=DIR[d],px=-vy,py=vx,offset=port.extent+.13,point=(along,side)=>[l.x+vx*along+px*side,l.y+vy*along+py*side];stroke([point(offset,.06),point(offset,port.width/2-.06)],'#edf0df',.075);const [sx,sy]=screen(...point(offset,port.width/2+.3).map(v=>v+.5));ctx.fillStyle='#263e3a';ctx.fillRect(sx-2*cam.z,sy-4*cam.z,4*cam.z,8*cam.z);ctx.fillStyle=phase===d%2?'#a4dc90':phase===2?'#efd581':'#f08b75';ctx.beginPath();ctx.arc(sx,sy,1.7*cam.z,0,7);ctx.fill();}}
 }
 if(debug)for(const [i]of state.roads){const [x,y]=xy(i),p=screen(x+.5,y+.5);ctx.fillStyle='#fff';ctx.font=`${9*cam.z}px monospace`;ctx.fillText(String(occupancy(i)),p[0],p[1]);}
}

function roadColor(r){return r.wait>4?'#363b38':r.wait>1?'#e36351':r.load>.75?'#edaa51':r.load>.4?'#dbce68':'#67ab76';}
const SIGNAL_CYCLE_MINUTES=60;
function signalPhase(i){
 const phase=(state.time+(i%17)*SIGNAL_CYCLE_MINUTES/24)%SIGNAL_CYCLE_MINUTES;
 return phase<25?0:phase<28.5?2:phase<30?-1:phase<55?1:phase<58.5?2:-1;
}
function laneCapacity(i){const r=state.roads.get(i);return Math.max(1,Math.floor((ROADS[r?.type||'small']?.lanes||2)/2));}
function roadVisualWidth(type){return ROADS[type]?.visualWidth||ROADS.small.visualWidth;}
function laneOffset(i,d,lane){const r=state.roads.get(i),type=ROADS[r?.type||'small'],cap=Math.max(1,Math.floor(type.lanes/2)),safeLane=Math.min(cap-1,Math.max(0,Number.isFinite(lane)?lane:0)),width=roadVisualWidth(r?.type||'small'),laneWidth=width/(cap*2),across=(safeLane+.5-cap/2)*laneWidth,side=width*.25,dirVector=DIR[d]||DIR[0],length=Math.hypot(dirVector[0],dirVector[1])||1;return{x:(dirVector[1]/length)*(side+across),y:(-dirVector[0]/length)*(side+across)};}
function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function bezierPoint(p0,p1,p2,p3,t){const u=1-t,uu=u*u,tt=t*t;return{x:uu*u*p0.x+3*uu*t*p1.x+3*u*tt*p2.x+tt*t*p3.x,y:uu*u*p0.y+3*uu*t*p1.y+3*u*tt*p2.y+tt*t*p3.y};}
function bezierTangent(p0,p1,p2,p3,t){const u=1-t;return{x:3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x),y:3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y)};}
function signalAllows(i,entering){const phase=signalPhase(i);return phase>=0&&phase<2&&phase===entering%2;}
function stopProgress(v,pos){const node=v.path[pos],prev=v.path[Math.max(0,pos-1)];if(node==null||prev==null)return 0;const gap=Math.max(.05,1-TRAFFIC_RULES.stopLineOffset-TRAFFIC_RULES.vehicleHalfLength);return Math.min(.24,Math.max(.04,gap));}
function nextTurn(v,pos){for(let n=pos;n<Math.min(pos+4,v.path.length-2);n++){const d1=dir(v.path[n],v.path[n+1]),d2=dir(v.path[n+1],v.path[n+2]);if(d1!==d2)return(d2-d1+4)%4;}return 0;}
function occupancy(i){let n=0;for(let d=0;d<4;d++)for(let l=0;l<4;l++)if(state.occ.has(`${i}:${d}:${l}`))n++;return n;}
function drawBuilding(b,ghost=false){const t=CATALOG[b.key],k=KINDS[t.kind],s=t.size,x=b.x,y=b.y,p=screen(x,y);if(p[0]<-180||p[0]>view.w+100||p[1]<-80||p[1]>view.h+180)return;ctx.save();if(ghost)ctx.globalAlpha=.62;
box(x+.06,y+.06,s-.12,s-.12,2,'#d9d7ba','#a3b38d','#bbc39e');
if(t.kind==='park'){box(x+.25,y+.25,s-.5,s-.5,3,'#8abb75','#739b66','#86aa72');poly([screen(x+.3,y+s*.45,4),screen(x+s-.3,y+s*.45,4),screen(x+s-.3,y+s*.63,4),screen(x+.3,y+s*.63,4)],'#e3d9b5');tree(x+s*.28,y+s*.3,1.1);tree(x+s*.73,y+s*.28,1.3);tree(x+s*.7,y+s*.8,.9);const f=screen(x+s*.45,y+s*.75,5);ctx.fillStyle='#d9d6b7';ctx.beginPath();ctx.ellipse(...f,9*cam.z,6*cam.z,0,0,7);ctx.fill();ctx.fillStyle='#83bfba';ctx.beginPath();ctx.ellipse(...f,6*cam.z,4*cam.z,0,0,7);ctx.fill();}
else{const tall=t.kind==='office'?s*8:t.kind==='mall'?s*4:t.kind==='home'?s*4+3:s*3.5,height=tall;const bx=x+.26,by=y+.3,bw=s-.55,bh=s-.8;const sh=[screen(bx+bw,by),screen(bx+bw+height/T*.65,by+.6),screen(bx+bw+height/T*.65,by+bh+.6),screen(bx,by+bh+.1)];poly(sh,'#294b3924');box(bx,by,bw,bh,height,k.color,'#76988d',t.kind==='home'?'#efdcb2':'#d9e1cf');
if(t.kind==='home'||t.kind==='restaurant'||t.kind==='pub'){const a=screen(bx-.1,by-.12,height),bb=screen(bx+bw+.1,by-.12,height),c=screen(bx+bw+.1,by+bh+.1,height),d=screen(bx-.1,by+bh+.1,height),m1=screen(bx-.1,by+bh*.46,height+8),m2=screen(bx+bw+.1,by+bh*.46,height+8);poly([a,bb,m2,m1],k.roof);poly([m1,m2,c,d],t.kind==='home'?'#e4a46c':k.roof);ctx.strokeStyle='#7f70514d';ctx.lineWidth=.65;for(let n=1;n<bw*3;n++){const xx=bx+n/3;ctx.beginPath();ctx.moveTo(...screen(xx,by+bh*.46,height+8));ctx.lineTo(...screen(xx,by+bh+.1,height));ctx.stroke();}}
else{box(bx+.15,by+.15,bw-.3,bh-.3,height+2,k.roof,'#64837e','#7a9890');if(t.kind==='office'||t.kind==='mall'){box(bx+bw*.4,by+.2,bw*.35,bh*.38,height+4,'#b7d1c4');}if(t.kind==='factory'){box(bx+bw*.7,by+.2,.35,.35,height+12,'#b9b99e','#77857a','#8b9a8a');}}
if(cam.z>.42){const floors=t.kind==='office'?Math.floor(s*1.3):1;for(let f=0;f<floors;f++)for(let w=0;w<Math.max(1,Math.floor(bw*1.4));w++){const px=bx+.2+w*.62,py=by+bh+.015;poly([screen(px,py,5+f*7),screen(px+.29,py,5+f*7),screen(px+.29,py,9+f*7),screen(px,py,9+f*7)],'#69979c');}if(['shop','restaurant'].includes(t.kind)){const py=by+bh+.08;for(let n=0;n<bw*4;n++){poly([screen(bx+n/4,py,8),screen(bx+(n+1)/4,py,8),screen(bx+(n+1)/4,py+.3,6),screen(bx+n/4,py+.3,6)],n%2?'#f6e7bc':k.roof);}}}
tree(x+s-.3,y+s-.3,.55);}
if(b.parked)for(let n=0;n<Math.min(b.parked.size,Math.floor(s*2));n++){const q=screen(x+.38+(n%Math.floor(s))*.62,y+s-.3-Math.floor(n/s)*.4,3);drawCarShape(q[0],q[1],0,['#f6f0d7','#72a4ad','#d18a6b'][n%3],cam.z*.7);}
if(selected?.kind==='building'&&selected.id===b.id||ghost){ctx.strokeStyle=ghost?'#f6dc83':'#fff6b7';ctx.lineWidth=2;poly([screen(x,y),screen(x+s,y),screen(x+s,y+s),screen(x,y+s)],null,ctx.strokeStyle);}
if(cam.z>1.1&&!ghost&&typeof document.createElement!=='function'){const p=screen(x+s*.5,y+s+.45);ctx.font=`500 ${Math.min(12,10*cam.z)}px 'Noto Sans Thai',Tahoma`;ctx.textAlign='center';ctx.fillStyle='#284a3e';ctx.fillText(t.name,p[0],p[1]);ctx.textAlign='start';}ctx.restore();}
function drawCarShape(x,y,angle,color,z){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#173a3d40';ctx.fillRect(-5*z+2*z,-2.5*z+2*z,10*z,5*z);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-5*z,-2.4*z,10*z,4.8*z,1.4*z);ctx.fill();ctx.fillStyle='#466572';ctx.fillRect(0,-1.9*z,2.3*z,3.8*z);ctx.fillStyle='#dae7df';ctx.fillRect(-2.8*z,-1.9*z,2.2*z,3.8*z);ctx.fillStyle='#fff2b3';ctx.fillRect(3.5*z,-2.1*z,1*z,1*z);ctx.fillRect(3.5*z,1.1*z,1*z,1*z);ctx.restore();}
function drawVehicles(){for(const v of state.vehicles.values()){if(v.phase==='gate_waiting'||v.phase==='departing')continue;const pos=vehiclePosition(v);if(!pos)continue;const p=screen(pos.x,pos.y);if(p[0]<-20||p[0]>view.w+20||p[1]<-20||p[1]>view.h+20)continue;drawCarShape(p[0],p[1],pos.angle,v.color,cam.z);if(follow===v.id){ctx.strokeStyle='#fff6a2';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...p,12*cam.z,0,7);ctx.stroke();}}}
// Lane geometry is immutable during a trip. It is rebuilt only after a route or
// road edit, rather than being recalculated from the car's new lane each frame.
const motionPlans=new WeakMap();
function motionDirection(path,k){return dir(path[Math.max(0,Math.min(k,path.length-2))],path[Math.max(1,Math.min(k+1,path.length-1))]);}
function turnLanePair(v,c,rank){
 const a=laneCapacity(v.path[c.pos-1]),b=laneCapacity(v.path[c.pos+1]);
 if(c.turn===2)return{incoming:0,outgoing:0};
 const count=Math.min(2,a,b),r=Math.max(0,Math.min(count-1,rank));
 return c.turn===1?{incoming:r,outgoing:r}:{incoming:a-count+r,outgoing:b-count+r};
}
function chooseTurnLane(v,c){
 if(c.turn===2)return 0;
 const count=Math.min(2,laneCapacity(v.path[c.pos-1]),laneCapacity(v.path[c.pos+1]));
 const scores=Array(count).fill(0),node=v.path[c.pos];
 for(const other of state.vehicles.values()){
  if(other.id===v.id||!other.path?.length)continue;
  const p=motionPlans.get(other);if(!p)continue;
  const turn=p.turns.find(t=>other.pos<=t.pos&&other.path[t.pos]===node&&t.incoming===c.incoming&&t.turn===c.turn);
  if(!turn||turn.pos-other.pos>24)continue;
  for(let r=0;r<count;r++)if(p.lanes[Math.max(0,turn.pos-1)]===turnLanePair(v,c,r).incoming)scores[r]+=1+(other.speed<.1?.5:0);
 }
 for(let r=0;r<count;r++){const pair=turnLanePair(v,c,r);for(let k=c.pos+1;k<=Math.min(v.path.length-1,c.pos+4);k++){const key=occKey(v.path[k],c.outgoing,Math.min(pair.outgoing,laneCapacity(v.path[k])-1));if(state.occ.has(key)||state.reservations.has(key))scores[r]+=2;}}
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
 if(!legacy){if(!v.turnLanes)v.turnLanes={};for(const c of corners){const key=c.pos+':'+path[c.pos]+':'+c.turn;if(v.turnLanes[key]==null)v.turnLanes[key]=chooseTurnLane(v,c);c.lanePair=turnLanePair(v,c,v.turnLanes[key]);}}
 let previousLane=Math.max(0,Math.floor(v.motionSeedLane??v.laneSeed??v.lane??v.id??0));
 let lastCorner=null,nextIndex=0,previousCap=laneCapacity(path[0]);
 for(let i=0;i<n;i++){
  while(nextIndex<corners.length&&corners[nextIndex].pos<=i)lastCorner=corners[nextIndex++];
  const next=corners[nextIndex],cap=laneCapacity(path[i]);
  const hold=lastCorner&&route[i]-lastCorner.u<=Math.min(3,next?(next.u-lastCorner.u)*.5:3);
  const prepare=next&&(!lastCorner||next.u-route[i]<=4);
  const turn=hold?lastCorner.turn:prepare?next.turn:0;
  lanes[i]=legacy?(turn===1?0:turn===3?cap-1:Math.min(cap-1,Math.floor((previousLane+.5)*cap/previousCap))):hold?Math.min(cap-1,lastCorner.lanePair.outgoing):prepare?Math.min(cap-1,next.lanePair.incoming):Math.min(cap-1,Math.floor((previousLane+.5)*cap/previousCap));
  previousLane=lanes[i];previousCap=cap;
 }
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
   if(lateral>1e-8&&forward>window){a=shift(start,d,forward-window);u=startU+(endU-startU)*(forward-window)/forward;const h=(forward-window)/3;append(startU,u,start,shift(start,d,h),shift(a,d,-h),a);}
   const h=(lateral>1e-8?window:forward)/3;append(u,endU,a,shift(a,d,h),shift(end,d,-h),end);return;
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
function vehiclePosition(v){if(v.phase==='stuck'&&v.heldPose)return v.heldPose;return v.path?.length?positionOnMotion(motionPlan(v),motionDistance(v)):null;}
function buildingTraffic(b,incoming=null){const t=CATALOG[b.key];let approaching=0;if(incoming)approaching=incoming.get(b.id)||0;else for(const v of state.vehicles.values())if(v.toId===b.id)approaching++;return{name:t.name,approaching,parked:b.parked.size,max:t.residents||t.jobs+t.service};}
let placeLabelLayer=null,placeLabelState=null,placeLabels=new Map(),placeLabelCounts=new Map(),placeLabelAt=0;
function updatePlaceLabels(){
 if(typeof document.createElement!=='function')return;
 if(!placeLabelLayer){placeLabelLayer=document.createElement('div');placeLabelLayer.id='buildingLabels';placeLabelLayer.setAttribute('aria-label','สถานที่และจำนวนรถ');Object.assign(placeLabelLayer.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});canvas.insertAdjacentElement('afterend',placeLabelLayer);}
 if(placeLabelState!==state){placeLabelLayer.replaceChildren();placeLabels.clear();placeLabelState=state;placeLabelAt=0;}
 const now=Date.now(),refresh=now-placeLabelAt>300||placeLabels.size!==state.buildings.size;
 if(refresh){placeLabelCounts=new Map();for(const v of state.vehicles.values())if(v.toId!=null)placeLabelCounts.set(v.toId,(placeLabelCounts.get(v.toId)||0)+1);placeLabelAt=now;}
 for(const [key,label]of placeLabels)if(!state.buildings.has(key)){label.element.remove();placeLabels.delete(key);}
 for(const b of state.buildings.values()){
  const t=CATALOG[b.key],height=renderer3d?(t.kind==='office'?t.size*1.15+.7:t.kind==='park'?.65:t.kind==='home'?t.size*.62+1.2:t.size*.55+1)*18:(t.kind==='office'?t.size*8:t.kind==='park'?6:t.kind==='home'?t.size*4+11:t.size*3.5+7);
  const p=screen(b.x+t.size/2,b.y+t.size/2,height);let label=placeLabels.get(b.id);
  if(!label){const element=document.createElement('div'),name=document.createElement('strong'),counts=document.createElement('span');Object.assign(element.style,{position:'absolute',transform:'translate(-50%,-100%)',padding:'3px 6px',borderRadius:'6px',background:'#f8fcf4ed',border:'1px solid #d6e1ce',boxShadow:'0 2px 6px #173f3d20',color:'#173f3d',font:'9px/1.45 "Noto Sans Thai",Tahoma,sans-serif',whiteSpace:'nowrap',textAlign:'center'});Object.assign(name.style,{display:'block',fontWeight:'600'});counts.style.display='block';element.append(name,counts);placeLabelLayer.append(element);label={element,name,counts};placeLabels.set(b.id,label);}
  const visible=p[0]>-40&&p[0]<view.w+40&&p[1]>65&&p[1]<view.h-95;label.element.hidden=!visible;if(!visible)continue;
  label.element.style.left=p[0]+'px';label.element.style.top=(p[1]-5)+'px';
  if(refresh||!label.name.textContent){const traffic=buildingTraffic(b,placeLabelCounts);label.name.textContent=traffic.name;label.counts.textContent=traffic.approaching+'/'+traffic.parked+'/'+traffic.max;label.element.setAttribute('aria-label',traffic.name+' กำลังมา '+traffic.approaching+' คัน จอด '+traffic.parked+' คัน สูงสุด '+traffic.max+' คัน');}
 }
}
function draw(){if(renderer3d){renderer3d.render({state,cam,hover,drag,tool,selected,heat,debug,follow,CATALOG,ROADS,KINDS,junction,vehiclePosition,checkBuilding});updatePlaceLabels();return;}drawTerrain();drawRoads();const bs=[...state.buildings.values()].sort((a,b)=>a.y-b.y||a.x-b.x);for(const b of bs)drawBuilding(b);drawVehicles();updatePlaceLabels();if(follow&&state.vehicles.has(follow)){const v=state.vehicles.get(follow);ctx.strokeStyle='#ffe98d';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();v.path.slice(v.pos).forEach((i,n)=>{const p=xy(i),s=screen(p[0]+.5,p[1]+.5);n?ctx.lineTo(...s):ctx.moveTo(...s);});ctx.stroke();ctx.setLineDash([]);}
if(hover&&tool!=='hand'){if(CATALOG[tool])drawBuilding({key:tool,x:hover.x,y:hover.y},true);else{const cells=drag?.cells||[owner(id(hover.x,hover.y))];for(const i of cells){const [x,y]=xy(i),s=screen(x,y);ctx.fillStyle=tool.startsWith('erase')?'#df7e6c99':'#fbe3989c';ctx.fillRect(s[0],s[1],T*cam.z,T*cam.z*.78);}}}
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
 if(stats.pop&&stats.happy<=80){problems.push('ความสุข '+Math.round(stats.happy)+'% · ระบบหยุดรับคนย้ายเข้าเมื่อความสุขไม่เกิน 80%');if(!shortages.length&&!routePeople&&!stranded)add('happiness','ดูปัญหาของประชาชนที่ความสุขต่ำ แล้วแก้การเดินทาง งาน หรือบริการที่ยังขาด',null,true);}
 if(stats.net<0){problems.push('ประมาณการรายรับสุทธิติดลบ '+money(-stats.net)+' ต่อวัน');add('budget','ชะลอการสร้างที่ยังไม่มีผู้ต้องการ และดูรายรับกับค่าดูแลก่อนขยายเมือง');}
 const employed=[...state.citizens.values()].filter(c=>c.resident&&!c.removed&&c.workId&&!c.movingOut).length;if(employed)good.push('มีงานแล้ว '+employed+' คน');if(moving)good.push('รถกำลังเคลื่อนที่ '+moving+' คัน');const visitors=new Set();for(const b of state.buildings.values())for(const id of b.visitors)if(state.citizens.get(id)?.resident)visitors.add(id);if(visitors.size)good.push('กำลังใช้บริการในเมือง '+visitors.size+' คน');if(stats.net>=0)good.push('ประมาณการสุทธิ '+money(stats.net)+' ต่อวัน');if(stats.pop&&stats.happy>80)good.push('ความสุขยังเปิดรับคนย้ายเข้าได้');
 if(!next.length){if(!stats.pop)add('settle',demand.housing.free?'มีบ้านว่าง '+demand.housing.free+' ที่ รอคนเดินทางเข้าเมือง และเตรียมงานให้พร้อม':'รอการเดินทางย้ายเข้าที่จองบ้านไว้สำเร็จ');else add('steady','เมืองยังไม่มีความต้องการที่ค้างอยู่ เฝ้าดูช่วงเลิกงานก่อนขยายบริการเพิ่ม');}
 const headline=!demand.housing.buildings?'เริ่มเมืองจากบ้านหลังแรก':stranded+blockedDepartures+routePeople?'แก้การเดินทางก่อน เมืองจะเดินต่อได้':shortages.length?'มีบริการที่ชาวเมืองกำลังรอ':demand.jobs.people?'เติมงานให้ชาวเมือง':stats.net<0?'คุมค่าดูแลก่อนขยายเมือง':'เมืองกำลังเดินไปตามจังหวะของผู้คน';
 const overview='ตอนนี้มีชาวเมือง '+stats.pop+' คน ความสุข '+Math.round(stats.happy)+'%'+(stats.pop?' และมีบ้านว่าง '+demand.housing.free+' ที่':'')+' · ผู้รอบริการ '+serviceWaiting+' คน · รถทั้งหมด '+cars.length+' คัน'+(state.speed===0?' · เวลาหยุดอยู่ กดเล่นต่อเพื่อให้ระบบเดินหน้า':'');
 return{headline,overview,good:good.slice(0,3),problems:problems.slice(0,5),next:next.slice(0,3)};
}
function updateCityAdvisor(){
 const d=cityDemand(),advice=cityAdvice(d,state.stats),set=(id,html)=>{const el=$(id);if(el&&el.innerHTML!==html)el.innerHTML=html;},e=escapeSaveText;
 const small=t=>'<small>'+t+'</small>';
 const jobsLabel=d.jobs.people?'ต้องการงาน '+d.jobs.people+' คน':'ไม่มีผู้รองาน',housingLabel=d.housing.people?'ยังไม่มีบ้าน '+d.housing.people+' คน':'ไม่มีผู้ขาดที่อยู่';
 let html='<div class="need-card"><div><b>บ้าน</b><strong>'+housingLabel+'</strong></div>'+small('ว่าง '+d.housing.free+' ที่ · กำลังย้ายเข้า '+d.housing.incoming+' คน')+'</div><div class="need-card"><div><b>งาน</b><strong>'+jobsLabel+'</strong></div>'+small('สำนักงาน / โรงงาน / ธุรกิจ · ว่าง '+d.jobs.free+' ตำแหน่ง'+(d.jobs.unreachable?' · ไปไม่ถึง '+d.jobs.unreachable+' คน':''))+'</div>';
 for(const r of d.services){const detail=[];if(r.missing)detail.push('ยังไม่มีบริการ '+r.missing+' คน');if(r.full)detail.push('บริการเต็ม '+r.full+' คน');if(r.unreachable)detail.push('มีบริการ แต่ไปไม่ถึง '+r.unreachable+' คน');if(r.retrying)detail.push('รอลองเดินทางใหม่ '+r.retrying+' คน');html+='<div class="need-card'+(r.waiting?' has-need':'')+'"><div><b>'+r.label+'</b><strong>'+(r.waiting?'ต้องการ '+r.waiting+' คน':'ไม่มีผู้รอ')+'</strong></div>'+small(detail.join(' · ')||'ยังไม่มีความต้องการค้างในขณะนี้')+small('มี '+r.buildings+' แห่ง · ใช้อยู่ '+r.visiting+' คน · กำลังไป '+r.traveling+' คน · ว่าง '+r.free+'/'+r.capacity+' ที่')+'</div>';}
 set('demand',html);
 set('advisorHeadline',e(advice.headline));set('advisorOverview',e(advice.overview));set('advisorGood',advice.good.map(t=>'<li>'+e(t)+'</li>').join('')||'<li>เริ่มจากบ้านและถนน แล้วรอชีวิตเมืองเริ่มเดินทาง</li>');set('advisorProblems',advice.problems.map(t=>'<li>'+e(t)+'</li>').join('')||'<li>ยังไม่พบปัญหาที่ต้องเร่งแก้จากข้อมูลปัจจุบัน</li>');
 set('advisorNext',advice.next.map((a,i)=>'<li><span>'+e(a.text)+'</span>'+(a.report?'<button data-advice-report>ตรวจเมือง</button>':a.category?'<button data-advice-category="'+a.category+'">เปิดหมวดสร้าง</button>':'')+'</li>').join(''));
}

function updateUI(){const s=computeStats();$('money').textContent=money(state.money);$('population').innerHTML=fmt(s.pop)+' <em>คน</em>';$('happy').innerHTML=Math.round(s.happy)+'<em>%</em>';$('flow').innerHTML=Math.round(s.flow)+'<em>%</em>';$('clock').textContent=timeText(state.time);$('day').textContent=['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'][Math.floor(state.time/1440)%7]+' · วันที่ '+(Math.floor(state.time/1440)+1);$('sun').style.left=(state.time%1440)/1440*100+'%';$('net').textContent=(s.net>=0?'+':'')+money(s.net);$('net').classList.toggle('warning',s.net<0);const steps=[{done:[...state.roads.values()].some(r=>!r.main),text:'ต่อถนนเล็กจากถนนหลัก'},{done:s.homes>0,text:'สร้างบ้านติดถนน รอคนย้ายเข้า'},{done:s.jobs>0,text:'สร้างงานให้ประชาชน'}];$('steps').textContent=steps.filter(s=>s.done).length+' / 3';$('guide').innerHTML=steps.map((s,i)=>`<div class="guide-item ${s.done?'done':'current'}"><b>${s.done?'✓':i+1}</b><span>${s.text}</span></div>`).join('');updateCityAdvisor();$('news').innerHTML=news.slice(0,3).map(n=>`<div class="news-item"><time>${timeText(n.time)}</time>${n.text}</div>`).join('');const stranded=[...state.vehicles.values()].filter(v=>v.phase==='stuck'||v.departureNoRoute).length;$('status').textContent=stranded?'รถรอเส้นทาง '+stranded+' คัน · เมนู ☰ → ตรวจเมือง / รายงานบัค':s.pop?`รถเดินทาง ${state.vehicles.size} คัน · รอคิว ${s.waiting} คัน · คลิกที่รถเพื่อดูชีวิตประชาชน`:'ลากเพื่อเลื่อนแผนที่ · เลื่อนล้อเพื่อซูม';document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===state.speed));$('pause').textContent=state.speed?'Ⅱ':'▶';if(selected)renderInspector();}
function timeText(t){t=Math.floor(t%1440);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function computeStats(){let pop=0,happy=0,homes=0,freeHomes=0,jobs=0,unemployed=0,serviceNeed=0,tax=0,business=0,maint=0,waiting=0;for(const b of state.buildings.values()){const t=CATALOG[b.key];homes+=t.residents;freeHomes+=Math.max(0,t.residents-(b.residents?.size||0)-(b.reservedResidents||0));jobs+=t.jobs;maint+=t.maint;business+=(b.workers?.size||0)*50;}for(const c of state.citizens.values()){if(!c.resident||c.removed)continue;pop++;happy+=c.happy;if(c.profile.trait!==3&&!c.workId&&!c.movingOut)unemployed++;if(c.pending&&['shop','restaurant','mall','park','pub'].includes(c.pending.kind))serviceNeed++;if(!c.movingOut)tax+=c.late?250:500;}for(const r of state.roads.values())if(!r.main)maint+=ROADS[r.type].maint;for(const v of state.vehicles.values())if(v.wait>1||v.phase!=='driving')waiting++;const flow=state.vehicles.size?100*(1-waiting/state.vehicles.size):100;return state.stats={pop,happy:pop?happy/pop:100,homes,freeHomes,jobs,unemployed,serviceNeed,tax,business,maint,net:tax+business-maint,waiting,flow};}
const categories=[['roads','ถนน'],['home','บ้าน'],['work','งาน'],['food','ร้านค้า & อาหาร'],['leisure','พักผ่อน'],['manage','จัดการ']];
function renderTools(){ $('categories').innerHTML=categories.map(([k,n])=>`<button data-category="${k}" class="${category===k?'active':''}">${n}</button>`).join('');let items=[];if(category==='roads'){items=[{key:'hand',name:'สำรวจเมือง',icon:'↖',sub:'ลากเพื่อเลื่อน',price:'คลิกเพื่อตรวจสอบ'},...Object.entries(ROADS).map(([k,v])=>({key:k,name:v.name,icon:'═',sub:v.lanes+' เลน · '+v.maint+' / วัน',price:money(v.cost)+' / ช่อง'}))];}else if(category==='manage'){items=[{key:'hand',name:'สำรวจเมือง',icon:'↖',sub:'ติดตามชีวิต',price:'คลิกอาคารหรือรถ'},{key:'eraseRoad',name:'รื้อถนน',icon:'╳',sub:'ถนนหลักรื้อไม่ได้',price:'ค่ารื้อ 20%'},{key:'eraseBuilding',name:'รื้ออาคาร',icon:'⌫',sub:'คลิกอาคาร',price:'ค่ารื้อ 10%'}];}else{const kinds=category==='work'?['office','factory']:category==='food'?['shop','restaurant','mall']:category==='leisure'?['park','pub']:['home'];items=Object.values(CATALOG).filter(t=>kinds.includes(t.kind)).map(t=>({key:t.key,name:t.name,icon:KINDS[t.kind].icon,sub:t.size+'×'+t.size+' · '+(t.residents?t.residents+' คน':t.jobs+' งาน'),price:money(t.cost)}));}$('tools').innerHTML=items.map(t=>`<button class="tool ${tool===t.key?'active':''}" data-tool="${t.key}"><span class="tool-icon">${t.icon}</span><span><strong>${t.name}</strong><small>${t.sub}</small><small class="tool-price">${t.price}</small></span></button>`).join('');}
function selectTool(t){tool=t;renderTools();$('hint').textContent=ROADS[t]?`ลากจากถนนเดิมไปยังจุดที่ต้องการ · ${ROADS[t].name} ${ROADS[t].lanes} เลน · กด Esc เพื่อยกเลิก`:CATALOG[t]?`${CATALOG[t].name} · ${money(CATALOG[t].cost)} · ค่าดูแล ${money(CATALOG[t].maint)} / วัน · วางชิดขอบถนน`:t==='hand'?'ลากแผนที่เพื่อเลื่อน · คลิกอาคารหรือรถเพื่อดูรายละเอียด · หมุนล้อเพื่อซูม':'เลือกสิ่งที่ต้องการรื้อ · ระบบจะแสดงค่ารื้อก่อนยืนยัน';}
function modal(html){$('dialogContent').innerHTML=html;$('dialog').showModal();}
function closeModal(){$('dialog').close();}
const row=(a,b)=>`<div class="detail-row"><span>${a}</span><strong>${b}</strong></div>`;
const action=(name,key,value)=>`<button class="action" data-action="${key}" data-value="${value??''}">${name}</button>`;
function renderInspector(){
if(!selected)return;const s=computeStats();let html='';
if(selected.kind==='building'){const b=state.buildings.get(selected.id);if(!b){selected=null;$('inspector').classList.add('hidden');return;}const t=CATALOG[b.key];html=`<span class="tag">${KINDS[t.kind].icon} อาคาร #${b.id}</span><h2>${t.name}</h2>`+row('ขนาด',t.size+' × '+t.size)+row('ค่าดูแล / วัน',money(t.maint));if(t.residents)html+=row('ผู้อยู่อาศัย',b.residents.size+' / '+t.residents)+row('กำลังย้ายเข้า',b.reservedResidents+' คน');if(t.jobs)html+=row('พนักงาน',b.workers.size+' / '+t.jobs);if(t.service)html+=row('ผู้ใช้บริการ',b.visitors.size+' / '+t.service)+row('จองเดินทางมา',b.reservedService+' คน');html+=row('รถกำลังเดินทางมา',buildingTraffic(b).approaching+' คัน')+row('รถจอด / รองรับสูงสุด',b.parked.size+' / '+buildingTraffic(b).max+' คัน')+row('รอออกจากอาคาร',b.queue.length+' คัน')+row('รอเส้นทาง',[...b.queue].filter(id=>state.vehicles.get(id)?.departureNoRoute).length+' คัน')+row('เดินทางมาถึง',b.arrivals+' ครั้ง')+'<h3>การเข้าออก</h3><p>เข้าออกจากขอบทางฝั่งซ้ายตามทิศรถ หากอยู่คนละฝั่ง รถต้องวนกลับตามเส้นทาง</p>';const people=[...b.residents,...b.workers].slice(0,24);if(people.length)html+='<h3>ประชาชน</h3><div class="inspect-list">'+people.map(c=>action(citizenName(state.citizens.get(c)), 'citizen',c)).join('')+'</div>';html+=action('รื้ออาคารนี้','demolish',b.id);}
else if(selected.kind==='citizen'||selected.kind==='vehicle'){const v=selected.kind==='vehicle'?state.vehicles.get(selected.id):null,c=selected.kind==='citizen'?state.citizens.get(selected.id):v?.citizenId?state.citizens.get(v.citizenId):null;if(!c&&!v){html='<h2>เดินทางถึงจุดหมายแล้ว</h2><p>รถคันนี้เดินทางเสร็จแล้ว เลือกอาคารปลายทางเพื่อดูประชาชนต่อค่ะ</p>';}else if(c){const cv=state.vehicles.get(c.vehicleId);html=`<span class="tag">ชีวิตประชาชน #${c.id}</span><h2>${citizenName(c)}</h2>`+row('ไลฟ์สไตล์',['ขยัน','ชิล ๆ','สายชิล','บ้านรวย'][c.profile.trait])+row('สถานะ',c.state)+row('ความสุข',Math.round(c.happy)+'%')+row('ภาษีวันนี้',money(c.late?250:500))+row('บ้าน',buildingName(c.homeId))+row('งาน',c.profile.trait===3?'ไม่ต้องทำงาน':buildingName(c.workId))+row('ปัญหาล่าสุด',c.problem||'ยังไม่มีปัญหา');if(cv)html+=row('การเดินทาง',TRIPS[cv.kind].name)+row('จุดหมาย',cv.toId?buildingName(cv.toId):'ประตูเมือง')+row('เวลารอ',Math.floor(cv.wait)+' นาที')+action(follow===cv.id?'หยุดติดตามรถ':'ติดตามรถและเส้นทาง','follow',cv.id)+vehicleRecoveryActions(cv);html+='<h3>ตารางชีวิต</h3>'+row('ออกทำงาน',c.profile.trait===3?'—':timeText(c.profile.leave))+row('เลิกงาน',c.profile.trait===3?'—':timeText(c.profile.end))+row('กิจกรรมโปรด',KINDS[c.profile.leisure]?.name||'กลับบ้าน');if(c.history.length)html+='<h3>การเดินทางล่าสุด</h3><p>'+c.history.slice(-4).reverse().join('<br>')+'</p>';}
else html='<span class="tag">รถภายนอก</span><h2>เดินทางผ่านเมือง</h2><p>รถจากประตูเมืองหนึ่งไปอีกประตูเมืองหนึ่ง ไม่มีประชาชนเจ้าของในเมืองนี้</p>'+action('ติดตามเส้นทาง','follow',v.id)+vehicleRecoveryActions(v);}
else if(selected.kind==='road'){const r=state.roads.get(selected.id);if(!r){$('inspector').classList.add('hidden');return;}const t=ROADS[r.type],j=junction(selected.id);html='<span class="tag">โครงข่ายจราจร</span><h2>'+t.name+'</h2>'+row('จำนวนเลน',t.lanes+' เลน')+row('ความจุจริง',t.lanes+' คัน / ช่อง')+row('รถในช่องนี้',occupancy(selected.id)+' คัน')+row('ค่าดูแล / วัน',r.main?'ฟรี':money(t.maint))+row('ทางแยก',j===4?'สี่แยก · ไฟจราจร':j===3?'สามแยก · ไฟจราจร':j===1?'ทางตัน · กลับรถไม่ได้':'ถนนต่อเนื่อง')+'<p>'+(r.main?'ถนนหลักเริ่มต้นของเมือง รื้อไม่ได้':'รถขับชิดซ้ายและใช้เลนตามเส้นทาง เมื่อเต็มจะรอคิว')+'</p>';}
else if(selected.kind==='money')html='<span class="tag">การคลังเมือง</span><h2>งบประมาณ</h2>'+row('เงินคงเหลือ',money(state.money))+row('ภาษีประชาชน / วัน',money(s.tax))+row('ภาษีธุรกิจ / วัน',money(s.business))+row('ค่าดูแลทั้งหมด / วัน',money(s.maint))+row('สุทธิ / วัน',money(s.net))+'<p>ประชาชนจ่ายภาษี 500 บาทต่อวัน หากไปสาย ภาษีของคนนั้นลดครึ่งหนึ่ง ถนนหลักไม่มีค่าดูแล</p>';
else if(selected.kind==='population')html='<span class="tag">ผู้คนในเมือง</span><h2>ประชากร '+s.pop+' คน</h2>'+row('กำลังย้ายเข้า',[...state.citizens.values()].filter(c=>!c.resident&&!c.removed).length+' คน')+row('ที่ว่างในบ้าน',s.freeHomes+' คน')+row('ตำแหน่งงานทั้งหมด',s.jobs)+row('ว่างงาน',s.unemployed+' คน')+'<p>มีบ้านว่าง เส้นทางจากประตูเมือง และความสุขมากกว่า 80% จึงจะมีคนย้ายเข้า คนจะนับเป็นประชากรเมื่อเดินทางถึงบ้านจริง</p><div class="inspect-list">'+[...state.citizens.values()].filter(c=>c.resident&&!c.removed).slice(0,40).map(c=>action(citizenName(c),'citizen',c.id)).join('')+'</div>';
else if(selected.kind==='happiness')html='<span class="tag">คุณภาพชีวิต</span><h2>ความสุข '+Math.round(s.happy)+'%</h2>'+row('มีความสุข',[...state.citizens.values()].filter(c=>c.resident&&c.happy>=80).length+' คน')+row('กำลังมีปัญหา',[...state.citizens.values()].filter(c=>c.resident&&c.happy<55).length+' คน')+'<p>ไปทำงานและใช้บริการทันเวลาช่วยให้มีความสุข รถติด ไปสาย ไม่มีงาน และขาดบริการทำให้ความสุขลดลง</p><p>ต่ำกว่า 25% หรือว่างงาน 2 วัน ประชาชนจะเตรียมย้ายออก</p>';
else html='<span class="tag">การเดินทาง</span><h2>จราจรในเมือง</h2>'+row('รถทั้งหมด',state.vehicles.size+' คัน')+row('กำลังรอ',s.waiting+' คัน')+row('ความคล่องตัว',Math.round(s.flow)+'%')+'<p>คลิกที่รถเพื่อดูว่าของใคร กำลังไปไหน และติดอยู่เพราะอะไร เพิ่มเลนหรือกระจายงานและบริการให้ใกล้บ้านช่วยลดการเดินทาง</p>'+action(heat?'ปิดแผนที่รถติด':'เปิดแผนที่รถติด','heat');
$('inspector').classList.remove('hidden');$('inspectContent').innerHTML=html;
}
function buildingName(i){const b=state.buildings.get(i);return b?CATALOG[b.key].name+' #'+i:'ยังไม่มี';}
function citizenName(c){return c?['กานต์','ต้น','พลอย','มะลิ','นนท์','แพรว','ภูมิ','ฟ้า','บีม','อิง','พีท','ข้าวหอม'][c.id%12]+' #'+c.id:'ประชาชน';}
const TRIPS={moveIn:{name:'ย้ายเข้า',color:'#8cdd91'},work:{name:'ไปทำงาน',color:'#70b4e8'},home:{name:'กลับบ้าน',color:'#f4f0dc'},leisure:{name:'พักผ่อน',color:'#e897bf'},moveOut:{name:'ย้ายออก',color:'#e57865'},pass:{name:'ผ่านเมือง',color:'#edc863'}};
function accessFor(b){
const t=CATALOG[b.key],s=t.size,cx=b.x+s/2,cy=b.y+s/2,result=[];
for(let y=b.y-1;y<=b.y+s;y++)for(let x=b.x-1;x<=b.x+s;x++){
if(!valid(x,y)||x!==b.x-1&&x!==b.x+s&&y!==b.y-1&&y!==b.y+s)continue;
const n=owner(id(x,y)),r=state.roads.get(n);if(!r||result.some(a=>a.node===n))continue;
const [nx,ny]=xy(n),dx=cx-(nx+.5),dy=cy-(ny+.5),prev=[],next=[];
for(const neighbor of r.links){const [px,py]=xy(neighbor),ax=nx-px,ay=ny-py;if(ay*dx-ax*dy>.1)prev.push(neighbor);const ex=px-nx,ey=py-ny;if(ey*dx-ex*dy>.1)next.push(neighbor);}
if(prev.length&&next.length)result.push({node:n,prev,next,score:Math.abs(dx)+Math.abs(dy)});
}return result.sort((a,b)=>a.score-b.score).slice(0,12);
}
class Heap{constructor(){this.items=[];}push(item){let a=this.items;a.push(item);let i=a.length-1;while(i){let p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p;}a[i]=item;}pop(){let a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(true){let c=i*2+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return first;}get length(){return this.items.length;}}
function route(start,end,firstNext=null,finalPrev=null,previousNode=null){
if(!state.roads.has(start)||!state.roads.has(end))return null;
const cacheKey=[state.version,start,end,firstNext?.join('.')||'',finalPrev?.join('.')||'',previousNode??-1].join('|');if(state.routeCache.has(cacheKey))return state.routeCache.get(cacheKey);
const heap=new Heap(),g=new Map(),came=new Map(),origin=`${start}:${previousNode??-1}`;heap.push({node:start,prev:previousNode??-1,key:origin,g:0,f:distance(start,end)});g.set(origin,0);let count=0;
while(heap.length&&count++<35000){const cur=heap.pop();if(cur.g!==g.get(cur.key))continue;if(cur.node===end&&cur.key!==origin&&(!finalPrev||finalPrev.includes(cur.prev))){const path=[];let key=cur.key;while(key){path.push(+key.split(':')[0]);key=came.get(key);}path.reverse();if(state.routeCache.size>1500)state.routeCache.clear();state.routeCache.set(cacheKey,path);return path;}
const r=state.roads.get(cur.node);for(const n of r.links){if(cur.key===origin&&firstNext&&!firstNext.includes(n))continue;if(n===cur.prev)continue;const key=`${n}:${cur.node}`,cost=cur.g+distance(cur.node,n)+(n===cur.prev?2:0);if(cost>=(g.get(key)??Infinity))continue;g.set(key,cost);came.set(key,cur.key);heap.push({node:n,prev:cur.node,key,g:cost,f:cost+distance(n,end)});}}
if(state.routeCache.size>1500)state.routeCache.clear();state.routeCache.set(cacheKey,null);return null;
}
function tripRoute(fromId,toId,fromGate,toGate){const from=state.buildings.get(fromId),to=state.buildings.get(toId),aa=from?from.access:[{node:fromGate,next:null}],bb=to?to.access:[{node:toGate,prev:null}];if(!aa?.length||!bb?.length)return null;const candidates=[];for(const a of aa)for(const b of bb)candidates.push({a,b,d:distance(a.node,b.node)});candidates.sort((a,b)=>a.d-b.d);for(const pair of candidates.slice(0,32)){const p=route(pair.a.node,pair.b.node,pair.a.next,pair.b.prev);if(p)return p;}return null;}
function profile(i){const trait=i%4;return{trait,leave:370+(i*13)%220,end:1030+(i*19)%120,leisure:trait===0?['restaurant',null,'park',null][Math.floor(i/4)%4]:['restaurant','mall',trait===1?'shop':'pub','park'][Math.floor(i/4)%4]};}
function newCitizen(home){const c={id:state.nextId++,profile:profile(state.profileSeq++%100),homeId:home.id,workId:null,location:'gate',locationId:null,resident:false,removed:false,movingOut:false,happy:82,state:'กำลังย้ายเข้า',vehicleId:null,queued:null,pending:null,late:false,unemployed:0,problem:'',history:[],scheduled:new Set(),pain:0,failKinds:new Set()};state.citizens.set(c.id,c);return c;}
function schedule(c,at,action,extra={}){if(!c||c.removed)return;state.events.push({citizenId:c.id,at,action,...extra});state.events.sort((a,b)=>a.at-b.at);}
function scheduleDay(c,day){if(c.scheduled.has(day)||c.removed||c.movingOut)return;c.scheduled.add(day);if(c.scheduled.size>4)c.scheduled.delete(Math.min(...c.scheduled));const base=day*1440,p=c.profile,weekday=day%7,works=p.trait!==3&&weekday<(p.trait===2?4:5),jitter=(c.id%11)*.35;
if(works){const leave=base+p.leave+jitter;if(leave>state.time)schedule(c,leave,'work');else if(state.time<base+615)schedule(c,state.time+1+jitter,'work');schedule(c,Math.max(state.time+2,base+p.end+jitter),'afterWork');}
else if(p.trait===3){const at=base+840+(c.id%6)*25+jitter;if(at>state.time)schedule(c,at,'leisure',{kind:['mall','restaurant','pub'][c.id%3],end:base+1620});}
else{const at=base+540+(c.id*9)%180+jitter;if(at>state.time&&p.leisure)schedule(c,at,'leisure',{kind:p.leisure,end:base+960+(c.id*5)%210});}}
function assignJob(c){if(c.profile.trait===3||c.movingOut||c.removed)return;const old=state.buildings.get(c.workId);if(old&&old.workers.has(c.id))return;const home=state.buildings.get(c.homeId);if(!home)return;let best=null,score=Infinity;for(const b of state.buildings.values()){const t=CATALOG[b.key];if(t.jobs<=b.workers.size)continue;const sc=Math.abs(b.x-home.x)+Math.abs(b.y-home.y)+b.workers.size/t.jobs*12;if(sc<score){score=sc;best=b;}}if(best){c.workId=best.id;best.workers.add(c.id);c.unemployed=0;}else c.workId=null;}
function pain(c,amount,problem,key){if(!c||c.removed)return;if(key&&c.failKinds.has(key))return;if(key)c.failKinds.add(key);c.happy=Math.max(0,c.happy-amount);c.pain+=amount;c.problem=problem;}
function reward(c,amount,cap){c.happy=Math.max(c.happy,Math.min(cap,c.happy+amount));}
function pending(c,action,extra={},problem='ไม่มีเส้นทาง'){const attempts=(c.pending?.attempts||0)+1;c.pending={action,...extra,attempts,next:state.time+Math.min(45,8+attempts*2)+(c.id%7),expires:state.time+360};c.problem=problem;}
function runAction(c,action,extra={}){if(!c||c.removed||!c.resident)return;if(c.vehicleId){c.queued={action,...extra};return;}if(c.movingOut&&action!=='moveOut')return;const day=Math.floor(state.time/1440),base=day*1440;c.pending=null;
if(action==='work'){assignJob(c);if(!c.workId){pain(c,10,'ไม่มีตำแหน่งงานว่าง','nojob');pending(c,'work',{},'ไม่มีตำแหน่งงานว่าง');return;}if(state.time%1440>c.profile.end)return;attemptLife(c,'work',c.workId,base+630);}
else if(action==='home'){if(c.locationId===c.homeId){c.state='อยู่บ้าน';return;}attemptLife(c,'home',c.homeId,base+1430);}
else if(action==='afterWork'){if(c.profile.leisure&&state.time%1440<1260)runAction(c,'leisure',{kind:c.profile.leisure,end:base+(c.profile.leisure==='pub'?1410:1260)});else runAction(c,'home');}
else if(action==='leisure'){const end=extra.end||base+1260;if(state.time>=end){runAction(c,'home');return;}const origin=state.buildings.get(c.locationId)||state.buildings.get(c.homeId),candidates=[...state.buildings.values()].filter(b=>CATALOG[b.key].kind===extra.kind&&b.visitors.size+b.reservedService<CATALOG[b.key].service);candidates.sort((a,b)=>(Math.abs(a.x-origin.x)+Math.abs(a.y-origin.y)+(a.visitors.size+a.reservedService)/CATALOG[a.key].service*18)-(Math.abs(b.x-origin.x)+Math.abs(b.y-origin.y)+(b.visitors.size+b.reservedService)/CATALOG[b.key].service*18));if(!candidates.length){pain(c,9,'ต้องการ'+KINDS[extra.kind].name,'service-'+extra.kind);pending(c,'leisure',{kind:extra.kind,end},c.problem);return;}const b=candidates[0];if(c.locationId===b.id){schedule(c,end,'home');return;}attemptLife(c,'leisure',b.id,Math.min(end,state.time+180),{activityEnd:end,serviceKind:extra.kind});}
else if(action==='moveOut'){c.movingOut=true;c.state='เตรียมย้ายออก';const from=state.buildings.get(c.locationId)||state.buildings.get(c.homeId);const gates=[...state.gates].sort((a,b)=>distance(id(from.x,from.y),a)-distance(id(from.x,from.y),b));for(const gate of gates)if(createTrip(c,'moveOut',from.id,null,null,gate,state.time+1440))return;pending(c,'moveOut',{},'ไม่มีเส้นทางออกจากเมือง');}}
function attemptLife(c,kind,toId,deadline,extra={}){if(c.locationId===toId)return true;const from=c.locationId||c.homeId;if(createTrip(c,kind,from,toId,null,null,deadline,extra))return true;pain(c,12,'ไม่มีเส้นทางไป'+buildingName(toId),'route-'+kind);pending(c,kind==='leisure'?'leisure':kind,{kind:extra.serviceKind,end:extra.activityEnd},c.problem);return false;}
function plannedLane(v,pos){return motionPlan(v).lanes[pos]??0;}
function occKey(i,d,l){return `${i}:${d}:${l}`;}
function cellAvailable(i,d,l,vid){const r=state.roads.get(i);if(!r)return false;const key=occKey(i,d,l),o=state.occ.get(key),res=state.reservations.get(key);if(o&&o!==vid||res&&res.id!==vid)return false;const cap=ROADS[r.type].lanes/2;let same=0,total=0;for(let dd=0;dd<4;dd++)for(let ll=0;ll<4;ll++){const o=state.occ.get(occKey(i,dd,ll));if(o&&o!==vid){total++;if(dd===d)same++;}}return l<cap&&same<cap&&total<cap*2;}
function occupy(v,pos){const i=v.path[pos],d=dir(i,v.path[Math.min(pos+1,v.path.length-1)]),l=plannedLane(v,pos);v.lane=l;v.occKey=occKey(i,d,l);state.occ.set(v.occKey,v.id);}
function release(v,keepIntersection=false){if(v.occKey&&state.occ.get(v.occKey)===v.id)state.occ.delete(v.occKey);v.occKey=null;if(!keepIntersection){clearVehicleReservations(v);v.junctionPasses=[];v.committedJunction=null;}}
function createTrip(c,kind,fromId,toId,fromGate,toGate,deadline,extra={}){if(c?.vehicleId)return false;if(kind==='pass'&&state.vehicles.size>=8000)return false;const path=tripRoute(fromId,toId,fromGate,toGate);if(!path)return false;const to=state.buildings.get(toId),from=state.buildings.get(fromId);if(kind==='leisure'&&to.visitors.size+to.reservedService>=CATALOG[to.key].service)return false;
const v={id:state.nextId++,trafficModel:2,noUTurnPolicy:1,citizenId:c?.id||null,kind,fromId,toId,fromGate,toGate,path:[...path],pathSet:new Set(path),pos:0,progress:0,lane:0,laneSeed:Math.abs(state.nextId)%4,speed:0,phase:from?'departing':'gate_waiting',wait:0,lastPain:0,deadline,late:false,color:TRIPS[kind].color,version:state.version,activityEnd:extra.activityEnd,serviceKind:extra.serviceKind,residentReservation:kind==='moveIn',serviceReservation:kind==='leisure',retryAt:0,occKey:null,stopReason:'',committedJunction:null,departureRouteVersion:state.version};state.vehicles.set(v.id,v);if(kind==='moveIn')to.reservedResidents++;if(kind==='leisure')to.reservedService++;
if(from)from.queue.push(v.id);if(c){c.vehicleId=v.id;c.location=from?CATALOG[from.key].kind:'travel';c.state=from?'รอออกเดินทาง':TRIPS[kind].name;c.history.push(timeText(state.time)+' '+TRIPS[kind].name+' → '+(to?CATALOG[to.key].name:'ประตูเมือง'));c.history=c.history.slice(-12);}return true;}
function arrive(v){release(v);state.vehicles.delete(v.id);updateTrafficSpatial(v);const from=state.buildings.get(v.fromId);if(from)from.queue=from.queue.filter(i=>i!==v.id);const b=state.buildings.get(v.toId),c=state.citizens.get(v.citizenId);if(v.residentReservation&&b)b.reservedResidents=Math.max(0,b.reservedResidents-1);if(v.serviceReservation&&b)b.reservedService=Math.max(0,b.reservedService-1);if(!c)return;c.vehicleId=null;
if(v.kind==='moveOut'){removeCitizen(c);addNews(citizenName(c)+' ย้ายออกจากเมือง');return;}if(!b){c.location='home';c.locationId=c.homeId;c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);return;}
b.arrivals++;b.parked.add(c.id);c.locationId=b.id;c.location=CATALOG[b.key].kind;
if(v.kind==='moveIn'){c.resident=true;b.residents.add(c.id);c.state='อยู่บ้าน';assignJob(c);scheduleDay(c,Math.floor(state.time/1440));if(computeStats().pop<=5)addNews(citizenName(c)+' ย้ายมาถึงบ้านแล้ว');}
else if(v.kind==='work'){c.state=v.late?'อยู่ที่ทำงาน · มาสาย':'อยู่ที่ทำงาน';if(v.late)pain(c,4,'ไปทำงานสาย');else reward(c,20,92);if(state.time%1440>=c.profile.end)c.queued={action:'afterWork'};}
else if(v.kind==='leisure'){b.visitors.add(c.id);c.state='อยู่'+KINDS[CATALOG[b.key].kind].name;if(v.late)pain(c,3,'ไปกิจกรรมสาย');else reward(c,15,94);schedule(c,Math.max(state.time+10,v.activityEnd||state.time+90),'home');}
else{c.state='อยู่บ้าน';reward(c,5,90);}if(c.queued){const q=c.queued;c.queued=null;schedule(c,state.time+.5,q.action,q);}}
function removeCitizen(c){if(c.vehicleId)cancelVehicle(state.vehicles.get(c.vehicleId));for(const b of state.buildings.values()){b.residents.delete(c.id);b.workers.delete(c.id);b.visitors.delete(c.id);b.parked.delete(c.id);}c.resident=false;c.removed=true;c.vehicleId=null;c.pending=null;c.queued=null;state.events=state.events.filter(e=>e.citizenId!==c.id);state.citizens.delete(c.id);}
function cancelVehicle(v){if(!v)return;release(v);const b=state.buildings.get(v.toId),from=state.buildings.get(v.fromId);if(b&&v.residentReservation)b.reservedResidents=Math.max(0,b.reservedResidents-1);if(b&&v.serviceReservation)b.reservedService=Math.max(0,b.reservedService-1);if(from)from.queue=from.queue.filter(i=>i!==v.id);state.vehicles.delete(v.id);updateTrafficSpatial(v);const c=state.citizens.get(v.citizenId);if(c)c.vehicleId=null;}
// Route recovery is bounded per simulation step and respects the current heading.
function remainingRouteValid(v){for(let k=v.pos;k<v.path.length;k++)if(!state.roads.has(v.path[k])||k+1<v.path.length&&!state.roads.get(v.path[k]).links.has(v.path[k+1]))return false;return true;}
function strandVehicle(v,reason){const pose=vehiclePosition(v);release(v);v.phase='stuck';v.heldPose=pose;v.speed=0;v.stopReason=reason;v.nextRouteRetry=state.time;v.recoveryVersion=-1;if(state.roads.has(v.path[v.pos]))occupy(v,v.pos);}
function recoveryDue(v){return v.recoveryVersion!==state.version||!(v.nextRouteRetry>state.time);}
function recoverVehicle(v,force=false){
 if(!v||v.phase!=='stuck'||!force&&!recoveryDue(v))return false;
 v.recoveryVersion=state.version;v.nextRouteRetry=state.time+8+v.id%3;
 const current=v.path[v.pos],previous=v.pos?v.path[v.pos-1]:null,next=v.path[v.pos+1],pose=vehiclePosition(v);let path=null;
 const forward=v.progress>1e-6&&next!=null?[next]:[...(state.roads.get(current)?.links||[])].filter(n=>{const d=DIR[dir(current,n)];return !pose||d[0]*(pose.dx??0)+d[1]*(pose.dy??0)>=-.05;}),target=state.buildings.get(v.toId);
 for(const access of target?.access||(!v.toId?[{node:v.toGate??v.path.at(-1),prev:null}]:[])){path=route(current,access.node,forward,access.prev,previous);if(path)break;}
 if(!path){v.stopReason='ไม่มีเส้นทางที่ห้ามกลับรถ · รอเชื่อมถนนหรือลากรถออก';return false;}
 const probe={...v,path,pathSet:new Set(path),pos:0,progress:0,motionStartPose:pose,motionSeedLane:v.lane,turnLanes:{},junctionPasses:[],junctionQueueSince:{},trafficModel:2,heldPose:null,phase:'driving'};
 const lane=plannedLane(probe,0);if(!cellAvailable(path[0],dir(path[0],path[1]),lane,v.id)){v.stopReason='พบเส้นทางแล้ว · รอช่องถนนว่าง';return false;}
 release(v);Object.assign(v,probe);v.noUTurnPolicy=1;v.speed=0;v.wait=0;v.stopReason='';v.routeCheckedVersion=state.version;occupy(v,0);updateTrafficSpatial(v);return true;
}
function checkDepartureRoute(v){
 const path=tripRoute(v.fromId,v.toId,v.fromGate??v.path[0],v.toGate??v.path.at(-1));v.departureRouteVersion=state.version;v.nextDepartureRouteRetry=state.time+8+v.id%3;
 if(!path){release(v);const from=state.buildings.get(v.fromId),c=state.citizens.get(v.citizenId);if(from&&c){from.parked.add(c.id);c.locationId=from.id;c.location=CATALOG[from.key].kind;c.state='รอเส้นทางออกจากอาคาร';}v.departureNoRoute=true;v.stopReason='ไม่มีเส้นทางออกไปยังจุดหมาย · รออยู่ในอาคาร/ประตู';return false;}
 v.path=[...path];v.pathSet=new Set(path);v.pos=0;v.progress=0;v.motionStartPose=null;v.heldPose=null;v.turnLanes={};v.junctionQueueSince={};v.departureNoRoute=false;v.stopReason='';v.noUTurnPolicy=1;return true;
}
function canTowVehicle(v){return !!v&&(v.phase==='stuck'||v.departureNoRoute||v.wait>=48);}
function towVehicle(id){
 const v=state.vehicles.get(id);if(!canTowVehicle(v))return false;
 const c=state.citizens.get(v.citizenId),from=state.buildings.get(v.fromId);cancelVehicle(v);
 if(c){if(!c.resident){removeCitizen(c);}else{let origin=from||state.buildings.get(c.homeId);if(origin&&CATALOG[origin.key].service&&origin.visitors.size>=CATALOG[origin.key].service)origin=state.buildings.get(c.homeId);
  for(const b of state.buildings.values()){b.parked.delete(c.id);b.visitors.delete(c.id);}if(origin){origin.parked.add(c.id);if(CATALOG[origin.key].service)origin.visitors.add(c.id);c.locationId=origin.id;c.location=CATALOG[origin.key].kind;}else{c.locationId=null;c.location='home';}
  c.state='ยกเลิกเที่ยวเดินทาง · อยู่'+(origin?CATALOG[origin.key].name:'ที่พัก');c.problem='รถถูกลากออก เที่ยวเดินทางไม่สำเร็จ';c.pending=null;c.queued=null;c.history.push(timeText(state.time)+' ยกเลิกเที่ยวเดินทาง · ลากรถออก');c.history=c.history.slice(-12);
 }}
 if(follow===id)follow=null;return true;
}
function vehicleRecoveryActions(v){if(!v)return '';return row('เหตุผลที่หยุด',escapeSaveText(v.stopReason||(['departing','gate_waiting'].includes(v.phase)?'รอออกเดินทาง':'กำลังเดินทาง')))+(v.phase==='stuck'||v.departureNoRoute?action('ลองหาเส้นทางใหม่','reroute',v.id):'')+(canTowVehicle(v)?action('ลากรถออก / ยกเลิกเที่ยว','tow',v.id):'');}
function immigration(){if(computeStats().happy<=80)return;let n=0;for(const b of state.buildings.values()){const t=CATALOG[b.key];if(!t.residents||!b.access.length||b.failedRouteVersion===state.version)continue;const free=t.residents-b.residents.size-b.reservedResidents;for(let k=0;k<free&&n<16;k++){const c=newCitizen(b);const gates=[...state.gates].sort((a,z)=>distance(a,id(b.x,b.y))-distance(z,id(b.x,b.y)));let success=false;for(const gate of gates)if(createTrip(c,'moveIn',null,b.id,gate,null,state.time+1440)){success=true;n++;break;}if(!success){state.citizens.delete(c.id);b.failedRouteVersion=state.version;break;}}if(n>=16)break;}}
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
 return state.time-request.at>=SIGNAL_CYCLE_MINUTES?0:priority;
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
function junctionExitAvailable(v,pos){for(let k=pos;k<=Math.min(v.path.length-1,pos+TRAFFIC_RULES.maxIntersectionLookahead);k++)if(!cellAvailable(v.path[k],motionDirection(v.path,k),plannedLane(v,k),v.id))return false;return true;}
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
 if(!trafficSpatial)return;const old=trafficSpatial.cars.get(v.id);if(old){const cell=trafficSpatial.cells.get(old.key);cell?.delete(v.id);if(!cell?.size)trafficSpatial.cells.delete(old.key);trafficSpatial.cars.delete(v.id);}
 if(!state.vehicles.has(v.id)||(v.phase!=='driving'&&!(v.phase==='stuck'&&v.heldPose)))return;const pose=vehiclePosition(v),key=Math.floor(pose.x/2)+':'+Math.floor(pose.y/2);let cell=trafficSpatial.cells.get(key);if(!cell)trafficSpatial.cells.set(key,cell=new Map());const record={id:v.id,pose,key};cell.set(v.id,record);trafficSpatial.cars.set(v.id,record);
}
function physicalTrafficLimit(v,plan,s,lookahead){
 if(!trafficSpatial)return Infinity;const end=Math.min(plan.total,s+lookahead),origin=positionOnMotion(plan,s),x=Math.floor(origin.x/2),y=Math.floor(origin.y/2),key=x+':'+y;let cached=trafficSpatial.candidates.get(v.id),candidates=cached?.key===key?cached.ids:null;
 if(!candidates){candidates=[];for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(const other of trafficSpatial.cells.get((x+dx)+':'+(y+dy))?.values()||[])if(other.id!==v.id)candidates.push(other.id);trafficSpatial.candidates.set(v.id,{key,ids:candidates});}
 if(!candidates.length)return Infinity;
 const piece=plan.pieces.find(p=>p.line&&p.startDistance<=s&&p.endDistance>=end),near=[];
 for(const id of candidates){const record=trafficSpatial.cars.get(id);if(!record)continue;const p=record.pose,x=p.x-origin.x,y=p.y-origin.y;if(x*x+y*y>(lookahead+.7)*(lookahead+.7))continue;if(piece&&origin.dx!=null&&p.dx!=null&&Math.abs(origin.dx*p.dy-origin.dy*p.dx)<.01&&Math.abs(x*origin.dy-y*origin.dx)>=.32)continue;near.push(p);}
 if(!near.length)return Infinity;let safe=s;
 for(let next=s+.1;next<=end+.099;next+=.1){const along=Math.min(end,next),p=positionOnMotion(plan,along);for(const other of near)if(capsulesOverlap(p,other))return Math.max(s,safe-.025);safe=along;if(along===end)break;}
 return Infinity;
}
function motionBarrier(v,plan,s,budget=-1){
 const physical=physicalTrafficLimit(v,plan,s,Math.min(3,Math.max(.8,(v.speed||0)*(v.speed||0)/9.6+.3,budget>=0?budget+.1:0)));
 let limit=physical,reason=Number.isFinite(physical)?'เว้นระยะรถ':'';
 const nextPos=v.pos+1;
 if(nextPos<v.path.length&&!cellAvailable(v.path[nextPos],motionDirection(v.path,nextPos),plannedLane(v,nextPos),v.id)){
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
 if(!replacement){v.heldPose=pose;v.phase='stuck';v.speed=0;v.stopReason='ห้ามกลับรถ · ต้องสร้างถนนวนให้ถึงปลายทาง';const from=state.buildings.get(v.fromId);if(from)from.queue=from.queue.filter(id=>id!==v.id);if(state.roads.has(current))occupy(v,v.pos);return;}
 v.motionStartPose=pose;v.motionSeedLane=v.lane;v.path=replacement;v.pathSet=new Set(replacement);v.pos=0;v.progress=0;v.turnLanes={};v.trafficModel=2;v.heldPose=null;v.stopReason='';
 if(v.phase==='driving')occupy(v,0);
}
function advanceVehicles(realDt,gameDt){
 let routeBudget=2;const gateAttempt=new Set(),simDt=Math.max(0,realDt*state.speed);for(const car of state.vehicles.values()){if(['departing','gate_waiting'].includes(car.phase)){if(car.noUTurnPolicy!==1){car.departureRouteVersion=-1;car.noUTurnPolicy=1;}}else enforceNoUTurn(car);}const requests=[];for(const car of state.vehicles.values()){let at=null;if(car.phase==='stuck'&&recoveryDue(car))at=car.recoveryVersion!==state.version?-1:car.nextRouteRetry??-1;else if(['departing','gate_waiting'].includes(car.phase)&&!(car.retryAt>state.time)&&(car.departureRouteVersion!==state.version||car.departureNoRoute&&!(car.nextDepartureRouteRetry>state.time)))at=car.departureRouteVersion!==state.version?-1:car.nextDepartureRouteRetry??-1;if(at!=null){requests.push({id:car.id,at});requests.sort((a,b)=>a.at-b.at||a.id-b.id);if(requests.length>2)requests.pop();}}const routeChecks=new Set(requests.map(r=>r.id));prepareJunctionQueues();trafficSpatial={cells:new Map(),cars:new Map(),candidates:new Map()};for(const car of state.vehicles.values())updateTrafficSpatial(car);
 for(const v of [...state.vehicles.values()]){
  if(!state.vehicles.has(v.id))continue;
  const c=state.citizens.get(v.citizenId);
  if(v.deadline&&state.time>v.deadline&&!['pass','moveIn'].includes(v.kind)){
   if(!v.late){v.late=true;if(c){c.late=true;pain(c,3,'เดินทางสาย');}}
   else if(c&&state.time-(v.lastLate||v.deadline)>60){pain(c,1,'เดินทางล่าช้าต่อเนื่อง');v.lastLate=state.time;}
  }
  if(v.phase==='gate_waiting'||v.phase==='departing'){
   v.wait+=gameDt;if(v.retryAt>state.time)continue;v.retryAt=state.time+.35;
   const from=state.buildings.get(v.fromId);
   if(v.departureRouteVersion!==state.version||v.departureNoRoute&&!(v.nextDepartureRouteRetry>state.time)){if(routeBudget<=0||!routeChecks.has(v.id))continue;routeBudget--;if(!checkDepartureRoute(v))continue;}
   if(v.departureNoRoute)continue;
   if(from&&from.queue.find(id=>{const car=state.vehicles.get(id);return car&&!car.departureNoRoute;})!==v.id)continue;
   if(!from){if(gateAttempt.has(v.path[0]))continue;gateAttempt.add(v.path[0]);}
   const i=v.path[0],next=v.path[1];if(next==null){arrive(v);continue;}
   const d=dir(i,next),lane=plannedLane(v,0);
   if(cellAvailable(i,d,lane,v.id)&&physicalTrafficLimit(v,motionPlan(v),0,.01)>0){
    if(from){from.queue=from.queue.filter(id=>id!==v.id);from.parked.delete(v.citizenId);from.visitors.delete(v.citizenId);}if(c){c.location='travel';c.state=TRIPS[v.kind].name;}v.phase='driving';v.speed=0;v.stopReason='';occupy(v,0);v.wait=0;updateTrafficSpatial(v);
   }else if(c&&v.wait>60&&state.time-v.lastPain>90){pain(c,1,'รอออกจากอาคารหรือประตูเมือง');v.lastPain=state.time;}
   continue;
  }
  if(v.phase==='stuck'){v.wait+=gameDt;v.speed=0;if(routeBudget>0&&routeChecks.has(v.id)&&recoveryDue(v)){routeBudget--;recoverVehicle(v);}continue;}
  if(v.routeCheckedVersion!==state.version){v.routeCheckedVersion=state.version;if(!remainingRouteValid(v)){strandVehicle(v,'เส้นทางเดิมขาด');continue;}}
  if(v.pos+1>=v.path.length){arrive(v);continue;}
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
    if(!cellAvailable(v.path[nextPos],d,lane,v.id)){blocked=gate.reason||'รถคันหน้าขวาง';v.speed=0;break;}
    // Keep intersection leases until the rear of the car has cleared the whole
    // connector. Carry unused travel distance into the next road segment.
    release(v,true);v.pos=nextPos;v.progress=0;occupy(v,v.pos);transitions++;
    state.roads.get(v.path[v.pos]).load=Math.min(1.2,state.roads.get(v.path[v.pos]).load+.15);
    refreshMotionReservations(v,plan,s);
    if(v.pos===v.path.length-1){arrive(v);break;}
   }else if(step<1e-10||s>=gate.limit-1e-9){blocked=gate.reason;v.speed=0;break;}
  }
  if(!state.vehicles.has(v.id))continue;
  refreshMotionReservations(v,plan,s);
  if(blocked&&s-initial<1e-7){
   v.wait+=gameDt;v.stopReason=blocked;state.roads.get(v.path[v.pos]).wait=Math.min(10,state.roads.get(v.path[v.pos]).wait+realDt);
   if(c&&v.wait>14&&state.time-v.lastPain>70){pain(c,1,blocked==='ไฟแดง'?'รถติดหรือรอสัญญาณไฟ':'รถติดหรือรอคิว');v.lastPain=state.time;}
  }else{v.wait=0;v.stopReason=blocked||'';}
  updateTrafficSpatial(v);
 }
 trafficSpatial=null;
 for(const [key,res]of state.reservations){if(res.passes){res.passes=res.passes.filter(p=>p.until>=state.time&&state.vehicles.has(p.id));if(res.passes.length)res.id=res.passes[0].id;else state.reservations.delete(key);}else if(res.until<state.time||!state.vehicles.has(res.id))state.reservations.delete(key);}
}
function daily(){reconcile();const s=computeStats();state.money=Math.max(-10000,state.money+s.net);for(const b of state.buildings.values())b.arrivals=0;for(const c of state.citizens.values()){if(!c.resident||c.removed)continue;assignJob(c);if(c.profile.trait!==3&&!c.workId)c.unemployed++;else c.unemployed=0;if(c.unemployed>=2){pain(c,28,'ว่างงาน 2 วัน');c.movingOut=true;}if(c.happy<25)c.movingOut=true;if(c.movingOut)schedule(c,state.time+1,'moveOut');else if(!c.late&&c.pain<8&&(c.workId||c.profile.trait===3))reward(c,10,86);c.lastTax=c.late?250:500;c.late=false;c.pain=0;c.failKinds.clear();scheduleDay(c,Math.floor(state.time/1440));}addNews('สรุปวัน: '+(s.net>=0?'รายรับสุทธิ ':'ขาดทุน ')+money(Math.abs(s.net)));}
function reconcile(){for(const b of state.buildings.values()){b.reservedResidents=0;b.reservedService=0;}for(const v of state.vehicles.values()){const b=state.buildings.get(v.toId);if(b){if(v.residentReservation)b.reservedResidents++;if(v.serviceReservation)b.reservedService++;}}}
function tick(dt){if(!state.speed)return;const old=state.time,gameDt=dt*2*state.speed;state.time+=gameDt;if(Math.floor(old/1440)!==Math.floor(state.time/1440))daily();let count=0,trips=0;while(state.events.length&&state.events[0].at<=state.time&&count<42&&trips<14){const e=state.events.shift(),c=state.citizens.get(e.citizenId);runAction(c,e.action,e);count++;trips++;}
if(state.time-state.lastImmigration>=1){state.lastImmigration=state.time;immigration();}
if(Math.floor(old/2)!==Math.floor(state.time/2)){let n=0;for(const c of state.citizens.values()){if(c.pending&&c.pending.next<=state.time&&n++<80){const p=c.pending;if(p.expires<state.time){c.pending=null;continue;}runAction(c,p.action,p);}}}
if(state.time-state.lastPass>=90){state.lastPass=state.time;if(computeStats().pop<1200&&state.vehicles.size<3600){const index=Math.floor(state.time/90)%4;createTrip(null,'pass',null,null,state.gates[index],state.gates[(index+2)%4],null);}}
advanceVehicles(dt,gameDt);for(const r of state.roads.values()){if(r.load>.001)r.load*=Math.pow(.90,dt*4);if(r.wait>.001)r.wait*=Math.pow(.72,dt*4);}if(state.stats.happy<=80&&state.time-(state.lastHappyAlert||0)>180){addNews('คนใหม่หยุดย้ายเข้า ช่วยแก้ปัญหาให้ความสุขเกิน 80%');state.lastHappyAlert=state.time;}}
function lineCells(a,b){let [x,y]=xy(a),[u,v]=xy(b),dx=u-x,dy=v-y;const horizontal=Math.abs(dx)>=Math.abs(dy);if(horizontal)v=y;else u=x;const steps=Math.max(Math.abs(u-x),Math.abs(v-y)),result=[];for(let n=0;n<=steps;n++){const xx=Math.round(x+(u-x)*(steps?n/steps:0)),yy=Math.round(y+(v-y)*(steps?n/steps:0));if(!valid(xx,yy))continue;const raw=id(xx,yy),snapped=owner(raw),point=xy(snapped),aligned=horizontal?point[1]===y:point[0]===x,p=aligned?snapped:raw;if(result[result.length-1]!==p)result.push(p);}return result;}
function checkRoad(cells,type){let cost=0;const t=ROADS[type];if(!cells.length)return{error:'เลือกตำแหน่งถนนบนแผนที่'};const centerline=new Set(cells);for(const i of cells)if(!state.roads.has(i)&&state.footprint[i]>=0&&!centerline.has(state.footprint[i]))return{error:'แนวถนนซ้อนขอบถนนเดิม ลากให้เชื่อมตรงกลางหรือขยับแนวถนนค่ะ'};for(const i of cells){const [x,y]=xy(i),r=state.roads.get(i),w=Math.max(t.width,r?ROADS[r.type].width:0),lo=Math.floor(w/2);for(let yy=y-lo;yy<y+w-lo;yy++)for(let xx=x-lo;xx<x+w-lo;xx++){if(!valid(xx,yy))continue;if(state.buildGrid[id(xx,yy)]>=0)return{error:'ถนนทับพื้นที่อาคาร เลือกแนวถนนใหม่ค่ะ'};}cost+=r?Math.max(0,t.cost-ROADS[r.type].cost):t.cost;}
const adds=new Map();for(let k=1;k<cells.length;k++){const a=cells[k-1],b=cells[k];if(a===b)continue;const pa=xy(a),pb=xy(b);if(pa[0]!==pb[0]&&pa[1]!==pb[1])return{error:'แนวถนนต้องตรงเข้าจุดเชื่อม ลองลากจากกลางถนนเดิมค่ะ'};for(const[p,q]of[[a,b],[b,a]]){if(!adds.has(p))adds.set(p,new Set(state.roads.get(p)?.links||[]));adds.get(p).add(q);if(adds.get(p).size>4)return{error:'จุดเชื่อมนี้มีถนนเกิน 4 แขนง ลองขยับแนวถนนค่ะ'};}}
if(state.money<0||state.money-cost< -10000)return{error:'งบประมาณไม่พอ ลองถนนสั้นลงหรือรอรายรับวันถัดไปค่ะ'};return{cost};}
function buildRoad(cells,type,confirmed=false){const check=checkRoad(cells,type);if(check.error){toast(check.error);return false;}if(!confirmed){confirmAction('สร้าง'+ROADS[type].name,`ความยาว ${cells.length} ช่อง · ${ROADS[type].lanes} เลน<br>ค่าก่อสร้าง ${money(check.cost)}<br>อาคารจะวางทับพื้นที่ถนนไม่ได้`,()=>buildRoad(cells,type,true));return;}const changed=[];for(const i of cells){const r=state.roads.get(i);if(!r){state.roads.set(i,{type,main:false,links:new Set(),load:0,wait:0});changed.push(i);}else if(ROADS[type].lanes>ROADS[r.type].lanes){r.type=type;changed.push(i);}}for(let k=1;k<cells.length;k++)link(cells[k-1],cells[k]);state.money-=check.cost;roadChanged(changed);toast('สร้างถนนแล้ว · '+money(check.cost));updateUI();return true;}
function roadChanged(cells){state.version++;state.routeCache.clear();state.junctionCache.clear();state.junctionLayoutCache?.clear();rebuildFootprint();for(const b of state.buildings.values())b.access=accessFor(b);let budget=2;
 for(const v of state.vehicles.values()){if(['departing','gate_waiting'].includes(v.phase)){v.retryAt=0;continue;}if(v.phase!=='stuck'&&!remainingRouteValid(v))strandVehicle(v,'เส้นทางเดิมขาด');if(v.phase==='stuck'){v.nextRouteRetry=state.time;if(budget-->0)recoverVehicle(v,true);}}
 for(const c of state.citizens.values())if(c.pending)c.pending.next=state.time+.5;
}
function checkBuilding(key,x,y){const t=CATALOG[key];if(!t||!valid(x,y)||!valid(x+t.size-1,y+t.size-1))return{error:'วางอาคารให้อยู่ในแผนที่ค่ะ'};if(state.money<0||state.money-t.cost< -10000)return{error:'งบประมาณไม่พอสำหรับอาคารนี้ค่ะ'};for(let yy=y;yy<y+t.size;yy++)for(let xx=x;xx<x+t.size;xx++){const i=id(xx,yy);if(state.footprint[i]>=0)return{error:'พื้นที่นี้เป็นถนน ขยับอาคารไปชิดขอบถนนค่ะ'};if(state.buildGrid[i]>=0)return{error:'มีอาคารอยู่ในพื้นที่นี้แล้วค่ะ'};}const b={key,x,y},access=accessFor(b);if(!access.length)return{error:'อาคารต้องติดขอบถนนที่มีทางเข้าออก ลองวางใกล้ถนนอีกนิดค่ะ'};return{access};}
function buildBuilding(key,x,y,confirmed=false){const check=checkBuilding(key,x,y),t=CATALOG[key];if(check.error){toast(check.error);return false;}if(!confirmed){confirmAction('สร้าง'+t.name,`ค่าก่อสร้าง ${money(t.cost)} · ค่าดูแล ${money(t.maint)} / วัน<br>${t.residents?'รองรับผู้อยู่อาศัย '+t.residents+' คน':t.jobs+' ตำแหน่งงาน'+(t.service?' · บริการ '+t.service+' คน':'')}`,()=>buildBuilding(key,x,y,true));return;}const b={id:state.nextId++,key,x,y,access:check.access,residents:new Set(),workers:new Set(),visitors:new Set(),parked:new Set(),reservedResidents:0,reservedService:0,queue:[],arrivals:0};state.buildings.set(b.id,b);for(let yy=y;yy<y+t.size;yy++)for(let xx=x;xx<x+t.size;xx++)state.buildGrid[id(xx,yy)]=b.id;state.money-=t.cost;for(const c of state.citizens.values()){if(c.resident)assignJob(c);if(c.pending)c.pending.next=state.time+.5;}addNews('เปิด'+t.name+'ใหม่'+(t.jobs?' · เพิ่ม '+t.jobs+' งาน':''));toast('สร้าง'+t.name+'แล้ว');updateUI();return b;}
function demolishBuilding(b,confirmed=false){if(!b)return;const t=CATALOG[b.key],fee=t.cost*.1;if(!confirmed){confirmAction('รื้อ'+t.name,`ค่ารื้อ ${money(fee)}<br>${t.residents?'ผู้อยู่อาศัยในบ้านนี้จะออกจากเมือง':'พนักงานต้องหางานใหม่ ผู้ที่กำลังเดินทางมาอาคารนี้จะกลับบ้าน'}`,()=>demolishBuilding(b,true));return;}if(state.money-fee< -10000){toast('งบประมาณไม่พอสำหรับค่ารื้อค่ะ');return;}if(t.residents)for(const c of [...state.citizens.values()])if(c.homeId===b.id)removeCitizen(c);for(const v of [...state.vehicles.values()])if(v.fromId===b.id||v.toId===b.id){const c=state.citizens.get(v.citizenId);cancelVehicle(v);if(c){c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);}}for(const c of state.citizens.values()){if(c.workId===b.id)c.workId=null;if(c.locationId===b.id){c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';state.buildings.get(c.homeId)?.parked.add(c.id);}}
for(let yy=b.y;yy<b.y+t.size;yy++)for(let xx=b.x;xx<b.x+t.size;xx++)state.buildGrid[id(xx,yy)]=-1;state.buildings.delete(b.id);state.money-=fee;for(const c of state.citizens.values())assignJob(c);reconcile();selected=null;$('inspector').classList.add('hidden');toast('รื้ออาคารแล้ว');updateUI();}
function demolishRoad(i,confirmed=false){const r=state.roads.get(i);if(!r){toast('เลือกช่องที่มีถนนค่ะ');return;}if(r.main){toast('ถนนหลักเริ่มต้นรื้อไม่ได้ค่ะ');return;}if(occupancy(i)>0){toast('มีรถอยู่บนถนน รอให้รถผ่านก่อนค่ะ');return;}const fee=ROADS[r.type].cost*.2;if(!confirmed){confirmAction('รื้อถนน',`ค่ารื้อ ${money(fee)} · ถนนที่ขาดอาจทำให้อาคารเข้าออกไม่ได้`,()=>demolishRoad(i,true));return;}if(state.money-fee< -10000){toast('งบประมาณไม่พอสำหรับค่ารื้อค่ะ');return;}for(const n of r.links)state.roads.get(n)?.links.delete(i);state.roads.delete(i);state.money-=fee;roadChanged([i]);updateUI();}
function confirmAction(title,body,callback){modal(`<span class="eyebrow">CITY PLANNING</span><h2>${title}</h2><p>${body}</p><div class="actions"><button id="cancelDialog">ยกเลิก</button><button id="confirmDialog" class="primary">ยืนยัน</button></div>`);$('cancelDialog').onclick=closeModal;$('confirmDialog').onclick=()=>{closeModal();callback();};}
function inspectAt(x,y){let closest=null,best=15;for(const v of state.vehicles.values()){if(v.phase!=='driving')continue;const p=vehiclePosition(v);if(!p)continue;const a=screen(p.x-(renderer3d?.5:0),p.y-(renderer3d?.5:0)),dist=Math.hypot(a[0]-x,a[1]-y);if(dist<best){best=dist;closest=v;}}if(closest){selected={kind:'vehicle',id:closest.id};renderInspector();return;}if(renderer3d){const hit=renderer3d.pickBuilding(x,y);if(hit!=null){selected={kind:'building',id:hit};renderInspector();return;}}const p=world(x,y),ix=Math.floor(p[0]),iy=Math.floor(p[1]);if(!valid(ix,iy))return;const b=state.buildGrid[id(ix,iy)];if(b>=0)selected={kind:'building',id:b};else{const i=owner(id(ix,iy));if(state.roads.has(i))selected={kind:'road',id:i};else{selected=null;$('inspector').classList.add('hidden');return;}}renderInspector();}
function frame(ts){const dt=Math.min(.08,(ts-last)/1000||0);last=ts;if(!$('dialog').open)tick(dt);if(follow){const v=state.vehicles.get(follow);if(v){const p=vehiclePosition(v);if(p){cam.x+=(p.x-cam.x)*.06;cam.y+=(p.y-cam.y)*.06;}}else follow=null;}draw();uiTick+=dt;if(uiTick>.75){uiTick=0;updateUI();}requestAnimationFrame(frame);}
window.addEventListener('resize',resize);$('categories').onclick=e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;renderTools();}};$('tools').onclick=e=>{const b=e.target.closest('[data-tool]');if(b)selectTool(b.dataset.tool);};$('pause').onclick=()=>{state.speed=state.speed?0:1;updateUI();};document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{state.speed=+b.dataset.speed;updateUI();});$('heat').onclick=()=>{heat=!heat;$('heat').classList.toggle('active',heat);};$('debug').onclick=()=>{debug=!debug;$('debug').classList.toggle('active',debug);};$('zoomIn').onclick=()=>cam.z=Math.min(5.2,cam.z*1.2);$('zoomOut').onclick=()=>cam.z=Math.max(.22,cam.z/1.2);$('center').onclick=()=>{cam={x:150,y:150,z:1.24};follow=null;};$('collapse').onclick=()=>{document.querySelector('.city-panel').classList.toggle('collapsed');$('collapse').textContent=document.querySelector('.city-panel').classList.contains('collapsed')?'+':'−';};$('closeInspector').onclick=()=>{selected=null;$('inspector').classList.add('hidden');follow=null;};document.querySelectorAll('[data-inspect]').forEach(b=>b.onclick=()=>{selected={kind:b.dataset.inspect};renderInspector();});
let pointers=new Map(),pinch=null;
function cancelInteraction(){for(const pointerId of pointers.keys())if(canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);pointers.clear();pinch=null;drag=null;hover=null;selected=null;follow=null;selectTool('hand');$('inspector').classList.add('hidden');}
canvas.addEventListener('mousedown',e=>{if(e.button===2){e.preventDefault();cancelInteraction();}});
canvas.addEventListener('pointerdown',e=>{if(e.button===2){e.preventDefault();cancelInteraction();return;}canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:cam.z};drag=null;return;}const p=world(e.clientX,e.clientY),x=Math.floor(p[0]),y=Math.floor(p[1]);drag={sx:e.clientX,sy:e.clientY,lastX:e.clientX,lastY:e.clientY,x,y,pan:tool==='hand'||e.button===1||e.shiftKey,moved:false,cells:valid(x,y)?[owner(id(x,y))]:[]};});
canvas.addEventListener('pointermove',e=>{const p=world(e.clientX,e.clientY);hover={x:Math.floor(p[0]),y:Math.floor(p[1])};if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const a=[...pointers.values()];cam.z=Math.max(.22,Math.min(5.2,pinch.z*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/pinch.distance));return;}if(!drag)return;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5)drag.moved=true;if(drag.pan){if(renderer3d){const a=world(drag.lastX,drag.lastY),b=world(e.clientX,e.clientY);cam.x-=b[0]-a[0];cam.y-=b[1]-a[1];renderer3d.updateCamera(cam);}else{cam.x-=(e.clientX-drag.lastX)/(T*cam.z);cam.y-=(e.clientY-drag.lastY)/(T*cam.z*.78);}cam.x=Math.max(-20,Math.min(320,cam.x));cam.y=Math.max(-20,Math.min(320,cam.y));follow=null;}else if(ROADS[tool]&&valid(drag.x,drag.y)&&valid(hover.x,hover.y))drag.cells=lineCells(owner(id(drag.x,drag.y)),owner(id(hover.x,hover.y)));drag.lastX=e.clientX;drag.lastY=e.clientY;});
canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(pinch){if(pointers.size===0)pinch=null;drag=null;return;}if(!drag)return;const d=drag;drag=null;if(d.pan){if(!d.moved)inspectAt(e.clientX,e.clientY);return;}if(ROADS[tool])buildRoad(d.cells,tool);else if(CATALOG[tool]){const p=world(e.clientX,e.clientY);buildBuilding(tool,Math.floor(p[0]),Math.floor(p[1]));}else{const p=world(e.clientX,e.clientY),x=Math.floor(p[0]),y=Math.floor(p[1]);if(!valid(x,y))return;if(tool==='eraseRoad')demolishRoad(owner(id(x,y)));if(tool==='eraseBuilding')demolishBuilding(state.buildings.get(state.buildGrid[id(x,y)]));}});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;pinch=null;});canvas.addEventListener('contextmenu',e=>{e.preventDefault();cancelInteraction();});canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();const before=world(e.clientX,e.clientY);cam.z=Math.max(.22,Math.min(5.2,cam.z*(e.deltaY<0?1.12:.89)));if(renderer3d)renderer3d.updateCamera(cam);const after=world(e.clientX,e.clientY);cam.x+=before[0]-after[0];cam.y+=before[1]-after[1];},{passive:false});
window.addEventListener('keydown',e=>{if($('dialog').open)return;if(e.key==='Escape')cancelInteraction();if(e.code==='Space'){e.preventDefault();state.speed=state.speed?0:1;updateUI();}if(['1','2','5'].includes(e.key)){state.speed=+e.key;updateUI();}if(e.key.toLowerCase()==='h')$('heat').click();if(e.key.toLowerCase()==='b'){category='roads';selectTool('small');}if(e.key.toLowerCase()==='s'&&(e.ctrlKey||e.metaKey)){e.preventDefault();openSaveDialog();}});
$('inspectContent').onclick=e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,v=+b.dataset.value;if(a==='tow'){if(towVehicle(v)){selected=null;$('inspector').classList.add('hidden');toast('ลากรถออกแล้ว · ยกเลิกเที่ยวเดินทาง');updateUI();}}if(a==='reroute'){const car=state.vehicles.get(v),ok=car?.phase==='stuck'?recoverVehicle(car,true):car?checkDepartureRoute(car):false;toast(ok?'พบเส้นทางแล้ว จะออกเดินทางเมื่อถนนว่าง':'ยังไม่มีเส้นทางที่ไปต่อได้ค่ะ');renderInspector();}if(a==='citizen'){selected={kind:'citizen',id:v};renderInspector();}if(a==='follow'){follow=follow===v?null:v;renderInspector();}if(a==='demolish')demolishBuilding(state.buildings.get(v));if(a==='heat')$('heat').click();};
$('help').onclick=()=>{modal('<span class="eyebrow">WELCOME, CITY MAKER</span><h2>ทุกคันมีชีวิต<br>ทุกถนนมีความหมาย</h2><p>เริ่มด้วยงบ 500,000 บาท และถนนหลัก 8 เลนที่ไม่เสียค่าดูแล เมืองจะเติบโตจากการเดินทางที่คุณออกแบบ</p><ol><li>เลือก <b>ถนนเล็ก</b> แล้วลากจากถนนหลักออกไป</li><li>เลือก <b>บ้าน</b> วางชิดขอบถนน คนจะขับรถจากประตูเมืองเข้ามา</li><li>สร้าง <b>สำนักงานหรือโรงงาน</b> ให้คนมีงาน ก่อนเพิ่มร้านค้าและสวน</li><li>คลิกรถเพื่อดูต้นทาง ปลายทาง และปัญหา เปิดแผนที่รถติดเพื่อหาจุดคอขวด</li></ol><p>ลากเพื่อเลื่อน · เลื่อนล้อหรือใช้สองนิ้วเพื่อซูม<br>Space หยุดเวลา · B สร้างถนน · Esc สำรวจเมือง<br>รถขับชิดซ้าย อาคารฝั่งตรงข้ามต้องมีทางวนกลับ</p><div class="actions"><button class="primary" id="helpDone">เริ่มสร้างเมือง</button></div>');$('helpDone').onclick=closeModal;};
function snapshot(){return JSON.stringify({format:1,city:state.city,money:state.money,time:state.time,nextId:state.nextId,profileSeq:state.profileSeq,roads:[...state.roads].map(([i,r])=>[i,{...r,links:[...r.links]}]),buildings:[...state.buildings].map(([i,b])=>[i,{...b,residents:[...b.residents],workers:[...b.workers],visitors:[...b.visitors],parked:[...b.parked]}]),citizens:[...state.citizens].map(([i,c])=>[i,{...c,scheduled:[...c.scheduled],failKinds:[...c.failKinds]}]),vehicles:[...state.vehicles].map(([i,v])=>[i,{...v,pathSet:[...v.pathSet]}]),events:state.events,cam,news});}
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
 if(!s||s.format!==1||!CITIES[s.city]||!Number.isFinite(s.time)||!Number.isFinite(s.money)||!Number.isInteger(s.nextId)||!Array.isArray(s.events))throw Error('Invalid save');
 for(const key of ['roads','buildings','citizens','vehicles'])if(!Array.isArray(s[key])||s[key].some(e=>!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||!e[1])||new Set(s[key].map(e=>e[0])).size!==s[key].length)throw Error('Invalid '+key);
 for(const [i,r]of s.roads)if(i<0||i>=W*H||!ROADS[r.type]||!Array.isArray(r.links)||r.links.some(n=>!Number.isInteger(n)||n<0||n>=W*H))throw Error('Invalid road');
 for(const [,b]of s.buildings)if(!CATALOG[b.key]||!Number.isInteger(b.x)||!Number.isInteger(b.y)||!valid(b.x,b.y)||!valid(b.x+CATALOG[b.key].size-1,b.y+CATALOG[b.key].size-1)||['residents','workers','visitors','parked','access'].some(k=>!Array.isArray(b[k])))throw Error('Invalid building');
 for(const [,c]of s.citizens)if(!Array.isArray(c.scheduled)||!Array.isArray(c.failKinds))throw Error('Invalid citizen');
 for(const [,v]of s.vehicles)if(!Array.isArray(v.pathSet)||!Array.isArray(v.path))throw Error('Invalid vehicle');
}
function loadGame(silent=false,slotId=null){const previous={state,cam,news};try{const slots=readSaveSlots(),slot=slotId?slots.find(s=>s.id===slotId):slots[0],raw=slot?.data;if(!raw){if(!silent)toast('ยังไม่มีเมืองที่บันทึกไว้ค่ะ');return false;}const s=JSON.parse(raw);validateSave(s);reset(s.city);state.money=s.money;state.time=s.time;state.nextId=s.nextId;state.profileSeq=s.profileSeq??s.citizens.length;state.lastImmigration=s.time;state.lastPass=s.time;state.roads=new Map(s.roads.map(([i,r])=>[i,{...r,links:new Set(r.links)}]));state.buildings=new Map(s.buildings.map(([i,b])=>[i,{...b,residents:new Set(b.residents),workers:new Set(b.workers),visitors:new Set(b.visitors),parked:new Set(b.parked)}]));state.citizens=new Map(s.citizens.map(([i,c])=>[i,{...c,scheduled:new Set(c.scheduled),failKinds:new Set(c.failKinds)}]));state.vehicles=new Map(s.vehicles.map(([i,v])=>[i,{...v,trafficModel:v.trafficModel??1,pathSet:new Set(v.pathSet)}]));state.events=s.events;cam=s.cam||cam;news=s.news||[];rebuildFootprint();state.buildGrid.fill(-1);for(const b of state.buildings.values()){const t=CATALOG[b.key];for(let y=b.y;y<b.y+t.size;y++)for(let x=b.x;x<b.x+t.size;x++)state.buildGrid[id(x,y)]=b.id;}for(const v of state.vehicles.values())if(v.phase==='driving')occupy(v,v.pos);for(const v of state.vehicles.values())if(v.phase==='driving')refreshMotionReservations(v,motionPlan(v),motionDistance(v));reconcile();state.speed=0;updateUI();if(!silent)toast('โหลดเมืองแล้ว กด ▶ เพื่อเล่นต่อค่ะ');return true;}catch(e){state=previous.state;cam=previous.cam;news=previous.news;console.error('Load failed:',e);$('cityName').textContent=CITIES[state.city].name;$('citySub').textContent=CITIES[state.city].sub;$('mapLabel').innerHTML=CITIES[state.city].en+'<small>THAILAND · สร้างเมืองในแบบคุณ</small>';updateUI();if(!silent)toast('โหลดเซฟนี้ไม่ได้ เมืองปัจจุบันและข้อมูลเซฟยังอยู่ค่ะ');return false;}}
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
$('menu').onclick=()=>{modal('<span class="eyebrow">YOUR CITY</span><h2>จัดการเมือง</h2><p>บันทึกเก็บในเบราว์เซอร์และเครื่องนี้เท่านั้น เมืองไม่ได้บันทึกข้ามอุปกรณ์</p><div class="actions"><button id="saveMenu">บันทึกเมือง</button><button id="loadMenu">โหลดเมือง</button><button id="reportMenu">ตรวจเมือง / รายงานบัค</button></div><h3>เริ่มเมืองใหม่</h3><select id="citySelect">'+Object.entries(CITIES).map(([k,c])=>`<option value="${k}" ${k===state.city?'selected':''}>${c.name}</option>`).join('')+'</select><p>เมืองแต่ละแห่งต่างกันที่ภูมิประเทศและบรรยากาศ พื้นน้ำและภูเขายังเป็นภาพประกอบการเล่น</p><div class="actions"><button id="menuClose">กลับไปเล่น</button><button id="newCity" class="primary">เริ่มใหม่</button></div>');$('menuClose').onclick=closeModal;$('reportMenu').onclick=openCityReport;$('saveMenu').onclick=()=>{closeModal();return openSaveDialog();};$('loadMenu').onclick=()=>{closeModal();return openLoadDialog();};$('newCity').onclick=()=>{const key=$('citySelect').value;closeModal();confirmAction('เริ่มเมืองใหม่','เมืองปัจจุบันที่ยังไม่ได้บันทึกจะหายไป เริ่มเมืองใหม่ด้วยเงิน 500,000 บาท',()=>reset(key));};};
$('skip').onclick=()=>confirmAction('ข้ามไปเช้าวันใหม่','สรุปการเดินทางและรายรับจนถึง 06:00 วันถัดไป ช่วงที่ข้ามจะประมาณผลการเดินทางแทนการจำลองรถทุกคัน',()=>{const target=(Math.floor(state.time/1440)+1)*1440+360;for(const v of [...state.vehicles.values()]){if(!['moveIn','pass'].includes(v.kind)&&v.wait>24){v.late=true;const c=state.citizens.get(v.citizenId);if(c){c.late=true;pain(c,3,'ล่าช้าก่อนข้ามวัน');}}arrive(v);}state.events=state.events.filter(e=>e.at>=target);state.time=target-360;daily();state.time=target;for(const c of state.citizens.values()){if(c.removed)continue;for(const b of state.buildings.values()){b.visitors.delete(c.id);b.parked.delete(c.id);}state.buildings.get(c.homeId)?.parked.add(c.id);c.locationId=c.homeId;c.location='home';c.state='อยู่บ้าน';c.queued=null;c.pending=null;c.scheduled.delete(Math.floor(target/1440));scheduleDay(c,Math.floor(target/1440));}state.lastImmigration=target;state.lastPass=target;state.speed=1;heat=true;$('heat').classList.add('active');addNews('ข้ามวันแบบสรุป เริ่มเช้าวันใหม่ 06:00');updateUI();toast('เช้าวันใหม่ พร้อมปรับเมืองต่อแล้วค่ะ');});
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_city_status',title:'อ่านสถานะเมือง',description:'อ่านงบประมาณ ประชากร ความสุข จราจร และความต้องการของเมืองที่กำลังเล่น',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||Object.keys(input).length)throw Error('Expected empty object');return{city:CITIES[state.city].name,time:timeText(state.time),money:state.money,...computeStats()};}})).catch(()=>{});}catch{}}
// Read-only diagnostics and exact game actions are exposed only in the local test harness.
if(typeof window.__TRAFFIC_TEST_HARNESS__==='function')window.__TRAFFIC_TEST_HARNESS__({get state(){return state;},reset,id,xy,route,tripRoute,buildRoad,buildBuilding,checkBuilding,checkRoad,demolishRoad,demolishBuilding,createTrip,recoverVehicle,checkDepartureRoute,canTowVehicle,towVehicle,strandVehicle,cancelVehicle,immigration,tick,computeStats,cityDemand,cityAdvice,updateCityAdvisor,runAction,drawRoads,advanceVehicles,junctionDetails,cityBugReport,openCityReport,snapshot,loadGame,saveGame,buildingTraffic,readSaveSlots,readDurableSaveSlots,saveDurableGame,validateSave,prepareJunctionQueues,junctionConnector,connectorsConflict,enforceNoUTurn,capsulesOverlap,queueAllows,reserveIntersection,release,accessFor,dir,junction,signalPhase,signalAllows,plannedLane,intersectionAllowed,stopProgress,roadChanged,occupancy,vehiclePosition,motionPlan,motionDistance,positionOnMotion,laneOffset,lineCells,roadVisualWidth,bezierPoint,bezierTangent,TRIPS,ROADS,CATALOG});
resize();reset();requestAnimationFrame(frame);
})();
