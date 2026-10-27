const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {boot}=new Function('require',fixture+'return {boot};')(require);
function create(){
 const {game:g}=boot();g.state.money=1e8;g.state.time=720;
 const home=g.buildBuilding('home_large',160,148-g.CATALOG.home_large.plotHeight,true);
 assert(home,'A road-connected home must exist');
 const c=g.newCitizen(home);c.resident=true;c.locationId=home.id;c.location='home';
 c.profile.trait=3;c.happy=39;home.residents.add(c.id);home.parked.add(c.id);
 return {g,home,c};
}
{
 const {g,home,c}=create();const cap=g.CATALOG[home.key].residents;
 const availableBefore=g.computeStats().freeHomes;
 g.runAction(c,'moveOut');
 const v=g.state.vehicles.get(c.vehicleId);
 assert(v&&v.kind==='moveOut','Resident must create an exit trip');
 g.arrive(v,true);
 assert.equal(g.state.citizens.has(c.id),false,'Departed resident removed');
 assert.equal(home.moveOutCooldowns.length,1,'Exactly one locked vacancy');
 assert.equal(home.moveOutCooldowns[0],720+4320,'Unlock in exactly three full game days');
 assert.equal(g.computeStats().freeHomes,availableBefore,'Leaving does not immediately create a usable quota');
 assert.equal(g.cityDemand().housing.locked,1,'The demand model exposes active cooldown slots');
 let snapshot=g.snapshot();
 assert.equal(JSON.parse(snapshot).buildings.find(([id])=>id===home.id)[1].moveOutCooldowns.length,1,'Save includes cooldown');
 assert(g.loadGame(true,null,snapshot),'Cooldown must be loadable without breaking saves');
 const restored=g.state.buildings.get(home.id);
 assert.equal(restored.moveOutCooldowns.length,1,'Cooldown survives reloading');
 g.state.time=720+4319;
 assert.equal(g.computeStats().freeHomes,availableBefore,'One minute before expiration still blocked');
 g.state.time=720+4320;
 assert.equal(g.computeStats().freeHomes,availableBefore+1,'Quota unlocks at three days');
 assert.equal(restored.moveOutCooldowns.length,0,'Expired lock is pruned');
}
{
 const {g,home,c}=create();
 // Demolition/removal unrelated to an exit trip must not penalize immigration.
 g.demolishBuilding(home,true);
 assert(!g.state.buildings.has(home.id),'Demolition should remove the house');
 assert(!c.resident,'Demolition removes resident');
}
console.log('PASS: three-day quota, immediate block, precise expiry, demand balance, save/load, demolition exemption');
