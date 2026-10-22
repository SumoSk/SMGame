const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const noop=()=>{}, elements=new Map(), nodes=[];
function makeNode(tag='div'){
 const classes=new Set(), children=[];
 const n={
  tagName:tag, className:'', textContent:'', hidden:false, style:{}, dataset:{}, title:'',
  children, parentNode:null, onclick:null, attrs:{},
  classList:{
   add(key){classes.add(key);},remove(key){classes.delete(key);},
   toggle(key,on){const next=on??!classes.has(key);if(next)classes.add(key);else classes.delete(key);return next;},
   contains(key){return classes.has(key);}
  },
  setAttribute(k,v){this.attrs[k]=v;},
  getAttribute(k){return this.attrs[k];},
  append(...items){for(const el of items){children.push(el);el.parentNode=this;}},
  replaceChildren(...items){for(const el of children)el.parentNode=null;children.splice(0);this.append(...items);},
  remove(){if(this.parentNode){const siblings=this.parentNode.children;const index=siblings.indexOf(this);if(index>=0)siblings.splice(index,1);this.parentNode=null;}},
  querySelectorAll(sel){return children.filter(el=>sel==='.place-building-label'&&el.className==='place-building-label');},
  addEventListener:noop,
  showModal(){this.open=true;},close(){this.open=false;},
  getContext(){return new Proxy({}, {get:()=>noop});},
  setPointerCapture:noop,hasPointerCapture:()=>false,releasePointerCapture:noop,
  insertAdjacentElement(which,el){nodes.push(el);}
 };
 return n;
}
const get=id=>{if(!elements.has(id))elements.set(id,makeNode());return elements.get(id);};
const document={
 getElementById:get,createElement:makeNode,
 querySelector:()=>makeNode(),querySelectorAll:()=>[],
 documentElement:makeNode('html')
};
let game;
const context={
 document,window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__(data){game=data;}},
 innerWidth:1024,innerHeight:768,devicePixelRatio:1,
 requestAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,
 localStorage:{setItem:noop,getItem:()=>null},console
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);

const button=get('toggleBuildingLabels'),caption=get('toggleBuildingLabelsText');
assert.equal(typeof button.onclick,'function','Toggle must be bound as a real click handler');
const city=game.state;
city.buildings.set(93939,{
 id:93939,key:'home_small',x:150,y:150,rotation:0,
 parked:new Set(),visitors:new Set(),queue:[],access:[1]
});
game.updatePlaceLabels();
const overlay=nodes.find(n=>n.id==='buildingLabels');
assert.ok(overlay,'Building overlay should be constructed');
const count=()=>overlay.children.filter(n=>n.className==='place-building-label').length;
assert.equal(count(),1,'A building must show its name/count overlay when enabled');
const warning=makeNode();warning.className='route-warning';overlay.append(warning);
button.onclick();
assert.equal(caption.textContent,'เปิดป้าย','Button changes to show when labels are hidden');
assert.equal(button.getAttribute('aria-pressed'),'true','Toggle is marked pressed when hidden');
assert.equal(count(),0,'A click physically removes the building-label node');
assert.equal(overlay.children.includes(warning),true,'No-route warning is retained');
game.updatePlaceLabels();
assert.equal(count(),0,'Render loop may not restore labels when hidden');
button.onclick();
assert.equal(caption.textContent,'ปิดป้าย','Button changes back to hide when shown');
assert.equal(button.getAttribute('aria-pressed'),'false');
assert.equal(count(),1,'Next click regenerates the building-label DOM nodes');
console.log('Building-label toggle: DOM nodes removed and restored; warning retained.');
