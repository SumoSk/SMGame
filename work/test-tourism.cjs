const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{};
function boot(){let game;const nodes=new Map(),storage={};const get=id=>{if(!nodes.has(id)){const classes=new Set(['hidden']);nodes.set(id,{textContent:'',innerHTML:'',value:'',scrollTop:0,children:[],style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:noop,contains:x=>classes.has(x)},addEventListener:noop,querySelectorAll:()=>[],showModal(){this.open=true},close(){this.open=false},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop});}return nodes.get(id);};
 const context={document:{getElementById:get,querySelector:()=>get('dummy'),querySelectorAll:()=>[]},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},innerWidth:1024,innerHeight:768,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);return{game,get};}
function city(){const env=boot(),g=env.game;g.state.money=1e8;g.state.time=720;
 const build=(key,x)=>{const b=g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true);assert(b,key);return b;};
 const home=build('home_large',160),restaurant=build('restaurant_small',190),mall=build('mall_small',210),hotel=build('hotel_small',245),pub=build('pub_small',265);
 for(let i=0;i<20;i++){const c=g.newCitizen(home);Object.assign(c,{resident:true,locationId:home.id,location:'home',state:'อยู่บ้าน',happy:85});c.profile.trait=3;home.residents.add(c.id);home.parked.add(c.id);}g.syncParkingSlots();
 return{...env,home,restaurant,mall,hotel,pub};}
