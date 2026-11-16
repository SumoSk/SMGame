'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sourcePath=process.env.SMCITY_SOURCE||path.join(__dirname,'../../dist/game.js');
function boot(extraExports=''){
 let game;const noop=()=>{},storage={},elements=new Map();
 function element(){const el={textContent:'',innerHTML:'',value:'',style:{setProperty:noop,removeProperty:noop},dataset:{},children:[],hidden:false,open:false,offsetWidth:0,offsetHeight:0,scrollHeight:0,classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,removeEventListener:noop,setAttribute:noop,getAttribute:()=>null,removeAttribute:noop,append:noop,appendChild:noop,prepend:noop,before:noop,after:noop,remove:noop,replaceChildren:noop,querySelector:()=>element(),querySelectorAll:()=>[],contains:()=>false,focus:noop,showModal(){this.open=true;},close(){this.open=false;},getBoundingClientRect:()=>({left:0,top:0,width:1440,height:900,right:1440,bottom:900}),getContext:()=>new Proxy({measureText:()=>({width:0}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop}),setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>false};return el;}
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const document={getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[],createElement:element,createElementNS:element,addEventListener:noop,removeEventListener:noop,documentElement:element(),body:element(),activeElement:null};
 const context={document,window:{addEventListener:noop,removeEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,cancelAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},console,performance:{now:()=>0},URL,Blob,TextEncoder,TextDecoder};
 context.window.window=context.window;vm.createContext(context);
 let source=fs.readFileSync(sourcePath,'utf8');
 if(extraExports)source=source.replace('({creatorMetrics,','({'+extraExports+',creatorMetrics,');
 vm.runInContext(source,context,{filename:sourcePath,timeout:30000});
 return {game,context,get,storage,sourcePath};
}
module.exports={boot,sourcePath};
if(require.main===module){const {game}=boot();console.log(JSON.stringify({booted:true,roads:game.state.roads.size,time:game.state.time,exports:Object.keys(game).length}));}
