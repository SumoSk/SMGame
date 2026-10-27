const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{};let game;
const nodes=new Map();
function node(id){
 if(!nodes.has(id)){const classes=new Set(['hidden']);nodes.set(id,{textContent:'',innerHTML:'',value:'',style:{},children:[],classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:noop},addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],showModal:noop,close:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});}
 return nodes.get(id);
}
const storage={getItem:()=>null,setItem:noop};
const context={document:{addEventListener:noop,getElementById:node,querySelector:()=>node('dummy'),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1280,innerHeight:800,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:storage,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
game.reset();game.state.money=100000000;
const gates=game.state.gates;
assert.equal(gates.length,4);
for(let i=0;i<4;i++){
 const from=gates[i],to=gates[(i+2)%4],route=game.straightIntercityPath(from,to);
 assert.equal(route.length,300,'four highway arms form an unbroken cross');
 assert.equal(route[0],from);assert.equal(route.at(-1),to);
 const p=game.xy(from),last=game.xy(to),horizontal=p[1]===last[1];
 for(const node of route){
  const coord=game.xy(node);
  assert(horizontal?coord[1]===p[1]:coord[0]===p[0],'truck never turns');
  assert.equal(game.state.roads.get(node)?.type,'large','never enters smaller roads');
 }
}
// 40 resident citizens => 4 road trains per hour, shared across all four
// directions rather than multiplied by four.
const home=game.buildBuilding('home_large',170,140,true);
assert(home,'home near main highway');
for(let i=0;i<40;i++){
 const c=game.newCitizen(home);
 c.resident=true;c.locationId=home.id;c.location='home';home.residents.add(c.id);
}
assert.equal(game.computeStats().pop,40);
const start=12*60;
game.state.time=start;
game.updateIntercityFreight();
assert.equal(game.state.intercityHour.total,4);
assert.equal(game.state.intercityHour.next,0);
game.state.time=start+59.9;
game.updateIntercityFreight();
const trains=[...game.state.vehicles.values()].filter(v=>v.kind==='intercity');
assert.equal(trains.length,4);
assert.equal(game.state.intercityHour.next,4);
assert.equal(new Set(trains.map(v=>v.intercity.fromIndex)).size,4);
for(const v of trains){
 assert.equal(v.path.length,300);
 const entry=game.xy(v.path[0]),exit=game.xy(v.path.at(-1));
 assert(entry[0]===exit[0]||entry[1]===exit[1]);
 assert(v.path.every(n=>entry[0]===exit[0]?game.xy(n)[0]===entry[0]:game.xy(n)[1]===entry[1]));
}
// The very same 60-minute bucket never reissues trips (including saved games).
game.updateIntercityFreight();
assert.equal([...game.state.vehicles.values()].filter(v=>v.kind==='intercity').length,4);
const saved=JSON.parse(game.snapshot());
assert.equal(saved.intercityHour.next,4);
assert.equal(saved.intercityHour.total,4);
// A disconnected expressway must not produce a detour via local streets.
const broken=trains[0].path[70],next=trains[0].path[71];
game.state.roads.get(broken).links.delete(next);
game.state.version++;
assert.equal(game.straightIntercityPath(trains[0].fromGate,trains[0].toGate),null);
const visual=fs.readFileSync('dist/renderer3d.js','utf8');
assert(visual.includes("'roadTrain'"),'dedicated vehicle class');
assert(visual.includes('roadTrain=style===12'),'two-trailer visual model');
assert(visual.includes("v?.kind==='intercity'"),'road train uses its own 3D model');
console.log('Intercity straight-road freight checks passed');
