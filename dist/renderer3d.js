import * as THREE from './vendor/three.module.js';

const BOX=new THREE.BoxGeometry(1,1,1),CYL=new THREE.CylinderGeometry(1,1,1,10),CYL_SMOOTH=new THREE.CylinderGeometry(1,1,1,32),CONE=new THREE.ConeGeometry(1,1,6),LEAF=new THREE.IcosahedronGeometry(1,1),BALL=new THREE.SphereGeometry(1,12,8);
// A closed roof prism avoids intersecting roof planes at rotated plots.
const PITCHED_ROOF=(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.5,-.5,0,.5,-.5,1,0,.5,0,-.5,.5,0,.5,.5,1,0],3));g.setIndex([0,1,2,3,5,4,0,2,5,0,5,3,2,1,4,2,4,5,0,3,4,0,4,1]);const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return flat;})();
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
 disposeGroup(group){for(const o of [...group.children]){group.remove(o);o.traverse(x=>{if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];for(const m of ms)m.dispose();}if(x.geometry&&!([BOX,CYL,CYL_SMOOTH,CONE,LEAF,BALL,PITCHED_ROOF].includes(x.geometry)))x.geometry.dispose();});}}
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
   if(role==='asphalt'){intensity=.18;tint=base||'#56666a';}
   else if(role==='night-asphalt'){intensity=.18;tint=base||'#56666a';}
   else if(role==='marking'||role==='road-marking'||role==='night-marking'){
    // Road paint reflects ambient light; it should not read as neon at night.
    intensity=.025;tint=base||'#f4edd8';
    mesh.material.color.set(tint).multiplyScalar(1-night*.42);
   }
   else if(role==='lot-base'||role==='night-lot-base'){intensity=.08;tint=base||'#bdc6ae';}
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
    mesh.material.opacity=.78*glow;mesh.material.emissiveIntensity=.70+glow*.55;
   });
   if(this.streetGlow)this.streetGlow.material.opacity=.24*glow;
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
 updateCamera(cam){this.cam=cam;const half=this.h/(2*26*cam.z),aspect=this.w/this.h;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;const angle=cam.angle??Math.PI*.2,elevation=Math.max(Math.PI*22/180,Math.min(Math.PI*78/180,cam.elevation??Math.atan2(86,90))),radius=Math.hypot(90,86),horizontal=radius*Math.cos(elevation);this.camera.position.set(cam.x+Math.sin(angle)*horizontal,radius*Math.sin(elevation),cam.y+Math.cos(angle)*horizontal);this.camera.lookAt(cam.x,0,cam.y);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.light.position.set(cam.x-45,90,cam.y-35);this.light.target.position.set(cam.x,0,cam.y);this.light.target.updateMatrixWorld();}
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
 tree(batch,x,z,scale=1,kind='shade'){
 // Historic building renderers pass a boolean palm flag; keep it compatible.
 if(kind===true)kind='palm';else if(kind===false)kind='shade';
 const tone=hash(x+7,z+3),dark=tone>.55?'#477e53':'#568e5b',bright=tone>.55?'#6b9d5a':'#75a961';
 if(kind==='palm'){
  batch.add(CYL,'#9d8560',x,.72*scale,z,.07*scale,1.45*scale,.07*scale,0,0,-.08);
  for(let n=0;n<7;n++){const a=n/7*TAU;batch.add(LEAF,n%2?'#438b60':'#64a765',x+Math.cos(a)*.38*scale,1.51*scale,z+Math.sin(a)*.38*scale,.56*scale,.09*scale,.16*scale,0,-a,Math.cos(a)*.2);}
  batch.add(BALL,'#759e46',x,1.52*scale,z,.14*scale,.17*scale,.14*scale);return;
 }
 if(kind==='pine'){
  batch.add(CYL,'#785f48',x,.52*scale,z,.072*scale,1.04*scale,.072*scale);
  for(let i=0;i<3;i++)batch.add(CONE,i%2?'#477452':'#356b4b',x,(.65+i*.34)*scale,z,(.46-i*.09)*scale,(.77-i*.11)*scale,(.46-i*.09)*scale);
  return;
 }
 if(kind==='shrub'){
  batch.add(LEAF,'#39734b',x,.21*scale,z,.40*scale,.25*scale,.35*scale);
  batch.add(LEAF,bright,x-.23*scale,.26*scale,z-.08*scale,.29*scale,.30*scale,.28*scale);
  batch.add(LEAF,'#81ac69',x+.18*scale,.24*scale,z+.1*scale,.31*scale,.27*scale,.29*scale);return;
 }
 if(kind==='banyan'){
  batch.add(CYL,'#826849',x,.51*scale,z,.12*scale,1.02*scale,.12*scale);
  batch.add(LEAF,dark,x,.98*scale,z,.86*scale,.37*scale,.65*scale);
  batch.add(LEAF,bright,x-.43*scale,1.17*scale,z-.04*scale,.53*scale,.34*scale,.55*scale);
  batch.add(LEAF,'#629b61',x+.40*scale,1.13*scale,z+.14*scale,.53*scale,.36*scale,.53*scale);return;
 }
 batch.add(CYL,'#947653',x,.37*scale,z,.075*scale,.74*scale,.075*scale);
 const pink=kind==='flower';
 batch.add(LEAF,pink?'#dc8ca3':dark,x,.89*scale,z,.52*scale,.55*scale,.50*scale,0,hash(x,z)*3,0);
 batch.add(LEAF,pink?'#efaab7':bright,x-.18*scale,1.18*scale,z-.12*scale,.37*scale,.37*scale,.36*scale);
 if(pink)batch.add(LEAF,'#f4c5cb',x+.25*scale,1.09*scale,z+.14*scale,.31*scale,.31*scale,.33*scale);
 }
 trees(state,cam){
 const cellX=Math.floor(cam.x/18),cellZ=Math.floor(cam.y/18);
 const key=[cellX,cellZ,state.version,this.buildKey,state.city,state.landscapeVersion||0].join(':');
 if(key===this.treeKey)return;this.treeKey=key;this.disposeGroup(this.treeGroup);
 const b=new Batch(),span=62,hidden=new Set(state.hiddenAutoTrees||[]);
 const clear=(x,z)=>{
  const ix=Math.floor(x),iz=Math.floor(z);
  if(ix<1||iz<1||ix>=299||iz>=299)return false;
  if(state.city==='phuket'&&x<this.coast(z)+2.8||state.city==='bangkok'&&Math.abs(x-(125+Math.sin(z*.047)*5))<6)return false;
  for(let yy=iz-1;yy<=iz+1;yy++)for(let xx=ix-1;xx<=ix+1;xx++){const index=yy*300+xx;if(state.footprint[index]>=0||state.buildGrid[index]>=0)return false;}
  return true;
 };
 const types=['shade','banyan','flower','pine','shrub','palm'];
 for(let z=cellZ*18-span;z<cellZ*18+span;z+=2.7)for(let x=cellX*18-span;x<cellX*18+span;x+=2.7){
  if(hash(x,z)<.70)continue;
  const tx=x+hash(z,x)*1.8,tz=z+hash(x+7,z)*1.8,ix=Math.floor(tx),iz=Math.floor(tz);
  if(!clear(tx,tz)||hidden.has(iz*300+ix))continue;
  const variety=hash(tx+12,tz+3),kind=state.city==='phuket'&&variety>.56?'palm':types[Math.min(types.length-1,Math.floor(variety*types.length))];
  this.tree(b,tx,tz,(kind==='shrub'?.46:.67)+hash(tx,tz)*(kind==='banyan'?.75:.48),kind);
 }
 for(const t of state.plantedTrees||[]){
  if(Math.abs(t.x-cellX*18)>span+3||Math.abs(t.y-cellZ*18)>span+3||!clear(t.x,t.y))continue;
  const scale=t.kind==='shrub'?.72:t.kind==='banyan'?1.30:t.kind==='palm'?1.12:1.04;
  this.tree(b,t.x,t.y,scale,t.kind);
 }
 this.treeGroup.add(b.build());
 }
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
 const blockedAccess=[];
 for(const building of state.buildings.values())for(const access of building.access||[])blockedAccess.push([access.x-.5,access.y-.5]);
 const lampConflicts=(lx,lz)=>blockedAccess.some(([ax,az])=>Math.hypot(lx-ax,lz-az)<1.45);
 for(const [node,road] of state.roads){
  if(spots.length>=2500||road.links.size!==2||junction(node)!==2)continue;
  const x=node%300,z=Math.floor(node/300),links=[...road.links],a=links[0],b=links[1];
  const horiz=Math.floor(a/300)===z&&Math.floor(b/300)===z&&(a-node)*(b-node)<0;
  const vert=a%300===x&&b%300===x&&(Math.floor(a/300)-z)*(Math.floor(b/300)-z)<0;
  if(!horiz&&!vert||horiz&&x%9!==0||vert&&z%9!==0)continue;
  const baseSign=(Math.floor(x/9)+Math.floor(z/9))%2?1:-1;
  // Keep street lamps visually in the carriageway / verge band, not deep on
  // the sidewalk, and never let them block building access points.
  const offset=Math.max(.28,(ROADS[road.type]?.visualWidth||1.55)/2-.06);
  let chosen=null;
  for(const sign of [baseSign,-baseSign]){
   const px=x+(vert?sign*offset:0),pz=z+(horiz?sign*offset:0);
   const hx=px-(vert?sign*.31:0),hz=pz-(horiz?sign*.31:0);
   if(lampConflicts(px,pz)||lampConflicts(hx,hz))continue;
   chosen={px,pz,hx,hz};break;
  }
  if(!chosen)continue;
  const {px,pz,hx,hz}=chosen;
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
 parkingLot(batch,b){for(const rect of this.parking.parkingVisuals(b)){const p=this.parking.lotPoint(b,rect.u,rect.v),asphalt=['#515f62','#58666a','#465e65'].includes(rect.color),marking=['#e9e6cc','#c5d2c2','#bbc9b9','#94d9aa','#f3ca88','#e5e6d0','#f1ca85','#86d1dc'].includes(rect.color),ground=['#bdc6ae','#9baaa0','#96af8f'].includes(rect.color);const y=ground?.025:asphalt?.065:marking?.102:.085;batch.box(rect.color,p.x-.5,y,p.y-.5,rect.w,.012,rect.h,-(b.rotation||0)*Math.PI/2,b.id,false,asphalt?'night-asphalt':marking?'night-marking':'night-lot-base');}}
 building(batch,b,CATALOG,KINDS){
  // Visual-only architecture v5: every component remains within its plot.
  if(this.parking)this.parkingLot(batch,b);
  const t=CATALOG[b.key],id=b.id,s=t.size,W=t.plotWidth||s+2,isHotel=t.kind==='hotel',kind=isHotel?'home':t.kind;
  const tier=b.key==='home_dual'?2:b.key.endsWith('_large')?3:b.key.endsWith('_medium')?2:1;
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
   const p=point(u,v);
   batch.add(PITCHED_ROOF,color,p.x-.5,base,p.y-.5,w,rise,d,0,turn,0,id,false,'stone');
   block('#d1bba0',u,base-.025,v,w+.10,.075,d+.10,'wood');
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
  // ART-DIRECTED CITY COLLECTION — distinct sculpted assets for every playable
  // home (except preserved home_grand), office, factory, shop, restaurant, mall,
  // park, pub and hotel tier. All parts live in a parking-first plot; no traffic
  // or capacity calculation is touched by visual model building.
  if((t.plannedParking&&b.key!=='pub_small')||t.kind==='hotel'){
   const hotel=t.kind==='hotel',level=hotel?(b.key.endsWith('large')?3:b.key.endsWith('medium')?2:1):(t.modelTier||1);
   const W=t.plotWidth,baseV=hotel?0:t.parkingZoneDepth;
   const availableDepth=hotel?t.size:t.buildingZoneDepth;
   const u=W/2,buildingW=Math.max(1.55,Math.min(W-2.18,1.8+level*1.6));
   const d=Math.max(.88,Math.min(availableDepth-(hotel?.48:1.48),availableDepth>=6?4.48:2.12));
   const v=baseV+(hotel?availableDepth/2:.43+d/2),face=v+d/2;
   const family=hotel?'hotel':t.kind,nightColor=family==='pub'?'#e7a0f2':'#ffe0a9';
   const palette={
    home:['#ebdfd1','#dcd9d0','#e5e2d9'],office:['#cbdade','#c6d9df','#d7e4e7'],
    factory:['#c5c6bd','#bfc9c7','#b4c7c9'],shop:['#edd8b9','#d9dbd1','#d3e0d8'],
    restaurant:['#dab59a','#d9bfa5','#e5cebc'],mall:['#dae5dd','#c8dfde','#e0e7e4'],
    park:['#83b584','#8ab98d','#7dae85'],pub:['#716071','#545568','#42435e'],
    hotel:['#e1d0ba','#e8dac7','#e4ded7']
   };
   const trim={home:'#ad835e',office:'#5d919e',factory:'#708b8e',shop:'#b99567',
    restaurant:'#ab795d',mall:'#4a9099',park:'#ecd7ac',pub:'#b781dc',hotel:'#b49567'}[family];
   const stone=palette[family][level-1],ink=family==='pub'?'#363247':'#3e5057';
   const cover=(x,z,w,h)=>block('#bfbeb1',x,.10,z,w,.10,h,'stone');
   const roofFlat=(x,z,w,depth,y,c='#575b5d')=>{
    block('#e5ded1',x,y,z,w+.23,.14,depth+.20,'stone');
    block(c,x,y+.10,z,w+.14,.075,depth+.12,'metal');
    for(const xx of [x-w*.44,x+w*.44])block('#e5ded1',xx,y+.20,z,.085,.25,depth+.17,'stone');
   };
   const windowFront=(x,y,z,ww=.48,hh=.55,color='#527f91')=>{
    block('#e6d8c6',x,y,z,ww+.13,hh+.13,.09,'stone');
    block(color,x,y,z+.06,ww,hh,.052,'glass');
    block('#fbe0ae',x,y-.08,z+.09,ww*.77,hh*.44,.014,'glass',true);
    block('#cbdadd',x,y,z+.10,.025,hh*.97,.019,'metal');
    block('#e5d2ae',x,y-hh/2-.09,z+.09,ww+.19,.077,.15,'stone');
   };
   const glassBand=(x,y,z,ww,hh,pieces=4,c='#57899a')=>{
    block(c,x,y,z,ww,hh,.055,'glass');
    const n=Math.max(2,pieces);
    for(let i=0;i<=n;i++){
     const xx=x-ww/2+ww*i/n;
     block('#d9e7e6',xx,y,z+.044,.031,hh+.05,.026,'metal');
    }
    for(let i=0;i<n;i++){
     const xx=x-ww/2+(i+.5)*ww/n;
     if((i+level)%3!==1)block('#ffe3b4',xx,y-.10,z+.045,ww/n*.56,hh*.32,.016,'glass',true);
    }
   };
   const planter=(x,z,r=.33)=>{
    block('#bea78b',x,.28,z,r*1.10,.31,r*.83,'stone');
    block('#557d4e',x,.52,z,r*.95,.23,r*.95,'stone');
    block('#8fa95f',x,.71,z,r*.64,.16,r*.68,'stone');
   };
   const table=(x,z,umb=false)=>{
    pole('#7a5b48',x,.48,z,.042,.55,'wood');
    pole('#bf9c72',x,.76,z,.31,.06,'wood');
    for(const side of[-1,1]){
     const xx=x+side*.36;
     block('#987257',xx,.48,z,.25,.065,.27,'wood');
     block('#655348',xx,.30,z,.034,.29,.038,'metal');
    }
    if(umb){
     pole('#6b665b',x,1.23,z,.021,.92,'metal');
     const p=point(x,z);batch.add(CONE,'#b28e78',p.x-.5,1.64,p.y-.5,.54,.32,.54,0,turn,0,id,false,'wood');
    }else pole('#ffdb9c',x,.86,z,.045,.10,'glass',true);
   };
   const bulbString=(x1,z1,x2,z2,y=1.55,n=5)=>{
    for(let k=0;k<n;k++){
     const a=(k+.5)/n,x=x1+(x2-x1)*a,z=z1+(z2-z1)*a;
     block('#795c49',x,y+.08,z,.05,.03,.052,'wood');
     block('#ffe4aa',x,y,z,.105,.13,.11,'glass',true);
    }
   };
   const glyph={A:['010','101','111','101','101'],B:['110','101','110','101','110'],
    C:['111','100','100','100','111'],D:['110','101','101','101','110'],
    E:['111','100','110','100','111'],F:['111','100','110','100','100'],
    G:['111','100','101','101','111'],H:['101','101','111','101','101'],
    I:['111','010','010','010','111'],K:['101','101','110','101','101'],
    L:['100','100','100','100','111'],M:['101','111','111','101','101'],
    N:['101','111','111','111','101'],O:['111','101','101','101','111'],
    P:['110','101','110','100','100'],R:['110','101','110','101','101'],
    S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    U:['101','101','101','101','111'],W:['101','101','111','111','101'],
    Y:['101','101','010','010','010']};
   const sign=(word,x,y,z,width,bg='#35474c',fg='#ffe0ac')=>{
    const clean=word.toUpperCase().replace(/[^A-Z]/g,''),unit=Math.min(.125,width/(4*clean.length+1));
    const sw=(4*clean.length+1)*unit;
    block(bg,x,y,z,sw+.15,unit*7.3,.13,'metal');
    block('#c1a37c',x,y+unit*3.8,z+.075,sw+.18,.04,.042,'metal');
    for(let i=0;i<clean.length;i++){
     for(let a=0;a<5;a++)for(let col=0;col<3;col++)
      if(glyph[clean[i]]?.[a][col]==='1'){
       const xx=x-sw/2+(i*4+col+1.5)*unit,yy=y+(2-a)*unit;
       block(fg,xx,yy,z+.078,unit*.75,unit*.78,.027,'glass',true);
      }
    }
   };
   const entry=(x,z,wide=1)=>{
    block('#ddd1c4',x,.94,z,wide+.20,1.42,.13,'stone');
    block('#3f5057',x,.90,z+.10,wide,1.26,.065,'wood');
    for(const q of[-1,1]){
     block('#a8d0cd',x+q*wide*.23,1.08,z+.145,wide*.34,.53,.027,'glass');
     block('#ffe1ad',x+q*wide*.23,1.03,z+.164,wide*.23,.23,.011,'glass',true);
    }
    block(trim,x,1.61,z+.23,wide+.59,.13,.51,'stone');
    block('#e8dbbd',x,.17,z+.33,wide+.44,.075,.43,'stone');
   };
   // Lightly planted, fully covered architecture half with clear entry streets.
   if(!hotel){
    const landEnd=Math.min(t.frontageV-.39,baseV+availableDepth-.22);
    const length=Math.max(.38,landEnd-baseV);
    cover(u,baseV+length/2,W-1.80,length);
    block('#8ba985',u,.17,baseV+length/2,W-1.95,.034,length-.10,'stone');
    for(const side of[-1,1])for(let n=0;n<2;n++){
     const x=u+side*(W*.5-.94),z=baseV+.67+n*Math.max(.60,(length-1.18));
     planter(x,z,.21);
    }
   }
   if(family==='park'){
    // Four-way promenade, illuminated fountain and ascending pavilion; the
    // largest tier has a stepped pond and more shaded gazebos.
    const pw=W-2.0,parkStart=baseV+.34,parkDepth=Math.min(availableDepth-.77,availableDepth>=6?5.10:2.75);
    block('#79aa7b',u,.24,parkStart+parkDepth/2,pw,.11,parkDepth,'stone');
    block('#e6d8bc',u,.29,parkStart+parkDepth/2,pw-.10,.042,.26,'stone');
    block('#e6d8bc',u,.29,parkStart+parkDepth/2,.28,.042,parkDepth-.10,'stone');
    const fountainV=parkStart+parkDepth*.48;
    pole('#ddd9ce',u,.38,fountainV,level===3?.75:.58,.25,'stone');
    pole('#4d97b0',u,.53,fountainV,level===3?.63:.46,.055,'water');
    pole('#e8e4d3',u,.78,fountainV,.11,.47,'stone');
    pole('#fff5c5',u,.99,fountainV,.052,.12,'glass',true);
    for(const side of[-1,1]){
     const x=u+side*(pw*.33),z=parkStart+parkDepth*.31;
     block('#c9ae86',x,.65,z,Math.min(1.10,pw*.26),.15,.90,'wood');
     block('#e4d5b5',x,1.35,z,Math.min(1.20,pw*.27),.13,1.01,'stone');
     for(const dx of[-.42,.42])pole('#c8b593',x+dx,.90,z,.036,.85,'wood');
     planted(x,parkStart+parkDepth*.80,.31+level*.05);
     planter(x,parkStart+parkDepth*.56,.32);
     lantern(x,parkStart+parkDepth*.12,'#ffe1b4',.86);
     if(level>=2){
      pole('#c3b597',x,1.45,z,.020,.17,'metal');
      block('#ffe7b2',x,1.57,z,.16,.15,.15,'glass',true);
     }
    }
    if(level===3){
     for(let j=0;j<6;j++){
      const x=u+Math.cos(j*Math.PI/3)*pw*.22,z=parkStart+parkDepth*.79+Math.sin(j*Math.PI/3)*.42;
      planter(x,z,.20);
     }
    }
    // PARK: each cardinal edge has its own purpose. The rear faces parking,
    // the front opens to the street, left is a planted walking trail and the
    // right is a quiet leisure terrace. No generic building walls are used.
    const gateZ=baseV+availableDepth-.56;
    const rearZ=parkStart+.17;
    for(const xx of [u-pw*.42,u+pw*.42]){
     pole('#c8ab83',xx,.79,gateZ,.065,1.11,'wood');
     block('#e4d8b7',xx,1.39,gateZ,.16,.11,.19,'stone');
     block('#ffe6ae',xx,1.47,gateZ,.12,.11,.12,'glass',true);
     block('#b69b73',xx,.23,rearZ,.38,.12,.34,'wood');
     block('#c7b48e',xx,.34,rearZ,.24,.12,.24,'stone');
    }
    block('#b6986b',u,1.51,gateZ,pw*.67,.15,.14,'wood');
    block('#e6d8bd',u,1.60,gateZ,pw*.44,.065,.17,'stone');
    for(let q=0;q<Math.min(10,level*3+2);q++){
     const x=u-pw*.33+(q+.5)*pw*.66/Math.min(10,level*3+2);
     block('#819e74',x,.20,gateZ-.21,.12,.25,.21,'stone');
    }
    // Two differently surfaced side paths and their landscaped boundaries.
    const walkN=level===1?4:level===2?7:11;
    for(let k=0;k<walkN;k++){
     const zz=parkStart+.29+(k+.5)*(parkDepth-.53)/walkN;
     const ll=u-pw*.44,rr=u+pw*.44;
     block('#cbb99b',ll,.28,zz,.35,.035,(parkDepth-.53)/walkN-.04,'stone');
     block('#e5dbc5',rr,.28,zz,.33,.035,(parkDepth-.53)/walkN-.04,'stone');
     if(k%2===0){
      block('#658457',ll-.35,.33,zz,.22,.27,.23,'stone');
      block('#86ad7b',rr+.32,.34,zz,.23,.33,.22,'stone');
     }
     if(k%3===0)block('#e7b6ba',rr+.34,.58,zz,.13,.11,.17,'stone');
    }
    // The back edge presents a real park side too: lattice arbor and bench.
    for(const xx of[u-pw*.27,u+pw*.27]){
     block('#a18262',xx,.53,rearZ+.12,.78,.09,.24,'wood');
     for(const offset of[-.26,.26])
      pole('#7e684f',xx+offset,.58,rearZ+.10,.024,.75,'wood');
     block('#e2d0ad',xx,1.00,rearZ+.14,.84,.065,.35,'wood');
    }
    // Small city garden gets a shallow herb maze; medium gets gazebo, large
    // a sheltered pavilion with terraces and spectator-style seating.
    if(level===1){
     for(let i=0;i<3;i++)for(const side of[-1,1]){
      const xx=u+side*(pw*.25),zz=parkStart+.55+i*.48;
      block('#c6ad8a',xx,.24,zz,.69,.10,.25,'wood');
      block(i%2?'#698657':'#72966c',xx,.36,zz,.61,.13,.18,'stone');
      for(let n=0;n<4;n++)block('#e7c0a2',xx-.22+n*.14,.45,zz,.073,.062,.06,'stone');
     }
    }else{
     const pavilionX=u+pw*.22,pavilionZ=parkStart+parkDepth*.73;
     const pavW=Math.min(1.54,pw*.27),pavD=level===3?1.44:1.08;
     block('#b8a280',pavilionX,.24,pavilionZ,pavW,.16,pavD,'wood');
     for(const sign of[-1,1])for(const dz of[-1,1])
      pole('#bba882',pavilionX+sign*pavW*.40,.84,pavilionZ+dz*pavD*.39,.043,1.13,'wood');
     block('#786c5b',pavilionX,1.53,pavilionZ,pavW+.17,.13,pavD+.16,'wood');
     const pp=point(pavilionX,pavilionZ);
     batch.add(PITCHED_ROOF,'#9d6356',pp.x-.5,1.61,pp.y-.5,pavW+.19,.44,pavD+.17,0,turn,0,id,false,'stone');
     for(let j=0;j<4;j++){
      const xx=pavilionX-pavW*.31+j*pavW*.21;
      block('#e5dcc1',xx,.34,pavilionZ,.20,.08,.25,'stone');
     }
     if(level===3){
      const amphX=u-pw*.24,amphZ=parkStart+parkDepth*.75;
      for(let i=0;i<4;i++){
       const width=Math.max(.65,2.25-i*.33);
       block(i%2?'#bda887':'#d4c3a2',amphX,.25+i*.16,amphZ+i*.23,width,.12,.36,'stone');
      }
      // Wooden deck and reading shelter at the western walk.
      block('#987b60',amphX,.27,parkStart+.51,2.00,.13,.82,'wood');
      for(const dx of[-.81,.81]){
       pole('#baa58b',amphX+dx,.90,parkStart+.51,.036,1.20,'wood');
       block('#ffe7bb',amphX+dx,1.55,parkStart+.51,.12,.15,.12,'glass',true);
      }
     }
    }
    return;
   }
   const upper=family==='office'?2.32+level*1.34:family==='hotel'?1.50+level*1.04:
    family==='mall'?1.75+level*.80:family==='pub'?1.65+level*.77:
    family==='factory'?1.25+level*.45:family==='home'?1.35+level*.58:1.40+level*.54;
   const maxTierW=Math.max(1.5,Math.min(buildingW, W-2.08));
   const mainD=d,top=upper+.24;
   // Categories now differ in actual massing, not just a changed paint color.
   if(family==='home'){
    const wing=level===2?maxTierW*.48:maxTierW*.74;
    const center=level===2?u-maxTierW*.24:u;
    block(stone,center,.24+upper/2,v,wing,upper,mainD,'stone');
    if(level===2){
     const sideX=u+maxTierW*.26;
     block('#e8e0d0',sideX,.24+(upper-.37)/2,v+.17,maxTierW*.46,upper-.37,mainD*.82,'stone');
     block('#567e88',u,upper*.67,face+.09,maxTierW*.60,.53,.060,'glass');
     block('#e8d9c5',u,upper*.56,face+.37,maxTierW*.63,.13,.52,'wood');
    }
    gable(level===1?'#49566b':'#363e4d',center,v,wing+.26,mainD+.25,top,.62);
    if(level===2)gable('#44485a',u+maxTierW*.26,v+.17,maxTierW*.46+.24,mainD*.82+.18,top-.36,.51);
    for(const yy of level===2?[1.10,2.15]:[1.18]){
     for(const xx of [center-wing*.28,center+wing*.28])
      windowFront(xx,yy,face+.06,.35,.44,'#5b8995');
    }
    entry(center,face+.17,.77);
    block('#b8956d',center,1.83,face+.30,1.35,.10,.48,'wood');
    for(const side of[-1,1]){
     const x=center+side*wing*.42;
     planted(x,baseV+availableDepth-.93,.25);
     lantern(x,face+.34,'#ffe7bb',.89);
    }
   }else if(family==='office'){
    // A compact glass business pavilion grows into a setback office tower.
    const podiumH=1.13+level*.16;
    block('#c9d9d9',u,.24+podiumH/2,v,maxTierW,podiumH,mainD,'stone');
    const towerW=maxTierW*(level===1?.88:level===2?.78:.72);
    const towerD=mainD*(level===1?.91:.83);
    block('#5f899b',u,.24+upper/2,v-.10,towerW,upper,towerD,'glass');
    const floors=level+2;
    for(let floor=0;floor<floors;floor++){
     const yy=.55+(upper-.58)*(floor+.5)/floors;
     glassBand(u,yy,v+towerD/2+.04,towerW*.90,(upper-.34)/floors*.74,level*2+3,'#36677c');
     block('#dce8e7',u,yy+(upper-.34)/floors*.42,v+towerD/2+.07,towerW*.97,.067,.09,'stone');
    }
    roofFlat(u,v-.10,towerW,towerD,top,'#445666');
    if(level>=2){
     block('#5d7e83',u,top+.36,v-.19,towerW*.28,.58,towerD*.25,'metal');
     for(const side of[-1,1])pole('#e2f2ec',u+side*towerW*.30,top+.34,v,.048,.22,'glass',true);
    }
    entry(u,face+.10,.96);
    sign(level===1?'STUDIO':level===2?'OFFICE':'TOWER',u,1.97,face+.18,Math.min(2.20,maxTierW*.76),'#30464f','#e5f8ee');
    for(const side of[-1,1])planter(u+side*maxTierW*.47,face+.29,.21);
   }else if(family==='factory'){
    // Sawtooth industrial sheds and working loading doors, with rooftop tanks.
    const units=level===1?1:level===2?2:3;
    const partW=(maxTierW-.14*(units-1))/units;
    for(let i=0;i<units;i++){
     const x=u-maxTierW/2+partW/2+i*(partW+.14);
     block(stone,x,.23+upper/2,v,partW,upper,mainD,'stone');
     gable('#77848a',x,v,partW+.11,mainD+.08,top-.13,.32);
     const frontX=x;
     block('#526b73',frontX,.84,face+.07,partW*.72,.98,.080,'metal');
     for(let y=.51;y<1.27;y+=.21)
      block('#b1c2c3',frontX,y,face+.12,partW*.65,.029,.033,'metal');
     block('#f4b177',x,1.46,face+.15,.20,.12,.12,'glass',true);
     for(const z of[v-.32,v+.32]){
      block('#95c6cc',x,upper+.36,z,partW*.37,.044,.23,'glass');
     }
    }
    for(let i=0;i<level;i++){
     const x=u-maxTierW*.32+i*maxTierW*.32;
     pole('#7a8084',x,top+.31,v-.31,.15,.69,'metal');
     pole('#c6d0c9',x,top+.74,v-.31,.18,.09,'metal');
    }
    sign(level===1?'WORKS':level===2?'PLANT':'INDUSTRY',u,1.93,face+.16,Math.min(2.35,maxTierW*.86),'#485c62','#f4ddb8');
    if(level>=2)for(const side of[-1,1])
     block('#b4b9ad',u+side*maxTierW*.39,.36,face+.32,.55,.43,.40,'stone');
   }else if(family==='shop'){
    const bays=level===1?1:level===2?2:4;
    block(stone,u,.24+upper/2,v,maxTierW,upper,mainD,'stone');
    roofFlat(u,v,maxTierW,mainD,top,'#4d6b6e');
    const bayW=maxTierW/bays;
    for(let i=0;i<bays;i++){
     const x=u-maxTierW/2+(i+.5)*bayW;
     glassBand(x,.99,face+.06,bayW*.81,1.22,3,'#508f95');
     block(i%2?'#c99d6b':'#b27967',x,1.62,face+.38,bayW*.89,.12,.61,'wood');
     for(let j=0;j<5;j++)
      block(j%2?'#f1e5c8':'#a85f58',x-bayW*.39+j*bayW*.195,1.56,face+.69,bayW*.19,.045,.17,'wood');
     block('#dbc6a6',x,.24,face+.48,bayW*.81,.06,.21,'stone');
     if(level>=2)windowFront(x,2.20,face+.07,Math.min(.65,bayW*.67),.50,'#729da7');
    }
    sign(level===1?'SHOP':level===2?'MARKET':'GALLERIA',u,level===1?2.09:top-.29,face+.15,Math.min(2.8,maxTierW*.84),'#4d736e','#fff1bd');
    if(level===3){
     block('#75aeaf',u,top+.30,v,maxTierW*.36,.28,mainD*.48,'glass');
     for(const side of[-1,1])planter(u+side*maxTierW*.45,face+.30,.27);
    }
   }else if(family==='restaurant'){
    const left=level>=2?u-maxTierW*.22:u,ww=level>=2?maxTierW*.56:maxTierW;
    block(stone,left,.24+upper/2,v,ww,upper,mainD,'stone');
    gable('#694d43',left,v,ww+.23,mainD+.20,top,.50);
    if(level>=2){
     const right=u+maxTierW*.30;
     block('#765448',right,.24+(upper-.49)/2,v+.27,maxTierW*.40,upper-.49,mainD*.82,'stone');
     gable('#815d48',right,v+.27,maxTierW*.40+.16,mainD*.82+.14,top-.49,.36);
    }
    for(const x of[left-ww*.26,left+ww*.26])
     windowFront(x,1.08,face+.06,Math.min(.48,ww*.25),.60,'#5e8794');
    entry(left,face+.13,.85);
    sign(level===1?'CAFE':level===2?'BISTRO':'GRILL',left,level===1?2.26:top-.36,face+.17,Math.min(ww*.89,2.85),'#524037','#ffe4b8');
    const terraceX=level>=2?u+maxTierW*.25:u+maxTierW*.36;
    const terraceZ=baseV+availableDepth-(hotel?.68:.96);
    for(const dz of[-.34,.27]){
     table(terraceX,Math.min(t.frontageV-.85,terraceZ+dz),level===3);
    }
    bulbString(u-maxTierW*.43,face+.40,u+maxTierW*.43,face+.40,1.54,level===3?8:5);
    for(const side of[-1,1])planter(u+side*maxTierW*.45,face+.35,.22);
   }else if(family==='mall'){
    const sideW=maxTierW*.28,centerW=maxTierW*.43;
    const elevation=upper-.20;
    for(const side of[-1,1]){
     const x=u+side*maxTierW*.36;
     block('#d6e3df',x,.24+elevation/2,v,sideW,elevation,mainD,'stone');
     for(const yy of[1.02,1.95,2.87].filter(y=>y<elevation+.14))
      glassBand(x,yy,face+.10,sideW*.76,.63,2,'#4e909c');
     roofFlat(x,v,sideW,mainD,elevation+.32,'#719ca0');
    }
    block('#4a8792',u,.24+upper/2,v,centerW,upper,mainD,'glass');
    glassBand(u,upper*.48+.22,face+.12,centerW*.92,upper*.69,level+3,'#3f8795');
    roofFlat(u,v,centerW+.17,mainD,top+.16,'#9abdc4');
    block('#a8d6da',u,top+.38,v,centerW*.81,.36,mainD*.36,'glass');
    entry(u,face+.24,.96);
    sign(level===1?'ARCADE':level===2?'MALL':'GALLERIA',u,top-.48,face+.21,Math.min(centerW+.47,2.35),'#376c75','#f7eed1');
    for(const side of[-1,1])planter(u+side*maxTierW*.46,face+.32,.24);
   }else if(family==='pub'){
    // The small pub is independently handcrafted above. Medium and large
    // become premium music venues with real staggered rooms and rooftop decks.
    const mainW=maxTierW*(level===2?.72:.80);
    const wingW=(maxTierW-mainW)*.64,sideX=u+maxTierW*.40;
    block('#554c62',u,.24+upper/2,v,mainW,upper,mainD,'stone');
    block('#344254',sideX,.24+(upper-.55)/2,v+.27,wingW,upper-.55,mainD*.76,'stone');
    gable(level===2?'#333646':'#242d3c',u,v,mainW+.23,mainD+.20,top,.56);
    for(const yy of[1.05,2.12,3.17,4.26].filter(y=>y<upper-.17)){
     glassBand(u,yy,face+.07,mainW*.81,.54,6,'#5f597e');
     for(const side of[-1,1])block('#dca3fa',u+side*mainW*.47,yy,face+.13,.076,.58,.09,'glass',true);
    }
    block('#9251ae',u,1.78,face+.36,mainW*.63,.10,.53,'stone');
    entry(u,face+.25,.85);
    sign(level===2?'PUB':'CLUB',u,top-.40,face+.22,Math.min(2.7,mainW*.82),'#2c293e','#f3b9fd');
    for(const side of[-1,1]){
     const x=u+side*mainW*.49;
     lantern(x,face+.19,'#f6bff6',.85);
    }
    const deckZ=Math.min(t.frontageV-.87,baseV+availableDepth-.90);
    for(const xx of[u-maxTierW*.25,u+maxTierW*.25])
     table(xx,deckZ,false);
    if(level===3){
     block('#af8b72',u,top+.19,v,mainW*.70,.08,mainD*.43,'wood');
     for(const side of[-1,1])block('#d4b3dd',u+side*mainW*.35,top+.43,v,.07,.46,mainD*.43,'glass');
     bulbString(u-mainW*.30,v+.18,u+mainW*.30,v+.18,top+.64,7);
    }
   }else if(family==='hotel'){
    const floorN=level===1?2:level===2?3:6;
    const hotelW=Math.min(W-1.62,level===1?2.7:level===2?3.65:6.5);
    const hotelD=d;
    block(stone,u,.24+upper/2,v,hotelW,upper,hotelD,'stone');
    if(level===1)gable('#4b5360',u,v,hotelW+.21,hotelD+.23,top,.53);
    else roofFlat(u,v,hotelW,hotelD,top,'#70898b');
    for(let floor=0;floor<floorN;floor++){
     const yy=.58+(upper-.55)*(floor+.48)/floorN;
     const windows=level===1?2:level===2?3:6;
     for(let i=0;i<windows;i++){
      const x=u-hotelW*.44+(i+.5)*hotelW*.88/windows;
      windowFront(x,yy,face+.052,Math.min(.49,hotelW*.65/windows),Math.max(.24,(upper-.52)/floorN*.54),'#618e9d');
      if(level>=2)
       block('#e9dbbd',x,yy-.35,face+.24,Math.min(.52,hotelW*.75/windows),.073,.40,'stone');
     }
    }
    entry(u,face+.16,level===3?1.12:.79);
    sign(level===1?'INN':level===2?'HOTEL':'RESORT',u,top-(level===1?.21:.34),face+.18,Math.min(2.65,hotelW*.87),'#655543','#ffe8b7');
    for(const side of[-1,1])planter(u+side*hotelW*.47,Math.min(t.plotHeight-.40,face+.24),.24);
    if(level>=2){
     block('#699eaa',u,top+.33,v,hotelW*.42,.21,hotelD*.38,'glass');
     block('#e8e5d8',u,top+.50,v,hotelW*.48,.06,hotelD*.44,'stone');
    }
    if(level===3){
     block('#75b2c4',u,top+.60,v-.31,hotelW*.38,.055,hotelD*.36,'water');
     for(const side of[-1,1])block('#e6e7df',u+side*hotelW*.22,top+.62,v-.31,.20,.055,hotelD*.38,'stone');
    }
   }

   // FOUR-FACADE ATELIER. Local +v faces the road, -v is the service/back
   // elevation, +/-u are different, individually constructed side elevations.
   // The helper moves all pieces with the building's cardinal rotation.
   const back=v-mainD/2,sideLeft=u-maxTierW/2,sideRight=u+maxTierW/2;
   const xWall=(side,x,z,y,depth,height,color,frame='#e1d0b6')=>{
    const edge=x+side*.048;
    block(frame,edge,y,z,.092,height+.12,depth+.12,'stone');
    block(color,edge+side*.049,y,z,.037,height,depth,'glass');
    block('#d6c4aa',edge+side*.074,y-height*.48,z,.050,.065,depth+.15,'stone');
    block('#f9deb4',edge+side*.071,y-height*.11,z,.014,height*.37,depth*.67,'glass',true);
    block('#e9e1d3',edge+side*.081,y,z,.021,height*.94,.027,'metal');
   };
   const rearPane=(x,y,width=.40,height=.51,color='#577c84')=>{
    block('#cbbfae',x,y,back-.066,width+.12,height+.12,.09,'stone');
    block(color,x,y,back-.119,width,height,.033,'glass');
    block('#ffe2b5',x,y-.055,back-.148,width*.67,height*.35,.015,'glass',true);
    block('#a58a6e',x,y-height*.5-.055,back-.20,width+.18,.09,.18,'wood');
   };
   const rearDoor=(x,width=.65,height=1.18,color='#59646b')=>{
    block('#ddd3c2',x,.22+height/2,back-.095,width+.17,height+.17,.13,'stone');
    block(color,x,.20+height/2,back-.171,width,height,.065,'metal');
    block('#ddbd79',x+width*.27,.77,back-.213,.042,.08,.032,'metal');
    block('#bdac92',x,.17,back-.32,width+.20,.082,.25,'stone');
   };
   const parapet=(x,z,width,depth,y,c='#d1c5b4')=>{
    for(const side of[-1,1])block(c,x+side*(width/2-.047),y,z,.09,.30,depth-.05,'stone');
    for(const side of[-1,1])block(c,x,y,z+side*(depth/2-.047),width-.05,.30,.09,'stone');
   };
   const tinyVent=(x,y,z,ww=.43,hh=.30)=>{
    block('#839195',x,y,z,ww+.07,hh+.07,.09,'metal');
    for(let q=0;q<4;q++)block('#465e68',x,y-hh*.37+q*hh*.24,z+.061,ww*.82,.027,.02,'metal');
   };
   const downPipe=(x,z,y,h)=>{
    pole('#748181',x,y,z,.029,h,'metal');
    block('#d8bca3',x,y+h*.5,z,.085,.08,.085,'metal');
    block('#d8bca3',x,y-h*.5,z,.085,.08,.085,'metal');
   };
   const stripes=(x,z,y,ww,hh,cl='#dde6df')=>{
    for(let q=0;q<5;q++)
     block(cl,x-ww/2+(q+.5)*ww/5,y,z,ww/5-.012,hh,.030,'glass');
   };
   if(family==='home'){
    // HOME: warm rear kitchen and utility door, covered garden veranda on the
    // right and a deliberately plainer laundry wall on the left.
    const mainBack=back-.06;
    rearDoor(u-maxTierW*.23,.51,.98,'#7e6552');
    for(const x of[u+maxTierW*.06,u+maxTierW*.31])
     rearPane(x,1.09,.36,.46,'#527c89');
    for(const x of[u-maxTierW*.30,u+maxTierW*.30]){
     block('#d4d2bd',x,1.60,back-.21,.63,.10,.32,'wood');
     for(let i=0;i<3;i++)block(i%2?'#bdad8c':'#eee5cf',x-.23+i*.23,1.64,back-.26,.19,.025,.28,'wood');
    }
    const leftX=u-maxTierW*.49,rightX=u+maxTierW*.49;
    xWall(-1,leftX,v-.29,1.15,.49,.61,'#658594');
    xWall(-1,leftX,v+.42,2.03,.34,.45,'#7295a0');
    // Exposed masonry service pipe, meter and washing line.
    downPipe(leftX-.07,v+.71,1.12,1.45);
    block('#c8c9c0',leftX-.13,.78,v-.83,.23,.30,.15,'metal');
    block('#60716c',leftX-.27,.79,v-.83,.065,.20,.065,'metal');
    for(let j=0;j<5;j++)block('#d0c9b6',leftX-.09,.53,v-.73+j*.22,.042,.04,.13,'stone');
    xWall(1,rightX,v-.43,1.18,.47,.64,'#6f979c');
    xWall(1,rightX,v+.41,2.11,.44,.58,'#6a8f9b');
    block('#d5c4a8',rightX+.19,1.77,v+.32,.43,.11,1.02,'wood');
    for(const zz of[v-.15,v+.63])
     pole('#b09b80',rightX+.31,1.0,zz,.037,1.49,'wood');
    if(level===2){
     // Medium home reads as an occupied two-wing residence, not a large box.
     for(const zz of[v-.50,v+.10,v+.70])
      block('#e6dcbe',rightX+.27,2.40,zz,.47,.07,.35,'stone');
     block('#9b795d',rightX+.32,2.64,v+.19,.06,.39,1.17,'wood');
     for(let i=0;i<5;i++)
      block('#b8a58b',rightX+.39,2.40,v-.34+i*.22,.025,.33,.026,'wood');
     planter(u-maxTierW*.35,baseV+availableDepth-.68,.25);
     planter(u+maxTierW*.31,baseV+availableDepth-.68,.25);
    }
    // Roof tile rhythm and ridge cap, on both slopes.
    for(const zz of[v-mainD*.28,v,v+mainD*.28])
     for(const xx of [u-maxTierW*.25,u+maxTierW*.25])
      block('#667083',xx,upper+.59,zz,.08,.065,.08,'stone');
   }else if(family==='office'){
    // OFFICE: curtain-wall returns on both sides; rear loading/staff entrance,
    // fire escape and rooftop mechanical deck scale with workforce tier.
    const towerWidth=maxTierW*(level===1?.88:level===2?.78:.72);
    const towerDepth=mainD*(level===1?.91:.83);
    const sideR=u+towerWidth/2,sideL=u-towerWidth/2;
    const floorN=level+2;
    for(const side of[-1,1])for(let floor=0;floor<floorN;floor++){
     const yy=.57+(upper-.52)*(floor+.48)/floorN;
     const x=u+side*(towerWidth/2+.045);
     for(let j=0;j<(level===1?2:4);j++){
      const zz=v-.10-towerDepth*.41+(j+.5)*towerDepth*.82/(level===1?2:4);
      xWall(side,x,zz,yy,towerDepth*.64/(level===1?2:4),(upper-.46)/floorN*.65,'#467c91','#c9dcdb');
     }
     block('#d7e1dd',x+side*.09,yy+(upper-.46)/floorN*.40,v-.10,.06,.060,towerDepth*.90,'stone');
    }
    for(let f=0;f<floorN;f++){
     const yy=.57+(upper-.52)*(f+.48)/floorN;
     for(let j=0;j<(level+2);j++){
      const xx=u-towerWidth*.41+(j+.5)*towerWidth*.82/(level+2);
      rearPane(xx,yy,Math.max(.17,towerWidth*.65/(level+2)),
       Math.max(.19,(upper-.49)/floorN*.60),'#437283');
     }
    }
    const doorU=u+towerWidth*.20;
    rearDoor(doorU,Math.min(.70,towerWidth*.36),1.10,'#4a6670');
    block('#e6d2ad',doorU,.20,back-.39,.88,.08,.35,'stone');
    for(let floor=0;floor<Math.min(level+1,4);floor++){
     const yy=.52+floor*.60,zz=v-.60+(floor%2?.20:0);
     block('#c4cac5',sideL-.17,yy,zz,.32,.085,.55,'metal');
     block('#aabbbb',sideL-.29,yy+.21,zz,.032,.46,.56,'metal');
     for(let k=0;k<4;k++)block('#607881',sideL-.31,yy+.04,zz-.19+k*.13,.030,.17,.026,'metal');
    }
    for(let i=0;i<level+1;i++){
     const x=u-towerWidth*.32+i*towerWidth*.64/Math.max(1,level);
     block('#8eaaa8',x,top+.40,v-.10,.39,.34,.40,'metal');
     for(let j=0;j<3;j++)block('#455f65',x-.12+j*.12,top+.44,v+.14,.061,.23,.026,'metal');
    }
    if(level===3){
     // The large office has two recognizable stepped setbacks.
     block('#789ea2',u,top+.72,v-.18,towerWidth*.45,.23,towerDepth*.55,'glass');
     parapet(u,v-.18,towerWidth*.49,towerDepth*.60,top+.91,'#d5e5e6');
     pole('#d7e4e3',u,top+1.29,v-.18,.035,.69,'metal');
    }
   }else if(family==='factory'){
    // FACTORY: the PUBLIC front already has roller shutters, while the rear
    // has large actual loading docks, freight pallets and roof extraction ducts.
    const docks=level===1?1:level===2?2:3;
    const ww=Math.min(maxTierW*.80/docks,.98);
    const rearZ=back-.083;
    for(let i=0;i<docks;i++){
     const x=u-maxTierW*.38+(i+.5)*maxTierW*.76/docks;
     block('#405967',x,.83,rearZ,ww,1.09,.099,'metal');
     block('#a3adb2',x,.26,back-.22,ww+.12,.23,.29,'stone');
     for(let j=0;j<5;j++)
      block(j%2?'#6b818b':'#b7c3c2',x,.44+j*.18,back-.15,ww*.91,.055,.025,'metal');
     for(const dx of[-ww*.41,ww*.41])
      block('#f6c964',x+dx,.25,back-.26,.065,.09,.035,'glass',true);
     const px=x+ww*.22;
     for(let p=0;p<3;p++)block(p%2?'#927653':'#ab8866',px,.22+p*.14,back-.44,.41,.14,.26,'wood');
    }
    // East wall: machine exhaust, silos, service catwalk and grilles.
    for(const side of[-1,1]){
     const x=u+side*(maxTierW/2+.052);
     for(let i=0;i<Math.max(2,level*2);i++){
      const zz=v-mainD*.39+(i+.5)*mainD*.78/Math.max(2,level*2);
      block('#c2cccb',x,1.38,zz,.10,.44,.30,'metal');
      for(let j=0;j<4;j++)
       block('#49646b',x+side*.056,1.24+j*.087,zz,.025,.024,.23,'metal');
     }
     downPipe(x+side*.10,v+.43,1.12,1.47);
     block('#b8b8ac',x+side*.18,.29,v,.32,.10,mainD*.69,'stone');
     for(const zz of[v-mainD*.26,v+mainD*.26])
      block('#e7c982',x+side*.19,.40,zz,.052,.07,.10,'glass',true);
    }
    // Upper sawtooth lights read from the rear AND both sides.
    for(let i=0;i<docks;i++){
     const x=u-maxTierW*.39+(i+.5)*maxTierW*.78/docks;
     block('#b7d8df',x,top+.13,v-.38,ww*.75,.09,.28,'glass');
     block('#506870',x,top+.22,v-.38,ww*.77,.026,.30,'metal');
    }
    if(level>=2)for(let i=0;i<level;i++){
     const x=u-maxTierW*.31+i*maxTierW*.62/(level-1);
     pole('#65777d',x,top+.82,v+.15,.21,1.08,'metal');
     pole('#adb5b2',x,top+1.44,v+.15,.25,.15,'metal');
     for(let k=0;k<3;k++)block('#e5e6d5',x,top+.76+k*.27,v+.15,.31,.041,.31,'stone');
    }
   }else if(family==='shop'){
    // SHOP: varied shopfront rhythm, but the REAR is a real goods receiving
    // area, the right side is a glazed showcase, left side is a service alley.
    const roomN=level===1?1:level===2?2:4;
    const bay=maxTierW/roomN;
    for(let i=0;i<roomN;i++){
     const x=u-maxTierW*.5+(i+.5)*bay;
     rearDoor(x,Math.min(.50,bay*.66),.97,'#5d7a7b');
     if(level>=2)rearPane(x,2.09,Math.min(.47,bay*.58),.43,'#5a9194');
     for(let k=0;k<3;k++){
      const yy=.22+k*.17,z=back-.40;
      block(k%2?'#c6ae88':'#b19772',x-bay*.22,yy,z,.26,.16,.24,'wood');
     }
    }
    for(const side of[-1,1]){
     const x=u+side*(maxTierW*.50+.055);
     xWall(side,x,v-.40,1.08,.49,.69,'#57918e');
     for(let i=0;i<level;i++){
      const zz=v+.04+i*.29;
      xWall(side,x,zz,1.97+(level===3?.32:0),.19,.31,'#6a9fa3');
     }
     // Side storefront sign, planter boxes and vertical neon wayfinding.
     const neon=side===1?'#efac7c':'#d0dfd4';
     block('#384f55',x+side*.12,1.61,v+.37,.13,.72,.34,'metal');
     for(let i=0;i<4;i++)
      block(neon,x+side*.19,1.35+i*.17,v+.38,.026,.09,.22,'glass',true);
     block('#bea58b',x+side*.17,.29,v-.22,.29,.32,.54,'wood');
     block('#6a9465',x+side*.18,.52,v-.22,.31,.14,.45,'stone');
    }
    // Small kiosk has a characteristic canopy; larger sizes carry multiple
    // independent shop signs and a recognizable upper-office parapet.
    for(let i=0;i<roomN;i++){
     const xx=u-maxTierW*.5+(i+.5)*bay;
     sign(level===1?'SHOP':level===2?(i%2?'CAFE':'SHOP'):(i%2?'MARKET':'STUDIO'),xx,top-.36,face+.16,
      Math.min(bay*.82,1.50),'#46696a',i%2?'#f6d4a4':'#f4efbf');
    }
    if(level===3){
     parapet(u,v,maxTierW*.90,mainD*.85,top+.29,'#e4dbcd');
     for(let i=0;i<4;i++){
      const xx=u-maxTierW*.36+i*maxTierW*.24;
      block('#99a8a8',xx,top+.40,v-.24,.28,.20,.35,'metal');
     }
    }
   }else if(family==='restaurant'){
    // RESTAURANT: kitchen exhaust and deliveries BEHIND, seating and pergola
    // along the right side, quiet garden windows on the opposite elevation.
    const principalWidth=level>=2?maxTierW*.56:maxTierW;
    const leftCenter=level>=2?u-maxTierW*.22:u;
    const kitchenX=leftCenter-principalWidth*.28;
    rearDoor(kitchenX,.56,1.01,'#77604e');
    rearPane(leftCenter+principalWidth*.21,1.11,.42,.53,'#739da0');
    for(let i=0;i<level+1;i++){
     const x=leftCenter-principalWidth*.33+i*principalWidth*.66/level;
     tinyVent(x,2.01,back-.14,.29,.23);
    }
    const chimneyX=leftCenter+principalWidth*.24;
    block('#a8aaa3',chimneyX,top+.25,v-.42,.37,.54,.43,'metal');
    block('#646c69',chimneyX,top+.59,v-.42,.48,.095,.51,'metal');
    for(let i=0;i<4;i++)
     block('#4e625e',chimneyX-.13+i*.088,top+.22,v-.17,.038,.35,.023,'metal');
    // Gas cylinders and produce boxes sit by the staff door at the rear.
    for(let i=0;i<3;i++){
     const x=leftCenter-principalWidth*.42+i*.25;
     pole(i===0?'#789d8b':'#858d83',x,.42,back-.29,.085,.51,'metal');
     pole('#d5d3b9',x,.75,back-.29,.039,.075,'metal');
    }
    for(const zz of[v-mainD*.33,v+.13,v+mainD*.33])
     xWall(-1,leftCenter-principalWidth/2-.06,zz,1.12,.37,.58,'#58808a');
    const rightX=u+maxTierW*.5;
    for(let i=0;i<level+1;i++){
     const zz=v-mainD*.37+(i+.5)*mainD*.73/(level+1);
     xWall(1,rightX,zz,1.09,mainD*.56/(level+1),.72,'#7da7aa');
    }
    // Side pergola and warm alfresco booths, scaled to the available width.
    const patioU=u+maxTierW*.29,patioZ=Math.min(t.frontageV-.87,face+.57);
    block('#bb997b',patioU,.26,patioZ,maxTierW*.38,.08,.58,'wood');
    for(const side of[-1,1]){
     pole('#927358',patioU+side*maxTierW*.15,1.05,patioZ,.034,1.59,'wood');
     block('#c39d79',patioU+side*maxTierW*.15,1.86,patioZ,.12,.08,.74,'wood');
    }
    for(let i=0;i<6;i++){
     const x=patioU-maxTierW*.14+i*maxTierW*.28/5;
     block('#bf9971',x,1.91,patioZ,.050,.07,.80,'wood');
     if(i%2===0)block('#ffe5b3',x,1.75,patioZ+.26,.12,.15,.12,'glass',true);
    }
    if(level===3){
     // Top restaurant is a two-storey dining destination with roof terrace,
     // not an enlarged tiny roadside café.
     block('#b17e63',leftCenter,top+.25,v,principalWidth*.76,.075,mainD*.58,'wood');
     parapet(leftCenter,v,principalWidth*.78,mainD*.61,top+.39,'#d3b597');
     for(const side of[-1,1])table(leftCenter+side*principalWidth*.22,v, false);
     block('#a27853',leftCenter,top+.72,v-.27,principalWidth*.63,.08,.14,'wood');
    }
   }else if(family==='mall'){
    // MALL: separated front shops and a central atrium; 4-sided facade detail
    // includes an exposed rear service court, delivery roller shutters,
    // side anchor signs and rooftop skylight structure.
    const sideW=maxTierW*.28,centerW=maxTierW*.43;
    for(const side of[-1,1]){
     const edgeX=u+side*(maxTierW*.36+sideW*.5+.04);
     for(const floor of [0,1,2].filter(f=>f<level+1)){
      const yy=.91+floor*.94;
      for(let j=0;j<3;j++)
       xWall(side,edgeX,v-mainD*.32+j*mainD*.32,yy,.36,.53,'#4b8692','#d3e4e0');
     }
     // Corner signage is mounted on the SIDE, legible from perpendicular roads.
     block('#416e7d',edgeX+side*.15,1.77,v+.19,.12,.94,.76,'metal');
     for(let j=0;j<5;j++)
      block('#d9e3de',edgeX+side*.23,1.43+j*.16,v+.18,.025,.095,.57,'glass',true);
     block('#d1c2ad',edgeX+side*.15,.38,v+.42,.40,.37,.40,'stone');
     planter(u+side*maxTierW*.49,baseV+availableDepth-.78,.18);
    }
    for(let i=0;i<(level===1?2:level===2?3:4);i++){
     const x=u-maxTierW*.43+(i+.5)*maxTierW*.86/(level===1?2:level===2?3:4);
     if(i%2===0){
      rearDoor(x,Math.min(.47,maxTierW*.50/(level+1)),1.01,'#476068');
      block('#c3c6ba',x,.18,back-.35,.58,.10,.34,'stone');
     }else{
      rearPane(x,1.12,.42,.48,'#527e89');
      block('#8d9895',x,.21,back-.26,.37,.24,.18,'metal');
     }
     if(level>=2)rearPane(x,2.14,.32,.42,'#518b92');
    }
    // Atrium glass roof, roof cooling units, perimeter handrails.
    const roofN=level===3?5:level===2?3:2;
    for(let i=0;i<roofN;i++){
     const x=u-centerW*.43+(i+.5)*centerW*.86/roofN;
     block('#9cd1d9',x,top+.40,v,.12,.08,mainD*.47,'glass');
     block('#e6f2f0',x,top+.46,v,.052,.033,mainD*.45,'metal');
    }
    for(let i=0;i<level+1;i++){
     const x=u+maxTierW*.15+i*.23;
     block('#9baeb2',x,top+.40,v-.22,.31,.30,.36,'metal');
     block('#4e6870',x,top+.59,v-.22,.32,.04,.37,'metal');
    }
    if(level===3){
     // Elevated cinema block only belongs to the flagship mall.
     block('#374d61',u,top+.80,v-.27,centerW*.62,.77,mainD*.35,'stone');
     block('#a18bd3',u,top+1.03,v+.05,centerW*.52,.23,.044,'glass',true);
     block('#dee5db',u,top+1.28,v-.27,centerW*.68,.07,mainD*.38,'stone');
    }
   }else if(family==='pub'){
    // Medium pub: real two-storey music bar, rear escape door and service
    // stair. Large club: dedicated stage tower, roof venue and light trusses.
    rearDoor(u-maxTierW*.25,.69,1.12,'#433d4d');
    rearPane(u+maxTierW*.19,2.04,.39,.54,'#715f90');
    const speaker=(x,yy,z)=>{
     block('#292c3c',x,yy,z,.37,.67,.28,'metal');
     for(const dy of[-.16,.16]){
      const p=point(x,z);
      batch.add(CYL_SMOOTH,'#4f5a6c',p.x-.5,yy+dy,p.y-.5,.115,.05,.115,Math.PI/2,turn,0,id,false,'metal');
      block('#b6a3d5',x,yy+dy,z+.16,.035,.13,.02,'glass',true);
     }
    };
    for(const side of[-1,1]){
     const sx=u+side*(maxTierW*.41);
     for(const zz of[v-mainD*.31,v+mainD*.22])
      xWall(side,sx,zz,1.52,.37,.60,'#67517e','#a08cac');
     block('#ae87d5',sx+side*.11,upper*.64,v,.087,upper*.41,.10,'glass',true);
     downPipe(sx+side*.11,v-mainD*.40,1.11,1.42);
     const vx=u+side*maxTierW*.23;
     speaker(vx,1.05,face+.18);
     lantern(vx,face+.60,'#efb3f5',.79);
     planter(vx,baseV+availableDepth-.74,.19);
    }
    const rearDeck=Math.max(back-.26,baseV+.20);
    for(const z of[back+.26,face-.24]){
     block('#7c5c75',u,.27,z,maxTierW*.49,.13,.23,'wood');
     for(let i=0;i<4;i++)block('#d99fdc',u-maxTierW*.18+i*maxTierW*.12,.39,z,.08,.06,.12,'glass',true);
    }
    // External backstage door is connected by a side stair and metal landing.
    for(let step=0;step<4;step++){
     const x=u-maxTierW*.40+(step+.5)*.21;
     block('#979296',x,.21+step*.13,v-mainD*.16,.22,.075,.48,'metal');
    }
    if(level===3){
     const stageW=maxTierW*.52;
     block('#34334c',u,top+.52,v+.16,stageW,.85,mainD*.41,'metal');
     block('#a55ad3',u,top+.80,v+mainD*.21,stageW*.87,.16,.070,'glass',true);
     for(const side of[-1,1]){
      pole('#7d7087',u+side*stageW*.47,top+1.17,v,.039,.86,'metal');
      block('#d29de5',u+side*stageW*.47,top+1.63,v,.14,.08,.15,'glass',true);
     }
     for(let i=0;i<8;i++)
      block(i%2?'#e4b8ff':'#9e80d2',u-stageW*.41+i*stageW*.82/7,top+.23,face+.14,.07,.12,.075,'glass',true);
     block('#b5a4c9',u,top+.31,v-.36,stageW*.78,.05,.18,'wood');
    }else{
     for(let i=0;i<7;i++)
      block('#f0b5d9',u-maxTierW*.32+i*maxTierW*.64/6,top+.19,face+.16,.06,.10,.06,'glass',true);
    }
   }else if(family==='hotel'){
    // HOTEL: this is NOT another office tower. Four elevations show paired
    // guest-room windows, service and fire access, balconies, downpipes and
    // distinct entrance/lobby, while resort tiers add rooftop leisure.
    const width=Math.min(W-1.62,level===1?2.7:level===2?3.65:6.5);
    const floors=level===1?2:level===2?3:6;
    const sideRooms=level===1?2:level===2?3:4;
    for(const side of[-1,1]){
     const xx=u+side*(width*.5+.05);
     for(let floor=0;floor<floors;floor++){
      const yy=.58+(upper-.54)*(floor+.48)/floors;
      for(let k=0;k<sideRooms;k++){
       const zz=v-mainD*.42+(k+.5)*mainD*.84/sideRooms;
       xWall(side,xx,zz,yy,mainD*.65/sideRooms,Math.max(.20,(upper-.4)/floors*.61),
        '#628c9c','#d6c2a2');
       if(level>=2&&floor>0){
        block('#dfc19f',xx+side*.20,yy-.30,zz,.43,.06,mainD*.63/sideRooms,'stone');
        block('#927b64',xx+side*.39,yy-.19,zz,.036,.23,mainD*.63/sideRooms,'wood');
       }
      }
     }
     // Downpipes are visible on both edges; rear stairwell only on left.
     downPipe(xx+side*.07,v-mainD*.43,upper*.5,upper*.95);
     for(let k=0;k<3;k++)
      block('#b7a28e',xx+side*.12,.26+k*.19,v+mainD*.40,.24,.05,.12,'stone');
    }
    for(let floor=0;floor<floors;floor++){
     const yy=.58+(upper-.54)*(floor+.48)/floors;
     for(let i=0;i<(level===3?6:level+1);i++){
      const count=level===3?6:level+1;
      const x=u-width*.43+(i+.5)*width*.86/count;
      rearPane(x,yy,Math.min(.41,width*.66/count),Math.max(.21,(upper-.4)/floors*.60),'#5a8790');
      if(level>=2){
       block('#d3b28c',x,yy-.29,back-.34,Math.min(.50,width*.76/count),.08,.42,'stone');
       block('#c1a282',x,yy-.16,back-.56,Math.min(.50,width*.76/count),.24,.038,'wood');
      }
     }
    }
    // A small guesthouse keeps terracotta roof and garden porch; large hotel
    // gets a separate raised pool terrace and glass top-floor pavilion.
    if(level===1){
     block('#bf9e79',u,.20,face+.37,width*.69,.07,.54,'stone');
     for(const side of[-1,1]){
      pole('#a78c6d',u+side*width*.32,1.18,face+.50,.034,1.62,'wood');
      lantern(u+side*width*.27,face+.39,'#ffe4bb',.85);
     }
    }else{
     block('#688d9a',u,upper*.49,face+.09,width*.72,.64,.074,'glass');
     for(const side of[-1,1]){
      planter(u+side*width*.48,face+.43,.25);
      block('#d3b38a',u+side*width*.32,top+.33,v-.32,.48,.09,.44,'stone');
     }
     if(level===3){
      for(let k=0;k<5;k++){
       const x=u-width*.36+k*width*.18;
       block('#f0ebdd',x,top+.70,v-.20,.14,.05,mainD*.26,'stone');
       pole('#7fafa9',x,top+.83,v-.20,.022,.16,'metal');
      }
      // Roof loungers and safety balustrade on both long sides.
      for(const side of[-1,1])
       block('#e0dfd3',u+side*width*.44,top+.83,v-.10,.09,.36,mainD*.67,'stone');
     }
    }
   }
   // Detail budget scales with building footprint; decorative features are
   // batched and use existing night emissive materials, not point lights.
   return;
  }

  // SMALL PUB — bespoke "LOCAL PUB" brick tavern, not the shared cuboid.
  // Footprint: 6x8, with 10-car parking in the rear 0..4 and the pub/patio
  // entirely inside the forward 4..7 area. Vehicle spines at u=.45/5.55
  // and the city-road gates stay free; this is visual-only geometry.
  if(b.key==='pub_small'){
   const wall='#b99379',brick='#956b58',pale='#dfc2a3',dark='#2f303c';
   const cx=2.43,cz=5.39,bw=2.67,bd=2.18,front=cz+bd/2;
   const y0=.22,roofY=3.04;
   // Compact elevated paved footprint with a right-hand beer garden.
   block('#cabfae',2.95,.115,5.42,4.02,.16,2.76,'stone');
   block('#e0d3ba',cx,.20,5.40,bw+.15,.07,bd+.13,'stone');
   block('#8b6557',cx,1.69,cz,bw,2.96,bd,'stone');
   block(wall,cx,1.67,front+.017,bw-.09,2.81,.035,'stone');
   // Brick quoins, sandstone pilasters and coursed old-town masonry.
   for(const edge of [cx-bw/2+.12,cx+bw/2-.12]){
    block(pale,edge,1.63,front+.05,.17,2.93,.11,'stone');
    for(let y=.38;y<2.90;y+=.31)
     block('#be9a79',edge,y,front+.118,.195,.045,.045,'stone');
   }
   for(let y=.40;y<2.93;y+=.23){
    block(y%2>.12?'#b18b74':'#c3a083',cx,y,front+.056,bw-.24,.026,.028,'stone');
    for(let i=0;i<5;i++){
     const x=cx-bw*.44+(i+.5)*bw*.88/5+(Math.floor(y*10)%2?.07:0);
     block('#bd9984',x,y+.103,front+.075,.023,.17,.021,'stone');
    }
   }
   // Rich pitched charcoal slate roof with a projecting front gable.
   gable('#2e3643',cx,cz,bw+.25,bd+.34,roofY,.69);
   for(let i=0;i<12;i++){
    const x=cx-bw*.50+(i+.5)*bw/12;
    block(i%2?'#526072':'#3d4757',x,roofY+.12,front+.20,.045,.08,.24,'stone');
    block('#aa8b72',x,roofY-.08,front+.16,.029,.10,.037,'stone');
   }
   block('#ddc4a7',cx,roofY-.015,front+.17,bw+.38,.11,.16,'stone');
   // Chimney and rooftop air conditioning provide a believable silhouette.
   block('#aa8875',cx+bw*.33,3.58,cz-.53,.34,.93,.36,'stone');
   block('#393b43',cx+bw*.33,4.10,cz-.53,.45,.11,.47,'stone');
   block('#53616a',cx-bw*.27,3.48,cz-.44,.49,.39,.45,'metal');
   block('#a5adb0',cx-bw*.27,3.71,cz-.44,.45,.06,.41,'metal');
   for(const x of[cx-.39,cx+.40])
    block('#e9bb87',x,3.06,front+.205,.36,.07,.09,'glass',true);
   // Separate arched-looking upper windows with warm interiors.
   for(const x of [cx-.99,cx+.99]){
    for(const y of [1.07,2.21]){
     block('#d8c3a9',x,y,front+.095,.55,.75,.085,'stone');
     block('#395563',x,y,front+.148,.43,.61,.059,'glass');
     block('#f9ce8b',x,y-.08,front+.181,.32,.39,.018,'glass',true);
     block('#ecd2b0',x,y+.37,front+.15,.60,.10,.13,'stone');
     block('#a47b56',x,y-.41,front+.18,.65,.09,.20,'wood');
     block('#668857',x,y-.35,front+.27,.52,.11,.12,'stone');
     for(const off of [-.18,.18])
      block('#d6aa83',x+off,y-.31,front+.33,.065,.06,.09,'stone');
     block('#e3dbbf',x,y,front+.20,.023,.58,.026,'metal');
    }
   }
   // Small high-set stained-glass windows on the visible side elevation.
   for(const z of [cz-.53,cz+.31])for(const x of [cx-bw/2-.045,cx+bw/2+.045]){
    block('#d6c1a1',x,1.73,z,.09,.67,.40,'stone');
    block('#476476',x+(x>cx?.057:-.057),1.73,z,.025,.54,.29,'glass');
    block('#eec994',x+(x>cx?.078:-.078),1.61,z,.014,.23,.19,'glass',true);
   }
   // Front door, framed double-leaf timber entrance and purple awning.
   block('#e1cbb0',cx,.93,front+.12,.92,1.43,.14,'stone');
   block('#302e34',cx,.89,front+.206,.75,1.26,.06,'wood');
   for(const x of [cx-.17,cx+.17]){
    block('#6d4b3f',x,.87,front+.253,.30,1.13,.037,'wood');
    block('#6b8f95',x,1.05,front+.280,.21,.50,.016,'glass');
    block('#ffe5a9',x,1.04,front+.290,.12,.30,.010,'glass',true);
   }
   for(const x of [cx-.075,cx+.075])block('#d5af67',x,.69,front+.293,.023,.18,.026,'metal');
   block('#522c66',cx,1.69,front+.39,1.07,.15,.68,'wood');
   block('#7b428f',cx,1.62,front+.70,1.09,.10,.16,'stone');
   for(let i=0;i<9;i++)
    block(i%2?'#a46b9e':'#713d80',cx-.48+i*.12,1.62,front+.72,.105,.028,.08,'wood');
   block('#a07859',cx,.26,front+.45,1.23,.12,.62,'stone');
   block('#e7d0a8',cx,.18,front+.79,1.13,.075,.20,'stone');
   for(const x of [cx-.56,cx+.56]){
    block('#463b3c',x,1.53,front+.18,.11,.45,.11,'metal');
    block('#ffd09a',x,1.53,front+.26,.085,.23,.12,'glass',true);
    block('#c19b78',x,1.78,front+.22,.14,.08,.12,'metal');
   }
   // True legible local 3D sign, built from in-world batched pixel glyphs.
   const glyph={
    L:['100','100','100','100','111'],
    O:['111','101','101','101','111'],
    C:['111','100','100','100','111'],
    A:['010','101','111','101','101'],
    P:['110','101','110','100','100'],
    U:['101','101','101','101','111'],
    B:['110','101','110','101','110']
   };
   const signText=(word,cy,cell)=>{
    const span=word.length*4-1,start=cx-span*cell/2;
    for(let k=0;k<word.length;k++)for(let row=0;row<5;row++)
     for(let col=0;col<3;col++)if(glyph[word[k]][row][col]==='1'){
      const x=start+(k*4+col)*cell,yy=cy+(2-row)*cell;
      block('#d9ae75',x,yy,front+.237,cell*.83,cell*.83,.019,'metal');
      block('#ffe0a0',x,yy,front+.251,cell*.60,cell*.60,.013,'glass',true);
     }
   };
   block('#29323c',cx,2.51,front+.177,1.89,.86,.13,'metal');
   block('#b48d5b',cx,2.51,front+.243,1.94,.027,.024,'metal');
   for(const y of[2.096,2.932])
    block('#c4a06a',cx,y,front+.242,1.90,.034,.027,'metal');
   for(const x of[cx-.96,cx+.96])
    block('#c4a06a',x,2.51,front+.242,.034,.86,.027,'metal');
   signText('LOCAL',2.71,.082);
   signText('PUB',2.28,.108);
   // A gold crown/crest centred above the sign.
   for(let i=-2;i<=2;i++)
    block('#f0c787',cx+i*.070,3.0+(.07*(i%2===0?1:0)),front+.256,.052,.093,.023,'metal');
   // Round projected beer-mug sign with a hanger above the side terrace.
   const signX=3.93,signZ=6.31;
   block('#a57e59',3.80,2.20,signZ,.27,.055,.13,'metal');
   block('#5b4851',signX,2.01,signZ,.085,.39,.08,'metal');
   const pp=point(signX,signZ);
   batch.add(CYL_SMOOTH,'#322e3b',pp.x-.5,1.80,pp.y-.5,.275,.095,.275,Math.PI/2,turn,0,id,false,'metal');
   block('#f3d8a2',signX,1.79,signZ+.070,.19,.22,.026,'metal');
   block('#e9be81',signX+.114,1.80,signZ+.079,.055,.12,.032,'glass',true);
   for(const x of[signX-.05,signX,signX+.05])
    block('#fff3cd',x,1.67,signZ+.083,.025,.035,.022,'glass',true);
   // Paved side beer garden: timber pergola, cafe tables and warm lamps.
   const pu=4.44,pv=5.43,pw=.90,pd=2.18;
   block('#bb9470',pu,.23,pv,pw,.09,pd,'wood');
   for(let i=0;i<10;i++)
    block(i%2?'#caa77e':'#ae835f',pu,.286,pv-pd/2+(i+.5)*pd/10,pw-.05,.014,pd/10-.025,'wood');
   const corners=[[pu-.39,pv-.95],[pu+.39,pv-.95],[pu-.39,pv+.95],[pu+.39,pv+.95]];
   for(const [x,z] of corners){
    pole('#705449',x,.88,z,.034,1.26,'wood');
    block('#edc691',x,1.51,z,.13,.065,.12,'glass',true);
   }
   for(const z of[pv-.98,pv+.98])
    block('#745746',pu,1.55,z,pw+.05,.09,.07,'wood');
   for(const x of[pu-.40,pu+.40])
    block('#745746',x,1.55,pv,.07,.09,pd+.04,'wood');
   for(let i=0;i<7;i++){
    const z=pv-.83+i*.27;
    block('#ffe4b1',pu,1.44,z,.071,.055,.071,'glass',true);
   }
   for(const z of[pv-.47,pv+.42]){
    pole('#735343',pu,.39,z,.038,.38,'wood');
    pole('#d7b688',pu,.60,z,.23,.045,'wood');
    for(const side of[-1,1]){
     const x=pu+side*.29;
     block('#76523d',x,.41,z,.26,.055,.19,'wood');
     for(const dx of[-.09,.09])block('#584c43',x+dx,.25,z,.026,.30,.025,'metal');
    }
    pole('#fff0bc',pu,.66,z,.041,.08,'glass',true);
   }
   // Flower tubs and hedge borders, low enough not to obstruct the side drive.
   for(const x of[1.02,4.96]){
    block('#a18d76',x,.25,6.53,.24,.25,.26,'stone');
    block('#548255',x,.49,6.53,.28,.28,.28,'stone');
    block('#e0aabb',x,.65,6.53,.12,.07,.11,'stone');
   }
   for(const z of[4.25,4.73,5.21,5.69,6.17]){
    block('#8aa46f',4.96,.23,z,.14,.29,.34,'stone');
    block('#537751',4.96,.44,z,.15,.15,.30,'stone');
   }
   // Edged lantern-lit path to the door, kept clear of the one-way connector.
   block('#d0bfa9',cx,.15,6.88,.79,.042,.42,'stone');
   for(const x of[cx-.49,cx+.49]){
    block('#9c8a7c',x,.24,6.81,.19,.26,.18,'stone');
    block('#f6d9a4',x,.41,6.81,.13,.085,.13,'glass',true);
   }
   // Four complete elevations for the hand-built small pub.
   // Rear service door is away from the front party terrace; both sides have
   // brick details, asymmetric windows and working-looking fixtures.
   const rearWall=cz-bd/2;
   for(let row=0;row<11;row++){
    const yy=.36+row*.232;
    block(row%2?'#8f685c':'#ab836b',cx,yy,rearWall-.039,bw-.22,.035,.034,'stone');
    for(let j=0;j<6;j++){
     const xx=cx-bw*.42+(j+.5)*bw*.84/6+(row%2?.06:0);
     block('#c6a38b',xx,yy+.113,rearWall-.045,.026,.16,.026,'stone');
    }
   }
   const kitchenX=cx-bw*.22;
   block('#d5c3a8',kitchenX,.86,rearWall-.08,.62,1.19,.10,'stone');
   block('#715247',kitchenX,.83,rearWall-.14,.50,1.05,.053,'wood');
   block('#e5c08a',kitchenX+.16,.81,rearWall-.184,.033,.095,.025,'metal');
   block('#b8b0a0',kitchenX,.17,rearWall-.28,.72,.072,.31,'stone');
   // An upstairs rear window with glowing amber light.
   for(const xx of[cx+.35,cx+.89]){
    block('#bda88b',xx,2.17,rearWall-.094,.39,.56,.083,'stone');
    block('#556879',xx,2.17,rearWall-.150,.30,.45,.048,'glass');
    block('#f9d9a4',xx,2.08,rearWall-.185,.20,.24,.014,'glass',true);
    block('#e4cab0',xx,1.85,rearWall-.21,.46,.08,.14,'stone');
   }
   const sideLeft=cx-bw/2,sideRight=cx+bw/2;
   for(const side of[-1,1]){
    const sx=side<0?sideLeft:sideRight;
    for(let k=0;k<2;k++){
     const zz=cz-.47+k*.75;
     block('#d6bea2',sx+side*.058,1.24,zz,.11,.72,.41,'stone');
     block('#456378',sx+side*.109,1.24,zz,.055,.61,.30,'glass');
     block('#eec48e',sx+side*.145,1.13,zz,.017,.27,.23,'glass',true);
     for(const y of[.92,1.54])
      block('#d2b89b',sx+side*.149,y,zz,.021,.044,.46,'stone');
    }
    block('#bda083',sx+side*.083,2.53,cz,.12,.11,bd*.83,'stone');
    for(let k=0;k<4;k++){
     const zz=cz-bd*.32+k*bd*.21;
     block('#896f5f',sx+side*.11,2.64,zz,.12,.17,.038,'wood');
    }
    block('#9f866a',sx+side*.12,.34,cz-.77,.23,.19,.28,'stone');
    block('#628060',sx+side*.13,.50,cz-.77,.26,.15,.23,'stone');
   }
   // Side A has a lit projecting room sign; side B has an outdoor lantern.
   block('#775249',sideLeft-.17,2.31,cz+.49,.27,.052,.11,'metal');
   block('#f2c995',sideLeft-.29,2.10,cz+.49,.044,.25,.23,'glass',true);
   block('#4a4e56',sideRight+.14,1.83,cz-.45,.16,.39,.13,'metal');
   block('#ffdfb3',sideRight+.21,1.82,cz-.45,.092,.25,.075,'glass',true);
   // Slated shingles on the visible side slopes. These are short rows rather
   // than a blank roof prism, without adding dynamic lights to the scene.
   for(const side of[-1,1])for(let i=0;i<7;i++){
    const sx=cx+side*(.18+i*.15);
    for(let j=0;j<7;j++){
     const zz=cz-bd*.37+j*bd*.125;
     block((i+j)%2?'#3f4959':'#525b69',sx,roofY+.31-i*.035,zz,.125,.025,.18,'stone');
    }
   }
   // Rear terrace planting sits outside parking paint and away from the gate.
   for(const x of[cx-.93,cx+.98]){
    block('#b09a83',x,.21,rearWall-.16,.27,.25,.19,'wood');
    block('#67845c',x,.42,rearWall-.16,.24,.19,.20,'stone');
   }
   return;
  }

  // Dedicated architecture pod; parking logic and markings are independent.
  // All walls remain ahead of the parking courts and between the side drives.
  if(t.plannedParking){
   const level=t.modelTier||1,u=t.plotWidth*.5;
   // Model follows the actual 50% front parcel, not the size label.
   const zoneStart=t.parkingZoneDepth,zoneDepth=t.buildingZoneDepth;
   const d=zoneDepth>=6?4.25:1.96,v=zoneStart+.22+d/2;
   const w=Math.min(t.plotWidth-2.95,level===1?4.45:level===2?6.15:7.45);
   const colors={
    home:['#e6d9c8','#e9e5dc','#ede9e2'],office:['#c8dbe0','#c4d8e0','#d5e5e6'],
    factory:['#d2d6cf','#c8d0c8','#bec9c9'],shop:['#e8cdaa','#d9ddd0','#d6e3de'],
    restaurant:['#f0d4b6','#e0c6ae','#e9cfbc'],mall:['#d9e7db','#d1e2df','#d9e8e8'],
    park:['#8fb88a','#8abb89','#81ab81'],pub:['#5c536c','#4c536b','#3f4158']
   };
   const trim={home:'#987b65',office:'#56899b',factory:'#718e8d',shop:'#c29a67',
    restaurant:'#b78d68',mall:'#4e979a',park:'#dfd6b5',pub:'#b987d4'}[kind];
   const h=kind==='office'?2.5+level*.85:kind==='factory'?1.5+level*.42:
    kind==='home'?1.5+level*.57:kind==='mall'?2.1+level*.53:1.6+level*.47;
   const front=v+d/2;
   // Fill the entire useful building parcel with landscaped ground up to the
   // real frontage road; never leave the former white apron behind the bays.
   const gardenEnd=t.frontageV-.46,gardenDepth=Math.max(.1,gardenEnd-zoneStart);
   block('#8fa88b',u,.048,zoneStart+gardenDepth/2,t.plotWidth-1.74,.045,gardenDepth,'stone');
   block('#c6cebf',u,.11,v,t.plotWidth-2.3,.14,d+.40,'stone');
   block('#e7e4d9',u,.21,v+.08,w+.40,.07,d+.16,'stone');
   if(kind==='park'){
    block('#7fb18b',u,.24,v,t.plotWidth-2.55,.08,3.2);
    block('#e4d6bd',u,.30,v,t.plotWidth-2.70,.04,.29,'stone');
    block('#e4d6bd',u,.30,v,.3,.04,3.12,'stone');
    pole('#dedcce',u,.47,v,.54,.37,'stone');
    pole('#75acc2',u,.70,v,.42,.06,'water');
    for(const side of[-1,1]){
     const x=u+side*w*.34;
     block('#bda47f',x,.75,v,1.12,.15,.97,'wood');
     block('#e2e8d4',x,1.22,v,1.28,.12,1.12,'stone');
     planted(x,v-1,.34+level*.05);planted(x,v+1,.30+level*.05);
     lantern(x,v+.66);
    }
    return;
   }
   block(colors[kind][level-1],u,.24+h/2,v,w,h,d,'stone');
   if(kind==='home'){
    block('#f1e8db',u-w*.30,.26+h*.46,v-.15,w*.31,h*.85,d*.82,'stone');
    block('#75a6b5',u+w*.18,.65+h*.35,front+.07,w*.39,h*.45,.06,'glass');
    block('#ffe5b2',u+w*.18,.69+h*.34,front+.11,w*.26,h*.23,.018,'glass',true);
    block(trim,u,h+.37,v,w+.25,.16,d+.26,'wood');
    if(level>1)block('#d6dace',u,h*.73,front+.27,w*.75,.11,.45,'stone');
   }else if(kind==='factory'){
    block('#70858a',u,h+.30,v,w+.27,.15,d+.19,'metal');
    for(let i=0;i<3;i++){
     const x=u+(i-1)*w*.3;
     block('#b4d7d9',x,h+.42,v,.35,.07,d*.78,'glass');
     block('#879a9e',x,.79,front+.09,w*.22,1.06,.09,'metal');
    }
    block('#a2b5b5',u+w*.32,h+.56,v-.42,.4,.5,.4,'metal');
   }else{
    const count=kind==='mall'?level*4+3:kind==='shop'?level*3+2:level*2+4;
    const floors=kind==='office'?level+2:kind==='mall'?level+1:level>1?2:1;
    for(let row=0;row<floors;row++)for(let i=0;i<count;i++){
     const x=u-w*.47+(i+.5)*w*.94/count;
     const y=.62+(h-.35)*(row+.5)/floors;
     block(kind==='pub'?'#7661a5':'#7baaba',x,y,front+.062,w*.76/count,
      Math.min(.52,(h-.34)/floors*.68),.058,'glass');
     if(i%3===0)block(kind==='pub'?'#e2a4fb':'#ffe2b8',x,y-.05,front+.096,w*.56/count,.15,.016,'glass',true);
    }
    block(kind==='pub'?'#313249':'#e8e7db',u,h+.34,v,w+.27,.18,d+.2,'stone');
    if(kind==='mall'){
     block('#6fa7ad',u,h+.49,v,w*.63,.22,d*.42,'glass');
     block('#e7e9e4',u,h+.64,v,w*.69,.06,d*.47,'stone');
    }
    if(kind==='shop'||kind==='restaurant'){
     const bays=level===3?5:level===2?3:2;
     for(let i=0;i<bays;i++){
      const x=u-w*.43+(i+.5)*w*.86/bays;
      block(kind==='restaurant'?'#b98762':'#d3aa6c',x,1.35,front+.24,w*.80/bays,.13,.54,'wood');
      block('#d0ecdf',x,.79,front+.084,w*.67/bays,.84,.08,'glass');
     }
    }
    if(kind==='pub'){
     for(const x of [u-w*.46,u+w*.46])block('#bf83d4',x,h*.57,front+.16,.075,h*.74,.09,'glass',true);
     block('#d59eee',u,h+.43,front+.24,w*.54,.09,.16,'glass',true);
    }
    if(kind==='office')for(const x of [u-w*.35,u+w*.35])
     block('#e8f0eb',x,h*.52,front+.077,.05,h*.73,.07,'metal');
   }
   // Visible main entrance, covered drop-off and landscape lighting.
   block('#c5dfdf',u,.86,front+.17,1.19,1.19,.10,'glass');
   block('#ffe0b3',u,.89,front+.23,.82,.67,.024,'glass',true);
   block(trim,u,1.58,front+.29,2.10,.15,.64,'stone');
   block('#d6cbbc',u,.19,front+.57,2.0,.09,.56,'stone');
   for(const side of [-1,1]){
    const x=u+side*(w*.5+.22);
    planted(x,v+.70,.29+level*.06);
    lantern(x,v+1.12,kind==='pub'?'#ecc4fa':'#ffe2b7',.79);
   }
   return;
  }

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
  // Shared foundations/gardens belong only to classic building models.
  // The grand villa has a dedicated plot plan; drawing these underneath it
  // used to put lawn, masonry and trees THROUGH the four parking rows.
  if(b.key!=='home_grand'){
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

  if(b.key==='home_grand'){
   // Street-front villa with a fully landscaped forecourt. Keep all visual
   // elements inside the plot and clear of the left entry / right exit lanes.
   const u=W*.5,v=9.42,scale=.87;
   const disc=(color,yy,r,hh,finish='stone',glow=false)=>{
    const p=point(u,v);
    batch.add(CYL_SMOOTH,color,p.x-.5,yy,p.y-.5,r*scale,hh,r*scale,0,0,0,id,glow,finish);
   };
   // Replace the blank white apron with a podium terrace and side courts.
   block('#d7d2c7',u,.06,v+.18,8.85,.10,4.95,'stone');
   block('#e8e1d5',u,.11,v+.38,7.95,.04,4.05,'stone');
   block('#d0cabd',u,.03,v-1.20,6.10,.07,1.10,'stone');
   // Left reflecting pool court.
   block('#dde3dd',u-3.24,.10,v+.06,1.88,.10,2.16,'stone');
   block('#65a8b9',u-3.24,.17,v+.06,1.52,.04,1.80,'water');
   block('#cce6ea',u-3.24,.19,v+.06,1.18,.010,1.46,'water');
   // Right family court with small playground.
   block('#ddd7c9',u+3.18,.10,v+.12,1.98,.10,2.26,'stone');
   block('#7c9f72',u+3.18,.15,v+.12,1.62,.03,1.90,'stone');
   // Rear pocket gardens and low hedges.
   for(const [x,z,w,d] of [[u-1.88,v-1.28,1.34,.52],[u+1.88,v-1.28,1.34,.52],[u,v-1.62,2.22,.44]]){
    block('#6f9770',x,.18,z,w,.09,d,'stone');
    block('#89ae7f',x,.24,z,w-.12,.06,d-.10,'stone');
   }
   for(const [x,z,s] of [[u-4.18,v-1.34,.62],[u-3.76,v+1.48,.54],[u+4.02,v-1.22,.62],[u+3.68,v+1.52,.54],[u-2.46,v-2.08,.46],[u+2.52,v-2.08,.46]])planted(x,z,s);
   // Main circular building.
   disc('#c9c4b8',.12,2.79,.17,'stone');
   disc('#ede5d7',.35,2.65,.30,'stone');
   disc('#eee7de',1.75,2.51,2.67,'stone');
   for(const [y,h] of [[.96,.72],[1.90,.75],[2.82,.57]]){
    disc('#6e9eaa',y,2.555,h,'glass');
    disc('#ffd7a1',y+.03,2.34,h*.19,'glass',true);
    disc('#bfd7db',y+h*.30,2.563,.068,'glass');
   }
   // Continuous curved balconies and cream horizontal floor rings.
   for(const y of [.57,1.46,2.39,3.23]){
    disc('#e8e2d7',y,2.69,.09,'stone');
    disc('#af9d86',y+.07,2.625,.032,'metal');
   }
   for(let i=0;i<24;i++){
    const a=2*Math.PI*i/24,x=u+2.54*scale*Math.sin(a),z=v+2.54*scale*Math.cos(a);
    const p=point(x,z);
    batch.add(CYL,'#e2dfd5',p.x-.5,1.82,p.y-.5,.044,2.57,.044,0,0,0,id,false,'stone');
   }
   // Tiered domed skylight with warm daytime stone and discreet trim.
   disc('#e9e4dc',3.38,2.82,.20,'stone');
   disc('#6f8288',3.49,2.52,.075,'metal');
   disc('#f2eae0',3.60,2.31,.18,'stone');
   disc('#95c0c9',3.79,1.05,.32,'glass');
   disc('#fff0c3',3.80,.78,.12,'glass',true);
   disc('#eae6dc',4.00,1.13,.09,'stone');
   // Public arrival entrance faces the road (positive local v).
   block('#537e8e',u,.80,v+2.53*scale,1.26,1.18,.055,'glass');
   block('#ffe2b0',u,.81,v+2.58*scale,.94,.72,.018,'glass',true);
   block('#f3e9d9',u,1.52,v+2.60*scale,1.65,.11,.29,'stone');
   block('#bea386',u,1.60,v+2.60*scale,1.62,.048,.30,'metal');
   block('#e7dfd3',u,.11,v+2.76*scale,1.33,.055,.19,'stone');
   block('#d8d0c3',u,.12,v+2.14,2.02,.07,.74,'stone');
   block('#e8dfd2',u,.18,v+2.33,1.62,.05,.52,'stone');
   // Shorter lamps are pulled inward so they never block the entry lane.
   for(const x of [u-.92,u+.92]){
    lantern(x,v+1.96,'#ffe2b4',.68);
    block('#dacdb9',x,.17,v+2.10,.34,.12,.24,'stone');
    block('#6f9a75',x,.27,v+2.10,.28,.09,.18,'stone');
   }
   // Wall lights beside the front door.
   for(const x of [u-.56,u+.56])block('#ffd9a6',x,1.04,v+2.53*scale,.09,.18,.05,'glass',true);
   // Gate island sign: low, illuminated, and clear of both drive lanes.
   const gateIslandZ=12.34;
   block('#d8cfbf',u,.12,gateIslandZ,2.48,.12,.60,'stone');
   block('#efe6d8',u,.18,gateIslandZ,2.24,.05,.42,'stone');
   block('#6f8c77',u,.24,gateIslandZ,1.88,.10,.24,'stone');
   block('#c69b72',u,.28,gateIslandZ,1.18,.06,.07,'wood');
   block('#314754',u,.60,gateIslandZ-.02,1.18,.40,.14,'metal');
   block('#e8f2f0',u,.62,gateIslandZ+.055,.94,.18,.026,'glass',true);
   block('#fff1c8',u,.62,gateIslandZ+.073,.72,.09,.01,'glass',true);
   for(const x of [u-.42,u+.42]){
    block('#c8bea9',x,.12,gateIslandZ+.15,.20,.08,.20,'stone');
    block('#ffdba8',x,.21,gateIslandZ+.15,.11,.05,.11,'glass',true);
   }
   // Small play set and loungers add life to both side courts.
   pole('#c7b08a',u+3.56,.48,v+.06,.045,.72,'wood');
   pole('#c7b08a',u+2.92,.48,v+.06,.045,.72,'wood');
   block('#b49267',u+3.24,.84,v+.06,.74,.05,.06,'wood');
   block('#86a6c4',u+3.03,.42,v+.36,.24,.06,.58,'metal');
   block('#d9b764',u+3.22,.27,v-.18,.52,.05,.18,'wood');
   block('#d7d7d0',u-3.36,.26,v-.58,.56,.06,.24,'stone');
   block('#d7d7d0',u-2.96,.26,v-.34,.56,.06,.24,'stone');
   return;
  }

  if(b.key==='home_dual'){
   // Purpose-built compact 60-unit residence. Three flat-roof wings live
   // entirely above the parking band, without extending over the driveway.
   block('#d4d5cc',W*.5,.115,2.85,W-1.55,.14,4.2,'stone');
   for(let wing=0;wing<3;wing++){
    const u=3.55+wing*6.18,z=2.47,w=4.85,d=3.54;
    block('#d9d8d0',u,1.47,z,w,2.47,d,'stone');
    block('#e6e6dc',u,2.78,z,w+.18,.14,d+.2,'stone');
    block('#576f77',u,2.88,z,w+.02,.07,d+.04,'metal');
    block('#7fabae',u,1.55,4.28,w*.83,1.25,.065,'glass');
    for(let col=0;col<4;col++){
     const x=u-w*.38+col*w*.25;
     for(const level of [.88,1.98]){
      block('#b2d2d5',x,level,4.33,.60,.43,.036,'glass');
      block('#e6e7dc',x,level-.29,4.40,.70,.053,.065,'stone');
     }
    }
    block('#c1af92',u,2.26,4.46,w*.88,.10,.15,'wood');
    block('#d6d8cb',u,2.40,4.51,w*.85,.06,.06,'stone');
    for(const side of [-1,1])block('#69797a',u+side*w*.45,2.44,4.48,.055,.19,.06,'metal');
   }
   // Mark the sole internal street and two separate exits with lighting.
   for(const x of [1,6,11,16]){
    // Keep the light fixtures on the building edge, away from the upper bay.
    pole('#778482',x,.52,4.72,.028,.98,'metal');
    block('#f1e2b4',x,1.05,4.72,.20,.07,.20,'glass',true);
   }
   return;
  }
  if(tier>=2){
   // Designed compounds: a recognisable anchor building and outdoor rooms.
   // Architecture stays in the original building strip above the parking lot.
   const L=1.22,R=W-1.22,A=R-L,mid=W/2,ground=.21;
   const brick='#965e48',cream='#e9e1d2',oak='#a77d54',charcoal='#303c40',glass='#507d89';
   const slab=(u,v,w,d,y=.22,c='#d4c6af')=>block(c,u,y,v,w,.07,d,'stone');
   const solid=(u,v,w,d,h,c=cream,y=ground)=>block(c,u,y+h/2,v,w,h,d,'stone');
   const roofCap=(u,v,w,d,y,c='#d8d4c6')=>{
    block(c,u,y,v,w+.12,.12,d+.12,'stone');
    block('#717c75',u,y+.075,v,w-.12,.035,d-.12,'metal');
    for(const q of [-1,1])block(c,u+q*(w/2-.045),y+.18,v,.09,.20,d,'stone');
    block(c,u,y+.18,v-d/2+.045,w,.20,.09,'stone');
   };
   const plant=(u,v,w=.55)=>{
    block('#d5ccba',u,.32,v,w,.24,.38,'stone');
    block('#5d815c',u,.49,v,w*.88,.18,.31);
   };
   const steps=(u,v,w)=>{
    for(let j=0;j<3;j++)block('#d6cdbb',u,.10+j*.045,v-j*.10,w-j*.06,.08,.18,'stone');
   };
   const chair=(u,v,back=1)=>{
    block(oak,u,.39,v,.23,.065,.23,'wood');
    for(const dx of [-.085,.085])block(charcoal,u+dx,.25,v,.025,.25,.19,'metal');
    block(oak,u,.55,v+back*.105,.23,.28,.035,'wood');
   };
   const dining=(u,v,umbrella=false)=>{
    pole('#4e5e59',u,.44,v,.035,.42,'metal');
    pole('#d8ba8b',u,.68,v,.27,.065,'wood');
    chair(u,v-.39,-1);chair(u,v+.39,1);
    if(umbrella){
     pole('#8b765c',u,1.05,v,.019,1.35,'metal');
     const p=point(u,v);batch.add(CONE,kind==='pub'?'#b4866b':'#e3d3ad',p.x-.5,1.75,p.y-.5,.62,.22,.62,0,turn,0,id,false,'stone');
     pole('#b29e78',u,1.90,v,.034,.09,'metal');
    }
   };
   const sofa=(u,v,w=1.05)=>{
    block('#bca48b',u,.40,v,w,.25,.38,'stone');
    block('#d7c9ac',u,.64,v-.16,w,.30,.09,'stone');
    for(const q of [-1,1])block('#a68970',u+q*w*.47,.53,v,.10,.35,.43,'wood');
    slab(u,v+.52,w*.60,.27,.43,oak);
   };
   const pergola=(u,v,w,d,y=1.8)=>{
    for(const q of [-1,1])for(const p of [-1,1])solid(u+q*w*.47,v+p*d*.43,.055,.055,y-ground,oak);
    for(const q of [-1,1])block(oak,u+q*w*.47,y,v,.085,.12,d+.10,'wood');
    const n=Math.max(4,Math.ceil(w/.25));
    for(let i=0;i<=n;i++)block('#b18b61',u-w/2+w*i/n,y+.08,v,.065,.085,d+.14,'wood');
   };
   const facade=(u,v,w,d,h,floors=1,c=glass)=>{
    for(let floor=0;floor<floors;floor++){
     const yy=ground+.42+floor*.81,wh=Math.min(.59,h-.24-floor*.81);
     if(wh<.2)continue;
     for(const side of [-1,1]){
      const zz=v+side*(d/2+.025);
      block(c,u,yy+.12,zz,w*.86,wh,.045,'glass');
      const n=Math.max(2,Math.ceil(w/.62));
      for(let j=0;j<=n;j++)block('#c4c6b8',u-w*.43+w*.86*j/n,yy+.12,zz+side*.028,.035,wh+.07,.035,'metal');
      block('#e4ddcb',u,yy-wh*.5+.09,zz,w*.91,.07,.13,'stone');
     }
     for(const side of [-1,1]){
      block(c,u+side*(w/2+.025),yy+.12,v,.04,wh,d*.73,'glass');
      for(const z of [-.30,0,.30])block('#c4c6b8',u+side*(w/2+.05),yy+.12,v+z*d,.035,wh+.08,.035,'metal');
     }
    }
   };
   const glyphs={M:['101','111','111','101','101'],P:['110','101','110','100','100'],U:['101','101','101','101','111'],B:['110','101','110','101','110'],
    D:['110','101','101','101','110'],I:['111','010','010','010','111'],N:['101','111','111','111','101'],E:['111','100','110','100','111'],
    S:['111','100','111','001','111'],H:['101','101','111','101','101'],O:['111','101','101','101','111'],T:['111','010','010','010','010'],
    L:['100','100','100','100','111'],C:['111','100','100','100','111'],A:['010','101','111','101','101'],F:['111','100','110','100','100']};
   const sign=(word,u,y,v,w,bg=charcoal,fg='#eed7a0')=>{
    const cell=w/(word.length*4+1),hh=cell*7;
    block(bg,u,y,v,w,hh,.10,'wood');
    for(let i=0;i<word.length;i++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)
     if(glyphs[word[i]]?.[row][col]==='1'){
      const x=u-w/2+cell*(1.5+i*4+col),yy=y+cell*(2-row);
      block(fg,x,yy,v+.06,cell*.83,cell*.83,.018,'metal');
      block(fg,x,yy,v+.072,cell*.73,cell*.73,.012,'glass',true);
     }
   };
   const entry=(u,v,w=1,y=1.45)=>{
    block('#2a454b',u,.76,v,w*.65,1.04,.065,'glass');
    for(const dx of [-.08,.08])block('#d4bb83',u+dx,.73,v+.055,.025,.24,.03,'metal');
    block('#b3956d',u,y,v+.19,w,.12,.48,'wood');steps(u,v+.43,w);
   };
   const courtyard=(u,w,covered=false)=>{
    slab(u,s*.60,w,s*.60,.20,kind==='pub'?'#b49c7b':'#d9c8a9');
    for(let z=s*.36;z<s*.85;z+=.23)block('#bfaa8b',u,.245,z,w,.012,.012,'wood');
    if(w>2.2){dining(u-w*.23,s*.55,!covered);dining(u+w*.23,s*.55,false);}
    else dining(u,s*.53,false);
    plant(u-w*.38,s*.87,.42);plant(u+w*.38,s*.87,.42);
    lantern(u+w*.40,s*.29,'#ffd99c',1.55);
   };
   // The front walk is a slim shared path; individual foundations stay separate.
   slab(mid,s*.91,A,.22,.15,'#ddd4c2');
   if(kind==='home'&&!isHotel){
    // Two/three storey urban residence, floating balconies and a sunken garden.
    const w=A*.55,u=L+w/2+.12,d=s*.47,z=s*.34,h=tier===3?2.75:1.95;
    solid(u,z,w,d,h,cream);facade(u,z,w,d,h,tier===3?3:2);
    roofCap(u,z,w,d,h+ground);
    const aw=A*.31,ax=R-aw/2-.12,az=s*.48,ad=s*.43;
    solid(ax,az,aw,ad,1.13,'#b09a80');facade(ax,az,aw,ad,1.13,1);
    roofCap(ax,az,aw,ad,1.35,cream);
    // Upper floor steps back, with a continuous glazed balcony in front.
    const f=z+d/2;
    slab(u,f+.17,w+.12,.38,1.18,cream);
    block('#9bb9bb',u,1.43,f+.34,w*.92,.36,.035,'glass');
    for(const q of [-1,1])block('#dedacd',u+q*w*.46,1.44,f+.34,.035,.42,.035,'metal');
    for(let i=0;i<5;i++)block('#957654',u-w*.39+i*w*.065,1.25,f+.03,.045,1.85,.11,'wood');
    entry(u+w*.20,f+.06,Math.min(.85,w*.63),1.10);
    if(tier===3){
     slab(u+w*.10,f+.16,w*.77,.36,2.02,cream);
     block('#9bb9bb',u+w*.10,2.27,f+.32,w*.73,.34,.035,'glass');
     block('#b69e7c',u-w*.24,2.19,f+.14,.35,.24,.20,'wood');
     block('#6b8b5b',u-w*.24,2.36,f+.14,.31,.13,.16);
    }
    for(const q of [-1,1]){
     block('#d8cdb6',u+q*w*.30,h+.44,z-d*.28,w*.20,.24,.26,'stone');
     block('#668a5b',u+q*w*.30,h+.61,z-d*.28,w*.18,.14,.22);
    }
    pergola(ax,az,aw*.83,ad*.72,1.63);sofa(ax,az,Math.min(.72,aw*.72));
    if(tier===3){
     slab(ax,s*.82,aw*.93,.60,.18,cream);
     block('#5ca7b7',ax,.23,s*.82,aw*.82,.035,.45,'water');
     block('#aed8d5',ax,.255,s*.82,aw*.68,.012,.035,'water');
    }else plant(ax,s*.83,aw*.75);
    plant(u-w*.29,s*.81,Math.min(.65,w*.6));
   }else if(kind==='pub'){
    // Brick music hall with a prominent lit marquee; beer gardens flank it.
    const w=Math.min(7.2,A*.40),u=mid,d=s*.52,z=s*.34,h=2.08+(tier-2)*.38,f=z+d/2;
    solid(u,z,w,d,h,'#744a3e');facade(u,z,w,d,h,1,'#283c48');
    roofCap(u,z,w,d,h+.23,'#384347');
    for(let y=.38;y<h;y+=.22)block('#aa7a5b',u,y,f+.028,w*.96,.025,.025,'stone');
    block(charcoal,u,1.12,f+.07,w*.90,1.02,.11,'metal');
    for(const q of [-1,1]){
     block('#46666d',u+q*w*.32,1.10,f+.145,w*.20,.67,.035,'glass');
     for(let j=0;j<4;j++)block(oak,u+q*w*.32-w*.10+j*w*.067,1.1,f+.18,.035,.71,.035,'wood');
     block('#d5a76b',u+q*w*.43,1.42,f+.16,.10,.23,.10,'metal');
     block('#ffcf80',u+q*w*.43,1.42,f+.22,.075,.15,.035,'glass',true);
    }
    entry(u,f+.17,1.28,1.62);
    sign('PUB',u,2.03,f+.20,Math.min(2.10,w*.55),'#293839','#f1c276');
    block('#b58a57',u,h+.37,z,w*.74,.10,d*.74,'metal');
    const sideSpace=(A-w)/2-.40;
    for(const side of [-1,1]){
     const x=mid+side*(w/2+.25+sideSpace/2);
     courtyard(x,sideSpace);
     if(sideSpace>6){
      const lx=x+side*sideSpace*.33,lw=2.35,lz=s*.27,ld=s*.31;
      solid(lx,lz,lw,ld,1.40,'#635247');facade(lx,lz,lw,ld,1.40,1,'#475c62');
      roofCap(lx,lz,lw,ld,1.62,'#434f4b');
      entry(lx,lz+ld/2+.02,.83,1.12);
      dining(x-side*sideSpace*.35,s*.78,false);
      sofa(x+side*sideSpace*.32,s*.81,1.05);
     }
     // Open-front bar has a real counter, back bar shelves, taps and stools.
     const bw=Math.min(3.0,sideSpace*.82),bz=s*.22;
     solid(x,bz-.18,bw,.14,1.4,'#655047');
     for(const y of [.72,1.05])block(oak,x,y,bz-.06,bw*.92,.055,.24,'wood');
     for(let j=0;j<7;j++)pole(j%2?'#597e57':'#b39155',x-bw*.40+j*bw*.13,1.17,bz-.04,.025,.17,'glass');
     solid(x,bz+.24,bw*.86,.34,.62,'#6e5340');
     block('#d7ba88',x,.88,bz+.24,bw*.91,.075,.40,'wood');
     for(const q of [-1,0,1]){
      pole('#3e4b48',x+q*bw*.27,.43,bz+.60,.024,.41,'metal');
      pole('#b89462',x+q*bw*.27,.67,bz+.60,.10,.065,'wood');
     }
     for(const q of [-1,1])solid(x+q*bw*.47,bz,.06,.06,1.45,oak);
     block('#4f5b51',x,1.70,bz,bw+.10,.10,.85,'metal');
     // Warm festoon string kept away from building roofs.
     const span=sideSpace*.83,zz=s*.71;
     for(const q of [-1,1])pole('#665a47',x+q*span/2,1.02,zz,.023,1.68,'metal');
     for(let j=0;j<9;j++){
      const xx=x-span/2+span*j/8,yy=1.87-.15*Math.sin(j/8*Math.PI);
      block('#5f594c',xx,yy,zz,span/8+.01,.016,.016,'metal');
      pole('#ffdba0',xx,yy-.065,zz,.035,.07,'glass',true);
     }
    }
   }else if(kind==='restaurant'){
    // Low terracotta kitchen, glazed dining wings and shaded garden dining.
    const count=tier===3?3:2,pitch=A/count,w=Math.min(6.5,pitch*.66),d=s*.43;
    for(let i=0;i<count;i++){
     const x=L+pitch*(i+.5),z=s*(i===0?.30:.36),f=z+d/2,h=i===0?1.55:1.24;
     solid(x,z,w,d,h,i===0?'#b57b5a':cream);
     facade(x,z,w,d,h,1,'#577a72');
     gable('#a86447',x,z,w+.04,d+.10,h+.22,.47);
     // Recessed timber arcade and deep striped awning.
     block('#8c6447',x,1.25,f+.25,w*.94,.10,.53,'wood');
     for(let j=0;j<Math.max(3,Math.ceil(w/.36));j++){
      const n=Math.max(3,Math.ceil(w/.36));
      block(j%2?'#c3a079':'#e5d6ba',x-w*.47+(j+.5)*w*.94/n,1.33,f+.25,w*.94/n,.055,.50,'stone');
     }
     for(const q of [-1,1])solid(x+q*w*.43,f+.40,.055,.055,1.04,oak);
     sign(i===0?'DINE':'CAFE',x,1.02,f+.08,Math.min(1.5,w*.51),'#526c58','#f3e6bc');
     if(i===0){
      block('#b8b5a5',x-w*.28,h+.70,z-.15,.29,.55,.32,'metal');
      block('#66736b',x-w*.28,h+1,z-.15,.38,.09,.40,'metal');
     }
     for(const q of [-1,1]){dining(x+q*w*.27,s*.78,false);plant(x+q*w*.43,s*.85,.32);}
     if(i<count-1){
      const gx=L+pitch*(i+1),gw=pitch-w-.14;
      if(gw>1.35){courtyard(gx,gw,true);pergola(gx,s*.47,gw*.84,s*.38,1.88);}
     }
    }

   }else if(isHotel){
    // Resort hotel: terracotta guest wings, individual room balconies and
    // a low reception/porte-cochere instead of a curtain-wall office block.
    const wingW=A*.27,wingD=s*.40,back=s*.29,levels=tier===3?3:2,h=levels*.72+.22;
    for(const side of [-1,1]){
     const x=mid+side*A*.34,f=back+wingD/2;
     solid(x,back,wingW,wingD,h,'#e8cba5');
     gable('#9b6049',x,back,wingW+.08,wingD+.10,h+.23,.36);
     const rooms=Math.max(1,Math.floor(wingW/.65));
     for(let floor=0;floor<levels;floor++){
      const yy=.64+floor*.72;
      for(let j=0;j<rooms;j++){
       const xx=x-wingW*.43+wingW*.86*(j+.5)/rooms,bay=wingW*.84/rooms;
       block('#705a48',xx,yy+.07,f+.04,bay*.74,.55,.07,'wood');
       block('#658a8b',xx,yy+.07,f+.085,bay*.58,.45,.035,'glass');
       slab(xx,f+.22,bay*.94,.39,yy-.25,'#f1ddbb');
       block('#b99a74',xx,yy-.01,f+.39,bay*.92,.27,.035,'wood');
       for(const q of [-1,1])block('#d3b48a',xx+q*bay*.44,yy-.01,f+.22,.035,.29,.35,'wood');
       block('#eed8ad',xx,yy+.39,f+.15,bay,.075,.31,'stone');
      }
      for(const sideFace of [-1,1])block('#67878a',x+sideFace*(wingW/2+.025),yy+.07,back,.04,.43,wingD*.53,'glass');
     }
     // Planted bed beneath each wing; pool belongs to the large resort.
     if(tier===3&&side===1){
      slab(x,s*.81,wingW*.94,.58,.18,'#eee0c4');
      block('#53aaba',x,.23,s*.81,wingW*.81,.03,.43,'water');
     }else{plant(x,s*.82,wingW*.72);}
    }
    const rw=A*.32,rz=s*.44,rd=s*.32;
    solid(mid,rz,rw,rd,1.10,'#f0dfc3');
    facade(mid,rz,rw,rd,1.10,1,'#638c8b');
    gable('#a36d50',mid,rz,rw+.08,rd+.12,1.32,.36);
    sign('HOTEL',mid,1.37,rz+rd/2+.10,Math.min(1.7,rw*.92),'#77583e','#f5deb1');
    // Covered arrival court on slender paired pillars.
    const canopyW=Math.min(A*.42,2.8),arrival=s*.74;
    slab(mid,arrival,canopyW,.66,.24,'#d7c6aa');
    for(const q of [-1,1])solid(mid+q*canopyW*.44,arrival+.14,.075,.075,.96,'#d8bd92');
    block('#e8d7b5',mid,1.29,arrival,canopyW+.06,.12,.72,'stone');
    block('#9d7451',mid,1.38,arrival,canopyW*.95,.055,.64,'wood');
    entry(mid,rz+rd/2+.06,Math.min(.72,rw*.70),1.03);
   }else if(kind==='office'){
    // Slender staggered glass towers; strong vertical fins and roof crowns.
    const count=tier===3?3:2,pitch=A/count;
    for(let i=0;i<count;i++){
     const x=L+pitch*(i+.5),w=Math.min(3.55,pitch*.53),d=s*(i%2?.42:.48),z=s*.35;
     const h=(tier===3?5.75:4.25)-i*.78,f=z+d/2;
     solid(x,z,w,d,h,'#325b70');
     for(let level=0;level<Math.floor(h/.48);level++){
      const yy=.48+level*.48;
      for(const side of [-1,1]){
       block(level%3?'#6f9eac':'#8fb5bd',x,yy,z+side*(d/2+.025),w*.94,.36,.04,'glass');
       block('#a6bbc0',x,yy-.22,z+side*(d/2+.05),w*.98,.035,.045,'metal');
       block('#729da8',x+side*(w/2+.025),yy,z,.035,.36,d*.91,'glass');
      }
     }
     for(const q of [-1,0,1])block('#b6c5c2',x+q*w*.44,h/2+.22,f+.075,.06,h+.10,.10,'metal');
     // Recessed mechanical crown, not a residential balcony or pitched roof.
     block('#d9dfd7',x,h+.27,z,w+.10,.12,d+.10,'metal');
     solid(x-w*.08,z-d*.10,w*.60,d*.61,.50,'#456977',h+.33);
     block('#a7bfc1',x-w*.08,h+.88,z-d*.10,w*.66,.07,d*.66,'metal');
     if(i===0)pole('#a4b1ae',x-w*.12,h+1.22,z-d*.1,.025,.65,'metal');
     const lobbyW=Math.min(pitch*.83,w+1.0);
     solid(x,s*.64,lobbyW,.66,.79,'#526f75');facade(x,s*.64,lobbyW,.66,.79,1);
     block('#d5d5c8',x,1.06,s*.64,lobbyW+.12,.10,.78,'stone');
     entry(x,s*.64+.35,.87,.97);
     plant(x-lobbyW*.35,s*.86,.44);
     if(i<count-1){
      const gx=L+pitch*(i+1);slab(gx,s*.55,pitch-w-.25,s*.44,.17,'#ced2c6');
      planted(gx,s*.35,.48);sofa(gx,s*.73,Math.min(1.15,pitch-w-.40));
     }
    }
   }else if(kind==='mall'){
    // Low shopping complex: round skylit atrium and broad retail anchors.
    const radius=Math.min(1.40,s*.25),z=s*.40;
    pole('#e4ded0',mid,1.00,z,radius,1.55,'stone');
    pole('#5c99a5',mid,1.48,z,radius*1.025,.50,'glass');
    pole('#eee5d3',mid,1.79,z,radius*1.08,.13,'stone');
    const pp=point(mid,z);
    batch.add(CONE,'#9bcbd1',pp.x-.5,2.07,pp.y-.5,radius,.46,radius,0,turn,0,id,false,'glass');
    entry(mid,z+radius+.04,1.30,1.30);
    sign('MALL',mid,1.67,z+radius+.09,1.55,'#4c7c7a','#f4e5b8');
    const wingW=Math.min(9,A*.28),wingD=s*.46;
    for(const side of [-1,1]){
     const x=mid+side*(radius+.40+wingW/2),zz=s*.35,f=zz+wingD/2;
     solid(x,zz,wingW,wingD,1.24,'#e5dfce');
     // Oversized solid upper fascia and colourful individual shopfronts.
     block('#bd9d72',x,1.37,f+.04,wingW*.97,.35,.13,'stone');
     const shops=Math.max(3,Math.floor(wingW/1.25));
     for(let j=0;j<shops;j++){
      const xx=x-wingW*.46+wingW*.92*(j+.5)/shops,bay=wingW*.88/shops;
      block(['#557e79','#bb805a','#718ca0'][j%3],xx,.87,f+.09,bay,.62,.08,'glass');
      block('#e7d4ac',xx,1.22,f+.22,bay,.09,.40,'stone');
      block('#d6e0cd',xx,.84,f+.14,.035,.62,.04,'metal');
     }
     // Broad stepped roof, skylights and roof-top planters.
     block('#f0e8d8',x,1.55,zz,wingW+.14,.14,wingD+.15,'stone');
     for(const q of [-1,1]){
      block('#8fbac0',x+q*wingW*.26,1.70,zz,wingW*.24,.19,wingD*.48,'glass');
      block('#c7bfa3',x+q*wingW*.29,1.70,zz-wingD*.37,wingW*.27,.19,.22,'stone');
      block('#688a5d',x+q*wingW*.29,1.85,zz-wingD*.37,wingW*.25,.15,.18);
     }
     for(const q of [-1,1]){plant(x+q*wingW*.38,s*.86,.55);dining(x+q*wingW*.22,s*.80,false);}
     const outer=side<0?x-wingW/2-L:R-(x+wingW/2);
     if(outer>2){
      const px=side<0?L+outer/2:R-outer/2;
      courtyard(px,Math.min(4.6,outer*.80),true);pergola(px,s*.43,Math.min(3.8,outer*.65),s*.29,1.55);
      if(outer>10)for(const q of [-1,1]){
       const ax=px+q*outer*.29,aw=Math.min(5.4,outer*.26),ad=s*.39,az=s*.35;
       solid(ax,az,aw,ad,1.52,q<0?'#d3bfa0':'#d5ded0');
       block('#f0e9db',ax,1.80,az,aw+.14,.13,ad+.13,'stone');
       block('#85aeb7',ax,.87,az+ad/2+.045,aw*.86,.87,.065,'glass');
       for(let j=0;j<5;j++)block('#e8e0cd',ax-aw*.42+j*aw*.21,.87,az+ad/2+.09,.045,.94,.045,'metal');
       sign('SHOP',ax,1.46,az+ad/2+.13,1.36,q<0?'#a17652':'#5f7e75');
       entry(ax,az+ad/2+.12,1.04,1.20);
       for(const k of [-1,1])plant(ax+k*aw*.35,s*.84,.50);
      }
     }
    }
   }else{
    const count=Math.max(2,Math.min(kind==='office'?5:6,Math.ceil(A/10))),pitch=A/count;
    const w=Math.min(kind==='mall'?8:6.2,pitch*.65),d=s*.51;
    for(let i=0;i<count;i++){
     const x=L+pitch*(i+.5),z=s*(i%2?.38:.32),f=z+d/2;
     if(kind==='office'){
      const h=2.4+(i%3)*.72+(tier-2)*.65;
      solid(x,z,w,d,h,'#bdd0cb');facade(x,z,w,d,h,Math.floor(h/.81));
      roofCap(x,z,w,d,h+.22,'#e3e6da');
      for(const q of [-1,1])block('#c7bda7',x+q*w*.44,h/2+.24,f+.08,.13,h,.12,'stone');
      entry(x,f+.04,1.12);plant(x-w*.27,s*.85,.65);
     }else if(kind==='mall'){
      solid(x,z,w,d,1.9,cream);facade(x,z,w,d,1.9,2);
      roofCap(x,z,w,d,2.11);solid(x,z,w*.51,d*.64,.50,'#82b0b5',2.18);
      block('#e3e7da',x,2.74,z,w*.57,.10,d*.70,'stone');
      entry(x,f+.06,1.55);sign('SHOP',x,1.84,f+.09,1.55,'#456c6c');
     }else if(kind==='factory'){
      solid(x,z,w,d,1.55,'#bbc4b9');gable('#6b8387',x,z,w,d,1.77,.30);
      for(const q of [-1,1]){
       block('#566f75',x+q*w*.25,.80,f+.06,w*.30,1.08,.08,'metal');
       for(let k=0;k<5;k++)block('#9caaa5',x+q*w*.25,.40+k*.19,f+.11,w*.29,.026,.025,'metal');
      }
      pole('#7d8b87',x+w*.31,2.14,z-d*.25,.14,.70,'metal');
     }else{
      solid(x,z,w,d,1.23,i%2?'#d7c4a5':'#b7c8bc');facade(x,z,w,d,1.23,1);
      roofCap(x,z,w,d,1.45);
      block(i%2?'#b58a5f':'#6c8b72',x,1.12,f+.23,w*.94,.10,.53,'wood');
      sign(i%2?'CAFE':'SHOP',x,1.73,f+.05,Math.min(1.6,w*.7),'#4b6758');
      entry(x,f+.03,1,1.08);
     }
     if(i<count-1){
      const gx=L+pitch*(i+1),gw=pitch-w-.16;
      if(gw>1.3){
       if(kind==='factory'){slab(gx,s*.55,gw,s*.43);solid(gx,s*.45,.8,.6,.35,oak);}
       else{courtyard(gx,gw,kind==='mall');if(kind==='mall')pergola(gx,s*.45,gw*.8,s*.32,1.9);}
      }
     }
    }
   }
   for(const u of [L+.15,R-.15]){plant(u,s*.79,.30);lantern(u,s*.87,'#ffdfac',1.10);}
   if(W>=16)for(let u=3;u<W-3;u+=8)lantern(u,t.plotHeight-.16,'#ffe8b8',1.5);
   return;
  }

  // Small buildings retain their original architecture.
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
 makeBuildings(state,CATALOG,KINDS){
  this.disposeGroup(this.buildingGroup);
  const batch=new Batch();this.grandSignalLights=[];
  for(const building of state.buildings.values())this.building(batch,building,CATALOG,KINDS);
  this.buildingGroup.add(batch.build());
  this.lastNightVisibility=-1;
 }
 updateGrandSignals(){}

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
 if(hover&&(tool.startsWith('tree:')||tool==='treeRow'||tool==='treeBrush')){
  const x=hover.x+.5,z=hover.y+.5,i=hover.y*300+hover.x;
  if(hover.x>1&&hover.y>1&&hover.x<298&&hover.y<298&&state.footprint[i]<0&&state.buildGrid[i]<0){
   const batch=new Batch(),kind=tool.startsWith('tree:')?tool.slice(5):'shade';
   this.tree(batch,x,z,kind==='shrub'?.65:1,kind);
   const ghost=batch.build(false);ghost.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.50;}});this.previewGroup.add(ghost);
  }
 }
 if(selected?.kind==='road'&&junction(selected.id)>=3)boxes.push([selected.id%300,Math.floor(selected.id/300),2.4,2.4,'#fff1a1']);
 for(const [x,z,w,d,color]of boxes){const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(x,.14,z);this.previewGroup.add(plane);const points=[new THREE.Vector3(x-w/2,.17,z-d/2),new THREE.Vector3(x+w/2,.17,z-d/2),new THREE.Vector3(x+w/2,.17,z+d/2),new THREE.Vector3(x-w/2,.17,z+d/2),new THREE.Vector3(x-w/2,.17,z-d/2)];this.previewGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color})));}
 }
 render({state,cam,hover,drag,tool,selected,heat,debug,follow,CATALOG,ROADS,KINDS,junction,vehiclePosition,signalColor,checkBuilding,parking}){this.parking=parking;this.updateCamera(cam);if(this.city!==state.city||this.lastState!==state){this.terrain(state.city);this.lastState=state;this.roadKey='';this.buildKey='';}
 const roadKey=[state.version,state.roads.size,heat].join(':');if(roadKey!==this.roadKey){this.roadKey=roadKey;this.makeRoads(state,ROADS,junction);}const buildKey=[state.buildings.size,...state.buildings.keys()].join(':');if(buildKey!==this.buildKey){this.buildKey=buildKey;this.makeBuildings(state,CATALOG,KINDS);}this.trees(state,cam);this.cars(state,vehiclePosition,CATALOG);this.preview(state,hover,drag,tool,selected,CATALOG,ROADS,junction,checkBuilding);
 this.updateSignals(signalColor);this.updateGrandSignals();this.updateWeatherLight(state);
 if(heat){if(!this.heatGroup){this.heatGroup=new THREE.Group();this.scene.add(this.heatGroup);}if(!this.heatAt||state.time-this.heatAt>1){this.heatAt=state.time;this.disposeGroup(this.heatGroup);const b=new Batch();for(const[i,r]of state.roads){if(r.load<.1&&r.wait<.1)continue;const color=r.wait>3?'#ce6156':r.wait>.5?'#eda858':'#92c77b';b.box(color,i%300,.13,Math.floor(i/300),ROADS[r.type].width*.92,.018,.9);}this.heatGroup.add(b.build(false));}this.heatGroup.visible=true;}else if(this.heatGroup)this.heatGroup.visible=false;
 const v=state.vehicles.get(follow);this.routeLine.visible=!!v;if(v){const points=v.path.slice(v.pos).map(i=>new THREE.Vector3(i%300,.2,Math.floor(i/300)));this.routeLine.geometry.dispose();this.routeLine.geometry=new THREE.BufferGeometry().setFromPoints(points);}
 if(debug||ROADS[tool]||CATALOG[tool]||tool.startsWith('tree:')||tool==='treeRow'||tool==='treeBrush'||tool==='eraseTree'){if(!this.grid){this.grid=new THREE.GridHelper(80,80,'#dfefba','#d0e0a0');this.grid.material.transparent=true;this.grid.material.opacity=.2;this.grid.position.y=.125;this.scene.add(this.grid);}this.grid.visible=true;this.grid.position.x=Math.round(cam.x);this.grid.position.z=Math.round(cam.y);}else if(this.grid)this.grid.visible=false;
 this.renderer.render(this.scene,this.camera);
 }
}

