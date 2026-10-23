// Real-world game geometry validation for yellow retail architecture.
// Small = Thai one-storey street market, medium = 2-floor supermarket,
// large = luxury open-air 2-floor atrium/escalators + actual rooftop.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const prefix=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g}=new Function('require',prefix+';return boot();')(require);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const code=fs.readFileSync('dist/renderer3d.js','utf8')
  .replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer,Batch}=new Function('THREE',code+';return {TrafficRenderer,Batch};')(THREE);
 const renderer=Object.create(TrafficRenderer.prototype);
 renderer.parking={lotPoint:g.lotPoint,parkingVisuals:()=>[]};
 const presets=[
  {key:'shop_small',plot:[6,8],parking:10,workers:2,users:8,identity:'Thai yellow market'},
  {key:'shop_medium',plot:[8,8],parking:20,workers:4,users:16,identity:'yellow 2-storey supermarket'},
  {key:'shop_large',plot:[8,13],parking:40,workers:8,users:32,identity:'yellow galleria 2 floors and rooftop'}
 ];
 let rotations=0;
 const results=[];
 for(const {key,plot,parking,workers,users,identity} of presets){
  const t=g.CATALOG[key];assert(t,key);
  assert.deepEqual([t.plotWidth,t.plotHeight],plot,key+' parcel');
  assert.equal(t.parkingCapacity,parking,key+' parking');
  assert.equal(t.jobs,workers,key+' workers');
  assert.equal(t.service,users,key+' shoppers');
  assert.equal(t.buildingZoneDepth,t.parkingZoneDepth,key+' 50/50 land');
  assert.equal(g.lotSlots({key}).length,parking,key+' exact parking stalls');
  let first=null;
  for(let rotation=0;rotation<4;rotation++){
   const b={key,x:32,y:45,rotation,id:707,parked:new Set(),parkingSlots:Array(parking).fill(null)};
   const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
   const items=[...batch.data.values()].flatMap(k=>k.items.map(x=>({...x,color:k.color,glow:k.glow})));
   const local=items.map(p=>{
    const dx=p.x-b.x,dz=p.z-b.y,uv=rotation===0?{u:dx,v:dz}:
     rotation===1?{u:dz,v:t.plotHeight-dx}:rotation===2?
     {u:t.plotWidth-dx,v:t.plotHeight-dz}:{u:t.plotWidth-dz,v:dx};
    return {...p,...uv};
   });
   assert(items.length>=120&&items.length<1600,key+' mobile-friendly detailed geometry');
   assert(local.every(p=>[p.u,p.v,p.y,p.sx,p.sy,p.sz].every(Number.isFinite)&&p.sx>0&&p.sy>0&&p.sz>0));
   // Whole boxes, not just their centers, stay out of parking half and
   // both side car spines. Decorative sign overhangs allowed only 0.05.
   const bad=local.filter(p=>p.u-p.sx/2<.68||p.u+p.sx/2>t.plotWidth-.68||
    p.v-p.sz/2<t.parkingZoneDepth-.08||p.v+p.sz/2>t.plotHeight-.39);
   assert.equal(bad.length,0,key+' rotated object blocking parking/car lanes '+JSON.stringify(bad.slice(0,3)));
   const has=c=>local.some(p=>p.color===c),count=c=>local.filter(p=>p.color===c).length;
   const lights=local.filter(p=>p.glow).length;
   assert(lights>=9,key+' dim market/store at night');
   const colors=new Set(local.map(p=>p.color));
   assert(colors.size>=16,key+' missing individual materials');
   const isYellow=['#f5be36','#f8d467','#f4c53d','#efbe2e','#f2c146','#edc24c','#f4c741','#ffe5a1','#eec842']
    .filter(c=>colors.has(c)).length;
   assert(isYellow>=3,key+' retail theme must prominently use yellow');
   const high=Math.max(...local.map(p=>p.y+p.sy/2));
   if(key==='shop_small'){
    assert(high<2.65,'market must be ONE storey, no tower');
    assert(has('#f4c53d')&&has('#e4ad27'),'yellow Thai striped tarpaulin missing');
    assert(count('#b48b53')>=4,'market needs baskets and produce');
    assert(has('#9faeb8'),'fish tray vendor missing');
    assert(count('#fce4a9')>=3,'hanging market lights missing');
    const stallCenters=[1.57,3,4.43];
    assert(stallCenters.every(x=>local.some(p=>p.color==='#f4c53d'&&Math.abs(p.u-x)<.7)),
      'three separate market stall structures missing');
   }else if(key==='shop_medium'){
    assert(high>3.35&&high<4,'supermarket must show SECOND storey but not highrise');
    assert(count('#83979a')>=6,'multiple supermarket stock aisles missing');
    assert(count('#f4c741')>=3,'three cashier checkout counters missing');
    assert(count('#d7dfdd')>=2,'U-shaped upstairs mezzanine missing');
    assert(count('#d1d8d4')+count('#f2e9d8')>=12,'upper floor staircase missing');
    assert(local.some(p=>p.y>2.40&&p.color==='#d6ddd6'),'actual upstairs merchandise absent');
   }else{
    assert(high>6.0&&high<7.1,'large shop must have TWO floors + rooftop, not tower');
    assert(count('#e2e2da')>=2,'real second-floor retail galleries missing');
    assert(count('#b8c2c7')+count('#dfdfdb')>=28,'two escalators with 28 distinct steps missing');
    assert(count('#7fc4cd')>=35,'glass escalator balustrades missing');
    assert(has('#f0e7d1')&&has('#f2c146'),'real rooftop lounge/awning missing');
    assert(local.some(p=>p.y>5.3&&p.color==='#fff0bf'),'roof shade not elevated');
    assert(count('#ffe3aa')>=12,'luxury atrium and storefront lighting missing');
   }
   const summary={instances:items.length,highest:Math.round(high*100)/100,materials:colors.size,lights};
   if(first)assert.deepEqual(summary,first,key+' differs when rotated');
   else first=summary;
   rotations++;
  }
  results.push({key,identity,plot,parking,...first});
 }
 // Protected reference home grand must keep its footprint, original rendering.
 const grand=g.CATALOG.home_grand;
 assert.deepEqual([grand.plotWidth,grand.plotHeight,grand.parkingCapacity],[11,13,60]);
 const b={key:'home_grand',x:50,y:50,rotation:0,id:71,parked:new Set(),parkingSlots:Array(60).fill(null)};
 const batch=new Batch();renderer.building(batch,b,g.CATALOG,{});
 assert([...batch.data.values()].reduce((n,g)=>n+g.items.length,0)>50);
 console.log(JSON.stringify({passed:true,presets:results,rotations,grandPreserved:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
