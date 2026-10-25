// Shared browser API defaults for older VM fixtures; never loaded by the game.
const vm=require('node:vm'),run=vm.runInContext;
vm.runInContext=function(code,context,...args){
 const doc=context.document;
 if(doc&&!doc.__smcityDomCompat){
  doc.addEventListener??=()=>{};
  for(const key of ['getElementById','querySelector']){
   const get=doc[key];if(get)doc[key]=function(...args){const el=get.apply(this,args);if(el)el.setAttribute??=()=>{};return el;};
  }
  doc.__smcityDomCompat=true;
 }
 return run.call(this,code,context,...args);
};
