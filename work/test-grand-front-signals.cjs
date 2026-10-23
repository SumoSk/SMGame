const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',base+';return boot();')(require);
 const home=g.CATALOG.home_grand,small=g.CATALOG.home_large;
 assert.equal(home.plotWidth,small.plotWidth,'grand house must retain unchanged plot width');
 assert.equal(home.plotHeight,13,'keep existing grand-house plots/save footprints intact');
 assert(home.parkingAisle<7&&home.parkingRearAisle<home.parkingAisle,'both parking banks are behind the street-front building');
 const buildingsource=fs.readFileSync('dist/renderer3d.js','utf8');
 assert(buildingsource.includes('const u=W*.5,v=t.plotHeight-3.04'),'circular residence must face roadside');
 assert(buildingsource.includes('updateGrandSignals()'),'live signal must update every frame');
 g.state.money=1e9;
 const b=g.buildBuilding('home_grand',160,148-home.plotHeight,true);
 const office=g.buildBuilding('office_small',195,148-g.CATALOG.office_small.plotHeight,true);
 assert(b&&office,'house and test office should have valid road connections');
 assert.equal(b.access.length,2);
 const slots=g.lotSlots(b);
 assert.equal(slots.length,60);
 for(const slot of slots)assert(slot.v<home.plotHeight-4,'all stalls must remain behind street-facing villa');
 const gap=slots[30].v-slots[15].v-1.24;
 assert(gap>=-.01&&gap<.09,'courts remain immediately adjacent with no added corridor');
 function parkAt(i){
  const c=g.newCitizen(b);c.resident=true;c.location='home';c.locationId=b.id;c.state='อยู่บ้าน';b.residents.add(c.id);
  b.parked.add(c.id);b.parkingSlots[i]=c.id;return c;
 }
 const rear=parkAt(6),front=parkAt(36);
 assert(g.createTrip(rear,'work',b.id,office.id,null,null,null));
 assert(g.createTrip(front,'work',b.id,office.id,null,null,null));
 const vr=g.state.vehicles.get(rear.vehicleId),vf=g.state.vehicles.get(front.vehicleId);
 let seenFront=false,seenRear=false,signalConflict=false,firstGreen=null,elapsed=0;
 for(let n=0;n<8000;n++){
  g.state.time+=.04;
  g.advanceVehicles(.05,.04);elapsed++;
  if(vr.grandCrossing?.granted){seenRear=true;firstGreen??='rear';}
  if(vf.grandCrossing?.granted){seenFront=true;firstGreen??='front';}
  if(vr.grandCrossing?.granted&&vf.grandCrossing?.granted){signalConflict=true;break;}
  if(!b.parked.has(rear.id)&&!b.parked.has(front.id))break;
 }
 assert.equal(signalConflict,false,'intersection must never grant conflicting greens');
 assert(seenRear&&seenFront,'cars from BOTH courts must receive green');
 assert(!b.parked.has(rear.id)&&!b.parked.has(front.id),'BOTH cars must exit internal parking into the road');
 assert(vr.phase!=='departing'&&vf.phase!=='departing','vehicles must not remain stuck in parking');
 assert(b.grandSignal?.lastServed==='front'||b.grandSignal?.lastServed==='rear');
 assert(g.loadGame(true,null,g.snapshot()),'save/load must preserve new front-house layout');
 assert(g.state.buildings.get(b.id).grandFrontLayout);
 const source=buildingsource.replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const {TrafficRenderer}=new Function('THREE',source+';return {TrafficRenderer};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;renderer.buildingGroup=new THREE.Group();
 renderer.makeBuildings(g.state,g.CATALOG,{});
 assert(renderer.grandSignalLights.length===2,'two live traffic lamps must be rendered at the crossing');
 renderer.updateGrandSignals();
 console.log(JSON.stringify({passed:true,compact:[home.plotWidth,home.plotHeight],parkingBack:true,frontVilla:true,signal:'actual crossing',rearPassed:seenRear,frontPassed:seenFront,mutualExclusion:!signalConflict,steps:elapsed}));
})().catch(e=>{console.error(e);process.exitCode=1;});
