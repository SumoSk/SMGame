const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},nodes=new Map();
function node(){const set=new Set(['hidden']);return{textContent:'',innerHTML:'',value:'',scrollTop:0,scrollLeft:0,style:{},dataset:{},children:[],setAttribute:noop,
 classList:{add:x=>set.add(x),remove:x=>set.delete(x),toggle:(x,v)=>v===false?set.delete(x):set.add(x),contains:x=>set.has(x)},
 addEventListener:noop,querySelectorAll:()=>[],showModal(){},close(){},
 getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop};}
const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
const page=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
assert(!page.includes('id="exploreCity"'),'old explore button must be removed');
assert(!page.includes('id="collapse"'),'old demand fold must be removed');
assert(page.includes('id="touristFilters"'),'tourism filter dock must exist');
assert(css.includes('quieter mint-slate surfaces'),'updated low-glare palette must load');
assert(css.includes('#inspector{')&&css.includes('right:12px!important'),'inspector should move to right');
let game;
const ctx={document:{getElementById:get,querySelector:node,querySelectorAll:()=>[],activeElement:null},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:value=>game=value},innerWidth:1360,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),ctx);
game.reset();
// Direct construction tabs and right-side actions replace the retired group row.
assert.equal(get('categories').innerHTML,'');
assert.equal(get('subcategories').hidden,false);
const tabs=get('subcategories').innerHTML;
for(const key of ['roads','home','work','food','leisure','civic','landscape'])assert(tabs.includes('data-category="'+key+'"'));
assert(!tabs.includes('data-category="hotel"'));
const pressSub=key=>get('subcategories').onclick({target:{closest:sel=>sel==='[data-category]'?{dataset:{category:key}}:null}});
pressSub('home');let rail=get('tools').innerHTML;assert(rail.includes('data-tool="hotel_small"')&&rail.includes('data-tool="home_starter"'));
pressSub('leisure');rail=get('tools').innerHTML;assert(rail.includes('data-tool="casino_small"')&&rail.includes('data-tool="park_small"'));
pressSub('civic');assert(get('tools').innerHTML.includes('data-tool="civic_starter"'));
pressSub('food');assert(get('tools').innerHTML.includes('data-tool="restaurant_small"'));assert(!get('tools').innerHTML.includes('data-tool="small"'));
pressSub('landscape');assert(get('tools').innerHTML.includes('data-tool="tree:shade"'));
for(const key of ['citizenDashboard','touristDashboard','signalManage'])assert(page.includes('data-city-shortcut="'+key+'"'));
get('cityQuickModes').onclick({target:{closest:sel=>sel==='[data-city-shortcut]'?{dataset:{cityShortcut:'touristDashboard'}}:null}});
assert(!get('touristsDashboard').classList.contains('hidden'),'tourist dashboard opens from right-side action');
require('./test-building-fixtures.cjs')(game);game.state.money=1e8;game.state.time=720;
const hotel=game.buildBuilding('hotel_small',245,148-game.CATALOG.hotel_small.plotHeight,true);
const restaurant=game.buildBuilding('restaurant_small',190,148-game.CATALOG.restaurant_small.plotHeight,true);
assert(hotel&&restaurant);
const base={tourist:true,resident:false,removed:false,history:[],feePeriods:[{paid:1500}],itinerary:[],tourIndex:0,trafficFailures:0,problem:'',happy:90,enteredAt:700,tourDuration:360,tourEnd:1060,locationId:null,vehicleId:null,hotelId:null,sleepUntil:null,activityUntil:null,state:'รอกิจกรรม'};
const service={...base,id:90001,locationId:restaurant.id,itinerary:[{kind:'restaurant',buildingId:restaurant.id,status:'visiting'}],activityUntil:780,state:'เที่ยวร้านอาหาร'};
const sleeper={...base,id:90002,locationId:hotel.id,hotelId:hotel.id,sleepUntil:800,state:'พักโรงแรม'};
const waiting={...base,id:90003,enteredAt:null,state:'รอเข้าเมือง'};
const travel={...base,id:90004,state:'กำลังเดินทาง',vehicleId:80004};
game.state.citizens.set(service.id,service);game.state.citizens.set(sleeper.id,sleeper);game.state.citizens.set(waiting.id,waiting);game.state.citizens.set(travel.id,travel);
game.state.vehicles.set(80004,{id:80004,kind:'leisure',phase:'driving',citizenId:travel.id,toId:restaurant.id,wait:0});
hotel.guests.add(sleeper.id);restaurant.visitors.add(service.id);
let data=game.touristDashboardData();
assert.equal(data.stats.service,1);assert.equal(data.stats.hotel,1);
assert.equal(data.stats.waiting,1);assert.equal(data.stats.travel,1);
assert.equal(data.stats.present,3);
assert.equal(data.kinds.find(k=>k.kind==='restaurant').count,1);
assert.equal(data.hotels.find(h=>h.id===hotel.id).count,1);
game.renderTouristDashboard(true);
let html=get('touristsDashboardBody').innerHTML;
assert(html.includes('ใช้บริการอะไรอยู่')&&html.includes('พักโรงแรมไหนอยู่'));
assert(html.includes('ร้านอาหาร')&&html.includes('โรงแรม'));
assert(html.includes('data-tourist-id="90001"'),'service tourist must be in roster');
assert(html.includes('data-tourist-id="90002"'),'hotel tourist must be in roster');
get('touristFilters').onclick({target:{closest:sel=>sel==='[data-tourist-filter]'?{dataset:{touristFilter:'hotel'}}:null}});
html=get('touristsDashboardBody').innerHTML;assert(html.includes('data-tourist-id="90002"')&&!html.includes('data-tourist-id="90001"'),'hotel filter must only show sleepers');
assert(game.touristInspector(service).includes('กำลังทำอะไร'),'tourist inspector must show live activity');
service.activityUntil=710;service.itinerary[0].status='done';
data=game.touristDashboardData();assert.equal(data.stats.service,0,'finished activity must not remain active');
assert.equal(data.stats.hotel,1,'hotel guest remains present');
console.log(JSON.stringify({passed:true,categoryDock:true,cityDataDirect:true,lowGlare:true,serviceLive:true,hotelLive:true,filters:true,rightInspector:true}));

