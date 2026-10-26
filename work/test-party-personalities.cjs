const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game}=new Function('require',fixture+'return boot();')(require);
assert.equal(game.CITIZEN_TRAITS.join('|'),'ขยัน|สายชิล|สายปาร์ตี้|บ้านรวย','exactly four personality names, no trait id migration');
assert.equal(game.LIFESTYLES.length,12,'the 12 daily lifestyles remain intact');
assert.equal(game.LIFESTYLES.reduce((n,x)=>n+x.weight,0),100,'12 lifestyles retain original baseline weights');
const current=(trait)=>({id:101,profile:{trait,leisure:'park'},routine:{affinity:0,sociability:.5,preferences:{
 restaurant:1,shop:1,mall:1,park:1,pub:1,casino:1
}}});
const easy=current(1),party=current(2);
assert.equal(game.citizenServicePreference(easy,'shop'),1.4,'easygoing prefers shops');
assert.equal(game.citizenServicePreference(easy,'restaurant'),1.2,'easygoing prefers food');
assert.equal(game.citizenServicePreference(easy,'pub'),1,'easygoing does not get party-only pub bonus');
assert.equal(game.citizenServicePreference(party,'pub'),2.6,'partygoers prefer pub outings');
assert.equal(game.citizenServicePreference(party,'casino'),2.4,'partygoers prefer casino outings');
assert.equal(game.citizenServicePreference(party,'shop'),1,'partygoers do not inherit easygoing shop bonus');
assert.deepEqual(Object.keys(party.routine.preferences).sort(),
 ['casino','mall','park','pub','restaurant','shop'].sort(),'existing preference keys unchanged');
assert.equal(party.routine.preferences.pub,1,'preference boost does not mutate saved game profiles');
const source=fs.readFileSync('dist/game.js','utf8');
assert.match(source,/citizenServicePreference\(c,k\)/,'day plans use the new service preferences');
assert.match(source,/sort\(\(a,b\)=>citizenServicePreference\(c,b\)-citizenServicePreference\(c,a\)\)/,
 'spontaneous outings also respect partygoer preferences');
assert.match(source,/c\.profile\.trait===2&&i===10\)w\*=2\.8/,
 'partygoers weight nightlife strongly');
assert.match(source,/row\('บุคลิก',CITIZEN_TRAITS\[c\.profile\.trait\]\)/,
 'person inspector uses shared new trait labels');
game.reset();game.state.money=10000000;
const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
assert(home);
const people=[];
for(let i=0;i<16;i++){const c=game.newCitizen(home);c.resident=true;home.residents.add(c.id);people.push(c);}
const traits=people.map(c=>c.profile.trait);
assert(traits.includes(1)&&traits.includes(2),'both remapped groups retain original numerical codes');
const saved=game.snapshot();assert(game.loadGame(true,null,saved),'existing save schema works unchanged');
const restored=game.state.citizens.get(people.find(c=>c.profile.trait===2).id);
assert.equal(restored.profile.trait,2,'partygoer numerical ID survives save/load');
console.log('Personality v3: correct four labels, party nightlife/pub/casino and easygoing shops/food, twelve lifestyles and existing save data preserved');
