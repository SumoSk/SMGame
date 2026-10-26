const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g,get}=new Function('require',fixture+'return boot();')(require);
Object.assign(g.state.missionStats.current,{populationIn:20,populationOut:5,touristsIn:3,touristsOut:11,missed:20,late:15});
g.computeStats();g.updateCityAdvisor();
const html=get('cityBrief').innerHTML,lines=[...html.matchAll(/class="city-brief-line" title="[^"]*">([^<]*)<\/div>/g)].map(x=>x[1]);
assert.equal(lines.length,4);assert.equal(lines[0],'ประชาชน+15•นักท่องเที่ยว−8');assert.equal(lines[2],'ไปไม่ทัน20•ไปสาย15');assert(lines[3].includes('อยู่บ้าน')&&lines[3].includes('•รถรอ'));
assert(lines.every(x=>!(/\s/.test(x))),'brief has no spaces, only bullet separators');
assert.equal((get('demand').innerHTML.match(/data-need-kind=/g)||[]).length,9,'original nine need rows remain');assert(!get('demand').innerHTML.includes('รถที่บ้าน'),'bottom report moved above table');
g.state.money=1e8;const home=g.buildBuilding('home_starter',160,145,true);for(let n=0;n<2;n++){const c=g.newCitizen(home);c.resident=true;c.workId=null;c.profile.trait=0;home.residents.add(c.id);}
const tourists=[];for(let n=0;n<4;n++){const c={id:90000+n,tourist:true,enteredAt:g.state.time,wantsHotel:true,nights:0,maxNights:1};g.state.citizens.set(c.id,c);tourists.push(c.id);}
g.updateCityAdvisor();assert(get('cityBrief').innerHTML.includes('โรงแรม−4•งาน−2'),'shortages match hotel and work demand');
for(const id of tourists)g.state.citizens.delete(id);
const before=JSON.stringify(g.snapshot());g.updateCityAdvisor();assert.equal(JSON.stringify(g.snapshot()),before,'brief never mutates game data');
g.state.time=1440;g.daily();g.updateCityAdvisor();assert(get('cityBrief').innerHTML.includes('ไปไม่ทัน0•ไปสาย0'),'results reset with day');
console.log('PASS: four heading-free lines, no spaces, daily totals, live home/waiting values, unchanged demand table, no state mutation and day rollover');
