// Regression for three-tier factory night lighting and truly lightweight Low.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
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
  ['factory_starter',0,1],['factory_small',1,2],
  ['factory_medium',2,2],['factory_large',3,3]
 ];
 for(const [key,tier,bays] of specs){
  const t=g.CATALOG[key],counts=[];
  for(let rotation=0;rotation<4;rotation++){
   const b={key,id:220+tier,x:35,y:45,rotation,parked:new Set(),
    parkingSlots:Array(t.parkingCapacity).fill(null)};
   const batch=new Batch({detailGroups:true});renderer.building(batch,b,g.CATALOG,{});
   const tagged=[...batch.data.values()].filter(entry=>entry.finish.startsWith('factory-night-'));
   const countsByTier=tag=>tagged.filter(x=>x.finish==='factory-night-'+tag)
    .reduce((n,x)=>n+x.items.length,0);
   const essential=countsByTier('essential'),detail=countsByTier('detail'),reactor=countsByTier('reactor');
   assert(essential>=bays,'Low has warm loading lighting at all bays '+key);
   assert(detail>=bays*4,'Medium/High have separate perimeter/tank LEDs '+key);
   assert.equal(reactor>0,tier===3,'only large reactor is pulsing '+key);
   for(const group of tagged)for(const item of group.items){
    const dx=item.x-b.x,dz=item.z-b.y;
    const uv=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:t.plotHeight-dx}:
     rotation===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    const rear=t.starterTier?.13:t.parkingZoneDepth-.08;
    const front=t.starterTier?1.34:t.plotHeight-.34;
    assert(uv.v-item.sz/2>=rear-.0001&&uv.v+item.sz/2<=front+.0001,
     key+' night light spills into parking or front road');
    assert(uv.u-item.sx/2>=.12&&uv.u+item.sx/2<=t.plotWidth-.12,
     key+' night light spills outside property');
   }
   const group=batch.build(false);
   renderer.buildingGroup=group;renderer.graphicQuality='low';renderer.lastGlow=1;
   renderer.lastBuildingDetailLevel=null;
   renderer.updateBuildingDetailLOD({z:2});
   const selected={essential:[],detail:[],reactor:[]};
   group.traverse(mesh=>{
    const tag=mesh.userData?.factoryNightTier;
    if(tag)selected[tag].push(mesh);
   });
   assert(selected.essential.length&&selected.detail.length,'night-specific InstancedMeshes exist');
   assert(selected.essential.every(mesh=>mesh.visible),'Low keeps basic lighting');
   assert(selected.detail.every(mesh=>!mesh.visible),'Low removes luxury perimeter glows');
   assert(selected.reactor.every(mesh=>!mesh.visible),'Low removes animated reactor ring');
   renderer.graphicQuality='medium';renderer.lastBuildingDetailLevel=null;
   renderer.updateBuildingDetailLOD({z:2});
   assert([...selected.essential,...selected.detail,...selected.reactor].every(mesh=>mesh.visible),
    'Medium restores all lighting');
   renderer.graphicQuality='low';renderer.lastGlow=0;
   renderer.lastBuildingDetailLevel=null;renderer.updateBuildingDetailLOD({z:2});
   assert([...selected.essential,...selected.detail,...selected.reactor].every(mesh=>!mesh.visible),
    'Daytime hides special night lamps in all quality presets');
   counts.push([essential,detail,reactor]);
  }
  assert(counts.every(x=>JSON.stringify(x)===JSON.stringify(counts[0])),'rotation changes lighting complexity '+key);
 }
 assert(src.includes('this.factoryNightPulseMeshes=[]'),'pulse groups are cached on building rebuild');
 assert(src.includes("const wave=.81+.19*Math.sin(performance.now()*.001*2.6)"),
  'reactor pulse animates its existing material, without new meshes');
 assert(src.includes("this.lastGlow=-1; // Force refresh"),'switching Low/high immediately updates night lamps');
 assert(!src.includes('new THREE.PointLight('),'no dynamic point lights allocated for factories');
 console.log('Modern factory night and Low quality regression passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
