const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8'),renderer=fs.readFileSync('dist/renderer3d.js','utf8');
const storage={},noop=()=>{},nodes=new Map();let game;
const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal:noop,close:noop,getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});return nodes.get(id);};
const context={document:{getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},console};
vm.createContext(context);vm.runInContext(source,context);
const center=game.id(150,150),side=game.id(150,140),west=game.id(149,140),west2=game.id(148,140),west3=game.id(147,140);
assert.equal(game.signalCycle(center),16,'default 6+6 green with 1-minute yellow and all-red phases');
assert.equal(game.signalSettings(center).mode,'auto');
assert.equal(game.signalColor(center,0)==='green'&&game.signalColor(center,1)==='green',false,'opposing axes must never both be green');
assert.equal(game.editSignal(center,{eastWest:3}),false,'green below minimum rejected');
assert.equal(game.editSignal(center,{northSouth:241}),false,'green above maximum rejected');
assert.equal(game.editSignal(center,{eastWest:6.2}),false,'fractional durations rejected');
assert.equal(game.editSignal(game.id(150,148),{eastWest:40}),false,'ordinary road is not a signal junction');

for(const [node,links] of [[west,[side,west2]],[west2,[west,west3]],[west3,[west2]]])game.state.roads.set(node,{type:'small',main:false,links:new Set(links),load:0,wait:0});
game.state.roads.get(side).links.add(west);game.roadChanged([side,west,west2,west3]);
assert.equal(game.junction(side),3,'new T junction has its own independent traffic light');
assert(game.editSignal(center,{eastWest:40,northSouth:20}));
assert.equal(game.signalCycle(center),64);
assert.equal(game.signalCycle(side),16,'other junction retains default 16-minute cycle');
assert.equal(game.signalSettings(side).eastWest,6,'other junction settings are unchanged');
const base=64*11-(center%17)*64/24;
const check=(minute,phase,axisColor)=>{game.state.time=base+minute;assert.equal(game.signalPhase(center),phase,'custom cycle at '+minute);if(axisColor)assert.equal(game.signalColor(center,axisColor[0]),axisColor[1]);assert(!(game.signalColor(center,0)==='green'&&game.signalColor(center,1)==='green'));};
check(0,0,[0,'green']);check(39.9,0);check(40,2,[0,'yellow']);check(41,-1,[0,'red']);check(42,1,[1,'green']);check(61.9,1);check(62,2,[1,'yellow']);check(63,-1);check(64,0);

game.state.time=base+64;
assert(game.controlSignal(center,'manual'));assert.equal(game.signalPhase(center),-1,'manual entry uses all-red transition');
assert.equal(game.signalAllows(center,0),false);assert.equal(game.signalAllows(center,1),false);
game.state.time+=1;assert.equal(game.signalPhase(center),0);assert.equal(game.signalAllows(center,0),true);assert.equal(game.signalAllows(center,1),false);
assert(game.controlSignal(center,'switch'));assert.equal(game.signalPhase(center),-1,'manual axis change is all-red first');
game.state.time+=1;assert.equal(game.signalPhase(center),1);assert.equal(game.signalAllows(center,0),false);assert.equal(game.signalAllows(center,1),true);
game.state.time+=400;assert.equal(game.signalPhase(center),1,'manual mode does not automatically change axes');
assert(game.controlSignal(center,'auto'));assert.equal(game.signalPhase(center),-1,'returning to automatic also clears conflicting green');
game.state.time+=1;assert.equal(game.signalSettings(center).mode,'auto');

const x=(150.5-149)*18*1.24+1440/2,y=(150.5-149)*18*1.24*.78+900*.47;
assert.equal(game.signalHitAt(x,y),center,'junction hit target is easy to select');
game.inspectAt(x,y);assert(get('inspectContent').innerHTML.includes('ควบคุมไฟแยกนี้'));
assert(get('inspectContent').innerHTML.includes('signalEW'));
const inspector=get('inspectContent'),beforeRefresh=inspector.innerHTML,parts=new Map(),getPart=selector=>{if(!parts.has(selector))parts.set(selector,{textContent:'',className:'',querySelector:getPart});return parts.get(selector);};
inspector.querySelector=selector=>selector===`.signal-control[data-node="${center}"]`?{querySelector:getPart}:null;
game.state.time+=1;game.renderInspector();
assert.equal(inspector.innerHTML,beforeRefresh,'clock updates must not replace the signal inputs or steal focus');
assert(getPart('.signal-current small').textContent.includes('นาที'),'live countdown updates without rebuilding the inspector');
delete inspector.querySelector;
const click=(name,node=center)=>get('inspectContent').onclick({target:{closest:()=>({dataset:{action:name,value:String(node)}})}});
get('signalEW').value='31';get('signalNS').value='49';click('signal-save');assert.equal(game.signalSettings(center).eastWest,31);assert.equal(game.signalSettings(center).northSouth,49);
get('signalEW').value='0';click('signal-save');assert.equal(game.signalSettings(center).eastWest,31,'invalid UI value cannot change signal');
click('signal-manual');assert.equal(game.signalSettings(center).mode,'manual');
const axisBefore=game.signalSettings(center).axis;click('signal-switch');assert.equal(game.signalSettings(center).axis,1-axisBefore,'clicking manual switch changes the allowed axis');
click('signal-auto');assert.equal(game.signalSettings(center).mode,'auto');

