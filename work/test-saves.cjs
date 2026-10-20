const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8'),storage={};let blocked=false;
const noop=()=>{};
function boot(){let game;const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,focus:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});return nodes.get(id);};
 const context={document:{getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{if(blocked)throw Error('QuotaExceeded');storage[k]=v;}},console:{error:noop,log:noop}};
 vm.createContext(context);vm.runInContext(source,context);return {game,get};
}
let {game,get}=boot();
const legacy=game.snapshot();storage['traffic-fixer-thailand-v1']=legacy;
assert.equal(game.readSaveSlots()[0].name,'เซฟเดิม');
game.state.money=123456;assert(game.saveGame(true,'เมืองหนึ่ง','one'));
game.reset('bangkok');game.state.money=234567;assert(game.saveGame(true,'เมืองสอง','two'));
({game,get}=boot());assert(game.loadGame(true,'one'));assert.equal(game.state.money,123456);assert.equal(game.state.city,'phuket');
assert(game.loadGame(true,'two'));assert.equal(game.state.money,234567);assert.equal(game.state.city,'bangkok');
assert(game.loadGame(true,'legacy'));assert.equal(game.state.money,500000);
game.state.money=345678;assert(game.saveGame(true,'เมืองหนึ่ง','one'));assert(game.loadGame(true,'two'));assert.equal(game.state.money,234567);assert(game.loadGame(true,'one'));assert.equal(game.state.money,345678);assert.equal(game.readSaveSlots().length,3);
const saved=storage['traffic-fixer-thailand-saves-v2'];blocked=true;assert.equal(game.saveGame(true,'เขียนไม่สำเร็จ','one'),false);assert.equal(storage['traffic-fixer-thailand-saves-v2'],saved);blocked=false;
let collection=JSON.parse(saved);collection.slots.push({id:'broken',name:'เสีย',data:'{"format":1}'});storage['traffic-fixer-thailand-saves-v2']=JSON.stringify(collection);const previous=game.state;assert.equal(game.loadGame(true,'broken'),false);assert.equal(game.state,previous);assert.equal(game.state.money,345678);storage['traffic-fixer-thailand-saves-v2']=saved;
// Exercise the actual menu handlers, escaping names and creating a distinct slot.
get('menu').onclick();get('saveMenu').onclick();get('saveName').value='<img src=x onerror=alert(1)>';get('createSave').onclick();assert.equal(game.readSaveSlots().length,4);
get('menu').onclick();get('loadMenu').onclick();assert(get('dialogContent').innerHTML.includes('&lt;img'));assert(!get('dialogContent').innerHTML.includes('<img'));
const index=game.readSaveSlots().findIndex(s=>s.id==='two');get('slotAction'+index).onclick();get('confirmDialog').onclick();assert.equal(game.state.city,'bangkok');assert.equal(game.state.money,234567);
assert.equal(storage['traffic-fixer-thailand-v1'],legacy);
console.log(JSON.stringify({passed:true,coverage:['named slots survive fresh game instance','selected save loads exact city and money','overwrite preserves other slots','legacy save retained','storage failure preserves saves','invalid save preserves active city','menu save and load handlers','HTML escaping']}));