function tourist(g){let c=null;for(let i=0;i<30&&!c;i++){g.state.nextId++;c=g.admitTourist();}assert(c,'admission should find an open reachable attraction');return c;}
function enterAndArrive(g,c){const v=g.state.vehicles.get(c.vehicleId);g.touristEnter(c,v);g.arrive(v,true);return v;}
const results=[];function test(name,fn){try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});console.error(name,e.stack);}}
test('hotel price, beds, footprint and separation from residents',()=>{const{game:g}=city();for(const size of ['small','medium','large']){const h=g.CATALOG['home_'+size],t=g.CATALOG['hotel_'+size];assert.equal(t.cost,h.cost/2);assert.equal(t.beds,h.residents);assert.equal(t.residents,0);assert.equal(t.jobs,0);assert.equal(t.service,0);assert.equal(t.plotWidth,h.plotWidth);assert.equal(t.plotHeight,h.plotHeight);}assert.equal(g.computeStats().homes,30);assert.equal(g.computeStats().pop,20);assert.equal(g.tourismCapacity().beds,2);});
test('80% tourism gate, exact 65% cap, reservations and service demand',()=>{const{game:g,home}=city();for(const c of g.state.citizens.values())c.happy=79.9;assert.equal(g.admitTourist(),null);for(const c of g.state.citizens.values())c.happy=80;assert.equal(g.tourismCapacity().populationLimit,13);for(let i=0;i<300&&g.touristPeople().length<13;i++)g.admitTourist();assert.equal(g.touristPeople().length,13);assert.equal(g.admitTourist(),null);assert.equal(g.computeStats().pop,20);assert.equal(g.computeStats().tax,10000);for(const b of g.state.buildings.values())assert(b.visitors.size+b.reservedService<=g.CATALOG[b.key].service);assert.equal(home.reservedResidents,0);});
test('70% resident immigration gate is independent of tourism',()=>{const{game:g}=city();for(const c of g.state.citizens.values())c.happy=69.9;g.immigration();assert.equal([...g.state.vehicles.values()].filter(v=>v.kind==='moveIn').length,0);for(const c of g.state.citizens.values())c.happy=70;g.immigration();assert([...g.state.vehicles.values()].some(v=>v.kind==='moveIn'));assert.equal(g.admitTourist(),null);});
test('entry is billed once, no charge at gate waiting, no midnight double charge',()=>{const{game:g}=city(),c=tourist(g),start=g.state.money;assert.equal(c.feePeriods.length,0);assert.equal(g.state.money,start);const v=g.state.vehicles.get(c.vehicleId);assert.equal(v.color,'#65c8f2');g.touristEnter(c,v);assert.equal(g.state.money,start+1500);g.touristEnter(c,v);assert.equal(g.state.money,start+1500);g.state.time=1440;g.touristCharge(c);assert.equal(c.feePeriods.length,1);g.state.time=c.enteredAt+1440;g.touristCharge(c);assert.equal(c.feePeriods.length,2);assert.equal(g.state.money,start+3000);c.returning=true;g.state.time+=1440;g.touristCharge(c);assert.equal(c.feePeriods.length,2);});
test('congestion discount only when service is missed; once per paid period',()=>{const{game:g}=city(),c=tourist(g),v=g.state.vehicles.get(c.vehicleId);g.touristEnter(c,v);const money=g.state.money,step=c.itinerary[0];v.congestionMinutes=59;assert.equal(g.touristTrafficFailure(c,v,step),false);assert.equal(g.state.money,money);v.congestionMinutes=60;g.state.time=v.deadline+1;g.touristStep(c);assert.equal(step.status,'missed-traffic');assert.equal(c.feePeriods[0].paid,1000);assert.equal(g.state.money,money-500);g.touristTrafficFailure(c,v,{status:'planned'});assert.equal(g.state.money,money-500);assert.equal(g.tourismLedger().totalRefunds,500);});
test('service arrival, itinerary and details use actual buildings',()=>{const{game:g,get}=city(),c=tourist(g);assert(c.tourDuration>=300&&c.tourDuration<=600);const v=enterAndArrive(g,c),b=g.state.buildings.get(v.toId);assert(b.visitors.has(c.id));assert(b.parked.has(c.id));assert.equal(c.resident,false);assert.equal(c.itinerary[0].status,'visiting');assert.equal(g.computeStats().pop,20);g.selectTool('touristDashboard');assert(!get('touristsDashboard').classList.contains('hidden'));assert(get('touristsDashboardBody').innerHTML.includes('data-tourist-id="'+c.id+'"'));assert(g.touristInspector(c).includes(g.CATALOG[b.key].name));});
test('hotel booking stays within beds, sleep, checkout and finite stay',()=>{const{game:g,hotel}=city(),people=[];for(let i=0;i<3;i++){const c=tourist(g);enterAndArrive(g,c);c.wantsHotel=true;c.maxNights=1;c.tourEnd=g.state.time;people.push(c);}
 let bookings=0;for(const c of people)if(g.touristHotel(c)){bookings++;const v=g.state.vehicles.get(c.vehicleId);g.arrive(v,true);assert(c.sleepUntil>g.state.time);assert.equal(c.nights,1);}
 assert.equal(bookings,2);assert.equal(hotel.guests.size,2);assert.equal(g.tourismCapacity().booked,2);
 const c=people.find(c=>c.hotelId),wake=c.sleepUntil;g.state.time=wake;g.touristStep(c);assert.equal(c.hotelId,null);assert.equal(hotel.guests.size,1);assert.equal(c.wantsHotel,false);assert(c.tourEnd>g.state.time);assert.equal(g.touristHotel(c),false);
});
test('tourism, vehicles, active plans and hotel reservations survive save/load',()=>{const{game:g}=city(),c=tourist(g);enterAndArrive(g,c);c.wantsHotel=true;assert(g.touristHotel(c));const raw=g.snapshot(),saved=JSON.parse(raw),beforeMoney=g.state.money,id=c.id;assert(g.loadGame(true,null,raw));const loaded=g.state.citizens.get(id);assert(loaded.tourist);assert(g.state.buildings.get(loaded.hotelId).guests.has(id));assert(g.state.vehicles.has(loaded.vehicleId));assert.equal(g.state.money,beforeMoney);assert.equal(JSON.stringify(loaded.itinerary),JSON.stringify(c.itinerary));assert.equal(JSON.stringify(g.state.tourism),JSON.stringify(saved.tourism));g.touristCharge(loaded);assert.equal(g.state.money,beforeMoney);});
test('old saves without tourism or hotel guests still load',()=>{const{game:g}=city(),save=JSON.parse(g.snapshot());delete save.tourism;delete save.nextTouristAt;for(const[,b]of save.buildings)delete b.guests;assert(g.loadGame(true,null,JSON.stringify(save)));assert.equal(g.computeStats().pop,20);assert.equal(g.touristPeople().length,0);assert.equal(g.tourismLedger().fees,0);});
test('demolishing a booked hotel releases beds and affected tourists safely',()=>{const{game:g,hotel}=city(),c=tourist(g);enterAndArrive(g,c);c.wantsHotel=true;assert(g.touristHotel(c));g.arrive(g.state.vehicles.get(c.vehicleId),true);g.demolishBuilding(hotel,true);assert(!g.state.buildings.has(hotel.id));assert(!g.state.citizens.has(c.id));for(const v of g.state.vehicles.values())assert.notEqual(v.toId,hotel.id);g.validateSave(JSON.parse(g.snapshot()));});
test('continuous simulation has real arrivals, service use, departures and no duplicate cars',()=>{
 const{game:g}=city();
 for(const[a,b]of [[[270,150],[270,180]],[[270,180],[150,180]]])assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'small',true));
 g.state.speed=20;let maxTourists=0,usedService=false,usedHotel=false;
 const end=g.state.time+1800;
 while(g.state.time<end){
  g.tick(.2);const people=g.touristPeople();maxTourists=Math.max(maxTourists,people.length);
  assert(people.length<=Math.floor(g.computeStats().pop*.65));
  for(const c of people){
   const cars=[...g.state.vehicles.values()].filter(v=>v.citizenId===c.id);assert(cars.length<=1);assert.equal(cars.length,c.vehicleId?1:0);
   assert.equal(c.resident,false);if(c.enteredAt!=null)assert(c.feePeriods.length>0);
   if(c.itinerary.some(s=>['visiting','done'].includes(s.status)))usedService=true;
   if(c.sleepUntil)usedHotel=true;
  }
  for(const b of g.state.buildings.values()){
   const t=g.CATALOG[b.key];assert(b.visitors.size+b.reservedService<=t.service);
   assert((b.guests?.size||0)<=t.beds);assert(b.parked.size<=t.parkingCapacity);
  }
 }
 assert(maxTourists>0);assert(usedService);assert(usedHotel);assert(g.state.tourism.totalFees>0);assert(g.tourismLedger().departures>0);
 console.log('Continuous tourism:',JSON.stringify({maxTourists,usedService,usedHotel,fees:g.state.tourism.totalFees,refunds:g.state.tourism.totalRefunds,present:g.tourismCapacity().present}));
});
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
