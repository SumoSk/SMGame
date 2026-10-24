// Dining-house geometry: real tables, kitchens, blue roofs and parking safety.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const results=[];
 for(const [size,W,H,capacity,jobs,service,tables]of[['small',7,8,13,3,10,3],['medium',10,8,26,6,20,6],['large',10,13,50,10,40,10]]){
  const key='restaurant_'+size,t=g.CATALOG[key];assert.deepEqual([t.plotWidth,t.plotHeight,t.parkingCapacity,t.jobs,t.service],[W,H,capacity,jobs,service]);
  assert.equal(g.lotSlots({key}).length,capacity);let signature;
  for(let rotation=0;rotation<4;rotation++){
   const batch=new Batch(),b={key,x:45,y:53,rotation,id:106,parked:new Set(),parkingSlots:Array(capacity).fill(null)};r.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(k=>k.items.map(p=>({...p,color:k.color,glow:k.glow,finish:k.finish})));
   assert(items.length>=300&&items.length<1500,key+' geometry budget');
   const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
   for(const group of batch.data.values())for(const p of group.items){
    assert([p.x,p.y,p.z,p.sx,p.sy,p.sz,p.rx,p.ry,p.rz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0);
    q.setFromEuler(new THREE.Euler(p.rx,p.ry,p.rz));matrix.compose(new THREE.Vector3(p.x,p.y,p.z),q,new THREE.Vector3(p.sx,p.sy,p.sz));
    const vertices=group.geo.attributes.position;
    for(let i=0;i<vertices.count;i++){
     const v=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(matrix),x=v.x-b.x,z=v.z-b.y;
     const [u,w]=rotation===0?[x,z]:rotation===1?[z,H-x]:rotation===2?[W-x,H-z]:[W-z,x];
     assert(u>=.69-1e-6&&u<=W-.69+1e-6&&w>=H/2-.11-1e-6&&w<=H-.43+1e-6,key+' actual mesh intrudes into parking or a vehicle lane');
    }
   }
   const dining=items.filter(p=>p.color==='#f3eee2'&&Math.abs(p.sy-.028)<1e-6);
   assert.equal(dining.length,tables,key+' actual tablecloth-covered dining tables');
   assert(items.filter(p=>p.color==='#205998'&&Math.abs(p.sy-.065)<1e-6&&p.sx<.3).length>=tables*4,key+' dining chairs with backs');
   assert(items.filter(p=>p.color==='#242d35').length>=(size==='small'?4:6),'cooker range missing');
   assert(items.some(p=>p.color==='#8ca0a7'),'stainless preparation kitchen missing');
   assert(items.some(p=>p.color==='#123b72'&&Math.abs(p.rz)>.05),'blue pitched dining-house roof missing');
   assert(items.filter(p=>p.color==='#f1ddaf'&&!p.glow).length>50,'daylight restaurant lettering absent');
   assert(items.filter(p=>p.glow).length>8,'warm dining lights missing');
   if(size==='large')assert.equal(dining.filter(p=>p.y>3).length,4,'four genuine upper-floor dining tables');
   const result={instances:items.length,tables:dining.length,lights:items.filter(p=>p.glow).length};
   if(signature)assert.deepEqual(result,signature,'rotation changes restaurant');else signature=result;
  }
  results.push({key,...signature});
 }
 console.log(JSON.stringify({passed:true,restaurants:3,rotations:12,realDining:true,parkingPreserved:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
