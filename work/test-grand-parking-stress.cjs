const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',base+';return boot();')(require);
 g.state.money=1e9;
 const t=g.CATALOG.home_grand,old=g.CATALOG.home_large;
 const building=g.buildBuilding('home_grand',160,148-t.plotHeight,true);
 const office=g.buildBuilding('office_medium',195,148-g.CATALOG.office_medium.plotHeight,true);
 assert(building&&office,'grand house and target must be road-accessible');
 const visuals=g.parkingVisuals(building),asphalt=visuals.filter(r=>r.color==='#515f62'),paint=visuals.filter(r=>r.color==='#e9e6cc');
 assert.equal(asphalt.length,2,'two original-color parking asphalt banks only');
 assert(paint.length>=4*15*3,'each bay uses original small-home paint');
 assert.equal(t.plotWidth,old.plotWidth);assert.equal(t.plotHeight,13);
 const banks=[...new Set(g.lotSlots(building).map(slot=>slot.aisle))];
 assert.equal(banks.length,2);assert(Math.max(...banks)<6,'both banks behind the villa');
 // Geometry-only test: no generic foundation, ornamental bed, balcony, stairs,
 // or pillar may intrude into the parking courts or side driveway.
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const code=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',code+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=null;
 const batch=new Batch();renderer.building(batch,building,g.CATALOG,{});
 const items=[...batch.data.values()].flatMap(b=>b.items);
 assert(items.length>50,'luxury facade should retain its distinctive detailed appearance');
 const failures=items.filter(i=>{
   const extX=(i.sx||0)*.5,extZ=(i.sz||0)*.5;
   return i.z-extZ<building.y+6.80||
    i.z+extZ>building.y+t.plotHeight+.01||
    i.x-extX<building.x+1.05||i.x+extX>building.x+t.plotWidth-1.05;
 });
 assert.equal(failures.length,0,'architectural geometry must stay out of parking area and both side driveways: '+JSON.stringify(failures.slice(0,2)));
 const chosen=[0,6,14,15,23,29,30,36,44,45,53,59],visitors=[];
 for(const slot of chosen){
  const citizen=g.newCitizen(building);citizen.resident=true;citizen.location='home';citizen.locationId=building.id;
  citizen.state='อยู่บ้าน';building.residents.add(citizen.id);building.parked.add(citizen.id);building.parkingSlots[slot]=citizen.id;
  visitors.push(citizen);
 }
 const cars=[];
 for(const citizen of visitors){
  assert(g.createTrip(citizen,'work',building.id,office.id,null,null,null),'all vehicles should have a planned exit path');
  cars.push(g.state.vehicles.get(citizen.vehicleId));
 }
 let maxSignalOccupants=0,seenFront=false,seenRear=false,firstLeaving=null;
 for(let step=0;step<9000;step++){
  g.state.time+=.04;g.advanceVehicles(.05,.04);
  const inside=cars.filter(v=>v.grandCrossing?.granted&&!v.grandCrossing.cleared);
  maxSignalOccupants=Math.max(maxSignalOccupants,inside.length);
  if(inside.some(v=>v.grandCrossing.approach==='front'))seenFront=true;
  if(inside.some(v=>v.grandCrossing.approach==='rear'))seenRear=true;
  if(!firstLeaving&&cars.some(v=>v.phase==='driving'))firstLeaving=step;
  assert(maxSignalOccupants<=1,'intersection permits conflicting cars');
  if(cars.every(v=>!building.parked.has(v.citizenId)))break;
 }
 const stranded=cars.filter(v=>building.parked.has(v.citizenId))
  .map(v=>({id:v.id,phase:v.phase,reason:v.stopReason,lotDistance:v.lotDistance,
   gate:v.grandCrossing,respawns:v.respawns}));
 assert.equal(stranded.length,0,'all twelve cars must leave both parking banks: '+JSON.stringify(stranded.slice(0,10)));
 assert(seenFront&&seenRear,'both traffic signal approaches must receive a green');
 assert(cars.every(v=>(v.respawns||0)===0),'departures must not require towing/re-spawning');
 const snapshot=g.snapshot();assert(g.loadGame(true,null,snapshot),'saved large house remains valid');
 console.log(JSON.stringify({passed:true,parked:chosen.length,frontGreen:seenFront,rearGreen:seenRear,firstLeaving,
    maxSignalOccupants,asphaltBanks:asphalt.length,modelItems:items.length,footprint:[t.plotWidth,t.plotHeight]}));
})().catch(e=>{console.error(e);process.exitCode=1;});
