const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const boot=()=>new Function('require',fixture+'return boot();')(require).game;
(async()=>{
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer}=new Function('THREE',src+'return {TrafficRenderer};')(THREE);
 const colors=new Set();
 for(const type of ['small','medium','large']){
  const g=boot();g.state.roads.clear();g.state.gates=[];g.state.money=1e8;g.roadChanged([]);
  assert(g.buildRoad(g.lineCells(g.id(100,100),g.id(120,100)),type,true));
  const before=g.snapshot(),faces=g.roadsideVisuals();assert.equal(g.snapshot(),before,'decoration must not mutate city data');
  assert.strictEqual(g.roadsideVisuals(),faces,'cache unchanged street geometry');
  const half=g.ROADS[type].visualWidth/2,outer=type==='small'?1:half+.14;
  assert(faces.some(f=>f.role==='sidewalk'));assert(faces.some(f=>f.role==='curb'));
  for(const f of faces){colors.add(f.color);for(const [x,y] of f.points){assert(Number.isFinite(x)&&Number.isFinite(y));assert(Math.abs(y-100)>=half-1e-6,'keep every traffic lane clear');assert(Math.abs(y-100)<=outer+1e-6,'stay inside existing arterial edge or small-road reserved verge');}}
  const receiver={parking:{roadsideVisuals:g.roadsideVisuals},roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),disposeGroup:TrafficRenderer.prototype.disposeGroup};
  TrafficRenderer.prototype.makeRoads.call(receiver,g.state,g.ROADS,g.junction,true);
  const newMeshes=receiver.roadGroup.children.filter(m=>['night-lot-base','night-asphalt'].includes(m.userData.nightRole));
  assert(newMeshes.length>=2&&newMeshes.length<=4,'merged paving meshes, not one mesh per slab');
 }
 for(const rotation of [0,1,2,3]){
  const g=boot();g.state.roads.clear();g.state.gates=[];g.state.money=1e8;g.roadChanged([]);
  const vertical=rotation%2;
  assert(g.buildRoad(g.lineCells(g.id(100,100),g.id(vertical?100:120,vertical?120:100)),'small',true));
  const coords=[[105,96],[101,105],[105,101],[96,105]][rotation],b=g.buildBuilding('home_starter',...coords,true);assert(b);assert.equal(b.rotation,rotation);
  const faces=g.roadsideVisuals(),driveways=faces.filter(f=>f.role==='driveway');assert.equal(driveways.length,2);
  const n=[[0,1],[-1,0],[0,-1],[1,0]][rotation];
  for(const [index,u] of [.2,2.8].entries()){
   const gate=g.lotPoint(b,u,3),cx=gate.x-.5,cy=gate.y-.5,face=driveways[index];
   const reach=Math.max(...face.points.map(([x,y])=>(x-cx)*n[0]+(y-cy)*n[1]));assert(reach>.4125,'driveway reaches across the entire small-road gap');
   // No raised slab or curb may cover the gate centre at the road edge.
   const target=[cx+n[0]*.4125,cy+n[1]*.4125];
   const inside=(p,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
   assert(!faces.filter(f=>f.role!=='driveway').some(f=>inside(target,f.points)),'clear lowered entrance and exit');
  }
  g.demolishBuilding(b,true);const removed=g.roadsideVisuals();assert.notStrictEqual(removed,faces);assert(!removed.some(f=>f.role==='driveway'),'demolition restores the footpath');
 }
 // Curves and mixed intersections get borders along corners, never across ports.
 const g=boot();g.state.roads.clear();g.state.gates=[];g.state.money=1e8;g.roadChanged([]);
 for(const [a,b,type] of [[[100,100],[120,100],'small'],[[110,90],[110,112],'medium'],[[120,100],[120,112],'large']])assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),type,true));
 const faces=g.roadsideVisuals();assert(faces.length>100);assert(faces.every(f=>f.points.every(p=>p.every(Number.isFinite))));
 console.log('Roadside paving: 3 road sizes, 4 building rotations, lowered driveways, unchanged lanes/plots, mixed junctions and merged meshes.');
})().catch(e=>{console.error(e);process.exitCode=1});