assert(game.editSignal(side,{eastWest:15,northSouth:45}));
assert(game.setSignalDefaults(8,10));
assert.equal(game.signalSettings(side).eastWest,15,'new default does not overwrite existing custom junction');
const before=JSON.parse(game.snapshot());assert.equal(before.signals.length,2);
assert.equal(before.signalDefaults.eastWest,8);
assert(game.saveGame(true,'signals','signals'));
game.reset('bangkok');assert.equal(game.state.signals.size,0,'new cities start with automatic defaults');
assert(game.loadGame(true,'signals'));
assert.equal(game.signalSettings(center).eastWest,31);assert.equal(game.signalSettings(center).northSouth,49);
assert.equal(game.signalSettings(side).eastWest,15,'each junction persists separately in city saves');
assert.equal(game.state.signalDefaults.northSouth,10,'city-wide defaults persist in saves');
assert.equal(game.state.city,'phuket');
const saved=JSON.parse(game.snapshot());delete saved.signals;
storage['traffic-fixer-thailand-saves-v2']=JSON.stringify({format:2,slots:[{id:'legacy',name:'legacy',savedAt:1,data:JSON.stringify(saved)}]});
assert(game.loadGame(true,'legacy'));assert.equal(game.state.signals.size,0,'older saves without signal settings still load');
assert.equal(game.state.signalDefaults.eastWest,8,'older saves retain global settings if present');
const broken=JSON.parse(game.snapshot());broken.signals=[[center,{eastWest:-1,northSouth:15,mode:'manual',axis:0,holdUntil:0}]];
assert.throws(()=>game.validateSave(broken),/Invalid signal setting/,'invalid signal settings fail validation');

assert(game.editSignal(side,{eastWest:20}));
game.state.roads.get(side).links.delete(west);game.state.roads.delete(west);game.roadChanged([side,west]);
assert.equal(game.state.signals.has(side),false,'signal settings removed when an intersection ceases to exist');
game.reset();game.state.time=600;
assert(game.editSignal(center,{mode:'manual',axis:1}));game.state.time+=1;
assert(game.createTrip(null,'pass',null,null,game.id(149,150),game.id(151,150),null));
const crossing=[...game.state.vehicles.values()][0];
for(let n=0;n<12;n++){game.state.time+=.2;game.advanceVehicles(.2,.2);}
assert.equal(crossing.pos,0,'manually selected perpendicular green must stop east-west cars');
assert(game.controlSignal(center,'switch'));game.state.time+=1;
let progressed=false;for(let n=0;n<80;n++){game.state.time+=.2;game.advanceVehicles(.2,.2);if(crossing.pos>0||!game.state.vehicles.has(crossing.id)){progressed=true;break;}}
assert(progressed,'a stopped car proceeds after the operator switches the correct axis green');
assert(renderer.includes('signalColor(s.node,s.axis)'),'3D traffic bulbs use same status as vehicle right-of-way');
game.selectTool('signalManage');
assert(get('inspectContent').innerHTML.includes('signalDefaultEW'),'traffic light mode exposes city-wide settings');
get('signalDefaultEW').value='7';get('signalDefaultNS').value='9';
click('signal-defaults-apply');
assert.equal(game.signalSettings(center).mode,'manual','bulk settings preserve manually controlled junctions');
assert.equal(game.signalSettings(center).eastWest,7);
assert.equal(game.signalCycle(center),20,'global settings update existing junctions');
assert.equal(game.setSignalDefaults(4,6,true),false,'invalid global default is rejected');
game.reset();game.state.time=400;
for(const [speed,expected] of [[1,.8],[10,8],[20,16]]){
 game.state.speed=speed;const started=game.state.time;game.tick(1);
 assert(Math.abs(game.state.time-started-expected)<1e-8,'clock uses 0.8 game minutes per second at '+speed+'×');
}
console.log(JSON.stringify({passed:true,coverage:['per-junction independently configurable green durations','16-minute default','precise yellow and all-red transitions','manual switching with safe red clearance','vehicle right of way matches green axis','cars stop at manual red and resume at manual green','city-wide traffic mode and defaults','bulk settings preserve manual signal modes','tap target near junction center','save and load each signal configuration','older saves without signals load unchanged','invalid settings rejected','removed intersections clean up settings','3D lamps share simulation state']}));
