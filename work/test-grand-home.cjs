const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const base=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g,get}=new Function('require',base+';return boot();')(require);
 const small=g.CATALOG.home_large,medium=g.CATALOG.home_dual,t=g.CATALOG.home_grand;
 assert.equal(small.name,'บ้านเล็ก');assert.equal(medium.name,'บ้านกลาง');
 assert(t&&t.name==='บ้านใหญ่'&&t.stackedParking,'new grand house must be available');
 assert.equal(small.parkingCapacity,30);assert.equal(t.parkingCapacity,60);
 assert.equal(t.parkingColumns,small.parkingColumns,'reuse original short row length');
 assert.equal(t.parkingPitch,small.parkingPitch,'reuse exact small-home stall width');
 assert.equal(t.plotWidth,small.plotWidth,'do not extend parking length');
 assert(t.plotHeight>small.plotHeight,'add parking depth, not width');
 assert.equal(t.parkingPhysicalRows,4);assert.equal(t.parkingRows,2);
 const b={key:'home_grand',x:20,y:20,rotation:0,parkingSlots:Array(t.parkingCapacity).fill(null)};
 const slots=g.lotSlots(b);
 assert.equal(slots.length,60);
 const rows=[0,1,2,3].map(n=>slots.filter(s=>s.row===n));
 rows.forEach(row=>assert.equal(row.length,15));
 assert.equal(new Set(rows.map(r=>r[0].aisle)).size,2,'only two internal aisles for four stall rows');
 assert.deepEqual(rows.map(r=>r[0].zone),['rear','rear','front','front']);
 const gap=rows[2][0].v-rows[1][0].v-1.24;
 assert(gap>=-.01&&gap<=.08,'parking banks must meet without an unused corridor: '+gap);
 for(let row=0;row<4;row++)for(let col=0;col<15;col++)
  assert(Math.abs(rows[row][col].u-slots[col].u)<1e-9,'both banks retain identical stall alignment');
 for(let rot=0;rot<4;rot++){
  const home={...b,rotation:rot},bounds=g.buildingBounds(home);
  for(let i=0;i<60;i++){
   const p=g.parkingSlotPose(home,i);
   assert(p.x>home.x&&p.x<home.x+bounds.w+1&&p.y>home.y&&p.y<home.y+bounds.h+1);
  }
 }
 const visuals=g.parkingVisuals(b);
 assert(visuals.length>=60*3,'all four parking rows must have markings');
 const aisles=visuals.filter(x=>x.color==='#c5d2c2'&&Math.abs(x.v-t.parkingAisle)<.18||x.color==='#c5d2c2'&&Math.abs(x.v-t.parkingRearAisle)<.18);
 assert(aisles.length>=8,'both aisles must show directional paint');
 g.state.money=1e9;
 const built=g.buildBuilding('home_grand',160,148-t.plotHeight,true);
 assert(built,'grand house must have road connection');
 assert.equal(built.access.length,2,'reuse two road access points from small-home design');
 assert.equal(built.parkingSlots.length,60);
 const snapshot=g.snapshot();assert(g.loadGame(true,null,snapshot),'new house saves and loads');
 assert(g.state.buildings.get(built.id)?.key==='home_grand');
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const code=fs.readFileSync('dist/renderer3d.js','utf8');
 assert(code.includes('CYL_SMOOTH=new THREE.CylinderGeometry(1,1,1,32)'),'luxury facade must be smooth and round');
 assert(code.includes("if(b.key==='home_grand')"),'dedicated architectural model must exist');
 const source=code.replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',source+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.parking=g;
 const batch=new Batch();renderer.building(batch,built,g.CATALOG,{});
 const model=batch.build(false);assert(model.children.length>6,'circular grand home must render a substantive 3D model');
 assert(batch.data.size>=5,'round facade, windows, rings and lot must be visible');
 const dev=JSON.parse(snapshot);assert.equal(dev.parkingVersion,7,'do not break previous saves');
 console.log(JSON.stringify({passed:true,grandHome:true,plot:[t.plotWidth,t.plotHeight],capacity:60,parkingRows:4,parkingBanks:2,bankGap:+gap.toFixed(3),roundFacade:true,saveCompatible:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
