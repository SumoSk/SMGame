// Compare optimized admission against the original swept-sample decisions.
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const pose=new Function(extract('const parkingPathGeometries=','function lotPathLength(')+'return lotPathPose;')();
const length=new Function(extract('function lotPathLength(','// Each car occupies')+'return lotPathLength;')();
const overlap=new Function(extract('function lotCarsOverlap(','// A single shared driveway')+'return lotCarsOverlap;')();
const original=`function canLeaveParkingSpace(v,points){const mergeLength=lotPathLength(points.slice(0,2))+.7;for(const other of parkingLotCars(v.lotBuilding)){if(other.id===v.id||other.lotBuilding!==v.lotBuilding||!other.lotPath)continue;for(let d=0;d<=mergeLength;d+=.12){const p=lotPathPose(points,d);for(let ahead=0;ahead<=1.5;ahead+=.15)if(lotCarsOverlap(p,lotPathPose(other.lotPath,(other.lotDistance||0)+ahead),.06))return false;}}return true;}`;
const optimized=extract('function canLeaveParkingSpace(','function parkingAccess(');
let seed=83,calls=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const compile=(code,cars)=>new Function('lotPathLength','lotPathPose','parkingLotCars','lotCarsOverlap',code+'return canLeaveParkingSpace;')(length,(...args)=>{calls++;return pose(...args);},()=>cars,overlap);
const referencePose=new Function("function lotPathPose(points,distance){\n let d=Math.max(0,distance);\n const curve=(a,b,c,t)=>{\n  const u=1-t,x=u*u*a.x+2*u*t*b.x+t*t*c.x,y=u*u*a.y+2*u*t*b.y+t*t*c.y;\n  const dx=u*(b.x-a.x)+t*(c.x-b.x),dy=u*(b.y-a.y)+t*(c.y-b.y);\n  return{x,y,angle:Math.atan2(dy*.78,dx)};\n };\n const bend=(a,b,c)=>{\n  const x=b.x-a.x,y=b.y-a.y,p=c.x-b.x,q=c.y-b.y,la=Math.hypot(x,y),lb=Math.hypot(p,q);\n  if(la<.12||lb<.12||Math.abs(x*q-y*p)<.08*la*lb)return null;\n  return{r:Math.min(.14,la*.25,lb*.25),ux:x/la,uy:y/la,vx:p/lb,vy:q/lb};\n };\n for(let i=1;i<points.length;i++){\n  const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y);\n  const prev=i>1?bend(points[i-2],a,b):null;\n  const next=i+1<points.length?bend(a,b,points[i+1]):null;\n  if(prev&&d<=prev.r){\n   const r=prev.r,p={x:a.x-prev.ux*r,y:a.y-prev.uy*r},q={x:a.x+prev.vx*r,y:a.y+prev.vy*r};\n   return curve(p,a,q,Math.max(0,Math.min(1,(d+r)/(2*r))));\n  }\n  if(d<=len||i===points.length-1){\n   if(next&&d>=len-next.r){\n    const r=next.r,p={x:b.x-next.ux*r,y:b.y-next.uy*r},q={x:b.x+next.vx*r,y:b.y+next.vy*r};\n    return curve(p,b,q,Math.max(0,Math.min(1,(d-(len-r))/(2*r))));\n   }\n   const t=len?Math.max(0,Math.min(1,d/len)):1;\n   return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2((b.y-a.y)*.78,b.x-a.x)};\n  }\n  d-=len;\n }\n return{...points[0],angle:0};\n}\nreturn lotPathPose;")();
for(let trial=0;trial<100;trial++){
 const path=Array.from({length:2+trial%7},()=>({x:random()*20,y:random()*20}));
 for(let d=0;d<length(path)+1;d+=.071)assert.deepEqual(pose(path,d),referencePose(path,d));
 path[1].x+=.5;assert.deepEqual(pose(path,.8),referencePose(path,.8),'coordinate invalidation');
 path.push({x:2,y:3});assert.deepEqual(pose(path,length(path)),referencePose(path,length(path)),'append invalidation');
}
let allowed=0,blocked=0,oldCalls=0,newCalls=0;
for(let trial=0;trial<350;trial++){
 const path=(x,y)=>[{x,y},{x:x+random()*.3,y:y+.4+random()},{x:x+2+random()*3,y:y+.4+random()}];
 const points=path(0,0),v={id:0,lotBuilding:1};
 const cars=Array.from({length:12},(_,i)=>({id:i+1,lotBuilding:i%7===0?2:1,lotPath:i%11===0?null:path(random()*12-6,random()*12-6),lotDistance:random()*3}));
 calls=0;const expected=compile(original,cars)(v,points);oldCalls+=calls;
 calls=0;const actual=compile(optimized,cars)(v,points);newCalls+=calls;
 assert.equal(actual,expected,'same physical admission decision '+trial);actual?allowed++:blocked++;
}
assert(allowed&&blocked);assert(newCalls<oldCalls/3,'reuse removes repeated curve evaluations');
console.log(JSON.stringify({passed:true,scenarios:350,allowed,blocked,oldCalls,newCalls,reduction:1-newCalls/oldCalls}));
