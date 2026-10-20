const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let game;const noop=()=>{};
const element=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const context={document:{getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
const cell=(x,y)=>game.id(x,y);
const build=(x,y,u,v,type)=>{const cells=game.lineCells(cell(x,y),cell(u,v));assert(game.buildRoad(cells,type,true));return cells;};
function edgesAreAdjacent(){for(const [i,r]of game.state.roads)for(const j of r.links){const [x,y]=game.xy(i),[u,v]=game.xy(j);assert.equal(Math.abs(x-u)+Math.abs(y-v),1,'every built road link must be orthogonal and adjacent');assert(game.state.roads.get(j)?.links.has(i),'connections must be bidirectional');}}

game.reset();
build(160,140,166,140,'small');
build(166,140,172,140,'small');
assert.equal(game.junction(cell(166,140)),2,'continuation of equal size must not gain traffic lights');
assert.equal(game.state.roads.get(cell(166,140)).links.size,2);
build(172,140,178,140,'medium');
assert.equal(game.junction(cell(172,140)),2,'lane-size change is a taper, not an intersection');
assert.equal(game.state.roads.get(cell(172,140)).type,'medium');
assert.equal(game.state.roads.get(cell(171,140)).type,'small');

build(168,140,168,134,'small');
assert.equal(game.junction(cell(168,140)),3,'branching at an existing road creates a signalized T');
build(168,140,168,147,'small');
assert.equal(game.junction(cell(168,140)),4,'crossing an existing road creates a signalized four-way junction');
edgesAreAdjacent();

game.reset();
const finish=game.lineCells(cell(140,141),cell(149,141));
assert.equal(finish.at(-1),cell(150,141),'approach within the wide road footprint snaps exactly onto its centerline');
assert(finish.every((p,n)=>n===0||p-finish[n-1]===1),'footprint snapping must never add diagonal or detached segments');
const shoulder=game.lineCells(cell(147,143),cell(147,157));
assert(shoulder.every(p=>game.xy(p)[0]===147),'a nearby road must not pull intermediate cells sideways');
assert.equal(game.checkRoad([cell(140,140),cell(142,140)],'small').error,'ถนนต้องเชื่อมกันทีละช่องในแนวตรงค่ะ');
assert.equal(game.checkRoad([cell(140,140),cell(141,141)],'small').error,'ถนนต้องเชื่อมกันทีละช่องในแนวตรงค่ะ');
console.log(JSON.stringify({passed:true,coverage:['same-width continuous road','mixed-width lane taper','T junction','four-way junction','endpoint shoulder snap','no mid-drag coordinate jump','no detached or diagonal links']}));
