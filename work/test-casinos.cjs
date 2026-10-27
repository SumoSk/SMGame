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
 // Low graphics must keep the distinct gaming halls with fewer decorative
 // instanced emissive strips. No extra animations or costly dynamic lights.
 const key='casino_large',t=g.CATALOG[key];
 r.graphicQuality='low';
 const lowBatch=new Batch();r.building(lowBatch,{key,id:100,x:20,y:20,rotation:0},g.CATALOG,g.KINDS);
 const lowItems=[...lowBatch.data.values()].flatMap(x=>x.items.map(p=>({color:x.color,glow:x.glow,...p})));
 assert(lowItems.length<results[2].instances,'Low mode must cut neon detailing');
 assert(lowItems.filter(x=>x.glow).length>25,'Low mode must retain atmospheric visible neon');
 assert(lowItems.some(x=>x.color==='#4a8096')&&lowItems.some(x=>x.color==='#43758e'),
  'Low mode must preserve separated lobby and gaming arcade');
 r.graphicQuality=undefined;
 const starter=g.CATALOG.casino_starter,starterBatch=new Batch();
 r.building(starterBatch,{key:'casino_starter',id:101,x:20,y:20,rotation:0},
  g.CATALOG,g.KINDS);
 const starters=[...starterBatch.data.values()].flatMap(x=>x.items.map(p=>({color:x.color,...p})));
 assert(starters.some(x=>x.color==='#6d7ead')&&starters.some(x=>x.color==='#63c7ce'),
  'starter casino should have distinct circular roulette and slot pavilions');
 assert(!starters.some(x=>x.color==='#282c48'&&x.sx>2),
  'starter casino must not contain its former solid box');
  console.log(JSON.stringify({passed:true,models:3,rotations:12,cards:true,chips:true,parkingClear:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1});
