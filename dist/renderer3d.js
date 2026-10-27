import * as THREE from './vendor/three.module.js';

const BOX=new THREE.BoxGeometry(1,1,1),CYL=new THREE.CylinderGeometry(1,1,1,10),CYL_SMOOTH=new THREE.CylinderGeometry(1,1,1,32),CONE=new THREE.ConeGeometry(1,1,6),LEAF=new THREE.IcosahedronGeometry(1,1),BALL=new THREE.SphereGeometry(1,12,8);
// A closed roof prism avoids intersecting roof planes at rotated plots.
const PITCHED_ROOF=(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.5,-.5,0,.5,-.5,1,0,.5,0,-.5,.5,0,.5,.5,1,0],3));g.setIndex([0,1,2,3,5,4,0,2,5,0,5,3,2,1,4,2,4,5,0,3,4,0,4,1]);const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return flat;})();
// Shared landscape primitives are GPU-instanced, never created for individual trees.
const LEAF_FINE=new THREE.SphereGeometry(1,12,9);
const TWIG=new THREE.CylinderGeometry(.68,1,1,8);
const PINE_FINE=new THREE.ConeGeometry(1,1,12,4);
const HEDGE_LEAF=new THREE.SphereGeometry(1,12,8),FLOWER_PETAL=new THREE.IcosahedronGeometry(1,1);
const PALM_FROND=(()=>{
 const positions=[],indices=[],segments=9;
 for(let i=0;i<=segments;i++){
  const t=i/segments,spread=Math.sin(Math.PI*t)*(.14+.045*Math.sin(t*11)),y=.10*Math.sin(Math.PI*t)-.40*t*t;
  positions.push(t,y,-spread,t,y+.025+spread*.10,spread);
  if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
})();
const SHARED_RENDER_GEOMETRIES=[BOX,CYL,CYL_SMOOTH,CONE,LEAF,BALL,PITCHED_ROOF,LEAF_FINE,TWIG,PINE_FINE,HEDGE_LEAF,FLOWER_PETAL,PALM_FROND];

// One tapered GPU-instanced light streak per beam; no floating glow spheres.
const CAR_TECH_STREAK=(()=>{const g=new THREE.ConeGeometry(.044,.60,4,1,true);g.rotateZ(-Math.PI/2);return g;})();
const CAR_WARP_BEAM=new THREE.CylinderGeometry(1,1,1,16,1,true);
const VEHICLE_TECH_COLORS=Object.freeze({speed:'#FF1744',smart:'#00BFFF',fly:'#FFE600',warp:'#00FF66'});
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
// Surface visibility is independent of the original sun/shadow trajectory.
// Headline hours: bright buildings through 22:00, deepest night at 04:00,
// blue-hour recovery from 05:00 and the original sunrise from 06:00 onward.
const CITY_VISIBILITY=[
 [0,1.42,.91,.18,.22,.14],[180,1.28,.85,.11,.20,.18],
 [240,1.10,.82,.08,.18,.20],[300,1.24,.85,.10,.20,.17],
 [330,1.38,.88,.12,.21,.13],[360,1.52,.90,.13,.20,.10],
 [390,1.64,.91,.10,.18,.06],[510,2.23,1.03,0,0,0],
 [720,2.44,1.09,0,0,0],[900,2.14,1.02,0,0,0],
 [1020,1.63,.94,.08,.10,.04],[1080,1.50,.94,.20,.20,.07],
 [1140,1.50,.96,.26,.24,.10],[1260,1.50,.96,.26,.24,.10],
 [1320,1.50,.96,.26,.24,.10],[1440,1.42,.91,.18,.22,.14]
];
function cityVisibilityAt(time){
 const minute=((time%1440)+1440)%1440;
 for(let i=1;i<CITY_VISIBILITY.length;i++)if(minute<=CITY_VISIBILITY[i][0]){
  const a=CITY_VISIBILITY[i-1],b=CITY_VISIBILITY[i],f=smooth((minute-a[0])/(b[0]-a[0]));
  const mix=k=>THREE.MathUtils.lerp(a[k],b[k],f);
  return{ambient:mix(1),exposure:mix(2),building:mix(3),road:mix(4),marking:mix(5)};
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

// v2.4.3 landscape materials. All detail is render-only, world anchored and
// deterministic. One mipmapped noise atlas serves every surface (no downloads,
// per-frame geometry, game RNG or changes to the buildable grid).
const TERRAIN_PALETTES={
 phuket:['#526b3d','#82965b','#b0a36d','#9a8864'],
 bangkok:['#657544','#91a367','#b4ad7d','#8d8066'],
 chiangmai:['#49623c','#7c9558','#aaa46b','#8b795b'],
 korat:['#6c7843','#9ca566','#b7a272','#a18362']
};
function landscapeNoise(){
 const size=128,data=new Uint8Array(size*size*4);let seed=743923;
 for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i+c]=seed>>>24;}data[i+3]=255;}
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
 texture.needsUpdate=true;return texture;
}
const LANDSCAPE_GLSL=`
 varying vec3 vLandscapeWorld;
 uniform sampler2D landscapeNoiseMap;
 float landNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return texture2D(landscapeNoiseMap,(i+f+0.5)/128.0).r;
 }
 float coastX(float z){return 125.0+sin(z*.032)*5.0+sin(z*.072)*2.0;}
`;
function landscapeShader(material,noise,fragment,extra='',uniforms={}){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{landscapeNoiseMap:{value:noise}},uniforms);
  shader.vertexShader='varying vec3 vLandscapeWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\nvLandscapeWorld=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader=LANDSCAPE_GLSL+extra+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
   '#include <color_fragment>\n'+fragment);
 };
 // City and material kind are encoded in this key, so Three never reuses a
 // compiled grass program for water or a different city's palette.
 material.customProgramCacheKey=()=>fragment+extra;
 return material;
}
function landscapeMaterial(city,kind,noise){
 const palette=TERRAIN_PALETTES[city]||TERRAIN_PALETTES.korat;
 const c=hex=>{const a=new THREE.Color(hex);return `vec3(${a.r.toFixed(5)},${a.g.toFixed(5)},${a.b.toFixed(5)})`;};
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:kind==='wetSand'?.75:.97});
 material.userData.landscapeKind=kind;
 let fragment=`vec2 p=vLandscapeWorld.xz;
  float broad=landNoise(p/24.0+vec2(17.0,43.0));
  float speckle=landNoise(p/4.5+vec2(41.0,9.0));
  float fine=landNoise(p/.48);
  float grain=texture2D(landscapeNoiseMap,p/3.7).g;
 `;
 if(kind==='grass'){
  fragment+=`vec3 turf=mix(${c(palette[0])},${c(palette[1])},.28+broad*.65);
   float dry=smoothstep(.54,.79,landNoise(p/11.0+vec2(93.0,21.0)))*.62;
   turf=mix(turf,${c(palette[2])},dry);
   float soil=smoothstep(.70,.87,speckle)*(.24+dry*.4);
   turf=mix(turf,${c(palette[3])},soil);
   // Occasional soft lawn clearings, with restrained mowing bands.
   float lawn=smoothstep(.70,.88,broad)*(1.0-dry);
   float mowing=.5+.5*sin((p.x*.71+p.y*.34)*3.14159);
   turf=mix(turf,mix(${c(palette[0])},${c(palette[1])},.66+mowing*.08),lawn*.58);
   // Fractal soil, clover and slender close-up blades without extra meshes.
    float micro=landNoise(p/.16+vec2(19.0,71.0));
    vec2 bladeUV=fract(p*9.0+vec2(landNoise(floor(p*9.0)),grain));
    float blade=(1.0-smoothstep(.04,.12,abs(bladeUV.x-.5)))*(1.0-smoothstep(.55,.95,bladeUV.y));
    float clover=smoothstep(.79,.90,landNoise(p/.85+vec2(3.0,31.0)))*.10;
    turf*=.89+speckle*.13+fine*.07+micro*.065+(grain-.5)*.06+blade*.045;
    turf=mix(turf,turf*1.13,clover);
  `;
  if(city==='phuket')fragment+=`float shore=1.0-smoothstep(1.6,4.8,p.x-coastX(p.y));
   turf=mix(turf,${c('#b5aa7b')},shore*.72);`;
  if(city==='bangkok')fragment+=`float bank=abs(p.x-(125.0+sin(p.y*.047)*5.0))-4.0;
   turf=mix(turf,${c('#827c59')},(1.0-smoothstep(0.0,1.6,bank))*.68);`;
  fragment+='diffuseColor.rgb*=turf;';
 }else if(kind==='sand'||kind==='wetSand'){
  const wet=kind==='wetSand';
  fragment+=`vec3 sand=mix(${c(wet?'#a29670':'#c8b58a')},${c(wet?'#c2b48b':'#eddfb2')},.32+broad*.48+speckle*.16);
   float ripple=sin(p.y*17.0+sin(p.x*1.7)*2.4+speckle*3.0);
   float pebbles=smoothstep(.82,.96,landNoise(p/.13+vec2(13.0,8.0)));
    sand*=.955+fine*.052+(grain-.5)*.052+ripple*.012+pebbles*.019;
   diffuseColor.rgb*=sand;`;
 }else fragment+=`diffuseColor.rgb*=.88+speckle*.16+fine*.08;`;
 return landscapeShader(material,noise,fragment);
}
function landscapeWater(city,river,noise,clock){
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:river?.36:.27,metalness:.08});
 material.userData.landscapeKind=river?'river':'sea';
 const c=hex=>{const a=new THREE.Color(hex);return `vec3(${a.r.toFixed(5)},${a.g.toFixed(5)},${a.b.toFixed(5)})`;};
 const fragment=`vec2 p=vLandscapeWorld.xz;
  float drift=landscapeTime*.16;
  float shimmer=sin(p.x*3.8+p.y*2.1+drift*2.0)*sin(p.y*4.7-p.x*1.5-drift);
  float variation=landNoise(p/9.0+vec2(drift*.04,0.0));
  ${river?`
   float depth=1.0-smoothstep(1.8,4.05,abs(p.x-(125.0+sin(p.y*.047)*5.0)));
   vec3 water=mix(${c('#879f82')},${c('#386b69')},depth*.83);
   float current=pow(max(0.0,sin(p.y*8.0+p.x*1.8-drift*3.0)),18.0)*.035;
   water+=current;
  `:`
   float offshore=max(0.0,coastX(p.y)-2.2-p.x);
   vec3 water=mix(${c('#7ac8bd')},${c('#2d8e9c')},smoothstep(0.0,13.0,offshore));
   water=mix(water,${c('#245d79')},smoothstep(12.0,48.0,offshore));
   float wave=sin(offshore*4.5-landscapeTime*1.25+sin(p.y*.8)*.65);
   float foam=pow(max(0.0,wave),12.0)*(1.0-smoothstep(.2,3.1,offshore));
   foam*=.43+.34*landNoise(vec2(p.y*1.7,offshore*3.0));
   water=mix(water,${c('#e1efe1')},foam*.64);
  `}
  water*=.94+variation*.1+shimmer*.018;
  diffuseColor.rgb*=water;
 `;
 landscapeShader(material,noise,fragment,'uniform float landscapeTime;', {landscapeTime:clock});
 const compile=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  compile(shader);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
   `#include <normal_fragment_begin>
    vec2 wp=vLandscapeWorld.xz;
    float wt=landscapeTime;
    vec3 rippleNormal=vec3(sin(wp.x*2.1+wp.y*1.4+wt*.7)*.045,0.0,cos(wp.y*2.9-wp.x*.8-wt*.55)*.055);
    normal=normalize(normal+mat3(viewMatrix)*rippleNormal);`);
 };
 return material;
}

function mountainHeight(x,z){
 // Same scenery footprint as the old Chiang Mai peaks; the city stays flat.
 let h=0;
 for(let n=0;n<12;n++){
  const px=100+n%4*8+(hash(n,7)-.5)*3,pz=105+Math.floor(n/4)*15+(hash(n,19)-.5)*3;
  const dx=(x-px)/9.5,dz=(z-pz)/10;
  const shape=Math.max(0,1-Math.hypot(dx,dz));
  const ridge=1+Math.sin(x*.61+z*.39)*.12+Math.sin(z*.89-x*.4)*.07;
  h=Math.max(h,Math.pow(shape,1.28)*(5.8+hash(n,17)*7)*ridge);
 }
 return h;
}

// SMCITY premium car visuals 2026-10-25.
// Eight original citizen vehicle classes + one dedicated VISUAL taxi variant.
// Citizen trait weights are intentionally untouched; tourist taxi is not a
// ninth random citizen class.
const VEHICLE_TYPES=['compact','sedan','pickup','suv','premium','sport','luxury','van','touristTaxi','f1','truck6','truck8','roadTrain'];
const VEHICLE_WEIGHTS=[[26,36,20,10,4,1,1,2],[11,16,42,20,5,1,1,4],[7,12,11,24,33,6,5,2],[2,4,5,10,25,24,28,2]];
const VEHICLE_STYLES=[
 [.49,.238,.125,-.028,.303,.118], // compact hatchback
 [.59,.258,.133,-.042,.336,.136], // family sedan
 [.67,.281,.164,.130,.274,.153], // pickup and open rear tray
 [.635,.283,.161,-.025,.385,.179], // high SUV
 [.65,.286,.135,-.046,.353,.148], // executive premium sedan
 [.615,.285,.104,-.077,.272,.089], // low sport coupe
 [.735,.308,.164,-.080,.408,.186], // long luxury limousine
 [.690,.300,.162,-.019,.478,.218], // ordinary minivan
 [.615,.274,.133,-.042,.337,.135], // four-door yellow tourist TAXI sedan
 [.745,.300,.076,-.020,.205,.075], // low orange-red F1 open-wheel racecar
 [.745,.300,.240,.22,.22,.175], // compact six-wheel delivery truck, F1 road footprint
 [.745,.300,.240,.22,.22,.175], // compact eight-wheel delivery truck, same footprint
 [.745,.300,.30,.89,.44,.175], // same length and width as the F1, two compact cargo trailers
 [.745,.300,.30,.20,.20,.12], // LOW-detail road train, created only for low preset
 [.615,.274,.133,-.042,.337,.135] // low-poly yellow taxi sedan with roof sign
];
const VEHICLE_PALETTES=[
 ['#ffa52e','#27b8e5','#ff6470','#9bdc4e','#f7f8f5','#9774f0'],
 ['#f3f7fa','#2475d4','#e64651','#314a67','#e6b76a','#26a6a6'],
 ['#f26c3f','#2188c4','#fcf7ef','#304963','#e3b13c','#28a76c'],
 ['#f28d33','#2c85ce','#edf7fa','#485d89','#46b77b','#b45cc9'],
 ['#164576','#f3f5f6','#303c53','#89b6d1','#922d4a','#bdccd9'],
 ['#ff303f','#ffd02b','#176fdc','#ffffff','#ff702c','#8246f4'],
 ['#172137','#f6f1e7','#273a5b','#b99b6d','#651f39','#c4dbe7'],
 ['#f4f5ee','#387fc0','#f2e1d0','#d95846','#6eafbb','#304867'],
 ['#ffd127'], // Bangkok-style yellow taxi van: tourists only.
 ['#fc442a','#fd7129','#fb5727'], // three red-orange F1 finishes
 ['#19bac7','#f3f5ec'], // six-wheel freight
 ['#f5b13f','#f3f5ec'], // eight-wheel freight
 ['#e9f1fc','#f4c75f','#6ccce0','#f6eee1'] // intercity two-trailer road train
];
function carClassFor(c,id,tech=null,v=null){
 if(v?.kind==='intercity')return 12;
 if(v?.kind==='delivery')return v.delivery?.axles===8?11:10;
 if(Object.hasOwn(VEHICLE_TECH_COLORS,tech))return 9;
 if(c?.tourist)return 8;
 const group=Math.max(0,Math.min(3,c?.profile?.trait??0)),weights=VEHICLE_WEIGHTS[group];
 let n=hash((c?.id??id)*1.013+37,59)*100;
 for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}
 return 0;
}
function carPaintFor(c,id,kind,fallback){
 if(c?.tourist)return '#ffd127';
 if(!c)return fallback||'#c5d4d9';
 const p=VEHICLE_PALETTES[kind]||VEHICLE_PALETTES[0];
 return p[Math.floor(hash(c.id*1.117+71,43)*p.length)%p.length];
}
// Shared detailed low-poly geometry is built ONCE per type and rendered via
// instancing. Geometric details are fixed-color vertex trims; only the body
// tint varies per citizen. No thousands of independent wheel/light meshes.
function carGeometries(style){
 const [length,width,height,cabinX,cabinL,cabinH]=VEHICLE_STYLES[style],paint=[],detail=[];
 const truck=style===10||style===11,roadTrain=style===12,roadTrainLow=style===13,taxiLow=style===14,
  compact=style===0,sedan=style===1||style===8,pickup=style===2,suv=style===3,
  premium=style===4,sport=style===5||style===9,f1=style===9,luxury=style===6,
  van=style===7,taxi=style===8;
 const chromed=premium||luxury,front=length*.5,rear=-front;
 const top=.165+height*.5,roofY=top+cabinH*.49,roofTop=roofY+cabinH*.5;
 const glass=taxi?'#264653':'#263e54',windshield='#739aa9';
 const metal=luxury?'#eadbb9':chromed?'#c7dbe2':'#9aaab4';
 const wheelR=(pickup||suv||van)?.083:sport?.069:.076;
 const box=(parts,color,x,y,z,l,h,w,rot=0)=>{
  // Intercity tractor + both trailers share the F1's road footprint;
  // compress only longitudinal positions/boxes, never the wheel shape.
  if(roadTrain){x*=.30;l*=.30;}
  const geo=new THREE.BoxGeometry(l,h,w);
  if(rot)geo.rotateZ(rot);geo.translate(x,y,z);
  parts.push({color,geo});
 };
 // SMCITY 4.2.1: custom F1-only silhouette (no saloon cabin, doors or roof).
 // This changes visual geometry only, never vehicle physics or collision rules.
 if(taxiLow){
  // Dedicated lightweight four-door taxi: three solid silhouettes (bonnet,
  // sedan cabin, separate rear boot) + iconic roof TAXI sign and window slabs.
  // Geometry is baked once and GPU-instanced for all tourist vehicles on Low.
  box(paint,'#ffffff',0,.169,0,.600,.106,.263);
  box(paint,'#ffffff',-.026,.274,0,.330,.125,.224);
  box(paint,'#ffffff',-.237,.224,0,.132,.052,.239); // rear boot
  box(paint,'#ffffff',.234,.219,0,.126,.044,.237); // long front hood
  box(detail,'#274353',-.026,.292,0,.322,.073,.227); // window cabin
  box(detail,'#223c4c',.143,.292,0,.015,.073,.210); // windshield
  box(detail,'#425b67',-.197,.289,0,.012,.070,.206); // rear window
  box(paint,'#ffffff',-.026,.361,0,.282,.014,.220); // yellow roofline
  box(detail,'#f8faf5',-.026,.402,0,.117,.051,.090); // TAXI rooftop placard
  box(detail,'#182a36',-.026,.412,.048,.091,.023,.006); // sign lettering at game scale
  box(detail,'#182a36',-.026,.412,-.048,.091,.023,.006);
  box(detail,'#162735',.298,.178,0,.014,.054,.156); // grille
  box(detail,'#d54546',-.307,.202,0,.011,.031,.219); // taillights
  for(const sign of [-1,1]){
   const side=sign*.133;
   box(detail,'#192b35',-.026,.203,side,.018,.067,.007); // two-door gap
   box(detail,'#354b55',-.026,.295,sign*.116,.009,.067,.009); // B-pillar
   // Visible black checkerboard stripe across both passenger doors.
   for(let i=0;i<6;i++)
    box(detail,'#243342',-.185+i*.056,.218+(i%2)*.020,side+sign*.005,.027,.014,.009);
   for(const xx of [-.186,.184])
    box(detail,'#17232c',xx,.112,sign*.144,.093,.098,.053); // chunky low-poly wheels
   box(detail,'#fff2cb',.309,.212,sign*.085,.010,.033,.050);
  }
 }else if(roadTrainLow){
  // LOW preset: only three cargo/cab solids and minimal landmark trim.
  // Stay inside the original F1 road envelope [-.3725,+.3725].
  box(paint,'#ffffff',-.242,.325,0,.226,.25,.276); // rear trailer
  box(paint,'#ffffff',.002,.325,0,.216,.25,.276); // forward trailer
  box(paint,'#ffffff',.251,.247,0,.222,.191,.271); // tractor cab
  box(detail,'#283e50',.364,.264,0,.008,.105,.212); // windshield
  box(detail,'#253844',-.242,.166,0,.219,.025,.264); // rear chassis
  box(detail,'#253844',.002,.166,0,.210,.025,.264); // front chassis
  for(const sign of [-1,1]){
   const side=sign*.144;
   box(detail,'#b4dae2',-.242,.290,side,.184,.024,.010);
   box(detail,'#b4dae2',.002,.290,side,.178,.024,.010);
   for(const axle of [-.302,-.158,.058,.278])
    box(detail,'#15232c',axle,.115,sign*.150,.056,.080,.036);
  }
 }else if(roadTrain){
  // Compact tractor + TWO distinct cargo bodies, all within an F1-length silhouette.
  // Pre-merged/instanced: no separate animated meshes for each trailer.
  const bodyWidth=width*.95;
  box(detail,'#263746',.01,.145,0,2.40,.04,width*.88);
  // Tractor forward (+X)
  box(paint,'#ffffff',.922,.260,0,.560,.275,width*.94);
  box(paint,'#ffffff',.903,.409,0,.515,.018,width*.90);
  box(detail,'#254353',1.209,.294,0,.015,.155,width*.71);
  for(const sign of [-1,1]){
   box(detail,'#37657c',.976,.297,sign*width*.485,.21,.143,.012);
   box(detail,'#e7eef1',.993,.393,sign*width*.42,.28,.014,.010);
   box(detail,'#172d3b',.66,.312,sign*width*.52,.04,.092,.042);
   box(detail,'#fff2c2',1.215,.197,sign*.107,.022,.043,.050);
  }
  // First and second trailer bodies are separated by a real open coupling.
  for(const [center,tint] of [[.174,'#2b83ac'],[-.746,'#486779']]){
   box(paint,'#ffffff',center,.356,0,.805,.362,bodyWidth);
   box(detail,'#edf6f7',center,.543,0,.784,.015,bodyWidth*.96);
   for(const sign of [-1,1]){
    const side=sign*width*.47;
    box(detail,tint,center,.310,side+sign*.006,.675,.071,.013);
    for(const xx of [center-.260,center,center+.260])
     box(detail,'#a9bec7',xx,.355,side,.008,.34,.010);
    box(detail,'#dce5e8',center,.523,side,.73,.009,.012);
   }
   box(detail,'#ced8df',center-.395,.340,0,.012,.295,bodyWidth*.88);
  }
  // Articulated couplings and turntables, visually separated by gaps.
  for(const x of [-.285,.635]){
   box(detail,'#1b2734',x,.151,0,.145,.057,.120);
   box(detail,'#c5cdd0',x,.185,0,.080,.028,.086);
  }
  // Multiple physical wheel pairs; high contrast even at normal game zoom.
  for(const axle of [-1.103,-.902,-.481,-.186,.650,.999]){
   for(const sign of [-1,1]){
    const zz=sign*.167;
    const wheel=new THREE.CylinderGeometry(.034,.034,.043,12);
    wheel.rotateX(Math.PI/2);wheel.translate(axle*.30,.112,zz);
    detail.push({color:'#161f27',geo:wheel});
    const rim=new THREE.CylinderGeometry(.022,.022,.047,12);
    rim.rotateX(Math.PI/2);rim.translate(axle*.30,.112,zz+sign*.006);
    detail.push({color:'#b8cbd4',geo:rim});
   }
  }
  box(detail,'#fb4c53',-1.162,.285,0,.022,.069,width*.82);
  box(detail,'#f4eac2',1.239,.159,0,.015,.033,width*.70);
 }else if(truck){
  // Compact, honest 3D truck proportions: F1-length wheelbase envelope,
  // a separate driver's cab and closed cargo body. Static instanced geometry.
  box(detail,'#1e2d37',0,.115,0,.69,.035,width*.94);
  box(paint,'#ffffff',-.146,.304,0,.438,.246,width*.94);
  box(detail,'#e0edf0',-.146,.429,0,.425,.011,width*.91);
  box(paint,'#ffffff',.251,.234,0,.231,.197,width*.91);
  box(paint,'#ffffff',.241,.337,0,.216,.012,width*.89);
  box(detail,'#254459',.365,.266,0,.012,.122,width*.73);
  for(const sign of [-1,1]){
   const side=sign*width*.48;
   box(detail,'#315466',.270,.263,side,.121,.106,.010);
   box(detail,'#b4e5e8',.236,.313,side+sign*.007,.091,.008,.012);
   box(detail,'#eff6f6',.273,.193,side+sign*.01,.073,.009,.014);
   // Cargo panel seams, refrigeration-like ribs, and corporate stripe.
   for(const xx of [-.30,-.12,.06])box(detail,'#b9c8cb',xx,.305,side,.009,.22,.007);
   box(detail,style===11?'#c87921':'#127b91',-.155,.282,side+sign*.006,.400,.031,.012);
   box(detail,'#f8f0cb',.378,.190,sign*width*.31,.015,.032,.041);
   box(detail,'#eb4b51',-.378,.211,sign*width*.34,.016,.041,.044);
  }
  box(detail,'#354b5a',.382,.155,0,.016,.050,width*.65);
  box(detail,'#c7d7dd',.394,.156,0,.010,.026,width*.38);
  box(detail,'#24303b',-.376,.172,0,.012,.045,width*.71);
  const axles=style===11?[-.315,-.20,.162,.31]:[-.30,-.17,.30];
  for(const xx of axles)for(const sign of [-1,1]){
   const z=sign*.160;
   const wheel=new THREE.CylinderGeometry(.062,.062,.047,12);
   wheel.rotateX(Math.PI/2);wheel.translate(xx,.106,z);
   detail.push({color:'#101820',geo:wheel});
   const rim=new THREE.CylinderGeometry(.036,.036,.052,12);
   rim.rotateX(Math.PI/2);rim.translate(xx,.106,z+sign*.005);
   detail.push({color:'#c3d2da',geo:rim});
   const hub=new THREE.CylinderGeometry(.011,.011,.053,10);
   hub.rotateX(Math.PI/2);hub.translate(xx,.106,z+sign*.007);
   detail.push({color:'#384e5a',geo:hub});
  }
 }else if(f1){
  const wedge=(parts,color,x0,x1,y0,y1,w0,w1)=>{
   const vertices=[
    x0,y0,-w0/2, x0,y0,w0/2, x1,y0,-w1/2, x1,y0,w1/2,
    x0,y1,-w0/2, x0,y1,w0/2, x1,y1,-w1/2, x1,y1,w1/2
   ];
   const geom=new THREE.BufferGeometry();
   geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
   geom.setIndex([0,2,1,1,2,3,4,5,6,5,7,6,0,4,2,4,6,2,1,3,5,5,3,7,0,1,4,4,1,5,2,6,3,6,7,3]);
   geom.computeVertexNormals();parts.push({color,geo:geom});
  };
  // Tapered carbon monocoque and visibly pointed nose.
  wedge(paint,'#ffffff',-.29,.055,.135,.202,.175,.158);
  wedge(paint,'#ffffff',.048,.373,.142,.194,.139,.032);
  box(paint,'#ffffff',-.185,.180,0,.245,.075,.158);
  box(detail,'#17212c',-.23,.124,0,.27,.024,.186); // floor / diffuser
  // Prominent sidepods, aero inlets and lower side wings.
  for(const sign of [-1,1]){
   box(paint,'#ffffff',-.085,.184,sign*.110,.288,.056,.085);
   box(detail,'#1b2734',-.044,.207,sign*.158,.068,.029,.024);
   box(detail,'#222b38',-.115,.127,sign*.154,.256,.016,.053);
   box(detail,'#dce8ec',.080,.199,sign*.116,.146,.012,.012);
   box(detail,'#141e29',-.32,.154,sign*.118,.112,.047,.027);
  }
  // Open cockpit, driver helmet and F1 halo safety structure.
  box(detail,'#0a1722',-.095,.249,0,.190,.012,.116);
  const helmet=new THREE.SphereGeometry(.039,10,7);helmet.translate(-.115,.274,0);
  detail.push({color:'#f4f8ff',geo:helmet});
  box(detail,'#121c27',-.070,.308,0,.138,.015,.016);
  for(const sign of [-1,1]){
   box(detail,'#121c27',-.007,.278,sign*.049,.017,.072,.015,.23);
   box(detail,'#18232d',-.235,.298,sign*.022,.090,.014,.016);
  }
  box(paint,'#ffffff',-.244,.268,0,.076,.081,.112); // airbox
  box(detail,'#131e29',-.209,.313,0,.032,.019,.076);
  // Three-element front wing: colored main blade, black splitter and endplates.
  box(paint,'#ffffff',.386,.114,0,.090,.025,.375);
  box(detail,'#19232e',.423,.104,0,.028,.013,.404);
  box(paint,'#ffffff',.326,.134,0,.041,.013,.321);
  for(const sign of [-1,1]){
   box(detail,'#141d27',.382,.135,sign*.196,.106,.056,.013);
   box(detail,'#212d39',.302,.128,sign*.115,.071,.011,.038);
  }
  // Elevated rear wing, twin uprights and diffuser vanes.
  box(detail,'#18212d',-.392,.319,0,.102,.022,.355);
  box(paint,'#ffffff',-.375,.337,0,.080,.014,.321);
  for(const sign of [-1,1]){
   box(detail,'#17212a',-.393,.307,sign*.175,.110,.084,.015);
   box(detail,'#253544',-.342,.244,sign*.086,.022,.137,.016);
   box(detail,'#1b2732',-.353,.139,sign*.100,.100,.012,.065);
  }
  box(detail,'#ff4b49',-.424,.234,0,.013,.032,.034); // rain light
  // Four separate exposed Pirelli-style tyres with wheel faces and center hubs.
  for(const axle of [.244,-.234])for(const sign of [-1,1]){
   const zz=sign*.188;
   const tyre=new THREE.CylinderGeometry(.072,.072,.064,14);
   tyre.rotateX(Math.PI/2);tyre.translate(axle,.114,zz);
   detail.push({color:'#0d131b',geo:tyre});
   const rim=new THREE.CylinderGeometry(.039,.039,.067,12);
   rim.rotateX(Math.PI/2);rim.translate(axle,.114,zz+sign*.004);
   detail.push({color:'#82949c',geo:rim});
   const hub=new THREE.CylinderGeometry(.014,.014,.070,10);
   hub.rotateX(Math.PI/2);hub.translate(axle,.114,zz+sign*.007);
   detail.push({color:'#283d49',geo:hub});
   for(const ang of [0,Math.PI/3,2*Math.PI/3]){
    const spoke=new THREE.BoxGeometry(.062,.008,.008);
    spoke.rotateZ(ang);spoke.translate(axle,.114,zz+sign*.039);
    detail.push({color:'#d2e4eb',geo:spoke});
   }
  }
 }else{
 // Layered, slightly tapered body with rocker, hood, rear boot and bumpers.
 box(paint,'#ffffff',0,.163,0,length,height*.82,width*.955);
 box(paint,'#ffffff',0,top-.038,0,length*.94,.055,width*.93);
 box(paint,'#ffffff',front*.71,top-.035,0,length*.28,.034,width*.84);
 if(!van&&!pickup){
  box(paint,'#ffffff',rear*.78,top-.026,0,length*.22,.033,width*.84);
 }
 box(detail,'#1d2b35',0,.108,0,length*.86,.022,width*.965);
 for(const x of [front-.015,rear+.015]){
  box(detail,x>0?'#a4b0b9':'#33404c',x,.126,0,.018,.06,width*.96);
  box(detail,'#52616b',x,.093,0,.032,.015,width*.93);
 }
 // All cars have separate cabin, bright roof highlight and four real windows.
 box(paint,'#ffffff',cabinX,roofY,0,cabinL,cabinH,width*.85);
 box(paint,'#ffffff',cabinX,roofTop-.005,0,cabinL*.91,.014,width*.82);
 box(detail,glass,cabinX+cabinL*.51,roofY-.012,0,.015,cabinH*.75,width*.71,-.32);
 box(detail,'#39566a',cabinX-cabinL*.51,roofY-.011,0,.015,cabinH*.71,width*.69,.26);
 box(detail,windshield,cabinX+cabinL*.51,roofY+cabinH*.25,0,.006,.018,width*.64,-.32);
 // Side windows, door frames, window surrounds, body creases and door handles.
 for(const sign of [-1,1]){
  const side=sign*width*.431;
  box(detail,glass,cabinX,roofY-.005,side,cabinL*.80,cabinH*.66,.010);
  box(detail,'#bcd0d5',cabinX,roofY+cabinH*.32,side+sign*.004,cabinL*.82,.010,.009);
  box(detail,'#243b4a',cabinX,roofY-cabinH*.34,side+sign*.004,cabinL*.82,.012,.009);
  for(const x of [cabinX-cabinL*.18,cabinX+cabinL*.23]){
   box(detail,'#aec2ca',x,roofY-.013,side+sign*.006,.010,cabinH*.68,.013);
  }
  box(detail,metal,cabinX+.04,top-.052,sign*width*.485,.047,.008,.008);
  box(detail,'#d2dbdd',cabinX-.17,top-.052,sign*width*.483,.033,.007,.007);
  box(detail,chromed?'#cfdee0':'#455968',0,.157,sign*width*.481,length*.74,.006,.009);
  box(detail,'#aec3c8',cabinX+cabinL*.32,top+.012,sign*width*.57,.071,.025,.047);
  box(detail,'#203a48',cabinX+cabinL*.35,top+.025,sign*width*.595,.047,.012,.018);
 }
 // Distinct front end: daytime running lights, rear clusters, intake and grille.
 box(detail,'#233543',front+.011,.177,0,.019,.058,width*.70);
 const grilleW=luxury?width*.43:premium?width*.45:sport?width*.72:pickup?width*.60:width*.52;
 box(detail,chromed?'#d6dce0':'#596c76',front+.018,.185,0,.012,.053,grilleW);
 for(const sign of [-1,1]){
  box(detail,'#fbf7e7',front+.018,top-.025,sign*width*.355,.021,.033,width*.235);
  box(detail,'#d3eafa',front+.030,top-.020,sign*width*.34,.007,.011,width*.18);
  box(detail,'#e6444b',rear-.019,top-.026,sign*width*.345,.019,.040,width*.245);
  box(detail,'#ffa39a',rear-.027,top-.007,sign*width*.357,.008,.014,width*.17);
  box(detail,'#1d2a30',front*.57,.145,sign*width*.51,length*.23,.023,.019);
 }
 // Four wheels with rubber, silver alloys, axle hubs and visible spoke detail.
 for(const sign of [-1,1])for(const axle of [length*.29,-length*.29]){
  const z=sign*width*.51,y=.105;
  const tyre=new THREE.CylinderGeometry(wheelR,wheelR,.041,12);
  tyre.rotateX(Math.PI/2);tyre.translate(axle,y,z);
  detail.push({color:'#161e25',geo:tyre});
  const rim=new THREE.CylinderGeometry(wheelR*.64,wheelR*.64,.043,12);
  rim.rotateX(Math.PI/2);rim.translate(axle,y,z+sign*.013);
  detail.push({color:chromed?'#d5d9da':'#91a9b4',geo:rim});
  const hub=new THREE.CylinderGeometry(wheelR*.23,wheelR*.23,.046,10);
  hub.rotateX(Math.PI/2);hub.translate(axle,y,z+sign*.017);
  detail.push({color:'#374955',geo:hub});
  // Fine alloy-spoke cross, clear at zoom without per-frame animations.
  for(const angle of [0,Math.PI/3,2*Math.PI/3]){
   const spoke=new THREE.BoxGeometry(wheelR*1.08,.009,.006);
   spoke.rotateZ(angle);spoke.translate(axle,y,z+sign*.037);
   detail.push({color:luxury?'#eee0be':'#dee9ec',geo:spoke});
  }
 }
 // Model-specific silhouette and trim; premium and luxury are intentionally
 // two different families (executive vs chauffeur-driven limousine).
 if(compact){
  box(detail,'#2c444f',rear-.012,top+.014,0,.018,.068,width*.74);
  box(detail,'#9babb0',rear+.034,roofTop+.006,0,.055,.009,width*.67);
  box(detail,'#dcebf1',front*.76,top+.004,0,.095,.008,width*.33);
 }
 if(sedan){
  box(detail,'#c9dbe0',rear+.025,top+.006,0,.11,.008,width*.47);
  box(detail,'#475f70',cabinX,roofTop+.006,0,cabinL*.55,.008,width*.53);
 }
 if(pickup){
  // Bed floor is dark and visibly recessed, with painted bed rails and tailgate.
  box(detail,'#2b343b',rear*.56,top+.018,0,length*.37,.009,width*.69);
  for(const sign of [-1,1]){
   box(paint,'#ffffff',rear*.55,top+.052,sign*width*.40,length*.42,.085,.030);
   box(detail,'#bac7c9',rear*.55,top+.096,sign*width*.40,length*.42,.010,.032);
  }
  box(paint,'#ffffff',rear+.024,top+.054,0,.034,.084,width*.87);
  box(detail,'#3b494c',front+.025,.147,0,.025,.066,width*.57);
 }
 if(suv){
  for(const sign of [-1,1]){
   box(detail,'#cdd8db',cabinX,roofTop+.015,sign*width*.30,cabinL*.83,.017,.017);
   box(detail,'#26353c',0,.115,sign*width*.47,length*.71,.022,.018);
  }
  box(detail,'#ccd6d8',rear-.023,.144,0,.028,.030,width*.78);
 }
 if(premium){
  // Executive sedan: twin horizontal chrome kidneys and quiet window chrome.
  for(const sign of [-1,1]){
   box(detail,'#25323b',front+.034,.188,sign*width*.14,.009,.055,width*.21);
   for(let k=0;k<3;k++)box(detail,'#bed2d8',front+.040,.167+k*.018,sign*width*.14,.006,.005,width*.20);
   box(detail,'#d6e7ed',0,top+.010,sign*width*.437,cabinL*.81,.010,.010);
  }
  box(detail,'#ecf0ed',rear-.027,.153,0,.008,.026,width*.19);
 }
 if(sport){
  // Low wedge nose, broad intakes, aero sills, rear diffuser and twin exhausts.
  box(paint,'#ffffff',front*.77,top+.007,0,length*.22,.025,width*.92);
  box(detail,'#1a232d',front+.020,.139,0,.024,.047,width*.81);
  for(const sign of [-1,1]){
   box(detail,'#1b2930',front*.43,top+.006,sign*width*.28,.10,.009,.043);
   box(detail,'#27333c',rear-.026,.126,sign*width*.32,.022,.035,.045);
   box(detail,'#c7d5dc',rear-.037,.13,sign*width*.32,.009,.012,.016);
   box(detail,'#26313a',0,.120,sign*width*.51,length*.78,.022,.015);
  }
  box(paint,'#ffffff',rear+.039,roofTop+.035,0,.066,.019,width*1.12);
  for(const sign of [-1,1])box(detail,'#282d33',rear+.036,roofTop+.015,sign*width*.37,.017,.050,.017);
 }
 if(f1){
  // Low racing silhouette with broad front/rear aero wings and exposed tires.
  box(paint,'#ffffff',front+.054,.151,0,.09,.018,width*1.55);
  box(detail,'#1b2830',front+.068,.148,0,.018,.012,width*1.66);
  box(detail,'#222c35',rear-.052,roofTop+.068,0,.08,.018,width*1.75);
  for(const sign of [-1,1]){
   box(detail,'#171e27',front-.08,.119,sign*width*.71,.17,.077,.069);
   box(detail,'#171e27',rear+.095,.119,sign*width*.71,.19,.085,.071);
   box(detail,'#ffe08a',0,top+.020,sign*width*.30,length*.26,.016,.018);
  }
  box(detail,'#131e28',cabinX,roofTop+.021,0,cabinL*.62,.026,width*.73);
  box(detail,'#ffb73f',front*.48,top+.018,0,length*.13,.010,.035);
 }
 if(luxury){
  // Chauffeur limousine: tall upright waterfall grille, long formal roof,
  // polished window surround, strong shoulder line and hood ornament.
  box(detail,'#28323a',front+.039,.188,0,.015,.083,width*.49);
  for(let k=-3;k<=3;k++)box(detail,'#e5d4ad',front+.052,.187,k*width*.056,.009,.079,.009);
  for(const sign of [-1,1]){
   box(detail,'#eddeb9',cabinX,roofTop+.011,sign*width*.36,cabinL*.90,.012,.016);
   box(detail,'#c9b38d',0,top-.038,sign*width*.493,length*.84,.011,.010);
   box(detail,'#dfd7bf',rear+.021,top+.009,sign*width*.36,.082,.013,.017);
  }
  box(detail,'#e8d6a9',front*.80,top+.042,0,.012,.059,.012);
  box(detail,'#e8d6a9',front*.80,top+.072,0,.036,.007,.009);
  box(detail,'#eddab3',rear-.027,.145,0,.012,.020,width*.23);
 }
 if(van){
  // Tall multi-row glass cabin with a visible slider-door seam.
  for(const sign of [-1,1]){
   box(detail,'#1e3441',cabinX-.12,roofY-.011,sign*width*.437,.014,cabinH*.73,.013);
   box(detail,'#c0d0d5',cabinX+.065,top-.034,sign*width*.490,.012,.11,.008);
   box(detail,'#273b43',cabinX-.095,.160,sign*width*.492,.125,.009,.010);
  }
  box(detail,'#1b303b',rear-.029,roofY-.017,0,.014,cabinH*.73,width*.69);
  box(detail,'#b9cbd0',rear-.033,.136,0,.015,.022,width*.54);
 }
 if(taxi){
  // High/medium taxi: true four-door sedan shell from the normal sedan
  // branch, yellow paint, black checker strip, dark window pillars and
  // a luminous TAXI roof placard. No change to road/collision dimensions.
  box(detail,'#fff9e2',cabinX,roofTop+.043,0,.116,.060,.150);
  // Small black TAXI lettering is baked into each side of the sign.
  // Geometry is generated once, then all tourist cars share the same mesh.
  for(const sign of [-1,1]){
   const zz=sign*.079,cy=roofTop+.051;
   const stroke=(dx,dy,l,h,rot=0)=>
    box(detail,'#172b39',cabinX+dx,cy+dy,zz,l,h,.006,rot);
   // T
   stroke(-.039,.011,.019,.004);stroke(-.039,0,.004,.022);
   // A
   stroke(-.013,0,.004,.025,-.27);
   stroke(-.002,0,.004,.025,.27);
   stroke(-.007,-.004,.016,.004);
   // X
   stroke(.018,0,.004,.027,-.61);
   stroke(.018,0,.004,.027,.61);
   // I
   stroke(.042,0,.004,.024);
   stroke(.042,.011,.014,.004);
   stroke(.042,-.011,.014,.004);
  }
  box(detail,'#fff5cc',cabinX,roofTop+.084,0,.105,.013,.113);
  for(const sign of [-1,1]){
   const side=sign*width*.493;
   // Four passenger doors, checked stripe and two distinct door handles.
   box(detail,'#2e4350',cabinX,top-.045,side,.010,.091,.009);
   for(const xx of [cabinX-.112,cabinX+.080])
    box(detail,'#263b48',xx,.165,side+sign*.005,.040,.010,.010);
   for(let k=0;k<8;k++)
    box(detail,'#142a35',rear+.112+k*.057,.207+(k%2)*.022,side+sign*.008,.028,.019,.012);
  }
 }
 }
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
 constructor({detailGroups=false}={}){this.data=new Map();this.group=new THREE.Group();this.detailGroups=detailGroups;}
 add(geo,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,buildingId=null,glow=false,finish='matte'){
 const maxSize=Math.max(Math.abs(sx),Math.abs(sy),Math.abs(sz));
 const minSize=Math.min(Math.abs(sx),Math.abs(sy),Math.abs(sz));
 // Separate only tiny architectural trims, not walls, roofs, windows, parking paint or doors.
 const fine=this.detailGroups&&buildingId!=null&&!finish.startsWith('night-')&&
   ((minSize<.045&&maxSize<.85)||(maxSize<.35&&Math.abs(sx*sy*sz)<.00065));
 const key=geo.uuid+color+(glow?'@light':'')+finish+(this.detailGroups?(fine?'@detail':'@base'):'');
 if(!this.data.has(key))this.data.set(key,{geo,color,glow,finish,fine,items:[]});
 this.data.get(key).items.push({x,y,z,sx,sy,sz,rx,ry,rz,buildingId});
}
 box(color,x,y,z,sx,sy,sz,ry=0,id=null,glow=false,finish='matte'){this.add(BOX,color,x,y,z,sx,sy,sz,0,ry,0,id,glow,finish);}
 build(shadow=true){const dummy=new THREE.Object3D();for(const {geo,color,glow,finish,fine=false,items} of this.data.values()){const roughness=finish==='glass'?.18:finish==='metal'?.32:finish==='water'?.21:finish==='wood'?.71:finish==='stone'?.88:.83;const metalness=finish==='glass'?.26:finish==='metal'?.58:finish==='water'?.08:0;const material=new THREE.MeshStandardMaterial({color,roughness:glow?.4:roughness,metalness,transparent:!!glow,opacity:glow?0:1,depthWrite:!glow});if(glow){material.emissive.set(color);material.emissiveIntensity=1.6;material.toneMapped=false;}
 if(finish==='foliage'||finish==='bark'){
  material.roughness=finish==='foliage'?.95:.92;
  if(finish==='foliage')material.side=THREE.DoubleSide;
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vNatureLocal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNatureLocal=position;');
   shader.fragmentShader='varying vec3 vNatureLocal;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
    '#include <color_fragment>\n'+(finish==='bark'?
     'float ridges=sin(vNatureLocal.y*39.0+sin(vNatureLocal.x*7.0)*1.8)*.043;diffuseColor.rgb*=.92+ridges+abs(sin(vNatureLocal.z*21.0))*.035;':
     'float mottling=sin(vNatureLocal.x*21.0+vNatureLocal.y*11.0)*sin(vNatureLocal.z*24.0-vNatureLocal.y*14.0);diffuseColor.rgb*=.96+mottling*.055;'));
  };
  material.customProgramCacheKey=()=>finish==='bark'?'landscape-bark-v1':'landscape-foliage-v1';
 }
 const mesh=new THREE.InstancedMesh(geo,material,items.length);mesh.castShadow=shadow&&!glow;mesh.receiveShadow=!glow;mesh.userData.ids=[];mesh.userData.nightGlow=!!glow;mesh.userData.fineBuildingDetail=!!fine;mesh.userData.isBuildingTree=this.detailGroups&&(finish==='foliage'||finish==='bark');mesh.userData.baseColor=color;mesh.userData.buildingSurface=!!this.detailGroups&&!glow&&!['foliage','bark'].includes(finish);mesh.userData.nightRole=finish.startsWith('night-')?finish.slice(6):null;if(glow)mesh.visible=false;items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.userData.ids.push(p.buildingId);});mesh.computeBoundingSphere();this.group.add(mesh);}return this.group;}
}

