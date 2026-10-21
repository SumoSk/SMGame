const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8'),storage={};let blocked=false;
const noop=()=>{};
function boot(indexedDB){let game;const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,focus:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});return nodes.get(id);};
 const context={indexedDB,document:{getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{if(blocked)throw Error('QuotaExceeded');storage[k]=v;}},console:{error:noop,warn:noop,log:noop}};
 vm.createContext(context);vm.runInContext(source,context);return {game,get,clientWindow:context.window};
}
(async()=>{
let {game,get,clientWindow}=boot();
const legacy=game.snapshot();storage['traffic-fixer-thailand-v1']=legacy;
assert.equal(game.readSaveSlots()[0].name,'เซฟเดิม');
game.state.money=123456;assert(game.saveGame(true,'เมืองหนึ่ง','one'));
game.reset('bangkok');game.state.money=234567;assert(game.saveGame(true,'เมืองสอง','two'));
({game,get,clientWindow}=boot());assert(game.loadGame(true,'one'));assert.equal(game.state.money,123456);assert.equal(game.state.city,'phuket');
assert(game.loadGame(true,'two'));assert.equal(game.state.money,234567);assert.equal(game.state.city,'bangkok');
assert(game.loadGame(true,'legacy'));assert.equal(game.state.money,500000);
game.state.money=345678;assert(game.saveGame(true,'เมืองหนึ่ง','one'));assert(game.loadGame(true,'two'));assert.equal(game.state.money,234567);assert(game.loadGame(true,'one'));assert.equal(game.state.money,345678);assert.equal(game.readSaveSlots().length,3);
const saved=storage['traffic-fixer-thailand-saves-v2'];blocked=true;assert.equal(game.saveGame(true,'เขียนไม่สำเร็จ','one'),false);assert.equal(storage['traffic-fixer-thailand-saves-v2'],saved);blocked=false;
let collection=JSON.parse(saved);collection.slots.push({id:'broken',name:'เสีย',data:'{"format":1}'});storage['traffic-fixer-thailand-saves-v2']=JSON.stringify(collection);const previous=game.state;assert.equal(game.loadGame(true,'broken'),false);assert.equal(game.state,previous);assert.equal(game.state.money,345678);storage['traffic-fixer-thailand-saves-v2']=saved;
// Legacy storage remains intact for old saves, but the visible menu is cloud-only.
const cloudSlot={id:'cloud-demo',name:'<img src=x onerror=alert(1)>',savedAt:Date.now(),data:game.snapshot()};
let deleted=false,changedPassword=false,savedCloud=false;
clientWindow.SMGameAccount={
 user:{id:'test-user',email:'test@example.com'},
 async listSaves(){return deleted?[]:[cloudSlot];},
 async save(){savedCloud=true;},
 async deleteSave(id){if(id!==cloudSlot.id)throw Error('wrong slot');deleted=true;},
 async changePassword(){changedPassword=true;},
 async signOut(){},
};
get('menu').onclick();
assert(get('dialogContent').innerHTML.includes('id="accountMenu"'));
assert(get('dialogContent').innerHTML.includes('id="saveMenu"'));
assert(!get('dialogContent').innerHTML.includes('id="loadMenu"'));
await get('saveMenu').onclick();
assert(get('dialogContent').innerHTML.includes('&lt;img'));
assert(!get('dialogContent').innerHTML.includes('<img src='));
assert(get('dialogContent').innerHTML.includes('id="onlineDelete0"'));
get('onlineDelete0').onclick();
assert.equal(deleted,false,'delete must await confirmation');
get('confirmDialog').onclick();
for(let i=0;i<12;i++)await Promise.resolve();
assert.equal(deleted,true);
get('menu').onclick();
get('accountMenu').onclick();
get('accountOldPassword').value='old-password';
get('accountNewPassword').value='new-password-123';
get('accountConfirmPassword').value='new-password-123';
await get('accountChangePassword').onclick();
assert(changedPassword);
await get('saveMenu').onclick();
get('onlineSaveName').value='เกมใหม่';
await get('onlineCreate').onclick();
assert(savedCloud);
assert.equal(game.readSaveSlots().length,3,'cloud UI must not write local save collection');
assert.equal(storage['traffic-fixer-thailand-v1'],legacy);
console.log(JSON.stringify({passed:true,coverage:['named slots survive fresh game instance','selected save loads exact city and money','overwrite preserves other slots','legacy save retained','storage failure preserves saves','invalid save preserves active city','cloud-only menu with save/delete','password update','HTML escaping']}));

// A transaction model checks that success waits for commit and survives a new game instance.
const records=new Map();let abortWrite=false;
const fakeDB={objectStoreNames:{contains:()=>true},transaction(_name,mode){const tx={error:null,objectStore(){return {put(record){const request={};setTimeout(()=>{if(abortWrite){tx.error={name:'QuotaExceededError',message:'test quota'};tx.onabort?.();return;}records.set(record.id,structuredClone(record));request.result=record.id;request.onsuccess?.();tx.oncomplete?.();},0);return request;},getAll(){const request={};setTimeout(()=>{request.result=[...records.values()].map(r=>structuredClone(r));request.onsuccess?.();tx.oncomplete?.();},0);return request;}};}};return tx;}};
const fakeIDB={open(){const request={};setTimeout(()=>{request.result=fakeDB;request.onsuccess();},0);return request;}};
({game,get}=boot(fakeIDB));await game.readDurableSaveSlots();blocked=true;
game.state.money=456789;game.state.events=[{payload:'x'.repeat(6*1024*1024)}];
await game.saveDurableGame('เมืองใหญ่','big');assert(records.get('big').data.length>6*1024*1024);
({game,get}=boot(fakeIDB));await game.readDurableSaveSlots();assert(game.loadGame(true,'big'));assert.equal(game.state.money,456789);
const prior=records.get('big').data;abortWrite=true;await assert.rejects(()=>game.saveDurableGame('เมืองใหญ่','big'));assert.equal(records.get('big').data,prior);abortWrite=false;blocked=false;
console.log(JSON.stringify({passed:true,coverage:['IndexedDB commit before success','save larger than localStorage quota','save works when localStorage writes fail','fresh instance loads database save','transaction failure preserves previous save']}));

// The online adapter is optional and never alters any legacy/local save slot.
const cloud=[];const session=boot();
session.clientWindow.SMGameAccount={user:{id:'test-player'},async listSaves(){return cloud.map(s=>({...s}));},async save(name,id,data){const next={id,name,data,savedAt:Date.now()},index=cloud.findIndex(s=>s.id===id);if(index<0)cloud.push(next);else cloud[index]=next;}};
const originalSlots=session.game.readSaveSlots().map(s=>s.id).join(',');
session.get('menu').onclick();
assert(session.get('cloudSaveMenu').onclick,'logged-in player can access online saves');
await session.get('cloudSaveMenu').onclick();
session.get('cloudSaveName').value='เมืองคลาวด์';
await session.get('cloudCreate').onclick();
assert.equal(cloud.length,1);
assert.equal(session.game.readSaveSlots().map(s=>s.id).join(','),originalSlots);
const originalMoney=session.game.state.money;
session.game.state.money=123;
session.get('menu').onclick();
await session.get('cloudLoadMenu').onclick();
session.get('slotAction0').onclick();
session.get('confirmDialog').onclick();
assert.equal(session.game.state.money,originalMoney);
console.log(JSON.stringify({passed:true,coverage:['cloud save integration uses snapshot','cloud slots do not overwrite browser saves','cloud load restores the original snapshot']}));

})().catch(e=>{console.error(e);process.exitCode=1;});
