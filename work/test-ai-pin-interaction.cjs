const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0].replace('return{game,get};','return{game,get,context};');
const {game,get,context}=new Function('require',src+'return boot();')(require);
const at=game.id(150,150);
let overlay=null,clock=Date.now(),calls=0;
context.Date=class extends Date{static now(){return clock;}};
const oldGet=context.document.getElementById;
context.document.getElementById=id=>id==='aiJunctionOverlay'?overlay:oldGet(id);
const make=tag=>({
 tagName:tag.toUpperCase(),style:{},dataset:{},hidden:false,textContent:'',
 children:[],classList:{toggle(k,v){this[k]=v;}},setAttribute(){},
 appendChild(child){this.children.push(child);},remove(){this.removed=true;},
 setPointerCapture(){this.captured=true;}
});
context.document.createElement=make;
context.document.body={appendChild(element){overlay=element;}};
const buttonAI=get('toggleAIPins');
assert.equal(typeof buttonAI.onclick,'function','new toggle is wired');
assert.equal(game.aiPinsVisible,true,'AI badges shown by default');
game.updateAISignalPins();
assert(overlay,'AI overlay created');
const pin=overlay.children.find(e=>+e.dataset.node===at);
assert(pin,'center junction has AI pin');
assert.equal(typeof pin.onpointerdown,'function');
assert.equal(typeof pin.onpointerup,'function');
assert.equal(typeof pin.onclick,'function');
assert.equal(pin.classList.owned,false);
const firstX=pin.style.left,firstY=pin.style.top;
pin.onpointerenter();
game.cam.x+=15;
clock+=200;
game.updateAISignalPins();
assert.equal(pin.style.left,firstX,'AI pin stays still while hovering');
assert.equal(pin.style.top,firstY,'AI pin does not dodge clicks');
pin.onpointerleave();
game.cam.x-=15;
clock+=200;game.updateAISignalPins();

const evt={pointerId:7,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
pin.onpointerdown(evt);
assert.equal(pin.captured,true,'touch pointer captured while pressing');
pin.onpointerup(evt);
assert.match(get('dialogContent').innerHTML,/จ่าย 1,000,000 บาท เพื่ออัปเกรดแยกนี้เป็น AI ใช่หรือไม่/,'explicit buy confirmation');
assert.match(get('dialogContent').innerHTML,/id="cancelDialog">ไม่ใช่/);
assert.match(get('dialogContent').innerHTML,/id="confirmDialog".*disabled/,'not enough cash blocks confirmation');
assert.equal(game.state.money,500000,'opening purchase question does not charge');
get('cancelDialog').onclick();
assert.equal(game.state.money,500000,'No leaves money unchanged');

game.state.money=2000000;
clock+=700;
pin.onclick(evt);
assert.match(get('dialogContent').innerHTML,/id="confirmDialog" class="primary" >ใช่/,'yes enabled when affordable');
assert.equal(game.state.money,2000000,'not charged until Yes');
get('cancelDialog').onclick();
assert.equal(game.state.money,2000000,'cancellation never charges');

clock+=700;
pin.onpointerdown(evt);
pin.onpointerup(evt);
pin.onclick(evt); // Synthesized click after pointerup is ignored; no duplicated purchase.
assert.equal(game.state.money,2000000);
get('confirmDialog').onclick();
assert.equal(game.state.money,1000000,'yes charges once');
assert.equal(game.state.signals.get(at).mode,'smart');

clock+=200;game.updateAISignalPins();
assert.equal(pin.classList.owned,true,'AI pin switches to blue owned state');
assert.match(pin.textContent,/✓/);
buttonAI.onclick();
assert.equal(game.aiPinsVisible,false,'hide button hides only AI labels');
assert.equal(overlay.hidden,true);
assert.equal(game.state.signals.get(at).mode,'smart','hide pin does not disable purchased AI');
buttonAI.onclick();
assert.equal(game.aiPinsVisible,true);
assert.equal(overlay.hidden,false);
assert.equal(get('toggleAIPinsText').textContent,'ปิด AI');

clock+=700;
pin.onclick(evt);
assert.equal(game.state.money,1000000,'tapping owned junction never recharges');
const root=fs.readFileSync('index.html','utf8'),dist=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
for(const [name,html]of [['root',root],['dist',dist]]){
 assert.match(html,/id="toggleCarDiamonds".*id="toggleAIPins".*id="toggleEyeComfort"/,name+' AI visibility toggle near marker and theme');
}
assert.match(css,/\.ai-junction-overlay\{[^}]*z-index:21/,'AI overlay on top of map HUD');
assert(!css.includes('scale:1.12;'),'hover cannot resize or move AI pin');
console.log('AI click regression: stable hover and touch, pointer capture, yes/no confirmation, no double charges, owned state, hide/show pins and paid AI persists');
