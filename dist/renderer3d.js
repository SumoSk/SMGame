import * as THREE from './vendor/three.module.js';

const BOX=new THREE.BoxGeometry(1,1,1),CYL=new THREE.CylinderGeometry(1,1,1,10),CONE=new THREE.ConeGeometry(1,1,6),LEAF=new THREE.IcosahedronGeometry(1,1),BALL=new THREE.SphereGeometry(1,12,8);
const UP=new THREE.Vector3(0,1,0),TAU=Math.PI*2;
const DAYLIGHT=[
 [0,'#1a2941','#adc4e5',.35,.78,.64,1],[180,'#101d34','#8b9fc6',.26,.68,.57,1],
 [240,'#101e35','#899ec7',.28,.70,.58,1],[330,'#425677','#d0d7de',.7,1.02,.72,.86],
 [390,'#d5a383','#ffe6b8',1.7,1.64,.91,.30],[510,'#8cc6d4','#fff4df',3.15,2.23,1.03,0],
 [720,'#98d1de','#fff5e0',3.67,2.44,1.09,0],[900,'#92c3c9','#ffe8c2',2.95,2.14,1.02,0],
 [1020,'#e9a475','#ffcc90',1.98,1.63,.94,.15],[1080,'#b47c88','#ffbe9d',.93,1.19,.8,.54],
 [1140,'#415875','#b7c6df',.50,.90,.67,.98],[1260,'#273a55','#a0b8dd',.39,.8,.65,1],
 [1440,'#1a2941','#adc4e5',.35,.78,.64,1]
];
const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
function lightAt(time){
 const minute=((time%1440)+1440)%1440;
 for(let i=1;i<DAYLIGHT.length;i++)if(minute<=DAYLIGHT[i][0]){
  const a=DAYLIGHT[i-1],b=DAYLIGHT[i],f=smooth((minute-a[0])/(b[0]-a[0]));
  return{minute,sky:new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),f),
   sun:new THREE.Color(a[2]).lerp(new THREE.Color(b[2]),f),
   strength:THREE.MathUtils.lerp(a[3],b[3],f),ambient:THREE.MathUtils.lerp(a[4],b[4],f),
   exposure:THREE.MathUtils.lerp(a[5],b[5],f),lamps:THREE.MathUtils.lerp(a[6],b[6],f)};
 }
}
function climateAt(time,city){
 // Render-only deterministic weather; never writes to city state or randomizes citizen behavior.
 const day=Math.floor(time/1440),minute=((time%1440)+1440)%1440;
 const seed=city==='phuket'?12:city==='chiangmai'?31:city==='bangkok'?67:83;
 const clouds=d=>.08+.65*hash(d*19+seed,11);
 const cloud=THREE.MathUtils.lerp(clouds(day),clouds(day+1),smooth(minute/1440));
 function rainfall(d,after=0){const chance=hash(d*31+seed,29);if(chance<.49)return 0;
  const start=370+hash(d*17+seed,41)*680,end=start+130+hash(d*23+seed,47)*150;
  const local=time-d*1440;
  return smooth((local-start)/65)*(1-smooth((local-end-after)/100))*(.48+.52*chance);
 }
 const rain=Math.max(rainfall(day),rainfall(day-1));
 const wet=Math.max(rain,rainfall(day,150),rainfall(day-1,150)*.7);
 return{cloud,rain,wet};
}
function hash(a,b=0){return ((Math.sin(a*127.1+b*311.7)*43758.5453)%1+1)%1;}

const VEHICLE_TYPES=['compact','sedan','pickup','suv','premium','sport','luxury','van'];
const VEHICLE_WEIGHTS=[[26,36,20,10,4,1,1,2],[11,16,42,20,5,1,1,4],[7,12,11,24,33,6,5,2],[2,4,5,10,25,24,28,2]];
const VEHICLE_STYLES=[
 [.49,.235,.12,-.03,.30,.11],[.58,.255,.13,-.04,.32,.13],
 [.65,.273,.15,.13,.26,.14],[.615,.278,.15,-.02,.39,.17],
 [.63,.275,.13,-.04,.35,.13],[.59,.28,.10,-.07,.26,.08],
 [.66,.29,.14,-.04,.36,.14],[.64,.295,.15,-.035,.50,.20]
];
const VEHICLE_PALETTES=[
 ['#f2f2ea','#becad0','#94b7c3','#e0d9ce'],
 ['#e9e8e4','#82939c','#b7b6ac','#516775'],
 ['#edece6','#86979e','#434d53','#b3bbaf'],
 ['#eaeae5','#5b7280','#a6aca6','#404b57'],
 ['#ece8e1','#243447','#667e91','#abb7bf'],
 ['#ed323c','#f6c53c','#f5f3e8','#1b242d'],
 ['#f2e7d5','#242734','#647275','#c3b9ad'],
 ['#e8ebe6','#8594a1','#bdb6a9','#5d686a']
];
function carClassFor(c,id){
 if(c?.tourist)return 7;
 const group=Math.max(0,Math.min(3,c?.profile?.trait??0)),weights=VEHICLE_WEIGHTS[group];
 let n=hash((c?.id??id)*1.013+37,59)*100;
 for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}
 return 0;
}
function carPaintFor(c,id,kind,fallback){
 if(c?.tourist)return '#65c8f2';
 if(!c)return fallback||'#c5d4d9';
 const p=VEHICLE_PALETTES[kind];return p[Math.floor(hash(c.id*1.117+71,43)*p.length)%p.length];
}
function carGeometries(style){
 const [length,width,height,cabinX,cabinL,cabinH]=VEHICLE_STYLES[style],paint=[],detail=[];
 const box=(parts,color,x,y,z,l,h,w)=>parts.push({color,geo:new THREE.BoxGeometry(l,h,w).translate(x,y,z)});
 const top=.16+height/2,roofY=top+cabinH*.49,front=length*.5,rear=-front;
 box(paint,'#ffffff',0,.16,0,length,height,width);
 box(paint,'#ffffff',front*.66,.18,0,length*.29,height*.72,width*.95);
 box(paint,'#ffffff',cabinX,roofY,0,cabinL,cabinH,width*.84);
 box(paint,'#ffffff',cabinX,roofY+cabinH*.48,0,cabinL*.86,.019,width*.80);
 for(const z of [-1,1]){
  box(detail,'#456778',cabinX,roofY-.017,z*width*.426,cabinL*.76,cabinH*.6,.012);
  box(detail,'#b7c5ca',front,top-.06,z*width*.36,.008,.031,width*.23);
  box(detail,'#ed5a53',rear,top-.06,z*width*.36,.008,.036,width*.20);
  box(detail,'#99a9ae',front*.52,top-.02,z*width*.56,.06,.048,.026);
  for(const x of [length*.28,-length*.30]){
   const tyre=new THREE.CylinderGeometry(style===2?.087:.076,style===2?.087:.076,.038,10);
   tyre.rotateX(Math.PI/2);tyre.translate(x,.105,z*width*.52);
   detail.push({color:'#21292f',geo:tyre});
   const hub=new THREE.CylinderGeometry(.041,.041,.042,10);
   hub.rotateX(Math.PI/2);hub.translate(x,.105,z*width*.53);
   detail.push({color:'#abb9bc',geo:hub});
  }
 }
 box(detail,'#466777',cabinX+cabinL*.49,roofY-.018,0,.015,cabinH*.6,width*.72);
 box(detail,'#4b6571',cabinX-cabinL*.49,roofY-.018,0,.015,cabinH*.62,width*.7);
 box(detail,'#25333c',front+.005,.145,0,.01,.037,width*.43);
 if(style===2){
  box(detail,'#394b4e',-.19,top+.004,0,.24,.011,width*.76);
  for(const z of [-1,1])box(paint,'#ffffff',-.18,top+.035,z*width*.44,.25,.067,.022);
 }
 if(style===3||style===7)for(const z of [-1,1])box(detail,'#9aa5a8',cabinX,roofY+cabinH*.56,z*width*.3,cabinL*.84,.018,.016);
 if(style===4||style===6){
  box(detail,'#c4c9c8',front+.009,.17,0,.011,.07,width*.33);
  for(const z of [-1,1])box(detail,'#a9bbc0',0,.17,z*width*.51,length*.7,.012,.009);
 }
 if(style===5){
  box(paint,'#ffffff',rear+.04,.26,0,.07,.023,width*1.08);
  for(const z of [-1,1])box(detail,'#343940',rear+.04,.226,z*width*.3,.013,.06,.014);
  box(detail,'#25292d',rear-.009,.155,0,.013,.04,width*.78);
 }
 if(style===6)box(detail,'#e0cea5',front+.018,.223,0,.022,.025,.024);
 const merge=parts=>{
  const positions=[],normals=[],colors=[];
  for(const {color,geo:original} of parts){
   const geo=original.index?original.toNonIndexed():original,p=geo.getAttribute('position'),n=geo.getAttribute('normal'),c=new THREE.Color(color);
   for(let i=0;i<p.count;i++){
    positions.push(p.getX(i),p.getY(i),p.getZ(i));
    normals.push(n.getX(i),n.getY(i),n.getZ(i));
    colors.push(c.r,c.g,c.b);
   }
   if(geo!==original)geo.dispose();original.dispose();
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  out.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  out.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  out.computeBoundingSphere();return out;
 };
 return{body:merge(paint),trim:merge(detail)};
}

class Batch{
 constructor(){this.data=new Map();this.group=new THREE.Group();}
 add(geo,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,buildingId=null,glow=false,finish='matte'){const key=geo.uuid+color+(glow?'@light':'')+finish;if(!this.data.has(key))this.data.set(key,{geo,color,glow,finish,items:[]});this.data.get(key).items.push({x,y,z,sx,sy,sz,rx,ry,rz,buildingId});}
 box(color,x,y,z,sx,sy,sz,ry=0,id=null,glow=false,finish='matte'){this.add(BOX,color,x,y,z,sx,sy,sz,0,ry,0,id,glow,finish);}
 build(shadow=true){const dummy=new THREE.Object3D();for(const {geo,color,glow,finish,items} of this.data.values()){const roughness=finish==='glass'?.18:finish==='metal'?.32:finish==='water'?.21:finish==='wood'?.71:finish==='stone'?.88:.83;const metalness=finish==='glass'?.26:finish==='metal'?.58:finish==='water'?.08:0;const material=new THREE.MeshStandardMaterial({color,roughness:glow?.4:roughness,metalness,transparent:!!glow,opacity:glow?0:1,depthWrite:!glow});if(glow){material.emissive.set(color);material.emissiveIntensity=1.6;material.toneMapped=false;}const mesh=new THREE.InstancedMesh(geo,material,items.length);mesh.castShadow=shadow&&!glow;mesh.receiveShadow=!glow;mesh.userData.ids=[];mesh.userData.nightGlow=!!glow;mesh.userData.baseColor=color;mesh.userData.nightRole=finish.startsWith('night-')?finish.slice(6):null;if(glow)mesh.visible=false;items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.userData.ids.push(p.buildingId);});mesh.computeBoundingSphere();this.group.add(mesh);}return this.group;}
}

