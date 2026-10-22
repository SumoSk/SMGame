const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const harness=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',harness+';return city();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch,carClassFor,carPaintFor}=new Function('THREE',source+';return {TrafficRenderer,Batch,carClassFor,carPaintFor};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);renderer.scene=new THREE.Scene();
 renderer.parking={...g,parkingIsMoving:cid=>!!g.state.vehicles.get(g.state.citizens.get(cid)?.vehicleId)?.lotPath,citizenCarColor:()=> '#65c8f2'};
 for(const size of ['small','medium','large'])for(const rotation of [0,1,2,3]){
  const batch=new Batch(),b={id:999,key:'hotel_'+size,x:50,y:50,rotation};
  renderer.building(batch,b,g.CATALOG,{});const model=batch.build();assert(model.children.length>3);
  for(const group of batch.data.values())for(const item of group.items)for(const key of ['x','y','z'])assert(Number.isFinite(item[key]));
  model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
 }
 let c=null;for(let i=0;i<30&&!c;i++)c=g.admitTourist();assert(c);
 g.touristEnter(c,g.state.vehicles.get(c.vehicleId));g.arrive(g.state.vehicles.get(c.vehicleId),true);
 assert.equal(carClassFor(c,c.id),7);assert.equal(carPaintFor(c,c.id,7,'#ffffff'),'#65c8f2');
 renderer.createCars();renderer.cars(g.state,g.vehiclePosition,g.CATALOG);
 assert.equal([...renderer.carSets.values()].reduce((n,s)=>n+s.body.count,0),21);
 console.log(JSON.stringify({passed:true,hotelModels:12,touristVehicle:'blue van',visibleCars:21,coverage:['three hotel sizes at four rotations','finite hotel geometry','tourist van class and blue paint','resident and tourist parked cars rendered once']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
