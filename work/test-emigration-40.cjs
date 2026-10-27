const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot}=new Function('require',fixture+'return {boot};')(require);
function makeResident(happy){
 const {game:g}=boot();g.state.money=1e9;g.state.time=720;
 const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);
 assert(home);
 const c=g.newCitizen(home);c.resident=true;c.happy=happy;
 c.locationId=home.id;c.location='home';c.profile.trait=3;
 home.residents.add(c.id);home.parked.add(c.id);
 return {g,c,home};
}
function miss(g,c,id){
 g.journeyResult(c,{id,kind:'work',startedAt:g.state.time,travelBudget:{totalMinutes:1},congestionMinutes:0},'missed','พลาดงาน');
}
const exactly40=makeResident(46);
miss(exactly40.g,exactly40.c,'above-threshold');
assert.equal(exactly40.c.happy,40);
assert.equal(exactly40.c.movingOut,false,'40 percent itself must stay');
const below40=makeResident(45);
miss(below40.g,below40.c,'below-threshold');
assert.equal(below40.c.happy,39);
assert.equal(below40.c.movingOut,true,'39 percent must leave immediately');
assert(below40.g.state.events.some(e=>e.action==='moveOut'&&e.citizenId===below40.c.id),'Must schedule moveOut instantly');
const other=makeResident(95);
other.c.profile.trait=0;other.c.unemployed=5;
other.g.state.time=1440;
other.g.daily();
assert.equal(other.c.movingOut,false,'Unemployment days alone should not force emigration');
const older=makeResident(30);
older.g.state.time=1440;
older.g.daily();
assert.equal(older.c.movingOut,true,'Old save at <40 should trigger on next daily update');
console.log('PASS: <40 immediately, exactly 40 stays, no separate unemployment threshold, low-mood legacy citizens leave');
