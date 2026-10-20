const fs=require('node:fs');const source=fs.readFileSync('dist/game.js','utf8');
function boot(source){
 const noop=()=>{},elements=new Map(),storage={};let game;
 const element=()=>({textContent:'',innerHTML:'',style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,showModal(){this.open=true;},close(){this.open=false;},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},document={getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[]},window={addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x};
 new Function('document','window','innerWidth','innerHeight','devicePixelRatio','requestAnimationFrame','setTimeout','clearTimeout','localStorage','console',source)(document,window,1440,900,1,noop,noop,noop,{setItem:(k,v)=>storage[k]=v,getItem:k=>storage[k]}, {log:noop,error:noop,warn:noop});
 return{game,get,storage};
}
const checks=(()=>{

const env=boot(source),{game,get}=env,checks=[];
function check(name,fn){fn();checks.push(name);}
const assert=(ok,message='Assertion failed')=>{if(!ok)throw Error(message);};
const row=kind=>game.cityDemand().services.find(r=>r.kind===kind);
function citizen(id,pending=null,problem=''){return{id,resident:true,removed:false,movingOut:false,homeId:1,workId:null,locationId:1,location:'home',happy:90,profile:{trait:0,leave:400,end:1000,leisure:'pub'},pending,problem,history:[],scheduled:new Set(),failKinds:new Set(),pain:0,vehicleId:null};}
function request(kind='pub'){return{action:'leisure',kind,expires:game.state.time+100,end:game.state.time+100};}
const home={id:1,key:'home_medium',x:154,y:136,access:[],queue:[],residents:new Set(),workers:new Set(),visitors:new Set(),parked:new Set(),reservedResidents:0,reservedService:0,arrivals:0};game.state.buildings.set(1,home);
check('No phantom demand in an empty city',()=>{assert(game.cityDemand().services.every(r=>r.waiting===0));});
const a=citizen(10,request(),'ต้องการผับ'),b=citizen(11,request(),'ต้องการผับ'),future=citizen(12);for(const c of [a,b,future]){game.state.citizens.set(c.id,c);home.residents.add(c.id);home.parked.add(c.id);}
check('Two actual pending people, preference alone is not demand',()=>{assert(row('pub').waiting===2);assert(row('pub').missing===2);assert(row('shop').waiting===0);});
const pub={...home,id:2,key:'pub_small',x:170,y:136,residents:new Set(),parked:new Set(),visitors:new Set(),workers:new Set(),queue:[]};game.state.buildings.set(2,pub);
check('New available service is awaiting retry, not falsely unreachable',()=>{assert(row('pub').retrying===2);assert(row('pub').unreachable===0);assert(row('pub').missing===0);});
for(let id=100;id<118;id++){const c=citizen(id);c.locationId=2;game.state.citizens.set(id,c);pub.visitors.add(id);}
check('Capacity full and people counts are separate from buildings',()=>{const r=row('pub');assert(r.full===2);assert(r.buildings===1);assert(r.capacity===18);assert(r.visiting===18);assert(r.free===0);});
pub.visitors.clear();a.problem='ไม่มีเส้นทางไปผับเล็ก';b.problem='ไม่มีเส้นทางไปผับเล็ก';
check('Existing service but confirmed failed route is distinguished',()=>{assert(row('pub').unreachable===2);assert(row('pub').full===0);const advice=game.cityAdvice(game.cityDemand(),game.computeStats());assert(advice.next.some(n=>n.key==='routes'));assert(!advice.next.some(n=>n.key==='pub'));});
a.pending.expires=game.state.time-1;b.pending.end=game.state.time-1;
check('Expired requests are not carried forward',()=>assert(row('pub').waiting===0));
a.pending=request();a.problem='ไม่มีเส้นทางไปผับเล็ก';a.vehicleId=900;game.state.vehicles.set(900,{id:900,citizenId:10,kind:'leisure',serviceKind:'pub',toId:2,phase:'driving',speed:1,path:[game.id(150,1),game.id(150,2)],pathSet:new Set([game.id(150,1),game.id(150,2)]),pos:0,progress:0,lane:0,laneSeed:0,trafficModel:2,noUTurnPolicy:1,wait:0});
check('Traveling is not duplicated as unmet demand from a stale pending request',()=>{assert(row('pub').waiting===0);assert(row('pub').traveling===1);});
game.state.vehicles.get(900).phase='stuck';game.state.vehicles.get(900).stopReason='ไม่มีเส้นทาง';a.pending=null;
check('Stranded service trip is counted once by its citizen',()=>{assert(row('pub').unreachable===1);assert(row('pub').waiting===1);assert(row('pub').traveling===0);});
check('Jobs are not invented as separate factory/office preferences',()=>{const d=game.cityDemand();assert(d.jobs.people===21);assert(!('factory' in d.jobs));assert(d.jobs.capacity===5);});
const before=game.snapshot();
check('Reading demand/advice does not modify the city or save',()=>{game.cityDemand();game.cityAdvice(game.cityDemand(),game.computeStats());assert(game.snapshot()===before);});
check('A loaded save reproduces exact demand and existing stuck-car state',()=>{const expected=JSON.stringify(game.cityDemand());assert(game.saveGame(true,'advisor','advisor'));game.reset();assert(game.loadGame(true,'advisor'));assert(JSON.stringify(game.cityDemand())===expected);assert(game.state.vehicles.get(900).phase==='stuck');assert(game.canTowVehicle(game.state.vehicles.get(900)));});
check('UI refresh is idempotent and safe',()=>{game.computeStats();game.updateCityAdvisor();const first=get('demand').innerHTML;game.updateCityAdvisor();assert(get('demand').innerHTML===first);assert(first.includes('ผับ'));assert(!first.includes('undefined'));assert(get('advisorNext').innerHTML.includes('ตรวจเมือง'));});
check('Five compact tube charts show live going, present and capacity values',()=>{
 const html=get('demand').innerHTML;
 assert((html.match(/class="need-gauges"/g)||[]).length===5,'one mini chart per service category');
 assert((html.match(/data-gauge="traveling"/g)||[]).length===5);
 assert((html.match(/data-gauge="used"/g)||[]).length===5);
 assert((html.match(/data-gauge="capacity"/g)||[]).length===5);
 const r=row('pub');
 assert(html.includes('กำลังไป '+r.traveling+' คน อยู่ '+r.used+' คน รับได้ '+r.capacity+' คน'),'chart has accessible numbers');
 assert(!html.includes('NaN')&&!html.includes('Infinity'),'zero-capacity categories render safely');
 const previous=html;const arrived=citizen(987);game.state.citizens.set(arrived.id,arrived);game.state.buildings.get(2).visitors.add(arrived.id);
 game.updateCityAdvisor();assert(get('demand').innerHTML!==previous,'chart changes when actual occupancy changes');
 assert(get('demand').innerHTML.includes('กำลังไป '+r.traveling+' คน อยู่ '+(r.used+1)+' คน รับได้ '+r.capacity+' คน'));
});
return checks;

})();console.log(JSON.stringify({passed:true,checks}));
