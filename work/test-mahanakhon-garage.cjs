const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;
 const intersects=(pose,p)=>{
  const a=Math.atan2(Math.sin(pose.angle)/.78,Math.cos(pose.angle)),b=-p.ry;
  const dx=p.x-(pose.x-.5),dz=p.z-(pose.y-.5);
  for(const [x,z] of [[Math.cos(a),Math.sin(a)],[-Math.sin(a),Math.cos(a)],
   [Math.cos(b),Math.sin(b)],[-Math.sin(b),Math.cos(b)]]){
   const car=.285*Math.abs(x*Math.cos(a)+z*Math.sin(a))+.13*Math.abs(-x*Math.sin(a)+z*Math.cos(a));
   const wall=p.sx/2*Math.abs(x*Math.cos(b)+z*Math.sin(b))+p.sz/2*Math.abs(-x*Math.sin(b)+z*Math.cos(b));
   if(Math.abs(dx*x+dz*z)>=car+wall-.002)return false;
  }
  return true;
 };
 let checked=0;
 for(const key of ['home_mahanakhon','home_mahanakhon_compact'])for(let rotation=0;rotation<4;rotation++){
  const t=g.CATALOG[key],b={key,id:990000,x:60,y:60,rotation,parkingSlots:Array(80).fill(null),parked:new Set(),queue:[]};
  g.state.buildings.set(b.id,b);g.state.vehicles.clear();
  const batch=new Batch({detailGroups:true});renderer.building(batch,b,g.CATALOG,{});
  const trimColors=new Set(['#9a8770','#7d8f91','#c1a57c']);
  const walls=[...batch.data.values()].filter(x=>x.finish==='tower-garage-shell'||trimColors.has(x.color)).flatMap(x=>x.items)
   .filter(p=>p.y-p.sy/2<.60&&p.y+p.sy/2>.18);
  assert(walls.length>=6,'parking base needs actual solid side walls');
  for(let slot=0;slot<80;slot++){
   const parked=g.parkingSlotPose(b,slot);
   assert(walls.every(p=>!intersects(parked,p)),key+' parked car intersects shell, bay '+slot);
   b.parked.clear();b.parkingSlots.fill(null);g.state.vehicles.clear();b.grandSignal=null;
   const citizen=g.newCitizen(b);b.parked.add(citizen.id);b.parkingSlots[slot]=citizen.id;
   const v={id:++g.state.nextId,fromId:b.id,citizenId:citizen.id,phase:'departing',lastMovedAt:g.state.time};
   citizen.vehicleId=v.id;g.state.vehicles.set(v.id,v);
   for(let step=0;step<1200&&!v.lotReady;step++){
    g.state.time+=.04;g.prepareLotDeparture(v,.04);
    const pose=g.parkingPose(v);assert(pose,'departure needs a physical path');
    assert(walls.every(p=>!intersects(pose,p)),key+' moving car intersects shell, bay '+slot+' rotation '+rotation);
   }
   assert(v.lotReady,key+' departure should reach gate, bay '+slot);checked++;
  }
 }
 const b={key:'home_mahanakhon',id:1,x:0,y:0,rotation:0};
 const normal=new Batch({detailGroups:true}),low=new Batch({detailGroups:true,lowDetail:true});
 renderer.building(normal,b,g.CATALOG,{});renderer.building(low,b,g.CATALOG,{});
 const lit=x=>[...x.data.values()].filter(g=>g.finish==='night-tower-window');
 const count=x=>lit(x).reduce((n,g)=>n+g.items.length,0);
 assert(count(normal)>50,'tower needs a visible distribution of lit glass windows');
 assert.equal(count(low),count(normal),'window lights must survive LOW graphics');
 assert(lit(normal).every(g=>g.glow),'window light panels must use the existing night-only lighting system');
 // Exercise the real day/night updater on CPU-side Three.js objects,
 // without needing a GPU or replacing the lighting logic under test.
 renderer.scene=new THREE.Scene();renderer.scene.background=new THREE.Color();
 renderer.skyLight={intensity:1};renderer.light={color:new THREE.Color(),position:new THREE.Vector3()};
 renderer.renderer={};renderer.cam={x:0,y:0,z:1};renderer.carSets=new Map();
 renderer.roadGroup=new THREE.Group();renderer.lampGroup=new THREE.Group();
 renderer.buildingGroup=normal.build(false);renderer.graphicQuality='high';renderer.lastGlow=-1;
 renderer.rainPoints=new Float32Array(0);renderer.rainSeeds=[];
 renderer.rain={visible:false,material:{opacity:0},position:new THREE.Vector3(),geometry:{attributes:{position:{}}}};
 const windows=()=>renderer.buildingGroup.children.filter(m=>m.userData.nightRole==='tower-window');
 renderer.updateWeatherLight({time:720,city:'bangkok'});
 assert(windows().length&&windows().every(m=>!m.visible),'windows must be off at noon');
 renderer.updateWeatherLight({time:1380,city:'bangkok'});
 assert(windows().every(m=>m.visible&&m.material.opacity>.5&&m.material.emissiveIntensity>1),
  'glass windows must emit visible warm light at night');
 renderer.updateWeatherLight({time:2160,city:'bangkok'});
 assert(windows().every(m=>!m.visible),'window lights must switch off again the next day');
 renderer.buildingGroup=low.build(false);renderer.graphicQuality='low';renderer.lastGlow=-1;
 renderer.updateWeatherLight({time:1380,city:'bangkok'});
 assert(windows().every(m=>m.visible),'LOW graphics must still show windows at night');
 const cafe=[...normal.data.values()].filter(g=>g.color==='#a47b53'||g.color==='#b58c62').flatMap(g=>g.items);
 assert(cafe.length>10&&cafe.every(p=>p.y>1.70),'wood cafe floor must remain above all parked cars');
 console.log(JSON.stringify({passed:true,departuresWithoutShellCollision:checked,rotations:4,legacy:true,nightWindows:count(normal),lowGraphics:true,cafeAboveParking:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