export class TrafficRenderer{
 constructor(canvas){
 this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.96;
 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#77bec3');this.camera=new THREE.OrthographicCamera(-30,30,20,-20,.1,500);this.camera.position.set(190,85,220);this.camera.lookAt(150,0,150);this.skyLight=new THREE.HemisphereLight('#e8f7ff','#698057',2.35);this.scene.add(this.skyLight);this.light=new THREE.DirectionalLight('#fff0ce',3.1);this.light.position.set(110,100,105);this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);Object.assign(this.light.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:220});this.light.shadow.bias=-.0007;this.light.shadow.normalBias=.035;this.light.shadow.radius=3;this.scene.add(this.light,this.light.target);
 this.ray=new THREE.Raycaster();this.ground=new THREE.Plane(UP,0);this.ndc=new THREE.Vector2();this.point=new THREE.Vector3();this.lastKey='';this.roadKey='';this.buildKey='';this.treeKey='';this.previewKey='';this.buildingMeshes=null;this.cameraKey='';this.cam=null;this.w=innerWidth;this.h=innerHeight;this.materials=[];
 this.roadGroup=new THREE.Group();this.buildingGroup=new THREE.Group();this.treeGroup=new THREE.Group();this.previewGroup=new THREE.Group();this.signalGroup=new THREE.Group();this.lampGroup=new THREE.Group();this.scene.add(this.roadGroup,this.buildingGroup,this.treeGroup,this.previewGroup,this.signalGroup,this.lampGroup);this.createCars();this.createRoute();this.createAtmosphere();this.resize();
 }
 disposeGroup(group){for(const o of [...group.children]){group.remove(o);o.traverse(x=>{if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];for(const m of ms)m.dispose();}if(x.geometry&&!([BOX,CYL,CONE,LEAF,BALL].includes(x.geometry)))x.geometry.dispose();});}}
 resize(){this.w=innerWidth;this.h=innerHeight;this.renderer.setSize(this.w,this.h,false);if(this.cam)this.updateCamera(this.cam);}
 createAtmosphere(){
  // Keep the city unobstructed at every hour: no atmospheric fog/haze.
  this.scene.fog=null;
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;const c=cv.getContext('2d'),g=c.createRadialGradient(32,32,1,32,32,31);
  g.addColorStop(0,'rgba(255,238,191,.72)');g.addColorStop(.37,'rgba(255,190,116,.28)');g.addColorStop(1,'rgba(255,183,104,0)');
  c.fillStyle=g;c.fillRect(0,0,64,64);this.glowTexture=new THREE.CanvasTexture(cv);
  this.rainPoints=new Float32Array(430*6);const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(this.rainPoints,3));
  this.rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#cfe6f1',transparent:true,opacity:0,depthWrite:false}));
  this.rain.frustumCulled=false;this.rain.visible=false;this.scene.add(this.rain);this.lastGlow=-1;
 }
 updateNightVisibility(night){
  // A controlled emissive floor keeps the driving surfaces readable without
  // lighting the entire city like daytime. Cache updates for mobile GPUs.
  if(Math.abs(night-(this.lastNightVisibility??-1))<.018)return;
  this.lastNightVisibility=night;
  const surfaces=[
   [this.roadGroup,true],
   [this.buildingGroup,false]
  ];
  for(const [group,isRoad] of surfaces)group.traverse(mesh=>{
   if(!mesh.material?.emissive)return;
   const base=mesh.userData.baseColor||'';
   let role=mesh.userData.nightRole;
   if(isRoad){
    if(['#47565c','#424f55'].includes(base))role='asphalt';
    else if(['#dce3d8','#ead78c','#edf0df','#f1eddb'].includes(base))role='marking';
   }
   let tint=base,intensity=0;
   if(role==='asphalt'){intensity=.24;tint=base||'#56666a';}
   else if(role==='night-asphalt'){intensity=.42;tint=base||'#56666a';}
   else if(role==='marking'||role==='road-marking'||role==='night-marking'){intensity=.68;tint=base||'#f4edd8';}
   else if(role==='lot-base'||role==='night-lot-base'){intensity=.20;tint=base||'#bdc6ae';}
   if(intensity){mesh.material.emissive.set(tint);mesh.material.emissiveIntensity=night*intensity;}
  });
  for(const set of this.carSets.values()){
   set.body.material.emissive.set('#a5afb4');
   set.body.material.emissiveIntensity=night*.40;
   set.trim.material.emissive.set('#6d8790');
   set.trim.material.emissiveIntensity=night*.23;
   for(const mesh of [set.headlights,set.taillights]){
    mesh.visible=night>.04&&mesh.count>0;
    mesh.material.opacity=night*.94;
   }
  }
 }
 updateWeatherLight(state){
  const sun=lightAt(state.time),air=climateAt(state.time,state.city);
  this.scene.background.copy(sun.sky).lerp(new THREE.Color('#738999'),air.cloud*.22+air.rain*.38);
  this.skyLight.intensity=Math.max(.84,sun.ambient*(1-air.cloud*.14-air.rain*.24));
  this.light.color.copy(sun.sun).lerp(new THREE.Color('#dfe9f0'),air.cloud*.25);
  this.light.intensity=Math.max(.44,sun.strength*(1-air.cloud*.18-air.rain*.36));
  this.renderer.toneMappingExposure=Math.max(.69,sun.exposure*(1-air.rain*.09));
  const solar=Math.max(0,Math.sin((sun.minute-360)/720*Math.PI)),az=sun.minute/1440*Math.PI*2;
  this.light.position.set(this.cam.x+Math.cos(az)*65,27+solar*68,this.cam.y+Math.sin(az)*65);
  this.light.castShadow=sun.strength>.58;
  const glow=smooth(sun.lamps)*(1-air.rain*.12);
  this.updateNightVisibility(glow);
  if(Math.abs(glow-this.lastGlow)>.008){
   for(const group of [this.lampGroup,this.buildingGroup])group.traverse(mesh=>{
    if(!mesh.userData.nightGlow)return;mesh.visible=glow>.015;
    mesh.material.opacity=.91*glow;mesh.material.emissiveIntensity=1.25+glow*.9;
   });
   if(this.streetGlow)this.streetGlow.material.opacity=.42*glow;
   this.lastGlow=glow;
  }
  this.rain.visible=air.rain>.025;
  if(this.rain.visible){
   this.rain.material.opacity=Math.min(.49,.12+air.rain*.4);this.rain.position.set(this.cam.x,0,this.cam.y);
   const elapsed=Date.now()*.001,p=this.rainPoints,span=Math.max(24,Math.min(52,34/Math.max(.7,this.cam.z)));
   for(let i=0;i<p.length/6;i++){const k=i*6,x=(hash(i+2,19)-.5)*span*2,z=(hash(i+7,23)-.5)*span*2;
    const y=1+((hash(i+11,41)*13-elapsed*(9+hash(i,9)*5))%13+13)%13;
    p[k]=x;p[k+1]=y;p[k+2]=z;p[k+3]=x+.13;p[k+4]=y-.65;p[k+5]=z+.05;
   }this.rain.geometry.attributes.position.needsUpdate=true;
  }
  if(Math.abs(air.wet-(this.lastWet??-1))>.02){
   this.roadGroup.traverse(mesh=>{
    if(!mesh.material||!['#47565c','#424f55'].includes(mesh.userData.baseColor))return;
    mesh.material.roughness=.83-air.wet*.53;mesh.material.metalness=air.wet*.13;
   });this.lastWet=air.wet;
  }
 }
 updateCamera(cam){this.cam=cam;const half=this.h/(2*26*cam.z),aspect=this.w/this.h;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;const angle=cam.angle??Math.PI*.2,dist=90;this.camera.position.set(cam.x+Math.sin(angle)*dist,86,cam.y+Math.cos(angle)*dist);this.camera.lookAt(cam.x,0,cam.y);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.light.position.set(cam.x-45,90,cam.y-35);this.light.target.position.set(cam.x,0,cam.y);this.light.target.updateMatrixWorld();}
 screen(x,z,height=0){this.point.set(x,height/18,z).project(this.camera);return[(this.point.x+1)*this.w/2,(1-this.point.y)*this.h/2];}
 world(x,y){this.ndc.set(x/this.w*2-1,1-y/this.h*2);this.ray.setFromCamera(this.ndc,this.camera);const p=new THREE.Vector3();this.ray.ray.intersectPlane(this.ground,p);return[p.x,p.z];}
 pickBuilding(x,y){this.ndc.set(x/this.w*2-1,1-y/this.h*2);this.ray.setFromCamera(this.ndc,this.camera);const hits=this.ray.intersectObjects(this.buildingGroup.children,true);for(const h of hits){const id=h.object.userData.ids?.[h.instanceId];if(id!=null)return id;}return null;}
 coast(z){return 125+Math.sin(z*.032)*5+Math.sin(z*.072)*2;}
 groundShape(points,color,height){const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:1}));m.position.y=height;m.receiveShadow=true;this.scene.add(m);this.terrainGroup.push(m);return m;}
 terrain(city){if(this.terrainGroup)for(const m of this.terrainGroup){this.scene.remove(m);m.traverse(o=>{if(o.geometry&&!([BOX,CYL,CONE,LEAF,BALL].includes(o.geometry)))o.geometry.dispose();if(o.material)o.material.dispose();});}this.terrainGroup=[];this.city=city;
 const water=new THREE.Mesh(new THREE.PlaneGeometry(650,650,1,1),new THREE.MeshStandardMaterial({color:'#399fa9',roughness:.38,metalness:.07}));water.rotation.x=-Math.PI/2;water.position.set(150,-.35,150);water.receiveShadow=true;this.scene.add(water);this.terrainGroup.push(water);
 const coast=[];for(let z=-50;z<=350;z+=2)coast.push([this.coast(z),z]);if(city==='phuket'){this.groundShape([...coast, [370,350],[370,-50]],'#ead79d',-.12);this.groundShape([...coast.map(([x,z])=>[x+1.6,z]),[370,350],[370,-50]],'#87b675',0);this.groundShape([...coast.map(([x,z])=>[x-1.2,z]),...coast.slice().reverse().map(([x,z])=>[x-3.8,z])],'#69c8c1',-.28);}
 else{this.groundShape([[-40,-40],[-40,340],[340,340],[340,-40]],city==='chiangmai'?'#80ab69':'#8db477',0);if(city==='bangkok'){const l=[],r=[];for(let z=-40;z<=340;z+=2){const x=125+Math.sin(z*.047)*5;l.push([x-4,z]);r.push([x+4,z]);}this.groundShape([...l,...r.reverse()],'#63b6b5',.015);}}
 const wavePositions=[];if(city==='phuket')for(let z=60;z<240;z+=2.4)for(let x=85;x<this.coast(z)-5;x+=6){if(hash(x,z)>.5)continue;const len=.7+hash(z,x)*2;wavePositions.push(x,-.3,z,x+len,-.3,z+.1);}
 if(wavePositions.length){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(wavePositions,3));const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#9edcd4',transparent:true,opacity:.48}));this.scene.add(lines);this.terrainGroup.push(lines);}
 const terrainBatch=new Batch();if(city==='chiangmai')for(let n=0;n<12;n++){const x=100+(n%4)*8,z=105+Math.floor(n/4)*15;terrainBatch.add(CONE,['#6f9168','#81a875','#597c62'][n%3],x,2.5,z,8,6+n%3*3,8,0,.4,0);}if(city==='phuket')for(let n=0;n<35;n++){const z=90+n*4.1,x=this.coast(z)-1+hash(n)*.6;terrainBatch.add(LEAF,'#b1b3a1',x,-.08,z,.35+hash(n)*.5,.22,.5,0,n,0);}const group=terrainBatch.build();this.scene.add(group);this.terrainGroup.push(group);this.treeKey='';
 }
 tree(batch,x,z,scale=1,palm=false){
 if(palm){batch.add(CYL,'#9d8560',x,.72*scale,z,.07*scale,1.45*scale,.07*scale,0,0,-.08);for(let n=0;n<7;n++){const a=n/7*TAU;batch.add(LEAF,n%2?'#438b60':'#64a765',x+Math.cos(a)*.37*scale,1.51*scale,z+Math.sin(a)*.37*scale,.56*scale,.09*scale,.16*scale,0,-a,Math.cos(a)*.2);}batch.add(BALL,'#759e46',x,1.52*scale,z,.14*scale,.17*scale,.14*scale);}
 else{batch.add(CYL,'#947653',x,.36*scale,z,.075*scale,.72*scale,.075*scale);batch.add(LEAF,'#498457',x,.87*scale,z,.53*scale,.68*scale,.5*scale,0,hash(x,z)*3,0);batch.add(LEAF,'#6aa060',x-.17*scale,1.18*scale,z-.12*scale,.37*scale,.37*scale,.36*scale);}
 }
 trees(state,cam){const cellX=Math.floor(cam.x/18),cellZ=Math.floor(cam.y/18),key=[cellX,cellZ,state.version,state.buildings.size,state.city].join(':');if(key===this.treeKey)return;this.treeKey=key;this.disposeGroup(this.treeGroup);const b=new Batch(),span=62;for(let z=cellZ*18-span;z<cellZ*18+span;z+=2.7)for(let x=cellX*18-span;x<cellX*18+span;x+=2.7){if(hash(x,z)<.69)continue;const tx=x+hash(z,x)*1.8,tz=z+hash(x+7,z)*1.8,ix=Math.floor(tx),iz=Math.floor(tz);if(ix<0||iz<0||ix>=300||iz>=300)continue;if(state.city==='phuket'&&tx<this.coast(tz)+2.1||state.city==='bangkok'&&Math.abs(tx-(125+Math.sin(tz*.047)*5))<4.6)continue;let clear=true;for(let yy=iz-1;yy<=iz+1;yy++)for(let xx=ix-1;xx<=ix+1;xx++){const index=yy*300+xx;if(state.footprint[index]>=0||state.buildGrid[index]>=0)clear=false;}if(!clear)continue;this.tree(b,tx,tz,.65+hash(tx,tz)*.65,state.city==='phuket'&&hash(tx+3,tz)>.42);}this.treeGroup.add(b.build());}
 makeRoads(state,ROADS,junction){this.disposeGroup(this.roadGroup);this.disposeGroup(this.signalGroup);this.signals=[];const batch=new Batch(),line=new Batch();const roadWidths={small:ROADS.small.visualWidth||1.55,medium:ROADS.medium.visualWidth||2.35,large:ROADS.large.visualWidth||3.72};
 const layouts=new Map(),hidden=new Set(),nearby=new Map(),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 if(junction.details)for(const [node]of state.roads){const d=junction.details(node);for(const [a,b]of d.hiddenEdges)hidden.add(edgeKey(a,b));if(d.arms.length>=3||d.bend)layouts.set(node,d);}
 for(const layout of layouts.values())for(let xx=Math.floor(layout.x-layout.halfX-2);xx<=Math.ceil(layout.x+layout.halfX+2);xx++)for(let zz=Math.floor(layout.y-layout.halfY-2);zz<=Math.ceil(layout.y+layout.halfY+2);zz++){const key=zz*300+xx;if(!nearby.has(key))nearby.set(key,[]);nearby.get(key).push(layout);}
 const paint=new Map();
 const ribbon=(points,color,thickness=.025,height=.118)=>{points=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-7);if(points.length<2)return;points=points.map(p=>[...p]);for(const [end,next]of [[0,1],[points.length-1,points.length-2]]){const dx=points[end][0]-points[next][0],dz=points[end][1]-points[next][1],length=Math.hypot(dx,dz)||1;points[end][0]+=dx/length*.003;points[end][1]+=dz/length*.003;}if(!paint.has(color))paint.set(color,[]);const vertices=paint.get(color),pairs=[];
 for(let k=0;k<points.length;k++){const prev=points[Math.max(0,k-1)],p=points[k],next=points[Math.min(points.length-1,k+1)],ax=p[0]-prev[0],az=p[1]-prev[1],bx=next[0]-p[0],bz=next[1]-p[1],al=Math.hypot(ax,az)||1,bl=Math.hypot(bx,bz)||1,n1=k?[-az/al,ax/al]:[-bz/bl,bx/bl],n2=k<points.length-1?[-bz/bl,bx/bl]:n1;let nx=n1[0]+n2[0],nz=n1[1]+n2[1],length=Math.hypot(nx,nz)||1;nx/=length;nz/=length;const scale=thickness*.5/Math.max(.5,nx*n2[0]+nz*n2[1]);pairs.push([[p[0]+nx*scale,height,p[1]+nz*scale],[p[0]-nx*scale,height,p[1]-nz*scale]]);}
 for(let k=1;k<pairs.length;k++){const [a,b]=pairs[k-1],[c,d]=pairs[k];vertices.push(...a,...c,...b,...b,...c,...d);}
 };
 const stroke=(ax,az,bx,bz,color,thickness=.025,height=.118)=>ribbon([[ax,az],[bx,bz]],color,thickness,height);
 const dashedRibbon=(points,color,width)=>{let distance=0,run=[];for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],length=Math.hypot(b[0]-a[0],b[1]-a[1]);let used=0;while(used<length-1e-9){const phase=distance%1,on=phase<.45,step=Math.min(length-used,(on?.45:1)-phase);if(step<1e-9){distance+=1e-8;continue;}const p=[a[0]+(b[0]-a[0])*used/length,a[1]+(b[1]-a[1])*used/length];used+=step;const q=[a[0]+(b[0]-a[0])*used/length,a[1]+(b[1]-a[1])*used/length];if(on){if(!run.length)run.push(p);run.push(q);}else if(run.length){ribbon(run,color,width);run=[];}distance+=step;}}if(run.length)ribbon(run,color,width);};
 const cutInterval=(x,z,dx,dz,l)=>{let a=0,b=1;for(const [start,delta,lo,hi]of [[x,dx,l.x-l.halfX,l.x+l.halfX],[z,dz,l.y-l.halfY,l.y+l.halfY]]){if(Math.abs(delta)<1e-9){if(start<lo||start>hi)return null;}else{const t0=(lo-start)/delta,t1=(hi-start)/delta;a=Math.max(a,Math.min(t0,t1));b=Math.min(b,Math.max(t0,t1));}}return b>a?[a,b]:null;};

 for(const [i,r]of state.roads){const x=i%300,z=Math.floor(i/300),w=roadWidths[r.type];if(!r.links.size)batch.box('#424f55',x,.062,z,w,.12,w);for(const j of r.links){if(j<i||hidden.has(edgeKey(i,j)))continue;const nx=j%300,nz=Math.floor(j/300),dx=nx-x,dz=nz-z,len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx),mx=(x+nx)/2,mz=(z+nz)/2,neighbor=state.roads.get(j),segmentWidth=Math.max(w,neighbor?roadWidths[neighbor.type]||w:w);let widthA=w,widthB=neighbor?roadWidths[neighbor.type]||w:w,intervals=[[0,1]];const around=[...new Set([...(nearby.get(i)||[]),...(nearby.get(j)||[])])];
 for(const layout of around){const axis=Math.abs(dx)>Math.abs(dz)?0:1,center=axis===0?mx-layout.x:mz-layout.y,dir=axis===0?(center>=0?0:2):(center>=0?1:3),arm=layout.arms.find(a=>a.dir===dir),aligned=axis===0?Math.abs(z-layout.y)<.01:Math.abs(x-layout.x)<.01;if(aligned&&arm){widthA=widthB=arm.width;const cut=cutInterval(x,z,dx,dz,layout);if(cut){const pieces=[];for(const [lo,hi]of intervals){if(cut[1]<=lo||cut[0]>=hi)pieces.push([lo,hi]);else{if(cut[0]>lo)pieces.push([lo,cut[0]]);if(cut[1]<hi)pieces.push([cut[1],hi]);}}intervals=pieces;}}}
 const parts=widthA===widthB?1:12;for(const [lo,hi]of intervals)for(let part=0;part<parts;part++){const a=lo+(hi-lo)*part/parts,b=lo+(hi-lo)*(part+1)/parts,t=(a+b)/2,sw=widthA+(widthB-widthA)*t,cx=x+dx*t,cz=z+dz*t,overlap=around.length?.002:.04;batch.box('#c9c8b5',cx,.015,cz,len*(b-a)+overlap,.08,sw+.28,angle);batch.box('#47565c',cx,.075,cz,len*(b-a)+overlap,.055,sw,angle);}
 const axisX=dx/len,axisZ=dz/len,perpX=-axisZ,perpZ=axisX,capA=Math.max(1,(Object.values(ROADS).find(t=>Math.abs((t.visualWidth||t.width)-widthA)<.01)?.lanes||ROADS[r.type].lanes)/2),capB=Math.max(1,(Object.values(ROADS).find(t=>Math.abs((t.visualWidth||t.width)-widthB)<.01)?.lanes||ROADS[neighbor.type].lanes)/2),lanes=Math.max(capA,capB);
 // Mark the surviving road intervals right up to the shared junction boundary.
 // Never suppress a whole grid link merely because it is near a junction.
 for(const [lo,hi]of intervals){const guide=(oa,ob,color,dashed=false)=>{const point=t=>{const off=oa+(ob-oa)*t;return[x+dx*t+perpX*off,z+dz*t+perpZ*off];};if(!dashed){ribbon([point(lo),point(hi)],color,color==='#ead78c'?.018:.025);return;}
 const origin=x*axisX+z*axisZ,start=origin+lo*len,end=origin+hi*len;for(let dash=Math.floor(start);dash<end;dash++){const a=Math.max(start,dash),b=Math.min(end,dash+.45);if(b>a)ribbon([point((a-origin)/len),point((b-origin)/len)],color,.025);}};
 for(const sign of [-1,1]){guide(.035*sign,.035*sign,'#ead78c');guide(widthA/2*sign,widthB/2*sign,'#dce3d8');for(let k=1;k<lanes;k++)guide(Math.min(widthA/2-.1,k*widthA/(capA*2))*sign,Math.min(widthB/2-.1,k*widthB/(capB*2))*sign,'#dce3d8',true);}}

 }
 if(junction(i)>=3||layouts.has(i)){const layout=layouts.get(i);if(layout){
 const shape=new THREE.Shape();layout.polygon.forEach(([px,pz],index)=>index?shape.lineTo(px,-pz):shape.moveTo(px,-pz));shape.closePath();const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);batch.add(geometry,'#47565c',x,.105,z,1,1,1);
 for(const edge of layout.borders){const points=edge.map(([px,pz])=>[x+px,z+pz]);ribbon(points,'#c9c8b5',.28,.08);ribbon(points,'#dce3d8',.025);}
 if(layout.bend){const a=layout.ports[0],b=layout.ports[1],va=[[1,0],[0,1],[-1,0],[0,-1]][a.dir],vb=[[1,0],[0,1],[-1,0],[0,-1]][b.dir],capA=Math.max(1,ROADS[state.roads.get(a.node)?.type||'small'].lanes/2),capB=Math.max(1,ROADS[state.roads.get(b.node)?.type||'small'].lanes/2);
 const guide=(oa,ob,color,dashed=false)=>{const ax=va[0]*a.extent-va[1]*oa,az=va[1]*a.extent+va[0]*oa,bx=vb[0]*b.extent+vb[1]*ob,bz=vb[1]*b.extent-vb[0]*ob,cx=a.dir%2===0?bx:ax,cz=a.dir%2===0?az:bz,points=[];for(let k=0;k<=64;k++){const t=k/64,u=1-t;points.push([x+u*u*ax+2*u*t*cx+t*t*bx,z+u*u*az+2*u*t*cz+t*t*bz]);}if(dashed)dashedRibbon(points,color,.025);else ribbon(points,color,.018);};
 for(const sign of [-1,1]){guide(.035*sign,.035*sign,'#ead78c');for(let k=1;k<Math.max(capA,capB);k++)guide(Math.min(a.width/2-.1,k*a.width/(capA*2))*sign,Math.min(b.width/2-.1,k*b.width/(capB*2))*sign,'#dce3d8',true);}}

 for(const port of layout.ports){if(layout.bend)continue;
 const [vx,vz]=[[1,0],[0,1],[-1,0],[0,-1]][port.dir],px=-vz,pz=vx,ww=port.width,offset=port.extent+.13;
 line.box('#edf0df',x+vx*offset+px*ww/4,.115,z+vz*offset+pz*ww/4,.075,.012,Math.max(.2,ww/2-.12),-Math.atan2(vz,vx));
 // Compact zebra crossing inside the stop bar; markings never affect routing.
 const across=ww/2-.12,crossAt=port.extent-.28;
 for(let stripe=-across+.09;stripe<across;stripe+=.23){
  line.box('#f1eddb',x+vx*crossAt+px*stripe,.12,z+vz*crossAt+pz*stripe,.38,.01,.12,-Math.atan2(vz,vx));
 }
 const sx=x+vx*offset+px*(ww/2+.3),sz=z+vz*offset+pz*(ww/2+.3),yaw=Math.atan2(vx,vz);
 batch.box('#c9c8b5',sx,.115,sz,.26,.12,.26);
 batch.add(CYL,'#3e5356',sx,.85,sz,.038,1.5,.038);
 batch.add(CYL,'#a8b8ae',sx,.23,sz,.053,.16,.053);
 batch.add(CYL,'#e5dfc9',sx,.49,sz,.042,.085,.042);
 batch.box('#d0ae64',sx,1.57,sz,.29,.69,.105,yaw);
 batch.box('#203337',sx+vx*.018,1.57,sz+vz*.018,.245,.64,.14,yaw);
 const lenses={};
 for(const [name,yy]of [['red',1.76],['yellow',1.57],['green',1.38]]){
  // Hoods and lens wells face their own approach, rather than all facing south.
  batch.box('#17292e',sx+vx*.1,yy+.067,sz+vz*.1,.16,.035,.14,yaw);
  const bulb=new THREE.Mesh(BALL,new THREE.MeshBasicMaterial({color:'#33413c'}));
  bulb.scale.set(.057,.057,.026);bulb.rotation.y=yaw;
  bulb.position.set(sx+vx*.099,yy,sz+vz*.099);this.signalGroup.add(bulb);lenses[name]=bulb;
 }
 this.signals.push({lenses,node:i,axis:port.dir%2});

 }
 }else{const junctionWidth=Math.max(w,...[...r.links].map(n=>roadWidths[state.roads.get(n)?.type]||w));batch.box('#47565c',x,.081,z,junctionWidth,.055,junctionWidth);}}

 }
 this.roadGroup.add(batch.build(false),line.build(false));
 for(const [color,positions]of paint){if(!positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.userData.baseColor=color;mesh.userData.nightRole='road-marking';this.roadGroup.add(mesh);}
 const gates=new Batch();for(let n=0;n<state.gates.length;n++){const i=state.gates[n],x=i%300,z=Math.floor(i/300),angle=n%2?0:Math.PI/2;gates.box('#dfddd0',x,1.9,z,4.9,.2,.45,angle);for(const sign of[-1,1]){const dx=n%2?0:sign*2.2,dz=n%2?sign*2.2:0;gates.box('#ede9d5',x+dx,.95,z+dz,.2,1.9,.2);}gates.box('#2f746c',x,2.15,z,3.7,.42,.16,angle);}this.roadGroup.add(gates.build());
 // Decorative street lighting; no changes to roads, routing or collision.
 this.disposeGroup(this.lampGroup);this.streetGlow=null;
 const poles=new Batch(),spots=[];
 for(const [node,road] of state.roads){
  if(spots.length>=2500||road.links.size!==2||junction(node)!==2)continue;
  const x=node%300,z=Math.floor(node/300),links=[...road.links],a=links[0],b=links[1];
  const horiz=Math.floor(a/300)===z&&Math.floor(b/300)===z&&(a-node)*(b-node)<0;
  const vert=a%300===x&&b%300===x&&(Math.floor(a/300)-z)*(Math.floor(b/300)-z)<0;
  if(!horiz&&!vert||horiz&&x%9!==0||vert&&z%9!==0)continue;
  const sign=(Math.floor(x/9)+Math.floor(z/9))%2?1:-1;
  const offset=(ROADS[road.type]?.visualWidth||1.55)/2+.36;
  const px=x+(vert?sign*offset:0),pz=z+(horiz?sign*offset:0);
  const hx=px-(vert?sign*.31:0),hz=pz-(horiz?sign*.31:0);
  poles.add(CYL,'#536b73',px,.76,pz,.035,1.52,.035);
  poles.box('#667980',(px+hx)/2,1.49,(pz+hz)/2,vert?.37:.08,.055,horiz?.37:.08);
  poles.add(BALL,'#d4d5bf',hx,1.46,hz,.12,.09,.12);
  poles.add(BALL,'#ffdfa0',hx,1.46,hz,.123,.093,.123,0,0,0,null,true);
  spots.push([hx,hz]);
 }
 if(spots.length){
  this.lampGroup.add(poles.build(false));
  const geo=new THREE.PlaneGeometry(3.3,3.3),mat=new THREE.MeshBasicMaterial({map:this.glowTexture,color:'#ffd29d',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});
  const halos=new THREE.InstancedMesh(geo,mat,spots.length),d=new THREE.Object3D();
  for(let i=0;i<spots.length;i++){d.position.set(spots[i][0],.151,spots[i][1]);d.rotation.set(-Math.PI/2,0,0);d.scale.set(1,1,1);d.updateMatrix();halos.setMatrixAt(i,d.matrix);}
  halos.instanceMatrix.needsUpdate=true;halos.frustumCulled=false;this.streetGlow=halos;this.lampGroup.add(halos);
 }
 this.lastGlow=-1;this.lastWet=-1;this.lastNightVisibility=-1;
}
 updateSignals(signalColor){const lit={red:'#ff6855',yellow:'#ffd56b',green:'#9eeb96'},dim={red:'#4d302e',yellow:'#494230',green:'#2b473f'};for(const s of this.signals||[]){const active=signalColor(s.node,s.axis);for(const [name,lens]of Object.entries(s.lenses))lens.material.color.set(name===active?lit[name]:dim[name]);}}
 roof(batch,x,z,w,d,base,color,id){const angle=Math.atan2(.55,d/2),length=Math.hypot(d/2,.55);for(const sign of[-1,1])batch.add(BOX,color,x,base+.275,z+sign*d/4,w+.18,.10,length+.11,sign*angle,0,0,id);for(let k=-w/2+.12;k<w/2;k+=.22){for(const sign of[-1,1])batch.add(BOX,'#b86d48',x+k,base+.3,z+sign*d/4,.023,.035,length+.12,sign*angle,0,0,id);}batch.box('#ce8054',x,base+.57,z,w+.19,.07,.08,0,id);}
 window(batch,x,y,z,w,h,side,id){if(side==='front'){batch.box('#385d69',x,y,z,w,h,.025,0,id);if(hash(x+id,y+z)>.36)batch.box('#ffdf9d',x,y,z+.034,w*.76,h*.78,.012,0,id,true);batch.box('#dddac4',x,y,z+.02,.026,h+.04,.022,0,id);batch.box('#e9e6d4',x,y-h/2-.035,z+.04,w+.1,.06,.075,0,id);}else{batch.box('#456d75',x,y,z,.025,h,w,0,id);if(hash(z+id,x+y)>.40)batch.box('#ffe2ad',x+.035,y,z,.012,h*.77,w*.73,0,id,true);batch.box('#ede7d3',x+.02,y-h/2-.035,z,.075,.06,w+.08,0,id);}}
 parkingLot(batch,b){for(const rect of this.parking.parkingVisuals(b)){const p=this.parking.lotPoint(b,rect.u,rect.v);const asphalt=['#515f62','#58666a'].includes(rect.color),marking=['#e9e6cc','#c5d2c2','#bbc9b9','#94d9aa','#f3ca88','#e5e6d0'].includes(rect.color);batch.box(rect.color,p.x-.5,rect.color==='#bdc6ae'?.025:rect.color==='#515f62'?.065:.09,p.y-.5,rect.w,.012,rect.h,-(b.rotation||0)*Math.PI/2,b.id,false,asphalt?'night-asphalt':marking?'night-marking':'night-lot-base');}}
 building(batch,b,CATALOG,KINDS){
  // Visual-only architecture v5: every component remains within its plot.
  if(this.parking)this.parkingLot(batch,b);
  const t=CATALOG[b.key],id=b.id,s=t.size,W=t.plotWidth||s+2,isHotel=t.kind==='hotel',kind=isHotel?'home':t.kind;
  const tier=b.key.endsWith('_large')?3:b.key.endsWith('_medium')?2:1;
  const turn=-(b.rotation||0)*Math.PI/2;
  const point=(u,v)=>this.parking?.lotPoint(b,u,v)||{x:b.x+u+.5,y:b.y+v+.5};
  const block=(color,u,y,v,w,h,d,finish='matte',glow=false)=>{
   const p=point(u,v);batch.box(color,p.x-.5,y,p.y-.5,w,h,d,turn,id,glow,finish);
  };
  const pole=(color,u,y,v,r,h,finish='matte',glow=false)=>{
   const p=point(u,v);batch.add(CYL,color,p.x-.5,y,p.y-.5,r,h,r,0,0,0,id,glow,finish);
  };
  const planted=(u,v,scale=.44)=>{
   const p=point(u,v);this.tree(batch,p.x-.5,p.y-.5,scale);
  };
  const gable=(color,u,v,w,d,base,rise)=>{
   const slope=Math.hypot(d*.5,rise)+.04,angle=Math.atan2(rise,d*.5);
   for(const sign of [-1,1]){
    const p=point(u,v+sign*d*.25);
    batch.add(BOX,color,p.x-.5,base+rise*.51,p.y-.5,w+.10,.10,slope,sign*angle,turn,0,id,false,'stone');
   }
   block('#e8d9c9',u,base+rise,v,w+.14,.05,.08,'stone');
  };
  const lantern=(u,v,lit='#ffe0ad',height=1.18)=>{
   pole('#6b777a',u,height*.5,v,.021,height,'metal');
   block('#d3d7cd',u,height+.02,v,.17,.065,.14,'metal');
   block(lit,u,height-.01,v,.12,.065,.11,'glass',true);
  };
  const pane=(u,y,v,w,h,lit=true,tint='#356578')=>{
   block('#e6e6dc',u,y,v,w+.105,h+.11,.065,'stone');
   block(tint,u,y,v+.044,w,h,.05,'glass');
   block('#a4d1da',u,y+h*.20,v+.073,w*.72,.035,.014,'glass');
   if(lit)block('#ffe2b3',u,y-h*.10,v+.079,w*.75,h*.55,.012,'glass',true);
   block('#bfcfcb',u,y,v+.08,.023,h*.96,.022,'metal');
   block('#e9ded0',u,y-h*.55,v+.048,w+.09,.052,.09,'stone');
  };
  const ribbon=(u,y,v,w,h,n,tint='#356475')=>{
   block(tint,u,y,v,w,h,.035,'glass');
   const count=Math.max(2,Math.min(26,n));
   for(let i=0;i<count;i++){
    const x=u-w*.5+(i+.5)*w/count;
    block('#bed5d9',x,y,v+.04,.022,h*.92,.022,'metal');
    block('#d1e1df',x,y+h*.28,v+.042,w/count*.82,.028,.018,'glass');
    if(hash(x+id,y)>.42)block('#ffe0ac',x,y-h*.12,v+.047,w/count*.64,h*.36,.013,'glass',true);
   }
  };
  const wall=isHotel?['#d1e8eb','#cee2e8','#d6e9ec'][tier-1]:{
   home:['#e9dbc9','#e7dfd3','#eae6df'],shop:['#e0bd90','#d7c9b4','#d9e2db'],
   restaurant:['#ddb194','#dcc0a5','#e8ceb7'],mall:['#e6e3d8','#dae4de','#d9e3e5'],
   office:['#cbd5d0','#c2d8da','#d3e0dd'],factory:['#c7c4b5','#bdcbc5','#cbd2ce'],
   park:['#8dab82','#78a982','#7eac80'],pub:['#65586e','#4b5268','#3a3f55']
  }[kind][tier-1];
  const accent=isHotel?'#477f9e':{
   home:['#a36f53','#836b58','#6b7d83'],shop:['#b77d50','#728f8b','#4c7e80'],
   restaurant:['#aa7150','#936c53','#9b7758'],mall:['#6a9a99','#548f92','#3c7f8d'],
   office:['#6a959d','#527e8c','#437788'],factory:['#7e918d','#788e8f','#607985'],
   park:['#699b79','#678d7a','#587f6c'],pub:['#a579b6','#9d70b3','#c07bd2']
  }[kind][tier-1];
  const roof=kind==='pub'?'#293044':kind==='home'?'#786f64':kind==='factory'?'#758991':'#7a9196';
  const span=Math.min(W-1.95,kind==='home'?s*(.94+tier*.45):W-2.36);
  const cx=W*.5,cz=s*.39,depth=s*.62,front=cz+depth*.5,H=
   kind==='office'?1.55+tier*1.17:kind==='home'?1.03+tier*.56:
   kind==='mall'?1.15+tier*.54:kind==='pub'?1.13+tier*.56:
   kind==='factory'?1.23+tier*.33:1.10+tier*.39;
  const mainW=kind==='home'?span*.86:kind==='office'?span*.74:span*.85;
  block('#bdc8bb',cx,.042,s*.50,Math.min(W-.1,span+.36),.09,s-.16,'stone');
  block('#e6dccb',cx,.105,s*.91,Math.max(1.03,mainW*.66),.028,.27,'stone');
  block('#8ca580',cx,.14,s*.11,Math.min(W-.45,mainW+.5),.13,.27);
  const gardens=Math.max(2,Math.min(9,Math.floor(W/7)));
  for(let i=0;i<gardens;i++){
   const u=cx-span*.48+span*.96*(i+.5)/gardens;
   if(Math.abs(u-cx)<.9)continue;
   block('#73965f',u,.18,s*.88,.47,.17,.23);
   if(i%2===0)planted(u,s*.81,.28+tier*.10);
  }
  if(kind==='park'){
   // Landscape architecture: three hardscape axes, fountain and pavilions.
   block('#7bb688',cx,.17,s*.44,span,.10,s*.66);
   block('#edddc4',cx,.23,s*.48,span*.95,.032,.28,'stone');
   block('#e4d9c3',cx,.23,s*.48,.32,.032,s*.72,'stone');
   const plants=Math.max(3,Math.min(30,Math.ceil(span/1.30)));
   for(let i=0;i<plants;i++){
    const u=cx-span*.46+span*.92*(i+.5)/plants;
    for(const side of [-1,1]){
     if(i%4===0)planted(u,s*.45+side*s*.22,.34+tier*.12);
     else block(i%3?'#d6ab87':'#b49ebc',u,.24,s*.45+side*s*.22,.46,.12,.29);
    }
   }
   pole('#e6dcc2',cx,.31,s*.49,.57,.26,'stone');
   pole('#5cacc2',cx,.46,s*.49,.47,.045,'water');
   pole('#e6ded3',cx,.62,s*.49,.09,.37,'stone');
   pole('#d1ece9',cx,.81,s*.49,.04,.09,'water');
   for(const side of [-1,1]){
    const x=cx+side*span*.28;
    block('#ac8a63',x,1.05,s*.45,1.05,.11,.86,'wood');
    for(const z of [-1,1])pole('#e3d2ba',x,.61,s*.45+z*.36,.047,1.01,'stone');
    block('#86a67f',x,1.17,s*.45,1.12,.095,.94);
    if(tier>1)lantern(x,s*.65,'#ffe2ba',.94);
   }
   return;
  }
  // Separate horizontal podium from setbacks to eliminate giant block outlines.
  block('#b3b9b0',cx,.17,cz,span+.10,.16,depth+.16,'stone');
  block(wall,cx,H*.5+.23,cz,mainW,H,depth,'stone');
  if(tier>=2){
   const wing=Math.min(span*.22,Math.max(.76,s*.47));
   for(const side of [-1,1]){
    const wx=cx+side*(span*.43-wing*.40);
    block(accent,wx,H*.36+.21,cz-depth*.065,wing,H*.72,depth*.82,'stone');
    block('#dedfd7',wx,H*.73+.30,cz-depth*.065,wing+.12,.11,depth*.85,'stone');
   }
  }
  if(kind==='home'&&tier<3||kind==='restaurant'&&tier===1){
   gable(kind==='home'?'#aa7658':'#9c7156',cx,cz,mainW,depth,H+.22,tier===1?.33:.39);
  }else{
   block('#edf0e9',cx,H+.28,cz,mainW+.18,.15,depth+.18,'stone');
   block(roof,cx,H+.37,cz,mainW+.06,.06,depth+.09,'metal');
   block(accent,cx,H+.41,cz,mainW*.77,.04,depth*.46,'metal');
  }
  block('#eae1d2',cx,.37,front+.13,Math.max(1.1,span*.36),.12,.45,'stone');
  block('#315b6c',cx,.72,front+.04,Math.min(1.8,span*.30),.86,.06,'glass');
  block('#b2d0d7',cx,.74,front+.075,Math.min(1.54,span*.26),.68,.035,'glass');
  block('#eee8df',cx,1.20,front+.17,Math.min(2.4,span*.40),.12,.39,'metal');
  block('#ffdea3',cx,1.16,front+.19,Math.min(2.0,span*.35),.048,.15,'glass',true);
  if(isHotel){
   const signY=H*.68;block('#3d789c',cx,signY,front+.14,.65,.56,.07,'metal');
   for(const dx of [-.15,.15])block('#edfaff',cx+dx,signY,front+.19,.065,.36,.025,'glass',true);
   block('#edfaff',cx,signY,front+.19,.30,.06,.025,'glass',true);
  }
  if(kind==='home'){
   // Cottage -> family house -> villa with layered glazed pavilion and pool.
   const n=tier===1?3:tier===2?4:6;
   for(let i=0;i<n;i++){
    const x=cx-mainW*.44+mainW*.88*(i+.5)/n;
    if(Math.abs(x-cx)<.37)continue;
    pane(x,H*.54+.11,front+.035,tier===1?.35:.49,.43+tier*.05,hash(x,id)>.32);
   }
   if(tier===1){
    block('#c0a48b',cx-mainW*.33,H+.40,cz-.19,.24,.48,.43,'stone');
    block('#9c7961',cx,H*.30,front+.36,span*.62,.06,.23,'wood');
   }else if(tier===2){
    block('#c8b8a5',cx-mainW*.14,H+.72,cz-depth*.18,mainW*.51,.18,depth*.54,'stone');
    block('#a3babe',cx-mainW*.14,H+.86,cz-depth*.18,mainW*.48,.08,depth*.51,'glass');
    block('#b7ac97',cx+mainW*.31,H*.68+.3,cz,.22,H*.46,depth*.65,'wood');
    block('#e4daca',cx+mainW*.17,1.43,front+.035,mainW*.30,.10,.06,'glass');
   }else{
    // Modern mansion: floating glass upper volume and asymmetric terraces.
    block('#739eae',cx-mainW*.13,H+.73,cz-depth*.18,mainW*.59,.80,depth*.72,'glass');
    block('#e6e1d5',cx-mainW*.13,H+1.18,cz-depth*.18,mainW*.65,.10,depth*.80,'stone');
    block('#b59b7b',cx+mainW*.32,H+.76,cz-depth*.21,mainW*.28,.16,depth*.58,'wood');
    for(let x=cx-mainW*.43;x<cx+mainW*.44;x+=.55)
     block('#dadfd9',x,H+.55,front+.045,.025,.35,.025,'metal');
    const poolX=cx+span*.29,poolZ=s*.86;
    block('#e8e9df',poolX,.17,poolZ,Math.min(1.95,span*.25),.06,.33,'stone');
    block('#62b2c4',poolX,.215,poolZ,Math.min(1.8,span*.235),.023,.24,'water');
    block('#c7e2e7',poolX,.228,poolZ,Math.min(1.5,span*.20),.008,.025,'water');
    for(const sign of [-1,1])block('#f9d3a5',cx+sign*mainW*.42,1.06,front+.07,.10,.22,.04,'glass',true);
   }
  }else if(kind==='mall'){
   // Modular storefront and raised skylight atrium.
   ribbon(cx,.87,front+.08,mainW*.92,.88,Math.round(mainW/.65));
   block(accent,cx,H*.72,front+.09,mainW*.94,.17,.085,'metal');
   const atrium=Math.min(8,mainW*.34);
   block('#86b5c0',cx,H*.77+.41,cz-depth*.13,atrium,H*.72,depth*.68,'glass');
   block('#dfeae6',cx,H*1.14+.44,cz-depth*.13,atrium+.17,.11,depth*.72,'stone');
   if(tier===3){
    block('#b2d0d8',cx,H+.65,cz-depth*.19,Math.min(18,mainW*.6),.28,depth*.43,'glass');
    block('#e5ede8',cx,H+.83,cz-depth*.19,Math.min(18.3,mainW*.61),.07,depth*.45,'stone');
   }
   for(let x=cx-mainW*.46;x<cx+mainW*.46;x+=1.95){
    block('#e8eae1',x,H+.48,cz,1.05,.07,depth*.14,'stone');
    block('#6f9ba1',x,1.02,front+.22,.055,1.30,.13,'metal');
   }
  }else if(kind==='office'){
   // Glass curtain wall grid, raised central tower and rooftop cap.
   const floors=Math.max(3,Math.ceil(H/.62));
   for(let level=0;level<floors;level++){
    const yy=.52+level*.62;
    ribbon(cx,yy,front+.07,mainW*.9,.41,Math.floor(mainW/.52),'#3d7182');
    block('#dce7e4',cx,yy+.24,front+.09,mainW*.96,.065,.07,'metal');
   }
   block('#84aeb7',cx,H*.88+.19,cz-depth*.12,mainW*.52,H*.87,depth*.64,'glass');
   block('#ebf0e8',cx,H*1.32+.25,cz-depth*.12,mainW*.57,.13,depth*.71,'stone');
   block('#537e8e',cx,H*1.35+.38,cz-depth*.18,mainW*.34,.12,depth*.36,'metal');
   for(const sign of [-1,1])block('#d1d9d7',cx+sign*mainW*.40,H+.57,cz,.14,.36,depth*.50,'stone');
  }else if(kind==='factory'){
   // Sawtooth / clerestory roof, bay loading doors, ventilation stacks.
   const bays=Math.max(2,Math.min(20,Math.ceil(mainW/2.6)));
   for(let i=0;i<bays;i++){
    const x=cx-mainW*.46+(i+.5)*mainW*.92/bays;
    block(i%2?'#a2b9b7':'#c5d0cb',x,H+.49,cz,.85,.20,depth*.85,'metal');
    block('#607a82',x,.81,front+.07,.82,.99,.07,'metal');
    for(let y=.51;y<1.2;y+=.19)block('#d7dcd5',x,y,front+.11,.81,.018,.05,'metal');
    block('#9cc5cd',x,H+.64,cz-depth*.16,.61,.045,depth*.43,'glass');
   }
   for(const side of [-1,1]){
    pole('#919fa0',cx+side*mainW*.27,H+.75,cz-depth*.24,.18,.90,'metal');
    pole('#d5dad2',cx+side*mainW*.27,H+1.21,cz-depth*.24,.23,.10,'metal');
   }
  }else if(kind==='pub'){
   // Dark podium, colored vertical fins, illuminated club crown.
   block('#293245',cx,H*.60,front+.08,mainW*.93,.36,.10,'metal');
   ribbon(cx,.81,front+.20,mainW*.84,.75,Math.floor(mainW/.85),'#2c4e66');
   for(let x=cx-mainW*.45;x<cx+mainW*.45;x+=1.17)
    block(x<cx?'#e29ad0':'#83cfe4',x,1.42,front+.24,.11,.67,.075,'glass',true);
   block('#b989cb',cx,H+.52,front+.15,mainW*.76,.19,.19,'metal',true);
   if(tier>=2)block('#695879',cx,H+.81,cz-depth*.15,mainW*.57,.53,depth*.43,'stone');
   if(tier===3){
    block('#a899c1',cx,H+1.13,cz-depth*.15,mainW*.53,.10,depth*.50,'metal');
    for(const side of [-1,1])block('#b2a4d7',cx+side*mainW*.37,H+.64,front+.10,.16,1.04,.13,'glass',true);
   }
  }else if(kind==='restaurant'){
   const panes=Math.max(2,Math.min(16,Math.round(mainW/.88)));
   for(let i=0;i<panes;i++){
    const x=cx-mainW*.44+(i+.5)*mainW*.88/panes;
    pane(x,.80,front+.06,.49,.64,hash(x,id)>.2,'#416e72');
   }
   block('#ad805d',cx,H+.51,front+.22,mainW*.84,.13,.31,'wood');
   block('#fbe3b5',cx,H+.46,front+.28,mainW*.78,.05,.09,'glass',true);
   for(let x=cx-mainW*.40;x<cx+mainW*.40;x+=1.55){
    block('#d3c3a5',x,.29,s*.88,.57,.07,.30,'wood');
    pole('#8f816b',x,.18,s*.88,.038,.26,'wood');
   }
  }else{
   ribbon(cx,.83,front+.07,mainW*.92,.91,Math.floor(mainW/.65),'#3b6873');
   const bays=Math.min(18,Math.max(2,Math.ceil(mainW/1.32)));
   for(let i=0;i<bays;i++){
    const x=cx-mainW*.47+(i+.5)*mainW*.94/bays;
    block('#b58056',x,1.38,front+.18,mainW*.86/bays,.075,.37,'wood');
    block('#ffe0a4',x,1.32,front+.23,mainW*.74/bays,.035,.12,'glass',true);
   }
   if(tier>=2)block('#83a2a1',cx,H+.55,cz-depth*.18,mainW*.47,.31,depth*.37,'glass');
  }
  // Four-sided architecture pass: decorated rear elevations and side facades.
  // All details are in plot-local coordinates, so every rotation gets the
  // same treatment. The earlier build only decorated the front (+v) face.
  const rear=cz-depth*.5-.055;
  const windowBands=kind==='office'?Math.max(3,Math.floor(H/.64)):
   kind==='home'?tier:kind==='mall'?tier:kind==='factory'?1:
   tier===3?2:1;
  const rearBayCount=Math.min(kind==='office'?16:kind==='factory'?12:20,
    Math.max(2,Math.ceil(mainW/(kind==='factory'?1.72:kind==='mall'?1.13:.85))));
  const baySpacing=mainW*.89/rearBayCount;
  const rearGlass=kind==='pub'?'#4c5b7d':kind==='home'?'#567989':
   kind==='office'||kind==='mall'?'#427689':'#426b73';
  // Full-width horizontal belting ensures the silhouette is recognisable
  // from behind; concrete remains a secondary material, not the full wall.
  block(accent,cx,H*.82+.18,rear-.045,mainW*.96,.12,.105,'metal');
  block('#d3dfda',cx,.40,rear-.052,mainW*.94,.10,.115,'stone');
  for(let floor=0;floor<windowBands;floor++){
   const yy=kind==='office'?.58+floor*.63:
    kind==='home'?.75+floor*.72:
    kind==='mall'?.76+floor*.54:.79+floor*.70;
   if(yy>H+.12)continue;
   if(floor>0)block(kind==='pub'?'#9282a6':'#bdccc6',cx,yy-.32,rear-.06,
     mainW*.90,.045,.10,'metal');
   for(let i=0;i<rearBayCount;i++){
    const x=cx-mainW*.445+(i+.5)*baySpacing;
    const width=Math.min(kind==='factory'?.90:.67,baySpacing*.77);
    const lit=hash(id*1.29+x*2.1,floor+31)>.48;
    // Industrial and retail rear doors alternate with skylit sections;
    // housing, offices and malls get real translucent window bays.
    if(kind==='factory'&&floor===0&&i%3===0){
     block('#59747a',x,.85,rear-.057,width,1.05,.09,'metal');
     for(let k=0;k<4;k++)block('#a6b8b5',x,.47+k*.23,rear-.11,width*.94,.026,.029,'metal');
    }else{
     block('#e3e8e0',x,yy,rear-.04,width+.07,.49,.072,'stone');
     block(rearGlass,x,yy,rear-.086,width,.42,.045,'glass');
     block('#a6cbd0',x,yy+.15,rear-.113,width*.80,.035,.022,'glass');
     block('#d8e2df',x,yy,rear-.117,.022,.44,.018,'metal');
     if(lit)block(kind==='pub'?'#de9ee8':'#ffddaf',x,yy-.09,rear-.120,
      width*.68,.20,.012,'glass',true);
    }
   }
  }
  // Local side-facing glazing: use d along the depth rather than w.
  // This gives true perpendicular panes when any plot is rotated.
  const sideRows=kind==='office'?Math.max(3,Math.floor(H/.63)):
   kind==='home'?tier:kind==='mall'?tier:1;
  const sideBays=Math.max(2,Math.min(5,Math.floor(depth/.62)+1));
  for(const sign of [-1,1]){
   const sideX=cx+sign*(mainW*.5+.044);
   const wallColor=kind==='pub'?'#7b78a2':kind==='factory'?'#95a9a7':
    kind==='home'?'#b69f86':accent;
   block(wallColor,sideX,H*.54+.17,cz,.095,H*.72,depth*.81,
    kind==='home'?'wood':'metal');
   block('#e5e9df',sideX,H+.21,cz,.16,.095,depth+.08,'stone');
   for(let i=0;i<sideBays;i++){
    const v=cz-depth*.39+(i+.5)*depth*.78/sideBays;
    for(let level=0;level<sideRows;level++){
     const yy=kind==='office'?.55+level*.63:.76+level*.70;
     if(yy>H+.05)continue;
     if(kind==='factory'&&i%2===0){
      block('#536e7a',sideX+sign*.054,.78,v,.065,.73,
       Math.min(.39,depth*.62/sideBays),'metal');
      continue;
     }
     const width=Math.min(.48,depth*.70/sideBays);
     block('#dae4df',sideX+sign*.06,yy,v,.075,.44,width+.075,'stone');
     block(kind==='pub'?'#4f5783':'#356779',sideX+sign*.110,yy,v,
       .05,.36,width,'glass');
     if(hash(v+id*.67,level+sign*17)>.46)
      block(kind==='pub'?'#d49ee8':'#ffe0ab',
       sideX+sign*.147,yy-.09,v,.014,.18,width*.68,'glass',true);
    }
   }
   // Side entrance recess, shadow-casting canopy, and facade fins.
   block(accent,sideX+sign*.065,.43,cz,.16,.12,depth*.83,'stone');
   if(kind==='home'&&tier>=2||kind==='restaurant'||kind==='pub'){
    block(kind==='pub'?'#8b79ac':'#bba88c',
      sideX+sign*.12,1.23,cz,.23,.09,Math.min(1.14,depth*.66),
      kind==='pub'?'metal':'wood');
   }
  }
  // The outer wing walls, not the inner central core, are the visible sides
  // of larger buildings. Wrap these extensions in matching material language.
  if(tier>=2){
   const wingWidth=Math.min(span*.22,Math.max(.76,s*.47));
   for(const sign of [-1,1]){
    const wingX=cx+sign*(span*.43-wingWidth*.40);
    const wingSide=wingX+sign*(wingWidth*.5+.055);
    const wingBack=cz-depth*.065-depth*.41-.055;
    const trim=kind==='home'?'#c4aa88':kind==='pub'?'#9780b4':
     kind==='factory'?'#95aaa9':'#9bbac0';
    block(trim,wingSide,H*.42+.18,cz-depth*.065,.10,H*.58,depth*.64,
      kind==='home'?'wood':'metal');
    block('#e0e5de',wingSide,H*.73+.35,cz-depth*.065,.15,.09,depth*.77,'stone');
    for(let i=0;i<2;i++){
     const v=cz-depth*.34+i*depth*.39;
     const y=H*.46+.17;
     block('#355f70',wingSide+sign*.062,y,v,.05,.40,depth*.21,'glass');
     block(kind==='pub'?'#ce97e5':'#ffd8a8',
      wingSide+sign*.097,y-.075,v,.014,.20,depth*.15,'glass',true);
    }
    block(accent,wingX,H*.44+.18,wingBack,wingWidth*.85,H*.58,.08,'stone');
    block('#376a79',wingX,.77,wingBack-.052,wingWidth*.49,.45,.045,'glass');
    if(kind==='home')block('#bb9976',wingX,1.24,wingBack-.075,
      wingWidth*.65,.07,.17,'wood');
    if(kind==='pub')block('#c99de8',wingX,H*.65,wingBack-.084,
      wingWidth*.61,.13,.045,'glass',true);
   }
  }
  // Tier-specific back detailing makes the back as recognisable as the front.
  if(kind==='home'){
   if(tier>=2){
    block('#c7b89f',cx+mainW*.16,1.31,rear-.20,mainW*.36,.13,.38,'wood');
    block('#97b5b8',cx+mainW*.16,1.66,rear-.31,mainW*.34,.055,.04,'glass');
    for(const sign of [-1,1])block('#e4e1d8',
     cx+mainW*.16+sign*mainW*.16,1.46,rear-.29,.04,.30,.04,'metal');
   }
   if(tier===3){
    block('#ac987f',cx-mainW*.27,H*.54,rear-.16,mainW*.18,H*.62,.12,'wood');
    block('#6c9eaf',cx-mainW*.17,H*.78,rear-.075,mainW*.20,.56,.075,'glass');
    block('#ffdbac',cx-mainW*.17,H*.77,rear-.122,mainW*.13,.22,.013,'glass',true);
   }
  }else if(kind==='mall'){
   block('#759d9e',cx,H*.73,rear-.14,mainW*.50,.12,.15,'metal');
   block('#ffdcaa',cx,H*.71,rear-.22,mainW*.39,.045,.013,'glass',true);
   block('#dce6e0',cx,H+.47,cz-depth*.20,mainW*.45,.075,depth*.30,'stone');
   if(tier>=2)for(const sign of [-1,1])
    block('#b5d2d6',cx+sign*mainW*.32,1.10,rear-.11,mainW*.13,.70,.045,'glass');
  }else if(kind==='office'){
   // Wrap the glass curtain wall around the whole tower perimeter.
   for(let level=0;level<windowBands;level++){
    const yy=.55+level*.63;
    if(yy>H+.10)continue;
    block('#b2d3d7',cx,yy+.25,rear-.16,mainW*.95,.065,.09,'metal');
   }
  }else if(kind==='factory'){
   const doors=Math.min(10,Math.max(2,Math.ceil(mainW/4)));
   for(let i=0;i<doors;i++){
    const x=cx-mainW*.42+(i+.5)*mainW*.84/doors;
    block('#566a71',x,.67,rear-.19,Math.min(1.25,mainW*.66/doors),
      .77,.06,'metal');
    block('#c8d3ce',x,1.12,rear-.13,Math.min(1.31,mainW*.72/doors),.08,.14,'stone');
   }
  }else if(kind==='pub'){
   for(let x=cx-mainW*.41;x<cx+mainW*.41;x+=1.47){
    block(x<cx?'#bc88d6':'#75bfd1',x,1.31,rear-.16,
     .12,.83,.11,'glass',true);
   }
   block('#9b86bd',cx,H+.49,rear-.12,mainW*.71,.15,.16,'metal',true);
  }else if(kind==='restaurant'){
   block('#bb906d',cx,1.20,rear-.21,mainW*.72,.12,.40,'wood');
   block('#ffdfa9',cx,1.15,rear-.26,mainW*.64,.045,.05,'glass',true);
   block('#bfac8a',cx,.28,rear-.23,mainW*.66,.08,.36,'wood');
  }else{
   block('#ab865e',cx,1.29,rear-.21,mainW*.78,.13,.24,'wood');
   block('#dbe4dc',cx,1.20,rear-.23,mainW*.63,.05,.09,'metal');
  }
  // Parking perimeter lights: a few lamps along the frontage edge, away
  // from both end gates and outside the two rows of parked cars.
  // Each lamp is batched; no new dynamic light sources or path collision.
  if(W>=16){
   const spacing=Math.max(5,Math.min(9,W/8));
   for(let u=3;u<W-3;u+=spacing)lantern(u,t.plotHeight-.16,'#ffe8b8',1.5);
  }
  const lamps=Math.min(15,Math.max(2,Math.floor(W/7)));
  for(let i=0;i<lamps;i++){
   const x=.75+(W-1.5)*(i+.5)/lamps;
   if(Math.abs(x-cx)<1)continue;
   lantern(x,s*.94,kind==='pub'?'#e6a4e6':'#ffe5b0',.80+tier*.11);
  }
 }
 makeBuildings(state,CATALOG,KINDS){this.disposeGroup(this.buildingGroup);const b=new Batch();for(const building of state.buildings.values())this.building(b,building,CATALOG,KINDS);this.buildingGroup.add(b.build());this.lastNightVisibility=-1;}

 createCars(){
  this.carModels=VEHICLE_TYPES.map((_,i)=>carGeometries(i));
  this.carSets=new Map();this.carDummy=new THREE.Object3D();this.carLightDummy=new THREE.Object3D();this.carTint=new THREE.Color();
 }
 ensureCarSet(kind,needed){
  const old=this.carSets.get(kind);if(old&&old.capacity>=needed)return old;
  if(old){for(const mesh of [old.body,old.trim,old.headlights,old.taillights]){this.scene.remove(mesh);mesh.material.dispose();}}
  const capacity=Math.max(32,2**Math.ceil(Math.log2(Math.max(1,needed)))),geometry=this.carModels[kind];
  const body=new THREE.InstancedMesh(geometry.body,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:kind===5||kind===6?.25:.4,metalness:.15}),capacity);
  const trim=new THREE.InstancedMesh(geometry.trim,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.13}),capacity);
  // Two very small instanced light surfaces per car. No dynamic point lights:
  // works on iPad and remains readable from an isometric camera.
  const lightMesh=color=>new THREE.InstancedMesh(BOX,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,toneMapped:false}),capacity*2);
  const headlights=lightMesh('#ffeac0'),taillights=lightMesh('#ff6059');
  for(const mesh of [headlights,taillights]){mesh.frustumCulled=false;mesh.renderOrder=3;mesh.count=0;mesh.visible=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);}
  for(const mesh of [body,trim]){mesh.castShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;this.scene.add(mesh);}
  const created={capacity,body,trim,headlights,taillights};this.carSets.set(kind,created);this.lastNightVisibility=-1;return created;
 }
 cars(state,vehiclePosition,CATALOG){
  const groups=VEHICLE_TYPES.map(()=>[]);
  const add=(x,z,angle,c,id,fallback)=>{const kind=carClassFor(c,id);groups[kind].push({x,z,angle,color:carPaintFor(c,id,kind,fallback)});};
  for(const v of state.vehicles.values()){
   if(!['driving','stuck','parking_in','parking_out'].includes(v.phase)&&!(v.phase==='departing'&&v.lotPath))continue;
   const p=vehiclePosition(v);if(p)add(p.x-.5,p.y-.5,Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle)),state.citizens.get(v.citizenId),v.citizenId??v.id,v.color);
  }
  for(const b of state.buildings.values())for(const id of b.parked){
   if(this.parking.parkingIsMoving(id))continue;
   const index=b.parkingSlots.indexOf(id),p=this.parking.parkingSlotPose(b,index);
   if(p)add(p.x-.5,p.y-.5,Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle)),state.citizens.get(id),id,this.parking.citizenCarColor(id));
  }
  for(let kind=0;kind<groups.length;kind++){
   const items=groups[kind],old=this.carSets.get(kind);
   if(!items.length){if(old){old.body.count=0;old.trim.count=0;old.headlights.count=0;old.taillights.count=0;}continue;}
   const set=this.ensureCarSet(kind,items.length);
   for(let i=0;i<items.length;i++){
    const car=items[i];this.carDummy.position.set(car.x,0,car.z);this.carDummy.rotation.set(0,-car.angle,0);
    this.carDummy.scale.set(1,1,1);this.carDummy.updateMatrix();
    set.body.setMatrixAt(i,this.carDummy.matrix);set.trim.setMatrixAt(i,this.carDummy.matrix);
    set.body.setColorAt(i,this.carTint.set(car.color));
    const [length,width]=VEHICLE_STYLES[kind],cos=Math.cos(car.angle),sin=Math.sin(car.angle);
    for(const sign of [-1,1]){
     // Car model faces +X in local space; side offsets rotate with the body.
     const side=sign*width*.33;
     for(const [mesh,localX,height] of [[set.headlights,length*.5+.015,.184],[set.taillights,-length*.5-.015,.165]]){
      this.carLightDummy.position.set(car.x+cos*localX-sin*side,height,car.z+sin*localX+cos*side);
      this.carLightDummy.rotation.set(0,-car.angle,0);
      this.carLightDummy.scale.set(.020,.040,.045);
      this.carLightDummy.updateMatrix();
      mesh.setMatrixAt(i*2+(sign+1)/2,this.carLightDummy.matrix);
     }
    }
   }
   for(const mesh of [set.body,set.trim]){mesh.count=items.length;mesh.instanceMatrix.needsUpdate=true;}
   for(const mesh of [set.headlights,set.taillights]){mesh.count=items.length*2;mesh.instanceMatrix.needsUpdate=true;}
   if(set.body.instanceColor)set.body.instanceColor.needsUpdate=true;
  }
 }
 createRoute(){this.routeLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#fff1a0',transparent:true,opacity:.95}));this.routeLine.renderOrder=4;this.scene.add(this.routeLine);}
 preview(state,hover,drag,tool,selected,CATALOG,ROADS,junction,checkBuilding){const key=[tool,hover?.x,hover?.y,drag?.cells?.join(','),selected?.kind,selected?.id,state.version,state.buildings.size].join(':');if(key===this.previewKey)return;this.previewKey=key;this.disposeGroup(this.previewGroup);const boxes=[];if(hover&&CATALOG[tool]){const t=CATALOG[tool],check=checkBuilding(tool,hover.x,hover.y),ok=!check.error,ghost={key:tool,id:-1,x:hover.x,y:hover.y,rotation:check.rotation||0},bounds=this.parking.buildingBounds(ghost);boxes.push([hover.x+bounds.w/2,hover.y+bounds.h/2,bounds.w,bounds.h,ok?'#d9f788':'#ff947f']);const b=new Batch();this.building(b,ghost,CATALOG);const model=b.build(false);model.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.52;}});this.previewGroup.add(model);}else if(hover&&ROADS[tool]){for(const i of drag?.cells||[hover.y*300+hover.x])boxes.push([i%300,Math.floor(i/300),ROADS[tool].width,ROADS[tool].width,'#ffe597']);}
 if(selected?.kind==='building'){const b=state.buildings.get(selected.id);if(b){const {w,h}=this.parking.buildingBounds(b);boxes.push([b.x+w/2,b.y+h/2,w,h,'#fff1a1']);}}
 if(selected?.kind==='road'&&junction(selected.id)>=3)boxes.push([selected.id%300,Math.floor(selected.id/300),2.4,2.4,'#fff1a1']);
 for(const [x,z,w,d,color]of boxes){const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(x,.14,z);this.previewGroup.add(plane);const points=[new THREE.Vector3(x-w/2,.17,z-d/2),new THREE.Vector3(x+w/2,.17,z-d/2),new THREE.Vector3(x+w/2,.17,z+d/2),new THREE.Vector3(x-w/2,.17,z+d/2),new THREE.Vector3(x-w/2,.17,z-d/2)];this.previewGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color})));}
 }
 render({state,cam,hover,drag,tool,selected,heat,debug,follow,CATALOG,ROADS,KINDS,junction,vehiclePosition,signalColor,checkBuilding,parking}){this.parking=parking;this.updateCamera(cam);if(this.city!==state.city||this.lastState!==state){this.terrain(state.city);this.lastState=state;this.roadKey='';this.buildKey='';}
 const roadKey=[state.version,state.roads.size,heat].join(':');if(roadKey!==this.roadKey){this.roadKey=roadKey;this.makeRoads(state,ROADS,junction);}const buildKey=[state.buildings.size,...state.buildings.keys()].join(':');if(buildKey!==this.buildKey){this.buildKey=buildKey;this.makeBuildings(state,CATALOG,KINDS);}this.trees(state,cam);this.cars(state,vehiclePosition,CATALOG);this.preview(state,hover,drag,tool,selected,CATALOG,ROADS,junction,checkBuilding);
 this.updateSignals(signalColor);this.updateWeatherLight(state);
 if(heat){if(!this.heatGroup){this.heatGroup=new THREE.Group();this.scene.add(this.heatGroup);}if(!this.heatAt||state.time-this.heatAt>1){this.heatAt=state.time;this.disposeGroup(this.heatGroup);const b=new Batch();for(const[i,r]of state.roads){if(r.load<.1&&r.wait<.1)continue;const color=r.wait>3?'#ce6156':r.wait>.5?'#eda858':'#92c77b';b.box(color,i%300,.13,Math.floor(i/300),ROADS[r.type].width*.92,.018,.9);}this.heatGroup.add(b.build(false));}this.heatGroup.visible=true;}else if(this.heatGroup)this.heatGroup.visible=false;
 const v=state.vehicles.get(follow);this.routeLine.visible=!!v;if(v){const points=v.path.slice(v.pos).map(i=>new THREE.Vector3(i%300,.2,Math.floor(i/300)));this.routeLine.geometry.dispose();this.routeLine.geometry=new THREE.BufferGeometry().setFromPoints(points);}
 if(debug||ROADS[tool]||CATALOG[tool]){if(!this.grid){this.grid=new THREE.GridHelper(80,80,'#dfefba','#d0e0a0');this.grid.material.transparent=true;this.grid.material.opacity=.2;this.grid.position.y=.125;this.scene.add(this.grid);}this.grid.visible=true;this.grid.position.x=Math.round(cam.x);this.grid.position.z=Math.round(cam.y);}else if(this.grid)this.grid.visible=false;
 this.renderer.render(this.scene,this.camera);
 }
}

