const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const spec={
 home_large:[20,0,0],home_dual:[40,0,0],home_grand:[60,0,0],
 office_small:[0,15,0],office_medium:[0,30,0],office_large:[0,60,0],
 factory_small:[0,20,0],factory_medium:[0,40,0],factory_large:[0,60,0],
 shop_small:[0,2,8],shop_medium:[0,4,16],shop_large:[0,8,32],
 restaurant_small:[0,3,10],restaurant_medium:[0,6,20],restaurant_large:[0,10,40],
 mall_small:[0,3,12],mall_medium:[0,6,24],mall_large:[0,12,48],
 park_small:[0,1,14],park_medium:[0,2,28],park_large:[0,4,56],
 pub_small:[0,2,8],pub_medium:[0,4,16],pub_large:[0,8,32]
 };
 for(const [key,[r,j,s]] of Object.entries(spec)){
  const t=g.CATALOG[key];assert(t,key);
  assert.equal(t.residents,r,key+' residents');assert.equal(t.jobs,j,key+' jobs');assert.equal(t.service,s,key+' visitors');
  assert.equal(t.parkingCapacity,r||j+s,key+' parking capacity');
  if(key==='home_grand')assert.deepEqual([t.plotWidth,t.plotHeight],[11,13]);
  else assert(t.plannedParking&&t.stackedParking&&!t.dualParking,key+' grand parking');
  const sample={key,x:20,y:20,rotation:0},slots=g.lotSlots(sample);
  assert.equal(slots.length,t.parkingCapacity,key+' slots');
  assert.equal(new Set(slots.map(x=>x.index)).size,slots.length,'unique parking spaces '+key);
  if(t.plannedParking){
   assert.equal(t.parkingZoneDepth,t.buildingZoneDepth,key+' true 50/50 land split');
   assert.equal(t.parkingZoneDepth,t.plotHeight/2,key+' half plot depth');
   const area=banks=>Math.max(6,Math.ceil(2.33+Math.ceil(t.parkingCapacity/(2*banks))*.55))*(banks===1?8:13);
   assert.equal(t.plotWidth*t.plotHeight,Math.min(area(1),area(2)),key+' minimum safe parking-first plot');
   assert.equal(t.parkingRows,t.plotHeight===8?1:2,key+' matching number of courts');
   const graphic=g.parkingVisuals(sample);
   assert(graphic.length>=t.parkingCapacity*3,key+' stripes for every stall');
   assert.equal(graphic.filter(x=>x.color==='#515f62').length,t.parkingRows,key+' visible parking aisles');
   assert.equal(graphic.filter(x=>['#9baaa0','#96af8f'].includes(x.color)).length,2,key+' real split ground');
   const points=g.lotSlots(sample);
   const frontBayEdge=Math.max(...points.map(x=>x.v+.62));
   if(key==='shop_large'){
    // 7-Eleven's rear retail pavilions were shortened. The two real
    // parking banks move 0.7 cells closer into the freed approach space;
    // no stall crosses the shop wall, park capacity and entrances remain.
    assert(frontBayEdge<=t.parkingZoneDepth+.55,
     'large shop advanced parking stays clear of storefront');
    assert.equal(t.parkingRearAisle,2.75);
    assert.equal(t.parkingAisle,5.60);
   }else assert(frontBayEdge<=t.parkingZoneDepth,
    key+' parking stays in rear half');
   assert(Math.min(...points.map(x=>x.v-.62))>=0,key+' no blank rear row');
   assert(Math.max(...points.map(x=>x.u+.275))<t.plotWidth-.90,key+' clear exit driveway');
   assert(graphic.every(rect=>Number.isFinite(rect.w)&&rect.w>0&&Number.isFinite(rect.h)&&rect.h>0),key+' no negative-sized asphalt, island or markings');
  }
  for(let rot=0;rot<4;rot++){
   const b={...sample,rotation:rot},bounds=g.buildingBounds(b);
   for(let i=0;i<slots.length;i++){
    const p=g.parkingSlotPose(b,i);
    assert(p.x>b.x&&p.x<b.x+bounds.w+1,key+' x bounds');
    assert(p.y>b.y&&p.y<b.y+bounds.h+1,key+' y bounds');
   }
  }
 }
 for(const [tier,beds] of [['small',2],['medium',10],['large',30]]){
  const t=g.CATALOG['hotel_'+tier];assert.equal(t.beds,beds);assert.equal(t.parkingCapacity,beds);
 }
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',src+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;
 let drawn=0;
 for(const key of Object.keys(spec)){
  const t=g.CATALOG[key],b={key,x:30,y:30,id:100+drawn,rotation:drawn%4,parked:new Set(),parkingSlots:Array(t.parkingCapacity).fill(null)};
  const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
  const items=[...batch.data.values()].flatMap(x=>x.items);assert(items.length>40,key+' must draw a real 3D building and lot');
  assert(items.every(x=>[x.x,x.y,x.z].every(Number.isFinite)),key+' nonfinite geometry');
  drawn++;
 }
 g.state.money=1e9;
 const homes=[['home_large',160],['home_dual',184],['home_grand',210]];
 for(const [key,x] of homes){
  const t=g.CATALOG[key],b=g.buildBuilding(key,x,148-t.plotHeight,true);assert(b,key+' accessible from roadway');
  const c=g.newCitizen(b);
  assert(g.createTrip(c,'moveIn',null,b.id,g.id(155,150),null,null),key+' route to lot');
  for(let tick=0;tick<8000&&!b.parked.has(c.id);tick++){g.state.time+=.04;g.advanceVehicles(.05,.04);}
  assert(b.parked.has(c.id),key+' car successfully enters and parks');
 }
 console.log(JSON.stringify({passed:true,updatedBuildingTypes:Object.keys(spec).length,rotations:4,parkingFirst:true,landSplit:'50/50',grandUnchanged:true,hotelUnchanged:true,rendered:drawn,realArrivals:homes.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
