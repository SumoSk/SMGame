// The demand box shows only category rows; its scrollbar remains visible.
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {game:g,get}=new Function('require',fixture+'return boot();')(require);
Object.assign(g.state.missionStats.current,{populationIn:20,populationOut:5,touristsIn:3,touristsOut:11,missed:20,late:15});
g.computeStats();g.updateCityAdvisor();
const demand=()=>get('demand').innerHTML;
let html=demand();
assert(!html.includes('id="cityBrief"')&&!html.includes('city-brief-line'),
 'remove continuous city report from demand box');
assert.equal((html.match(/data-need-kind=/g)||[]).length,9,
 'all nine categorized demand rows must remain');
for(const name of ['บ้าน','งาน','โรงแรม']){
 assert(html.includes('<span>'+name+'</span>'),'category label missing: '+name);
}
assert(html.includes('mini-need-capacity')&&html.includes('mini-need-busy')&&
 html.includes('mini-need-missing'),'keep capacity, using and shortage figures');
g.state.money=1e8;
const home=g.buildBuilding('home_starter',160,145,true);
for(let n=0;n<2;n++){
 const c=g.newCitizen(home);c.resident=true;c.workId=null;
 c.profile.trait=0;home.residents.add(c.id);
}
const tourists=[];
for(let n=0;n<4;n++){
 const c={id:90000+n,tourist:true,enteredAt:g.state.time,wantsHotel:true,nights:0,maxNights:1};
 g.state.citizens.set(c.id,c);tourists.push(c.id);
}
g.updateCityAdvisor();html=demand();
assert(html.includes('โรงแรม · ความจุ 0 · กำลังใช้ 0 · ความต้องการ -4'),
 'hotel shortage still appears in its own category');
assert(html.includes('data-need-kind="work"'),'work demand category retained');
assert(!html.includes('cityBrief'),'never re-add continuous summary');
for(const id of tourists)g.state.citizens.delete(id);
const before=JSON.stringify(g.snapshot());
g.updateCityAdvisor();
assert.equal(JSON.stringify(g.snapshot()),before,'UI demand update must not mutate game data');
g.state.time=1440;g.daily();g.updateCityAdvisor();
assert.equal((demand().match(/data-need-kind=/g)||[]).length,9,
 'categorized demands survive day rollover');
const page=fs.readFileSync('index.html','utf8'),style=fs.readFileSync('dist/style.css','utf8');
assert(page.includes('class="demand-scroll-track"')&&page.includes('id="smcity-demand-scroll"'),
 'permanent scroll indicator must exist on the page');
assert(page.includes("pane.addEventListener('scroll',schedule")&&page.includes("track.addEventListener('pointerdown'"),
 'indicator must follow scrolling and permit dragging');
assert(style.includes('demand-scroll-thumb')&&style.includes('Custom indicator is necessary on touch WebKit'),
 'scroll indicator must be styled for always-on display');
console.log('PASS: demand categories only, numeric demand intact, persistent scroll indicator, no simulation changes');
