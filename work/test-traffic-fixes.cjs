const fs=require('fs'),vm=require('vm'),assert=require('assert');let game;
const noop=()=>{},element=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,onclick:null,open:false,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const document={getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[],modelContext:undefined};
const sandbox={document,window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{setItem:noop,getItem:()=>null},console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);
function findVehicle(){return [...game.state.vehicles.values()][0];}
function redFor(node,dir){for(let n=0;n<200;n++){if(!game.signalAllows(node,dir,0))return;game.state.time++;}throw Error('no red signal');}
game.reset();
const center=game.id(150,150),west=game.id(149,150),east=game.id(151,150),north=game.id(150,149);
const cycle=game.signalCycle(center),slots=game.signalSlots(center),first=slots[0];
assert.equal(cycle,128,'eight-lane four-way crossing releases all 16 inbound lanes separately');
const signalAt=minute=>{game.state.time=cycle*40-(center%17)*cycle/24+minute;return game.signalStatus(center);};
for(const [minute,expected,expectedLane]of [[0,first.incoming,0],[5.9,first.incoming,0],[6,4,0],[6.9,4,0],[7,-1,-1],[7.9,-1,-1],[8,first.incoming,1],[13.9,first.incoming,1],[14,4,1],[15,-1,-1],[16,first.incoming,2],[128,first.incoming,0]]){
 const status=signalAt(minute);assert.equal(status.phase,expected,'lane signal at minute '+minute);
 assert.equal(status.lane,expectedLane,'lane sequence at minute '+minute);
}
assert.equal(signalAt(0).phase,signalAt(cycle).phase,'signal cycle repeats exactly');
game.state.roads.get(west).type='medium';game.state.roads.get(east).type='medium';game.state.roads.get(north).type='large';game.state.junctionCache.clear();
redFor(center,0);
assert.equal(game.junction(center),4,'mixed road crossing must remain a four-way junction');
assert.equal(game.signalAllows(center,0),false,'east-west approach must be red during north-south phase');
assert(game.createTrip(null,'pass',null,null,west,east,null),'a vehicle should be routable across the mixed junction');
const v=findVehicle();
game.advanceVehicles(.1,.1);game.advanceVehicles(.5,.5);
assert.equal(v.pos,0,'red-light vehicle must remain on the approach cell');
assert(v.progress<=game.stopProgress(v,1)+.01,'red-light vehicle must stop before the stop line');
assert(v.progress<.3,'red-light vehicle must not creep into the junction');
assert(game.plannedLane(v,1)<game.ROADS.large.lanes/2,'lane mapping must stay within the wider road capacity');
game.state.roads.get(west).type='medium';game.state.roads.get(east).type='medium';
const eastbound=game.laneOffset(west,0,0),westbound=game.laneOffset(east,2,0);
assert(eastbound.y<0&&westbound.y>0,'opposite traffic must use opposite sides of the road');
assert(game.roadVisualWidth('medium')>game.roadVisualWidth('small'),'four-lane roads need a visibly wider carriageway');
const diagonal=game.lineCells(game.id(140,140),game.id(145,145));
const diagonalXY=diagonal.map(game.xy);assert(diagonalXY.every(([x,y])=>y===140)||diagonalXY.every(([x,y])=>x===140),'road drawing must stay orthogonal');
const turning={id:900,citizenId:null,path:[west,center,north],pos:0,progress:.78,lane:0,laneSeed:0};
const curveA=game.vehiclePosition(turning);turning.progress=.79;const curveB=game.vehiclePosition(turning);turning.progress=.80;const curveC=game.vehiclePosition(turning);
const measuredHeading=Math.atan2((curveC.y-curveA.y)*.78,curveC.x-curveA.x),headingError=Math.abs(Math.atan2(Math.sin(curveB.angle-measuredHeading),Math.cos(curveB.angle-measuredHeading)));
assert(headingError<.18,'vehicle heading must follow the actual turn curve');
turning.progress=.999;const beforeTurn=game.vehiclePosition(turning);turning.pos=1;turning.progress=0;turning.lane=game.plannedLane(turning,1);const afterTurn=game.vehiclePosition(turning);assert(Math.hypot(beforeTurn.x-afterTurn.x,beforeTurn.y-afterTurn.y)<.08,'vehicle must not jump at a corner seam');
console.log(JSON.stringify({passed:true,phase:game.signalPhase(center),position:v.pos,progress:v.progress,stopLimit:game.stopProgress(v,1)}));
