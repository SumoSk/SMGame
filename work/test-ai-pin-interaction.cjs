const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0].replace('return{game,get};','return{game,get,context};');
const {game,get,context}=new Function('require',src+'return boot();')(require);
let overlay=null,clock=Date.now();
context.Date=class extends Date{static now(){return clock;}};
const oldGet=context.document.getElementById;
context.document.getElementById=id=>id==='aiJunctionOverlay'?overlay:oldGet(id);
const make=tag=>({
 tagName:tag.toUpperCase(),style:{setProperty(k,v){this[k]=v;}},dataset:{},hidden:false,textContent:'',innerHTML:'',attributes:{},parts:new Map(),children:[],
 classList:{toggle(k,v){this[k]=v;}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){},
 querySelector(key){if(!this.parts.has(key))this.parts.set(key,make('button'));return this.parts.get(key);},
 appendChild(child){this.children.push(child);},remove(){this.removed=true;},focus(){this.focused=true;},
 setPointerCapture(){this.captured=true;}
});
context.document.createElement=make;
context.document.body={appendChild(element){overlay=element;}};
assert.equal(game.aiPinsVisible,false,'new sessions keep AI overlay hidden by default');
game.toggleAIPinLabels();
assert(overlay&&!overlay.hidden,'AI toggle reveals compact map buttons');
const at=game.id(150,150),pin=overlay.children.find(e=>+e.dataset.node===at);
assert(pin,'junction has a compact AI button');
assert.equal(pin.textContent,'AI +');
assert.equal(pin.attributes['aria-expanded'],'false');
const firstX=pin.style.left,firstY=pin.style.top;
pin.onpointerenter();game.cam.x+=15;clock+=200;game.updateAISignalPins();
assert.equal(pin.style.left,firstX,'badge stays stable during pointer interaction');assert.equal(pin.style.top,firstY);
pin.onpointerleave();game.cam.x-=15;clock+=200;game.updateAISignalPins();
const evt={pointerId:7,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
pin.onpointerdown(evt);pin.onpointerup(evt);pin.onclick(evt);
const card=overlay.children.find(e=>e.id==='aiPinPopover');
assert(pin.captured);assert(card&&!card.hidden,'first tap expands a local card');
assert.equal(pin.attributes['aria-expanded'],'true');assert.equal(game.state.money,500000);
assert.match(card.innerHTML,/ปรับไฟอัตโนมัติตามคิวรถ/);
assert.equal(get('dialog').open,undefined,'expanding never opens checkout');
clock+=700;pin.onclick(evt);assert(card.hidden,'second tap collapses');
clock+=700;pin.onclick(evt);card.querySelector('[data-ai-close]').onclick();assert(card.hidden,'minus button collapses');
clock+=700;pin.onclick(evt);card.querySelector('[data-ai-upgrade]').onclick();
assert(card.hidden);assert.match(get('dialogContent').innerHTML,/id="confirmDialog".*disabled/,'insufficient funds block installation');get('cancelDialog').onclick();
game.state.money=2000000;clock+=700;pin.onclick(evt);card.querySelector('[data-ai-upgrade]').onclick();
assert.equal(game.state.money,2000000,'money changes only after explicit confirmation');
get('confirmDialog').onclick();assert.equal(game.state.money,1000000);assert.equal(game.state.signals.get(at).mode,'smart');
clock+=700;game.updateAISignalPins();assert.equal(pin.textContent,'AI ✓');
pin.onclick(evt);card.querySelector('[data-ai-upgrade]').onclick();assert.equal(game.state.money,1000000,'view owned AI never charges twice');
clock+=700;pin.onclick(evt);game.toggleAIPinLabels();assert(card.hidden&&overlay.hidden,'hiding overlay also collapses details');
assert.equal(game.state.signals.get(at).mode,'smart','hiding controls leaves paid AI operational');
console.log('PASS: AI compact badges, default hidden, stable touch target, local expand/collapse, explicit checkout, insufficient funds, single charge, owned state and hide/show');
