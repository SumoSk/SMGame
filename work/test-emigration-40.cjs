const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot}=new Function('require',fixture+'return {boot};')(require);
function makeResident(happy){const{game:g}=boot();g.state.money=1e9;g.state.time=720;const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);assert(home);const c=g.newCitizen(home);Object.assign(c,{resident:true,happy,locationId:home.id,location:'home'});c.profile.trait=3;home.residents.add(c.id);home.parked.add(c.id);return{g,c,home};}
function score(g,c,outcomes){outcomes.forEach((outcome,id)=>g.journeyResult(c,{id,kind:'work',startedAt:g.state.time,travelBudget:{totalMinutes:1},congestionMinutes:0},outcome,'fixture'));}
const exact=makeResident(1);score(exact.g,exact.c,['ontime','ontime','missed','late','unavailable']);assert(!exact.c.movingOut);exact.g.state.time=1800;exact.g.daily();assert.equal(exact.g.personalPerformance(exact.c),40);assert(!exact.c.movingOut,'exactly 40 stays regardless of legacy happiness');
const below=makeResident(95);score(below.g,below.c,['ontime','late','missed']);assert(!below.c.movingOut,'wait until daily close');below.g.state.time=1800;below.g.daily();assert(below.c.movingOut);assert(below.g.state.events.some(e=>e.action==='moveOut'&&e.citizenId===below.c.id));
const empty=makeResident(30);empty.c.unemployed=5;empty.g.state.time=1800;empty.g.daily();assert(!empty.c.movingOut,'no trip results means no retroactive eviction');
console.log('PASS: below 40 leaves at 06:00, exactly 40 stays, legacy mood and unemployment do not evict');
