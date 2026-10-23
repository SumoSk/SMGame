const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',base+';return boot();')(require);
 const t=g.CATALOG.home_grand,small=g.CATALOG.home_large;
 assert.equal(t.plotWidth,11);assert.equal(t.plotHeight,13);
 assert.equal(t.frontageEntranceU,3);assert.equal(t.frontageExitU,8);
 assert(t.frontageV>11.7&&t.frontageV<t.plotHeight);
 const b=g.buildBuilding('home_grand',160,148-t.plotHeight,true);
 assert(b);
 assert.equal(b.access.length,2,'independent entrance and exit city-road gates');
 const local=(p,rot,base=b)=>{const x=p.x-base.x-.5,y=p.y-base.y-.5;switch(rot){case 1:return {u:y,v:t.plotHeight-x};case 2:return {u:t.plotWidth-x,v:t.plotHeight-y};case 3:return {u:t.plotWidth-y,v:x};default:return {u:x,v:y};}};
 assert(Math.abs(local({x:b.access[0].x,y:b.access[0].y},b.rotation).u-t.frontageEntranceU)<1.5,'entrance lies in central frontage');
 assert(Math.abs(local({x:b.access[1].x,y:b.access[1].y},b.rotation).u-t.frontageExitU)<1.5,'exit lies in central frontage');
 const road=g.parkingVisuals(b),forecourt=road.filter(r=>r.color==='#58666a'&&Math.abs(r.v-t.frontageV)<.05);
 assert(forecourt.length>0,'a real visible frontage driving strip must exist');
 assert(road.filter(r=>r.color==='#515f62').length===2,'preserve exact two parking banks');
 const office=g.buildBuilding('office_medium',195,148-g.CATALOG.office_medium.plotHeight,true);
 assert(office);
 const parked=g.newCitizen(b);parked.resident=true;parked.location='home';parked.locationId=b.id;b.residents.add(parked.id);b.parked.add(parked.id);b.parkingSlots[42]=parked.id;
 assert(g.createTrip(parked,'work',b.id,office.id,null,null,null));
 const exiting=g.state.vehicles.get(parked.vehicleId);
 const newcomer=g.newCitizen(b);
 assert(g.createTrip(newcomer,'moveIn',null,b.id,g.id(155,150),null,null));
 const entering=g.state.vehicles.get(newcomer.vehicleId);
 let exitFrontage=false,enterFrontage=false,exitArrived=false;
 for(let step=0;step<9000;step++){
  g.state.time+=.04;g.advanceVehicles(.05,.04);
  if(exiting.phase==='parking_out'&&exiting.lotPath){
   const pts=exiting.lotPath.map(p=>local(p,b.rotation));
   exitFrontage ||=pts.some(p=>Math.abs(p.u-t.frontageExitU)<.1&&p.v>=t.frontageV-.05)
    &&pts.some(p=>p.u>t.plotWidth-.8&&Math.abs(p.v-t.frontageV)<.12);
  }
  if(entering.phase==='parking_in'&&entering.lotPath){
   const pts=entering.lotPath.map(p=>local(p,b.rotation));
   enterFrontage ||=pts.some(p=>Math.abs(p.u-t.frontageEntranceU)<.1&&Math.abs(p.v-t.frontageV)<.12)
    &&pts.some(p=>Math.abs(p.u-.45)<.1&&Math.abs(p.v-t.frontageV)<.12);
  }
  if(!b.parked.has(parked.id)&&b.parked.has(newcomer.id)){exitArrived=true;break;}
 }
 assert(exitFrontage,'outgoing cars must drive along the forecourt before crossing city-road gate');
 assert(enterFrontage,'incoming cars must drive along the same forecourt before parking');
 assert(exitArrived,'existing resident must EXIT and newcomer must actually PARK');
 // Geometry envelopes in every rotation; the round villa must never touch the
 // back parking bank or front driving strip, even by its decorative canopy.
 const three=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',src+';return {TrafficRenderer,Batch};')(three);
 const model=Object.create(TrafficRenderer.prototype);model.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 let parts=0;
 for(let rot=0;rot<4;rot++){
  const fixture={...b,x:20,y:20,rotation:rot},batch=new Batch();
  model.building(batch,fixture,g.CATALOG,{});
  const list=[...batch.data.values()].flatMap(x=>x.items);
  parts=Math.max(parts,list.length);
  for(const part of list){
   const p=local({x:part.x+.5,y:part.z+.5},rot,fixture);
   const xmargin=(part.sx||0)/2,zmargin=(part.sz||0)/2;
   assert(p.v-zmargin>=6.65,'front villa crosses painted bays at rotation '+rot+' v'+p.v);
   assert(p.v+zmargin<=t.frontageV-.35,'front villa crosses the frontage lane at rotation '+rot+' v'+p.v);
   assert(p.u-xmargin>1,'front villa touches entry driveway '+rot);
   assert(p.u+xmargin<t.plotWidth-1,'front villa touches exit driveway '+rot);
  }
 }
 const old=JSON.parse(g.snapshot());
 for(const [,building]of old.buildings)if(building.key==='home_grand')delete building.grandFrontageV3;
 assert(g.loadGame(true,null,JSON.stringify(old)),'saved city with previous grand house must migrate');
 assert(g.state.buildings.get(b.id).grandFrontageV3,'new villa internal road layout flag persisted');
 console.log(JSON.stringify({passed:true,entrance:t.frontageEntranceU,exit:t.frontageExitU,forecourtV:t.frontageV,exitFrontage,enterFrontage,parts,oldSave:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
