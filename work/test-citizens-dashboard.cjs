const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{};
function makeNode(){const classes=new Set(['hidden']);return {
 textContent:'',innerHTML:'',value:'',scrollTop:0,style:{},children:[],
 dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,v)=>{if(v===false)classes.delete(x);else if(v===true)classes.add(x);else if(classes.has(x))classes.delete(x);else classes.add(x)},contains:x=>classes.has(x)},
 setAttribute:noop,addEventListener:noop,querySelectorAll:()=>[],showModal(){this.open=true},close(){this.open=false},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop};}
let game;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,makeNode());return elements.get(id)};
const page=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
assert(page.includes('id="citizensDashboard"'));
assert(page.includes('id="citizenSearch"'));
assert(page.includes('id="citizensDashboardBody"'));
assert(css.includes('.citizens-dashboard')&&css.includes('@media(max-width:700px)'));
const source=fs.readFileSync('dist/game.js','utf8');
const ctx={document:{getElementById:get,querySelector:makeNode,querySelectorAll:()=>[],activeElement:null},
 window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:x=>game=x},
 innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,
 localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(ctx);vm.runInContext(source,ctx);
game.reset();require('./test-building-fixtures.cjs')(game);game.state.money=1e9;
const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
const office=game.buildBuilding('office_large',180,148-game.CATALOG.office_large.plotHeight,true);
assert(home&&office);
const people=[];
for(let i=0;i<80;i++){
 const c=game.newCitizen(home);c.resident=true;c.locationId=home.id;c.state='อยู่บ้าน';
 home.residents.add(c.id);if(i%2===0){c.workId=office.id;office.workers.add(c.id);}
 c.happy=i%10===0?25:i%3===0?52:i%4===0?70:90;
 game.scheduleDay(c,Math.floor(game.state.time/1440));
 people.push(c);
}
// Keep an explicit jobless resident after the scheduler's job matching.
office.workers.delete(people[4].id);people[4].workId=null;
people[0].problem='<img src=x onerror=evil()> ขัดข้อง';
people[0].pending={action:'work',next:game.state.time+10,expires:game.state.time+400};
people[1].late=true;
people[2].routine.advance=10;
let d=game.citizenDashboardData();
assert.equal(d.summary.population,80);
assert.equal(d.summary.critical,8);
assert(d.summary.unhappy>=8);
assert(d.summary.jobless>0);
assert(d.summary.issues>0);
assert.equal(d.summary.adaptive,1);
assert.equal(d.summary.late,1);
assert.equal(d.traits.reduce((a,b)=>a+b,0),80);
assert.equal(d.moods.reduce((a,b)=>a+b,0),80);
assert.equal(d.rush.length,12);assert.equal(d.lifestyles.reduce((a,b)=>a+b,0),80);
assert(d.rush.some(n=>n>0),'rush plan chart should contain real planned trips');
assert(d.problems.some(([k])=>k==='เดินทางไปทำงานไม่ได้'));
assert(get('categories').innerHTML.includes('data-dock-group="insights"'),'city data must be reachable as a main group');
get('categories').onclick({target:{closest:()=>({dataset:{dockGroup:'insights'}})}});
const tools=get('tools').innerHTML;
assert(get('subcategories').hidden&&get('subcategories').innerHTML==='','city data must not require submenu navigation');
assert(tools.includes('data-tool="citizenDashboard"')&&tools.includes('data-tool="touristDashboard"')&&tools.includes('data-tool="tracking"'));
assert(tools.indexOf('data-category="citizens"')<tools.indexOf('data-category="tourists"'));
game.selectTool('citizenDashboard');
assert(!get('citizensDashboard').classList.contains('hidden'));
const markup=get('citizensDashboardBody').innerHTML;
assert(markup.includes('80'));
assert(markup.includes('ลักษณะนิสัย')&&markup.includes('ระดับความสุข'));
assert(markup.includes('กำลังเดินทาง')&&markup.includes('รายชื่อประชาชนที่ต้องติดตาม'));
assert(markup.includes('&lt;img src=x onerror=evil()&gt;'),'user-supplied text must be escaped');
assert(!markup.includes('<img src=x onerror=evil()>'));
get('citizenFilters').onclick({target:{closest:()=>({dataset:{citizenFilter:'critical'}})}});
assert(get('citizensDashboardBody').innerHTML.includes('8 คนตามตัวกรอง'),'critical filter must show the actual count');
get('citizenSearch').oninput({target:{value:'not-in-city'}});
assert(get('citizensDashboardBody').innerHTML.includes('ยังไม่พบประชาชนตามเงื่อนไขนี้'));
get('citizenSearch').oninput({target:{value:''}});
get('citizenFilters').onclick({target:{closest:()=>({dataset:{citizenFilter:'all'}})}});
const target=people[0].id;
get('citizensDashboardBody').onclick({target:{closest:selector=>selector==='[data-citizen-id]'?{dataset:{citizenId:String(target)}}:null}});
assert(get('citizensDashboard').classList.contains('hidden'),'individual detail must hide the dashboard');
assert(!get('inspector').classList.contains('hidden'),'individual detail must open in inspector');
assert(get('inspectContent').innerHTML.includes('#'+target+'</h2>'),'person identity appears in the compact fact panel');
game.selectTool('citizenDashboard');
const fromSaved=game.snapshot();
assert(game.loadGame(true,null,fromSaved));
assert(get('citizensDashboard').classList.contains('hidden'),'city load must reset dashboard');
const restored=game.state.citizens.get(target);
assert(restored&&restored.happy===25,'saved citizen happiness must survive');
game.selectTool('citizenDashboard');
assert(!get('citizensDashboard').classList.contains('hidden'));
get('closeCitizensDashboard').onclick();
assert(get('citizensDashboard').classList.contains('hidden'));
assert(get('categories').innerHTML.includes('data-dock-group="insights"'),'city information remains accessible through main navigation');
// Large populations only render the first 40 cards.
game.reset();
for(let i=0;i<5000;i++){const c=game.newCitizen(home);c.resident=true;}
game.selectTool('citizenDashboard');
const body=get('citizensDashboardBody').innerHTML;
assert.equal((body.match(/data-citizen-id=/g)||[]).length,40);
assert(body.includes('ดูเพิ่มอีก 40 คน'));
console.log(JSON.stringify({passed:true,people:80,critical:8,urgentFilter:true,search:true,individual:true,saveReload:true,populationStress:5000,initialRenderedCards:40,htmlEscaped:true}));
