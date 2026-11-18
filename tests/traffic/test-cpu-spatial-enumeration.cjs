'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {enumerationBlock:before}=require('./oracles/v603-spatial-oracle.cjs');
const sourcePath=process.env.SMCITY_SOURCE||path.resolve(__dirname,'../../dist/game.js');
const source=fs.readFileSync(sourcePath,'utf8');
function loop(source){
 const at=source.indexOf('function computePhysicalTrafficLimit(');
 assert(at>=0,'runtime physical traffic function is present');
 const start=source.indexOf('if(!candidates){',at);
 const end=source.indexOf('\n if(!candidates.length)return Infinity;',start);
 assert(start>=at&&end>start,'runtime spatial enumeration boundaries are present');
 return source.slice(start,end);
}
// The integrated runtime contains several independent changes. Extract only
// this enumeration block; compare it to the frozen minimal baseline oracle.
const after=loop(source);
const compile=body=>new Function('trafficSpatial','v','prefix','x','y','radius','key','let candidates=null;'+body+';return candidates;');
const old=compile(before),current=compile(after);
let seed=0x603ab19a;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
let cases=0,ids=0;
for(let k=0;k<3000;k++){
 const cells=new Map(),prefix=k%2?'air:':'ground:',x=Math.floor(random()*12)-6,y=Math.floor(random()*12)-6,radius=k%6,self={id:k%19},epoch=k%23;
 for(let n=0;n<130;n++){
  const a=x+Math.floor(random()*15)-7,b=y+Math.floor(random()*15)-7,key=(n%7===0?'other:':prefix)+a+':'+b;
  let cell=cells.get(key);if(!cell){cell=new Map();cells.set(key,cell);}
  if(n%9)cell.set(n,{id:n%31});
 }
 const a={cells,candidates:new Map(),epoch},b={cells,candidates:new Map(),epoch},args=[self,prefix,x,y,radius,'query-'+k];
 const expected=old(a,...args),actual=current(b,...args);
 assert.deepEqual(actual,expected,'candidate selection and first-blocker order '+k);
 assert.deepEqual(b.candidates.get(self.id),a.candidates.get(self.id),'memo payload '+k);
 ids+=actual.length;cases++;
 // Re-enumerate live cells after insertion, removal, replacement and movement.
 // This tests the enumeration itself; runtime cache validity remains unchanged.
 if(k%3===0){
  const key=prefix+x+':'+y;
  cells.set(key,new Map([[500,{id:700}],[501,{id:self.id}],[502,{id:701}]]));
  cells.delete(prefix+(x-1)+':'+y);
  assert.deepEqual(current(b,...args),old(a,...args),'mutated cell selection/order '+k);
  assert.deepEqual(b.candidates.get(self.id),a.candidates.get(self.id),'mutated memo payload '+k);
  cases++;
 }
}
console.log(JSON.stringify({passed:true,source:sourcePath,cases,candidateIdsCompared:ids,
 oracle:'Exact v6.0.3 baseline enumeration block, including candidate order and memo payload',
 scope:'Absent-cell allocation only; no whole-file equality requirement and no wall-clock benchmark.'},null,2));
