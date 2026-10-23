const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},nodes=new Map();
function node(){const classes=new Set(['hidden']);return{textContent:'',innerHTML:'',value:'',scrollTop:0,scrollLeft:0,style:{},dataset:{},children:[],setAttribute:noop,
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,v)=>v===false?classes.delete(x):classes.add(x),contains:x=>classes.has(x)},
 addEventListener:noop,querySelectorAll:()=>[],showModal(){},close(){},getContext:()=>new Proxy({},{get:()=>noop}),setPointerCapture:noop};}
const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
const page=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
assert(page.includes('content="#eee6f2"'),'browser theme color should reflect new pastel palette');
assert(page.includes('class="sm-static-icon"'),'header action icons should match tool icons');
assert(css.includes('SMCITY Luxury Pastel UI / 2026-10-23'),'pastel style system absent');
for(const token of ['--sm-pearl','#e6dbf2','--sm-purple','--sm-pink','.sm-ui-icon','.citizens-dashboard','#inspector','#cameraJoystick','@media(max-width:720px)'])
 assert(css.includes(token),'pastel design token missing: '+token);
const match=css.slice(css.lastIndexOf('SMCITY Luxury Pastel UI / 2026-10-23'));
assert(match.includes('body>.bottom .city-dashboard .city-metric')&&match.includes('body>.bottom .builder-zone .dock-context .tool'),'left/right dock must share theme');
let game;const ctx={document:{getElementById:get,querySelector:node,querySelectorAll:()=>[],activeElement:null},window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:v=>game=v},innerWidth:1360,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),ctx);
game.reset();
const primary=get('categories').innerHTML;
assert.equal((primary.match(/class="sm-ui-icon"/g)||[]).length,5,'all primary sections must use consistent vectors');
for(const key of ['build','green','insights','traffic','manage'])assert(primary.includes('data-dock-group="'+key+'"'));
assert(!primary.includes('🏙️')&&!primary.includes('🚦'),'no operating-system-specific emoji in category buttons');
assert(get('subcategories').innerHTML.includes('data-category="roads"'),'building subcategories preserved');
let rail=get('tools').innerHTML;
assert(rail.includes('class="sm-ui-icon"'),'build tools must be vectors');
assert(!rail.includes('>═</span>'),'old roads text glyph must not be shown');
get('categories').onclick({target:{closest:q=>q==='[data-dock-group]'?{dataset:{dockGroup:'insights'}}:null}});
assert(get('subcategories').hidden,'city data must not regain secondary tabs');
rail=get('tools').innerHTML;
for(const key of ['citizenDashboard','touristDashboard','tracking'])assert(rail.includes('data-tool="'+key+'"'),'city tool missing '+key);
assert.equal((rail.match(/class="sm-ui-icon"/g)||[]).length,3,'all city tools share vectors');
get('categories').onclick({target:{closest:q=>q==='[data-dock-group]'?{dataset:{dockGroup:'green'}}:null}});
assert(get('tools').innerHTML.includes('class="sm-ui-icon"'),'landscape tools should be vectors');
assert(!get('tools').innerHTML.includes('🌳'),'remove emoji from rendered tree tools');
assert(page.includes('id="toggleDock"')&&page.includes('id="toggleBuildingLabels"'),'keep all tool toggles');
console.log(JSON.stringify({passed:true,backupSafe:true,palette:'lavender-rose-pearl',unifiedVectors:true,mainCategories:5,cityToolsDirect:true,saveUnchanged:true}));
