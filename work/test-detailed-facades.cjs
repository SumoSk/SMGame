// Four-sided game-geometry QA for the art-directed building collection.
// Run headlessly: this tests the actual three.js instances, not a mock image.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const boot=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',boot+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',src+';return {TrafficRenderer,Batch};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const modelKeys=['home_large','home_dual',...['office','factory','shop','restaurant','mall','park','pub','hotel']
   .flatMap(kind=>['small','medium','large'].map(size=>kind+'_'+size))];
 const results=[];
 for(const key of modelKeys){
  const t=g.CATALOG[key],tier=key==='home_large'?1:key==='home_dual'?2:key.endsWith('small')?1:key.endsWith('medium')?2:3;
  let exemplar;
  for(let rot=0;rot<4;rot++){
   const b={key,x:26,y:32,id:77,rotation:rot,parked:new Set(),parkingSlots:Array(t.parkingCapacity).fill(null)};
   const batch=new Batch();r.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(group=>group.items.map(p=>({...p,color:group.color,glow:group.glow})));
   // Avoid foundations/driveways; elevations have facade details above 0.40.
   const upper=items.filter(p=>p.y>.40);
   const positioned=upper.map(p=>{
    const dx=p.x-b.x,dz=p.z-b.y;
    const uv=rot===0?{u:dx,v:dz}:rot===1?{u:dz,v:t.plotHeight-dx}:
      rot===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    return {...uv,y:p.y,color:p.color,glow:p.glow,sx:p.sx,sz:p.sz};
   });
   if(t.plannedParking){
    // Verify full geometry footprint, including its half-size in both local
    // axes. 0.08 is allowed for low edging tolerance, not for parked cars.
    const intruders=positioned.filter(p=>p.v-p.sz/2<t.parkingZoneDepth-.08);
    assert.equal(intruders.length,0,key+' rotation '+rot+
      ': physical decoration intrudes on rear parking: '+JSON.stringify(intruders.slice(0,3)));
    const spineIntruders=positioned.filter(p=>p.u-p.sx/2<.69||
      p.u+p.sx/2>t.plotWidth-.69);
    assert.equal(spineIntruders.length,0,key+' rotation '+rot+
      ': physical decoration blocks a side car lane: '+JSON.stringify(spineIntruders.slice(0,3)));
   }
   const u=t.plotWidth/2, v=t.kind==='hotel'?t.size/2:t.parkingZoneDepth+t.buildingZoneDepth/2;
   const sides={
    front:positioned.filter(p=>p.v>v+.43),
    back:positioned.filter(p=>p.v<v-.43),
    left:positioned.filter(p=>p.u<u-.63),
    right:positioned.filter(p=>p.u>u+.63)
   };
   for(const [face,detail] of Object.entries(sides)){
    assert(detail.length>=5,key+' rotation '+rot+': '+face+' side lacks detail: '+detail.length);
    assert(new Set(detail.map(p=>p.color)).size>=3,key+' rotation '+rot+': '+face+' is a monotonous blank wall');
   }
   const lit=positioned.filter(p=>p.glow).length;
   assert(lit>=4,key+' lighting missing');
   assert(items.length<=1600,key+' has too many draw instances for mobile');
   // Cardinal rotation must leave the local 4-face signature invariant.
   const signature=Object.fromEntries(Object.entries(sides).map(([k,items])=>[k,items.length]));
   if(exemplar)assert.deepEqual(signature,exemplar.faces,key+' changed elevation across rotations');
   else exemplar={faces:signature,items:items.length,colors:new Set(items.map(x=>x.color)).size,glows:lit};
  }
  results.push({key,...exemplar});
 }
 const groups=['office','factory','shop','restaurant','mall','park','pub','hotel'];
 for(const kind of groups){
  const models=results.filter(x=>x.key.startsWith(kind+'_'));
  assert(models.length===3);
  assert(new Set(models.map(x=>[x.items,x.colors,x.glows].join(':'))).size===3,kind+' tiers look identical');
 }
 const grand=Object.create(TrafficRenderer.prototype);grand.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const gb=new Batch();grand.building(gb,{key:'home_grand',x:30,y:42,id:999,rotation:0,parked:new Set(),parkingSlots:Array(60).fill(null)},g.CATALOG,{});
 const grandGeom=gb.data.size;
 assert(grandGeom>5,'protected grand house is missing');
 console.log(JSON.stringify({passed:true,models:results.length,facadesChecked:results.length*4*4,
  averageInstances:Math.round(results.reduce((n,x)=>n+x.items,0)/results.length),
  maxInstances:Math.max(...results.map(x=>x.items)),grandPreserved:true,
  sample:results.filter(x=>['home_large','office_large','factory_large','mall_large','pub_small','hotel_large'].includes(x.key))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
