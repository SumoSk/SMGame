// Two fully bespoke procedural purple venue assets and their 4 rotations.
// This validates real geometry rather than screenshots or placeholder artwork.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',src+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const specs=[
  {key:'pub_medium',plot:[8,8],parking:20,workers:4,visitors:16,levels:1},
  {key:'pub_large',plot:[8,13],parking:40,workers:8,visitors:32,levels:2}
 ];
 const results=[];
 for(const spec of specs){
  const t=g.CATALOG[spec.key];
  assert.deepEqual([t.plotWidth,t.plotHeight],spec.plot,spec.key+' plot');
  assert.equal(t.parkingCapacity,spec.parking);
  assert.equal(t.jobs,spec.workers);
  assert.equal(t.service,spec.visitors);
  assert.equal(t.parkingZoneDepth,t.buildingZoneDepth);
  assert.equal(g.lotSlots({key:spec.key}).length,spec.parking);
  let baseline;
  for(let rotation=0;rotation<4;rotation++){
   const b={id:78,key:spec.key,x:34,y:45,rotation,parked:new Set(),parkingSlots:Array(spec.parking).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(entry=>entry.items.map(p=>({...p,color:entry.color,glow:entry.glow})));
   const local=items.map(p=>{
    const dx=p.x-b.x,dz=p.z-b.y;
    const uv=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:t.plotHeight-dx}:
      rotation===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    return {...p,...uv};
   });
   assert(items.length>=160&&items.length<=1500,'detailed-but-batched purple asset');
   assert(local.every(p=>[p.u,p.v,p.y,p.sx,p.sy,p.sz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0),
    spec.key+' has invalid geometry');
   // Full axis-aligned bounding boxes clear the parking/vehicle areas.
   const intruders=local.filter(p=>p.v-p.sz*.5<t.parkingZoneDepth-.08||
     p.u-p.sx*.5<.68||p.u+p.sx*.5>t.plotWidth-.68||
     p.v+p.sz*.5>t.plotHeight-.36);
   assert.equal(intruders.length,0,spec.key+' facade hit parking or car lane '+JSON.stringify(intruders.slice(0,4)));
   const count=color=>local.filter(p=>p.color===color).length;
   const top=Math.max(...local.map(p=>p.y+p.sy*.50));
   const colors=new Set(local.map(p=>p.color));
   assert(colors.size>=22,'missing materials and detailed architecture');
   assert(count('#b748ff')>=10,'purple neon identity missing');
   assert(count('#ffdaa2')>=3,'table and bar glow missing');
   assert(local.filter(p=>p.glow).length>=20,'too few nighttime accent lights');
   assert(!local.some(p=>p.sy>=1.6&&p.sx*p.sz>3.5),'monolithic solid bar not allowed');
   if(spec.levels===1){
    assert(top<3.1,'medium Live House must be ONE storey');
    assert(count('#3d334c')>=1,'raised live stage missing');
    assert(count('#693981')>=1,'drum kit absent');
    assert(count('#232332')>=2,'speakers absent');
    assert(count('#5a376c')>=1,'L-bar absent');
    assert(count('#9c8494')>=3,'viewing tables absent');
    assert(count('#7c5b8f')===0,'medium must have no second-floor VIP');
   }else{
    assert(top>4&&top<5,'large nightclub must be TWO levels, no third floor');
    assert(count('#7c5b8f')>=2,'VIP second floor wings missing');
    assert(count('#ae8ac1')>=1,'VIP rear connecting bridge missing');
    assert(count('#c2a0ca')>=6,'second-floor VIP furnishings missing');
    assert(count('#8439d2')>=1,'large DJ LED absent');
    assert(count('#232332')>=2,'large speaker tower missing');
    assert(count('#b748ff')>=20,'large dance floor/neon detailing absent');
    assert(local.some(p=>p.color==='#c2a0ca'&&p.y>2.7),'VIP furniture must be elevated, not on ground');
   }
   const summary={instances:items.length,colors:colors.size,top:+top.toFixed(3),
    glows:local.filter(p=>p.glow).length};
   if(baseline)assert.deepEqual(summary,baseline,spec.key+' changed between orientations');
   else baseline=summary;
  }
  results.push({...spec,...baseline});
 }
 // Preserve original bespoke brick LOCAL PUB and protected large house.
 const originalSmall=g.CATALOG.pub_small,smallBatch=new Batch();
 const small={id:201,key:'pub_small',x:30,y:30,rotation:0,
  parked:new Set(),parkingSlots:Array(originalSmall.parkingCapacity).fill(null)};
 renderer.building(smallBatch,small,g.CATALOG,{});
 assert([...smallBatch.data.values()].reduce((n,k)=>n+k.items.length,0)>500);
 const grand=g.CATALOG.home_grand;
 assert.deepEqual([grand.plotWidth,grand.plotHeight,grand.parkingCapacity],[11,13,60]);
 console.log(JSON.stringify({passed:true,models:results,rotations:8,
  existingSmallPubPreserved:true,grandHousePreserved:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
