const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];const {game:g}=new Function('require',fixture+'return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+'return {TrafficRenderer,Batch};')(THREE),r=Object.create(TrafficRenderer.prototype);r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};const results=[];
 for(const size of ['small','medium','large']){
  const key='casino_'+size,t=g.CATALOG[key],W=t.plotWidth,H=t.plotHeight;let base=null;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,id:99,x:20,y:20,rotation},batch=new Batch();r.building(batch,b,g.CATALOG,g.KINDS);const items=[...batch.data.values()].flatMap(group=>group.items.map(item=>({...item,geo:group.geo,color:group.color,glow:group.glow})));
   assert(items.length>250&&items.length<1300,'detailed but bounded instance count');let top=0;
   for(const item of items){
    assert([item.x,item.y,item.z,item.sx,item.sy,item.sz,item.rx,item.ry,item.rz].every(Number.isFinite));assert(item.sx>0&&item.sy>0&&item.sz>0);
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(item.x,item.y,item.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(item.rx,item.ry,item.rz)),new THREE.Vector3(item.sx,item.sy,item.sz));
    const vertices=item.geo.attributes.position;
    for(let k=0;k<vertices.count;k++){
     const p=new THREE.Vector3().fromBufferAttribute(vertices,k).applyMatrix4(matrix),x=p.x-b.x,z=p.z-b.y;
     const [u,v]=rotation===0?[x,z]:rotation===1?[z,H-x]:rotation===2?[W-x,H-z]:[W-z,x];
     assert(u>=.60-1e-6&&u<=W-.60+1e-6&&v>=H/2-.11&&v<=H-.43+1e-6,key+' model must clear every parking bank and access lane '+JSON.stringify({u,v}));top=Math.max(top,p.y);
    }
   }
   assert.equal(items.filter(i=>i.color==='#eee9db'&&Math.abs(i.sx-.47)<1e-6).length,3,'three actual card faces');
   assert(items.filter(i=>i.color==='#f2e9d4').length>=64,'segmented chip stacks');assert(items.filter(i=>i.glow).length>30,'nighttime cyan/magenta light details');
   const signature={instances:items.length,glows:items.filter(i=>i.glow).length,top:+top.toFixed(3)};if(base)assert.deepEqual(signature,base);else base=signature;
  }
  results.push({key,...base});
 }
 console.log(JSON.stringify({passed:true,models:3,rotations:12,cards:true,chips:true,parkingClear:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1});
