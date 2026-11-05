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
  assert.match(check.error||'',/ด้านข้าง/, 'cannot draw side street for rotation '+rotation);
 }
 for(const [sx,sy]of sides){
  const env=setup(rotation),gg=env.g;
  assert.equal(gg.buildRoad([gg.id(sx,sy)],'small',true),true,'pre-existing side street');
  assert.equal(gg.buildBuilding('home_starter',x,y,true,rotation),false,'cannot put a home beside street');
 }
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
