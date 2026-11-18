'use strict';
// Exact v6.0.3 baseline spatial enumeration block; test-only source.
module.exports={
  "baselineSha256": "64170169199bccb5caed71ad1330a49ce1afbc7b390c3d233e842f3ca5cbb35c",
  "enumerationBlock": "if(!candidates){candidates=[];for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++)for(const other of trafficSpatial.cells.get(prefix+(x+dx)+':'+(y+dy))?.values()||[])if(other.id!==v.id)candidates.push(other.id);trafficSpatial.candidates.set(v.id,{key,epoch:trafficSpatial.epoch,ids:candidates});}"
};
