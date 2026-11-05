const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot}=new Function('require',fixture+'return {boot};')(require);
function setup(rotation){
 const {game:g}=boot();g.state.money=1e9;g.state.roads.clear();g.state.buildings.clear();g.state.buildGrid.fill(-1);g.state.gates=[];g.roadChanged([]);
 const t=g.CATALOG.home_starter,w=rotation%2?t.plotHeight:t.plotWidth,h=rotation%2?t.plotWidth:t.plotHeight;
 const vertical=rotation%2===1;
 const road=vertical?g.lineCells(g.id(100,60),g.id(100,150)):g.lineCells(g.id(60,100),g.id(150,100));
 assert.equal(g.buildRoad(road,'small',true),true,'front street');
 const [x,y]=rotation===0?[90,99-h]:rotation===1?[101,90]:rotation===2?[90,101]:[99-w,90];
 const sides=vertical?[[x+Math.floor(w/2),y-1],[x+Math.floor(w/2),y+h+1]]:[[x-1,y+Math.floor(h/2)],[x+w+1,y+Math.floor(h/2)]];
 return{g,x,y,rotation,sides};
}
for(let rotation=0;rotation<4;rotation++){
 const {g,x,y,sides}=setup(rotation);
 const house=g.buildBuilding('home_starter',x,y,true,rotation);
 assert(house,'front-road access remains legal for rotation '+rotation);
 assert(house.access.length>=2,'driveway accessible');
 for(const [sx,sy]of sides){
  const check=g.checkRoad([g.id(sx,sy)],'small');
  assert.match(check.error||'',/เว้นระยะจากบ้าน 1 ช่อง/, 'cannot draw side street for rotation '+rotation);
 }
 for(const [sx,sy]of sides){
  const env=setup(rotation),gg=env.g;
  assert.equal(gg.buildRoad([gg.id(sx,sy)],'small',true),true,'pre-existing side street');
  assert.equal(gg.buildBuilding('home_starter',x,y,true,rotation),false,'cannot put a home beside street');
 }
}
// The displayed asphalt is wider than the integer route-tile occupancy for
// small/large roads. Every road size must preserve a FULL empty grid tile.
for(let rotation=0;rotation<4;rotation++)for(const side of [-1,1])for(const type of ['small','medium','large']){
 const {g,x,y}=setup(rotation),house=g.buildBuilding('home_starter',x,y,true,rotation);
 assert(house,'existing house');
 const {w,h}=g.buildingBounds(house),radius=g.ROADS[type].visualWidth/2;
 const near=Math.ceil(radius+.5)-1,far=Math.ceil(radius+.5),axis=rotation%2===1?'y':'x';
 const base=axis==='y'?(side<0?y-1:y+h):(side<0?x-1:x+w);
 const center=(step)=>base+side*step;
 const along=axis==='y'?x+Math.floor(w/2):y+Math.floor(h/2);
 const node=(step)=>axis==='y'?g.id(along,center(step)):g.id(center(step),along);
 assert.match(g.checkRoad([node(near)],type).error||'',/เว้นระยะจากบ้าน 1 ช่อง/,'side road must be rejected with visible pavement: '+type+', rotation '+rotation+', side '+side);
 assert.equal(g.buildRoad([node(near)],type,true),false,'blocked side road was built');
 assert.equal(g.checkRoad([node(far)],type).error,undefined,'one FULL empty tile must allow '+type+', rotation '+rotation+', side '+side);
 assert.equal(g.buildRoad([node(far)],type,true),true,'road built with a full empty side tile');
 const env=setup(rotation),gg=env.g;
 assert.equal(gg.buildRoad([node(near)],type,true),true,'side road may predate home');
 assert.equal(gg.buildBuilding('home_starter',x,y,true,rotation),false,'cannot place home beside '+type+' pavement');
 const ok=setup(rotation),gok=ok.g;
 assert.equal(gok.buildRoad([node(far)],type,true),true,'road at safe boundary');
 assert(gok.buildBuilding('home_starter',x,y,true,rotation),'home permitted with full empty side tile');
}
// Upgrading a formerly safe narrow road can consume the home setback.
for(let rotation=0;rotation<4;rotation++)for(const side of [-1,1]){
 const {g,x,y}=setup(rotation),home=g.buildBuilding('home_starter',x,y,true,rotation);assert(home);
 const {w,h}=g.buildingBounds(home),offset=side<0?-3:3;
 const node=rotation%2?g.id(x+Math.floor(w/2),side<0?y+offset:y+h-1+offset):g.id(side<0?x+offset:x+w-1+offset,y+Math.floor(h/2));
 assert.equal(g.buildRoad([node],'small',true),true,'narrow road starts outside setback');
 assert.match(g.checkRoad([node],'large').error||'',/เว้นระยะจากบ้าน 1 ช่อง/,'widening to large violates side setback');
}

{
 const {g,x,y}=setup(0),house=g.buildBuilding('home_starter',x,y,true,0);
 assert(house);
 const nx=125,ny=y;
 assert.equal(g.buildRoad([g.id(nx-1,ny+1)],'small',true),true);
 assert.equal(g.moveBuilding(house.id,nx,ny,true,0),false,'moving a home beside a street must fail');
 assert.equal(house.x,x);assert.equal(house.y,y);
}
console.log('PASS: 5.4.10 four rotations, both sides, front entrance, reverse placement and moving');
