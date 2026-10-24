const fs=require('node:fs'),assert=require('node:assert/strict');const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];const {boot}=new Function('require',fixture+'return {boot};')(require);
for(const vertical of[false,true]){
 const {game:g}=boot();g.state.money=1e8;g.state.roads.clear();g.state.gates=[];g.roadChanged([]);
 const a=vertical?[100,70]:[70,100],b=vertical?[100,130]:[130,100];assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'small',true));
 assert.equal(g.ROADS.small.visualWidth,g.ROADS.medium.visualWidth/2);
 assert.equal(g.state.footprint[g.id(vertical?99:90,vertical?90:99)],g.id(vertical?100:90,vertical?90:100),'reserve the negative side of the real carriageway');
 assert.equal(g.state.footprint[g.id(vertical?100:90,vertical?90:100)],g.id(vertical?100:90,vertical?90:100));
 const t=g.CATALOG.restaurant_small,W=t.plotWidth,H=t.plotHeight;
 const bad=vertical?{x:100-H,y:85}:{x:85,y:100-H};
 const check=g.checkBuilding('restaurant_small',bad.x,bad.y);assert(check.error,'a plot that ends on the road centerline must be rejected');
 const sites=vertical?[[99-H,85],[101,85]]:[[85,99-H],[85,101]];
 for(const [x,y]of sites){const result=g.checkBuilding('restaurant_small',x,y);assert(!result.error,JSON.stringify({vertical,x,y,error:result.error}));const building=g.buildBuilding('restaurant_small',x,y,true);assert(building);const bounds=g.buildingBounds(building);
  const edge=g.ROADS.small.visualWidth/2+.14;
  if(vertical)assert(x+bounds.w<=100-edge||x>=100+edge);else assert(y+bounds.h<=100-edge||y>=100+edge);
 }
 // The reverse operation must also refuse to draw the road under a plot.
 const empty=vertical?g.id(105,90):g.id(90,105);g.state.buildGrid[empty]=999;
 const overlap=vertical?g.id(106,90):g.id(90,106);assert(g.checkRoad([overlap],'small').error);
 g.state.buildGrid[empty]=-1;
 const saved=g.snapshot();assert(g.loadGame(true,null,saved));assert(g.state.footprint[g.id(vertical?99:90,vertical?90:99)]>=0,'rebuild the same clearance when loading a save');
}
console.log(JSON.stringify({passed:true,orientations:2,sides:4,halfVisualWidth:true,noHalfGridOverlap:true,roadAndBuildingValidation:true}));
