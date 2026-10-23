// Three game-native open-air blue restaurants. Geometry and parking regression.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const code=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'')
  .replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch,BOX}=new Function('THREE',code+';return {TrafficRenderer,Batch,BOX};')(THREE);
 const r=Object.create(TrafficRenderer.prototype);
 r.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const cases=[['small',[7,8],13,3],['medium',[10,8],26,4],['large',[10,13],50,8]];
 let checked=0;
 for(const [tier,parcel,cars,tables] of cases){
  const key='restaurant_'+tier,t=g.CATALOG[key];
  assert.deepEqual([t.plotWidth,t.plotHeight],parcel,key+' real game footprint');
  assert.equal(t.parkingCapacity,cars,key+' capacity');
  assert.equal(t.jobs,({small:3,medium:6,large:10})[tier],key+' staffing');
  assert.equal(t.service,({small:10,medium:20,large:40})[tier],key+' service');
  assert.equal(t.parkingZoneDepth,t.plotHeight/2,key+' 50/50 parcel');
  assert.equal(g.lotSlots({key}).length,cars,key+' real parking');
  let baseline=null;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,x:45,y:53,rotation,id:106,parked:new Set(),parkingSlots:Array(cars).fill(null)};
   const batch=new Batch();r.building(batch,b,g.CATALOG,{});
   const groups=[...batch.data.values()];
   const items=groups.flatMap(k=>k.items.map(x=>({...x,color:k.color,geo:k.geo,glow:k.glow})));
   const local=items.map(item=>{
    const dx=item.x-b.x,dz=item.z-b.y;
    const uv=rotation===0?{u:dx,v:dz}:rotation===1?{u:dz,v:t.plotHeight-dx}:
     rotation===2?{u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    return {...item,...uv};
   });
   assert(local.length>=170,key+' needs detailed actual geometry');
   assert(local.length<1250,key+' keep 3D batch affordable for devices');
   assert(local.every(p=>[p.u,p.v,p.y,p.sx,p.sy,p.sz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0));
   const leak=local.filter(p=>p.v-p.sz/2<t.parkingZoneDepth-.11||
       p.u-p.sx/2<.69||p.u+p.sx/2>t.plotWidth-.69||
       p.v+p.sz/2>t.plotHeight-.43);
   assert.equal(leak.length,0,key+' physical model leaks into car lanes/parking/road: '+JSON.stringify(leak.slice(0,4)));
   const bigSolid=local.filter(p=>p.geo===BOX&&p.sy>1.20&&p.sx*p.sz>4.5);
   assert.equal(bigSolid.length,0,key+' rebuilt restaurant as a solid multistorey box');
   // Real distinct geometry groups: hob burners, stainless kitchen, dining
   // seats and tabletops, low-profile navy roofs and a raised 5-star deck.
   const count=color=>local.filter(p=>p.color===color).length;
   assert(count('#d5dfdf')>=1,key+' kitchen back wall missing');
   assert(count('#8ca0a7')>=1,key+' preparation kitchen missing');
   assert(count('#242d35')>=8,key+' visible cooker hobs missing');
   const actualTables=count('#b78e69')+count('#e9e2d4');
   assert(actualTables>=tables,key+' missing dine-in tables: '+actualTables);
   assert(count('#123b72')>=2,key+' navy trim missing');
   assert(count('#ffe1a7')>=3,key+' warm lanterns and kitchen lights missing');
   const tall=local.filter(p=>p.y>2.7);
   if(tier==='large'){
    assert(tall.length>50,'large 5-star venue should have detailed raised rooftop');
    assert(count('#8ac8d0')>=4,'rooftop glass balustrades missing');
    assert(count('#356b9d')>=1,'raised blue terrace deck missing');
    assert(count('#4d9fc1')>=1,'water-wall accent missing');
    const upstairs=local.filter(p=>p.color==='#e9e2d4'&&p.y>3);
    assert(upstairs.length>=3,'raised rooftop tables not actually raised');
   }else{
    assert.equal(count('#356b9d'),0,key+' should not have 5-star elevated terrace');
    assert.equal(count('#4d9fc1'),0,key+' should not have 5-star waterwall');
   }
   const counts={instances:local.length,tables:actualTables,lights:local.filter(x=>x.glow).length};
   if(baseline)assert.deepEqual(counts,baseline,key+' layout changes with orientation');
   else baseline=counts;
   checked++;
  }
  console.log(JSON.stringify({restaurant:tier,parcel,parking:cars,...baseline,rooftop:tier==='large'}));
 }
 // Unrelated models, especially the protected grand home, must not regress.
 const grand=g.CATALOG.home_grand;assert.deepEqual([grand.plotWidth,grand.plotHeight],[11,13]);
 const grandBatch=new Batch();
 r.building(grandBatch,{key:'home_grand',x:30,y:30,rotation:0,id:200,parked:new Set(),parkingSlots:Array(60).fill(null)},g.CATALOG,{});
 assert([...grandBatch.data.values()].reduce((n,x)=>n+x.items.length,0)>50);
 console.log(JSON.stringify({passed:true,restaurantVariants:3,rotations:checked,grandPreserved:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
