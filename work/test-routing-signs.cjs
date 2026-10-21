const fs=require('node:fs');const fixture=fs.readFileSync('work/test-motion.cjs','utf8').split('let combinations=0;')[0];
new Function('require',fixture+`
function road(x,y){const i=game.id(x,y);if(!game.state.roads.has(i))game.state.roads.set(i,{type:'large',links:new Set(),load:0,wait:0});return i;}
function connect(a,b){game.state.roads.get(a).links.add(b);game.state.roads.get(b).links.add(a);}
function noReverse(path){assert(path);for(let i=2;i<path.length;i++)assert.notEqual(path[i],path[i-2],'route must never reverse on the same road');}
game.reset();game.state.roads.clear();game.state.junctionCache.clear();const a=road(10,10),b=road(11,10),c=road(12,10);connect(a,b);connect(b,c);assert.equal(game.route(c,a,null,null,b),null,'dead end cannot reverse');
const d=road(10,11),e=road(11,11),f=road(12,11);connect(c,f);connect(f,e);connect(e,d);connect(d,a);game.state.routeCache.clear();const loop=game.route(a,a,[b],[d]);noReverse(loop);assert.equal(loop[1],b);assert.equal(loop.at(-2),d);assert(loop.length>4);
const v={id:900,path:[a,b,c,b,a],pathSet:new Set([a,b,c]),pos:0,progress:.1,laneSeed:0,lane:0,speed:0,phase:'driving',kind:'pass',toGate:a,wait:0};game.state.vehicles.set(v.id,v);const before=game.vehiclePosition(v);game.enforceNoUTurn(v);noReverse(v.path);assert.equal(v.phase,'driving');const after=game.vehiclePosition(v);assert(Math.hypot(before.x-after.x,before.y-after.y)<1e-8,'reroute preserves current position');
// A T junction uses exactly the same signal permission as a four-way junction.
const turn=install(turnPath(-1),'large',true),node=game.id(150,150),r=game.state.roads.get(node);const east=game.id(151,150);r.links.delete(east);game.state.roads.get(east).links.delete(node);game.state.junctionCache.clear();assert.equal(game.junction(node),3);phase(node,1);assert(!game.intersectionAllowed(turn,8),'T junction must stop on red');phase(node,0);assert(game.intersectionAllowed(turn,8),'T junction may enter on green');
// Counts include all vehicles destined for this building, independently of trip purpose.
const home={id:1,key:'home_small',parked:new Set([7]),residents:new Set()},office={id:2,key:'office_small',parked:new Set([8,9])},shop={id:3,key:'shop_small',parked:new Set()};game.state.vehicles.clear();game.state.vehicles.set(1,{toId:1});game.state.vehicles.set(2,{toId:1});game.state.vehicles.set(3,{toId:2});assert.equal(game.buildingTraffic(home).approaching,2);assert.equal(game.buildingTraffic(home).parked,1);assert.equal(game.buildingTraffic(home).max,2);assert.equal(game.buildingTraffic(office).max,game.CATALOG.office_small.jobs);assert.equal(game.buildingTraffic(shop).max,game.CATALOG.shop_small.jobs+game.CATALOG.shop_small.service);assert.equal(game.buildingTraffic(home).name,'บ้านเล็ก');
// Rooftop service tubes use that building's actual visitors and capacity, not city totals.
const building={id:43,key:'shop_small',x:148,y:148,parked:new Set([5]),visitors:new Set([11,12,13]),workers:new Set([22]),residents:new Set()};
const shopMetrics=game.buildingGaugeMetrics(building,2);assert.equal(shopMetrics.traveling.value,2);assert.equal(shopMetrics.used.value,3);assert.equal(shopMetrics.capacity.value,game.CATALOG.shop_small.service);
assert.equal(shopMetrics.used.pct,25);
const homeMetrics=game.buildingGaugeMetrics({...building,key:'home_small',residents:new Set([1]),visitors:new Set()},1);assert.equal(homeMetrics.used.value,1);assert.equal(homeMetrics.capacity.value,2);
const jobMetrics=game.buildingGaugeMetrics({...building,key:'office_small',workers:new Set([1,2,3])},2);assert.equal(jobMetrics.used.value,3);assert.equal(jobMetrics.capacity.value,18);
const fakeElement=()=>({style:{},dataset:{},children:[],attributes:{},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},setAttribute(name,value){this.attributes[name]=value;},remove(){this.removed=true;}});
let mapOverlay;context.document.createElement=fakeElement;get('world').insertAdjacentElement=(_position,node)=>{mapOverlay=node;};
game.state.buildings.clear();game.state.buildings.set(building.id,building);game.state.vehicles.clear();game.state.vehicles.set(101,{toId:building.id});game.state.vehicles.set(102,{toId:building.id});game.updatePlaceLabels();
const badge=mapOverlay.children[0];
assert.equal(badge.children.length,2,'rooftop label contains only name and arriving count');
assert.equal(badge.children[0].textContent,'ร้านค้าเล็ก','show the building name');
assert.equal(badge.children[1].textContent,'2 / 1 / 15','show three numbers in approaching parked capacity order');
assert.equal(badge.attributes['aria-label'],'ร้านค้าเล็ก กำลังมา 2 คัน จอดอยู่ 1 คัน ความจุ 15 คัน','accessible label explains the three numbers');
assert(!badge.children.some(child=>child.className==='place-label-gauges'),'no gauge tubes remain');
console.log(JSON.stringify({passed:true,coverage:['no reversal at dead ends','legal loop route','old route migration without position jump','T junction red and green','building destination counts and capacities','compact rooftop label with name and arriving car count only']}));
`)(require);
