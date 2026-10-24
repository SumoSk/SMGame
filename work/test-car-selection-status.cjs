const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0].replace('return{game,get};','return{game,get,context};');
 const {game:g,get,context}=new Function('require',fixture+'return boot();')(require);
 g.state.money=1e8;g.state.time=720;
 const home=g.buildBuilding('home_starter',160,145,true),office=g.buildBuilding('office_starter',180,145,true);assert(home&&office);
 const people=[];for(let n=0;n<6;n++){const c=g.newCitizen(home);Object.assign(c,{resident:true,locationId:home.id,location:'home'});home.residents.add(c.id);home.parked.add(c.id);people.push(c);}g.syncParkingSlots();
 const citizen=people[0],pose=g.parkingSlotPose(home,home.parkingSlots.indexOf(citizen.id));
 g.inspectAt(...g.screen(pose.x,pose.y));assert.equal(g.selected.kind,'parked');assert.equal(g.selected.id,citizen.id);
 assert(g.createTrip(citizen,'work',home.id,office.id,null,null,765));const v=g.state.vehicles.get(citizen.vehicleId);
 g.renderInspector();assert.equal(g.selected.kind,'vehicle');assert.equal(g.selected.id,v.id);assert(get('inspectContent').innerHTML.includes('ต้นทาง'));assert(get('inspectContent').innerHTML.includes('ปลายทาง'));
 assert.equal(g.vehicleTimeliness(v),'green');v.deadline=750;assert.equal(g.vehicleTimeliness(v),'orange');v.deadline=720;assert.equal(g.vehicleTimeliness(v),'orange');v.deadline=719.99;assert.equal(g.vehicleTimeliness(v),'red');
 v.deadline=null;assert.equal(g.vehicleTimeliness(v),'green');assert.equal(g.vehicleTimeliness(null),'green');
 v.deadline=740;v.arrivedAt=735;assert.equal(g.vehicleTimeliness(v,800),'green','entry stops the lateness clock');v.arrivedAt=745;assert.equal(g.vehicleTimeliness(v,800),'red');delete v.arrivedAt;v.deadline=750;
 assert(g.trackingRoute(v).length>2);assert(g.trackingOrigin(v).includes('บ้านเริ่มต้น'));assert(g.trackingDestination(v).includes('สำนักงานเริ่มต้น'));
 // Already-used parking waypoints must not be redrawn behind the car.
 v.phase='parking_in';v.lotPath=[{x:160,y:140},{x:162,y:140},{x:162,y:143}];v.lotDistance=2.5;
 const remaining=g.trackingRoute(v);assert(remaining.length>2);assert(remaining.every(p=>p.y>=140.5-1e-7));assert(Math.hypot(remaining[0].x-g.parkingPose(v).x,remaining[0].y-g.parkingPose(v).y)<1e-7);
 v.phase='departing';v.lotPath=null;v.lotDistance=0;
 const THREE=await import(pathToFileURL(path.resolve('dist/vendor/three.module.js')).href);
 const src=fs.readFileSync('dist/renderer3d.js','utf8').replace(/import \* as THREE from '[^']+';/,'').replace('export class TrafficRenderer','class TrafficRenderer');
 const {TrafficRenderer}=new Function('THREE',src+'return {TrafficRenderer};')(THREE),r=Object.create(TrafficRenderer.prototype);
 r.scene=new THREE.Scene();r.w=800;r.h=600;r.cam={z:2};r.camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,1000);r.camera.position.set(170,30,175);r.camera.lookAt(170,0,148);r.camera.updateMatrixWorld();
 r.parking={parkingIsMoving:id=>!!g.state.vehicles.get(g.state.citizens.get(id)?.vehicleId)?.lotPath,parkingSlotPose:g.parkingSlotPose,citizenCarColor:()=> '#e9e8d8'};
 r.createCars();r.cars(g.state,g.vehiclePosition,g.CATALOG,g.vehicleTimeliness,g.selected);
 assert.equal(r.carMarkerMesh.count,6,'every visible car, including parked cars');assert.equal(r.carIndicatorHits.length,6);assert(r.carSelectionFrame.visible);assert.equal(r.carSelectionFrame.material.color.getHexString(),'ffffff');
 const hit=r.carIndicatorHits.find(h=>h.selection.id===v.id&&h.selection.kind==='vehicle');assert(hit);assert.equal(r.pickVehicleMarker(hit.x,hit.y).id,v.id,'tiny icon is clickable');
 const markerSize=()=>{const m=new THREE.Matrix4();r.carMarkerMesh.getMatrixAt(0,m);const a=new THREE.Vector3(0,-1,0).applyMatrix4(m).project(r.camera),b=new THREE.Vector3(0,1,0).applyMatrix4(m).project(r.camera);return Math.abs(a.y-b.y)*r.h/2;};
 assert(Math.abs(markerSize()-16)<1e-5,'16 CSS-pixel icon');
 r.camera.left=-20;r.camera.right=20;r.camera.top=15;r.camera.bottom=-15;r.camera.updateProjectionMatrix();r.cars(g.state,g.vehiclePosition,g.CATALOG,g.vehicleTimeliness,g.selected);assert(Math.abs(markerSize()-16)<1e-5,'zoom does not enlarge indicators');
 r.cam.z=.22;r.cars(g.state,g.vehiclePosition,g.CATALOG,g.vehicleTimeliness,g.selected);assert(Math.abs(markerSize()-8)<1e-5,'icons shrink at distant zoom');r.cam.z=2;
 const iconColor=new THREE.Color();r.carMarkerMesh.getColorAt(0,iconColor);assert.equal(iconColor.getHexString(),'efa54d');
 // The default overlay contains only the selected trip, even with other traffic.
 const node=tag=>({tag,style:{},attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},append(...nodes){for(const n of nodes)this.appendChild(n);},appendChild(n){this.children=this.children.filter(x=>x!==n);this.children.push(n);},remove(){this.removed=true;}});
 let layer;context.document.createElementNS=(_,tag)=>node(tag);context.performance={now:()=>1000};get('world').insertAdjacentElement=(_,n)=>layer=n;
 assert(g.createTrip(null,'pass',null,null,g.id(155,150),g.id(190,150),null));g.updateTrackingOverlay();assert(layer);assert.equal(layer.children.length,1,'selected route only');
 const group=layer.children[0];assert(group.children.some(n=>n.tag==='text'&&n.textContent.startsWith('ต้นทาง')));assert(group.children.some(n=>n.tag==='text'&&n.textContent.startsWith('ปลายทาง')));
 assert.equal(group.children.find(n=>n.tag==='polyline').attrs.stroke,'#ffffff');
 // Selection remains on the same citizen's car when parking completes.
 g.arrive(v,true);g.renderInspector();assert.equal(g.selected.kind,'parked');assert.equal(g.selected.id,citizen.id);assert.equal(g.selected.buildingId,office.id);
 get('closeInspector').onclick();g.updateTrackingOverlay();assert.equal(layer.style.display,'none');r.cars(g.state,g.vehiclePosition,g.CATALOG,g.vehicleTimeliness,g.selected);assert(!r.carSelectionFrame.visible);
 console.log('Car UI: all visible cars have 16px icons; deadline/30-minute/arrival boundaries; parked and moving selection; white frame; selected lane/parking route and both endpoints; zoom and cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
