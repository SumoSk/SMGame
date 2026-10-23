// Structural and traffic-clearance checks for the grounded mall redesign.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const setup=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',setup+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const results=[];
 for(const [key,W,H,capacity,jobs,service,tier] of [
  ['mall_small',7,8,15,3,12,1],['mall_medium',11,8,30,6,24,2],['mall_large',11,13,60,12,48,3]]){
  const t=g.CATALOG[key];
  assert.deepEqual([t.plotWidth,t.plotHeight,t.parkingCapacity,t.jobs,t.service],[W,H,capacity,jobs,service]);
  assert.equal(g.lotSlots({key}).length,capacity);
  assert.equal(t.parkingZoneDepth,t.buildingZoneDepth);
  let signature;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,x:40,y:50,id:91,rotation,parked:new Set(),parkingSlots:Array(capacity).fill(null)};
   const batch=new Batch();r.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(group=>group.items.map(p=>({...p,color:group.color,glow:group.glow})));
   const local=items.map(p=>{
    const dx=p.x-b.x,dz=p.z-b.y;
    const uv=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:H-dx}:rotation===2?{u:W-dx,v:H-dz}:{u:W-dz,v:dx};
    return {...p,...uv};
   });
   assert(local.length>=140&&local.length<=1000,key+' mobile geometry budget');
   assert(local.every(p=>[p.x,p.y,p.z,p.sx,p.sy,p.sz,p.u,p.v].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0));
   assert(local.every(p=>p.u-p.sx/2>=.69&&p.u+p.sx/2<=W-.69&&p.v-p.sz/2>=H/2-.08&&p.v+p.sz/2<=H-.37),key+' road/parking intrusion');
   const foundation=local.filter(p=>p.color==='#bdaba4');
   assert.equal(foundation.length,1);
   assert(foundation[0].y-foundation[0].sy/2<=.03,key+' foundation floats');
   const floors=local.filter(p=>p.color==='#e6dfd5');
   assert.equal(floors.length,tier,key+' occupied floor count');
   for(let level=0;level<tier;level++){
    const y=.24+level*2.04,floor=floors.find(p=>Math.abs(p.y-(y+.09))<1e-6);
    assert(floor,key+' missing floor slab');
    // Both side walls span from the slab top to the next floor/roof.
    const walls=local.filter(p=>p.color==='#f1e5df'&&Math.abs(p.sx-.18)<1e-6&&Math.abs(p.y-(y+.18+1.86/2))<1e-6);
    assert.equal(walls.length,2,key+' continuous side walls');
    for(const wall of walls){
     assert(Math.abs(wall.y-wall.sy/2-(floor.y+floor.sy/2))<1e-6,key+' gap below wall');
     assert(Math.abs(wall.y+wall.sy/2-(y+2.04))<1e-6,key+' gap below upper slab');
     assert(wall.sz>=floor.sz-.001,key+' unsupported wall depth');
    }
    if(level){
     const below=floors.find(p=>p.y<floor.y&&Math.abs(p.y-(floor.y-2.04))<1e-6);
     assert(floor.sx<=below.sx&&floor.sz<=below.sz,key+' unsupported upper overhang');
    }
   }
   const roof=local.find(p=>p.color==='#ecb1c5');
   assert(roof&&Math.abs(roof.y-roof.sy/2-(.24+tier*2.04))<1e-6,key+' roof detached from walls');
   assert(local.filter(p=>p.glow).length>=12,key+' night lighting');
   assert(local.filter(p=>p.color==='#b3d8d6').length===tier*2,key+' glazed lobby');
   const top=Math.max(...local.map(p=>p.y+p.sy/2));
   assert(top>[2.5,4.5,6.8][tier-1]&&top<[2.9,4.9,7.4][tier-1],key+' height');
   const digest={instances:local.length,top:+top.toFixed(3),lights:local.filter(p=>p.glow).length};
   if(signature)assert.deepEqual(digest,signature,key+' rotation changed model');else signature=digest;
  }
  results.push({key,...signature});
 }
 assert.deepEqual([g.CATALOG.home_grand.plotWidth,g.CATALOG.home_grand.plotHeight,g.CATALOG.home_grand.parkingCapacity],[11,13,60]);
 console.log(JSON.stringify({passed:true,variants:3,rotations:12,grounded:true,parkingPreserved:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
