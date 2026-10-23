// Verifies live SMGame small/medium house geometry, four orientations,
// occupancy, floors, and real parking/side-spine clearances.
// The prior large home, legacy home keys, and vehicle logic are untouched.
const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const rendererCode=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',rendererCode+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const specs=[
  {key:'home_large',label:'small garden cottage',plot:[8,8],people:20,levels:1},
  {key:'home_dual',label:'medium two-storey courtyard',plot:[8,13],people:40,levels:2}
 ];
 const reports=[];
 for(const spec of specs){
  const t=g.CATALOG[spec.key];
  assert(t&&t.plannedParking&&t.kind==='home');
  assert.equal(t.name,spec.levels===1?'บ้านเล็ก':'บ้านกลาง');
  assert.deepEqual([t.plotWidth,t.plotHeight],spec.plot);
  assert.equal(t.residents,spec.people);
  assert.equal(t.parkingCapacity,spec.people);
  assert.equal(g.lotSlots({key:spec.key}).length,spec.people);
  assert.equal(t.parkingZoneDepth,t.buildingZoneDepth);
  let baseline;
  for(let rotation=0;rotation<4;rotation++){
   const b={key:spec.key,id:140,x:35,y:44,rotation,parked:new Set(),parkingSlots:Array(spec.people).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(k=>k.items.map(p=>({...p,color:k.color,glow:k.glow})));
   const local=items.map(p=>{
    const x=p.x-b.x,z=p.z-b.y;
    const q=rotation===0?{u:x,v:z}:rotation===1?{u:z,v:t.plotHeight-x}:
     rotation===2?{u:t.plotWidth-x,v:t.plotHeight-z}:{u:t.plotWidth-z,v:x};
    return {...p,u:+q.u.toFixed(6),v:+q.v.toFixed(6)};
   });
   assert(items.length>=145&&items.length<=1200,spec.key+' needs detailed but mobile-safe 3D');
   assert(local.every(p=>[p.u,p.v,p.y,p.sx,p.sy,p.sz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0),
    spec.key+' has non-finite or degenerate geometry');
   const bad=local.filter(p=>
    p.v-p.sz*.5<t.parkingZoneDepth-.08||
    p.v+p.sz*.5>t.plotHeight-.34||
    p.u-p.sx*.5<.68||p.u+p.sx*.5>t.plotWidth-.68);
   assert.equal(bad.length,0,spec.key+' rotation '+rotation+' blocks parking or side roadway '+JSON.stringify(bad.slice(0,3)));
   const count=color=>local.filter(p=>p.color===color).length;
   const colors=new Set(local.map(p=>p.color));
   assert(colors.size>=23,'garden home materials missing');
   assert(local.filter(p=>p.glow).length>=15,'warm lit home ambience missing');
   const top=Math.max(...local.map(p=>p.y+p.sy*.5));
   // Never build one solid tower wall that blocks the entire courtyard.
   assert.equal(local.filter(p=>p.sy>1.7&&p.sx*p.sz>3.7).length,0,
    spec.key+' became a single solid cuboid');
   if(spec.levels===1){
    assert(top>2.0&&top<3.1,'small HOME must be one storey');
    assert(count('#aa6c52')>=1&&count('#836960')>=1,
     'two offset pitched roof volumes missing');
    assert(count('#f2e7d7')>=1,'family living room missing');
    assert(count('#73b5bc')>=1,'garden pool missing');
    assert(count('#af835d')>=4,'visible timber outdoor patio missing');
    assert(count('#e2b4a6')>=2,'furnished bedroom missing');
   }else{
    assert(top>4.4&&top<5.2,'medium HOME must have exactly two occupied storeys');
    assert(count('#e3dad0')>=2,'separate second-floor wings missing');
    assert(count('#efe5d7')>=1,'open second-floor skybridge missing');
    assert(count('#8eb9b7')>=15,'two external stairways missing');
    assert(count('#f5e7d4')>=10,'furnished homes on two levels missing');
    assert(count('#68adb9')>=1,'shared courtyard pool missing');
    assert(local.some(p=>p.color==='#e2b4a6'&&p.y>2.4),
     'actual upstairs bedroom furniture missing');
   }
   const digest={geometry:items.length,colors:colors.size,
    top:+top.toFixed(3),lights:local.filter(p=>p.glow).length};
   if(baseline)assert.deepEqual(digest,baseline,spec.key+' changed when rotated');
   else baseline=digest;
  }
  reports.push({...spec,...baseline});
 }
 // Existing grand house is NOT the target of this redesign.
 const grand=g.CATALOG.home_grand;
 assert.deepEqual([grand.plotWidth,grand.plotHeight,grand.parkingCapacity],[11,13,60]);
 const b={key:'home_grand',id:91,x:20,y:20,rotation:0,parked:new Set(),parkingSlots:Array(60).fill(null)};
 const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
 assert([...batch.data.values()].reduce((sum,v)=>sum+v.items.length,0)>=150,
  'protected grand house failed to render');
 assert.equal(g.CATALOG.home_small.name,'บ้านรุ่นเก่า 2 คน');
 assert.equal(g.CATALOG.home_medium.name,'บ้านรุ่นเก่า 10 คน');
 console.log(JSON.stringify({passed:true,redesigned:2,rotations:8,homeGrandPreserved:true,
  legacyNamesPreserved:true,models:reports}));
})().catch(e=>{console.error(e);process.exitCode=1;});
