const fs=require('node:fs'),assert=require('node:assert/strict');
const boot=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',boot+';return boot();')(require);
const t=g.CATALOG.home_grand,building={key:'home_grand',x:30,y:40,rotation:0};
const rects=g.parkingVisuals(building);
const paints=rects.filter(r=>r.color==='#e9e6cc');
const fill=rects.filter(r=>r.color==='#58666a');
const asphalt=rects.filter(r=>r.color==='#515f62');
assert.equal(asphalt.length,2,'never change native double-bank parking materials');
assert(paints.length>=180,'preserve the original compact parking stripes');
const spines=fill.filter(r=>(Math.abs(r.u-.45)<.01||Math.abs(r.u-(t.plotWidth-.45))<.01)&&r.h>4&&r.w>.65);
assert.equal(spines.length,2,'one entrance side-drive and one exit side-drive');
for(const r of spines)assert(r.v+r.h/2<=t.frontageV+.06,'old long side driveway must end at the internal frontage, not extend toward city road');
const redundant=rects.filter(r=>r.color==='#bbc9b9'&&(Math.abs(r.u-.45)<.01||Math.abs(r.u-(t.plotWidth-.45))<.01)&&r.h>3&&r.w<.05);
assert.equal(redundant.length,0,'remove the obsolete full-length white center stripe on side roads');
const gates=fill.filter(r=>r.v+r.h/2>t.plotHeight-.1);
assert.equal(gates.length,2,'only the two actual centered city-road gates may reach the plot front');
assert.deepEqual([...gates].map(r=>r.u).sort((a,b)=>a-b),[t.frontageEntranceU,t.frontageExitU]);
const asphaltAt=(u,v)=>fill.some(r=>u>=r.u-r.w/2-.02&&u<=r.u+r.w/2+.02&&v>=r.v-r.h/2-.02&&v<=r.v+r.h/2+.02);
for(const [u,v] of [
 [t.frontageEntranceU,12.85],[t.frontageEntranceU,t.frontageV],[1.5,t.frontageV],
 [.45,t.frontageV],[.45,8],[.45,t.parkingAisle],
 [t.plotWidth-.45,t.parkingAisle],[t.plotWidth-.45,8],
 [t.plotWidth-.45,t.frontageV],[9.2,t.frontageV],[t.frontageExitU,t.frontageV],[t.frontageExitU,12.85]
 ])assert(asphaltAt(u,v),'visible road must cover the car route at '+u+','+v);
for(const r of fill)assert(r.v-r.h/2>=-.01&&r.v+r.h/2<=t.plotHeight+.015,'all driveway asphalt remains in owned plot');
for(let rotation=0;rotation<4;rotation++){
 const b={...building,rotation},bounds=g.buildingBounds(b);
 for(const r of fill){
  for(const [u,v] of [[r.u-r.w/2,r.v-r.h/2],[r.u+r.w/2,r.v+r.h/2]]){
   const p=g.lotPoint(b,u,v);
   assert(p.x>=b.x+.45&&p.x<=b.x+bounds.w+.55&&p.y>=b.y+.45&&p.y<=b.y+bounds.h+.55,
    'road surface must stay inside the lotPoint local plot frame in rotation '+rotation);
  }
 }
}
console.log(JSON.stringify({passed:true,oldStreetSpursRemoved:true,sideSpines:spines.length,centeredGates:gates.length,paintStripes:paints.length,rotations:4,trafficPathsMatched:true}));
