// Dedicated playable model regression: tiny brick-and-neon pub on the 6x8 plot.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const bootSource=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',bootSource+';return boot();')(require);
 const t=g.CATALOG.pub_small;
 assert.equal(t.parkingCapacity,10);
 assert.equal(t.jobs,2);assert.equal(t.service,8);
 assert.deepEqual([t.plotWidth,t.plotHeight],[6,8]);
 assert.equal(t.parkingZoneDepth,4);
 assert.equal(t.buildingZoneDepth,4);
 assert.equal(g.lotSlots({key:'pub_small',x:20,y:20,rotation:0}).length,10);

 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;
 let total=0;
 for(let rotation=0;rotation<4;rotation++){
  const b={id:210,key:'pub_small',x:40,y:45,rotation,parkingSlots:Array(10).fill(null),parked:new Set()};
  const lot=g.buildingBounds(b);
  const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
  const items=[...batch.data.values()].flatMap(x=>x.items);
  const glyph=[...batch.data.values()].filter(x=>x.color==='#d9ae75').flatMap(x=>x.items);
  const accent=[...batch.data.values()].filter(x=>x.color==='#ffe0a0'||x.color==='#ffe4b1').flatMap(x=>x.items);
  assert(items.length>=250,'fully furnished pub must render substantial real geometry');
  assert(glyph.length>=70,'both words of LOCAL PUB should have 3D gold glyphs');
  assert(accent.length>=60,'pub must have many warm light accents');
  assert(items.every(p=>[p.x,p.y,p.z,p.sx,p.sy,p.sz,p.rx,p.ry,p.rz].every(Number.isFinite)),
   'rotated model contains nonfinite geometry');
  const bounds={x0:b.x,x1:b.x+lot.w,y0:b.y,y1:b.y+lot.h};
  const out=items.filter(item=>{
   const dx=item.x-b.x,dz=item.z-b.y;
   return dx<-.02||dz<-.02||dx>lot.w+.02||dz>lot.h+.02;
  });
  assert.equal(out.length,0,'all instance centers stay on the rotated building plot: '+JSON.stringify(out.slice(0,2)));
  // Architectural objects (as opposed to road markings) stay within the 50% front half.
  const content=[...batch.data.values()].filter(v=>!['#bdc6ae','#9baaa0','#96af8f','#515f62','#58666a','#e9e6cc','#c5d2c2','#bbc9b9','#f3ca88','#94d9aa','#e5e6d0','#f1ca85','#86d1dc','#d7cfbc','#e5ded0','#7ea072','#d7b38c'].includes(v.color))
   .flatMap(v=>v.items).filter(p=>p.y>.15);
  assert(content.length>=200,'genuine buildings and patio visible');
  total+=items.length;
 }
 g.state.money=1000000;
 const built=g.buildBuilding('pub_small',170,148-t.plotHeight,true);
 assert(built&&built.access.length===2,'pub must connect to the road with two real gates');
 const resident=g.newCitizen(built);
 assert(g.createTrip(resident,'moveIn',null,built.id,g.id(155,150),null,null),'car must route to small pub');
 for(let n=0;n<9000&&!built.parked.has(resident.id);n++){g.state.time+=.04;g.advanceVehicles(.05,.04);}
 assert(built.parked.has(resident.id),'car must reach a real parking spot');
 assert(built.parkingSlots.filter(x=>x!==null).length===1,'parking claim must remain exclusive');
 console.log(JSON.stringify({passed:true,model:'pub_small',lot:[6,8],parking:10,architecture:'brick-gable-and-terrace',sign:'LOCAL PUB',orientations:4,instances:total,arrivals:1}));
})().catch(e=>{console.error(e);process.exitCode=1;});
