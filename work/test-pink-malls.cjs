// Luxury mall geometry contracts: physical clearance, supported storeys,
// daylight signs, night lights and equivalent geometry at all four rotations.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const setup=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',setup+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const results=[];
 for(const [key,W,H,capacity,jobs,service,tier]of[
  ['mall_small',7,8,15,3,12,1],['mall_medium',11,8,30,6,24,2],['mall_large',11,13,60,12,48,3]]){
  const t=g.CATALOG[key];assert.deepEqual([t.plotWidth,t.plotHeight,t.parkingCapacity,t.jobs,t.service],[W,H,capacity,jobs,service]);
  assert.equal(g.lotSlots({key}).length,capacity);assert.equal(t.parkingZoneDepth,H/2);
  let signature;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,x:40,y:50,id:91,rotation,parked:new Set(),parkingSlots:Array(capacity).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[],matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion();
   const local=p=>{const x=p.x-b.x,z=p.z-b.y;return rotation===0?[x,z]:rotation===1?[z,H-x]:rotation===2?[W-x,H-z]:[W-z,x];};
   for(const group of batch.data.values())for(const p of group.items){
    assert([p.x,p.y,p.z,p.sx,p.sy,p.sz,p.rx,p.ry,p.rz].every(Number.isFinite));assert(p.sx>0&&p.sy>0&&p.sz>0);
    const [u,v]=local(new THREE.Vector3(p.x,p.y,p.z));items.push({...p,u,v,color:group.color,finish:group.finish,glow:group.glow});
    quaternion.setFromEuler(new THREE.Euler(p.rx,p.ry,p.rz));matrix.compose(new THREE.Vector3(p.x,p.y,p.z),quaternion,new THREE.Vector3(p.sx,p.sy,p.sz));
    // Test the actual transformed vertices, including tilted skylight panes
    // and curved-atrium beams, instead of an unrotated half-width estimate.
    const vertices=group.geo.attributes.position;
    for(let k=0;k<vertices.count;k++){
     const world=new THREE.Vector3().fromBufferAttribute(vertices,k).applyMatrix4(matrix),[x,z]=local(world);
     assert(x>=.69-1e-6&&x<=W-.69+1e-6&&z>=H/2-.08-1e-6&&z<=H-.37+1e-6,key+' actual geometry blocks traffic at rotation '+rotation);
     assert(world.y>=-.001,key+' geometry below ground');
    }
   }
   assert(items.length>=250&&items.length<=1200,key+' geometry budget');assert(batch.data.size<100,key+' material draw-call budget');
   const foundation=items.find(p=>p.color==='#bdaba4');assert(foundation&&foundation.y-foundation.sy/2<=.03,'foundation must meet the site');
   const slabs=items.filter(p=>p.color==='#e6dfd5');
   for(let level=0;level<tier;level++){
    const at=slabs.filter(p=>Math.abs(p.y-(.24+level*2.04+.09))<1e-6);
    assert(at.length>=1,key+' missing occupied floor '+level);
    if(level){const below=slabs.filter(p=>Math.abs(p.y-(.24+(level-1)*2.04+.09))<1e-6);
     for(const slab of at)assert(below.some(s=>slab.u-slab.sx/2>=s.u-s.sx/2-1e-6&&slab.u+slab.sx/2<=s.u+s.sx/2+1e-6&&slab.v-slab.sz/2>=s.v-s.sz/2-1e-6&&slab.v+slab.sz/2<=s.v+s.sz/2+1e-6),key+' unsupported upper slab');
    }
   }
   assert(items.filter(p=>p.finish==='glass'&&!p.glow).length>30,'glazed retail elevations missing');
   assert(items.some(p=>Math.abs(p.rz)>.05&&p.finish==='glass'),'barrel-vault skylight missing');
   assert(items.filter(p=>p.glow).length>20,'night lighting missing');
   assert(items.filter(p=>p.color==='#e3cf9c'&&!p.glow).length>50,'daylight brass signage missing');
   const roof=.24+tier*2.04;
   assert(items.some(p=>p.y>roof&&p.color==='#658051'),'roof planting missing');
   const top=Math.max(...items.map(p=>p.y+p.sy/2));assert(top>roof+.3&&top<roof+1.1,key+' roof height');
   const result={instances:items.length,materials:batch.data.size,top:+top.toFixed(3),nightLights:items.filter(p=>p.glow).length};
   if(signature)assert.deepEqual(result,signature,key+' rotation changes model');else signature=result;
  }
  results.push({key,...signature});
 }
 assert(new Set(results.map(x=>x.instances)).size===3,'mall sizes must have distinct models');
 console.log(JSON.stringify({passed:true,malls:3,rotations:12,actualVertexClearance:true,supportedStoreys:true,parkingPreserved:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