export class TrafficRenderer{
 constructor(canvas){
 this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.96;
 this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#77bec3');this.camera=new THREE.OrthographicCamera(-30,30,20,-20,.1,500);this.camera.position.set(190,85,220);this.camera.lookAt(150,0,150);this.skyLight=new THREE.HemisphereLight('#e8f7ff','#698057',2.35);this.scene.add(this.skyLight);this.light=new THREE.DirectionalLight('#fff0ce',3.1);this.light.position.set(110,100,105);this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);Object.assign(this.light.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:220});this.light.shadow.bias=-.0007;this.light.shadow.normalBias=.035;this.light.shadow.radius=3;this.scene.add(this.light,this.light.target);
 this.ray=new THREE.Raycaster();this.ground=new THREE.Plane(UP,0);this.ndc=new THREE.Vector2();this.point=new THREE.Vector3();this.lastKey='';this.roadKey='';this.buildKey='';this.treeKey='';this.previewKey='';this.buildingMeshes=null;this.cameraKey='';this.cam=null;this.w=innerWidth;this.h=innerHeight;this.materials=[];
 this.graphicQuality='medium';this.lastBuildingDetailLevel=null;
 this.aiSignalGroup=new THREE.Group();this.aiSignalKey='';this.aiSignalGlows=[];
 this.roadGroup=new THREE.Group();this.buildingGroup=new THREE.Group();this.treeGroup=new THREE.Group();this.previewGroup=new THREE.Group();this.signalGroup=new THREE.Group();this.lampGroup=new THREE.Group();this.scene.add(this.roadGroup,this.buildingGroup,this.treeGroup,this.previewGroup,this.signalGroup,this.lampGroup,this.aiSignalGroup);this.createCars();this.createRoute();this.createAtmosphere();this.resize();
 }
 disposeGroup(group){for(const o of [...group.children]){group.remove(o);o.traverse(x=>{if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];for(const m of ms)m.dispose();}if(x.geometry&&!SHARED_RENDER_GEOMETRIES.includes(x.geometry))x.geometry.dispose();});}}
 setGraphicQuality(value){
  if(!['veryHigh','medium','low'].includes(value))return false;
  if(this.graphicQuality===value)return true;
  this.graphicQuality=value;
  this.treeKey=''; // rebuild near-detail tree geometry when returning from a lower preset
  // Low deliberately renders into a smaller framebuffer: softer image at every zoom.
  const ratio=value==='low'?.72:Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,1.6);
  this.renderer.setPixelRatio(ratio);
  this.lastBuildingDetailLevel=null;
  this.treeGroup.visible=value!=='low';
  this.resize();
  return true;
 }
 updateBuildingDetailLOD(cam){
  const level=this.graphicQuality==='veryHigh'?'full':
   this.graphicQuality==='low'?'light':
   cam.z<1.35?'light':'full';
  if(this.lastBuildingDetailLevel===level)return;
  this.lastBuildingDetailLevel=level;
  this.buildingGroup.traverse(mesh=>{
   if(mesh.userData?.fineBuildingDetail)mesh.visible=level==='full';
   if(mesh.userData?.isBuildingTree)mesh.visible=this.graphicQuality!=='low';
  });
 }
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
 updateNightVisibility(night,visibility={building:0,road:night*.18,marking:night*.20}){
  // A controlled emissive floor keeps the driving surfaces readable without
  // lighting the entire city like daytime. Cache updates for mobile GPUs.
  // Instance counts can change without any change in daylight (culling/heatmap).
  // Keep light visibility live while retaining cached material/surface updates.
  for(const set of this.carSets.values()){
   for(const mesh of [set.headlights,set.taillights])mesh.visible=night>.04&&mesh.count>0;
   set.lightSpill.visible=night>.20&&set.lightSpill.count>0;
  }
  const previous=this.lastSurfaceVisibility;
  if(Math.abs(night-(this.lastNightVisibility??-1))<.018&&previous&&
   Math.abs(visibility.building-previous.building)<.003&&Math.abs(visibility.road-previous.road)<.003&&Math.abs(visibility.marking-previous.marking)<.003)return;
  this.lastNightVisibility=night;this.lastSurfaceVisibility={...visibility};
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
   let tint=base,intensity=0,managed=false;
   if(role==='asphalt'){managed=true;intensity=visibility.road;tint=base||'#56666a';}
   else if(role==='night-asphalt'){managed=true;intensity=visibility.road;tint=base||'#56666a';}
   else if(role==='marking'||role==='road-marking'||role==='night-marking'){
    // Road paint reflects ambient light; it should not read as neon at night.
    managed=true;intensity=night*.025;tint=base||'#f4edd8';
    mesh.material.color.set(tint).multiplyScalar(1-visibility.marking);
   }
   else if(role==='lot-base'||role==='night-lot-base'){managed=true;intensity=visibility.road*.45;tint=base||'#bdc6ae';}
   else if(mesh.userData.buildingSurface&&!mesh.userData.nightGlow){managed=true;intensity=visibility.building;}
   if(managed){mesh.material.emissive.set(tint);mesh.material.emissiveIntensity=intensity;}
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
   set.lightSpill.visible=night>.20&&set.lightSpill.count>0;
   set.lightSpill.material.opacity=night*.13;
  }
 }
 updateWeatherLight(state){
  const sun=lightAt(state.time),air=climateAt(state.time,state.city),visibility=cityVisibilityAt(state.time);
  this.scene.background.copy(sun.sky).lerp(new THREE.Color('#738999'),air.cloud*.22+air.rain*.38);
  this.skyLight.intensity=Math.max(1.10,visibility.ambient*(1-air.cloud*.14-air.rain*.24));
  this.light.color.copy(sun.sun).lerp(new THREE.Color('#dfe9f0'),air.cloud*.25);
  this.light.intensity=Math.max(.60,sun.strength*(1-air.cloud*.18-air.rain*.36));
  this.renderer.toneMappingExposure=Math.max(.82,visibility.exposure*(1-air.rain*.09));
  const solar=Math.max(0,Math.sin((sun.minute-360)/720*Math.PI)),az=sun.minute/1440*Math.PI*2;
  this.light.position.set(this.cam.x+Math.cos(az)*65,27+solar*68,this.cam.y+Math.sin(az)*65);
  this.light.castShadow=sun.strength>.58;
  const glow=smooth(sun.lamps)*(1-air.rain*.12);
  this.updateNightVisibility(glow,visibility);
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
 updateCamera(cam){this.cam=cam;const half=this.h/(2*26*cam.z),aspect=this.w/this.h;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;const angle=cam.angle??Math.PI/4,elevation=Math.max(Math.PI*35/180,Math.min(Math.PI*78/180,cam.elevation??Math.PI*50/180)),radius=Math.hypot(90,86),horizontal=radius*Math.cos(elevation);cam.elevation=elevation;this.camera.position.set(cam.x+Math.sin(angle)*horizontal,radius*Math.sin(elevation),cam.y+Math.cos(angle)*horizontal);this.camera.lookAt(cam.x,0,cam.y);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.light.position.set(cam.x-45,90,cam.y-35);this.light.target.position.set(cam.x,0,cam.y);this.light.target.updateMatrixWorld();}
 screen(x,z,height=0){this.point.set(x,height/18,z).project(this.camera);return[(this.point.x+1)*this.w/2,(1-this.point.y)*this.h/2];}
 world(x,y){this.ndc.set(x/this.w*2-1,1-y/this.h*2);this.ray.setFromCamera(this.ndc,this.camera);const p=new THREE.Vector3();this.ray.ray.intersectPlane(this.ground,p);return[p.x,p.z];}
 pickBuilding(x,y){this.ndc.set(x/this.w*2-1,1-y/this.h*2);this.ray.setFromCamera(this.ndc,this.camera);const hits=this.ray.intersectObjects(this.buildingGroup.children,true);for(const h of hits){const id=h.object.userData.ids?.[h.instanceId];if(id!=null)return id;}return null;}
 coast(z){return 125+Math.sin(z*.032)*5+Math.sin(z*.072)*2;}
 groundShape(points,color,height){
  const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
  const material=color?.isMaterial?color:new THREE.MeshStandardMaterial({color,roughness:1});
  const mesh=new THREE.Mesh(geo,material);mesh.position.y=height;mesh.receiveShadow=true;
  this.scene.add(mesh);this.terrainGroup.push(mesh);return mesh;
 }
 terrain(city){
  if(this.terrainGroup)for(const mesh of this.terrainGroup){
   this.scene.remove(mesh);mesh.traverse(o=>{
    if(o.geometry&&!SHARED_RENDER_GEOMETRIES.includes(o.geometry))o.geometry.dispose();
    if(o.material)for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();
   });
  }
  // The small atlas belongs to this renderer and survives map switches. No
  // cached material or GPU mesh is retained from the preceding city.
  this.landscapeNoiseMap??=landscapeNoise();this.landscapeClock??={value:0};
  this.terrainGroup=[];this.city=city;
  const noise=this.landscapeNoiseMap,clock=this.landscapeClock;
  const grass=landscapeMaterial(city,'grass',noise);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(900,900),landscapeWater(city,false,noise,clock));
  water.rotation.x=-Math.PI/2;water.position.set(150,-.26,150);water.receiveShadow=true;
  this.scene.add(water);this.terrainGroup.push(water);
  const coast=[];for(let z=-50;z<=350;z+=.8)coast.push([this.coast(z),z]);
  const strip=(points,a,b,material,y)=>this.groundShape([...points.map(([x,z])=>[x+a,z]),...points.slice().reverse().map(([x,z])=>[x+b,z])],material,y);
  if(city==='phuket'){
   this.groundShape([...coast.map(([x,z])=>[x-2.2,z]),[370,350],[370,-50]],landscapeMaterial(city,'sand',noise),-.12);
   this.groundShape([...coast.map(([x,z])=>[x+1.6,z]),[370,350],[370,-50]],grass,0);
   strip(coast,-2.2,-1.05,landscapeMaterial(city,'wetSand',noise),-.105);
  }else{
   this.groundShape([[-40,-40],[-40,340],[340,340],[340,-40]],grass,0);
   if(city==='bangkok'){
    const river=[];for(let z=-40;z<=340;z+=.8)river.push([125+Math.sin(z*.047)*5,z]);
    strip(river,-4,4,landscapeWater(city,true,noise,clock),.015);
    // Narrow silt margins stay within the existing river width and do not
    // move the river, road crossings or buildable banks.
    strip(river,-4,-3.65,landscapeMaterial(city,'wetSand',noise),.017);
    strip(river,3.65,4,landscapeMaterial(city,'wetSand',noise),.017);
   }
  }
  const details=new Batch();
  if(city==='chiangmai'){
   const geometry=new THREE.PlaneGeometry(49,53,72,78);geometry.rotateX(-Math.PI/2);geometry.translate(111,0,120);
   const positions=geometry.attributes.position,colors=[],shade=new THREE.Color();
   for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),height=mountainHeight(x,z);
    positions.setY(i,height+.003);
    const slope=Math.hypot(mountainHeight(x+.25,z)-mountainHeight(x-.25,z),mountainHeight(x,z+.25)-mountainHeight(x,z-.25))/.5;
    const rock=smooth((slope-.64)/1.25)*smooth((height-2.3)/3.3);
    shade.set('#63754c').lerp(new THREE.Color('#415b3d'),smooth(height/8)*.8);
    shade.lerp(new THREE.Color('#8c8c75'),rock*.82);
    shade.multiplyScalar(.89+hash(x,z)*.19);colors.push(shade.r,shade.g,shade.b);
   }
   const triangles=[],indices=geometry.index.array;
   for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];
    if(Math.max(positions.getY(a),positions.getY(b),positions.getY(c))>.035)triangles.push(a,b,c);
   }
   geometry.setIndex(triangles);geometry.computeVertexNormals();geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   const material=landscapeMaterial(city,'rock',noise);material.vertexColors=true;
   const mountains=new THREE.Mesh(geometry,material);mountains.castShadow=true;mountains.receiveShadow=true;mountains.userData.landscapeKind='mountains';
   this.scene.add(mountains);this.terrainGroup.push(mountains);
   // Small forest stands follow the hillside elevation; use instancing and
   // existing tree geometry, not hundreds of separate draw calls.
   for(let n=0;n<155;n++){
    const x=92+hash(n,13)*40,z=98+hash(n,53)*44,h=mountainHeight(x,z);
    if(h<.8||h>8.2||hash(n,71)<.23)continue;
    const start=new Map([...details.data].map(([key,v])=>[key,v.items.length]));
    this.tree(details,x,z,.45+hash(n,91)*.5,n%4?'pine':'shade');
    for(const [key,record] of details.data)for(let i=start.get(key)||0;i<record.items.length;i++)record.items[i].y+=h;
   }
  }
  if(city==='phuket'){
   for(let n=0;n<95;n++){
    const z=55+hash(n,9)*225,x=this.coast(z)-1.1+hash(n,21)*1.8;
    const size=.08+hash(n,37)*.27;
    details.add(LEAF,['#9b9984','#c2b79a','#aaa98c'][n%3],x,-.07,z,size,size*.36,size*.71,0,n,0);
   }
  }
  const group=details.build();this.scene.add(group);this.terrainGroup.push(group);this.treeKey='';
 }

 tree(batch,x,z,scale=1,kind='shade',detail='standard'){
  // Render-only upgrade: preserves tree kinds, footprint coordinates and save schema.
  if(kind===true)kind='palm';else if(kind===false)kind='shade';
  const near=detail==='near',tone=hash(x+7,z+3);
  const bark=tone>.52?'#79634b':'#927559',dark=tone>.55?'#3c784e':'#457f50';
  const mid=tone>.55?'#57935d':'#629b60',light=tone>.55?'#78ad6a':'#82b773';
  const twig=(ax,ay,az,bx,by,bz,radius,color=bark)=>{
   const direction=new THREE.Vector3(bx-ax,by-ay,bz-az),length=direction.length();
   if(length<.0001)return;
   const rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,direction.multiplyScalar(1/length)));
   batch.add(TWIG,color,x+(ax+bx)*.5*scale,(ay+by)*.5*scale,z+(az+bz)*.5*scale,
    radius*scale,length*scale,radius*scale,rotation.x,rotation.y,rotation.z,null,false,'bark');
  };
  const foliage=(color,dx,dy,dz,sx,sy,sz,rotation=0,high=near)=>{
   batch.add(high?LEAF_FINE:LEAF,color,x+dx*scale,dy*scale,z+dz*scale,sx*scale,sy*scale,sz*scale,
    0,rotation,0,null,false,'foliage');
  };
  // Building-plot landscaping remains cardinally symmetric: rotating an
  // existing lot must not change its collision-free decorative silhouette.
  if(detail==='standard'){
   if(kind==='palm'){
    twig(0,.04,0,0,1.40,0,.084,'#96734c');
    for(let n=0;n<8;n++)batch.add(PALM_FROND,n%2?mid:light,x,1.43*scale,z,.85*scale,scale,scale,
     0,n*TAU/8,0,null,false,'foliage');
    foliage('#98b368',0,1.43,0,.13,.10,.13);
   }else if(kind==='pine'){
    twig(0,.03,0,0,1.6,0,.08);
    for(let i=0;i<4;i++)batch.add(PINE_FINE,i%2?dark:mid,x,(.62+i*.27)*scale,z,
     (.49-i*.095)*scale,.66*scale,(.49-i*.095)*scale,0,0,0,null,false,'foliage');
   }else{
    if(kind!=='shrub')twig(0,.03,0,0,.88,0,kind==='banyan'?.14:.09);
    const height=kind==='shrub'?.23:kind==='banyan'?1.11:1.13;
    const radius=kind==='shrub'?.19:kind==='banyan'?.43:.31;
    const top=kind==='flower'?'#e99fb8':mid;
    foliage(kind==='flower'?'#cf859f':dark,0,height,0,radius*1.6,.34,radius*1.6,0,true);
    for(let n=0;n<4;n++){
     const a=n*Math.PI/2;
     foliage(n%2?top:light,Math.cos(a)*radius,height+.06,Math.sin(a)*radius,
      radius*.93,.25,radius*.93,0,true);
    }
   }
   return;
  }
  if(kind==='palm'){
   twig(0,.04,0,.055,1.40,-.035,.084,'#96734c');
   if(near)for(let n=0;n<5;n++)batch.add(CYL,'#b79a68',x+.02*scale,(.27+n*.20)*scale,z-.014*scale,
    .089*scale,.016*scale,.089*scale,0,0,.04,null,false,'bark');
   const fronds=near?10:7;
   for(let n=0;n<fronds;n++){
    const a=n/fronds*TAU+hash(x,z)*.27;
    batch.add(PALM_FROND,n%3===0?dark:n%2?mid:light,x+.055*scale,1.43*scale,z-.035*scale,
     (n%3===0?.92:.77)*scale,scale,scale,0,a,0,null,false,'foliage');
   }
   foliage('#98b368',.055,1.43,-.035,.13,.10,.13);
   if(near)for(let n=0;n<3;n++)foliage('#a0af57',.06+Math.cos(n*TAU/3)*.12,1.30,-.035+Math.sin(n*TAU/3)*.12,.065,.10,.065);
   return;
  }
  if(kind==='pine'){
   twig(0,.025,0,0,1.70,0,.087,'#806347');
   const crowns=near?5:3;
   for(let i=0;i<crowns;i++){
    const level=i/(crowns-1),radius=.53-level*.34,y=.59+level*.69;
    batch.add(near?PINE_FINE:CONE,i%3===0?dark:i%2?mid:'#356a4b',x,y*scale,z,
     radius*scale,(near?.62:.79)*scale,radius*scale,0,hash(x+i,z)*.4,0,null,false,'foliage');
   }
   if(near)for(let n=0;n<5;n++){const a=n*TAU/5;foliage(n%2?dark:light,Math.cos(a)*.32,.76+hash(n,x)*.32,Math.sin(a)*.32,.17,.12,.19);}
   return;
  }
  if(kind==='shrub'){
   const clumps=near?9:4;
   for(let n=0;n<clumps;n++){
    const angle=n*2.39996+hash(x,z),ring=n===0?0:.18+.13*hash(n,x),height=.19+.12*hash(z,n);
    foliage(n%3===0?dark:n%3===1?mid:light,Math.cos(angle)*ring,height,
     Math.sin(angle)*ring,.30-.055*hash(n,z),.20+.045*hash(n,x),.25,angle);
   }
   if(near)for(let n=0;n<4;n++){const a=n*TAU/4;foliage('#91bc74',Math.cos(a)*.23,.31,Math.sin(a)*.22,.09,.085,.08,a);}
   return;
  }
  if(kind==='banyan'){
   twig(0,.035,0,0,.96,0,.145);
   for(const side of [-1,1]){
    twig(side*.025,.65,0,side*.57,1.07,-.10,.066);
    if(near)twig(side*.52,1.06,-.1,side*.76,.78,-.09,.020,'#7f654a');
   }
   foliage(dark,0,1.02,0,.72,.38,.66);
   foliage(mid,-.42,1.17,-.10,.50,.39,.52);
   foliage(light,.41,1.20,.12,.49,.40,.48);
   const crowns=near?9:4;
   for(let n=0;n<crowns;n++){
    const a=n*2.399963+hash(x,z),ring=.36+.27*hash(n,z);
    foliage(n%3===0?dark:n%3===1?light:mid,Math.cos(a)*ring,1.22+.16*hash(n,x),
     Math.sin(a)*ring,.32,.26,.30,a);
   }
   return;
  }
  // Shade and flowering trees share tapered trunks and an irregular layered crown.
  twig(0,.035,0,.025,.88,.015,.10);
  for(const side of [-1,1]){
   twig(.015,.68,.01,side*.38,1.05,.045+side*.09,.052);
   if(near)twig(side*.28,.92,.02+side*.07,side*.52,1.12,.04+side*.15,.028);
  }
  const flowering=kind==='flower';
  foliage(flowering?'#b96d8b':dark,0,1.16,0,.50,.42,.44);
  const crowns=near?10:5;
  for(let n=0;n<crowns;n++){
   const a=n*2.399963+hash(x,z),ring=.24+.30*hash(n,x);
   const color=flowering?['#d987a4','#eda1bb','#efbed0','#c97f9d'][n%4]:
    [dark,mid,light,'#579367'][n%4];
   foliage(color,Math.cos(a)*ring,1.12+.24*hash(z,n),Math.sin(a)*ring,
    .28+.09*hash(x,n),.27+.055*hash(n,z),.29,a);
  }
  if(flowering&&near)for(let n=0;n<9;n++){
   const a=n*2.399963,ring=.24+.26*hash(n,x);
   foliage(n%2?'#f5d4db':'#ffe1df',Math.cos(a)*ring,1.25+.2*hash(n,z),
    Math.sin(a)*ring,.070,.065,.075,a);
  }
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
  this.tree(b,tx,tz,(kind==='shrub'?.46:.67)+hash(tx,tz)*(kind==='banyan'?.75:.48),kind,(this.graphicQuality==='veryHigh'||Math.hypot(tx-cam.x,tz-cam.y)<27)?'near':'far');
 }
 for(const t of state.plantedTrees||[]){
  if(Math.abs(t.x-cellX*18)>span+3||Math.abs(t.y-cellZ*18)>span+3||!clear(t.x,t.y))continue;
  const scale=t.kind==='shrub'?.72:t.kind==='banyan'?1.30:t.kind==='palm'?1.12:1.04;
  this.tree(b,t.x,t.y,scale,t.kind,(this.graphicQuality==='veryHigh'||Math.hypot(t.x-cam.x,t.y-cam.y)<27)?'near':'far');
 }
 this.treeGroup.add(b.build());
 }
 // Clearing all three road layers is essential after destruction:
 // permanent meshes, ghost preview meshes, and the traffic heat overlay.
 // Otherwise a paused game can display a stale asphalt-coloured heat tile.
 invalidateRoads(){
  this.roadKey='';this.previewKey='';this.heatAt=-Infinity;
  this.disposeGroup(this.previewGroup);
  if(this.heatGroup)this.disposeGroup(this.heatGroup);
 }
 makeRoads(state,ROADS,junction,previewOnly=false){this.disposeGroup(this.roadGroup);this.disposeGroup(this.signalGroup);this.signals=[];const batch=new Batch(),line=new Batch();const roadWidths={small:ROADS.small.visualWidth||1.175,medium:ROADS.medium.visualWidth||2.35,large:ROADS.large.visualWidth||3.72};
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
 // One shared signal head for every lane from this incoming approach.
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
 this.signals.push({lenses,node:i,incoming:(port.dir+2)%4});
 }
 }else{const junctionWidth=Math.max(w,...[...r.links].map(n=>roadWidths[state.roads.get(n)?.type]||w));batch.box('#47565c',x,.081,z,junctionWidth,.055,junctionWidth);}}

 }
 this.roadGroup.add(batch.build(false),line.build(false));
 // A few merged meshes keep paving/curbs cheap even along long city roads.
 const streetSurfaces=new Map(),roadside=this.parking?.roadsideVisuals?.(state,junction.details)||[];
 for(const face of roadside){
  const key=face.color+':'+face.role;if(!streetSurfaces.has(key))streetSurfaces.set(key,{...face,vertices:[]});
  const out=streetSurfaces.get(key).vertices,points=face.points.map(p=>[...p]);let area=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-a[1]*b[0];}if(area>0)points.reverse();
  const top=points.map(([x,z])=>[x,face.height,z]),bottom=points.map(([x,z])=>[x,face.height-face.thickness,z]);
  for(let i=2;i<top.length;i++)out.push(...top[0],...top[i-1],...top[i]);
  for(let i=0;i<top.length;i++){const j=(i+1)%top.length;out.push(...top[i],...bottom[i],...top[j],...top[j],...bottom[i],...bottom[j]);}
 }
 for(const surface of streetSurfaces.values()){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(surface.vertices,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:surface.color,roughness:.94,metalness:0,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.userData.baseColor=surface.color;
  mesh.userData.nightRole=surface.role==='driveway'?'night-asphalt':'night-lot-base';this.roadGroup.add(mesh);
 }


 // Rounded shadow-casting hedges and raised flowers are instanced by colour; no
 // per-frame animation or dynamic lights. Their full bounds clear driveways.
 const hedges=new Batch(),petals=['#d97da2','#b28dd1','#e6bb56','#e89d78'],greens=['#477b50','#568c57','#65975d','#73a563'];
 for(const p of roadside.plants||[]){
  const acrossX=-p.uy,acrossZ=p.ux,lobes=[];
  for(let n=0;n<4;n++){
   const jitter=(((p.seed>>>(n*3))&7)-3)*.004,along=[-.28,-.09,.11,.29][n]+jitter;
   const cross=(((p.seed>>>(n*3+2))&3)-1.5)*.010;
   const x=p.x+p.ux*along+acrossX*cross,z=p.y+p.uy*along+acrossZ*cross;
   const radius=n===0||n===3?.145:.165,height=.105+((p.seed>>>(n*2))&3)*.009,y=.245+((p.seed>>>(n+8))&3)*.009;
   hedges.add(HEDGE_LEAF,greens[(n+(p.seed>>>6))%4],x,y,z,radius,height,.12,0,p.angle,0,null,false,'foliage');
   lobes.push({x,z,top:y+height});
  }
  if(p.flower)for(const n of [1,3]){
   const l=lobes[n],color=petals[(p.seed>>>8)%4],y=l.top+.014;
   for(let k=0;k<5;k++){const a=k*Math.PI*2/5+(p.seed%7)*.3;hedges.add(FLOWER_PETAL,color,l.x+Math.cos(a)*.038,y,l.z+Math.sin(a)*.038,.034,.014,.027,0,-a,0,null,false,'flower');}
   hedges.add(FLOWER_PETAL,'#d5b55e',l.x,y+.010,l.z,.022,.010,.022,0,0,0,null,false,'flower');
  }
 }
 if(roadside.plants?.length){const group=hedges.build(true);group.userData.roadsidePlants=true;this.roadGroup.add(group);}
 for(const [color,positions]of paint){if(!positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const material=new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.userData.baseColor=color;mesh.userData.nightRole='road-marking';this.roadGroup.add(mesh);}
 if(previewOnly)return;
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
  const offset=Math.max(.28,(ROADS[road.type]?.visualWidth||1.175)/2-.06);
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

 updateAISignalGlow(state){
  if(!this.aiSignalGroup)return;
  const nodes=[];
  for(const [i,setting]of state.signals)if(setting.mode==='smart'&&state.roads.has(i))nodes.push(i);
  nodes.sort((a,b)=>a-b);
  const key=state.city+':'+nodes.join(',');
  if(key!==this.aiSignalKey){
   this.aiSignalKey=key;
   this.disposeGroup(this.aiSignalGroup);
   this.aiSignalGlows=[];
   for(const node of nodes){
    const x=node%300,z=Math.floor(node/300);
    // A cyan-lit center island without a real GPU point light for each intersection.
    const halo=new THREE.Mesh(new THREE.CircleGeometry(1.05,32),
     new THREE.MeshBasicMaterial({color:'#38bdff',transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    halo.rotation.x=-Math.PI/2;halo.position.set(x,.164,z);halo.renderOrder=3;
    const ring=new THREE.Mesh(new THREE.RingGeometry(.48,.77,32),
     new THREE.MeshBasicMaterial({color:'#56eaff',transparent:true,opacity:.83,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.set(x,.168,z);ring.renderOrder=4;
    this.aiSignalGroup.add(halo,ring);
    for(const [dx,dz]of [[-.91,-.91],[.91,-.91],[-.91,.91],[.91,.91]]){
     const sparkle=new THREE.Mesh(new THREE.CircleGeometry(.085,12),
      new THREE.MeshBasicMaterial({color:'#9ffaff',transparent:true,opacity:.87,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
     sparkle.rotation.x=-Math.PI/2;sparkle.position.set(x+dx,.17,z+dz);sparkle.renderOrder=4;
     this.aiSignalGroup.add(sparkle);
    }
    this.aiSignalGlows.push(halo);
   }
  }
  const pulse=.78+.18*Math.sin(performance.now()*.0024);
  for(const halo of this.aiSignalGlows)halo.material.opacity=.24*pulse;
 }

 updateSignals(signalColor){const lit={red:'#ff6855',yellow:'#ffd56b',green:'#9eeb96'},dim={red:'#4d302e',yellow:'#494230',green:'#2b473f'};for(const s of this.signals||[]){const active=signalColor(s.node,s.incoming);for(const [name,lens]of Object.entries(s.lenses))lens.material.color.set(name===active?lit[name]:dim[name]);}}
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
  // STARTER REAR/SIDE ELEVATIONS. Place the visible glass, handles and trims
  // along each wall's OUTWARD normal; front-facing panes disappear in rear walls.
  if(t.starterTier){
   const wall=(face,c,x,y,z,w,h,d,offset=0,finish='stone',glow=false)=>{
    if(face==='rear')block(c,x,y,z-offset,w,h,d,finish,glow);
    else block(c,x+(face==='left'?-offset:offset),y,z,d,h,w,finish,glow);
   };
   const window=(face,x,y,z,w,h,tint='#6d969e',frame='#dfd9ca',lit=true)=>{
    wall(face,frame,x,y,z,w+.09,h+.08,.030,.025);
    wall(face,tint,x,y,z,w,h,.018,.055,'glass');
    wall(face,'#a7c3c2',x,y+h*.23,z,w*.85,.022,.010,.067,'glass');
    wall(face,frame,x,y,z,.022,h,.012,.070,'metal');
    wall(face,frame,x,y-h/2-.035,z,w+.11,.055,.055,.045);
    if(lit)wall(face,'#f6deb2',x,y-h*.17,z,w*.70,h*.35,.008,.067,'glass',true);
   };
   const door=(face,x,z,w=.35,h=.75,c='#7e806f',base=.17)=>{
    wall(face,'#d0c5b1',x,base+h/2,z,w+.08,h+.06,.035,.020);
    wall(face,c,x,base+h/2,z,w,h,.025,.045,'metal');
    wall(face,'#b6c6bb',x,base+h*.76,z,w*.65,h*.18,.014,.061,'glass');
    wall(face,'#d9c7a0',x+w*.28,base+h*.47,z,.028,.045,.015,.073,'metal');
    wall(face,'#c4b59a',x,base-.035,z,w+.12,.065,.055,.042);
   };
   const vent=(face,x,y,z,w=.30,h=.20,c='#8c9b91')=>{
    wall(face,'#566e6e',x,y,z,w+.045,h+.045,.028,.028,'metal');
    for(let k=0;k<5;k++)wall(face,c,x,y-h*.40+k*h*.20,z,w,.018,.020,.054,'metal');
   };
   const light=(face,x,y,z)=>{
    wall(face,'#667368',x,y,z,.11,.16,.035,.027,'metal');
    wall(face,'#f6db9f',x,y,z,.067,.08,.022,.060,'glass',true);
   };
   const drain=(x,z,h=1.10,c='#8d9b90',base=.16)=>{
    pole(c,x,base+h/2,z,.014,h,'metal');
    for(const y of [base+.14,base+h-.12])block('#b9b8a4',x,y,z,.048,.025,.025,'metal');
   };
   const rearRail=(x,z,w,y,c)=>{
    block(c,x,y+.13,z,w,.026,.022,'metal');
    for(let n=0;n<6;n++)block(c,x-w*.45+n*w*.18,y+.06,z,.018,.15,.018,'metal');
   };
   if(t.kind==='home'){
    // Domestic rear entrance, shutters, side glazing and gutters.
    for(const x of [.79,2.20]){
     window('rear',x,.73,.11,.49,.40,'#6e969c');
     for(const dx of [-.32,.32]){
      wall('rear','#8ea593',x+dx,.73,.11,.09,.48,.025,.040,'wood');
      for(let y=.54;y<.95;y+=.085)wall('rear','#6b8879',x+dx,y,.11,.072,.017,.012,.060,'wood');
     }
    }
    door('rear',1.50,.11,.36,.79,'#977052',.15);
    light('rear',1.50,1.05,.11);
    for(const [face,x] of [['left',.28],['right',2.72]]){
     window(face,x,.73,.58,.48,.42,'#80a5a8');
     wall(face,'#c6baa4',x,.25,.58,.89,.065,.025,.035);
    }
    drain(.30,.063,1.00);drain(2.70,.063,1.00);
   }else if(t.kind==='shop'){
    // Delivery door and stock-room windows, yellow side fascia and roller vent.
    window('rear',.77,.79,.095,.58,.30,'#859c8b');
    window('rear',2.22,.79,.095,.58,.30,'#859c8b');
    door('rear',1.50,.095,.40,.75,'#758575');
    vent('rear',2.23,.39,.095,.40,.17,'#b6b69c');
    light('rear',1.50,1.05,.095);
    for(const [face,x] of [['left',.26],['right',2.74]]){
     window(face,x,.70,.57,.43,.43,'#789782');
     wall(face,'#d7ae4c',x,1.05,.57,.83,.11,.035,.025,'metal');
     wall(face,'#b9a16b',x,.28,.57,.86,.07,.025,.025,'wood');
    }
    drain(.29,.058,1.00);drain(2.71,.058,1.00);
   }else if(t.kind==='restaurant'){
    // High kitchen windows, rear serving hatch, extractor and herb boxes.
    window('rear',.65,.79,.12,.43,.29,'#9cb4b4');
    door('rear',1.39,.12,.33,.73,'#44768d');
    vent('rear',.66,.42,.12,.45,.19,'#c2d1c9');
    light('rear',1.02,1.05,.12);
    window('left',.28,.75,.57,.44,.40,'#8aaeb8');
    wall('left','#b4c1b7',.28,1.03,.57,.51,.10,.09,.055,'metal');
    window('right',1.80,.77,.57,.43,.35,'#8aaeb8');
    drain(.32,.067,.95,'#6d8a92');
    for(const x of [2.06,2.35,2.64]){
     block('#b6a58b',x,.19,.14,.21,.18,.16,'stone');
     block('#5d8c63',x,.35,.14,.18,.19,.13,'stone');
    }
    for(const x of [1.91,2.73])block('#84a38e',x,.87,.21,.055,.43,.055,'wood');
   }else if(t.kind==='mall'){
    // Luxury elevation continues around the boutique wing and glass rotunda.
    for(const x of [.64,1.40]){
     window('rear',x,.76,.105,.47,.83,'#658c95','#e9dfcb');
     window('rear',x,1.42,.105,.44,.25,'#789ca0','#d7bf90',false);
    }
    for(const x of [.30,1.02,1.77])wall('rear','#bd9a5e',x,.98,.105,.025,1.43,.018,.058,'metal');
    for(const y of [.35,1.13,1.63])wall('rear','#d3bea0',1.04,y,.105,1.53,.047,.035,.025);
    window('left',.265,.86,.61,.56,1.03,'#648f98','#e5d8be');
    wall('left','#bd9a5e',.265,1.48,.61,.75,.038,.025,.050,'metal');
    window('right',2.80,1.02,.65,.58,1.22,'#729aa1','#d9c293');
    for(const a of [1.12,1.30,1.50,1.70,1.88].map(n=>n*Math.PI)){
     const x=2.21+Math.cos(a)*.468,z=.64+Math.sin(a)*.468;
     block('#bd9a5e',x,.94,z,.025,1.41,.025,'metal');
    }
    light('rear',1.04,1.57,.105);
   }else if(t.kind==='office'){
    // Continuous curtain-wall floors on the rear and left; service wing right.
    for(const y of [.51,1.10,1.70]){
     for(const x of [.57,1.05,1.50])window('rear',x,y,.115,.31,.36,'#83a7ad','#b9cfcc',y<1.5);
     window('left',.30,y,.61,.59,.36,'#83a7ad','#b9cfcc',y<1.5);
    }
    for(const y of [.24,.84,1.44,2.04]){
     wall('rear','#c7d5ce',1.01,y,.115,1.44,.047,.035,.028,'metal');
     wall('left','#c7d5ce',.30,y,.61,.98,.047,.035,.030,'metal');
    }
    door('rear',2.22,.15,.35,.78,'#547c85');
    window('right',2.725,.74,.63,.60,.62,'#6c9aa6','#c7d5ce');
    vent('rear',2.61,.88,.15,.20,.18,'#a9c0bd');
    light('rear',2.22,1.07,.15);
   }else if(t.kind==='factory'){
    // Rear loading shutter, transom glazing, corrugation and external pipework.
    for(let x=.34;x<2.72;x+=.13)wall('rear','#81918d',x,.68,.12,.023,.93,.024,.020,'metal');
    for(const [face,x] of [['left',.285],['right',2.715]]){
     for(const z of [.26,.40,.54,.68,.82,.96])wall(face,'#81918d',x,.67,z,.024,.92,.024,.020,'metal');
     wall(face,'#d89544',x,.27,.60,.90,.12,.040,.032,'metal');
     window(face,x,.91,.60,.61,.22,'#a5bfc0','#afbeb1',false);
     vent(face,x,.55,.60,.42,.20,'#b5c2b8');
    }
    wall('rear','#343e40',1.50,.63,.12,.82,.78,.035,.034,'metal');
    for(let y=.33;y<1.0;y+=.085)wall('rear','#7d8b86',1.50,y,.12,.76,.026,.018,.058,'metal');
    window('rear',.69,.93,.12,.43,.23,'#a9c2c1','#b9c4b7',false);
    window('rear',2.30,.93,.12,.43,.23,'#a9c2c1','#b9c4b7',false);
    for(const x of [.35,2.65])drain(x,.057,1.04,'#bd874a');
    light('rear',1.50,1.07,.12);
   }else if(t.kind==='park'){
    // Garden paths return behind the fountain; planted boundary and kiosk glazing.
    block('#d4c4a7',1.36,.15,.145,2.30,.045,.15,'stone');
    for(const x of [.28,.68,2.02,2.38]){
     block('#a49473',x,.17,.065,.27,.15,.09,'stone');
     block('#77966d',x,.30,.065,.24,.18,.10,'stone');
    }
    for(const x of [.15,2.88])for(const z of [.24,.49,.74,1.0]){
     block('#95815f',x,.28,z,.035,.40,.035,'wood');
     block('#c4b496',x,.40,z,.033,.045,.20,'wood');
    }
    window('rear',2.63,.50,.17,.23,.24,'#aec3b2','#d1cfb5',false);
    window('right',2.83,.50,.39,.25,.25,'#aec3b2','#d1cfb5',false);
    window('left',2.43,.50,.39,.24,.25,'#aec3b2','#d1cfb5',false);
    // Small timber supports and foliage are visible from both sides of the sign.
    for(const x of [1.10,1.30,1.50,1.70,1.90])block('#91aa78',x,.84,.102,.11,.10,.022,'wood');
   }else if(t.kind==='pub'){
    // Rear fire exit, acoustic louvres and neon returning around both roof edges.
    door('rear',1.50,.135,.45,.79,'#615871');
    for(const x of [.65,2.35]){
     vent('rear',x,.72,.135,.43,.36,'#9b86ad');
     wall('rear','#c49bd8',x,1.08,.135,.48,.025,.018,.062,'glass',true);
    }
    for(const [face,x] of [['left',.285],['right',2.715]]){
     window(face,x,.73,.62,.52,.44,'#716487','#b59bc6');
     wall(face,'#c48cdb',x,1.12,.62,.92,.027,.020,.041,'glass',true);
     for(const z of [.25,.99])wall(face,'#8a719a',x,.65,z,.040,.78,.028,.022,'metal');
    }
    light('rear',1.50,1.07,.135);
   }else if(t.kind==='casino'){
    // A second neon facade, side glass fins and ornamental card backs.
    for(const x of [.67,2.33])window('rear',x,.71,.135,.48,.65,'#547b94','#a4afbe');
    door('rear',1.50,.135,.44,.84,'#4b496b');
    wall('rear','#65d6df',1.50,1.25,.135,2.49,.030,.020,.050,'glass',true);
    for(const [face,x] of [['left',.285],['right',2.715]]){
     window(face,x,.74,.61,.58,.73,'#537c94','#abb6c4');
     for(const z of [.23,.98])wall(face,'#68cbd7',x,.78,z,.022,1.02,.018,.052,'glass',true);
    }
    for(const x of [1.02,1.50,1.98]){
     block('#eee5da',x,1.72,.544,.24,.36,.012,'stone');
     const p=point(x,.532);
     // Diamond orientation is composed with the building rotation.
     const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI/4));q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),turn));const e=new THREE.Euler().setFromQuaternion(q);
     batch.add(BOX,'#966d9d',p.x-.5,1.72,p.y-.5,.12,.12,.012,e.x,e.y,e.z,id,false,'metal');
    }
    light('rear',1.50,1.11,.135);
   }else if(t.kind==='hotel'){
    // Guest rooms have real rear balconies as well as the front balconies.
    for(const x of [.88,2.12]){
     window('rear',x,1.29,.12,.60,.43,'#7a9ca1','#e0ccb0');
     block('#cdb89a',x,1.00,.07,.73,.05,.10,'stone');
     rearRail(x,.022,.71,1.06,'#9b7b5c');
     window('rear',x,.59,.12,.58,.42,'#7a9ca1','#e0ccb0');
    }
    for(const [face,x] of [['left',.285],['right',2.715]])for(const y of [.60,1.30]){
     window(face,x,y,.59,.56,.41,'#7a9ca1','#e0ccb0');
     wall(face,'#b9a181',x,y-.25,.59,.76,.045,.030,.033,'wood');
    }
    for(const x of [.34,2.66])drain(x,.060,1.43,'#ad9476');
    light('rear',1.50,.94,.12);
   }
  }
  // STARTER COLLECTION: nine purpose-built 3x3 designs. All architecture
  // stops before v=1.27; the shared six-bay forecourt begins at v=1.28.
  if(t.starterTier&&b.key!=='home_starter'){
   const ivory='#eee5d6',stone='#c7bba7',gold='#bd9a5e',glass='#5b8d9d';
   const glyphs={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],P:['110','101','110','100','100'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],W:['101','101','111','111','101']};
   const badge=(text,x,y,z,w,bg,ink)=>{
    const unit=w/(text.length*4+1);
    block(bg,x,y,z,w+.06,unit*6,.045,'metal');
    for(let n=0;n<text.length;n++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)
     if(glyphs[text[n]]?.[row][col]==='1')block(ink,x-w/2+(n*4+col+1)*unit,y+(2-row)*unit,z+.029,unit*.78,unit*.78,.013,'glass',true);
   };
   const planter=(x,z,r=.13,y=.08)=>{
    block('#b6a58b',x,y+.09,z,r*1.6,.18,r*1.5,'stone');
    block('#638969',x,y+.24,z,r*1.7,.19,r*1.6,'stone');
    block('#98ae7e',x,y+.34,z,r*1.1,.11,r,'stone');
   };
   const table=(x,z,y=.10)=>{
    pole('#6c7066',x,y+.20,z,.022,.34,'metal');
    pole('#e8decc',x,y+.39,z,.16,.045,'stone');
    pole('#f5eee1',x,y+.42,z,.065,.014,'stone');
    pole('#d5b46c',x+.055,y+.44,z-.025,.025,.055,'glass');
    for(const side of [-1,1]){
     block('#987650',x+side*.21,y+.22,z,.13,.045,.14,'wood');
     block('#987650',x+side*.27,y+.33,z,.025,.22,.14,'wood');
    }
   };
   const local=(geo,c,x,y,z,w,h,d,rx=0,ry=0,rz=0,glow=false)=>{
    const p=point(x,z),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz));
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),turn));
    const angles=new THREE.Euler().setFromQuaternion(q);
    batch.add(geo,c,p.x-.5,y,p.y-.5,w,h,d,angles.x,angles.y,angles.z,id,glow,glow?'glass':'metal');
   };
   if(t.kind==='shop'){
    // Sunny yellow neighbourhood mini-market: open produce counter + shutter.
    block('#c5b897',1.50,.10,.62,2.70,.14,1.10,'stone');
    block('#f0ce74',1.50,.65,.56,2.48,.98,.93,'stone');
    block('#846b43',1.50,.25,.56,2.53,.10,.97,'wood');
    block('#c3963e',1.50,1.19,.57,2.70,.12,1.07,'metal');
    block('#eac253',1.50,1.04,1.08,2.68,.09,.30,'metal');
    for(let n=0;n<12;n++)block(n%2?'#f3e7bf':'#dab04f',.30+n*.215,1.01,1.22,.21,.14,.035,'cloth');
    badge('MART',1.50,1.23,1.12,1.12,'#a17a36','#fff3ce');
    pane(.75,.69,1.04,.72,.53,true,'#789782');
    block('#607664',1.58,.63,1.053,.43,.83,.055,'glass');
    block('#e9dec1',1.58,.63,1.09,.025,.80,.025,'metal');
    block('#c4bda6',2.25,.64,1.035,.69,.77,.055,'metal');
    for(let y=.32;y<1.03;y+=.10)block('#979c89',2.25,y,1.076,.66,.025,.025,'metal');
    for(const x of [.45,.74,1.03]){
     block('#a38655',x,.27,1.13,.25,.23,.22,'wood');
     for(const side of [-1,1])local(BALL,x<.7?'#aaae63':'#d49b65',x+side*.06,.42,1.13,.055,.055,.06);
    }
    planter(2.69,1.10,.10);return;
   }
   if(t.kind==='restaurant'){
    // Blue bistro: pitched kitchen pavilion + a separate open dining pergola.
    block('#d7cab4',1.50,.10,.63,2.72,.14,1.12,'stone');
    block('#eee6d9',1.04,.62,.57,1.52,.92,.90,'stone');
    gable('#427a98',1.04,.61,1.70,1.04,1.14,.36);
    block('#356988',1.04,.30,.57,1.57,.22,.93,'stone');
    pane(.72,.71,1.04,.59,.49,true,'#759da7');
    block('#3b718c',1.40,.61,1.055,.35,.81,.055,'wood');
    block('#9ac0c3',1.40,.78,1.09,.22,.29,.022,'glass');
    badge('DINE',1.04,1.21,1.10,.83,'#36677e','#fff0cd');
    for(const x of [1.91,2.73])for(const z of [.20,1.12])block('#c3b59e',x,.64,z,.045,1.13,.045,'wood');
    for(let n=0;n<6;n++)block('#447e99',2.32,1.23,.20+n*.178,.91,.045,.07,'wood');
    table(2.32,.47);table(2.32,.96);
    for(const x of [.30,1.75])planter(x,1.12,.09);
    block('#ffe3b1',1.60,.98,1.10,.065,.11,.06,'glass',true);return;
   }
   if(t.kind==='mall'){
    // Ivory/brass boutique galleria, with an offset round glazed atrium.
    block('#d2c6b1',1.50,.11,.63,2.74,.16,1.12,'stone');
    block('#eae1d1',1.04,.91,.60,1.55,1.51,.99,'stone');
    block('#b69c70',1.04,.44,1.12,1.62,.10,.10,'metal');
    for(const x of [.40,1.04,1.68])block(ivory,x,.74,1.13,.075,1.24,.095,'stone');
    pane(.72,.80,1.10,.44,.83,true,'#628b90');
    pane(1.35,.80,1.10,.44,.83,true,'#628b90');
    for(const x of [.58,1.10,1.58])pane(x,1.39,1.10,.32,.25,false,'#6d9496');
    pole('#628f9c',2.21,.92,.64,.46,1.52,'glass');
    pole('#d7c6a0',2.21,1.72,.64,.49,.09,'metal');
    pole('#9ab2ad',2.21,1.80,.64,.37,.07,'glass');
    for(const x of [1.90,2.21,2.52])block(gold,x,.91,1.075,.025,1.43,.035,'metal');
    block(ivory,2.74,1.01,.66,.12,1.72,1.04,'stone');
    block(gold,2.78,1.02,1.19,.035,1.70,.025,'metal');
    block('#f3eadb',1.03,1.72,.60,1.68,.12,1.08,'stone');
    badge('MALL',1.05,1.84,1.12,1.06,'#977c50','#fff3d0');
    for(const x of [.36,1.71,2.67])planter(x,1.14,.08);return;
   }
   if(t.kind==='office'){
    // Teal glass office: tall slim slab, a low side wing and roof solar array.
    block('#c4c5b7',1.5,.10,.63,2.72,.15,1.12,'stone');
    block('#4e8290',1.01,1.12,.61,1.42,1.99,.99,'glass');
    block('#427180',2.22,.67,.63,1.01,1.10,.96,'glass');
    for(const y of [.24,.84,1.44,2.04])block('#c7d5ce',1.01,y,1.13,1.48,.055,.07,'metal');
    for(const x of [.34,.77,1.20,1.69])block('#bbcfcc',x,1.13,1.14,.032,1.88,.04,'metal');
    for(const y of [.51,1.10,1.70])for(const x of [.55,.98,1.43])block('#a2bebe',x,y,1.15,.29,.30,.015,'glass');
    block('#d2dbd2',2.23,1.24,.62,1.09,.075,1.04,'metal');
    pane(2.18,.72,1.13,.65,.71,true,'#416571');
    badge('WORK',2.22,1.33,1.14,.82,'#315c69','#e8f4e5');
    block('#d8e0d5',1.02,2.17,.60,1.54,.11,1.07,'metal');
    local(BOX,'#365b73',1.02,2.28,.59,1.12,.05,.65,-.16);
    for(const x of [.72,1.04,1.36])block('#adc5ce',x,2.31,.60,.015,.02,.58,'metal');
    planter(2.67,1.12,.10);return;
   }
   if(t.kind==='factory'){
    // Orange industrial workshop: corrugated hall, machinery, ducts and stacks.
    block('#a9a79a',1.50,.10,.63,2.73,.14,1.12,'stone');
    block('#617578',1.50,.67,.60,2.43,.99,.96,'metal');
    for(let x=.32;x<2.74;x+=.13)block('#81918d',x,.68,1.10,.024,.93,.035,'metal');
    block('#bd7b39',1.50,.26,1.12,2.50,.13,.08,'metal');
    block('#d89544',1.50,1.20,.60,2.60,.12,1.04,'metal');
    for(const x of [.62,1.49,2.36]){
     gable('#748888',x,.59,.79,.94,1.23,.20);
     block('#a8c6c8',x,1.35,.79,.57,.035,.22,'glass');
    }
    block('#343e40',2.05,.63,1.14,.79,.72,.045,'metal');
    for(let y=.31;y<.96;y+=.08)block('#7d8b86',2.05,y,1.17,.74,.028,.022,'metal');
    pane(1.05,.78,1.11,.45,.44,true,'#b2c4ba');
    for(const x of [.45,.67]){
     pole('#797b6a',x,.49,1.12,.07,.60,'metal');
     pole('#db974b',x,.79,1.12,.085,.04,'metal');
    }
    for(const x of [.52,2.48]){
     pole('#6c7770',x,1.65,.37,.065,.69,'metal');
     pole('#d09a54',x,1.99,.37,.09,.06,'metal');
    }
    badge('WORKS',1.50,1.08,1.15,1.16,'#9d622e','#fff0ca');
    block('#f3bd64',2.64,1.30,1.12,.065,.09,.06,'glass',true);return;
   }
   if(t.kind==='park'){
    // Pocket garden: open planting beds, a fountain, benches and staff kiosk.
    block('#9ba77c',1.50,.08,.63,2.75,.10,1.13,'stone');
    block('#d4c4a7',1.50,.15,.94,2.58,.05,.25,'stone');
    block('#d4c4a7',1.50,.15,.60,.24,.05,.94,'stone');
    for(const x of [.52,2.18]){
     block('#b5aa8a',x,.18,.41,.63,.15,.49,'stone');
     pole('#987950',x,.44,.41,.035,.56,'wood');
     local(BALL,'#5c8b60',x,.81,.41,.24,.27,.23);
     local(BALL,'#88a56e',x-.12,.85,.41,.15,.17,.16);
    }
    pole('#c4bca3',1.50,.20,.49,.29,.17,'stone');
    pole('#7ab8b5',1.50,.29,.49,.24,.03,'glass');
    pole('#acced1',1.50,.49,.49,.018,.39,'glass');
    local(BALL,'#91c9c7',1.50,.68,.49,.06,.05,.06);
    for(const x of [.63,2.14]){
     block('#9f8058',x,.30,1.06,.56,.055,.18,'wood');
     block('#9f8058',x,.43,1.15,.56,.23,.035,'wood');
     for(const side of [-1,1])block('#676f5b',x+side*.20,.21,1.06,.04,.20,.13,'metal');
    }
    block('#a8b58f',2.63,.43,.39,.40,.59,.44,'wood');
    block('#6d8c6f',2.63,.77,.39,.48,.09,.49,'metal');
    block('#c4d6c2',2.63,.51,.625,.23,.24,.02,'glass');
    badge('PARK',1.50,1.02,.14,.81,'#527853','#e5e6b9');
    for(const x of [1.03,1.97])pole('#796c51',x,.53,.14,.023,.90,'wood');
    for(const x of [.30,.94,1.99,2.75])planter(x,.76,.075);return;
   }
   if(t.kind==='pub'){
    // Purple club: sculpted roof fins, round side lights and a music-note sign.
    block('#817987',1.50,.11,.63,2.73,.16,1.12,'stone');
    block('#625372',1.50,.66,.61,2.43,1.00,.95,'stone');
    block('#383749',1.50,.32,1.12,2.49,.17,.06,'metal');
    local(BOX,'#4c455f',.88,1.22,.61,1.44,.10,1.06,0,0,.12);
    local(BOX,'#73617f',2.13,1.25,.61,1.27,.10,1.06,0,0,-.12);
    block('#c48cdb',1.50,1.16,1.15,2.55,.045,.04,'glass',true);
    block('#44495e',1.50,.64,1.13,.66,.82,.045,'glass');
    block('#d3afdb',1.50,.66,1.17,.025,.78,.02,'metal');
    for(const x of [.64,2.36]){
     local(CYL,'#ad85c4',x,.77,1.13,.22,.04,.22,Math.PI/2);
     local(CYL,'#4c4b69',x,.77,1.16,.16,.045,.16,Math.PI/2);
    }
    badge('CLUB',1.50,1.42,1.12,.92,'#5c456e','#efccf3');
    for(const x of [1.18,1.69]){
     block('#d7a9e2',x,1.76,.60,.045,.45,.045,'glass',true);
     local(BALL,'#d7a9e2',x-.075,1.54,.60,.10,.055,.055,0,0,0,true);
    }
    block('#d7a9e2',1.44,1.97,.60,.55,.055,.045,'glass',true);
    for(const x of [.28,2.72])planter(x,1.12,.085);return;
   }
   if(t.kind==='casino'){
    // Sci-fi casino: neon pylons, three physical playing cards and chip stacks.
    block('#65657a',1.50,.10,.63,2.74,.14,1.12,'stone');
    block('#282c48',1.50,.70,.61,2.43,1.07,.95,'metal');
    block('#554b7a',1.50,1.26,.60,2.65,.14,1.04,'metal');
    block('#65d6df',1.50,1.35,1.13,2.62,.035,.04,'glass',true);
    for(const x of [.30,2.70]){
     block('#9eabc0',x,.81,1.12,.13,1.19,.12,'metal');
     block('#64dbe4',x,.82,1.19,.035,1.14,.018,'glass',true);
    }
    pane(1.50,.68,1.12,1.26,.69,true,'#447b91');
    badge('CASINO',1.50,1.23,1.15,1.50,'#453c69','#f1d4ee');
    for(let n=0;n<3;n++){
     const x=1.02+n*.48;
     block('#eee9db',x,1.72,.60,.34,.48,.055,'stone');
     block('#ba97b9',x,1.72,.563,.38,.52,.022,'metal');
     for(let pip=0;pip<=n;pip++)local(BALL,n%2?'#b36687':'#3e4d69',x+(n===2?(pip-1)*.067:0),1.72+(n===1?(pip-.5)*.13:0),.638,.042,.045,.012);
    }
    for(const x of [.58,2.42])for(let n=0;n<4;n++){
     pole(n%2?'#b47bb6':'#67c4ce',x,.23+n*.075,1.08,.13,.065,'metal');
     pole('#e8dfce',x,.269+n*.075,1.08,.08,.012,'stone');
    }
    return;
   }
   if(t.kind==='hotel'){
    // Warm inn: twin terracotta gables, guest balconies and a central reception.
    block('#d2c1a2',1.50,.11,.63,2.73,.16,1.12,'stone');
    block('#e6d7bd',1.50,.88,.59,2.43,1.46,.94,'stone');
    for(const x of [.88,2.12]){
     gable('#b68159',x,.61,1.23,1.05,1.67,.32);
     pane(x,1.29,1.08,.68,.43,true,'#71959a');
     block('#cdb89a',x,1.01,1.12,.80,.06,.18,'stone');
     block('#9b7b5c',x,1.13,1.22,.79,.025,.025,'wood');
     for(let n=0;n<5;n++)block('#9b7b5c',x-.34+n*.17,1.08,1.22,.018,.14,.018,'wood');
    }
    pane(.66,.57,1.08,.49,.42,true,'#71959a');
    pane(2.34,.57,1.08,.49,.42,true,'#71959a');
    block('#957350',1.50,.56,1.10,.43,.78,.045,'wood');
    block('#86a9ab',1.50,.73,1.14,.28,.28,.02,'glass');
    block('#ad8c5e',1.50,.97,1.13,.72,.055,.25,'wood');
    badge('INN',1.50,1.49,1.14,.49,'#8c6c49','#f9e3b7');
    for(const x of [.29,2.71])planter(x,1.12,.09);
    block('#f5d79b',1.50,.90,1.17,.065,.08,.035,'glass',true);return;
   }
  }
  // New ground-level 3x3 cottage: house at the rear, parking strictly
  // outside its footprint. No raised floor, supporting stilts or cars below it.
  if(b.key==='home_starter'){
   const cream='#eee4d2',wood='#977052',sage='#8ea593',roof='#697a77';
   block('#c6baa4',1.50,.12,.59,2.52,.18,1.04,'stone');
   block(cream,1.50,.67,.59,2.44,.96,.96,'stone');
   block('#d1c1a8',1.50,.22,.59,2.48,.07,1.00,'stone');
   gable(roof,1.50,.61,2.70,1.10,1.17,.40);
   block('#82958a',1.50,1.59,.61,2.72,.045,.060,'stone');
   // A shallow front stoop with an independent door canopy.
   block('#d4c5af',1.50,.12,1.14,.65,.16,.17,'stone');
   block('#c2af92',1.50,.045,1.24,.48,.06,.06,'stone');
   block(roof,1.50,1.13,1.13,.79,.055,.25,'metal');
   block(wood,1.50,.61,1.089,.43,.84,.045,'wood');
   block('#729ba1',1.50,.78,1.12,.26,.27,.020,'glass');
   block('#d6bb88',1.64,.58,1.13,.027,.045,.018,'metal');
   pane(.77,.73,1.085,.53,.46,true,'#6e969c');
   pane(2.24,.73,1.085,.53,.46,true,'#6e969c');
   for(const x of [.43,1.11,1.90,2.58]){
    block(sage,x,.73,1.12,.09,.54,.035,'wood');
    for(let y=.5;y<.99;y+=.09)block('#6b8879',x,y,1.145,.073,.018,.014,'wood');
   }
   pane(.79,.73,.10,.49,.40,false,'#6e969c');
   pane(2.20,.73,.10,.49,.40,false,'#6e969c');
   for(const x of [.269,2.731]){
    block('#80a5a8',x,.73,.58,.024,.42,.48,'glass');
    block('#e0d5c4',x,.49,.58,.065,.045,.56,'stone');
    block('#e4d9c9',x,.73,.58,.045,.46,.024,'wood');
   }
   for(const x of [.32,2.68]){
    block('#b8a68b',x,.20,1.13,.15,.18,.15,'stone');
    block('#628766',x,.34,1.13,.16,.16,.16,'stone');
    block('#dda995',x,.43,1.13,.07,.045,.07,'stone');
   }
   block('#f3dda7',1.50,1.06,1.13,.09,.07,.045,'glass',true);
   return;
  }
  // ORBIT CASINO: faceted midnight-blue pavilions, cyan light rails, cards,
  // chip sculptures and visible gaming tables. Every part stays off the lanes.
  if(t.kind==='casino'){
   const level=t.modelTier||tier,H=t.plotHeight,P=t.parkingZoneDepth;
   const L=.94,R=W-.94,cx=W/2,rear=P+.34,front=H-.89,D=front-rear,cz=(rear+front)/2;
   const ink='#20263f',violet='#51457b',chrome='#a9bbc8',cyan='#59e0e8',pink='#dc6cae',glass='#36748c',gold='#dbbb77';
   const floor=.28,roof=2.15+level*.62;
   const local=(geo,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,glow=false)=>{
    const p=point(x,z);batch.add(geo,color,p.x-.5,y,p.y-.5,sx,sy,sz,rx,turn+ry,rz,id,glow,glow?'glass':'metal');
   };
   const strip=(x,y,z,w,d,color=cyan)=>{block(chrome,x,y-.025,z,w+.03,.055,d+.025,'metal');block(color,x,y+.01,z,w,.028,d,'glass',true);};
   const chip=(x,y,z,r,color=cyan)=>{
    pole(ink,x,y,z,r,.10,'metal');pole(color,x,y+.055,z,r*.90,.035,'stone');pole('#e7ebdf',x,y+.078,z,r*.55,.012,'stone');
    for(let n=0;n<8;n++){const a=n*Math.PI/4;local(BOX,'#f2e9d4',x+Math.cos(a)*r*.78,y+.08,z+Math.sin(a)*r*.78,r*.26,.015,r*.13,0,-a);}
   };
   const sign=(word,x,y,z,width)=>{
    const glyph={C:['111','100','100','100','111'],A:['010','101','111','101','101'],S:['111','100','111','001','111'],I:['111','010','010','010','111'],N:['101','111','111','111','101'],O:['111','101','101','101','111']};
    block(ink,x,y,z,width+.18,.58,.10,'metal');const pixel=width/(word.length*4),ox=x-width/2;
    for(let k=0;k<word.length;k++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[word[k]][row][col]==='1'){
     block('#eee9db',ox+(k*4+col+.5)*pixel,y+(.5*4-row)*.072,z+.065,pixel*.78,.056,.025,'stone');
    }
    strip(x,y-.29,z+.075,width,.035);
   };
   // Offset setbacks give each size an architectural silhouette of its own.
   block('#a6b0ba',cx,.15,cz,R-L,.18,D,'stone');
   block(ink,cx,.30,cz,R-L-.10,.14,D-.08,'metal');
   block(violet,cx,(floor+roof)/2,cz,R-L-.34,roof-floor,D-.28,'metal');
   // Recessed front arcade with actual views of the gaming floor.
   block(ink,cx,1.20,front+.016,R-L-.57,1.65,.09,'metal');
   const bays=level===1?3:level===2?5:7;
   for(let n=0;n<bays;n++){
    const x=L+.30+(n+.5)*(R-L-.60)/bays,bw=(R-L-.60)/bays;
    block(glass,x,1.12,front+.074,bw-.13,1.33,.035,'glass');
    strip(x-bw*.43,1.13,front+.10,.025,.035);
    block(chrome,x,.40,front+.10,bw-.09,.07,.10,'metal');
   }
   // A projecting entrance canopy is supported, clear of the frontage lane.
   block(ink,cx,2.04,front+.12,Math.min(2.15,R-L-.2),.15,.44,'metal');
   strip(cx,2.13,front+.30,Math.min(2.0,R-L-.3),.045);
   for(const dx of[-.70,.70]){pole(chrome,cx+dx,1.10,front+.22,.045,1.95,'metal');strip(cx+dx,1.13,front+.24,.025,.025,pink);}
   block('#74b4c2',cx,1.05,front+.105,.78,1.25,.025,'glass');block(chrome,cx,1.04,front+.13,.035,1.24,.02,'metal');
   // Faceted arrival pylons and diagonal armor make the silhouette futuristic.
   for(const side of[-1,1]){
    const x=side<0?L+.40:R-.40,z=front-.18,radius=.23+level*.065;
    local(CYL,ink,x,roof*.5,z,radius,roof,radius);
    for(let n=0;n<5;n++){
     const yy=.55+n*(roof-.6)/4;
     local(CYL,chrome,x,yy,z,radius+.035,.09,radius+.035);
     local(CYL,side<0?cyan:pink,x,yy+.055,z,radius+.04,.035,radius+.04,0,0,0,true);
    }
    local(CONE,chrome,x,roof+.16,z,radius+.07,.30,radius+.07);
    const finZ=rear+D*.52;
    local(BOX,chrome,x,roof+.25,finZ,.12,.85,D*.65,0,0,side*.30);
    local(BOX,side<0?cyan:pink,x,roof+.25,finZ+.015,.055,.80,D*.61,0,0,side*.30,true);
   }
   // Sloping armor fins break the mass without hiding the side and back detail.
   for(const side of[-1,1]){
    const x=side<0?L+.10:R-.10;
    for(let j=0;j<Math.max(3,Math.floor(D/.6));j++){
     const z=rear+.25+j*(D-.5)/(Math.max(3,Math.floor(D/.6))-1);
     block(glass,x,1.33,z,.07,1.3,.33,'glass');
     local(BOX,chrome,x,1.42,z,.095,1.9,.09,side*.09);
     strip(x,roof-.13,z,.055,.22,side<0?cyan:pink);
    }
   }
   block(ink,cx,roof,cz,R-L+.04,.18,D+.04,'metal');
   for(const z of[rear,front])strip(cx,roof+.11,z,R-L-.05,.045,z===rear?pink:cyan);
   for(const x of[L,R])strip(x,roof+.11,cz,.045,D-.06);
   // Rear elevation: luminous glazing and layered service architecture.
   block(glass,cx,1.25,rear-.03,R-L-.55,1.1,.05,'glass');
   for(let n=0;n<5+level;n++)block(chrome,L+.25+n*(R-L-.5)/(4+level),1.28,rear-.07,.055,1.5,.055,'metal');
   strip(cx,1.93,rear-.08,R-L-.38,.04,pink);
   const towerW=Math.min(R-L-1.1,1.55+level*.65),towerD=Math.min(D-.5,1.05+level*.3),top=roof+level*.65;
   block(ink,cx,roof+(top-roof)/2,cz,towerW,top-roof,towerD,'metal');
   for(let n=0;n<level+2;n++){
    const yy=roof+.15+n*(top-roof-.20)/(level+1);
    block(glass,cx,yy,cz+towerD/2+.015,towerW-.18,.16,.025,'glass');
    strip(cx,yy+.10,cz+towerD/2+.045,towerW-.08,.025,n%2?pink:cyan);
   }
   block(chrome,cx,top+.04,cz,towerW+.15,.10,towerD+.12,'metal');
   sign('CASINO',cx,roof-.39,front+.18,Math.min(3.7,R-L-.30));
   // Three giant physical playing cards form the rooftop crown.
   const cardY=top+.63,cardZ=cz+.02;
   for(let n=0;n<3;n++){
    const x=cx+(n-1)*.43,tilt=(n-1)*-.17;
    local(BOX,chrome,x,cardY,cardZ+n*.065,.53,.91,.065,0,0,tilt);
    local(BOX,'#eee9db',x,cardY,cardZ+.042+n*.065,.47,.85,.025,0,0,tilt);
    if(n===1){ // diamond pip, visible in daylight as well as at night
     local(BOX,'#bb3869',x,cardY,cardZ+.063+n*.065,.22,.22,.025,0,0,Math.PI/4);
    }else{
     for(const dx of[-.064,.064])local(BALL,ink,x+dx,cardY+.055,cardZ+.07+n*.065,.09,.09,.025);
     local(BOX,ink,x,cardY-.015,cardZ+.076+n*.065,.17,.17,.025,0,0,Math.PI/4);
     block(ink,x,cardY-.16,cardZ+.08+n*.065,.10,.08,.025,'metal');
    }
   }
   // Rooftop chip stacks and green baize tables identify the use from above.
   for(const side of[-1,1])for(let n=0;n<3+level;n++)chip(cx+side*(towerW/2+.30),roof+.16+n*.105,cz,.22,n%2?pink:cyan);
   if(level>=2){
    const rows=level===3?2:1;
    for(let row=0;row<rows;row++)for(let n=0;n<2;n++){
     const x=cx+(n?1:-1)*(towerW/2+.62),z=rear+.55+row*.95;
     pole(chrome,x,roof+.30,z,.035,.4,'metal');pole('#1c6f63',x,roof+.54,z,.34,.06,'stone');
     for(let k=0;k<3;k++){const a=k*Math.PI*2/3;chip(x+Math.cos(a)*.20,roof+.59,z+Math.sin(a)*.20,.045,k?pink:gold);}
    }
   }
   for(const x of[L+.36,R-.36]){
    block('#647782',x,.42,rear+.30,.42,.32,.40,'metal');planted(x,rear+.30,.30);
    strip(x,.62,front+.12,.17,.17,pink);
   }
   return;
  }

  // BLUE RESTAURANT COLLECTION: a neighbourhood bistro, a family restaurant,
  // and a two-storey dining house. Roofs, real place settings and a welcoming
  // menu/host entrance replace the former exposed counter-and-stool layout.
  if(t.kind==='restaurant'){
   const level=t.modelTier||1,W=t.plotWidth,H=t.plotHeight,P=t.parkingZoneDepth;
   const L=1.06,R=W-1.06,cx=W/2,rear=P+.34,front=H-.88,D=front-rear,mid=(rear+front)/2;
   const blue='#123b72',royal='#205998',navy='#142f53',sky='#709eb5';
   const ivory='#eee9dd',linen='#f3eee2',gold='#bba77f',oak='#ae8862',metal='#71858b';
   const floor=(x,y,z,w,d,color=ivory)=>block(color,x,y,z,w,.10,d,'stone');
   const trim=(x,y,z,w,d,color=blue)=>block(color,x,y,z,w,.065,d,'wood');
   const post=(x,z,height,y=.25)=>block(ivory,x,y+height/2,z,.105,height,.11,'stone');
   const decorBox=(color,x,y,z,w,h,d,a=0,finish='wood',glow=false)=>{
    const p=point(x,z);batch.add(BOX,color,p.x-.5,y,p.y-.5,w,h,d,0,turn+a,0,id,glow,finish);
   };
   const flower=(x,z,y=.25,w=.32)=>{
    block('#d2c4ac',x,y+.13,z,w,.26,w*.84,'stone');
    block('#527b53',x,y+.34,z,w*.92,.25,w*.75,'stone');
    for(const dx of[-.08,.07]){
     block('#84a36c',x+dx,y+.48,z+.02,w*.39,.15,w*.49,'stone');
     block('#d7adad',x+dx,y+.57,z+.02,.075,.065,.075,'stone');
    }
   };
   const table=(x,z,y=.25,scale=1)=>{
    const s=scale,top=y+.49;
    pole('#617880',x,y+.24,z,.034*s,.48,'metal');
    pole(oak,x,top-.025,z,.285*s,.065,'wood');
    pole(linen,x,top+.018,z,.295*s,.028,'stone');
    // Four dining chairs have upholstered backs and paired structural legs.
    for(let seat=0;seat<4;seat++){
     const a=seat*Math.PI/2,dx=Math.sin(a),dz=Math.cos(a),xx=x+dx*.43*s,zz=z+dz*.43*s;
     decorBox(royal,xx,y+.20,zz,.23*s,.065,.24*s,a);
     decorBox(blue,xx+dx*.12*s,y+.39,zz+dz*.12*s,.25*s,.33,.045,a);
     for(const side of[-1,1])decorBox(oak,xx+Math.cos(a)*side*.085*s,y+.10,zz-Math.sin(a)*side*.085*s,.030,.20,.035,a);
     const px=x+dx*.155*s,pz=z+dz*.155*s;
     pole('#e4e6d9',px,top+.042,pz,.060*s,.012,'stone');
     pole(seat%2?'#bb8b55':'#78985a',px,top+.057,pz,.034*s,.015,'stone');
     decorBox('#b9c7c7',px+Math.cos(a)*.085*s,top+.047,pz-Math.sin(a)*.085*s,.013,.012,.10*s,a,'metal');
     decorBox('#c6d2d0',px-Math.cos(a)*.085*s,top+.047,pz+Math.sin(a)*.085*s,.013,.012,.10*s,a,'metal');
     pole('#a7c2cb',x+dx*.20*s+Math.cos(a)*.085*s,top+.092,z+dz*.20*s-Math.sin(a)*.085*s,.023,.09,'glass');
    }
    pole('#c8d1c7',x,top+.11,z,.030,.14,'stone');
    block('#cba6a2',x,top+.20,z,.075,.065,.065,'stone');
   };
   const pendant=(x,z,y)=>{
    pole(gold,x,y+.15,z,.012,.36,'metal');
    pole(navy,x,y-.075,z,.13,.10,'metal');
    pole('#e6d6b5',x,y-.14,z,.10,.060,'stone');
    pole('#ffe1a7',x,y-.175,z,.075,.035,'glass',true);
   };
   const rail=(x,y,z,w)=>{
    block('#8ac8d0',x,y+.25,z,w,.45,.035,'glass');
    block(ivory,x,y+.49,z,w+.04,.040,.065,'wood');
    for(let i=0;i<Math.ceil(w/.65)+1;i++)block(gold,x-w/2+i*w/Math.ceil(w/.65),y+.24,z,.025,.48,.04,'metal');
   };
   const arch=(x,z,y,w,h)=>{
    const stem=h-.23;
    for(const side of[-1,1])block(ivory,x+side*w/2,y+stem/2,z,.06,stem,.08,'wood');
    for(let i=0;i<8;i++){
     const a=Math.PI-i*Math.PI/8,b=a-Math.PI/8;
     const x1=x+Math.cos(a)*w/2,y1=y+stem+Math.sin(a)*.23;
     const x2=x+Math.cos(b)*w/2,y2=y+stem+Math.sin(b)*.23;
     const p=point((x1+x2)/2,z);
     batch.add(BOX,ivory,p.x-.5,(y1+y2)/2,p.y-.5,Math.hypot(x2-x1,y2-y1)+.01,.055,.07,0,turn,Math.atan2(y2-y1,x2-x1),id,false,'wood');
    }
   };
   const glyph={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['111','100','100','100','111'],
    D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],
    G:['111','100','101','101','111'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],
    K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],
    N:['101','111','111','111','101'],O:['111','101','101','101','111'],P:['110','101','110','100','100'],
    R:['110','101','110','101','101'],S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    U:['101','101','101','101','111']};
   const sign=(text,x,y,z,w,h=.33)=>{
    text=text.replace(/[^A-Z]/g,'');const unit=Math.min(h/6,w/(text.length*4+1));
    block(navy,x,y,z,w,h,.055,'wood');
    block(gold,x,y-h/2,z+.034,w,.018,.016,'metal');
    for(let i=0;i<text.length;i++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[text[i]]?.[row]?.[col]==='1')
     block('#f1ddaf',x-(text.length*4-1)*unit/2+(i*4+col)*unit,y+(2-row)*unit,z+.037,unit*.75,unit*.80,.012,'stone');
    block('#ffe1a7',x,y+h/2-.015,z+.034,w*.92,.016,.012,'glass',true);
   };
   const roof=(x,z,w,d,eave,rise)=>{
    const half=w/2,angle=Math.atan2(rise,half),length=Math.hypot(half,rise);
    for(const side of[-1,1]){
     const p=point(x+side*half/2,z);
     batch.add(BOX,blue,p.x-.5,eave+rise/2,p.y-.5,length+.05,.09,d,0,turn,-side*angle,id,false,'metal');
     for(let k=0;k<Math.ceil(d/.20);k++){
      const zz=z-d*.47+k*d*.94/(Math.ceil(d/.20)-1),q=point(x+side*half/2,zz);
      batch.add(BOX,royal,q.x-.5,eave+rise/2+.052,q.y-.5,length+.05,.023,.035,0,turn,-side*angle,id,false,'metal');
     }
     block(ivory,x+side*half,eave-.025,z,.10,.14,d+.06,'wood');
    }
    block('#335e89',x,eave+rise+.06,z,.12,.10,d+.09,'metal');
   };
   const roomFront=level===3?front-.58:front-.72,roomRear=rear+.12;
   const eave=level===3?4.57:level===2?2.64:2.35;
   const kitchenW=level===1?1.36:level===2?1.80:2.05,kx=L+kitchenW/2,kz=rear+.75;
   // Connected terrace, tiled entrance and the actual restaurant foundation.
   floor(cx,.15,mid,R-L+.16,D+.20,'#c8beac');
   floor(cx,.25,mid,R-L-.10,D+.08,ivory);
   floor(cx,.12,front+.14,R-L,.28,'#d3c4ac');
   for(let i=0;i<5;i++)block(i%2?sky:ivory,cx-.40+i*.20,.31,front+.14,.15,.015,.19,'stone');
   // Closed rear and short side walls give the venue a proper dining-house
   // silhouette. Front arches and low windows leave the place settings visible.
   for(const side of[-1,1]){
    const x=side<0?L:R;
    block(blue,x,1.25,mid,.13,1.90,D-.10,'wood');
    block(ivory,x+side*.075,.59,mid,.027,.15,D-.13,'wood');
    for(let k=0;k<(level===3?4:2);k++){
     const z=rear+.55+k*(D-1.0)/(level===3?3:1);
     block('#7da6b7',x+side*.080,1.39,z,.035,.85,.55,'glass');
     block(ivory,x+side*.104,1.39,z,.022,.87,.023,'wood');
     block('#d5e5de',x+side*.105,1.60,z,.020,.025,.49,'glass');
    }
    block(ivory,x,eave-.06,mid,.16,.14,D-.09,'wood');
   }
   block(blue,cx,1.26,roomRear,R-L,1.93,.12,'wood');
   block(ivory,cx,.54,roomRear-.075,R-L,.20,.035,'wood');
   for(let k=0;k<(level===1?3:5);k++){
    const x=L+.45+k*(R-L-.90)/(level===1?2:4);
    block('#81a9b8',x,1.40,roomRear-.075,.60,.70,.028,'glass');
    block(ivory,x,1.40,roomRear-.10,.023,.76,.025,'wood');
    block(ivory,x,1.77,roomRear-.09,.67,.06,.05,'wood');
   }
   // Stainless show kitchen: range, pots, hood, prep bench, sink and plated
   // meals at a serving pass. It is a kitchen with no surrounding stool row.
   block('#d5dfdf',kx,.96,kz-.52,kitchenW,1.30,.10,'stone');
   block('#8ca0a7',kx,.65,kz-.24,kitchenW*.85,.62,.38,'metal');
   block('#cad6d3',kx,.99,kz-.24,kitchenW*.90,.06,.43,'metal');
   const hobs=level===1?4:6;
   for(let i=0;i<hobs;i++){
    const x=kx-kitchenW*.33+(i%3)*kitchenW*.33,z=kz-.30+Math.floor(i/3)*.18;
    pole('#242d35',x,1.04,z,.060,.020,'metal');
    if(i%2===0){pole('#97a9aa',x,1.10,z,.052,.11,'metal');pole('#ccd4cb',x,1.165,z,.060,.020,'metal');}
   }
   block('#6f858d',kx,1.65,kz-.34,kitchenW*.72,.16,.43,'metal');
   block('#a0b2b6',kx,1.79,kz-.38,kitchenW*.76,.065,.45,'metal');
   block(metal,kx,2.05,kz-.43,.16,.49,.17,'metal');
   block(royal,kx,.57,kz+.30,kitchenW*.86,.58,.34,'wood');
   block('#dec7a6',kx,.91,kz+.30,kitchenW*.95,.10,.45,'stone');
   for(const side of[-1,0,1]){
    pole(linen,kx+side*kitchenW*.25,.985,kz+.30,.07,.016,'stone');
    pole(side?'#9e7449':'#7e9859',kx+side*kitchenW*.25,1.01,kz+.30,.045,.035,'stone');
   }
   block('#d4ded6',kx+kitchenW*.28,1.02,kz-.20,.22,.04,.20,'metal');
   pole(metal,kx+kitchenW*.28,1.16,kz-.30,.014,.27,'metal');
   block(metal,kx+kitchenW*.28,1.30,kz-.24,.025,.025,.13,'metal');
   for(const dx of[-kitchenW*.30,0,kitchenW*.30])pendant(kx+dx,kz+.20,2.05);

   // Distinct dining plans: small three-table bistro; medium six-table
   // family restaurant; large six ground tables plus four upstairs tables.
   if(level===1){
    for(const [x,z]of[[3.53,rear+.87],[5.12,rear+.87],[4.35,front-.38]])table(x,z,.25,.84);
   }else if(level===2){
    for(const x of[4.00,5.89,7.78])for(const z of[rear+.80,front-.48])table(x,z,.25,.87);
   }else{
    for(const x of[4.12,6.07,8.02])for(const z of[rear+1.18,front-.80])table(x,z,.25,.88);
   }
   // Framed arched restaurant windows and doors, not full-height opaque
   // glazing. Customers' dining tables are visible through the open arches.
   const windows=level===1?[L+.52,R-.68]:[L+.58,cx-1.65,cx+1.65,R-.58];
   for(const x of windows){
    post(x,roomFront,level===3?2.10:2.02);
    if(x>kx+kitchenW*.5+.10){
     arch(x-.45,roomFront,.87,.74,1.12);
     block('#8db5bd',x-.45,1.03,roomFront-.01,.66,.31,.025,'glass');
     flower(x-.45,roomFront+.075,.28,.27);
    }
   }
   const entryX=level===1?L+.82:level===2?cx:cx-.10;
   post(entryX-.52,roomFront,2.08);post(entryX+.52,roomFront,2.08);
   arch(entryX,roomFront,.28,.93,1.85);
   // A blue/ivory striped awning shades the dining porch; low valance and
   // concealed warm light are attached to the facade and entrance posts.
   const awningY=level===1?2.13:2.32,awningZ=roomFront+.28,awningW=R-L-.05;
   block(blue,cx,awningY,awningZ,awningW,.08,.65,'wood');
   const stripes=Math.ceil(awningW/.25);
   for(let i=0;i<stripes;i++){
    const x=cx-awningW/2+(i+.5)*awningW/stripes;
    block(i%2?ivory:royal,x,awningY+.055,awningZ,awningW/stripes*.91,.025,.64,'wood');
    block(i%2?ivory:blue,x,awningY-.08,awningZ+.31,awningW/stripes*.91,.18,.035,'wood');
   }
   block('#ffe1a7',cx,awningY-.06,awningZ,awningW*.92,.018,.025,'glass',true);
   for(const x of[L+.10,R-.10]){post(x,front+.08,awningY-.25);flower(x,front+.13,.25,.30);}

   if(level===3){
    const upper=2.47,upperRear=rear+.16,upperFront=front-.50,upperMid=(upperRear+upperFront)/2;
    floor(cx,upper,upperMid,R-L-.15,upperFront-upperRear,'#dfd8c9');
    for(const x of[L+.10,cx,R-.10])for(const z of[upperRear+.10,upperFront-.10])post(x,z,upper-.30);
    // Two glazed upper dining rooms share a formal balcony. No tall counter
    // or bottle display competes with the dining setting.
    block(blue,cx,upper+1.08,upperRear,R-L-.15,1.98,.12,'wood');
    for(const x of[L+.10,R-.10]){
     block(blue,x,upper+1.03,upperMid,.13,1.90,upperFront-upperRear,'wood');
     for(let k=0;k<3;k++)block('#8eafbd',x+(x<cx?-.08:.08),upper+1.12,upperRear+.65+k*1.24,.025,.80,.69,'glass');
    }
    for(const x of[4.33,7.20])for(const z of[rear+1.35,front-1.00])table(x,z,upper+.07,.90);
    rail(cx,upper+.07,upperFront+.03,R-L-.23);
    for(const x of[L+.18,cx,R-.18])post(x,upperFront-.58,2.02,upper+.06);
    for(const x of[cx-1.65,cx+1.65]){arch(x,upperFront-.58,upper+.63,1.28,1.18);pendant(x,upperFront-1.14,upper+1.81);}
    // A supported twelve-step staircase connects the two real dining floors.
    for(let i=0;i<12;i++){
     const q=i/11,z=front-.75-q*2.78,y=.31+q*(upper-.31);
     block(i%2?ivory:'#cfc7b8',L+.66,y,z,.72,.13,.26,'stone');
     block(blue,L+.22,y+.22,z,.033,.43,.20,'wood');
    }
    // Blue upper dining roof, balcony awnings and warm chandeliers.
    roof(cx,rear+1.62,R-L+.12,3.12,eave,.56);
    for(const x of[4.33,7.20])pendant(x,rear+1.35,eave-.36);
    trim(cx,upper+.08,upperFront-.02,R-L-.16,.16,royal);
    block(blue,cx,upper+1.88,upperFront-.58,R-L-.14,.25,.15,'wood');
    for(const x of[L+.38,R-.38])flower(x,upperFront-.16,upper+.07,.35);
   }else{
    roof(cx,rear+.98,R-L+.13,2.05,eave,level===1?.54:.63);
    for(const x of[level===1?4.35:4.5,level===1?5.12:7.55])pendant(x,rear+.92,eave-.25);
   }
   for(const x of[L+.10,R-.10]){
    block(navy,x,1.57,front+.08,.17,.30,.18,'metal');
    block('#e6d4b1',x,1.57,front+.16,.12,.23,.035,'stone');
    block('#ffe1a7',x,1.57,front+.183,.105,.20,.018,'glass',true);
    block(gold,x,1.73,front+.08,.20,.05,.19,'metal');
   }
   // A clear restaurant identity at both the street entrance and the kitchen
   // edge: raised cream letters are visible in daytime, warm light at night.
   sign(level===1?'BLUE BISTRO':level===2?'BLUE RESTAURANT':'BLUE DINING',cx,level===3?4.25:awningY+.08,level===3?front-1.00:roomFront+.66,level===1?2.83:3.80,.35);
   // Menu easel, host desk and a three-dimensional fork-and-spoon emblem.
   const mx=entryX+(level===1?.59:.72),mz=front+.06;
   block(oak,mx,.54,mz,.29,.64,.075,'wood');
   block('#334a55',mx,.72,mz+.048,.26,.34,.022,'wood');
   for(let i=0;i<3;i++)block(ivory,mx,.80-i*.07,mz+.063,.18-i*.025,.014,.012,'stone');
   block(gold,mx,.34,mz+.09,.36,.055,.24,'metal');
   block(blue,entryX-.74,.56,roomFront-.12,.37,.57,.35,'wood');
   block(oak,entryX-.74,.87,roomFront-.12,.43,.055,.39,'wood');
   for(const side of[-1,1]){
    const x=entryX+side*.15;
    pole(gold,x,1.73,roomFront+.09,.018,.33,'metal');
    if(side<0)for(let k=0;k<3;k++)block(gold,x-.045+k*.045,1.94,roomFront+.09,.017,.15,.028,'metal');
    else pole(gold,x,1.94,roomFront+.09,.065,.13,'metal');
   }
   for(const x of[L+.18,R-.18]){flower(x,rear+.27,.25,.28);flower(x,front-.13,.25,.28);}
   // Rooftop exhaust and duct belong to the kitchen, kept below the roof ridge.
   block('#889b9e',kx,eave+.04,rear+.54,.21,.22,.24,'metal');
   block('#cad3ce',kx,eave+.17,rear+.54,.31,.055,.30,'metal');
   return;
  }

  // YELLOW SHOP COLLECTION: three DIFFERENT civic commerce programs.
  // Thai street market (1 floor) / supermarket (2) / open luxury retail
  // galleria (2 + usable rooftop). Geometry always follows the actual
  // parking-first parcels 6x8 / 8x8 / 8x13, leaving the rear 50% untouched.
  // Architectural openings and shelving are genuinely modeled in world 3D.
  if(t.kind==='shop'){
   const level=t.modelTier||1,W=t.plotWidth,P=t.parkingZoneDepth;
   const u=W*.5,z0=P+.34,z1=t.plotHeight-.78,deep=z1-z0;
   const yellow='#f5be36',sun='#f8d467',ochre='#c99220',navy='#374b59';
   const bone='#f1ecdb',chalk='#f8f3e9',glass='#7fbcca',gold='#e2bf6c';
   const slab=(x,y,z,w,d,c=bone)=>block(c,x,y,z,w,.075,d,'stone');
   const basket=(x,y,z,c,fruit='#8ea85a')=>{
    block('#b48b53',x,y,z,.26,.21,.25,'wood');
    block('#dab37b',x,y+.115,z,.29,.04,.28,'wood');
    for(const dx of[-.078,.078])for(const dz of[-.067,.067]){
     const p=point(x+dx,z+dz);
     batch.add(CYL,fruit,p.x-.5,y+.17,p.y-.5,.051,.075,.051,0,0,0,id,false,'stone');
    }
    block(c,x,y+.09,z+.132,.20,.08,.015,'wood');
   };
   const fixture=(x,z,wide=1,baseY=0,height=.95)=>{
    block('#e3dbce',x,baseY+.29+height*.43,z,wide,height*.82,.33,'stone');
    block('#53707a',x,baseY+.24+height*.90,z,wide+.13,.08,.40,'metal');
    for(let i=0;i<3;i++)for(let j=0;j<4;j++){
     const xx=x-wide*.37+i*wide*.37,yy=baseY+.35+j*height*.185;
     block((i+j)%3===0?'#daaa49':(i+j)%3===1?'#658d86':'#8ea2b0',
      xx,yy,z+.199,wide*.17,.14,.055,'stone');
    }
   };
   const shelves=(x,z,long=.95,floors=3)=>{
    block('#83979a',x,.80,z,.055,1.22,long,'metal');
    block('#83979a',x+.50,.80,z,.055,1.22,long,'metal');
    for(let shelf=0;shelf<floors;shelf++){
     const yy=.42+shelf*.32;
     block('#e9e9dc',x+.25,yy,z,.57,.055,long+.05,'metal');
     for(let j=0;j<5;j++){
      const zz=z-long*.43+j*long*.215;
      for(let k=0;k<2;k++){
       const xx=x+.10+k*.27;
       block((j+k+shelf)%3===0?'#d49a5a':(j+k+shelf)%3===1?'#5b9a84':'#d7d1a1',
        xx,yy+.11,zz,.13,.16,.12,'stone');
      }
     }
    }
    block(yellow,x+.25,1.50,z,.57,.15,long+.08,'metal');
   };
   const cashier=(x,z,upstairs=false)=>{
    const y=upstairs?2.51:0;
    block('#516c78',x,y+.57,z,.77,.65,.39,'wood');
    block('#f4c741',x,y+.93,z,.84,.09,.43,'stone');
    block('#2b454e',x+.19,y+1.13,z-.08,.24,.27,.11,'metal');
    block('#82bec7',x+.19,y+1.15,z-.015,.19,.17,.014,'glass',true);
    block('#edebe0',x-.22,y+1.04,z+.02,.26,.20,.12,'stone');
    for(let j=0;j<3;j++)block('#cfd2c7',x-.25+j*.14,y+.97,z+.24,.11,.025,.075,'stone');
   };
   const bench=(x,z,y=0,c='#bd9759')=>{
    block(c,x,y+.46,z,.62,.09,.28,'wood');
    for(const dx of[-.24,.24]){
     block('#566368',x+dx,y+.25,z,.038,.39,.033,'metal');
     block('#758c8f',x+dx,y+.22,z+.17,.035,.36,.030,'metal');
    }
   };
   const pillar=(x,z,h=2.20)=>block('#d9d9d0',x,.21+h/2,z,.080,h,.086,'metal');
   const railing=(x,y,z,w,direction='u')=>{
    if(direction==='u'){
     block('#a3d4d8',x,y,z,w,.39,.052,'glass');
     block('#e7e1d3',x,y+.22,z,w+.08,.042,.068,'metal');
     for(const dx of[-w*.45,0,w*.45])block('#d8d4c4',x+dx,y,z,.028,.42,.075,'metal');
    }else{
     block('#a3d4d8',x,y,z,.054,.39,w,'glass');
     block('#e7e1d3',x,y+.22,z,.069,.042,w+.08,'metal');
     for(const dz of[-w*.45,0,w*.45])block('#d8d4c4',x,y,z+dz,.075,.42,.028,'metal');
    }
   };
   const signGlyph={
    A:['010','101','111','101','101'],B:['110','101','110','101','110'],
    C:['111','100','100','100','111'],E:['111','100','110','100','111'],
    G:['111','100','101','101','111'],H:['101','101','111','101','101'],
    I:['111','010','010','010','111'],K:['101','101','110','101','101'],
    L:['100','100','100','100','111'],M:['101','111','111','101','101'],
    O:['111','101','101','101','111'],P:['110','101','110','100','100'],
    R:['110','101','110','101','101'],S:['111','100','111','001','111'],
    T:['111','010','010','010','010'],U:['101','101','101','101','111'],
    X:['101','101','010','101','101']};
   const sign=(word,x,y,z,width)=>{
    const chars=word.replace(/[^A-Z]/g,''),unit=Math.min(.085,width/(chars.length*4+2));
    block('#394c55',x,y,z,width,.46,.085,'metal');
    block(gold,x,y+.24,z+.05,width+.07,.035,.058,'metal');
    for(let i=0;i<chars.length;i++)for(let row=0;row<5;row++)
     for(let c=0;c<3;c++)if(signGlyph[chars[i]]?.[row][c]==='1'){
      const xx=x-(chars.length*4-1)*unit/2+(i*4+c)*unit;
      block('#ffe5a1',xx,y+(2-row)*unit,z+.055,unit*.73,unit*.78,.019,'glass',true);
     }
   };
   const item=([x,z])=>{basket(x,.42,z,'#c9ad81',(Math.round(x*20+z*13)%2)?'#bc8359':'#91ab59');};
   // Thin irregular pedestrian paving instead of a closed ground-floor wall.
   slab(u,.15,(z0+z1)/2,W-1.68,deep+.19,'#c9bfad');
   slab(u,.20,z1-.16,W-1.91,.34,'#e5ddcc');
   for(const side of[-1,1]){
    const x=u+side*(W/2-.90);
    block('#a2ac9a',x,.23,z0+deep*.55,.16,.26,deep*.76,'stone');
    for(let j=0;j<3;j++){
     const zz=z0+.34+j*deep*.31;
     block('#d7bc88',x,.36,zz,.24,.19,.26,'stone');
     block('#629064',x,.55,zz,.20,.19,.20,'stone');
    }
   }
   if(level===1){
    // OPEN THAI MARKET: one level, 3 separately framed colourful vendor stalls
    // with yellow awning tiles, produce crates, hanging scales and Thai lamps.
    const columns=[1.57,3.00,4.43],stallZ=z0+.81;
    for(let k=0;k<3;k++){
     const x=columns[k],sw=1.13;
     slab(x,.28,stallZ,sw,1.46,k===1?'#dfd1b6':'#d8c5a5');
     for(const dx of[-.50,.50])for(const dz of[-.58,.58])
      pole('#9b8364',x+dx,1.02,stallZ+dz,.027,1.44,'wood');
     // Gabled shape is suggested by staggered yellow awning stripes,
     // individual slats and rolled edges, not a three-metre concrete roof.
     block(k===1?'#eed455':'#f4c53d',x,1.78,stallZ,sw+.13,.075,1.50,'wood');
     for(let j=0;j<7;j++){
      const xx=x-.50+j*.167;
      block(j%2?'#fff0ba':'#e4ad27',xx,1.84,stallZ+.40,.145,.036,.67,'wood');
      block(j%2?'#e9ae26':'#ffe39b',xx,1.65,stallZ+1.01,.146,.27,.055,'wood');
     }
     block('#fff1bf',x,1.80,stallZ-.68,sw+.12,.06,.09,'wood');
     // Fish/vegetable/ready-made goods visibly DIFFER by stall.
     block('#8d795f',x,.54,stallZ+.35,.98,.50,.47,'wood');
     block('#d4baa0',x,.82,stallZ+.35,1.03,.075,.52,'wood');
     for(let j=0;j<3;j++){
      const xx=x-.30+j*.30;
      if(k===0)basket(xx,.92,stallZ+.24,'#b88353',['#73a55c','#af7342','#d9af51'][j]);
      else if(k===1){
       block('#c9d6d2',xx,.94,stallZ+.26,.24,.095,.19,'metal');
       block(j===1?'#9faeb8':'#88b7b8',xx,1.00,stallZ+.27,.18,.10,.15,'water');
       block('#8bb3bd',xx,1.08,stallZ+.25,.17,.04,.11,'glass');
      }else{
       block('#a87556',xx,.97,stallZ+.26,.23,.24,.19,'wood');
       block(j%2?'#db9a6b':'#e0c47c',xx,1.12,stallZ+.26,.18,.09,.16,'stone');
      }
     }
     for(const xx of[x-.40,x+.40]){
      block('#b2966c',xx,.34,stallZ-.38,.28,.25,.29,'wood');
      block('#7da165',xx,.54,stallZ-.38,.23,.19,.22,'stone');
     }
     // Hanging scales and small warm lanterns.
     pole('#6d7170',x,1.45,stallZ+.14,.018,.38,'metal');
     block('#fce4a9',x,1.24,stallZ+.14,.14,.11,.16,'glass',true);
     block('#7c7864',x+.28,1.37,stallZ+.53,.025,.43,.036,'metal');
     block('#c7bf9f',x+.28,1.18,stallZ+.53,.26,.050,.19,'metal');
    }
    // Front walkway: market baskets, mobile handcart and a low yellow banner.
    const aisle=z1-.57;
    for(const [x,z] of[[1.44,aisle],[2.40,aisle+.02],[4.73,aisle],[5.13,z0+.37]])item([x,z]);
    block('#7b8a87',3.31,.49,aisle,.62,.39,.35,'metal');
    block('#d6b65d',3.31,.74,aisle,.75,.09,.42,'wood');
    for(const xx of[3.06,3.56]){
     const p=point(xx,aisle+.20);
     batch.add(CYL,'#4e5b5c',p.x-.5,.25,p.y-.5,.105,.050,.105,Math.PI/2,0,0,id,false,'metal');
    }
    for(const xx of[1.05,4.95])pole('#8b805e',xx,1.08,z1-.24,.029,1.64,'wood');
    block('#efbe2e',u,1.93,z1-.29,W-2.09,.24,.16,'wood');
    sign('MARKET',u,2.17,z1-.18,Math.min(2.34,W-2.10));
    for(const xx of[1.17,4.87])
     block('#ffe4a0',xx,1.64,z1-.26,.14,.13,.15,'glass',true);
    // Open low rear stalls are clearly visible when rotated 180 degrees.
    for(const xx of[1.45,3,4.55])
     block('#b8a78f',xx,.45,z0-.13,1.14,.45,.095,'wood');
   }else if(level===2){
    // TWO-LEVEL SUPERMARKET: ground shelves and checkout in full view,
    // partial U-shaped mezzanine with upstairs aisles and a real stairwell.
    const left=1.29,right=W-1.29,back=z0+.15;
    block('#e4e7df',u,.81,back,right-left,1.20,.095,'stone');
    block(yellow,u,1.48,back+.07,right-left,.12,.16,'metal');
    for(const xx of[left,right]){
     pillar(xx,back+.15,2.80);
     pillar(xx,z1-.47,2.80);
     for(const zz of[back+.72,back+1.65])
      block('#a7c9cc',xx,.95,zz,.055,1.33,.53,'glass');
    }
    // Three primary aisles with visible sale products.
    for(const xx of[1.88,3.39,4.90])
     shelves(xx,z0+1.43,.99,3);
    for(const xx of[1.93,3.22,4.51,5.80])
     block('#eec842',xx,.25,z0+2.16,.75,.06,.19,'stone');
    // Functional front checkout with conveyor belt and point-of-sale.
    for(const xx of[2.20,4.05,5.85])cashier(xx,z1-.54);
    for(const xx of[1.33,6.70])block('#679b9c',xx,.78,z1-.55,.07,.94,.78,'glass');
    for(const xx of[1.33,6.70])
     block('#ffe6ad',xx,1.70,z1-.56,.12,.22,.15,'glass',true);
    // Real second floor as a narrow rear-and-left mezzanine, leaving
    // the high-volume ground shopping aisles OPEN from the camera.
    const deckY=2.24,deckZ=z0+.36;
    slab(u,deckY,deckZ,right-left,.77,'#d7dfdd');
    slab(left+.36,deckY,deckZ+1.05,.74,1.63,'#d7dfdd');
    railing(u,deckY+.27,deckZ+.41,right-left-.16);
    railing(left+.79,deckY+.27,deckZ+1.08,1.56,'v');
    for(const xx of[1.90,3.25,4.67,5.92]){
     block('#d6ddd6',xx,deckY+.37,deckZ-.12,.78,.66,.34,'stone');
     block('#d0ac56',xx,deckY+.72,deckZ-.12,.82,.07,.38,'wood');
     for(let j=0;j<4;j++)block(j%2?'#61918e':'#bd876a',xx-.27+j*.18,deckY+.79,deckZ-.12,.12,.10,.11,'stone');
    }
    // Fifteen small, separate steps are readable from four camera directions.
    for(let i=0;i<12;i++){
     const zz=z1-.60-i*.145,yy=.22+i*.173;
     block(i%2?'#d1d8d4':'#f2e9d8',6.19,yy,zz,.54,.12,.16,'stone');
     for(const side of[-1,1])block('#7c989b',6.19+side*.32,yy+.15,zz,.033,.27,.12,'metal');
    }
    // Roof is a THIN perimeter frame, not an opaque second-storey box.
    for(const xx of[left,right])block('#e7e6de',xx,3.48,z0+1.39,.14,.12,deep-.29,'metal');
    block('#edc24c',u,3.50,back+.05,right-left+.05,.12,.20,'metal');
    sign('SUPER',u,3.21,z1-.43,Math.min(2.54,W-2.5));
    for(let i=0;i<6;i++)
     block(i%2?'#f7d66c':'#e4bd3a',u-2.15+i*.84,3.57,z0+1.00,.06,.05,1.88,'metal');
   }else{
    // TWO STOREYS + ACTUAL ROOFTOP, TERMINAL-INSPIRED LUXURY GALLERIA.
    // A tall OPEN ATRIUM occupies the center; side shops frame it without
    // opaque exterior walls so escalators and retail floors remain visible.
    const back=z0+.15,edgeLeft=1.08,edgeRight=6.92,frontZ=z1-.18;
    for(const x of[edgeLeft,edgeRight]){
     pillar(x,back+.12,4.22);pillar(x,frontZ-.32,4.22);
    }
    // Yellow marble-like tiled concourse with inset wayfinding stripes.
    slab(u,.23,(back+frontZ)/2,5.78,frontZ-back,'#e8e1d2');
    for(const side of[-1,1])
     block('#ddb64c',u+side*1.00,.278,(back+frontZ)/2,.075,.026,frontZ-back-.12,'stone');
    // Retail pods on TWO DIFFERENT floors, with uncluttered central void.
    const shopXs=[1.79,6.20],zoneZ=[back+.91,back+2.38,back+3.89];
    for(const floor of[0,1]){
     const yy=floor?2.52:0;
     if(floor){
      slab(1.81,yy+.02,(back+frontZ)/2,1.54,frontZ-back-.14,'#e2e2da');
      slab(6.18,yy+.02,(back+frontZ)/2,1.54,frontZ-back-.14,'#e2e2da');
      for(const xx of[2.68,5.31])railing(xx,yy+.23,(back+frontZ)/2,frontZ-back-.43,'v');
     }
     for(let side=0;side<2;side++)for(let i=0;i<3;i++){
      const x=shopXs[side],zz=zoneZ[i],tone=(i+side+floor)%3;
      block(tone===0?'#e8d5a6':tone===1?'#d7e0dc':'#ddd0bf',
       x,yy+.64,zz,1.30,.89,1.08,'stone');
      // Exposed opening faces the atrium, glass only a low display skirt.
      const shopFace=x+(side===0?.68:-.68);
      block('#e9d1a1',shopFace,yy+.42,zz,.060,.33,.88,'stone');
      block('#7faeb8',shopFace+(side===0?.035:-.035),yy+.74,zz,.025,.22,.84,'glass');
      block('#fff0cd',x,yy+1.16,zz,1.48,.14,1.13,'stone');
      block(tone===0?yellow:tone===1?'#cda35b':'#edd186',x,yy+1.26,zz,1.52,.08,1.16,'stone');
      for(let j=0;j<3;j++){
       const pz=zz-.37+j*.37;
       fixture(x,pz,.50,yy,.62);
       block(i%2?'#f8d380':'#8ea6a4',shopFace+(side===0?.09:-.09),yy+.89,pz,.13,.16,.23,'stone');
      }
      block('#ffe3a8',shopFace,yy+1.43,zz,.10,.11,.40,'glass',true);
      for(const dx of[-.25,.25])block('#cfbda0',x+dx,yy+.23,zz+.40,.18,.13,.20,'wood');
     }
    }
    // Glass elevator on one side and escalator pair crossing atrium.
    // Steps climb from first-floor lobby to the REAL second-floor slab.
    const liftX=6.91,liftZ=back+2.60;
    for(const dz of[-.54,.54])pillar(liftX,liftZ+dz,4.16);
    for(const yy of[.46,1.59,2.82])
     block('#7eb9c6',liftX,yy,liftZ,.065,1.03,1.03,'glass');
    for(let stair=0;stair<2;stair++){
     const xx=stair===0?3.36:4.59;
     const goingForward=stair===0;
     const bottomZ=goingForward?frontZ-1.05:back+.87;
     for(let j=0;j<14;j++){
      const a=j/13;
      const zz=bottomZ+(goingForward?-1:1)*a*2.10;
      const yy=.35+a*2.18;
      block(j%2?'#b8c2c7':'#dfdfdb',xx,yy,zz,.74,.085,.182,'metal');
      block('#516876',xx,yy-.13,zz,.74,.14,.08,'metal');
      for(const sign of[-1,1]){
       block('#d9d6d0',xx+sign*.395,yy+.19,zz,.040,.39,.17,'metal');
       block('#7fc4cd',xx+sign*.424,yy+.34,zz,.024,.14,.145,'glass');
       block('#fff3c5',xx+sign*.425,yy+.43,zz,.020,.042,.15,'glass',true);
      }
     }
     for(const zz of[bottomZ,bottomZ+(goingForward?-2.10:2.10)])
      block('#b89456',xx,.31,zz,1.00,.055,.26,'stone');
    }
    // Geometric atrium pendant chandelier in the empty double-height core.
    const lightX=u,lightZ=back+3.10;
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4,xx=lightX+Math.cos(a)*.62,zz=lightZ+Math.sin(a)*.61;
     pole('#b6a77f',xx,3.34,zz,.025,.68,'metal');
     pole('#ffe3aa',xx,2.94,zz,.095,.12,'glass',true);
    }
    block('#d7bc77',lightX,3.83,lightZ,.17,.14,.18,'metal');
    // Suspended second ring of warm globes makes the open central atrium
    // recognisable from the camera as a luxury mall after sunset.
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4+Math.PI/8;
     const xx=lightX+Math.cos(a)*.38,zz=lightZ+Math.sin(a)*.38;
     pole('#ac9a79',xx,3.53,zz,.019,.37,'metal');
     pole('#ffe3aa',xx,3.29,zz,.065,.12,'glass',true);
    }
    // Front glass lobby is open from above, and the real roof is limited
    // to a LOUNGE at the left-hand wing, leaving escalators exposed.
    block('#ebc85b',u,4.34,frontZ-.02,5.34,.13,.25,'metal');
    sign('GALLERIA',u,3.86,frontZ+.12,Math.min(3.45,W-2.04));
    for(const x of[edgeLeft,edgeRight]){
     block('#e7e0d0',x,1.09,frontZ-.12,.12,1.74,.08,'metal');
     block('#99c8ca',x+(x>u?-.38:.38),1.09,frontZ-.09,.64,1.62,.040,'glass');
    }
    // Rooftop garden terrace on one WING, distinct third usable level.
    const rx=1.82,rz=back+2.30,ry=4.45,rw=1.73,rd=3.62;
    slab(rx,ry,rz,rw,rd,'#f0e7d1');
    block('#d7ae46',rx,ry+.09,rz,rw-.08,.045,rd-.10,'stone');
    railing(rx+rw*.49,ry+.28,rz,rd-.11,'v');
    railing(rx-rw*.49,ry+.28,rz,rd-.11,'v');
    railing(rx,ry+.28,rz+rd*.48,rw-.10);
    for(const zz of[rz-.90,rz+.53]){
     bench(rx,zz,ry);
     pole('#ffe9b4',rx,ry+.87,zz,.041,.09,'glass',true);
     basket(rx+.50,ry+.44,zz-.17,'#bd9767','#7bad79');
    }
    // Partial rooftop yellow-louver sunshade above the bar only.
    const sunZ=rz-rd*.32;
    for(const x of[rx-.60,rx+.60])block('#c9b47b',x,5.31,sunZ,.062,1.62,.064,'metal');
    block('#f2c146',rx,6.12,sunZ,1.51,.10,.68,'metal');
    for(let i=0;i<8;i++)block('#fff0bf',rx-.61+i*.175,6.19,sunZ,.042,.033,.68,'metal');
    // Stair landing, flower beds and illuminated rooftop sign.
    for(const xx of[1.19,2.45]){
     block('#c1ae8f',xx,ry+.24,rz+rd*.28,.26,.28,.30,'stone');
     block('#5f9069',xx,ry+.47,rz+rd*.28,.23,.22,.27,'stone');
    }
    block('#f5d16a',rx,5.08,rz+rd*.18,1.34,.10,.16,'glass',true);
    // Keep the atrium recognisably OPEN and visible from all 4 directions.
   }
   return;
  }

  // LUXURY RETAIL COLLECTION — three purpose-designed malls. The curved
  // glazed atrium, shopfronts and roof gardens are actual game geometry.
  // Site dimensions, rear parking half and both vehicle lanes are unchanged.
  if(t.kind==='mall'){
   const tier=t.modelTier||1,W=t.plotWidth,H=t.plotHeight,P=t.parkingZoneDepth;
   const cx=W/2,rear=P+.30,front=H-1.12,mid=(rear+front)/2;
   const width=W-2.10,depth=front-rear,base=.24,step=2.04,slab=.18,roof=base+tier*step;
   const cream='#eee9de',limestone='#d6cebb',bronze='#b69a67',dark='#263e41',glass='#59888d';
   const atriumW=tier===1?1.52:tier===2?2.34:2.68;
   const wingW=(width-atriumW)/2,wingX=atriumW/2+wingW/2;
   const solid=(c,x,y,z,w,h,d,finish='stone',lit=false)=>block(c,x,y,z,w,h,d,finish,lit);
   const beam=(c,x1,z1,x2,z2,y,w=.035,h=.045,finish='metal',lit=false)=>{
    const p=point((x1+x2)/2,(z1+z2)/2),angle=Math.atan2(z2-z1,x2-x1);
    batch.box(c,p.x-.5,y,p.y-.5,Math.hypot(x2-x1,z2-z1),h,w,turn-angle,id,lit,finish);
   };
   const planter=(x,z,y=base,w=.44,d=.36)=>{
    solid('#a79c82',x,y+.13,z,w,.26,d);
    solid('#485540',x,y+.27,z,w*.83,.045,d*.80);
    solid('#658051',x,y+.36,z,w*.90,.18,d*.82);
    solid('#90a565',x-.05,y+.46,z-.025,w*.63,.13,d*.60);
   };
   const letters={A:['010','101','111','101','101'],C:['111','100','100','100','111'],
    D:['110','101','101','101','110'],E:['111','100','110','100','111'],
    F:['111','100','110','100','100'],G:['111','100','101','101','111'],
    H:['101','101','111','101','101'],I:['111','010','010','010','111'],
    L:['100','100','100','100','111'],M:['101','111','111','101','101'],
    N:['101','111','111','111','101'],O:['111','101','101','101','111'],
    P:['110','101','110','100','100'],R:['110','101','110','101','101'],
    S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    U:['101','101','101','101','111'],V:['101','101','101','101','010'],
    W:['101','101','111','111','101'],Y:['101','101','010','010','010']};
   const label=(word,x,y,z,w,h=.29)=>{
    const text=word.replace(/[^A-Z]/g,''),cell=Math.min(h/6,w/(text.length*4+1));
    solid(dark,x,y,z,w,h,.045,'metal');
    solid(bronze,x,y-h/2,z+.027,w,.018,.012,'metal');
    // Raised brass letters stay visible in daylight. Concealed warm strips
    // light the sign at night instead of replacing the letters with glow.
    for(let i=0;i<text.length;i++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(letters[text[i]]?.[row]?.[col]==='1')
     solid('#e3cf9c',x-(text.length*4-1)*cell/2+(i*4+col)*cell,y+(2-row)*cell,z+.032,cell*.76,cell*.80,.012,'metal');
    solid('#ffdfa2',x,y+h/2-.013,z+.028,w*.92,.014,.012,'glass',true);
   };
   // Grounded stone forecourt and connected shallow steps, all within the
   // building half. These are pedestrian surfaces, not a new vehicle route.
   solid('#bdaba4',cx,.13,mid,width+.24,.22,depth+.24);
   solid('#e6dfd5',cx,base+slab/2,mid,width,slab,depth);
   solid('#bcb6a5',cx,.115,front+.35,width+.20,.19,.62);
   solid('#ede6d6',cx,.21,front+.21,width,.13,.40);
   for(let n=0;n<6;n++)solid('#b5aa91',cx-width*.46+n*width*.184,.283,front+.28,.018,.008,.32);

   // Separate occupied wings frame a full-height atrium. Upper floors have
   // real supporting walls/slabs and a rear bridge, leaving the central void.
   for(let level=0;level<tier;level++){
    const floor=base+level*step,inset=level*.10,face=front-inset,back=rear+inset;
    const d=depth-inset*2,wallY=floor+slab+(step-slab)/2;
    for(const side of[-1,1]){
     const wx=cx+side*(wingX-inset*.5),w=wingW-inset;
     const retreat=level===tier-1?(tier===3?(side>0?.48:.25):tier===2&&side>0?.27:0):0;
     const wingFace=face-retreat,wingDepth=wingFace-back,wingMid=(wingFace+back)/2;
     if(level)solid('#e6dfd5',wx,floor+slab/2,wingMid,w,slab,wingDepth);
     // Opaque structural walls sit behind the display glazing, which has
     // recess depth and pilasters rather than a repeated office window grid.
     solid(cream,wx+side*(w/2-.09),wallY,wingMid,.18,step-slab,wingDepth);
     solid(limestone,wx,wallY,back+.08,w-.18,step-slab,.16);
     solid(dark,wx,floor+1.09,wingFace-.035,w-.11,1.32,.065,'glass');
     const bays=tier===1?1:2,bayW=(w-.23)/bays;
     for(let bay=0;bay<bays;bay++){
      const x=wx-w/2+.115+(bay+.5)*bayW;
      solid(glass,x,floor+1.06,wingFace+.012,bayW-.08,1.22,.045,'glass');
      solid('#b9d3cc',x-bayW*.27,floor+1.17,wingFace+.042,.035,.90,.012,'glass');
      solid('#d1e2d8',x+bayW*.19,floor+1.35,wingFace+.045,bayW*.31,.025,.013,'glass');
      solid(bronze,x,floor+1.06,wingFace+.048,.022,1.24,.020,'metal');
      // Boutique display plinth and a lit product silhouette at the window.
      solid('#d7c9a9',x,floor+.57,wingFace+.058,bayW*.59,.16,.10);
      solid('#e6b589',x,floor+.82,wingFace+.065,.13,.32,.07);
      solid('#ffe7ba',x,floor+.48,wingFace+.065,bayW*.68,.025,.016,'glass',true);
     }
     solid(cream,wx,floor+step-.15,wingFace+.025,w+.06,.26,.23);
     solid(bronze,wx,floor+step-.025,wingFace+.15,w+.10,.035,.025,'metal');
     solid('#ffdfa3',wx,floor+step-.29,wingFace+.12,w*.96,.018,.026,'glass',true);
     for(const edge of[-1,1]){
      solid(cream,wx+edge*(w/2-.045),wallY,wingFace+.065,.11,step-slab,.22);
      solid(bronze,wx+edge*(w/2-.045),wallY,wingFace+.18,.027,step-slab-.16,.025,'metal');
     }
     if(level===0||tier===3&&level===1)
      label(level?'DINE':side<0?'ATELIER':'MAISON',wx,floor+1.69,wingFace+.16,Math.min(w-.18,1.70),.25);
     if(tier===3&&level===2&&side>0){
      solid(dark,wx,floor+1.02,wingFace+.093,w*.88,1.04,.055,'metal');
      label('CINEMA',wx,floor+1.13,wingFace+.134,w*.78,.37);
      for(let n=0;n<7;n++)solid('#d8bb87',wx-w*.35+n*w*.117,floor+.65,wingFace+.13,.05,.05,.018,'metal');
     }else if(tier===2&&level===1&&side<0){
      for(let n=0;n<10;n++)solid(bronze,wx-w*.44+n*w*.098,floor+1.12,wingFace+.10,.026,1.03,.11,'metal');
     }
     // Parking face has a glazed second entrance and shop ribbons; service
     // doors and mullions keep this elevation readable from reverse cameras.
     solid('#65898a',wx,floor+1.03,back-.017,w*.79,1.13,.040,'glass');
     for(let k=0;k<3;k++){
      const x=wx-w*.34+k*w*.34;
      solid(bronze,x,floor+1.03,back-.045,.028,1.18,.028,'metal');
      solid('#ffe4ae',x,floor+.64,back-.045,w*.18,.09,.017,'glass',true);
     }
     solid(cream,wx,floor+step-.14,back-.026,w+.03,.23,.13);
     // Alternating tall stone fins and teal glazing replace blank side walls.
     const outer=wx+side*w/2,panels=tier===3?5:3;
     for(let k=0;k<panels;k++){
      const z=back+(k+.5)*wingDepth/panels;
      solid(glass,outer+side*.012,floor+1.04,z,.030,1.20,wingDepth/panels*.69,'glass');
      solid('#adc9c7',outer+side*.033,floor+1.30,z,.018,.032,wingDepth/panels*.49,'glass');
      solid('#ffdda5',outer+side*.036,floor+.56,z,.015,.025,wingDepth/panels*.59,'glass',true);
      solid(limestone,outer+side*.04,wallY,z+wingDepth/panels*.40,.13,step-slab,wingDepth/panels*.12);
      solid(bronze,outer+side*.112,wallY,z+wingDepth/panels*.40,.018,step-slab-.12,.036,'metal');
     }
     solid(cream,outer,floor+step-.12,wingMid,.20,.20,wingDepth+.08);
    }
    if(level)solid('#e6dfd5',cx,floor+slab/2,rear+.36,atriumW,slab,.52);
   }

   // Bow-front atrium: faceted curved glass, thin brass ribs and continuous
   // floor-edge rings. Shape and entrance remain legible at the default zoom.
   const arcZ=front-.14,bulge=tier===1?.23:.34,segments=10;
   for(let k=0;k<segments;k++){
    const a=-Math.PI/2+k*Math.PI/segments,beta=a+Math.PI/segments;
    const ax=cx+Math.sin(a)*atriumW/2,az=arcZ+Math.cos(a)*bulge;
    const bx=cx+Math.sin(beta)*atriumW/2,bz=arcZ+Math.cos(beta)*bulge;
    for(let level=0;level<tier;level++){
     const floor=base+level*step;
     beam(k%3===1?'#82aeb0':'#547f87',ax,az,bx,bz,floor+1.08,.035,1.44,'glass');
     beam('#c3dbd7',ax,az,bx,bz,floor+1.52,.020,.028,'glass');
     beam(bronze,ax,az,bx,bz,floor+step-.15,.075,.12);
     beam('#ffdfb3',ax,az,bx,bz,floor+step-.23,.028,.016,'glass',true);
    }
    const ribH=roof-base-.13;
    solid(bronze,ax,base+ribH/2,az,.028,ribH,.035,'metal');
   }
   // Two-storey-plus atria have a visible internal balcony/bridge behind the
   // central upper glazing. These accents do not create extra occupied floors.
   for(let level=1;level<tier;level++){
    const y=base+level*step;
    solid('#d6c6a6',cx,y+.09,front-.29,atriumW,.12,.30);
    solid('#a4c8c5',cx,y+.43,front-.10,atriumW,.42,.025,'glass');
    solid(bronze,cx,y+.65,front-.085,atriumW,.035,.035,'metal');
   }
   // A broad champagne entrance canopy and slender planted forecourt make
   // the front read as an inviting public destination, not an office lobby.
   const entryW=atriumW+.48,canopyY=tier===3?2.22:tier===2?2.02:1.86,canopyZ=front+.27;
   solid(dark,cx,canopyY,canopyZ,entryW,.13,.61,'metal');
   solid('#d4c39e',cx,canopyY+.09,canopyZ,entryW+.08,.055,.63,'metal');
   solid('#ffe7bb',cx,canopyY-.08,canopyZ+.25,entryW*.91,.024,.022,'glass',true);
   for(const side of[-1,1]){
    const x=cx+side*(entryW/2-.13);
    solid(limestone,x,(base+canopyY)/2,front+.43,.105,canopyY-base,.105);
    solid(bronze,x,1.12,front+.49,.027,1.26,.018,'metal');
   }
   solid('#375e67',cx,.99,front+.24,atriumW*.60,1.34,.04,'glass');
   for(const side of[-1,1]){
    solid('#a6caca',cx+side*atriumW*.15,.99,front+.266,atriumW*.28,1.27,.018,'glass');
    solid(bronze,cx+side*.055,.99,front+.29,.024,.35,.022,'metal');
   }
   solid(bronze,cx,.99,front+.29,.028,1.32,.026,'metal');

   // Separate roof wings, light parapets and real barrel-vault skylight.
   const inset=(tier-1)*.10,rw=wingW-inset,rd=depth-inset*2;
   for(const side of[-1,1]){
    const wx=cx+side*(wingX-inset*.5);
    const retreat=tier===3?(side>0?.48:.25):tier===2&&side>0?.27:0;
    const roofMid=mid-retreat/2,roofDepth=rd-retreat;
    solid('#dad5c7',wx,roof+.065,roofMid,rw+.10,.13,roofDepth+.10);
    for(const end of[-1,1]){
     solid(cream,wx,roof+.18,roofMid+end*roofDepth/2,rw+.10,.17,.12);
     solid(bronze,wx,roof+.275,roofMid+end*roofDepth/2,rw+.10,.025,.13,'metal');
    }
    solid(cream,wx+side*rw/2,roof+.18,roofMid,.12,.17,roofDepth);
    solid('#708258',wx,roof+.17,roofMid,rw*.63,.09,roofDepth*.55);
    planter(wx,roofMid+roofDepth*.23,roof+.13,Math.min(.65,rw*.60),.35);
   }
   const skylightD=depth*.62,skylightZ=mid,archH=tier===1?.33:.50;
   for(let k=0;k<12;k++){
    const a=Math.PI-k*Math.PI/12,beta=a-Math.PI/12;
    const x1=cx+Math.cos(a)*atriumW*.48,y1=roof+.13+Math.sin(a)*archH;
    const x2=cx+Math.cos(beta)*atriumW*.48,y2=roof+.13+Math.sin(beta)*archH;
    const p=point((x1+x2)/2,skylightZ),angle=Math.atan2(y2-y1,x2-x1);
    batch.add(BOX,k%3?'#729ca3':'#9bbabc',p.x-.5,(y1+y2)/2,p.y-.5,Math.hypot(x2-x1,y2-y1),.035,skylightD,0,turn,angle,id,false,'glass');
    solid(bronze,x1,y1,skylightZ,.025,.035,skylightD+.04,'metal');
   }
   const title=tier===1?'GALLERIA':tier===2?'THE GALLERIA':'GRAND GALLERIA';
   label(title,cx,roof-.29,front+.23,tier===1?2.78:tier===2?3.12:3.75,.33);
   if(tier>=2){
    // A taller limestone blade and close-spaced bronze screens articulate one
    // corner; they anchor the building visually all the way down to the slab.
    const x=1.27;
    solid(limestone,x,(base+roof)/2,front-.23,.30,roof-base,.44);
    for(let k=0;k<5;k++)solid(bronze,x-.16+k*.08,(base+roof)/2,front+.006,.024,roof-base-.20,.055,'metal');
   }
   if(tier===3){
    // Roof dining pergola is supported on the roof slab; seating and planters
    // fit inside the parapet, never over a driving aisle or parking bay.
    const x=cx-wingX,z=mid-.55,w=1.40,d=1.65,y=roof+.15;
    for(const sx of[-1,1])for(const sz of[-1,1])solid(bronze,x+sx*w/2,y+.38,z+sz*d/2,.045,.76,.045,'metal');
    for(let k=0;k<7;k++)solid('#af946c',x,y+.78,z-d/2+k*d/6,w+.12,.045,.075,'wood');
    solid('#e0d1b5',x,y+.30,z,.53,.055,.53);
    solid(bronze,x,y+.15,z,.055,.30,.055,'metal');
    for(const s of[-1,1]){
     solid('#736951',x+s*.43,y+.22,z,.24,.045,.30,'wood');
     solid('#736951',x+s*.53,y+.36,z,.045,.28,.30,'wood');
     for(const a of[-1,1])solid(bronze,x+s*.43,y+.11,z+a*.10,.035,.22,.035,'metal');
    }
   }else if(tier===1){
    // The boutique has a sheltered seating edge instead of an oversized
    // tower feature competing with the little retail pavilion.
    for(const x of[cx-1.65,cx+1.65]){
     solid('#8d785b',x,.48,front+.36,.54,.08,.25,'wood');
     for(const dx of[-.20,.20])solid(bronze,x+dx,.34,front+.36,.04,.26,.16,'metal');
    }
   }
   for(const x of[1.30,W-1.30]){planter(x,front+.35);planter(x,rear+.27);}
   return;
  }

  // PURPLE NIGHTLIFE COLLECTION — this branch REPLACES the old generic
  // cuboid pubs, but deliberately does not touch handcrafted pub_small.
  // One-storey LIVE HOUSE: stage, instruments, L-shaped bar, seating.
  // Two-storey NIGHTCLUB: DJ/LED, glowing dancefloor, upper VIP horseshoe
  // gallery and an open-air terrace ON the second floor, not a third floor.
  // Respect original 8x8/8x13 plots, 20/40 parking, and 50:50 court split.
  if(t.kind==='pub'&&b.key!=='pub_small'){
   const large=b.key==='pub_large',W=t.plotWidth,back=t.parkingZoneDepth+.39;
   const front=t.plotHeight-.92,depth=front-back,center=W/2;
   const violet='#8848d8',royal='#682eb5',plum='#392154',ink='#282538';
   const amethyst='#b277f0',lilac='#d7a4f6',laser='#b748ff';
   const ember='#ffdaa2',ivory='#e9e2d7',iron='#5f6570',glass='#998bd1';
   const slab=(x,y,z,w,d,c='#55515f')=>block(c,x,y,z,w,.10,d,'stone');
   const post=(x,z,h,y=0,c=ink)=>block(c,x,y+.2+h/2,z,.065,h,.067,'metal');
   const railU=(x,z,y,w)=>{
    block(glass,x,y+.22,z,w,.42,.047,'glass');
    block('#d2b5e7',x,y+.45,z,w+.04,.045,.055,'metal');
    for(const xx of[x-w*.44,x,x+w*.44])
     block('#b49fae',xx,y+.23,z,.029,.45,.057,'metal');
   };
   const railV=(x,z,y,d)=>{
    block(glass,x,y+.22,z,.047,.42,d,'glass');
    block('#d2b5e7',x,y+.45,z,.055,.045,d+.04,'metal');
    for(const zz of[z-d*.43,z,z+d*.43])
     block('#b49fae',x,y+.23,zz,.057,.45,.029,'metal');
   };
   const light=(x,z,h=1.55,y=0,tint=laser)=>{
    pole('#565064',x,y+.20+h/2,z,.019,h,'metal');
    block('#a896af',x,y+h+.19,z,.13,.050,.13,'metal');
    block(tint,x,y+h+.13,z,.115,.11,.12,'glass',true);
   };
   const flower=(x,z,size=.17,y=0)=>{
    block('#797080',x,y+.32,z,size*1.19,.23,size*1.06,'stone');
    block('#486b5d',x,y+.54,z,size*.93,.22,size*.90,'stone');
    block('#965db1',x,y+.68,z,size*.53,.13,size*.52,'stone');
   };
   const letters={
    A:['010','101','111','101','101'],B:['110','101','110','101','110'],
    C:['111','100','100','100','111'],D:['110','101','101','101','110'],
    E:['111','100','110','100','111'],G:['111','100','101','101','111'],
    H:['101','101','111','101','101'],I:['111','010','010','010','111'],
    L:['100','100','100','100','111'],M:['101','111','111','101','101'],
    N:['101','111','111','111','101'],O:['111','101','101','101','111'],
    P:['110','101','110','100','100'],R:['110','101','110','101','101'],
    S:['111','100','111','001','111'],T:['111','010','010','010','010'],
    U:['101','101','101','101','111'],V:['101','101','101','101','010'],
    Y:['101','101','010','010','010']};
   const neonSign=(words,x,y,z,width)=>{
    const txt=words.replace(/[^A-Z]/g,''),cell=Math.min(.080,width/(txt.length*4+2));
    block(plum,x,y,z,width,.47,.10,'metal');
    block(amethyst,x,y+.255,z+.053,width+.08,.035,.065,'metal');
    for(let i=0;i<txt.length;i++)for(let row=0;row<5;row++)
     for(let col=0;col<3;col++)if(letters[txt[i]]?.[row]?.[col]==='1'){
      const xx=x-(txt.length*4-1)*cell/2+(i*4+col)*cell;
      block(lilac,xx,y+(2-row)*cell,z+.064,cell*.75,cell*.80,.019,'glass',true);
     }
   };
   const circle=(c,x,y,z,r,h=.065)=>{
    const p=point(x,z);batch.add(CYL,c,p.x-.5,y,p.y-.5,r,h,r,0,0,0,id,false,'metal');
   };
   const speaker=(x,z,y=0,side=1)=>{
    block('#232332',x,y+.84,z,.46,1.20,.40,'metal');
    block('#4b365f',x,y+.86,z+side*.211,.36,1.10,.024,'metal');
    for(const yy of[y+.55,y+1.08]){
     // Cylinder circles face front, avoiding a single featureless cabinet.
     const p=point(x,z+side*.238);
     batch.add(CYL_SMOOTH,ink,p.x-.5,yy,p.y-.5,.145,.045,.145,Math.PI/2,turn,0,id,false,'metal');
     block(violet,x,yy,z+side*.273,.14,.050,.020,'glass',true);
    }
    block(laser,x,y+1.51,z,.34,.07,.37,'glass',true);
   };
   const lightBar=(x,z,w,y=2.28,n=8)=>{
    block('#454051',x,y+.045,z,w,.085,.16,'metal');
    for(let i=0;i<n;i++){
     const xx=x-w*.45+i*w*.90/(n-1);
     block(i%2?laser:lilac,xx,y-.046,z+.105,.090,.12,.075,'glass',true);
     block('#302d38',xx,y+.14,z,.035,.18,.06,'metal');
    }
   };
   const stool=(x,z,y=0)=>{
    circle('#bd9e8b',x,y+.49,z,.13,.065);
    pole('#66636a',x,y+.27,z,.031,.43,'metal');
    for(const dx of[-.092,.092]){
     block('#5e5662',x+dx,y+.17,z,.026,.26,.029,'metal');
    }
   };
   const clubTable=(x,z,y=0,sofa=false,scale=1)=>{
    const p=point(x,z);
    batch.add(CYL,sofa?'#c2a0ca':'#9c8494',p.x-.5,y+.65*scale,p.y-.5,.25*scale,.064*scale,.25*scale,0,0,0,id,false,'wood');
    pole('#615b65',x,y+.44*scale,z,.035*scale,.50*scale,'metal');
    for(const sg of[-1,1]){
     const xx=x+sg*.39*scale;
     block(sofa?'#8354a0':'#54465f',xx,y+.32*scale,z,.34*scale,.18*scale,.32*scale,'wood');
     block(sofa?'#a879b0':'#775878',xx+sg*.125*scale,y+.52*scale,z,.12*scale,.30*scale,.33*scale,'wood');
     block('#aea7b5',xx,y+.16*scale,z,.040*scale,.19*scale,.036*scale,'metal');
    }
    pole(ember,x,y+.76*scale,z,.028*scale,.09*scale,'glass',true);
    for(const dx of[-.095,.095])
     pole('#b9aac8',x+dx*scale,y+.79*scale,z-.12*scale,.026*scale,.17*scale,'glass');
   };
   const bottles=(x,z,y=1.10,count=5)=>{
    for(let i=0;i<count;i++){
     const xx=x-(count-1)*.11/2+i*.11;
     pole(i%3===0?'#b790bc':i%3===1?'#a3b9bc':'#d5b082',
      xx,y+.12,z,.034,.22,'glass');
     block('#cabfc9',xx,y+.25,z,.048,.045,.04,'metal');
    }
   };
   const dance=(x,z,w,d,y=0)=>{
    slab(x,y+.22,z,w,d,ink);
    const cols=7,rows=large?7:5;
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
     const xx=x-w*.44+(i+.5)*w*.88/cols,zz=z-d*.43+(j+.5)*d*.86/rows;
     block((i+j)%4===0?laser:(i+j)%4===1?royal:
      (i+j)%4===2?'#a879df':'#584878',
      xx,y+.286,zz,w*.80/cols,.020,d*.76/rows,'glass',(i+j)%3===0);
    }
    for(const zz of[z-d*.49,z+d*.49])
     block('#c879e9',x,y+.31,zz,w+.05,.035,.045,'glass',true);
   };
   // Accessible plot has non-car pavement. Unlike the earlier pub code,
   // nothing below is a giant closed building block.
   slab(center,.15,(back+front)/2,W-1.79,depth+.23,'#4c4557');
   slab(center,.20,front-.19,W-2.10,.27,'#7c6b79');
   const street=(x,z,w,d)=>slab(x,.23,z,w,d,'#62576b');
   for(const side of[-1,1]){
    const x=center+side*(W*.5-.91);
    block('#735e86',x,.24,(back+front)/2,.12,.19,depth*.87,'stone');
    for(let i=0;i<3;i++)
     flower(x,back+.28+i*depth*.34,.16);
   }
   // Real backstage is visible on the parking-facing elevation, with a
   // pair of storage shelves; not a mysterious blank closed rear wall.
   const rearWall=back+.07;
   block('#665575',center,.58,rearWall,large?4.01:4.04,.70,.095,'stone');
   block(plum,center,1.03,rearWall,large?4.09:4.13,.13,.14,'metal');
   for(const x of[center-1.39,center+1.39]){
    block('#342d43',x,.61,rearWall+.09,.53,.75,.060,'metal');
    block('#a784ba',x,.61,rearWall+.13,.37,.40,.018,'glass');
    block('#d7b5eb',x,.89,rearWall+.14,.33,.070,.023,'glass',true);
   }
   for(let k=0;k<3;k++){
    block('#6c6170',center-1.72+k*.28,.29,rearWall+.31,.25,.14,.21,'wood');
    block('#6e4c87',center-1.72+k*.28,.42,rearWall+.31,.22,.12,.18,'stone');
   }
   if(!large){
    // MEDIUM: real stage with four musician positions, drum kit, PA,
    // stage wash lights and a side L-shaped drinks counter.
    const stageZ=back+.75,stageX=center-.43,stageW=3.37;
    slab(stageX,.44,stageZ,stageW,1.05,'#3d334c');
    block('#a065c0',stageX,.55,stageZ+.51,stageW,.075,.085,'glass',true);
    for(let i=0;i<8;i++)block(i%2?plum:violet,stageX-stageW*.44+i*stageW*.88/7,.50,
     stageZ+.09,.085,.024,.73,'wood');
    // Stage truss frames the performance rather than covering it with a roof.
    const top=2.31;
    for(const x of[stageX-stageW*.47,stageX+stageW*.47]){
     post(x,stageZ-.48,top-.20,.20,'#333344');
     light(x,stageZ-.29,top-.52,0,lilac);
    }
    lightBar(stageX,stageZ-.35,stageW+.20,top,9);
    block('#3e274e',stageX,1.20,stageZ-.52,stageW*.92,1.15,.073,'metal');
    for(let k=0;k<9;k++){
     const xx=stageX-stageW*.41+k*stageW*.82/8;
     block(k%2?'#8a43cb':'#ba75ef',xx,1.21,stageZ-.47,.22,.78,.023,'glass',k%3===0);
    }
    // Drum kit: kick, snare, two toms, cymbals, stool and chrome stands.
    const drumX=stageX-.42,drumZ=stageZ+.04;
    circle('#693981',drumX,.83,drumZ,.25,.25);
    circle('#d2a3e6',drumX,1.00,drumZ,.16,.035);
    for(const dx of[-.35,.33]){
     circle('#4f4460',drumX+dx,.90,drumZ+.09,.125,.19);
     circle('#e8d2f0',drumX+dx,1.01,drumZ+.09,.125,.025);
    }
    for(const dx of[-.48,.46]){
     pole('#b4afb3',drumX+dx,1.00,drumZ-.20,.021,.68,'metal');
     circle('#dfc27e',drumX+dx,1.38,drumZ-.20,.22,.034);
    }
    stool(drumX,drumZ-.29,.58);
    // Guitar and mic stand silhouettes create distinguishable band members.
    for(const xx of[stageX+.42,stageX+1.03]){
     pole('#b2a5b4',xx,1.21,stageZ+.17,.018,1.12,'metal');
     block('#e7d6eb',xx,1.79,stageZ+.14,.090,.050,.12,'metal');
     block('#ad7b5b',xx-.20,1.20,stageZ-.03,.23,.35,.10,'wood');
     block('#d2b488',xx-.20,1.51,stageZ-.03,.060,.28,.056,'wood');
    }
    speaker(stageX-stageW*.42,stageZ+.42,.26);
    speaker(stageX+stageW*.42,stageZ+.42,.26);
    // Bar forms a real L, with worktop, rear bottle shelves, and bar stools.
    const bx=6.20,bz=back+1.18;
    slab(bx,.27,bz,.90,1.39,'#5e3d79');
    block('#5a376c',bx,.57,bz,.70,.55,1.34,'wood');
    block(amethyst,bx,.92,bz,.89,.085,1.46,'stone');
    block('#e7b1ff',bx-.46,.58,bz,.047,.43,1.24,'glass',true);
    block(plum,bx-.31,.55,bz+.64,.82,.57,.48,'wood');
    block(lilac,bx-.31,.92,bz+.64,1.08,.08,.52,'stone');
    block('#cc7fed',bx-.31,.85,bz+.92,.91,.035,.039,'glass',true);
    for(const z of[bz-.44,bz+.02,bz+.47])stool(bx-.69,z);
    bottles(bx,bz-.37,1.21,5);
    bottles(bx,bz+.31,1.21,5);
    for(const z of[bz-.44,bz+.31])light(bx,z,1.63,0,ember);
    // Three comfortable viewing tables leave the center live performance
    // zone free. Small footprint means we DO NOT overfill the crowd.
    for(const [x,z] of[[1.64,front-.68],[3.36,front-.47],[5.16,front-.60]])
     clubTable(x,z,0,false,.78);
    // Slender pergola over BAR only, plus side-wall art and neon front sign.
    for(const x of[5.56,6.75])post(x,bz-.49,2.20,.18,plum);
    block('#3e3155',6.16,2.36,bz-.49,1.32,.10,.26,'metal');
    for(let i=0;i<7;i++){
     const zz=bz-.43+i*.14;
     block(i%2?amethyst:laser,6.15,2.42,zz,.90,.025,.060,'glass',i%2===0);
    }
    neonSign('LIVE',center,2.50,front-.20,2.50);
    for(const side of[-1,1]){
     const x=center+side*1.41;
     post(x,front-.36,2.43,.16,'#64427f');
     block('#d69afe',x,2.37,front-.31,.14,.085,.11,'glass',true);
    }
    for(const [x,z] of[[1.18,back+.62],[6.80,front-.44],[1.14,front-.48]])
     flower(x,z,.18);
   }else{
    // LARGE: night club occupying a large HALF-PLOT; upper VIP is an open U
    // around a true void and a terrace ON the second level (not a 3rd floor).
    const boothZ=back+.86,danceZ=back+3.03,upperY=2.37;
    const stageZ=boothZ,stageW=3.16;
    slab(center,.43,stageZ,stageW,1.15,'#3f294f');
    block('#cd69ff',center,.54,stageZ+.58,stageW,.06,.09,'glass',true);
    // Elevated DJ desk, turntables, controller and lighting strips.
    block('#33303e',center,.97,stageZ+.08,1.75,.74,.57,'wood');
    block('#a64eee',center,1.32,stageZ+.39,1.77,.10,.61,'glass',true);
    for(const xx of[center-.48,center+.48]){
     circle('#222b36',xx,1.40,stageZ+.06,.20,.054);
     circle('#9374d2',xx,1.435,stageZ+.06,.115,.016);
     pole('#f1ceea',xx,1.66,stageZ-.10,.029,.19,'glass',true);
    }
    for(let i=0;i<9;i++){
     const xx=center-.35+i*.087;
     block(i%2?'#c785db':'#8d7ab2',xx,1.38,stageZ+.17,.046,.050,.090,'metal');
    }
    for(const sx of[1.42,6.58])speaker(sx,stageZ,.19);
    block(plum,center,1.37,stageZ-.63,3.52,1.42,.12,'metal');
    block('#8439d2',center,1.37,stageZ-.557,3.25,1.21,.038,'glass',true);
    for(let j=0;j<11;j++){
     const xx=center-1.49+j*.30;
     block((j%3===0?laser:j%3===1?amethyst:royal),
      xx,.99+(j%3)*.27,stageZ-.526,.19,.17,.019,'glass',true);
    }
    // Overhead rig with separately illuminated moving-head silhouettes.
    for(const x of[2.23,5.77]){
     post(x,stageZ-.42,3.77,.16,'#302839');
     for(const zz of[stageZ-.27,stageZ+.46])
      light(x,zz,2.82,0,lilac);
    }
    lightBar(center,stageZ+.30,4.53,3.58,14);
    // A patterned dance floor glows in front of DJ, totally open to camera.
    dance(center,danceZ,2.52,1.36,0);
    for(const side of[-1,1]){
     const sx=center+side*1.50;
     for(const z of[danceZ-.56,danceZ+.52]){
      light(sx,z,1.73,0,side<0?laser:amethyst);
     }
    }
    // Ground bars are asymmetrical to keep all 4 faces visually distinct:
    // left straight drinks counter, right sofa alcoves + back storage.
    const leftBarX=1.47,leftBarZ=back+2.76;
    block('#60317c',leftBarX,.67,leftBarZ,.54,.73,2.13,'wood');
    block(lilac,leftBarX,.99,leftBarZ,.72,.09,2.24,'stone');
    block(laser,leftBarX+.38,.78,leftBarZ,.052,.30,1.91,'glass',true);
    for(const z of[leftBarZ-.74,leftBarZ-.25,leftBarZ+.24,leftBarZ+.73])
     stool(2.05,z);
    for(const z of[leftBarZ-.66,leftBarZ+.11,leftBarZ+.66])
     bottles(leftBarX,z,1.09,4);
    for(const z of[back+2.04,back+3.59,front-.56])
     clubTable(6.26,z,0,true,.78);
    // Upstairs gallery comprises TWO side wings and a REAR bridge;
    // central 2.5-unit opening remains genuinely hollow.
    const galleryLeft=1.86,galleryRight=6.14,sideW=1.52;
    const galleryD=Math.min(depth-.72,4.18);
    const galleryZ=back+galleryD/2+.10;
    for(const xx of[galleryLeft,galleryRight]){
     slab(xx,upperY,galleryZ,sideW,galleryD,'#7c5b8f');
     block('#ab7cc0',xx,upperY+.085,galleryZ,sideW-.09,.035,galleryD-.11,'stone');
     const inward=xx<center?xx+sideW*.50:xx-sideW*.50;
     railV(inward,galleryZ,upperY+.19,galleryD-.12);
     for(const zz of[galleryZ-galleryD*.43,galleryZ+galleryD*.43])
      post(xx+((xx<center)?-.56:.56),zz,upperY-.24,.15,'#4c3c59');
     for(const zz of[galleryZ-.72,galleryZ+.77])
      clubTable(xx,zz,upperY+.13,true,.70);
     // Upholstered booths at the terrace edge, glass and night lamps.
     for(const zz of[galleryZ-1.18,galleryZ+1.08]){
      block('#755285',xx,upperY+.58,zz,.87,.39,.37,'wood');
      block('#be82d2',xx,upperY+.80,zz,.86,.12,.34,'stone');
      light(xx,zz,1.34,upperY,lilac);
     }
    }
    const bridgeZ=back+.47,bridgeWidth=2.80;
    slab(center,upperY,bridgeZ,bridgeWidth,.76,'#ae8ac1');
    railU(center,bridgeZ+.40,upperY+.19,bridgeWidth-.14);
    railU(center,bridgeZ-.40,upperY+.19,bridgeWidth-.14);
    // Two side stairs, actual tiered meshes from 1st to 2nd floor.
    for(const side of[-1,1]){
     const x=center+side*2.12;
     for(let i=0;i<12;i++){
      const p=(i+.5)/12,zz=front-.64-p*1.92,yy=.27+p*(upperY-.28);
      block(i%2?'#8e789f':'#c2afc9',x,yy,zz,.54,.10,.20,'stone');
      for(const offset of[-.32,.32]){
       block('#7b6d86',x+offset,yy+.18,zz,.035,.38,.18,'metal');
       block('#ddbef0',x+offset,yy+.35,zz,.025,.09,.19,'glass');
      }
     }
    }
    // The VIP terrace occupies the FRONT section of the SECOND level;
    // it is open-air and not a rooftop "third storey".
    for(const x of[galleryLeft,galleryRight]){
     const terraceZ=galleryZ+galleryD*.32;
     railU(x,terraceZ+.60,upperY+.19,sideW-.11);
     for(const dx of[-.45,.45])
      flower(x+dx,terraceZ-.14,.17,upperY);
     block('#4a365a',x,upperY+1.22,terraceZ-.26,sideW-.18,.10,.33,'metal');
     for(const dx of[-.49,0,.49])
      block('#a563d4',x+dx,upperY+1.28,terraceZ-.26,.06,.055,.32,'glass',true);
    }
    // Lit front facade is merely an OPEN doorway, not a blank nightclub box.
    neonSign('PURPLE CLUB',center,3.97,front-.25,3.28);
    for(const sign of[-1,1]){
     const x=center+sign*1.55;
     post(x,front-.38,3.72,.24,plum);
     block('#b56cdb',x,3.79,front-.28,.16,.12,.16,'glass',true);
    }
    block('#7a4e9a',center,3.82,front-.36,3.40,.14,.20,'metal');
    for(let i=0;i<13;i++){
     const xx=center-1.43+i*.24;
     block(i%2?lilac:laser,xx,3.90,front-.25,.087,.060,.12,'glass',true);
    }
    for(const x of[1.02,6.96]){
     flower(x,front-.49,.18);flower(x,back+.41,.17);
    }
   }
   // No solid building box, visible 3D details from all directions.
   return;
  }

  // ORANGE FACTORY PROGRAM. Not a scaled box: every tier has a visibly
  // different real 3D production program, while preserving parking, roads,
  // jobs and the existing half-plot land allocation.
  // Small = Thai machine workshop / medium = assembly-line works /
  // large = smart industrial production campus with elevated control deck.
  if(t.kind==='factory'){
   const tier=t.modelTier||1,W=t.plotWidth,P=t.parkingZoneDepth;
   const L=.86,R=W-.86,cx=W/2,B=P+.36,F=t.plotHeight-.76,D=F-B,cz=(B+F)/2;
   const orange='#ee8c37',burnt='#be602b',amber='#f7b454',dark='#4b545c';
   const steel='#809399',pale='#d9ddda',charcoal='#313a43',concrete='#babbb2';
   const cyan='#83ccd3',cream='#f2ddad',blue='#4c7785',green='#73aa81';
   const tile=(x,y,z,w,d,color=concrete)=>block(color,x,y,z,w,.075,d,'stone');
   const strut=(x,z,y=0,h=2.22)=>block('#677780',x,y+.22+h/2,z,.076,h,.078,'metal');
   const cyl=(color,x,y,z,r,h,glow=false)=>{
    const p=point(x,z);batch.add(CYL,color,p.x-.5,y,p.y-.5,r,h,r,0,0,0,id,glow,'metal');
   };
   const tube=(x,z,y=0,h=1.65,r=.13)=>{
    cyl('#89969a',x,y+.21+h*.5,z,r,h);
    cyl(orange,x,y+.25+h,z,r+.055,.13);
    cyl('#53646d',x,y+.32+h,z,r*.62,.12);
   };
   const beacon=(x,z,y=1.72,color=amber)=>{
    block('#63717b',x,y-.08,z,.14,.10,.14,'metal');
    block(color,x,y,z,.13,.11,.13,'glass',true);
    block('#65757c',x,y+.09,z,.16,.043,.16,'metal');
   };
   const crate=(x,z,y=0,content=false)=>{
    block('#a5855d',x,y+.24,z,.44,.11,.39,'wood');
    block('#d3a46e',x,y+.46,z,.40,.31,.35,'wood');
    for(const dx of[-.15,.15])
     block('#906e4f',x+dx,y+.47,z+.182,.036,.32,.032,'wood');
    if(content){
     for(let k=0;k<3;k++)
      block(k%2?'#78998e':'#a6bab2',x-.11+k*.115,y+.68,z,.095,.12,.22,'metal');
    }
   };
   const pallet=(x,z,y=0)=>{
    tile(x,y+.24,z,.75,.60,'#8e765d');
    for(const xx of[x-.26,x+.26])
     block('#6d6658',xx,y+.15,z,.07,.13,.55,'wood');
    for(const xx of[x-.19,x+.19])
     block('#d2a56b',xx,y+.45,z,.30,.37,.43,'wood');
    for(const z0 of[z-.24,z+.24])
     block('#a57954',x,y+.55,z0,.68,.065,.05,'wood');
   };
   const conveyor=(x,z,length=2.10,width=.76,y=0)=>{
    tile(x,y+.34,z,width+.19,length+.09,charcoal);
    tile(x,y+.48,z,width+.05,length,'#98a4a5');
    for(const xx of[x-width*.40,x+width*.40]){
     block('#53646d',xx,y+.49,z,.052,.23,length+.08,'metal');
     for(const zz of[z-length*.39,z+length*.39])
      block('#54636d',xx,y+.21,zz,.045,.42,.045,'metal');
    }
    const n=Math.max(8,Math.floor(length/.12));
    for(let i=0;i<n;i++){
     const zz=z-length*.46+i*length*.92/(n-1);
     block(i%2?'#c3cdcc':'#89999a',x,y+.528,zz,width*.78,.041,.050,'metal');
    }
    for(const v of[-.31,.20])
     block('#c8914a',x,y+.76,z+v,.45,.36,.34,'wood');
   };
   const workbench=(x,z,y=0)=>{
    tile(x,y+.70,z,.94,.50,'#a6b6b6');
    block('#667a84',x,y+.58,z,.88,.18,.45,'metal');
    for(const xx of[x-.37,x+.37]){
     block('#526670',xx,y+.34,z,.053,.51,.042,'metal');
     block('#d5e1df',xx,y+.91,z+.17,.075,.18,.085,'metal');
    }
    for(let i=0;i<3;i++)
     block('#a56a38',x-.27+i*.26,y+.81,z-.11,.18,.11,.14,'wood');
    cyl('#343d43',x+.22,y+.83,z+.13,.11,.055);
   };
   const machine=(x,z,y=0,style=0)=>{
    // Real punch press / lathe / milling robot, with separated toolhead,
    // clamp, safety guards, control panel, gears and animated-like lights.
    tile(x,y+.25,z,1.01,.95,'#7d8c90');
    block(style%2?steel:dark,x,y+.55,z-.12,.88,.57,.56,'metal');
    block(orange,x,y+.99,z-.28,.91,.34,.22,'metal');
    block('#e0e5e0',x,y+.88,z-.17,.54,.055,.36,'metal');
    block('#3e4b54',x,y+.78,z+.24,.72,.36,.25,'metal');
    for(const side of[-1,1]){
     const xx=x+side*.43;
     block('#b5d9d6',xx,y+.96,z+.12,.047,.78,.34,'glass');
     block('#7b8f92',xx,y+.56,z+.09,.048,.09,.50,'metal');
    }
    block(orange,x,y+1.19,z-.04,.16,.31,.18,'metal');
    cyl('#bdcfcd',x,y+1.01,z+.10,.11,.08);
    block('#536876',x+.32,y+1.05,z+.28,.17,.34,.13,'metal');
    block('#9de5d8',x+.32,y+1.11,z+.36,.12,.15,.025,'glass',true);
    beacon(x-.34,z-.37,y+1.41,style%2?cyan:amber);
   };
   const robot=(x,z,y=0,orientation=1)=>{
    cyl('#444f59',x,y+.34,z,.29,.29);
    cyl('#d8b088',x,y+.53,z,.18,.14);
    block(orange,x,y+.88,z,.28,.64,.23,'metal');
    block('#ba6b34',x+orientation*.22,y+1.18,z+.03,.47,.17,.22,'metal');
    block('#f2b562',x+orientation*.44,y+1.00,z+.10,.20,.47,.18,'metal');
    block('#53636b',x+orientation*.44,y+.71,z+.12,.10,.20,.19,'metal');
    for(const shift of[-.065,.065]){
     block('#b1c7c5',x+orientation*.44+shift,y+.61,z+.19,.035,.18,.16,'metal');
    }
    cyl('#5f7181',x+orientation*.17,y+1.20,z+.04,.105,.10);
    beacon(x,z,y+1.45,amber);
   };
   const fence=(x,z,y,w,direction='u')=>{
    if(direction==='u'){
     block('#8ca8aa',x,y+.28,z,w,.52,.046,'glass');
     block('#566d77',x,y+.57,z,w+.03,.045,.050,'metal');
     for(const dx of[-w*.41,0,w*.41])
      block('#6c8992',x+dx,y+.28,z,.03,.54,.05,'metal');
    }else{
     block('#8ca8aa',x,y+.28,z,.046,.52,w,'glass');
     block('#566d77',x,y+.57,z,.05,.045,w+.03,'metal');
     for(const dz of[-w*.40,0,w*.40])
      block('#6c8992',x,y+.28,z+dz,.05,.54,.03,'metal');
    }
   };
   const hopper=(x,z,r=.34,h=1.33)=>{
    cyl('#73878d',x,.30+h/2,z,r,h);
    cyl('#e0dfd5',x,.28+h,z,r+.05,.08);
    cyl(orange,x,.36,z,r+.04,.08);
    for(const dx of[-r*.64,r*.64]){
     block('#52666d',x+dx,.56,z,.042,.61,.045,'metal');
    }
    block('#8eacac',x,.69,z+r*.93,.36,.15,.21,'metal');
    beacon(x,z,.45+h);
   };
   const tank=(x,z,r=.37,h=1.83)=>{
    cyl('#b9c7c9',x,.25+h/2,z,r,h);
    cyl('#778d92',x,.23+h,z,r+.025,.11);
    cyl(orange,x,.30+h,z,r+.09,.075);
    for(const y of[.61,.95,1.33])
     cyl('#899fa3',x,y,z,r+.015,.055);
    for(const dx of[-r*.56,r*.56]){
     block('#71898e',x+dx,.33,z,.05,.20,.06,'metal');
    }
    block('#4a777f',x,.98,z+r*.92,.20,.17,.12,'metal');
   };
   const lightRail=(x,z,w,y=2.55)=>{
    block('#4b6167',x,y,z,w,.070,.12,'metal');
    const n=Math.max(5,Math.ceil(w/.35));
    for(let i=0;i<n;i++){
     const xx=x-w*.45+i*w*.90/(n-1);
     block('#e4debf',xx,y-.12,z,.13,.050,.12,'glass',true);
     block('#64747b',xx,y+.08,z,.018,.15,.019,'metal');
    }
   };
   const signChars={
    A:['010','101','111','101','101'],B:['110','101','110','101','110'],
    C:['111','100','100','100','111'],D:['110','101','101','101','110'],
    E:['111','100','110','100','111'],F:['111','100','110','100','100'],
    G:['111','100','101','101','111'],H:['101','101','111','101','101'],
    I:['111','010','010','010','111'],L:['100','100','100','100','111'],
    M:['101','111','111','101','101'],N:['101','111','111','111','101'],
    O:['111','101','101','101','111'],P:['110','101','110','100','100'],
    R:['110','101','110','101','101'],S:['111','100','111','001','111'],
    T:['111','010','010','010','010'],U:['101','101','101','101','111'],
    W:['101','101','111','111','101'],Y:['101','101','010','010','010']};
   const sign=(str,x,y,z,w)=>{
    const chars=str.replace(/[^A-Z]/g,''),cell=Math.min(.075,w/(chars.length*4+2));
    block('#4f5a60',x,y,z,w,.41,.085,'metal');
    block(orange,x,y+.22,z+.052,w+.05,.042,.063,'metal');
    block('#ffe1a1',x,y+.17,z+.052,w*.92,.025,.022,'glass',true);
    for(let i=0;i<chars.length;i++)for(let row=0;row<5;row++)
     for(let c=0;c<3;c++)if(signChars[chars[i]]?.[row]?.[c]==='1'){
      const xx=x-(chars.length*4-1)*cell/2+(i*4+c)*cell;
      block(cream,xx,y+(2-row)*cell,z+.060,cell*.72,cell*.77,.018,'metal');
     }
   };
   // Industrial concrete with striped OSHA-like pedestrian safety markings.
   tile(cx,.13,cz,W-1.79,D+.17,'#b5b5ac');
   tile(cx,.20,F-.20,W-2.04,.25,'#d0bc9e');
   for(const x of[L+.08,R-.08]){
    block('#ddaf58',x,.22,cz,.105,.03,D-.15,'stone');
    for(let i=0;i<3;i++){
     const zz=B+.24+i*(D-.45)/2;
     block('#7c8d82',x,.34,zz,.18,.19,.19,'stone');
     block(green,x,.49,zz,.16,.16,.17,'stone');
    }
   }
   if(tier===1){
    // SMALL THAI WORKSHOP: one open fabrication hall, low corrugated canopy
    // over the rear machines only, welding stations and visible yard.
    const z=B+.94;
    for(const xx of[1.42,6.57])for(const zz of[B+.37,B+1.33])
     strut(xx,zz,.02,1.87);
    tile(cx,2.18,B+.39,5.13,.84,'#65717b');
    for(let i=0;i<14;i++){
     const x=1.64+i*.36;
     block(i%3===0?orange:'#819298',x,2.24,B+.40,.044,.025,.72,'metal');
    }
    block('#596971',cx,1.97,B+.17,5.21,.30,.084,'metal');
    for(let j=0;j<7;j++){
     const xx=1.75+j*.75;
     block('#a8bbc1',xx,1.98,B+.226,.23,.17,.019,'glass');
    }
    machine(2.25,z,0,1);
    workbench(4.11,z+.14);
    machine(5.66,z+.03,0,0);
    for(const xx of[2.21,5.82]){
     tube(xx,B+.23,0,1.36,.088);
     beacon(xx,B+.23,1.73);
    }
    // Two independent welding islands: welding mask, vise and orange
    // sparks interpreted as light rather than costly particle simulation.
    for(const xx of[2.56,5.55]){
     block('#485760',xx,.39,F-.52,.57,.22,.41,'metal');
     block(orange,xx,.58,F-.52,.37,.14,.28,'metal');
     block('#ffe7ab',xx,.75,F-.49,.12,.09,.14,'glass',true);
     for(let j=0;j<3;j++)
      block('#eab963',xx-.10+j*.09,.78,F-.31,.025,.045,.027,'glass',true);
    }
    pallet(1.26,F-.46);
    crate(6.73,F-.38,0,true);
    // Hand trolley and workshop side awning are actual meshes.
    block('#505b60',4.29,.35,F-.40,.68,.12,.49,'metal');
    block('#d7aa6c',4.29,.55,F-.40,.59,.29,.39,'wood');
    for(const dx of[-.29,.29])cyl('#48545a',4.29+dx,.24,F-.13,.11,.060);
    block('#849394',4.60,.69,F-.40,.038,.64,.040,'metal');
    for(const xx of[2.12,5.87]){
     block(orange,xx,1.18,F-.19,.080,.70,.12,'metal');
     beacon(xx,F-.20,1.60);
    }
    sign('WORKS',cx,2.62,F-.21,2.18);
    block(orange,cx,2.41,F-.25,2.44,.11,.19,'metal');
   }else if(tier===2){
    // MEDIUM: single tall ASSEMBLY PLANT with twin long production
    // lines, overhead crane, forklift, paint booth and a SMALL,
    // genuinely elevated operations deck to observe production.
    const lineD=D-1.42,mid=B+.47+lineD/2;
    conveyor(2.46,mid,lineD,.72);
    conveyor(5.47,mid,lineD,.72);
    for(const [x,z,side] of[[1.68,B+1.27,1],[3.22,B+2.71,-1],
      [4.66,B+1.45,1],[6.44,B+3.68,-1]]){
     robot(x,z,0,side);
    }
    machine(3.83,B+.99,0,1);
    hopper(6.34,B+.70,.28,1.24);
    for(const x of[1.32,6.67]){
     for(const z of[B+.32,F-.70])strut(x,z,.14,2.82);
     block(orange,x,3.21,cz,.095,.13,D-.55,'metal');
    }
    // Gantry spans two assembly belts and supports a hanging hook.
    for(const z of[B+1.17,F-1.08]){
     block('#53636d',cx,3.24,z,5.40,.18,.22,'metal');
     for(let i=0;i<10;i++)
      block(i%2?amber:orange,1.50+i*.55,3.38,z,.080,.09,.23,'metal');
    }
    block('#a7b4b3',cx,2.82,cz,.42,.51,.33,'metal');
    pole('#55616a',cx,2.43,cz,.039,.47,'metal');
    block(orange,cx,2.14,cz,.35,.15,.18,'metal');
    // Paint/packing booth uses GLASS and equipment, not closed box.
    const paintX=6.31,paintZ=F-.60;
    tile(paintX,.29,paintZ,.85,.73,'#53656b');
    for(const xx of[paintX-.37,paintX+.37]){
     block('#87b8be',xx,.94,paintZ,.033,1.20,.64,'glass');
     block('#b7c2c1',xx,1.58,paintZ,.052,.09,.73,'metal');
    }
    block('#77a5b3',paintX,.52,paintZ,.55,.24,.34,'metal');
    block(orange,paintX,1.57,paintZ,.89,.09,.74,'metal');
    for(const zz of[paintZ-.26,paintZ+.26])
     beacon(paintX,zz,1.77,cyan);
    // Overlook/control OFFICE mezzanine occupies only 2.0 x 1.04,
    // no ceiling covering the open assembly production lines.
    const officeX=2.35,officeZ=B+.67,deck=2.10;
    tile(officeX,deck,officeZ,1.94,.99,'#cbd1cf');
    for(const dx of[-.85,.85])strut(officeX+dx,officeZ+.38,.14,deck-.34);
    fence(officeX,officeZ+.49,deck,1.85);
    block('#d0d8d8',officeX,deck+.52,officeZ-.35,1.91,.74,.08,'stone');
    for(let k=0;k<3;k++){
     const x=officeX-.59+k*.59;
     block('#8ebfc7',x,deck+.53,officeZ-.29,.47,.57,.025,'glass');
     block('#e5cc9b',x,deck+.93,officeZ-.28,.42,.050,.034,'glass',true);
    }
    block('#677780',officeX,deck+.24,officeZ,.88,.33,.42,'metal');
    block(cyan,officeX,deck+.50,officeZ+.21,.31,.17,.024,'glass',true);
    for(let i=0;i<11;i++){
     const p=(i+.5)/11;
     block(i%2?'#d3d6d1':'#81999c',1.51,.31+(deck-.31)*p,
      F-.47-p*1.85,.52,.075,.20,'metal');
    }
    // Front receiving dock & pallet staging with warning marking.
    for(const xx of[2.12,6.24]){
     pallet(xx,F-.54);
     block('#efba66',xx,.23,F-.21,.90,.035,.08,'stone');
    }
    for(const x of[1.14,6.84])tube(x,B+.47,0,2.02,.13);
    sign('ASSEMBLY',cx,3.81,F-.25,3.12);
    block(orange,cx,3.55,F-.31,3.42,.12,.21,'metal');
   }else{
    // LARGE: 3 production lanes, four robots, storage silos, loading
    // dock, skylight trusses, suspended smart-control gallery with real
    // workstations. Open in all directions and no solid cuboid shell.
    const zmid=cz+.18,run=D-1.44;
    for(const x of[2.48,5.49,8.50]){
     conveyor(x,zmid,run,.82);
     for(const zz of[zmid-run*.29,zmid+run*.28]){
      block('#adb9b3',x,.92,zz,.53,.10,.49,'metal');
      block(orange,x,1.06,zz,.37,.17,.29,'metal');
      block('#ffe4b3',x,1.16,zz,.10,.07,.14,'glass',true);
     }
    }
    for(const [x,z,sgn] of[
     [1.58,B+1.12,1],[3.56,B+3.04,-1],
     [4.54,B+1.37,1],[6.43,B+3.23,-1],
     [7.62,B+1.44,1],[9.36,B+3.13,-1]
    ])robot(x,z,0,sgn);
    for(const [x,z] of[[1.52,B+.47],[9.51,B+.51]]){
     tank(x,z,.33,1.52);
     tube(x,z+.70,0,3.13,.105);
    }
    hopper(5.54,B+.77,.35,1.55);
    for(const x of[1.27,9.70]){
     for(const z of[B+.29,F-.58])
      strut(x,z,.10,3.87);
     block('#73818b',x,4.18,cz,.13,.14,D-.45,'metal');
    }
    // Tall ventilated lattice roof only on perimeter: keeps all
    // production belts and orange robots visible from game camera.
    for(const z of[B+.31,B+2.53,F-.65]){
     block('#536874',cx,4.24,z,W-2.50,.13,.18,'metal');
     for(let i=0;i<13;i++){
      const x=L+.62+i*(W-3.02)/12;
      block(i%3===0?orange:'#9ca9a8',x,4.30,z,.061,.11,.24,'metal');
     }
    }
    lightRail(cx,B+1.02,W-3.18,4.04);
    lightRail(cx,F-1.10,W-3.18,4.04);
    // Transparent elevated control bridge is ACTUAL floor 2,
    // partial and restricted to the rear ~one-third.
    const deck=2.53,deckZ=B+.61,deckW=6.95;
    tile(cx,deck,deckZ,deckW,1.08,'#bac7c5');
    fence(cx,deckZ+.56,deck,deckW-.14);
    for(const x of[cx-deckW*.44,cx+deckW*.44]){
     strut(x,deckZ+.40,.16,deck-.34);
     strut(x,deckZ-.38,.16,deck-.34);
     beacon(x,deckZ+.45,deck+.77,cyan);
    }
    for(const x of[cx-2.55,cx-.86,cx+.85,cx+2.55]){
     block('#70858a',x,deck+.42,deckZ-.10,1.12,.57,.54,'metal');
     block('#d7deda',x,deck+.75,deckZ-.10,1.15,.07,.57,'stone');
     block('#91c9cf',x,deck+.93,deckZ-.22,.64,.27,.033,'glass',true);
     block('#50626a',x,deck+.34,deckZ+.28,.35,.36,.31,'metal');
     block('#9ce4d6',x,deck+.56,deckZ+.42,.21,.17,.024,'glass',true);
    }
    // High orange winged main entrance, separate glass inspection bays.
    for(const x of[1.62,9.38]){
     tile(x,.25,F-.47,1.10,.62,'#73858b');
     for(const zz of[F-.66,F-.29])
      crate(x,zz,0,zz<F-.50);
     block(orange,x,1.61,F-.31,1.29,.095,.20,'metal');
     for(const dx of[-.49,.49]){
      block('#87b9bc',x+dx,.89,F-.40,.04,1.28,.39,'glass');
      beacon(x+dx,F-.42,1.72,cyan);
     }
    }
    for(const xx of[3.28,7.74]){
     pallet(xx,F-.50);
     block(amber,xx,.23,F-.17,.84,.043,.09,'stone');
    }
    // Front lifts and deliberately offset pipes give each elevation
    // a distinct silhouette from ALL 4 rotations.
    for(const x of[2.65,8.39]){
     block('#5b707a',x,1.61,F-.28,.062,2.28,.083,'metal');
     block('#8cbcc3',x,1.51,F-.19,.055,1.77,.034,'glass');
     beacon(x,F-.30,2.86);
    }
    sign('SMART FACTORY',cx,4.68,F-.25,3.82);
    block(orange,cx,4.42,F-.34,4.15,.17,.23,'metal');
    for(let i=0;i<11;i++){
     const x=cx-1.85+i*.37;
     block(i%2?amber:orange,x,4.54,F-.22,.10,.046,.17,'glass',true);
    }
   }
   // Enclosed production halls replace the yard-like silhouette. Broad,
   // open loading portals retain a view of the machines at street level.
   const shellL=1.08,shellR=W-1.08,shellW=shellR-shellL;
   const shellBack=B+.10,shellFront=F-.12,shellD=shellFront-shellBack,shellZ=(shellBack+shellFront)/2;
   const eave=tier===1?2.16:tier===2?3.48:4.32,rise=tier===1?.48:.46;
   const bays=tier===1?1:tier===2?2:3,bayW=shellW/bays;
   const record=(kind,u,y,v,extra={})=>{
    const p=point(u,v);(batch.factoryEffects??=[]).push({kind,id,x:p.x-.5,y,z:p.y-.5,turn,tier,...extra});
   };
   // Part-raised rear loading shutters expose the production floor while
   // retaining the insulated upper wall, clerestory and structural columns.
   // Every part stays on the building side of the existing parking boundary.
   const rearDoorTop=tier===1?1.72:tier===2?2.30:3.00;
   const rearRoll=tier===1?.28:tier===2?.36:.42;
   block('#a4b1ae',cx,(eave+rearDoorTop)/2,shellBack,shellW,eave-rearDoorTop,.12,'metal');
   block('#577d86',cx,eave-.46,shellBack-.073,shellW-.28,.44,.035,'glass');
   for(let k=0;k<Math.floor(shellW/.28);k++){
    const x=shellL+.13+k*.28;
    block('#d5dcd7',x,(eave+rearDoorTop)/2,shellBack-.074,.020,eave-rearDoorTop,.022,'metal');
   }
   for(let bay=0;bay<bays;bay++){
    const x=shellL+(bay+.5)*bayW,doorW=bayW-.28;
    for(const side of[-1,1]){
     const post=x+side*bayW/2;
     block('#b4c2bf',post,(rearDoorTop+.25)/2,shellBack,.12,rearDoorTop-.25,.16,'metal');
     block(burnt,post,.48,shellBack-.10,.14,.45,.07,'metal');
     block('#efbb63',post,1.05,shellBack-.10,.14,.12,.022,'metal');
    }
    block('#72898f',x,rearDoorTop-rearRoll/2,shellBack-.025,doorW,rearRoll,.075,'metal');
    for(let j=0;j<5;j++)block('#b6c9c8',x,rearDoorTop-rearRoll+(j+.5)*rearRoll/5,shellBack-.073,doorW,.019,.023,'metal');
    block(orange,x,rearDoorTop-rearRoll-.025,shellBack-.077,doorW,.055,.075,'metal');
    block('#526a73',x,rearDoorTop+.055,shellBack-.08,doorW+.08,.14,.18,'metal');
    block('#ffe3b1',x,rearDoorTop-.075,shellBack-.124,doorW*.83,.025,.026,'glass',true);
    block('#cebfa4',x,.255,shellBack+.06,doorW,.025,.25,'stone');
   }
   for(const side of[-1,1]){
    const x=side<0?shellL:shellR;
    block('#8d9fa2',x,(eave+.25)/2,shellZ,.12,eave-.25,shellD,'metal');
    block(burnt,x+side*.07,.51,shellZ,.065,.48,shellD,'metal');
    block('#6f9da5',x+side*.074,eave-.46,shellZ,.036,.44,shellD-.23,'glass');
    block('#d1e4df',x+side*.095,eave-.35,shellZ,.015,.035,shellD-.38,'glass');
    const n=Math.max(5,Math.ceil(shellD/.36));
    for(let k=0;k<n;k++){
     const z=shellBack+.14+k*(shellD-.28)/(n-1);
     block('#c2cecb',x+side*.074,(eave+.25)/2,z,.032,eave-.25,.027,'metal');
    }
    block(orange,x+side*.09,eave-.025,shellZ,.16,.17,shellD+.12,'metal');
    // External distribution pipes, clamps and service cabinet.
    block('#718d95',x+side*.12,1.02,shellZ,.065,.065,shellD*.80,'metal');
    block('#d7ddcf',x+side*.13,1.03,shellBack+.54,.13,.15,.07,'metal');
    block('#465d66',x+side*.12,.68,shellFront-.44,.16,.52,.40,'metal');
   }
   // Standing-seam gabled roofs, rooflights and ridge vent caps. Roof panels
   // are attached to the halls rather than hovering above an open courtyard.
   for(let bay=0;bay<bays;bay++){
    const x=shellL+(bay+.5)*bayW,half=bayW/2,angle=Math.atan2(rise,half),length=Math.hypot(half,rise);
    for(const side of[-1,1]){
     const p=point(x+side*half/2,shellZ),slope=-side*angle;
     batch.add(BOX,bay%2?'#637b84':'#61717a',p.x-.5,eave+rise/2,p.y-.5,length+.055,.075,shellD+.18,0,turn,slope,id,false,'metal');
     const strips=Math.max(5,Math.round(shellD/.34));
     for(let k=0;k<strips;k++){
      const z=shellBack-.01+k*(shellD+.02)/(strips-1),q=point(x+side*half/2,z);
      batch.add(BOX,'#97a9ab',q.x-.5,eave+rise/2+.046,q.y-.5,length+.04,.018,.022,0,turn,slope,id,false,'metal');
     }
     const rooflightX=x+side*half*.47,rooflightZ=shellZ+.05,rooflightY=eave+rise*.53+.065;
     const q=point(rooflightX,rooflightZ);
     batch.add(BOX,'#89b8c0',q.x-.5,rooflightY,q.y-.5,length*.51,.035,shellD*.50,0,turn,slope,id,false,'glass');
     for(const end of[-1,1]){
      const z=rooflightZ+end*shellD*.25,v=point(rooflightX,z);
      batch.add(BOX,'#cbdad7',v.x-.5,rooflightY+.026,v.y-.5,length*.55,.025,.035,0,turn,slope,id,false,'metal');
     }
     // Orange gable outline ties each ridge visually to its loading bay.
     const q2=point(x+side*half/2,shellFront+.10);
     batch.add(BOX,orange,q2.x-.5,eave+rise/2,q2.y-.5,length+.09,.12,.10,0,turn,slope,id,false,'metal');
    }
    block('#c5d1cd',x,eave+rise+.075,shellZ,.15,.13,shellD+.20,'metal');
    block('#465e67',x,eave+rise+.16,shellZ,.27,.065,shellD*.44,'metal');
    for(let k=0;k<5;k++)block('#81999e',x,eave+rise+.16,shellZ-shellD*.18+k*shellD*.09,.28,.07,.025,'metal');
    // Raised roof ventilator with rotating three-blade impeller.
    const ventX=x,ventZ=shellBack+shellD*.30,ventY=eave+rise+.24;
    cyl('#aebebb',ventX,ventY,ventZ,.23,.15);
    cyl('#3c5059',ventX,ventY+.09,ventZ,.18,.04);
    record('fan',ventX,ventY+.13,ventZ,{radius:.17});
    // Front portal is a rolled-up shutter, not a painted door on a solid box.
    const doorW=Math.min(tier===1?2.35:2.30,bayW-.35),portalX=tier===1?cx:x;
    const doorTop=tier===1?1.76:2.17,headerH=eave-doorTop;
    block('#aebcba',portalX,doorTop+headerH/2,shellFront,bayW-.11,headerH,.12,'metal');
    block('#455c65',portalX,doorTop-.12,shellFront+.075,doorW,.25,.16,'metal');
    for(let k=0;k<4;k++)block('#a6b6b5',portalX,doorTop-.22+k*.055,shellFront+.16,doorW,.025,.025,'metal');
    for(const sign of[-1,1]){
     const postX=portalX+sign*(doorW/2+.075);
     block('#c8d1ca',postX,(doorTop+.25)/2,shellFront+.02,.12,doorTop-.25,.17,'metal');
     for(let k=0;k<7;k++)block(k%2?'#343e43':'#f3bd58',postX,.38+k*.16,shellFront+.115,.13,.12,.025,'metal');
    }
    block('#ffe4b2',portalX,doorTop+.04,shellFront+.09,doorW*.88,.025,.035,'glass',true);
    record('beacon',portalX+doorW*.42,doorTop+.17,shellFront+.115);
   }
   // A pair of open fabrication doorways under the small single-span roof.
   // The half-height glazing makes the workshop enclosed without hiding work.
   if(tier===1){
    for(const side of[-1,1]){
     const x=cx+side*2.05;
     block('#adbcba',x,1.13,shellFront,.86,1.74,.12,'metal');
     block('#65949e',x,1.26,shellFront+.076,.64,.67,.025,'glass');
     block('#d4e5dd',x,1.39,shellFront+.095,.54,.035,.013,'glass');
    }
   }
   // Process stacks emerge from the rear service roof. Pale steam is an
   // animated visual cue only; it does not add pollution or alter gameplay.
   const stacks=tier===1?[1.72]:[1.72,W-1.72];
   const stackTop=tier===1?3.10:tier===2?4.39:5.35;
   for(const x of stacks){
    const z=shellBack+.42;
    cyl('#8ca3a8',x,(stackTop+.24)/2,z,.12,stackTop-.24);
    for(const y of[stackTop-.49,stackTop-.27])cyl(orange,x,y,z,.135,.08);
    cyl('#425b65',x,stackTop,z,.17,.10);cyl('#d1dad0',x,stackTop+.07,z,.14,.035);
    record('steam',x,stackTop+.10,z);
   }
   // Blue process pipe links, a boiler module and a safety/inspection board.
   if(tier>=2){
    const x=W-1.63,z=shellBack+.78;
    block('#527e91',x,1.19,z,.41,1.66,.46,'metal');
    block('#bccdce',x,1.19,z+.25,.23,.38,.025,'glass');
    block('#46798c',cx,eave-.73,shellBack+.24,shellW-.51,.10,.10,'metal');
    for(const xx of[cx-shellW*.37,cx+shellW*.37])block('#c8d3cc',xx,eave-.73,shellBack+.24,.08,.18,.16,'metal');
   }
   // Visible loading equipment and genuine work effects at the open portal.
   const weldX=tier===1?2.56:tier===2?2.46:2.48,weldZ=tier===1?F-.49:tier===2?F-.97:F-.60;
   record('weld',weldX,tier===3?1.17:.80,weldZ);
   if(tier>=2){
    record('weld',tier===2?5.47:8.50,tier===3?1.17:.80,weldZ);
    record('cargo',tier===2?5.47:5.49,.69,tier===2?F-1.30:F-.89,{distance:.50});
   }
   if(tier>=2){
    const x=tier===2?4.14:5.51,z=F-.57;
    block('#384f5b',x,.39,z,.53,.29,.47,'metal');
    block(orange,x,.60,z-.13,.56,.29,.24,'metal');
    block('#283d47',x,.89,z-.12,.065,.37,.065,'metal');
    block('#b4c7c8',x,.97,z-.10,.49,.055,.40,'metal');
    for(const side of[-1,1])for(const end of[-1,1])block('#2d383e',x+side*.27,.27,z+end*.14,.11,.18,.13,'metal');
    for(const side of[-1,1])block('#aabcc0',x+side*.13,.25,z+.31,.06,.045,.33,'metal');
    record('beacon',x,1.05,z-.10);
   }

   // Factory is strictly visual. Parked cars, driveways and employee jobs
   // remain managed by the original traffic/game logic.
   return;
  }

  // POOL CONDO REBUILD — a complete visual replacement for home_dual.
  // Two real occupied storeys, an ASYMMETRICAL L-shaped white/glass condo,
  // a dominant turquoise open swimming pool, real sunbeds, umbrellas, palms,
  // landscaping and a roof lounge. This is NOT the old courtyard wing model.
  // All physical meshes remain in the pre-existing 8x13 parcel's front 50%.
  // No changes to 40 parking bays, 40 residents, routing, roads or home_grand.
  if(b.key==='home_dual'){
   const W=t.plotWidth,H=t.plotHeight,parking=t.parkingZoneDepth;
   const ivory='#f1f0e9',bone='#dfdfd7',white='#f8f7f1',cream='#e6e1d4';
   const silver='#a7b4b4',dark='#53656e',blue='#72b9cb';
   const teal='#5bb8c9',poolBlue='#47a6bf',waterGlow='#91e0dd';
   const aqua='#b9f1e8',timber='#ba9974',teak='#98765b';
   const green='#5e986a',lime='#87b782',stone='#dad0be',light='#ffe5b7';
   const tile=(x,y,z,w,d,col=bone)=>block(col,x,y,z,w,.075,d,'stone');
   const column=(x,z,h,y=.23,c=ivory)=>block(c,x,y+h/2,z,.080,h,.084,'stone');
   const cbox=(x,y,z,w,h,d,c=bone)=>block(c,x,y,z,w,h,d,'stone');
   const bar=(x,y,z,w,d,col='#b6c7c3')=>block(col,x,y,z,w,.045,d,'metal');
   const circle=(x,y,z,r,h,col=teal,finish='stone',glow=false)=>{
    const p=point(x,z);
    batch.add(CYL,col,p.x-.5,y,p.y-.5,r,h,r,0,0,0,id,glow,finish);
   };
   const globe=(x,z,y=.98)=>{
    block('#849999',x,y-.11,z,.13,.14,.13,'metal');
    block(light,x,y,z,.13,.11,.13,'glass',true);
    block(ivory,x,y+.085,z,.17,.043,.16,'metal');
   };
   const lowPlant=(x,z,r=.24,y=0)=>{
    cbox(x,y+.29,z,r*1.22,.24,r*1.21,stone);
    circle(x,y+.50,z,r*.47,.25,green);
    circle(x-r*.24,y+.62,z+.055,r*.30,.20,lime);
    circle(x+r*.24,y+.65,z-.07,r*.26,.21,'#73aa7c');
   };
   const palm=(x,z,y=0,scale=1)=>{
    // Low-poly palm: curved-looking segmented trunk and separated fronds.
    const steps=4,tt=1.70*scale;
    for(let k=0;k<steps;k++){
     const yy=y+.29+(k+.5)*tt/steps,off=(k/steps)*.12*scale;
     cbox(x+off,yy,z-off*.35,.12*scale,tt/steps+.015,.11*scale,teak);
     bar(x+off,yy+tt/(steps*2)-.04,z-off*.35,.16*scale,.14*scale,stone);
    }
    const topY=y+.29+tt;
    for(let i=0;i<6;i++){
     const a=i*Math.PI/3,dirX=Math.cos(a),dirZ=Math.sin(a);
     for(let j=0;j<3;j++){
      const dist=.15+j*.20,px=x+.12*scale+dirX*dist*scale;
      const pz=z-.042*scale+dirZ*dist*scale;
      const lift=(j===0?.12:j===1?.08:-.06)*scale;
      block(j===2?'#79ab72':'#4a956b',px,topY+lift,pz,
       (Math.abs(dirX)>.75?.27:.20)*scale,.055*scale,
       (Math.abs(dirZ)>.75?.27:.20)*scale,'stone');
     }
    }
    circle(x+.13*scale,topY+.12*scale,z-.04*scale,.17*scale,.11*scale,'#5d936c');
   };
   const glassPanel=(x,y,z,w,h,vert=false)=>{
    block('#e2e7e2',x,y,z,w+(vert?.03:.08),h+.085,vert?.060:.075,'metal');
    block(blue,x,y,z+.045,w,h,.047,'glass');
    block('#d5f1eb',x,y+h*.22,z+.077,w*.89,.055,.019,'glass');
    block('#5c8595',x,y,z+.090,.026,h*.95,.019,'metal');
    block('#fff0c8',x,y-h*.23,z+.096,w*.73,.13,.016,'glass',true);
   };
   const railHorizontal=(x,z,y,w)=>{
    block('#8cc5cf',x,y+.25,z,w,.45,.047,'glass');
    block(ivory,x,y+.50,z,w+.05,.042,.063,'metal');
    for(const dx of[-w*.46,0,w*.46])
     block('#a6b8b5',x+dx,y+.25,z,.029,.48,.052,'metal');
   };
   const railVertical=(x,z,y,d)=>{
    block('#8cc5cf',x,y+.25,z,.047,.45,d,'glass');
    block(ivory,x,y+.50,z,.063,.042,d+.05,'metal');
    for(const dz of[-d*.45,0,d*.45])
     block('#a6b8b5',x,y+.25,z+dz,.052,.48,.029,'metal');
   };
   const chaise=(x,z,y=0,angle=0)=>{
    // Sunlounger has a reclined back and cushion separated from side frame.
    tile(x,y+.32,z,.39,.77,timber);
    tile(x,y+.38,z,.33,.62,white);
    cbox(x,y+.58,z-.25,.33,.31,.08,ivory);
    for(const dx of[-.17,.17]){
     cbox(x+dx,y+.20,z,.030,.25,.68,dark);
     cbox(x+dx,y+.40,z-.24,.024,.40,.05,teak);
    }
    cbox(x,y+.46,z+.31,.31,.035,.055,blue);
   };
   const umbrella=(x,z,y=0,r=.47)=>{
    pole('#aebcbb',x,y+1.01,z,.027,1.35,'metal');
    circle(x,y+1.70,z,r,.075,ivory);
    circle(x,y+1.78,z,r*.72,.055,teal);
    circle(x,y+1.84,z,r*.29,.065,white);
    for(let i=0;i<8;i++){
     const a=i*Math.PI/4;
     cbox(x+Math.cos(a)*r*.64,y+1.72,z+Math.sin(a)*r*.64,.025,.025,.13,timber);
    }
    globe(x,z,y+.50);
   };
   const indoorBed=(x,z,y=0)=>{
    tile(x,y+.32,z,.58,.77,timber);
    tile(x,y+.43,z,.55,.69,white);
    tile(x,y+.49,z-.22,.50,.16,'#e8d3cb');
    cbox(x,y+.58,z-.38,.61,.35,.052,teak);
   };
   const couch=(x,z,y=0)=>{
    cbox(x,y+.37,z,.57,.25,.31,'#e9e1d7');
    cbox(x,y+.59,z-.13,.59,.34,.078,'#d4cabe');
    for(const dx of[-.27,.27])
     cbox(x+dx,y+.46,z,.052,.22,.33,timber);
    tile(x,y+.56,z,.48,.27,white);
   };
   const gardenSeat=(x,z,y=0)=>{
    tile(x,y+.40,z,.57,.25,timber);
    cbox(x,y+.58,z-.11,.57,.32,.055,teak);
    for(const dx of[-.24,.24])cbox(x+dx,y+.20,z,.035,.36,.030,dark);
   };
   // Real parcel: 8x13, parking 0-6.5, residence and amenities 6.5-13.
   // Keep 0.7+ of side-drive clearance. Main pedestrian base at front half.
   const back=parking+.42,front=H-.78,mid=(back+front)/2;
   tile(4,.13,mid,6.23,front-back+.19,'#c8d2c7');
   tile(4,.20,front-.26,5.99,.32,'#e2d8c8');
   // Asymmetric L plan: rear condo block spans nearly the full usable width,
   // east wing extends forward. Central pool remains unroofed and dominant.
   const rearX=3.93,rearZ=7.77,rearW=5.03,rearD=1.36,groundY=.23,secondY=2.29;
   const sideX=6.09,sideZ=9.80,sideW=1.13,sideD=3.15;
   tile(rearX,.25,rearZ,rearW,rearD,ivory);
   tile(sideX,.25,sideZ,sideW,sideD,ivory);
   // Rear multi-room condominium block, exposed front glazing and partitions.
   cbox(rearX,.93,rearZ-.62,rearW,1.28,.085,ivory);
   for(const px of[1.91,3.25,4.62,5.95]){
    cbox(px,1.00,rearZ,.080,1.33,1.25,cream);
   }
   for(const px of[2.08,3.39,4.75,5.90]){
    glassPanel(px,1.08,rearZ+.65,.79,1.19);
    indoorBed(px,rearZ-.05);
    cbox(px,1.73,rearZ+.55,.86,.13,.17,teak);
   }
   // Side wing front-facing glazed lift/lobby and two glass suites.
   cbox(sideX+.51,1.00,sideZ, .088,1.46,sideD-.05,ivory);
   for(const pz of[8.89,10.22,11.11]){
    glassPanel(sideX-.12,1.10,pz,.64,1.21);
    indoorBed(sideX-.03,pz+.12);
    cbox(sideX,1.70,pz-.24,.90,.10,.34,timber);
   }
   // TWO ACTUAL OCCUPIED LEVELS, no more. Elevated decks and bedrooms.
   tile(rearX,secondY,rearZ,rearW,rearD,'#e5e9e2');
   tile(sideX,secondY,sideZ,sideW,sideD,'#e5e9e2');
   for(const px of[1.95,3.26,4.65,5.91]){
    cbox(px,secondY+.91,rearZ-.60,.10,1.21,.10,white);
    glassPanel(px,secondY+1.04,rearZ+.67,.83,1.13);
    indoorBed(px,rearZ-.06,secondY);
   }
   for(const zz of[8.80,10.19,11.24]){
    glassPanel(sideX-.20,secondY+1.06,zz,.66,1.12);
    couch(sideX+.12,zz,secondY);
   }
   // Real balcony decks: a light glass balcony facing the pool. Balcony
   // front edge 8.63, outside pool starts at 9.14 -> no occlusion.
   const balconyZ=8.57;
   tile(rearX,secondY+.075,balconyZ,rearW-.17,.37,'#e6d8c4');
   railHorizontal(rearX,balconyZ+.21,secondY+.14,rearW-.25);
   railVertical(sideX-.58,sideZ,secondY+.13,sideD-.15);
   for(const x of[2.31,3.64,4.91]){
    couch(x,balconyZ-.11,secondY);
    lowPlant(x+.32,balconyZ-.12,.13,secondY);
   }
   // White pergola sunshade covers bedrooms/rear service zone only,
   // leaving an architectural open swimming court in front.
   for(const xx of[1.56,6.45]){
    column(xx,rearZ-.47,3.83);
   }
   tile(rearX,4.24,rearZ-.34,rearW+.06,.67,'#c8d2d3');
   for(let i=0;i<15;i++){
    const x=1.60+i*.332;
    bar(x,4.32,rearZ-.30,.035,.62,i%3===0?teal:white);
   }
   tile(sideX,4.23,sideZ-.52,sideW+.13,1.06,white);
   for(let i=0;i<7;i++){
    const zz=sideZ-.98+i*.16;
    bar(sideX,4.32,zz,sideW+.08,.036,i%2===0?silver:teal);
   }
   // MAIN SWIMMING POOL — the focal point of the entire model.
   // Physically distinct deck, coping, water basin, bottom, lane marks,
   // ripples, glass fence and metal grab handles. Always visible in top view.
   const poolX=3.29,poolZ=10.08,poolW=3.42,poolD=2.20;
   tile(poolX,.275,poolZ,poolW+.48,poolD+.49,'#e9dfcb'); // beach deck
   tile(poolX,.309,poolZ,poolW+.19,poolD+.17,white);      // pool coping
   tile(poolX,.337,poolZ,poolW-.07,poolD-.06,'#398eae'); // deep trough
   tile(poolX,.381,poolZ,poolW-.20,poolD-.16,poolBlue);  // water surface
   tile(poolX,.391,poolZ,poolW-.29,poolD-.25,teal);
   for(let j=0;j<8;j++){
    const x=poolX-poolW*.41+j*poolW*.115;
    bar(x,.404,poolZ+(j%2?-.38:.44),.15,.032,aqua);
    bar(x-.10,.402,poolZ+(j%2?.21:-.27),.085,.026,'#9edddf');
   }
   for(const sign of[-1,1]){
    const x=poolX+sign*poolW*.48;
    for(const z of[poolZ-poolD*.45,poolZ+poolD*.45]){
     tile(x,.416,z,.32,.18,'#eeeadf');
    }
   }
   // Real stainless-steel pool ladder facing the wooden sun deck.
   for(const x of[poolX-1.19,poolX-.88]){
    pole('#e9ebdf',x,.76,poolZ+poolD*.42,.024,.94,'metal');
    block('#e8ecde',x,.99,poolZ+poolD*.41,.061,.08,.29,'metal');
   }
   for(let step=0;step<3;step++){
    cbox(poolX-1.04,.39+step*.13,poolZ+poolD*.48,.34,.025,.043,silver);
   }
   // Sunny outdoor timber deck in front: loungers and parasols separated
   // around the swimming pool, with green planters and wellness pavilion.
   const deckZ=11.75;
   tile(3.19,.260,deckZ,4.15,.67,timber);
   for(let i=0;i<14;i++){
    bar(1.25+i*.295,.313,deckZ,.035,.58,i%3===0?teak:'#d8b99a');
   }
   for(const x of[1.77,2.67,3.58,4.48]){
    chaise(x,deckZ);
    globe(x,deckZ+.30,.65);
   }
   umbrella(2.18,11.25,0,.37);
   umbrella(4.20,11.25,0,.38);
   // Side café lounge with shaded counter and garden dining area.
   tile(5.92,.265,11.65,1.09,.62,stone);
   gardenSeat(5.90,11.52);
   for(const zz of[11.45,11.79]){
    cbox(6.57,.72,zz,.21,.78,.25,teak);
    cbox(6.57,1.12,zz,.24,.08,.27,white);
   }
   // Six detailed palms + layered tropical shrubs / low planters.
   for(const [x,z,r] of[
    [1.29,7.41,.59],[6.57,7.50,.55],
    [1.28,9.07,.62],[6.55,9.38,.56],
    [1.27,11.66,.59],[6.57,11.81,.55]
   ])palm(x,z,0,r);
   for(const [x,z,r] of[
    [1.14,8.30,.20],[1.16,10.26,.22],[1.22,12.13,.18],
    [6.74,8.23,.22],[6.75,10.75,.21],[6.76,12.16,.17],
    [2.00,8.90,.19],[5.25,9.02,.16],[5.43,11.87,.16]
   ])lowPlant(x,z,r);
   for(const [x,z] of[
    [1.58,8.86],[5.37,8.87],[1.66,10.97],[5.22,10.90],
    [1.52,12.02],[6.45,12.11]
   ])globe(x,z,.68);
   // Low amenity lighting around the pool only, not a privacy-blocking wall.
   for(const x of[1.59,4.88]){
    for(const z of[poolZ-.91,poolZ+.82]){
     block('#d6ccbd',x,.44,z,.13,.20,.13,'stone');
     block(light,x,.57,z,.11,.12,.11,'glass',true);
    }
   }
   // Distinct FRONT residential entrance and property sign (not 3rd floor).
   for(const x of[2.36,5.65]){
    column(x,12.12,2.24,.23,'#e0d9ca');
    globe(x,12.11,2.40);
   }
   block('#e9e6dc',4,2.63,12.12,3.51,.16,.23,'stone');
   block(teal,4,2.76,12.18,3.35,.060,.13,'metal');
   block('#4a737c',4,2.23,12.19,2.13,.37,.12,'metal');
   block(light,4,2.27,12.26,1.80,.18,.023,'glass',true);
   // Leave entire pool, deck and trees uncovered from the game camera.
   return;
  }

  // WARM RESIDENTIAL COLLECTION — replaces the old generic housing boxes
  // ONLY for the visible 'บ้านเล็ก' home_large and 'บ้านกลาง' home_dual.
  // Preserve untouched: legacy home_small/medium, home_grand, parking,
  // resident counts, driveway routings, road/traffic and save semantics.
  // home_large = intimate 1-storey Thai-modern garden cottage.
  // home_dual = TWO-storey U-shaped residential compound / atrium.
  if(b.key==='home_large'||b.key==='home_dual'){
   const compact=b.key==='home_large',W=t.plotWidth,back=t.parkingZoneDepth+.35;
   const front=t.plotHeight-.73,center=W*.5,mid=(back+front)/2,depth=front-back;
   const ivory='#f2e7d7',cream='#e4d8c6',limestone='#d0c8b8';
   const cedar='#af835d',teak='#876c51',tileRed='#aa6c52';
   const graphite='#505f61',mist='#86b4b8',sage='#719c79',leaf='#52866e';
   const sand='#dcc1a0',dusk='#4c7080',warm='#ffe3ac',earth='#aa8d73';
   const paved=(x,y,z,w,d,c=limestone)=>block(c,x,y,z,w,.080,d,'stone');
   const baluster=(x,z,y=0,h=1.20,c='#c9bba6')=>
    block(c,x,y+.20+h/2,z,.062,h,.070,'wood');
   const lamp=(x,z,y=1.46,c=warm)=>{
    pole('#727e7c',x,y-.33,z,.022,.38,'metal');
    block('#e2d1bb',x,y-.10,z,.16,.048,.16,'metal');
    block(c,x,y-.20,z,.12,.11,.11,'glass',true);
   };
   const shrub=(x,z,k=.25,y=0)=>{
    block('#c1b5a2',x,y+.30,z,k*1.24,.23,k*1.10,'stone');
    block('#517e60',x,y+.50,z,k*.96,.22,k*.95,'stone');
    block('#83ab76',x,y+.63,z,k*.68,.17,k*.70,'stone');
    for(const sign of[-1,1])block('#dfb39d',x+sign*k*.19,y+.71,z,k*.14,.08,k*.17,'stone');
   };
   const bench=(x,z,y=0)=>{
    block(cedar,x,y+.46,z,.62,.085,.27,'wood');
    block(teak,x,y+.64,z-.10,.64,.30,.065,'wood');
    for(const dx of[-.23,.23])
     block('#596763',x+dx,y+.25,z,.04,.40,.033,'metal');
   };
   const coffeeTable=(x,z,y=0)=>{
    const p=point(x,z);
    batch.add(CYL,'#c6a281',p.x-.5,y+.61,p.y-.5,.26,.075,.26,0,0,0,id,false,'wood');
    pole(graphite,x,y+.39,z,.037,.45,'metal');
    block('#fff1d7',x,y+.72,z,.14,.07,.12,'stone');
    block('#739b82',x+.09,y+.76,z-.08,.07,.08,.07,'stone');
   };
   const lounge=(x,z,y=0,side=1)=>{
    block('#a19c8a',x,y+.32,z,.62,.31,.39,'wood');
    block('#d9c6ae',x,y+.50,z-side*.18,.62,.28,.075,'wood');
    for(const dx of[-.28,.28])
     block(teak,x+dx,y+.39,z,.075,.35,.39,'wood');
    block('#ead6c1',x,y+.50,z+side*.02,.53,.08,.32,'stone');
   };
   const bed=(x,z,y=0)=>{
    paved(x,y+.33,z,.65,.92,cedar);
    paved(x,y+.45,z,.56,.80,'#f5e7d4');
    paved(x,y+.50,z-.29,.52,.20,'#fcf9ed');
    for(const dx of[-.18,.18])
     block('#e2b4a6',x+dx,y+.56,z-.29,.22,.085,.18,'stone');
    block(teak,x,y+.64,z-.47,.69,.39,.070,'wood');
   };
   const window=(x,z,y=1.05,w=.60,frontward=true)=>{
    const sign=frontward?1:-1;
    block('#e8ebdf',x,y,z,w+.14,.75,.082,'stone');
    block(dusk,x,y,z+sign*.052,w,.63,.040,'glass');
    block('#d2e7e4',x,y+.17,z+sign*.08,w*.85,.11,.020,'glass');
    block(warm,x,y-.15,z+sign*.085,w*.72,.19,.022,'glass',true);
    block('#e6dad0',x,y,z+sign*.10,.028,.67,.04,'metal');
    block('#f7eee1',x,y-.39,z+sign*.10,w+.17,.065,.14,'stone');
   };
   const wall=(x,z,w,h,y=0,c=cream)=>block(c,x,y+.23+h*.50,z,w,h,.10,'stone');
   const separator=(x,z,w,h,y=0)=>block('#e5d7c4',x,y+.23+h*.50,z,.080,h,w,'stone');
   const rail=(x,z,y,w,direction='u')=>{
    if(direction==='u'){
     block(mist,x,y+.26,z,w,.44,.047,'glass');
     block('#efe5d6',x,y+.50,z,w+.055,.045,.064,'metal');
     for(const x0 of[x-w*.42,x,x+w*.42])
      block('#c8b8a5',x0,y+.26,z,.028,.46,.054,'metal');
    }else{
     block(mist,x,y+.26,z,.047,.44,w,'glass');
     block('#efe5d6',x,y+.50,z,.061,.045,w+.04,'metal');
     for(const z0 of[z-w*.42,z,z+w*.42])
      block('#c8b8a5',x,y+.26,z0,.054,.46,.027,'metal');
    }
   };
   const roof=(x,z,w,d,y=2.15,roofColor=tileRed)=>{
    // 3D narrow pitched roof, limited to occupied rooms, NOT full
    // plot roofing over courtyards, so top-down players see amenities.
    gable(roofColor,x,z,w,d,y,.43);
    for(const dx of[-w*.39,0,w*.39])
     block('#e4bea2',x+dx,y+.38,z,.025,.04,d*.83,'wood');
   };
   const steps=(x,z,y=0)=>{
    for(let k=0;k<3;k++)
     paved(x,y+.18+k*.055,z-k*.14,.75-k*.06,.20,k%2?'#e4d4bb':'#d4c3ac');
   };
   // Car-lane-safe foundations and residential paths occupy front half ONLY.
   paved(center,.12,mid,W-1.78,depth+.23,'#c7c9b5');
   paved(center,.18,front-.18,W-2.14,.28,'#e7dcc9');
   for(const sign of[-1,1]){
    const x=center+sign*(W*.5-.90);
    block('#698f6c',x,.23,mid,.12,.21,depth-.27,'stone');
    for(let i=0;i<3;i++)shrub(x,back+.35+i*(depth-.65)/2,.19);
   }
   if(compact){
    // ONE-STOREY HOME: two offset habitable rooms around a visible patio.
    // Warm sloping roofs are separate volumes, never a blank warehouse slab.
    const mainX=2.59,mainZ=back+.77,mainW=2.86,mainD=1.48;
    const sideX=5.61,sideZ=back+.71,sideW=1.71,sideD=1.27;
    paved(mainX,.23,mainZ,mainW+.19,mainD+.20,'#eee7d9');
    paved(sideX,.23,sideZ,sideW+.16,sideD+.17,'#f0e6d5');
    // Rear and side back walls: the entire front of each room is glazed.
    wall(mainX,mainZ-mainD*.47,mainW,1.31,0,ivory);
    separator(mainX-mainW*.48,mainZ,mainD,1.26);
    separator(mainX+mainW*.47,mainZ-.23,.99,1.28);
    roof(mainX,mainZ-.10,mainW+.17,mainD*.73,1.85,tileRed);
    for(const xx of[mainX-.78,mainX+.08,mainX+.79])
     window(xx,mainZ+mainD*.40,.99,.60,true);
    // Glazed bedroom with a bed visible through the unroofed front third.
    wall(sideX,sideZ-sideD*.44,sideW,1.34,0,cream);
    separator(sideX+sideW*.47,sideZ,sideD,1.24);
    window(sideX-.27,sideZ+sideD*.42,1.06,.72);
    roof(sideX,sideZ-.11,sideW+.14,sideD*.70,1.85,'#836960');
    bed(sideX,sideZ+.13);
    // Tiled terrace, patio furniture, roof pergola and little fish pond.
    const patioZ=front-.71;
    paved(3.07,.23,patioZ,3.34,1.23,'#e8d8bf');
    paved(5.69,.23,patioZ,1.75,1.18,'#eadcc6');
    for(const xx of[1.47,4.46])for(const zz of[patioZ-.51,patioZ+.44])
     baluster(xx,zz,.14,1.71,'#9b7b61');
    block(cedar,2.97,2.09,patioZ-.45,3.04,.10,.15,'wood');
    block(teak,2.97,2.10,patioZ+.43,3.04,.090,.11,'wood');
    for(let i=0;i<9;i++){
     const xx=1.57+i*.345;
     block(i%2?'#e6cba9':'#af875f',xx,2.17,patioZ,.057,.055,.99,'wood');
    }
    // Warm string lights tucked under the wooden pergola rafters
    // illuminate the patio without creating a roof over the courtyard.
    for(let i=0;i<11;i++){
     const x=1.67+i*.260;
     block('#9b8570',x,1.96,patioZ+.28,.018,.23,.022,'metal');
     block('#ffe8b9',x,1.83,patioZ+.28,.082,.085,.077,'glass',true);
    }
    for(const x of[1.34,4.52,5.62,6.61]){
     block('#d6c6b4',x,.37,front-.42,.17,.13,.17,'stone');
     block('#ffddaa',x,.50,front-.42,.12,.10,.12,'glass',true);
    }
    lounge(2.16,patioZ-.16);
    lounge(3.71,patioZ-.17,0,-1);
    coffeeTable(2.92,patioZ+.09);
    bench(5.91,patioZ-.24);
    // Pond is a physically inset water slab and lily pads.
    paved(5.68,.245,front-.29,1.41,.41,'#e9e2d2');
    paved(5.68,.283,front-.29,1.20,.28,'#73b5bc');
    for(const xx of[5.34,5.83,6.11])
     block('#70a780',xx,.31,front-.27,.14,.035,.13,'stone');
    // Front stepping stones and hand-lit postbox / nameplate.
    steps(4.00,front-.28);
    for(const xx of[2.01,5.95]){
     shrub(xx,front-.24,.18);
     lamp(xx,front-.43,1.03);
    }
    block('#9c7b57',3.99,.75,front-.30,1.15,.39,.090,'wood');
    block('#f9e3bd',3.99,.77,front-.23,.78,.20,.026,'glass',true);
    // Large glass entrance shows room layout rather than a solid wall.
    block(mist,4.29,1.03,mainZ+.72,.53,1.15,.065,'glass');
    block('#e2d2bb',4.29,1.03,mainZ+.77,.035,1.16,.042,'wood');
    block(cedar,4.53,1.02,mainZ+.80,.035,.10,.035,'metal');
   }else{
    // TWO-STOREY MULTIFAMILY RESIDENCE: two occupied wings surround a
    // true open landscaped communal court, joined by an upper skybridge.
    // 40 residents / 40 parking slots unchanged. This is not home_grand.
    const xs=[2.21,5.78],wingW=2.13,rear=back+.12,frontWing=front-.79;
    const zMid=(rear+frontWing)/2,zLen=frontWing-rear,upperY=2.20;
    for(let wing=0;wing<2;wing++){
     const xx=xs[wing],inward=wing===0?xx+wingW*.47:xx-wingW*.47;
     // Divided ground-floor apartment bays, back walls and glass fronts.
     paved(xx,.25,zMid,wingW,zLen,'#ede3d7');
     for(const z of[rear+.73,rear+2.07,rear+3.24]){
      wall(xx,z-.43,wingW*.89,1.32,0,'#ebdfd0');
      block('#8eb6b6',inward,1.02,z,.067,1.34,.87,'glass');
      block('#e7dfd0',inward,1.68,z,.12,.08,.91,'stone');
      for(const shift of[-.25,.25])
       block('#f9e0af',inward+(wing===0?.065:-.065),1.07,z+shift,.020,.42,.19,'glass',true);
      bed(xx,z-.09);
      shrub(xx+(wing===0?-.76:.76),z+.30,.13);
     }
     // Actual second floor, with visible occupied terrace living bays.
     paved(xx,upperY+.06,zMid,wingW,zLen,'#e3dad0');
     for(const z of[rear+.69,rear+2.09,rear+3.28]){
      wall(xx,z-.37,wingW*.91,1.18,upperY,'#eee5d8');
      block(mist,inward,upperY+1.10,z,.054,1.05,.80,'glass');
      block('#e9d8c2',inward,upperY+1.55,z,.085,.10,.85,'stone');
      bed(xx,z-.07,upperY);
      lounge(xx,z+.44,upperY,.70);
     }
     // Inner balconies truly stand on the second occupied level.
     rail(inward,zMid,upperY+.15,zLen-.21,'v');
     // Upper roof is a series of separated narrow gables at the OUTSIDE
     // of each apartment wing, leaving courtyard-side furniture visible.
     for(const z of[rear+.57,rear+2.12,rear+3.60])
      roof(xx+(wing===0?-.40:.40),z,wingW*.55,.84,4.05,'#86776a');
     for(const z of[rear+.35,frontWing-.23]){
      baluster(xx+(wing===0?-.87:.87),z,.15,4.06,'#cbbeb2');
      lamp(xx+(wing===0?-.87:.87),z,4.35);
     }
     // 2nd-floor side garden and guarded front verandah.
     rail(xx,frontWing-.10,upperY+.12,wingW*.96);
     for(const z of[frontWing-.49,frontWing-.98])
      shrub(xx,z,.16,upperY);
     for(const z of[back+.63,frontWing-.46])
      lamp(inward+(wing===0?.23:-.23),z,1.69);
    }
    // Rear upper bridge is open, not a giant opaque roof.
    const bridgeZ=rear+.38,bridgeW=1.75;
    paved(center,upperY+.075,bridgeZ,bridgeW,.72,'#efe5d7');
    rail(center,bridgeZ-.40,upperY+.20,bridgeW-.11);
    rail(center,bridgeZ+.40,upperY+.20,bridgeW-.11);
    for(let k=0;k<7;k++)
     block(k%2?'#ad8768':'#e5ceb6',center-.75+k*.25,
      upperY+.16,bridgeZ,.09,.045,.60,'wood');
    // TWO actual stairways from the central courtyard to second floor.
    for(const sign of[-1,1]){
     const x=center+sign*.80;
     for(let k=0;k<13;k++){
      const p=(k+.5)/13;
      const y=.27+p*(upperY-.21),z=frontWing+.17-p*1.92;
      paved(x,y,z,.50,.17,k%2?'#e5d4c0':'#c6b8a6');
      for(const dx of[-.29,.29]){
       block('#b3bec0',x+dx,y+.18,z,.029,.36,.13,'metal');
       block('#8eb9b7',x+dx,y+.36,z,.025,.12,.13,'glass');
      }
     }
    }
    // Landscaped shared social atrium, miniature pool and sitting decks.
    paved(center,.245,frontWing-.65,1.56,1.70,'#e7d4c3');
    paved(center,.28,frontWing-.80,1.05,.64,'#e5e7d8');
    paved(center,.32,frontWing-.80,.86,.49,'#68adb9');
    for(const x of[center-.56,center+.56]){
     bench(x,frontWing-.09);
     shrub(x,frontWing-1.40,.15);
    }
    coffeeTable(center,frontWing-.03);
    const fountain=point(center,frontWing-.82);
    batch.add(CYL,'#e9d6c4',fountain.x-.5,.40,fountain.y-.5,.18,.09,.18,0,0,0,id,false,'stone');
    pole('#ffe7b4',center,.65,frontWing-.82,.037,.32,'glass',true);
    // Front community gate with illuminated sign and low landscaped wall.
    for(const sign of[-1,1]){
     const gx=center+sign*1.43;
     baluster(gx,front-.30,.17,2.19,'#b99b7c');
     lamp(gx,front-.31,2.46);
     shrub(gx+sign*.42,front-.41,.18);
    }
    block('#b39076',center,2.56,front-.28,3.13,.12,.18,'wood');
    block('#eee1cf',center,2.51,front-.20,2.74,.055,.10,'stone');
    block('#475f64',center,2.88,front-.24,1.54,.45,.10,'metal');
    block('#ffe2ae',center,2.88,front-.17,1.22,.20,.035,'glass',true);
    for(const dx of[-.34,.34]){
     lamp(center+dx,front-.35,1.60);
    }
   }
   return;
  }

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
    block('#bdac92',x,.17,back-.24,width+.20,.082,.24,'stone');
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
     for(let p=0;p<3;p++)block(p%2?'#927653':'#ab8866',px,.22+p*.14,back-.22,.41,.14,.22,'wood');
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
      const yy=.22+k*.17,z=back-.24;
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
     // Rooftop dining furniture is installed at the actual roof level.
     for(const side of[-1,1]){
      const xx=leftCenter+side*principalWidth*.22;
      pole('#8b624c',xx,top+.49,v,.036,.35,'wood');
      pole('#d1aa81',xx,top+.70,v,.19,.045,'wood');
      for(const dx of[-.25,.25])block('#ae8e6d',xx+dx,top+.50,v,.22,.055,.20,'wood');
      block('#ffe0a7',xx,top+.77,v,.055,.06,.052,'glass',true);
     }
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
    const rearDeck=Math.max(back-.21,baseV+.24);
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
 createFactoryEffects(records){
  this.factoryFxSources=records;this.factoryFxSelectionKey='';this.factoryFxSelected=[];
  if(!records.length){this.factoryFx=null;return;}
  if(!this.factorySteamTexture){
   const n=32,bytes=new Uint8Array(n*n*4);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const k=(y*n+x)*4,r=Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1);
    bytes[k]=bytes[k+1]=bytes[k+2]=255;bytes[k+3]=Math.round(Math.max(0,1-r)**2*220);
   }
   this.factorySteamTexture=new THREE.DataTexture(bytes,n,n,THREE.RGBAFormat);
   this.factorySteamTexture.needsUpdate=true;
  }
  const group=new THREE.Group();group.name='factory-production-effects';this.buildingGroup.add(group);
  const steam=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:this.factorySteamTexture,color:'#d8e3dd',transparent:true,opacity:.30,depthWrite:false,side:THREE.DoubleSide}),96);
  const sparks=new THREE.InstancedMesh(BOX,new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}),160);
  const parts=new THREE.InstancedMesh(BOX,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.49,metalness:.28}),112);
  for(const mesh of[steam,sparks,parts]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);}
  this.factoryFx={steam,sparks,parts,dummy:new THREE.Object3D(),color:new THREE.Color()};
 }
 updateFactoryEffects(state,cam,now){
  const fx=this.factoryFx;if(!fx)return;
  const elapsed=this.factoryFxLast==null?0:Math.max(0,Math.min(.08,now-this.factoryFxLast));this.factoryFxLast=now;
  this.factoryFxTime=(this.factoryFxTime||0)+(state.speed===0?0:elapsed*Math.min(state.speed||1,2));
  const time=this.factoryFxTime,span=Math.max(25,Math.min(85,48/(cam.z||1)));
  const key=[Math.floor(cam.x/10),Math.floor(cam.y/10),Math.round(span/8)].join(':');
  if(key!==this.factoryFxSelectionKey){
   this.factoryFxSelectionKey=key;
   this.factoryFxSelected=this.factoryFxSources.filter(p=>Math.abs(p.x-cam.x)<span&&Math.abs(p.z-cam.y)<span)
    .sort((a,b)=>Math.hypot(a.x-cam.x,a.z-cam.y)-Math.hypot(b.x-cam.x,b.z-cam.y)).slice(0,120);
  }
  let smoke=0,light=0,part=0;const d=fx.dummy;
  const box=(mesh,i,x,y,z,sx,sy,sz,yaw,color)=>{
   d.position.set(x,y,z);d.rotation.set(0,yaw,0);d.scale.set(sx,sy,sz);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
   mesh.setColorAt(i,fx.color.set(color));
  };
  for(const p of this.factoryFxSelected){
   if(!state.buildings.has(p.id))continue;
   const seed=hash(p.id,p.x),cycle=time+seed*7;
   if(p.kind==='steam')for(let k=0;k<6&&smoke<96;k++){
    const phase=(cycle*.20+k/6)%1,fade=Math.sin(phase*Math.PI),size=(.17+phase*.61)*fade;
    d.position.set(p.x+Math.sin(phase*3.1+seed)*.12,p.y+phase*1.30,p.z+phase*.17);
    d.quaternion.copy(this.camera.quaternion);d.scale.set(size,size*1.19,1);d.updateMatrix();fx.steam.setMatrixAt(smoke++,d.matrix);
   }
   if(p.kind==='fan')for(let k=0;k<3&&part<112;k++){
    const a=cycle*4.3+k*TAU/3;box(fx.parts,part++,p.x+Math.cos(a)*.08,p.y,p.z+Math.sin(a)*.08,.18,.023,.05,-a,'#b2c5c4');
   }
   if(p.kind==='cargo'&&part<112){
    const phase=(cycle*.17)%1,distance=(phase-.5)*p.distance;
    box(fx.parts,part++,p.x-Math.sin(p.turn)*distance,p.y,p.z+Math.cos(p.turn)*distance,.30,.23,.25,p.turn,'#d4a265');
   }
   if(p.kind==='beacon'&&light<160){
    const pulse=.035+.045*(.5+.5*Math.sin(cycle*4));box(fx.sparks,light++,p.x,p.y,p.z,pulse,.07,pulse,p.turn,'#ffc777');
   }
   if(p.kind==='weld'){
    const gate=(cycle%3.7)<.90;
    if(gate&&light<160)box(fx.sparks,light++,p.x,p.y,p.z,.07,.05,.065,p.turn,'#d6faff');
    if(gate)for(let k=0;k<7&&light<160;k++){
     const phase=(cycle*2.6+k/7)%1,a=k*2.399+seed;
     box(fx.sparks,light++,p.x+Math.cos(a)*phase*.19,p.y+.19*phase-.25*phase*phase,p.z+Math.sin(a)*phase*.17,.012,.025*(1-phase)+.005,.012,0,k%3?'#ffcc71':'#e7faff');
    }
   }
  }
  fx.steam.count=smoke;fx.sparks.count=light;fx.parts.count=part;
  for(const mesh of[fx.steam,fx.sparks,fx.parts]){mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }

 makeBuildings(state,CATALOG,KINDS){
  this.disposeGroup(this.buildingGroup);
  const batch=new Batch({detailGroups:true});this.grandSignalLights=[];
  for(const building of state.buildings.values())this.building(batch,building,CATALOG,KINDS);
  this.buildingGroup.add(batch.build());
  this.createFactoryEffects(batch.factoryEffects||[]);
  this.lastBuildingDetailLevel=null;
  this.lastNightVisibility=-1;
 }
 updateGrandSignals(){}

 createCars(){
  this.carModels=VEHICLE_TYPES.map((_,i)=>carGeometries(i));
  this.carSets=new Map();this.carDummy=new THREE.Object3D();this.carLightDummy=new THREE.Object3D();this.carTint=new THREE.Color();
  // Medium: silhouette + glass cabin. Far: one tinted box. Only the near set uses detailed meshes and lights.
  this.carLODSets=new Map();
  this.carViewMatrix=new THREE.Matrix4();this.carViewFrustum=new THREE.Frustum();this.carViewPoint=new THREE.Vector3();
  this.carLODStats={near:0,medium:0,far:0,culled:0};
 }
 ensureCarSet(kind,needed){
  const old=this.carSets.get(kind);if(old&&old.capacity>=needed)return old;
  if(old)for(const mesh of [old.body,old.trim,old.headlights,old.taillights,old.lightSpill]){
   this.scene.remove(mesh);mesh.material.dispose();mesh.dispose();
  }
  const capacity=Math.max(32,2**Math.ceil(Math.log2(Math.max(1,needed)))),geometry=this.carModels[kind];
  const body=new THREE.InstancedMesh(geometry.body,new THREE.MeshStandardMaterial({
   color:'#ffffff',roughness:kind===5?.23:kind===6?.27:.35,metalness:kind===4||kind===6?.23:.15
  }),capacity);
  const trim=new THREE.InstancedMesh(geometry.trim,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.20}),capacity);
  // Only instanced emissive lenses: NEVER a point light for every vehicle.
  const lightMesh=color=>new THREE.InstancedMesh(BOX,new THREE.MeshBasicMaterial({
   color,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending
  }),capacity*2);
  const headlights=lightMesh('#fff3d6'),taillights=lightMesh('#ff3d35');
  const lightSpill=new THREE.InstancedMesh(BOX,new THREE.MeshBasicMaterial({
   color:'#ffeac2',transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending
  }),capacity);
  for(const mesh of [headlights,taillights,lightSpill]){
   mesh.frustumCulled=false;mesh.renderOrder=3;mesh.count=0;mesh.visible=false;
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);
  }
  for(const mesh of [body,trim]){
   mesh.castShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;this.scene.add(mesh);
  }
  const created={capacity,body,trim,headlights,taillights,lightSpill};
  this.carSets.set(kind,created);this.lastNightVisibility=-1;return created;
 }
 ensureCarLODSet(level,needed){
  const old=this.carLODSets.get(level);
  if(old&&old.capacity>=needed)return old;
  if(old)for(const mesh of [old.body,old.roof].filter(Boolean)){
   this.scene.remove(mesh);mesh.material.dispose();mesh.dispose();
  }
  const capacity=Math.max(32,2**Math.ceil(Math.log2(Math.max(1,needed))));
  if(level==='roadTrainLow'||level==='taxiLow'){
   // Both special Low-poly fleets share the efficient two-mesh instancing
   // path; each type keeps its own cached premerged geometry.
   const lowModel=level==='taxiLow'
    ?(this.lowTaxiModel??=carGeometries(14))
    :(this.lowRoadTrainModel??=carGeometries(13));
   const body=new THREE.InstancedMesh(lowModel.body,
    new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.79,metalness:0}),capacity);
   const roof=new THREE.InstancedMesh(lowModel.trim,
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0}),capacity);
   for(const mesh of [body,roof]){
    mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);
   }
   const made={capacity,body,roof};
   this.carLODSets.set(level,made);return made;
  }
  const body=new THREE.InstancedMesh(BOX,new THREE.MeshStandardMaterial({
   color:'#ffffff',roughness:.66,metalness:.05
  }),capacity);
  body.frustumCulled=false;body.castShadow=false;body.receiveShadow=false;
  body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(body);
  let roof=null;
  if(level==='medium'){
   roof=new THREE.InstancedMesh(BOX,new THREE.MeshStandardMaterial({
    color:'#36505e',roughness:.58
   }),capacity);
   roof.frustumCulled=false;roof.castShadow=false;roof.receiveShadow=false;
   roof.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(roof);
  }
  const made={capacity,body,roof};this.carLODSets.set(level,made);return made;
 }
 // Keep one pending upload range, including changes while a light mesh is hidden.
 // Moving cars precede parked cars, so unchanged parking suffixes stay on the GPU.
 dirtyCarInstances(attribute,index,count=1){
  const start=index*attribute.itemSize,end=start+count*attribute.itemSize;
  if(attribute.updateRanges.length){const range=attribute.updateRanges[0],last=Math.max(range.start+range.count,end);range.start=Math.min(range.start,start);range.count=last-range.start;}
  else attribute.addUpdateRange(start,end-start);
  attribute.needsUpdate=true;
 }
 sameCarPose(a,b){return !!a&&a.x===b.x&&a.z===b.z&&a.angle===b.angle&&a.altitude===b.altitude;}
 updateSimpleCars(level,items){
  const old=this.carLODSets.get(level);
  if(!items.length){
   if(old){old.body.count=0;if(old.roof)old.roof.count=0;}
   return;
  }
  const set=this.ensureCarLODSet(level,items.length),dummy=this.carDummy;
  set.lastCars??=[];
  for(let i=0;i<items.length;i++){
   const car=items[i],old=set.lastCars[i],moved=!this.sameCarPose(old,car),painted=!old||old.color!==car.color||old.kind!==car.kind;
   if(moved||!old||old.kind!==car.kind){
    dummy.rotation.set(0,-car.angle,0);
    if(level==='roadTrainLow'||level==='taxiLow'){
     // Dedicated low vehicle body + detail live in baked, instanced geometry.
     dummy.position.set(car.x,car.altitude||0,car.z);
     dummy.scale.set(1,1,1);dummy.updateMatrix();
     set.body.setMatrixAt(i,dummy.matrix);this.dirtyCarInstances(set.body.instanceMatrix,i);
     set.roof.setMatrixAt(i,dummy.matrix);this.dirtyCarInstances(set.roof.instanceMatrix,i);
    }else{
     const [length,width,height,cabinX,cabinL,cabinH]=VEHICLE_STYLES[car.kind];
     dummy.position.set(car.x,.163+(car.altitude||0),car.z);dummy.scale.set(length,height*.82,width*.96);dummy.updateMatrix();
     set.body.setMatrixAt(i,dummy.matrix);this.dirtyCarInstances(set.body.instanceMatrix,i);
     if(set.roof){
      const cos=Math.cos(car.angle),sin=Math.sin(car.angle);
      dummy.position.set(car.x+cabinX*cos,.165+(car.altitude||0)+height*.5+cabinH*.39,car.z+cabinX*sin);
      dummy.scale.set(cabinL,cabinH*.78,width*.80);dummy.updateMatrix();set.roof.setMatrixAt(i,dummy.matrix);this.dirtyCarInstances(set.roof.instanceMatrix,i);
     }
    }
   }
   if(painted){set.body.setColorAt(i,this.carTint.set(car.color));this.dirtyCarInstances(set.body.instanceColor,i);}
   set.lastCars[i]=car;
  }
  set.lastCars.length=items.length;set.body.count=items.length;if(set.roof)set.roof.count=items.length;
 }
 // Cache stationary parking geometry; appearance and visibility remain live.
 parkedCarPose(b,id){
  this.parkedPoseCache??=new WeakMap();
  let cache=this.parkedPoseCache.get(b);
  if(!cache||cache.x!==b.x||cache.y!==b.y||cache.rotation!==b.rotation||cache.key!==b.key||cache.slots!==b.parkingSlots){
   cache={x:b.x,y:b.y,rotation:b.rotation,key:b.key,slots:b.parkingSlots,indexes:new Map(),poses:new Map()};
   this.parkedPoseCache.set(b,cache);
  }
  let index=cache.indexes.get(id);
  if(index==null||b.parkingSlots[index]!==id){
   cache.indexes=new Map(b.parkingSlots.map((cid,i)=>[cid,i]));index=cache.indexes.get(id);
  }
  if(index==null)return null;
  if(!cache.poses.has(index))cache.poses.set(index,this.parking.parkingSlotPose(b,index));
  return cache.poses.get(index);
 }
 hideCars(){
  for(const set of this.carSets.values())for(const mesh of [set.body,set.trim,set.headlights,set.taillights,set.lightSpill])mesh.count=0;
  for(const set of this.carLODSets.values())for(const mesh of [set.body,set.roof])if(mesh)mesh.count=0;
  for(const mesh of this.carTechMeshes?.values()||[])mesh.count=0;
  if(this.carMarkerMesh)this.carMarkerMesh.count=0;
  if(this.carSelectionFrame)this.carSelectionFrame.visible=false;
  this.carIndicatorHits=[];this.carLODStats={near:0,medium:0,far:0,culled:0};
 }
 cars(state,vehiclePosition,CATALOG,vehicleTimeliness=null,selected=null,showDiamonds=true){
  const groups=VEHICLE_TYPES.map(()=>[]),medium=[],far=[],roadTrainLow=[],taxiLow=[],indicators=[],techEffects=[],warpPoints=[];
  const frustum=this.carViewFrustum,point=this.carViewPoint,cam=this.cam;
  this.camera.updateMatrixWorld(true);
  frustum.setFromProjectionMatrix(this.carViewMatrix.multiplyMatrices(
   this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  const pixelsPerUnit=this.h/(this.camera.top-this.camera.bottom);
  this.carLODStats={near:0,medium:0,far:0,culled:0};
  const add=(x,z,angle,c,id,fallback,v=null,buildingId=null,altitude=0)=>{
   point.set(x,.22+altitude,z);
   if(frustum.planes.some(plane=>plane.distanceToPoint(point)<-1.5)){
    this.carLODStats.culled++;return;
   }
   const tech=v?.vehicleTech??c?.vehicleTech??'normal';
   const upgraded=Object.hasOwn(VEHICLE_TECH_COLORS,tech);
   const kind=carClassFor(c,id,tech,v),car={x,z,angle,color:upgraded?VEHICLE_TECH_COLORS[tech]:carPaintFor(c,id,kind,fallback),kind,altitude};
   const apparentLength=VEHICLE_STYLES[kind][0]*pixelsPerUnit;
   const distance=Math.hypot(x-(cam?.x??0),z-(cam?.y??0));
   // Very high never downgrades a visible car; medium downgrades sooner than v3.0.
   // Low uses the cheapest proxy at every distance, while preserving car picking.
   const level=v?.kind==='intercity'&&this.graphicQuality==='low'?'roadTrainLow':
    kind===8&&this.graphicQuality==='low'?'taxiLow':
    kind===8&&this.graphicQuality==='medium'&&distance>65?'taxiLow':
    kind===8?'near':
    v?.kind==='intercity'&&distance<135?'near':v?.kind==='delivery'&&distance<70?'near':upgraded?'near':this.graphicQuality==='veryHigh'?'near':
    this.graphicQuality==='low'?'far':
    apparentLength>=22&&distance<=Math.max(24,12/Math.max(.1,cam?.z??1))
     ?'near':apparentLength>=10?'medium':'far';
   if(upgraded)techEffects.push({x,z,angle,altitude,tech,distance});
   if(level==='near')groups[kind].push(car);
   else if(level==='medium')medium.push(car);
   else if(level==='roadTrainLow')roadTrainLow.push(car);
   else if(level==='taxiLow')taxiLow.push(car);
   else far.push(car);
   this.carLODStats[level==='roadTrainLow'||level==='taxiLow'?'far':level]++;
   const focused=selected?.kind==='vehicle'&&selected.id===v?.id||
    selected?.kind==='parked'&&selected.id===id;
   const status=showDiamonds?(vehicleTimeliness?.(v)||'green'):'green';
   if(focused||showDiamonds&&status!=='green')indicators.push({
    x,z,angle,kind,focused,altitude,
    status,
    selection:v?{kind:'vehicle',id:v.id,citizenId:v.citizenId}:{kind:'parked',id,buildingId}
   });
  };
  for(const v of state.vehicles.values()){
   if(!['driving','stuck','parking_in','parking_out','delivery_unload','air_lift','air_cruise','air_land','warp_charge'].includes(v.phase)&&!(v.phase==='departing'&&v.lotPath))continue;
   const p=vehiclePosition(v);if(p)add(p.x-.5,p.y-.5,Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle)),state.citizens.get(v.citizenId),v.citizenId??v.id,v.color,v,null,p.altitude||0);
  }
  for(const b of state.buildings.values())for(const id of b.parked){
   if(this.parking.parkingIsMoving(id))continue;
   const p=this.parkedCarPose(b,id);
   if(p)add(p.x-.5,p.y-.5,Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle)),state.citizens.get(id),id,this.parking.citizenCarColor(id),state.vehicles.get(state.citizens.get(id)?.vehicleId),b.id);
  }
  for(const v of state.vehicles.values())if(v.phase==='warp_charge'&&v.airFrom&&v.airTo){warpPoints.push(v.airFrom,v.airTo);}
  this.updateCarTechEffects(techEffects,warpPoints);
  this.updateCarIndicators(indicators,showDiamonds);
  this.updateSimpleCars('medium',medium);
  this.updateSimpleCars('far',far);
  this.updateSimpleCars('roadTrainLow',roadTrainLow);
  this.updateSimpleCars('taxiLow',taxiLow);
  for(let kind=0;kind<groups.length;kind++){
   const items=groups[kind],old=this.carSets.get(kind);
   if(!items.length){if(old){old.body.count=0;old.trim.count=0;old.headlights.count=0;old.taillights.count=0;old.lightSpill.count=0;}continue;}
   const set=this.ensureCarSet(kind,items.length);set.lastCars??=[];
   for(let i=0;i<items.length;i++){
    const car=items[i],old=set.lastCars[i],moved=!this.sameCarPose(old,car);
    if(!old||old.color!==car.color){set.body.setColorAt(i,this.carTint.set(car.color));this.dirtyCarInstances(set.body.instanceColor,i);}
    set.lastCars[i]=car;if(!moved)continue;
    this.carDummy.position.set(car.x,car.altitude||0,car.z);this.carDummy.rotation.set(0,-car.angle,0);
    this.carDummy.scale.set(1,1,1);this.carDummy.updateMatrix();
    set.body.setMatrixAt(i,this.carDummy.matrix);set.trim.setMatrixAt(i,this.carDummy.matrix);
    const [length,width]=VEHICLE_STYLES[kind],cos=Math.cos(car.angle),sin=Math.sin(car.angle);
    for(const sign of [-1,1]){
     // Car model faces +X in local space; side offsets rotate with the body.
     const side=sign*width*.33;
     for(const [mesh,localX,height] of [[set.headlights,length*.5+.024,.185],[set.taillights,-length*.5-.024,.170]]){
      this.carLightDummy.position.set(car.x+cos*localX-sin*side,height+(car.altitude||0),car.z+sin*localX+cos*side);
      this.carLightDummy.rotation.set(0,-car.angle,0);
      this.carLightDummy.scale.set(mesh===set.headlights?.024:.018,.037,.050);
      this.carLightDummy.updateMatrix();
      mesh.setMatrixAt(i*2+(sign+1)/2,this.carLightDummy.matrix);
     }
    }
    // A very faint forward pool of light on the pavement at night.
    // One transparent instanced box per car; no shadows or dynamic lights.
    const spillX=length*.5+.17;
    this.carLightDummy.position.set(car.x+cos*spillX,.026,car.z+sin*spillX);
    this.carLightDummy.rotation.set(0,-car.angle,0);
    this.carLightDummy.scale.set((car.altitude||0)>1?.001:.31,.008,(car.altitude||0)>1?.001:.21);
    this.carLightDummy.updateMatrix();
    set.lightSpill.setMatrixAt(i,this.carLightDummy.matrix);
    for(const mesh of [set.body,set.trim,set.lightSpill])this.dirtyCarInstances(mesh.instanceMatrix,i);
    for(const mesh of [set.headlights,set.taillights])this.dirtyCarInstances(mesh.instanceMatrix,i*2,2);
   }
   set.lastCars.length=items.length;
   for(const mesh of [set.body,set.trim,set.lightSpill])mesh.count=items.length;
   for(const mesh of [set.headlights,set.taillights])mesh.count=items.length*2;
  }
 }
 // Per-theme GPU-instanced body sheen and three tapered light streaks.
 // No animated sprites, spherical particles, point lights or vehicle-state writes.
 ensureCarTechMesh(key,needed){
  let m=this.carTechMeshes?.get(key);
  if(needed===0)return m||null;
  if(m&&m.instanceMatrix.count>=needed)return m;
  if(m){this.scene.remove(m);m.material.dispose();m.dispose();}
  const cap=Math.max(16,2**Math.ceil(Math.log2(needed)));
  const [tech,layer='beam']=key.split(':'),beam=layer==='beam',glow=layer==='glow';
  const geometry=beam?CAR_WARP_BEAM:glow?this.carModels[9].body:CAR_TECH_STREAK;
  m=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({
   color:VEHICLE_TECH_COLORS[tech]||VEHICLE_TECH_COLORS.warp,
   transparent:true,opacity:beam?.22:glow?.22:.44,
   blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false,
   side:THREE.DoubleSide
  }),cap);
  m.count=0;m.visible=false;m.frustumCulled=false;m.renderOrder=4;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.scene.add(m);
  if(!this.carTechMeshes)this.carTechMeshes=new Map();
  this.carTechMeshes.set(key,m);return m;
 }
 updateCarTechEffects(records,warpPoints){
  const d=this.carDummy;
  const groups={speed:[],smart:[],fly:[],warp:[]};
  for(const r of records)if(groups[r.tech])groups[r.tech].push(r);
  // Bound the expensive animated streaks; retain the F1 body and color for every upgraded vehicle.
  const streakLimit=this.graphicQuality==='low'?48:this.graphicQuality==='medium'?160:260;
  const time=Date.now()*.0018;
  for(const tech of Object.keys(groups)){
   const items=groups[tech],glow=this.ensureCarTechMesh(tech+':glow',items.length);
   if(glow){
    glow.count=items.length;glow.visible=items.length>0;
    for(let i=0;i<items.length;i++){
     const car=items[i],pulse=1.026+.013*Math.sin(time+i*.38);
     d.position.set(car.x,(car.altitude||0)+.002,car.z);
     d.rotation.set(0,-car.angle,0);d.scale.set(pulse,pulse,pulse);d.updateMatrix();
     glow.setMatrixAt(i,d.matrix);
    }
    if(items.length)glow.instanceMatrix.needsUpdate=true;
   }
   // Closest cars receive brighter side and tail streaks without a particle swarm.
   const count=Math.min(items.length,streakLimit);
   const streak=this.ensureCarTechMesh(tech+':trail',count*3);
   if(!streak)continue;
   streak.count=count*3;streak.visible=count>0;
   // Sorting runs only for the small bounded effect set; simulation state stays untouched.
   const shown=items.length>count?items.slice().sort((a,b)=>a.distance-b.distance).slice(0,count):items;
   for(let i=0;i<shown.length;i++){
    const car=shown[i],cos=Math.cos(car.angle),sin=Math.sin(car.angle);
    const pulse=.94+.10*Math.sin(time*1.7+i*.73);
    for(let j=0;j<3;j++){
     const localX=j===2?-.46:-.29,localZ=j===2?0:(j===0?-.15:.15);
     d.position.set(car.x+cos*localX-sin*localZ,(car.altitude||0)+.16,
      car.z+sin*localX+cos*localZ);
     d.rotation.set(0,-car.angle,0);d.scale.set(pulse,j===2?.70:.86,j===2?.70:.85);
     d.updateMatrix();streak.setMatrixAt(i*3+j,d.matrix);
    }
   }
   if(count)streak.instanceMatrix.needsUpdate=true;
  }
  // Original warp destination guide remains functional, now matching warp green.
  const beam=this.ensureCarTechMesh('warp:beam',warpPoints.length);
  if(beam){
   beam.count=warpPoints.length;beam.visible=warpPoints.length>0;
   for(let i=0;i<warpPoints.length;i++){
    const p=warpPoints[i];
    d.position.set(p.x-.5,3.5,p.y-.5);d.rotation.set(0,0,0);d.scale.set(.30,7,.30);
    d.updateMatrix();beam.setMatrixAt(i,d.matrix);
   }
   if(warpPoints.length)beam.instanceMatrix.needsUpdate=true;
  }
 }
 updateCarIndicators(records,showDiamonds=true){
  if(!this.camera||!this.cam||!this.h||!this.w)return;
  if(showDiamonds&&(!this.carMarkerMesh||this.carMarkerMesh.instanceMatrix.count<records.length)){
   if(this.carMarkerMesh){this.scene.remove(this.carMarkerMesh);this.carMarkerMesh.material.dispose();this.carMarkerMesh.geometry.dispose();this.carMarkerMesh.dispose();}
   const capacity=Math.max(32,2**Math.ceil(Math.log2(Math.max(1,records.length))));
   // One shared emoji atlas and one instanced draw; no per-car canvas or DOM nodes.
   if(!this.carEmotionTexture){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const context=canvas.getContext('2d');context.clearRect(0,0,256,128);
    context.font='96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';context.textAlign='center';context.textBaseline='middle';
    context.fillText('😥',64,64);context.fillText('😡',192,64);
    this.carEmotionTexture=new THREE.CanvasTexture(canvas);this.carEmotionTexture.colorSpace=THREE.SRGBColorSpace;
   }
   const geometry=new THREE.PlaneGeometry(1,1);
   geometry.setAttribute('emotionOffset',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
   const material=new THREE.MeshBasicMaterial({map:this.carEmotionTexture,transparent:true,alphaTest:.05,depthTest:false,depthWrite:false,toneMapped:false});
   material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <uv_pars_vertex>','#include <uv_pars_vertex>\nattribute float emotionOffset;')
     .replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv.x=vMapUv.x*.5+emotionOffset*.5;');
   };
   material.customProgramCacheKey=()=>'car-emotion-atlas-v1';
   this.carMarkerMesh=new THREE.InstancedMesh(geometry,material,capacity);this.carMarkerMesh.frustumCulled=false;this.carMarkerMesh.renderOrder=6;this.carMarkerMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(this.carMarkerMesh);
  }
  if(!this.carSelectionFrame){
   const box=new THREE.BoxGeometry(1,1,1),geometry=new THREE.EdgesGeometry(box);box.dispose();
   this.carSelectionFrame=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:.96,depthTest:false,depthWrite:false,toneMapped:false}));
   this.carSelectionFrame.renderOrder=5;this.carSelectionFrame.frustumCulled=false;this.scene.add(this.carSelectionFrame);
   this.carMarkerDummy=new THREE.Object3D();this.carMarkerTint=new THREE.Color();this.carMarkerPoint=new THREE.Vector3();
  }
  const mesh=this.carMarkerMesh,d=this.carMarkerDummy,unit=(this.camera.top-this.camera.bottom)/this.h,up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion),pixels=Math.min(18,Math.max(12,this.cam.z*12))*2;
  this.carIndicatorHits=[];this.carSelectionFrame.visible=false;let count=0;
  for(const record of records){
   const style=VEHICLE_STYLES[record.kind],roof=.18+style[2]/2+style[5]*1.08;
   if(record.focused){const frame=this.carSelectionFrame;frame.visible=true;frame.position.set(record.x,roof/2+.035+(record.altitude||0),record.z);frame.rotation.set(0,-record.angle,0);frame.scale.set(style[0]+.09,roof+.04,style[1]+.08);}
   if(!showDiamonds||!Object.hasOwn({orange:0,red:1},record.status))continue;
   d.position.set(record.x,roof+.025+(record.altitude||0),record.z).addScaledVector(up,(pixels*.5+2)*unit);this.carMarkerPoint.copy(d.position).project(this.camera);
   const p=this.carMarkerPoint;if(p.x< -1.03||p.x>1.03||p.y< -1.03||p.y>1.03||p.z< -1||p.z>1)continue;
   d.quaternion.copy(this.camera.quaternion);d.scale.set(pixels*unit,pixels*unit,1);d.updateMatrix();mesh.setMatrixAt(count,d.matrix);
   mesh.geometry.getAttribute('emotionOffset').setX(count,record.status==='red'?1:0);count++;
   this.carIndicatorHits.push({x:(p.x+1)*this.w/2,y:(1-p.y)*this.h/2,radius:pixels*.6,selection:record.selection});
  }
  if(mesh){
   mesh.count=count;mesh.visible=showDiamonds&&count>0;
   if(showDiamonds){mesh.instanceMatrix.needsUpdate=true;mesh.geometry.getAttribute('emotionOffset').needsUpdate=true;}
  }
 }
 pickVehicleMarker(x,y){
  let selected=null,best=Infinity;for(const hit of this.carIndicatorHits||[]){const d=Math.hypot(x-hit.x,y-hit.y);if(d<=hit.radius&&d<best){best=d;selected=hit.selection;}}return selected;
 }
 createRoute(){this.routeLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#fff1a0',transparent:true,opacity:.95}));this.routeLine.renderOrder=4;this.scene.add(this.routeLine);}
 preview(state,hover,drag,tool,selected,CATALOG,ROADS,junction,checkBuilding,roadPreview=null,demolitionPreview=null){const key=[roadPreview?.key,demolitionPreview?.key,tool,hover?.x,hover?.y,hover?.placement?.rotation,hover?.placement?.error,drag?.cells?.join(','),selected?.kind,selected?.id,state.version,state.buildings.size].join(':');if(key===this.previewKey)return;this.previewKey=key;this.disposeGroup(this.previewGroup);const boxes=[];if(hover&&CATALOG[tool]){const t=CATALOG[tool],check=hover.placement||checkBuilding(tool,hover.x,hover.y),ok=!check.error,ghost={key:tool,id:-1,x:hover.x,y:hover.y,rotation:check.rotation||0},bounds=this.parking.buildingBounds(ghost);boxes.push([hover.x+bounds.w/2,hover.y+bounds.h/2,bounds.w,bounds.h,ok?'#d9f788':'#ff947f']);const b=new Batch();this.building(b,ghost,CATALOG);const model=b.build(false);model.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.52;}});this.previewGroup.add(model);}else if(roadPreview){
  const receiver={roadGroup:new THREE.Group(),signalGroup:new THREE.Group(),disposeGroup:this.disposeGroup,parking:this.parking};
  TrafficRenderer.prototype.makeRoads.call(receiver,roadPreview.state,ROADS,roadPreview.junction,true);
  receiver.roadGroup.position.y=.035;receiver.signalGroup.position.y=.035;
  if(roadPreview.error)receiver.roadGroup.traverse(o=>{if(o.material){o.material.color.lerp(new THREE.Color('#f17065'),.55);}});
  this.previewGroup.add(receiver.roadGroup,receiver.signalGroup);
 }
 if(demolitionPreview){
  for(const pick of demolitionPreview.roads){const w=ROADS[pick.type].visualWidth||ROADS[pick.type].width;boxes.push([pick.node%300,Math.floor(pick.node/300),w,w,pick.main?'#3d3b38':'#281919',pick.main?.38:.68,true]);}
  const b=demolitionPreview.building;if(b)boxes.push([b.x+b.w/2,b.y+b.h/2,b.w,b.h,'#281919',.60,true]);
 }
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
 for(const [x,z,w,d,color,opacity=.22,overlay=false]of boxes){const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:!overlay}));plane.renderOrder=overlay?20:0;plane.rotation.x=-Math.PI/2;plane.position.set(x,.14,z);this.previewGroup.add(plane);const points=[new THREE.Vector3(x-w/2,.17,z-d/2),new THREE.Vector3(x+w/2,.17,z-d/2),new THREE.Vector3(x+w/2,.17,z+d/2),new THREE.Vector3(x-w/2,.17,z+d/2),new THREE.Vector3(x-w/2,.17,z-d/2)];this.previewGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color})));}
 }
 render({state,cam,hover,drag,roadPreview,demolitionPreview=null,tool,selected,heat,debug,follow,CATALOG,ROADS,KINDS,junction,vehiclePosition,vehicleTimeliness,signalColor,checkBuilding,parking,showCarDiamonds=true}){this.parking=parking;this.updateCamera(cam);if(this.city!==state.city||this.lastState!==state){this.terrain(state.city);this.lastState=state;this.roadKey='';this.buildKey='';}
 const buildKey=state.buildings.size+':'+(state.buildingVisualVersion||0);
 const roadKey=[state.version,state.roads.size,heat,buildKey].join(':');if(roadKey!==this.roadKey){this.roadKey=roadKey;this.makeRoads(state,ROADS,junction);}if(buildKey!==this.buildKey){this.buildKey=buildKey;this.makeBuildings(state,CATALOG,KINDS);}if(this.graphicQuality==='low'){this.treeGroup.visible=false;}
 else{this.treeGroup.visible=true;this.trees(state,cam);}
 // Skip all vehicle pose, instance and effect preparation in map-only mode.
 if(heat)this.hideCars();
 else this.cars(state,vehiclePosition,CATALOG,vehicleTimeliness,selected,showCarDiamonds);
  this.preview(state,hover,drag,tool,selected,CATALOG,ROADS,junction,checkBuilding,roadPreview,demolitionPreview);
 this.updateSignals(signalColor);this.updateAISignalGlow(state);this.updateGrandSignals();this.updateWeatherLight(state);
 this.updateBuildingDetailLOD(cam);
 const visualNow=performance.now()*.001;
 if(this.landscapeClock)this.landscapeClock.value=visualNow;
 this.updateFactoryEffects(state,cam,visualNow);
 if(heat){if(!this.heatGroup){this.heatGroup=new THREE.Group();this.scene.add(this.heatGroup);}if(!this.heatAt||state.time-this.heatAt>1){this.heatAt=state.time;this.disposeGroup(this.heatGroup);const b=new Batch();for(const[i,r]of state.roads){if(r.load<.1&&r.wait<.1)continue;const color=r.wait>3?'#ce6156':r.wait>.5?'#eda858':'#92c77b';b.box(color,i%300,.13,Math.floor(i/300),ROADS[r.type].width*.92,.018,.9);}this.heatGroup.add(b.build(false));}this.heatGroup.visible=true;}else if(this.heatGroup)this.heatGroup.visible=false;
 // The shared screen overlay draws the exact remaining lane/parking route.
 this.routeLine.visible=false;
 if(debug||ROADS[tool]||CATALOG[tool]||tool.startsWith('tree:')||tool==='treeRow'||tool==='treeBrush'||tool==='eraseTree'){if(!this.grid){this.grid=new THREE.GridHelper(80,80,'#dfefba','#d0e0a0');this.grid.material.transparent=true;this.grid.material.opacity=.2;this.grid.position.y=.125;this.scene.add(this.grid);}this.grid.visible=true;this.grid.position.x=Math.round(cam.x);this.grid.position.z=Math.round(cam.y);}else if(this.grid)this.grid.visible=false;
 this.renderer.render(this.scene,this.camera);
 }
}

