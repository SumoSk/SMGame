const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
 const {game:g,get}=new Function('require',fixture+'return boot();')(require);
 g.state.money=1e12;
 const home=g.buildBuilding('home_grand',160,148-g.CATALOG.home_grand.plotHeight,true);assert(home);
 for(let i=0;i<30;i++){const c=g.newCitizen(home);c.resident=true;c.profile.trait=0;c.locationId=home.id;c.location='home';home.residents.add(c.id);home.parked.add(c.id);}g.syncParkingSlots();
 for(const tech of g.VEHICLE_TECHS)for(let i=0;i<26;i++){
  g.openVehicleUpgrade();get('dialogContent').onclick({target:{closest:()=>({dataset:{techTrait:'0',techKey:tech.key}})}});
 }
 const raw=g.snapshot(),saved=JSON.parse(raw),money=g.state.money;
 assert(g.loadGame(true,null,raw),'26 purchased cars of every type must survive reload');
 for(const tech of g.VEHICLE_TECHS)assert.equal(g.state.vehicleTechLevels[0][tech.key],26);
 assert.equal(g.state.money,money);assert.equal(g.state.citizens.size,30);
 for(const [id,c] of saved.citizens)assert.equal(g.state.citizens.get(id).vehicleTech,c.vehicleTech);
 saved.vehicleTechLevels[0].speed=100000;g.validateSave(saved);
 for(const bad of [-1,1.5,Number.MAX_SAFE_INTEGER+1,null]){
  const data=JSON.parse(raw);data.vehicleTechLevels[0].speed=bad;assert.throws(()=>g.validateSave(data));
 }
 const legacy=JSON.parse(raw);delete legacy.vehicleTechUnit;for(const group of legacy.vehicleTechLevels)for(const key of Object.keys(group))group[key]=0;
 legacy.vehicleTechLevels[0].speed=25;g.validateSave(legacy);
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const source=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const Renderer=new Function('THREE',source+'return TrafficRenderer;')(THREE),r=Object.create(Renderer.prototype);
 r.scene=new THREE.Scene();r.roadGroup=new THREE.Group();r.buildingGroup=new THREE.Group();r.createCars();
 const set=r.ensureCarSet(0,1);r.updateNightVisibility(1);
 for(const mesh of [set.headlights,set.taillights,set.lightSpill]){assert.equal(mesh.visible,false);mesh.count=1;}
 r.updateNightVisibility(1);for(const mesh of [set.headlights,set.taillights,set.lightSpill])assert.equal(mesh.visible,true,'lights return at unchanged darkness');
 for(const mesh of [set.headlights,set.taillights,set.lightSpill])mesh.count=0;
 r.updateNightVisibility(1);for(const mesh of [set.headlights,set.taillights,set.lightSpill])assert.equal(mesh.visible,false);
 for(const mesh of [set.headlights,set.taillights,set.lightSpill])mesh.count=1;
 r.updateNightVisibility(0);for(const mesh of [set.headlights,set.taillights,set.lightSpill])assert.equal(mesh.visible,false,'daytime stays off');
 const main=fs.readFileSync('index.html','utf8'),dist=fs.readFileSync('dist/index.html','utf8'),standalone=fs.readFileSync('outputs/Traffic-Fixer-Thailand-3D.html','utf8');
 assert.equal(dist,main.replace(/\b(src|href)="dist\//g,'$1="'),'dist must use the current complete UI');
 const title=main.match(/<title>(.*?)<\/title>/)[1];assert(standalone.includes('<title>'+title+'</title>'));
 for(const html of [main,dist,standalone])assert(html.includes('data-city-shortcut="vehicleUpgrade"'));
 assert(!/<(?:link|script)[^>]*(?:href|src)="(?:dist\/)?(?:style\.css|bootstrap\.js)/.test(standalone),'download must embed both CSS and JS');
 console.log('PASS: purchases >25 round-trip with money/citizens/assignments intact; large counts accepted and invalid counts rejected; legacy validation retained; count-dependent night lights restore; hosted/dist/download UI match');
})().catch(e=>{console.error(e);process.exitCode=1});
