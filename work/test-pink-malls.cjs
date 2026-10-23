// Four orientation 3D asset tests for the pink mall collection.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const src=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',src+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const rendererJS=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',rendererJS+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const specs=[
  {key:'mall_small',plot:[7,8],capacity:15,workers:3,guests:12,floors:1},
  {key:'mall_medium',plot:[11,8],capacity:30,workers:6,guests:24,floors:2},
  {key:'mall_large',plot:[11,13],capacity:60,workers:12,guests:48,floors:3}
 ];
 const results=[];
 for(const test of specs){
  const t=g.CATALOG[test.key];
  assert(t&&t.plannedParking,'missing parking-first mall');
  assert.deepEqual([t.plotWidth,t.plotHeight],test.plot,test.key+' parcel');
  assert.equal(t.parkingCapacity,test.capacity);
  assert.equal(t.jobs,test.workers);
  assert.equal(t.service,test.guests);
  assert.equal(g.lotSlots({key:test.key}).length,test.capacity);
  assert.equal(t.parkingZoneDepth,t.buildingZoneDepth);
  let exemplar;
  for(let rotation=0;rotation<4;rotation++){
   const b={key:test.key,x:40,y:50,id:91,rotation,parked:new Set(),parkingSlots:Array(test.capacity).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(group=>group.items.map(p=>({...p,color:group.color,glow:group.glow})));
   const local=items.map(p=>{
    const dx=p.x-b.x,dz=p.z-b.y;
    const xy=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:t.plotHeight-dx}:
     rotation===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    return {...p,...xy};
   });
   assert(local.length>=140&&local.length<=1800,test.key+' graphic budget');
   assert(local.every(p=>[p.x,p.y,p.z,p.sx,p.sy,p.sz,p.u,p.v].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0),
    test.key+' nonfinite geometry');
   // Whole geometry extents, not just centers. Margins preserve both side
   // drives, rear parking half and street-entry frontage connector.
   const bad=local.filter(p=>p.u-p.sx*.50<.68||p.u+p.sx*.50>t.plotWidth-.68||
    p.v-p.sz*.50<t.parkingZoneDepth-.08||p.v+p.sz*.50>t.plotHeight-.37);
   assert.equal(bad.length,0,test.key+' rotation '+rotation+
    ' hard 3D fixture touches parking or driveway '+JSON.stringify(bad.slice(0,4)));
   const count=c=>local.filter(p=>p.color===c).length;
   const height=Math.max(...local.map(p=>p.y+p.sy/2));
   const materialCount=new Set(local.map(p=>p.color)).size;
   assert(materialCount>=22,test.key+' needs nuanced pink and decorative colors');
   assert(local.filter(p=>p.glow).length>12,'visible nighttime lighting required');
   assert(['#e58dab','#facbd8','#d872a0','#ed9fbe'].some(c=>count(c)>2),
     test.key+' not visibly pink');
   // A big opaque monolith is NOT allowed; expose the open atrium.
   assert.equal(local.filter(p=>p.sy>1.50&&p.sx*p.sz>4.2).length,0,
    test.key+' looks like one solid block');
   const actualFloors=[.25,2.42,4.59].filter(y=>local.some(p=>p.color==='#e6dfd5'&&Math.abs(p.y-y)<.07));
   if(test.floors===1){
    assert(height<3.1,'community plaza cannot be 2 floors');
    assert(count('#e2c3d1')>0&&count('#6daec6')>0,'public plaza fountain missing');
    assert(count('#b8997e')>=2,'community benches missing');
    assert(count('#fce4bb')>=2,'open single-floor shops missing');
    assert(actualFloors.length===1,'small mall should have one ground storey only');
   }else if(test.floors===2){
    assert(height>4.0&&height<5.2,'lifestyle gallery MUST be exactly two floors');
    assert(count('#f3e8e2')>=2,'actual second floor balconies missing');
    assert(count('#9ad4d9')>=28,'two visible escalators missing');
    assert(count('#f4e9df')>0,'suspended skybridge missing');
    assert(count('#e9d0d6')>0,'ground plaza missing');
    assert(count('#6daec6')===0,'must not reuse small-plaza fountain design');
   }else{
    assert(height>7.0&&height<8.4,'Grand Mall must have exactly three occupied floors');
    assert(actualFloors.length===3,'grand mall must render ALL three occupied storeys');
    assert(count('#9ad4d9')>=50,'multiple grand atrium escalators missing');
    assert(count('#db72aa')>0&&count('#554d69')>0,'event LED stage missing');
    assert(count('#f4e9df')>=2,'two upper-floor sky bridges missing');
    assert(count('#d99cbb')>0,'decorative glass skylight missing');
    assert(count('#f5acbc')>0,'pink tree planter details missing');
   }
   const digest={instances:items.length,colors:materialCount,top:+height.toFixed(2),
    lights:local.filter(p=>p.glow).length};
   if(exemplar)assert.deepEqual(digest,exemplar,test.key+' cardinal rotation changed architecture');
   else exemplar=digest;
  }
  results.push({...test,...exemplar});
 }
 const grand=g.CATALOG.home_grand;
 assert.deepEqual([grand.plotWidth,grand.plotHeight,grand.parkingCapacity],[11,13,60]);
 const b={key:'home_grand',x:30,y:30,id:77,rotation:0,parked:new Set(),parkingSlots:Array(60).fill(null)};
 const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
 assert([...batch.data.values()].reduce((n,group)=>n+group.items.length,0)>50);
 console.log(JSON.stringify({passed:true,variants:3,rotations:12,grandHomeUnchanged:true,results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
