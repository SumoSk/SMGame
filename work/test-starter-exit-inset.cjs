require('./test-dom-compat.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot}=new Function('require',fixture+'return {boot};')(require);
for(let rotation=0;rotation<4;rotation++){
 const {game:g}=boot();g.state.money=1e8;g.state.time=720;g.state.speed=1;
 g.state.roads.clear();g.state.gates=[];g.roadChanged([]);
 const turn=(x,y)=>{for(let r=0;r<rotation;r++)[x,y]=[240-y,x];return[x,y];};
 for(const [a,b] of [[[100,100],[140,100]],[[140,100],[140,140]],[[140,140],[100,140]],[[100,140],[100,100]]])assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'small',true));
 const build=(key,x,y)=>{const corners=[[x,y],[x+2,y],[x,y+2],[x+2,y+2]].map(p=>turn(...p));return g.buildBuilding(key,Math.min(...corners.map(p=>p[0]))-([1,2].includes(rotation)?1:0),Math.min(...corners.map(p=>p[1]))-([2,3].includes(rotation)?1:0),true,rotation);};
 const home=build('home_starter',115,96),office=build('office_starter',125,96);assert(home&&office,'rotated construction '+rotation);
 // A perpendicular street immediately beside the parcel reproduces the corner case.
 const side=[turn(119,100),turn(119,90)];assert(g.buildRoad(g.lineCells(g.id(...side[0]),g.id(...side[1])),'small',true));
 function inside(v){const p=g.vehiclePosition(v);if(!p)return;const theta=Math.atan2(Math.sin(p.angle)/.78,Math.cos(p.angle));for(const a of [-.285,.285])for(const b of [-.13,.13]){
  const x=p.x+a*Math.cos(theta)-b*Math.sin(theta)-home.x-.5,y=p.y+a*Math.sin(theta)+b*Math.cos(theta)-home.y-.5;
  const [u,w]=rotation===0?[x,y]:rotation===1?[y,3-x]:rotation===2?[3-x,3-y]:[3-y,x];
  assert(u>=-1e-6&&u<=3+1e-6&&w>=-1e-6&&w<=3+1e-6,'body leaves parcel '+JSON.stringify({rotation,u,w,phase:v.phase}));
 }}
 function step(){g.state.time+=.01;g.advanceVehicles(.05,.01);for(const v of g.state.vehicles.values()){assert(!v.respawns,'no recovery');if(v.fromId===home.id&&(v.phase==='departing'||v.phase==='parking_out'&&!v.mergeCommitted))inside(v);}}
 function wait(b){for(let n=0;n<4000;n++){step();if(b.parked.size===6)return;}assert.fail('stalled '+rotation+' '+JSON.stringify([...g.state.vehicles.values()].map(v=>({phase:v.phase,reason:v.stopReason,ready:v.lotReady,d:v.lotDistance,path:v.lotPath,pose:g.vehiclePosition(v),slot:g.state.buildings.get(v.fromId)?.parkingSlots?.indexOf(v.citizenId)}))));}
 const people=[];for(let i=0;i<6;i++){const c=g.newCitizen(home);people.push(c);assert(g.createTrip(c,'moveIn',null,home.id,g.id(...turn(105,100)),null,null));}wait(home);
 for(const c of people)assert(g.createTrip(c,'work',home.id,office.id,null,null,null));
 const keys=new Set([...g.state.vehicles.values()].map(v=>v.path[0]+':'+g.dir(v.path[0],v.path[1])+':'+g.plannedLane(v,0)));
 for(const key of keys)g.state.occ.set(key,987654321);
 for(let n=0;n<350;n++)step();
 assert([...g.state.vehicles.values()].some(v=>v.phase==='parking_out'&&!v.mergeCommitted),'actually waits at gate');
 // Save/load while blocked, including migration of a pre-fix exit path.
 const saved=JSON.parse(g.snapshot());for(const [,b]of saved.buildings)if(b.id===home.id)delete b.starterExitV1;
 const old=saved.vehicles.find(([,v])=>v.phase==='parking_out');assert(old);old[1].lotPath[0]=g.lotPoint(home,2.8,2.85);
 assert(g.loadGame(true,null,JSON.stringify(saved)));assert(g.state.buildings.get(home.id).starterExitV1);assert(!g.state.vehicles.get(old[0]).lotPath,'old external corridor reset');
 g.state.speed=1;for(const key of keys)g.state.occ.delete(key);wait(g.state.buildings.get(office.id));
 for(const c of people)assert(g.createTrip(g.state.citizens.get(c.id),'home',office.id,home.id,null,null,null));
 wait(g.state.buildings.get(home.id));assert.equal(new Set(g.state.buildings.get(home.id).parkingSlots).size,6);
 console.log('PASS starter exit: rotation '+rotation+', corner, six arrivals/departures/returns, blocked road and old-save migration');
}
