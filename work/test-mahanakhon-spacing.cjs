'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g}=new Function('require',fixture+';return boot();')(require);
g.state.money=1e9;g.state.buildingQuota.home_mahanakhon=1;
const t=g.CATALOG.home_mahanakhon;
const b=g.buildBuilding(t.key,160,148-t.plotHeight,true);
assert(b);assert.equal(t.parkingCapacity,80);
const slots=g.lotSlots(b);
assert.equal(slots.length,80);assert.deepEqual([t.plotWidth,t.plotHeight],[14,8]);
for(let i=0;i<80;i++)for(let j=i+1;j<80;j++)
 assert(!g.lotCarsOverlap(g.parkingSlotPose(b,i),g.parkingSlotPose(b,j),.06),
  'car bodies must be separated, bays '+i+' and '+j);
console.log(JSON.stringify({passed:true,cars:80,plot:[14,8],pitch:t.parkingPitch,spacingVerified:true}));
