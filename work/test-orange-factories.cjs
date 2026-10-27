// Updated modern-factory architecture test: ALL four factory tiers, same
 // parking/road footprints, visible pitched solar roofs and light façades.
 const assert=require('node:assert/strict');
 const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
 (async()=>{
  const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
  const {game:g}=new Function('require',prefix+';return boot();')(require);
  const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
  const src=fs.readFileSync('dist/renderer3d.js','utf8')
   .replace(/import \* as THREE from '[^']+';/,'')
   .replace('export class TrafficRenderer','class TrafficRenderer');
  const {TrafficRenderer,Batch}=new Function('THREE',src+';return {TrafficRenderer,Batch};')(THREE);
  const renderer=Object.create(TrafficRenderer.prototype);
  renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
  const specs=[
   {key:'factory_starter',plot:[3,3],tier:0,parking:6,jobs:6,roofs:1,tanks:1},
   {key:'factory_small',plot:[8,8],tier:1,parking:20,jobs:20,roofs:2,tanks:1},
   {key:'factory_medium',plot:[8,13],tier:2,parking:40,jobs:40,roofs:2,tanks:2},
   {key:'factory_large',plot:[11,13],tier:3,parking:60,jobs:60,roofs:3,tanks:3}
  ];
  const summary=[];
  for(const spec of specs){
   const t=g.CATALOG[spec.key];
   assert(t,'missing '+spec.key);
   assert.deepEqual([t.plotWidth,t.plotHeight],spec.plot,'original plot dimensions');
   assert.equal(t.jobs,spec.jobs,'unchanged jobs');
   assert.equal(t.parkingCapacity,spec.parking,'unchanged parking slots');
   const slots=g.lotSlots({key:spec.key});
   assert.equal(slots.length,spec.parking);
   if(spec.tier)assert.equal(t.parkingZoneDepth,t.plotHeight/2);
   let baseline;
   for(let rot=0;rot<4;rot++){
    const b={key:spec.key,id:700+spec.tier,x:21,y:39,rotation:rot,parked:new Set(),parkingSlots:Array(spec.parking).fill(null)};
    const batch=new Batch();
    renderer.building(batch,b,g.CATALOG,{});
    const items=[...batch.data.values()].flatMap(group=>
     group.items.map(i=>({...i,color:group.color,glow:group.glow,finish:group.finish})));
    assert(items.length>=(spec.tier?115:45)&&items.length<850,'bounded rich factory geometry '+spec.key+' '+items.length);
    const local=items.map(p=>{
     const dx=p.x-b.x,dz=p.z-b.y;
     const uv=rot===0?{u:dx,v:dz}:rot===1?{u:dz,v:t.plotHeight-dx}:
      rot===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
     return {...p,u:uv.u,v:uv.v};
    });
    assert(local.every(p=>[p.u,p.v,p.y,p.sx,p.sy,p.sz,p.rz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0),'finite positive geometry');
    const left=spec.tier?.68:.13,right=t.plotWidth-(spec.tier?.68:.13);
    const rear=spec.tier?t.parkingZoneDepth-.08:.13;
    const front=t.plotHeight-(spec.tier?.34:1.66);
    const intruders=local.filter(p=>p.u-p.sx*.5<left-1e-4||
     p.u+p.sx*.5>right+1e-4||p.v-p.sz*.5<rear-1e-4||
     p.v+p.sz*.5>front+1e-4);
    assert.equal(intruders.length,0,spec.key+' geometry must leave parking and front access clear rotation '+rot+': '+JSON.stringify(intruders.slice(0,5)));
    // High/small factories use many thin wall sections, never a huge opaque box.
    assert.equal(local.filter(p=>p.sy>1.40&&p.sx*p.sz>3).length,0,'no solid giant cuboid halls');
    const count=c=>local.filter(p=>p.color===c).length;
    assert(count('#25435d')>=spec.roofs*2,'each pitched roof face has blue solar panels');
    assert(count('#7baebd')>=1,'a separate glass administration wing');
    assert(count('#bdcbca')>=spec.tanks,'silver vertical process silos');
    assert(local.filter(p=>Math.abs(p.rz)>.06&&p.sx>.4&&p.sz>.35).length>=spec.roofs*4,'gabled pitched roofing');
    assert(local.filter(p=>p.glow).length>=(spec.tier?4:1),'functional exterior lights');
    assert(count('#e6a952')===(spec.tier?spec.roofs:0),'non-moving forklifts in each loading bay');
    const signature={
     items:items.length,colors:new Set(items.map(p=>p.color)).size,
     roofPanels:count('#25435d'),silos:count('#bdcbca'),
     glows:local.filter(p=>p.glow).length
    };
    if(baseline)assert.deepEqual(signature,baseline,spec.key+' rotation mutated architecture complexity');
    else baseline=signature;
    if(spec.tier){
     const effectKinds=new Set(batch.factoryEffects?.map(p=>p.kind)||[]);
     for(const k of['steam','fan','weld','cargo'])
      assert(effectKinds.has(k),spec.key+' still needs bounded '+k+' factory effect');
    }
   }
   summary.push({...spec,...baseline});
  }
  // Existing limited animation pool must still behave on a real large factory:
  // play/pause/demolition should not leak effects or mutate vehicle routing.
  renderer.buildingGroup=new THREE.Group();renderer.camera=new THREE.PerspectiveCamera();
  const example=new Batch(),b={key:'factory_large',id:1100,x:21,y:39,rotation:2,
   parked:new Set(),parkingSlots:Array(60).fill(null)};
  renderer.building(example,b,g.CATALOG,{});
  renderer.createFactoryEffects(example.factoryEffects);
  const state={speed:1,buildings:new Map([[1100,b]])},cam={x:28,y:45,z:1};
  renderer.updateFactoryEffects(state,cam,1);
  renderer.updateFactoryEffects(state,cam,1.09);
  assert(renderer.factoryFx.steam.count>0&&renderer.factoryFx.parts.count>0&&renderer.factoryFx.sparks.count>0,'factory animated cues');
  const positions=renderer.factoryFx.parts.instanceMatrix.array.slice();
  renderer.updateFactoryEffects(state,cam,1.18);
  assert(positions.some((x,i)=>x!==renderer.factoryFx.parts.instanceMatrix.array[i]),'factory effect should animate');
  state.speed=0;
  const freeze=renderer.factoryFxTime;
  renderer.updateFactoryEffects(state,cam,2);
  assert.equal(renderer.factoryFxTime,freeze,'pause respects game speed');
  state.buildings.clear();
  renderer.updateFactoryEffects(state,cam,2.1);
  assert.equal(renderer.factoryFx.steam.count+renderer.factoryFx.parts.count+renderer.factoryFx.sparks.count,0,'demolished factory leaves no effect');
  assert.deepEqual([g.CATALOG.home_grand.plotWidth,g.CATALOG.home_grand.plotHeight,g.CATALOG.home_grand.parkingCapacity],[11,13,60],'unrelated home unaffected');
  console.log(JSON.stringify({passed:true,modernFactoryTiers:summary,rotations:16,parkingUnchanged:true}));
 })().catch(e=>{console.error(e);process.exitCode=1;});
