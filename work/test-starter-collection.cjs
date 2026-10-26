const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',fixture+'return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',src+'return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const signatures=new Set(),results=[];
 for(const kind of Object.values(g.CATALOG).filter(t=>t.starterTier).map(t=>t.kind)){
  const key=kind+'_starter',t=g.CATALOG[key];assert(t,key);
  assert.equal(t.plotWidth,3);assert.equal(t.plotHeight,3);assert.equal(t.parkingCapacity,6);assert.equal(g.lotSlots({key}).length,6);
  assert.equal(t.plannedParking,undefined,'starter must not inherit a larger parking plot');
  if(kind==='home')assert.equal(t.residents,6);
  else if(kind==='office'||kind==='factory')assert.equal(t.jobs,6);
  else if(kind==='hotel'){assert.equal(t.beds,5);assert.equal(t.jobs,1);}
  else{assert.equal(t.service,5);assert.equal(t.jobs,1);}
  let signature=null;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,id:91,x:20,y:20,rotation},batch=new Batch();renderer.building(batch,b,g.CATALOG,g.KINDS);
   let count=0,top=0,rearDetails=0,sideDetails=0;
   for(const group of batch.data.values())for(const item of group.items){
    count++;if(rotation===0){if(item.z-20<.20&&item.sz<.21&&item.y>.20)rearDetails++;if((item.x-20<.40||item.x-20>2.62)&&item.sx<.22&&item.y>.20)sideDetails++;}assert([item.x,item.y,item.z,item.sx,item.sy,item.sz].every(Number.isFinite));assert(item.sx>0&&item.sy>0&&item.sz>0);
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(item.x,item.y,item.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(item.rx,item.ry,item.rz)),new THREE.Vector3(item.sx,item.sy,item.sz));
    for(let n=0;n<group.geo.attributes.position.count;n++){
     const p=new THREE.Vector3().fromBufferAttribute(group.geo.attributes.position,n).applyMatrix4(matrix),x=p.x-20,z=p.z-20;
     const [u,v]=rotation===0?[x,z]:rotation===1?[z,3-x]:rotation===2?[3-x,3-z]:[3-z,x];
     assert(u>=0&&u<=3&&v>=0&&v<1.28,key+' model must remain behind parking in every rotation '+JSON.stringify({rotation,u,v}));top=Math.max(top,p.y);
    }
   }
   assert(count>45&&count<500,key+' detailed but bounded');
   if(rotation===0){assert(rearDetails>=10,key+' detailed rear elevation');assert(sideDetails>=6,key+' detailed side elevations');}
   const next=JSON.stringify({count,top:+top.toFixed(4)});if(signature)assert.equal(next,signature);else signature=next;
  }
  assert(!signatures.has(signature),key+' must have its own architecture');signatures.add(signature);results.push({key,...JSON.parse(signature)});
  g.state.money=1e8;const b=g.buildBuilding(key,160+results.length*8,145,true);assert(b,key+' road access');
  const save=g.snapshot();assert(g.loadGame(true,null,save));assert(g.state.buildings.has(b.id),key+' save round-trip');
 }
 for(const [category,kinds] of Object.entries({food:['shop','restaurant','mall'],work:['office','factory'],leisure:['park','pub'],casino:['casino'],hotel:['hotel'],home:['home']})){
  const menu=g.dockItems(category);for(const kind of kinds){assert(menu.some(i=>i.key===kind+'_starter'));assert(menu.findIndex(i=>i.key===kind+'_starter')<menu.findIndex(i=>i.key===kind+'_small')||kind==='home');}
 }
 const hotel=[...g.state.buildings.values()].find(b=>b.key==='hotel_starter');
 const home=[...g.state.buildings.values()].find(b=>b.key==='home_starter'),worker=g.newCitizen(home);
 hotel.workers.add(worker.id);worker.workId=hotel.id;assert(Number.isFinite(g.workRoutine(worker).end),'hotel staff have a valid work schedule');
 console.log(JSON.stringify({passed:true,starterTypes:results.length,rotations:40,architectureClearOfParking:true,rearAndSidesDetailed:true,hotelStaff:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1});
