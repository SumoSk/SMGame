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
 const mist=Math.exp(-Math.pow((minute-365)/145,2))*(.2+.56*hash(day*29+seed,73))*(1-rain*.3);
 return{cloud,rain,wet,mist};
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
 const group=Math.max(0,Math.min(3,c?.profile?.trait??0)),weights=VEHICLE_WEIGHTS[group];
 let n=hash((c?.id??id)*1.013+37,59)*100;
 for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}
 return 0;
}
function carPaintFor(c,id,kind,fallback){
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
 add(geo,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,buildingId=null,glow=false){const key=geo.uuid+color+(glow?'@light':'');if(!this.data.has(key))this.data.set(key,{geo,color,glow,items:[]});this.data.get(key).items.push({x,y,z,sx,sy,sz,rx,ry,rz,buildingId});}
 box(color,x,y,z,sx,sy,sz,ry=0,id=null,glow=false){this.add(BOX,color,x,y,z,sx,sy,sz,0,ry,0,id,glow);}
 build(shadow=true){const dummy=new THREE.Object3D();for(const {geo,color,glow,items} of this.data.values()){const material=new THREE.MeshStandardMaterial({color,roughness:glow?.4:.83,metalness:0,transparent:!!glow,opacity:glow?0:1,depthWrite:!glow});if(glow){material.emissive.set(color);material.emissiveIntensity=1.6;material.toneMapped=false;}const mesh=new THREE.InstancedMesh(geo,material,items.length);mesh.castShadow=shadow&&!glow;mesh.receiveShadow=!glow;mesh.userData.ids=[];mesh.userData.nightGlow=!!glow;mesh.userData.baseColor=color;if(glow)mesh.visible=false;items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.userData.ids.push(p.buildingId);});mesh.computeBoundingSphere();this.group.add(mesh);}return this.group;}
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
  this.scene.fog=new THREE.FogExp2('#b3ccd2',.002);
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;const c=cv.getContext('2d'),g=c.createRadialGradient(32,32,1,32,32,31);
  g.addColorStop(0,'rgba(255,238,191,.72)');g.addColorStop(.37,'rgba(255,190,116,.28)');g.addColorStop(1,'rgba(255,183,104,0)');
  c.fillStyle=g;c.fillRect(0,0,64,64);this.glowTexture=new THREE.CanvasTexture(cv);
  this.rainPoints=new Float32Array(430*6);const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(this.rainPoints,3));
  this.rain=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#cfe6f1',transparent:true,opacity:0,depthWrite:false}));
  this.rain.frustumCulled=false;this.rain.visible=false;this.scene.add(this.rain);this.lastGlow=-1;
 }
 updateWeatherLight(state){
  const sun=lightAt(state.time),air=climateAt(state.time,state.city);
  this.scene.background.copy(sun.sky).lerp(new THREE.Color('#738999'),air.cloud*.22+air.rain*.38);
  this.scene.fog.color.copy(this.scene.background);this.scene.fog.density=.0014+air.mist*.012+air.rain*.006+air.cloud*.0016;
  this.skyLight.intensity=sun.ambient*(1-air.cloud*.14-air.rain*.24);
  this.light.color.copy(sun.sun).lerp(new THREE.Color('#dfe9f0'),air.cloud*.25);
  this.light.intensity=sun.strength*(1-air.cloud*.18-air.rain*.36);
  this.renderer.toneMappingExposure=sun.exposure*(1-air.rain*.09);
  const solar=Math.max(0,Math.sin((sun.minute-360)/720*Math.PI)),az=sun.minute/1440*Math.PI*2;
  this.light.position.set(this.cam.x+Math.cos(az)*65,27+solar*68,this.cam.y+Math.sin(az)*65);
  this.light.castShadow=sun.strength>.58;
  const glow=smooth(sun.lamps)*(1-air.rain*.12);
  if(Math.abs(glow-this.lastGlow)>.008){
   for(const group of [this.lampGroup,this.buildingGroup])group.traverse(mesh=>{
    if(!mesh.userData.nightGlow)return;mesh.visible=glow>.015;
    mesh.material.opacity=.91*glow;mesh.material.emissiveIntensity=1.25+glow*.9;
   });
   if(this.streetGlow)this.streetGlow.material.opacity=.31*glow;
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
 for(const [color,positions]of paint){if(!positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;this.roadGroup.add(mesh);}
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
 this.lastGlow=-1;this.lastWet=-1;
}
 updateSignals(signalColor){const lit={red:'#ff6855',yellow:'#ffd56b',green:'#9eeb96'},dim={red:'#4d302e',yellow:'#494230',green:'#2b473f'};for(const s of this.signals||[]){const active=signalColor(s.node,s.axis);for(const [name,lens]of Object.entries(s.lenses))lens.material.color.set(name===active?lit[name]:dim[name]);}}
 roof(batch,x,z,w,d,base,color,id){const angle=Math.atan2(.55,d/2),length=Math.hypot(d/2,.55);for(const sign of[-1,1])batch.add(BOX,color,x,base+.275,z+sign*d/4,w+.18,.10,length+.11,sign*angle,0,0,id);for(let k=-w/2+.12;k<w/2;k+=.22){for(const sign of[-1,1])batch.add(BOX,'#b86d48',x+k,base+.3,z+sign*d/4,.023,.035,length+.12,sign*angle,0,0,id);}batch.box('#ce8054',x,base+.57,z,w+.19,.07,.08,0,id);}
 window(batch,x,y,z,w,h,side,id){if(side==='front'){batch.box('#385d69',x,y,z,w,h,.025,0,id);if(hash(x+id,y+z)>.36)batch.box('#ffdf9d',x,y,z+.034,w*.76,h*.78,.012,0,id,true);batch.box('#dddac4',x,y,z+.02,.026,h+.04,.022,0,id);batch.box('#e9e6d4',x,y-h/2-.035,z+.04,w+.1,.06,.075,0,id);}else{batch.box('#456d75',x,y,z,.025,h,w,0,id);if(hash(z+id,x+y)>.40)batch.box('#ffe2ad',x+.035,y,z,.012,h*.77,w*.73,0,id,true);batch.box('#ede7d3',x+.02,y-h/2-.035,z,.075,.06,w+.08,0,id);}}
 parkingLot(batch,b){for(const rect of this.parking.parkingVisuals(b)){const p=this.parking.lotPoint(b,rect.u,rect.v);batch.box(rect.color,p.x-.5,rect.color==='#bdc6ae'?.025:rect.color==='#515f62'?.065:.09,p.y-.5,rect.w,.012,rect.h,-(b.rotation||0)*Math.PI/2,b.id);}}
 building(batch,b,CATALOG,KINDS){
  const t=CATALOG[b.key],id=b.id,s=t.size,plots=t.plotWidth||s+2,rot=-(b.rotation||0)*Math.PI/2;
  if(this.parking)this.parkingLot(batch,b);
  const tier=b.key.endsWith('_large')?3:b.key.endsWith('_medium')?2:1,kind=t.kind;
  const pt=(u,v)=>this.parking?.lotPoint(b,u,v)||{x:b.x+u+.5,y:b.y+v+.5};
  const box=(color,u,h,v,w,th,d,glow=false)=>{
   const p=pt(u,v);batch.box(color,p.x-.5,h,p.y-.5,w,th,d,rot,id,glow);
  };
  const cyl=(color,u,h,v,r,th)=>{
   const p=pt(u,v);batch.add(CYL,color,p.x-.5,h,p.y-.5,r,th,r,0,0,0,id);
  };
  const center=plots/2,span=Math.min(plots-2.0,
    kind==='home'?s*(1.1+tier*.49):kind==='park'?plots-1.5:
    kind==='factory'?plots-2.8:plots-2.2);
  const mid=s*.48,depth=s*.73,height=
   kind==='office'?1.4+tier*1.56:kind==='mall'?1.05+tier*.72:
   kind==='home'?1.03+tier*.68:kind==='factory'?1.35+tier*.38:
   kind==='pub'?1.12+tier*.57:1.13+tier*.44;
  const palettes={
   home:['#e8dac9','#e5ded4','#eee8de'],shop:['#dfb98b','#d4cbb9','#dde0d5'],
   restaurant:['#dba789','#dbb49b','#e8c9af'],mall:['#e0dfd4','#d5dfdc','#dae1df'],
   office:['#aebcbe','#a7cbd1','#b4cbd0'],factory:['#b8b8a8','#b7c3bd','#c5c8bc'],
   park:['#8faa79','#8eb58b','#83af83'],pub:['#665c72','#50536f','#50516a']
  };
  const wall=palettes[kind][tier-1],roof=kind==='home'?'#655f59':
   kind==='pub'?'#262839':kind==='factory'?'#71888a':'#8da1a1';
  const front=mid+depth/2+.025,facadeZ=front+.04;
  const windows=(w=span,top=height*.53)=>{
   const count=Math.max(2,Math.floor(w/.95));
   for(let i=0;i<count;i++){
    const u=center-w/2+(i+.5)*w/count;
    const lit=hash(u+id,top)> (kind==='pub'?.24:.42);
    box('#345d69',u,top,facadeZ,w/count*.71,Math.min(.54,height*.43),.022);
    if(lit)box(kind==='pub'?'#eaa5f5':'#ffdeaa',u,top,facadeZ+.019,w/count*.56,Math.min(.43,height*.33),.014,true);
    box('#d4ded8',u,top+.28,facadeZ+.023,w/count*.77,.028,.037);
   }
  };
  // Architectural site plinth, landscaped setback, garden and walkway.
  box('#b8c4b4',center,.046,s*.49,Math.min(plots-.23,span+1.3),.095,s-.12);
  box('#829e7d',center,.102,s*.18,Math.min(plots-.4,span+1.1),.05,.38);
  box('#e9e1d0',center,.117,s-.15,Math.max(.9,span*.5),.036,.48);
  const gardenSpots=Math.max(2,Math.min(12,Math.ceil(span/8)));
  for(let i=0;i<gardenSpots;i++){
   const u=center-span/2+(i+.5)*span/gardenSpots;
   if(Math.abs(u-center)<.9)continue;
   box('#638958',u,.18,s-.08,.65,.19,.29);
   const p=pt(u,s-.1);this.tree(batch,p.x-.5,p.y-.5,.38+tier*.09);
  }
  if(kind==='park'){
   // Continuous scenic promenade, circular fountain and colored flower beds.
   box('#75ae84',center,.15,mid,span,.08,depth);
   box('#e9ddc6',center,.19,mid,span*.96,.035,.34);
   box('#e2d9bc',center,.19,mid,.30,.035,s*.82);
   for(let i=0;i<Math.min(42,Math.floor(span/1.7));i++){
    const u=center-span/2+.8+i*1.67;
    for(const side of [-1,1]){
     box(i%3?'#71a778':'#d89e90',u,.20,mid+side*depth*.29,.64,.1,.48);
     if(i%4===0){const p=pt(u,mid+side*depth*.33);this.tree(batch,p.x-.5,p.y-.5,.40+tier*.14);}
    }
   }
   cyl('#d3c6a6',center,.24,mid,.62,.18);
   cyl('#5dacc1',center,.33,mid,.52,.045);
   cyl('#a3e0ee',center,.50,mid,.07,.34);
   box('#fff0b6',center,.40,mid,.18,.08,.18,true);
   for(const sign of [-1,1]){
    box('#98754e',center+sign*span*.27,.30,mid,.95,.10,.34);
    box('#668c83',center+sign*span*.27,.19,mid,.08,.21,.32);
   }
   return;
  }
  box(wall,center,height/2+.16,mid,span,height,depth);
  // Facade massing uses increasing setbacks and wings, not merely scale.
  if(tier>=2){
   for(const sign of [-1,1]){
    box(kind==='pub'?'#383849':'#cad6cc',center+sign*span*.36,height*.39+.16,mid+.13,
      span*.18,height*.78,depth*.81);
   }
  }
  if(tier===3){
   box(kind==='pub'?'#625370':'#c7d5d3',center,height*.70+.20,mid-depth*.19,span*.56,height*.61,depth*.43);
  }
  box('#e4e7d8',center,height+.22,mid,span+.19,.12,depth+.22);
  box(roof,center,height+.30,mid,span-.12,.07,depth-.12);
  box('#e8e1d1',center,.37,front+.19,Math.max(1.1,span*.43),.12,.58);
  // Glazed main entrance and soft night-lit canopy.
  box('#376672',center,.68,front+.035,Math.min(2.2,span*.38),1.00,.042);
  box('#ffd6a0',center,.70,front+.067,Math.min(1.5,span*.29),.77,.016,true);
  box('#f3ead8',center,1.28,front+.34,Math.min(3.1,span*.45),.12,.66);
  box('#f5dfaa',center,1.25,front+.39,Math.min(2.7,span*.40),.06,.09,true);
  if(kind==='home'){
   box(tier===1?'#9a604b':'#545a62',center,height+.41,mid,span+.14,.19,depth+.12);
   if(tier>=2){
    box('#d5ccc0',center,height*.79,mid-depth*.22,span*.57,.20,depth*.58);
    box('#53626b',center,height*.87,front+.04,span*.49,.12,.05);
   }
   if(tier===3){
    box('#8bbfc5',center+span*.25,.18,s-.35,span*.28,.08,.38);
    box('#dfe5df',center+span*.25,.14,s-.35,span*.32,.03,.44);
    for(const sign of [-1,1])box('#f3d5a0',center+sign*span*.4,1.04,front+.08,.11,.24,.06,true);
   }
   windows(span*.79,height*.60);
   for(const sign of [-1,1]){
    box('#d1c8b5',center+sign*span*.32,.57,mid,span*.12,.60,depth*.89);
    box('#ffc986',center+sign*span*.32,.69,facadeZ+.01,.25,.27,.018,true);
   }
  }else if(kind==='mall'){
   box('#9ebcc1',center,height*.75+.27,mid-depth*.11,span*.48,height*.7,depth*.63);
   box('#c4e5e4',center,height*.87+.3,mid-depth*.1,span*.32,height*.5,depth*.64);
   box('#edf0df',center,height+.51,mid-depth*.1,span*.52,.14,depth*.65);
   box('#3a7a7c',center,height*.64,facadeZ+.015,span*.95,.13,.07);
   box('#ffdeab',center,height*.64,facadeZ+.055,span*.84,.07,.014,true);
   windows(span*.91,.80);
   for(let i=0;i<Math.floor(span/2.7);i++){
    const u=center-span/2+1.5+i*2.7;
    box('#e5e8df',u,height+.39,mid,1.25,.045,depth*.12);
    box('#719496',u,1.6,front+.18,.055,1.6,.18);
   }
  }else if(kind==='office'){
   box('#87b7c0',center,height*.82+.14,mid-depth*.12,span*.38,height*.83,depth*.78);
   box('#d0e3dc',center,height*1.25+.22,mid-depth*.15,span*.39,.11,depth*.8);
   for(let floor=.58;floor<height-.2;floor+=.63){
    for(let u=center-span/2+.34;u<center+span/2-.2;u+=.78){
     box('#4b808c',u,floor,facadeZ,.56,.43,.028);
     if(hash(u+id,floor)>.40)box('#ffdeae',u,floor,facadeZ+.024,.42,.32,.015,true);
    }
    box('#e5eddf',center,floor+.27,front+.065,span+.09,.055,.12);
   }
   box('#678c96',center,height+.55,mid-depth*.3,span*.3,.36,depth*.34);
  }else if(kind==='factory'){
   for(let i=0;i<Math.min(28,Math.ceil(span/3));i++){
    const u=center-span/2+1.2+i*2.85;
    if(u>center+span/2-.6)break;
    box(i%2?'#9eadaa':'#d7d7c8',u,height+.41,mid,1.18,.25,depth*.83);
    box('#607b82',u,.82,facadeZ,.95,1.03,.045);
    box('#e3d9b8',u,1.18,facadeZ+.037,.68,.12,.028);
   }
   for(const sign of [-1,1]){
    cyl('#859095',center+sign*span*.27,height+.75,mid-depth*.28,.19,.98);
    cyl('#e7e3d5',center+sign*span*.27,height+1.27,mid-depth*.28,.26,.13);
   }
  }else if(kind==='pub'){
   box('#232c3c',center,height*.58,facadeZ+.013,span*.97,.46,.09);
   windows(span*.90,height*.38);
   for(let u=center-span/2+.7;u<center+span/2-.4;u+=1.28){
    box(u<center?'#e39dcc':'#86d3e2',u,1.46,front+.18,.10,.72,.055,true);
   }
   box('#d9b2de',center,height+.38,front+.16,span*.7,.18,.16,true);
   box('#a2d0e6',center,height+.56,mid-depth*.3,span*.36,.15,.22,true);
   for(const sign of [-1,1]){
    box('#7a719e',center+sign*span*.39,.60,front+.18,.28,1.11,.18);
    box('#eea5d2',center+sign*span*.39,1.12,front+.28,.21,.28,.10,true);
   }
  }else if(kind==='restaurant'){
   windows(span*.88,.91);
   box('#a97053',center,height+.46,mid,span*.82,.17,depth*.48);
   for(let u=center-span*.4;u<center+span*.4;u+=1.35){
    box('#eec99a',u,1.42,front+.22,.10,.31,.34);
    box('#ffe2a8',u,1.20,front+.28,.23,.10,.16,true);
   }
   box('#8a7055',center,.30,s-.09,span*.86,.07,.55);
   for(let u=center-span*.38;u<center+span*.38;u+=1.8){
    box('#e5dbc5',u,.38,s-.09,.58,.09,.37);
    box('#96866f',u,.25,s-.09,.07,.31,.07);
   }
  }else{
   windows(span*.89,.84);
   for(let u=center-span*.42;u<center+span*.42;u+=1.24){
    box('#e2b780',u,1.35,front+.20,.88,.09,.40);
    box('#f9d6a7',u,1.30,front+.24,.76,.035,.20,true);
   }
   box('#779d92',center,height+.43,mid,span*.4,.15,depth*.4);
  }
  // Parking-edge promenade: shadow-casting columns and warm night lanterns.
  const lights=Math.min(24,Math.max(2,Math.floor(plots/7)));
  for(let i=0;i<lights;i++){
   const u=1.0+(plots-2.0)*(i+.5)/lights;
   if(Math.abs(u-center)<1.1)continue;
   cyl('#697a77',u,.73,s+.07,.028,1.24);
   box('#eadfc1',u,1.38,s+.07,.16,.10,.16);
   box('#ffdfa2',u,1.39,s+.085,.105,.065,.11,true);
  }
 }
 makeBuildings(state,CATALOG,KINDS){this.disposeGroup(this.buildingGroup);const b=new Batch();for(const building of state.buildings.values())this.building(b,building,CATALOG,KINDS);this.buildingGroup.add(b.build());}

 createCars(){
  this.carModels=VEHICLE_TYPES.map((_,i)=>carGeometries(i));
  this.carSets=new Map();this.carDummy=new THREE.Object3D();this.carTint=new THREE.Color();
 }
 ensureCarSet(kind,needed){
  const old=this.carSets.get(kind);if(old&&old.capacity>=needed)return old;
  if(old){this.scene.remove(old.body,old.trim);old.body.material.dispose();old.trim.material.dispose();}
  const capacity=Math.max(32,2**Math.ceil(Math.log2(Math.max(1,needed)))),geometry=this.carModels[kind];
  const body=new THREE.InstancedMesh(geometry.body,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:kind===5||kind===6?.25:.4,metalness:.15}),capacity);
  const trim=new THREE.InstancedMesh(geometry.trim,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.13}),capacity);
  for(const mesh of [body,trim]){mesh.castShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;this.scene.add(mesh);}
  const created={capacity,body,trim};this.carSets.set(kind,created);return created;
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
   if(!items.length){if(old){old.body.count=0;old.trim.count=0;}continue;}
   const set=this.ensureCarSet(kind,items.length);
   for(let i=0;i<items.length;i++){
    const car=items[i];this.carDummy.position.set(car.x,0,car.z);this.carDummy.rotation.set(0,-car.angle,0);
    this.carDummy.scale.set(1,1,1);this.carDummy.updateMatrix();
    set.body.setMatrixAt(i,this.carDummy.matrix);set.trim.setMatrixAt(i,this.carDummy.matrix);
    set.body.setColorAt(i,this.carTint.set(car.color));
   }
   for(const mesh of [set.body,set.trim]){mesh.count=items.length;mesh.instanceMatrix.needsUpdate=true;}
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

