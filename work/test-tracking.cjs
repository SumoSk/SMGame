const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let game,storage={};const noop=()=>{};
const element=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const context={document:{getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{setItem:(k,v)=>storage[k]=v,getItem:k=>storage[k]},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
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

for(const type of ['small','medium','large'])for(const rotation of [0,1,2,3])for(const turn of [-1,1]){
const v=install(turnPath(turn,rotation),type);v.pos=4;v.progress=.35;
const before=JSON.stringify(v),points=game.trackingRoute(v),plan=game.motionPlan(v),pose=game.vehiclePosition(v);
assert(points.length>2);near(points[0].x,pose.x);near(points[0].y,pose.y);
const end=game.positionOnMotion(plan,plan.total);near(points.at(-1).x,end.x);near(points.at(-1).y,end.y);
for(let i=1;i<points.length;i++)assert(Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)<.41);
assert.equal(JSON.stringify(v),before,'overlay must not mutate vehicle');
v.phase='stuck';v.routeMissing=true;assert.equal(game.trackingRoute(v).length,0);
v.routeMissing=false;v.heldPose={x:0,y:0,angle:0};assert.equal(game.trackingRoute(v).length,0);
}
const source=fs.readFileSync('dist/game.js','utf8');assert(source.includes("['signals','🚦 ไฟจราจร'],['tracking','โหมดติดตาม']"));
assert(source.includes("pan:tool==='hand'||tool==='tracking'"));
console.log(JSON.stringify({passed:true,trackingPaths:24,coverage:['actual lane geometry','current car to destination','no fabricated missing routes','no vehicle mutation','touch pan','tab order']}));
