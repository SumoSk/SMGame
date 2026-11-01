'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},elements=new Map();
function makeNode(){
 const classes=new Set(['hidden']);
 return{innerHTML:'',textContent:'',value:'',scrollTop:0,style:{},dataset:{},children:[],open:false,
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
   toggle:(x,on)=>{if(on===false)classes.delete(x);else if(on===true)classes.add(x);else if(classes.has(x))classes.delete(x);else classes.add(x)},
   contains:x=>classes.has(x)},
  setAttribute:noop,addEventListener:noop,querySelectorAll:()=>[],querySelector:()=>null,
  getContext:()=>new Proxy({},{get:()=>noop}),showModal(){this.open=true},close(){this.open=false},setPointerCapture:noop};
}
function get(id){if(!elements.has(id))elements.set(id,makeNode());return elements.get(id);}
let game;
const ctx={document:{getElementById:get,querySelector:()=>makeNode(),querySelectorAll:()=>[],addEventListener:noop,activeElement:null},
 window:{addEventListener:noop,__TRAFFIC_TEST_HARNESS__:g=>game=g},
 innerWidth:390,innerHeight:840,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,
 localStorage:{getItem:()=>null,setItem:noop},console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),ctx);
assert(game,'test game boot');
const html=fs.readFileSync('index.html','utf8'),dist=fs.readFileSync('dist/index.html','utf8'),
 css=fs.readFileSync('dist/style.css','utf8');
for(const h of [html,dist])for(const id of ['cityLevelButton','cityLevelValue','cityLevelProgress','cityLevelNext','cityLevelBar','cityCrateBadge','cityAiQuotaButton','cityAiQuotaValue'])assert(h.includes('id="'+id+'"'),id);
assert(html.includes('v5.1')&&dist.includes('v5.1'));
assert(css.includes('SMCITY 5.1: one-row compact level HUD'));
assert(css.includes('SMCITY 5.1: cinematic level-up celebration'),'celebration styles included');
assert(css.includes('#cityLevelCelebration[hidden]'),'hidden overlay must not block gameplay');
assert(css.includes('body>.city-level-strip'),'level widget must be fixed to viewport, not bottom toolbar');
assert(css.includes('flex-direction:row!important'),'level and AI must share one horizontal row');
assert(css.includes('height:38px!important'),'compact HUD must stay one line high');
for(const h of [html,dist]){
 assert(h.indexOf('class="city-level-strip"')>0 && h.indexOf('class="city-level-strip"')<h.indexOf('<div class="bottom">'),'level widget must precede the unchanged bottom toolbar');
}
const marker='/* SMCITY 5.1: one-row compact level HUD';
const markerPos=css.indexOf(marker);
assert(markerPos>0,'compact overlay stylesheet must exist');
const baseCss=css.slice(0,markerPos).replace(/\s+$/,'')+'\n';
const gitBlob=require('node:crypto').createHash('sha1')
 .update('blob '+Buffer.byteLength(baseCss)+'\0')
 .update(baseCss).digest('hex');
assert.equal(gitBlob,'89ca09717be444c242602f2995575259336b9187','original 5.0 toolbar stylesheet must be byte-for-byte preserved');
assert(css.includes('inset:0!important;top:0!important;right:0!important;bottom:0!important;left:0!important;'),'reward dialog must be viewport-centered');
for(const h of [html,dist])assert(h.includes('id="cityLevelCelebration"'),'celebration overlay in game entry');
const getLevel=()=>game.cityLevelStatus();
assert.equal(getLevel().peakPopulation,18,'starter should include 18 residents');
assert.equal(getLevel().level,1);
assert.equal(getLevel().next,20);
assert.equal(get('cityLevelProgress').textContent,'อีก 2 คน · ภารกิจ ≥80%');
assert.equal(game.updateCityLevel(20),0,'population alone must not level up');
assert.equal(getLevel().level,1);
assert.equal(getLevel().peakPopulation,20,'population high-water mark still grows');
const performance=game.ensurePerformance();
performance.previous={day:-1,total:10,ontime:7};
performance.official=70;
assert.equal(game.updateCityLevel(20),0,'below 80 percent must block');
assert.equal(getLevel().level,1);
performance.previous={day:-1,total:10,ontime:8};
performance.official=80;
assert.equal(game.updateCityLevel(20),1,'80 percent qualifies with a completed day');
const levelScene=get('cityLevelCelebration');
assert.equal(levelScene.hidden,false,'reaching a level should show celebration');
assert.match(levelScene.innerHTML,/LEVEL UP!/,'cinematic scene has prominent title');
assert.match(levelScene.innerHTML,/เปิดกล่องรางวัล/,'scene includes immediate crate action');
assert.equal((levelScene.innerHTML.match(/class="sm-level-confetti"/g)||[]).length,40,'fixed light confetti count');
game.dismissCityLevelCelebration();
assert.equal(levelScene.hidden,true,'overlay can close without altering rewards');
assert.equal(getLevel().level,2);
assert.equal(getLevel().pending.length,1);
assert.equal(getLevel().next,70);
assert.equal(game.updateCityLevel(100),1);
assert.equal(getLevel().level,3);
assert.equal(getLevel().pending.length,2);
assert.equal(getLevel().next,120,'peak 100 must advance toward 120');
assert.equal(game.updateCityLevel(30),0,'emigration never lowers peak');
assert.equal(getLevel().peakPopulation,100);
assert.equal(getLevel().next,120);
assert.equal(game.updateCityLevel(120),1);
assert.equal(getLevel().level,4);
assert.equal(getLevel().next,170);
assert.equal(getLevel().pending.length,3);
assert.equal(game.updateCityLevel(120),0,'same peak never duplicates crates');
assert.equal(getLevel().pending.length,3);
assert.equal(game.cityLevelForPeak(69),2);
assert.equal(game.cityLevelForPeak(70),3);
assert.equal(game.cityLevelForPeak(119),3);
assert.equal(game.cityLevelForPeak(120),4);
game.ensureCityLevel().pending=[{level:2,kind:'money'},{level:3,kind:'cars'},{level:4,kind:'ai'}];
const beforeCash=game.state.money;
assert.equal(game.claimCityCrate().kind,'money');
assert.equal(game.state.money-beforeCash,1000000);
assert.equal(game.claimCityCrate().kind,'cars');
let sumCars=0;
for(const group of game.state.vehicleTechLevels)for(const tech of game.VEHICLE_TECHS)sumCars+=group[tech.key]||0;
assert(sumCars>=8,'four new F1 entitlements must be added to four included starter F1 cars');
assert.equal(game.claimCityCrate().kind,'ai');
assert.equal(getLevel().aiCredits,1);
assert.equal(getLevel().pending.length,0);
assert.equal(getLevel().claimed,3);
assert.equal(game.claimCityCrate(),null,'cannot claim same chest twice');
game.state.money=0;
const junction=game.id(150,150);
assert.notEqual(game.signalSettings(junction).mode,'smart');
assert(game.openAISignalUpgrade(junction),'AI upgrade modal opens');
assert.match(get('dialogContent').innerHTML,/ใช้โควต้า AI ฟรี 1 จุด/);
assert.equal(typeof get('confirmAiCredit').onclick,'function','free AI requires explicit user click');
get('confirmAiCredit').onclick();
assert.equal(getLevel().aiCredits,0);
assert.equal(game.state.money,0,'free AI must not charge money');
assert.equal(game.signalSettings(junction).mode,'smart');
assert.equal(game.buyAISignal(junction,'credit'),false,'cannot buy AI on same junction twice');
assert.equal(game.state.money,0);
game.updateCityLevelHud(18);
assert.equal(get('cityLevelValue').textContent,'4');
assert.equal(get('cityLevelProgress').textContent,'อีก 50 คน · ภารกิจ ≥80%');
assert.equal(get('cityAiQuotaValue').textContent,'0');
assert.equal(get('cityCrateBadge').textContent,'🎁 0');
game.ensureCityLevel().pending.push({level:4,kind:'money'});
game.openCityCrateModal();
assert.match(get('dialogContent').innerHTML,/กล่องสุ่มรางวัลเมือง/);
assert.match(get('dialogContent').innerHTML,/รถ F1 ทั้ง 4 แบบ/);
assert.equal(typeof get('cityCrateOpen').onclick,'function');
const beforeOpen=game.state.money;get('cityCrateOpen').onclick();
assert.equal(game.state.money,beforeOpen+1000000,'one click claims exactly once');
assert.match(get('dialogContent').innerHTML,/เปิดกล่องสำเร็จ/);
assert.match(get('dialogContent').innerHTML,/อย่าลืมบันทึกเมือง/);
assert.equal(typeof get('cityCrateSave').onclick,'function','prize screen lets users save progress');
assert.equal(getLevel().pending.length,0);
let saved=JSON.parse(game.snapshot());
assert.equal(saved.cityLevel.peakPopulation,120);
assert.equal(saved.cityLevel.level,4);
assert.equal(saved.cityLevel.claimed,4);
assert.doesNotThrow(()=>game.validateSave(saved));
const bad=JSON.parse(JSON.stringify(saved));bad.cityLevel.aiCredits=-1;
assert.throws(()=>game.validateSave(bad),/Invalid city level save/);
assert(game.loadGame(true,null,JSON.stringify(saved)),'save/reload must work');
assert.equal(getLevel().peakPopulation,120);
assert.equal(getLevel().next,170);
assert.equal(getLevel().claimed,4);
assert.equal(getLevel().pending.length,0);
assert.equal(game.state.signals.get(junction).mode,'smart');
const legacy=JSON.parse(JSON.stringify(saved));delete legacy.cityLevel;
assert(game.loadGame(true,null,JSON.stringify(legacy)),'v5.0 save without progression must remain compatible');
assert.equal(getLevel().peakPopulation,18,'legacy save starts high-water at current known residents');
assert.equal(getLevel().level,1);
assert.equal(getLevel().pending.length,0);
const restoredPerformance=game.ensurePerformance();
restoredPerformance.previous={day:0,total:10,ontime:8};
restoredPerformance.official=79.99;
assert.equal(game.updateCityLevel(170),0,'population rises but cannot level under 80 percent');
assert.equal(getLevel().peakPopulation,170);
assert.equal(getLevel().level,1);
assert.doesNotThrow(()=>game.validateSave(JSON.parse(game.snapshot())),'blocked city level saves must be valid');
restoredPerformance.official=80;
assert.equal(game.updateCityLevel(170),4,'a recovered score unlocks all four reached milestones');
assert.equal(getLevel().level,5);
assert.equal(getLevel().pending.length,4);
console.log(JSON.stringify({passed:true,version:'5.1',missionGate80:true,milestones:[20,70,120,170],peakNeverShrinks:true,
 money:true,f1Four:true,freeAi:true,noDuplicateRewards:true,saveLoad:true,legacyLoad:true,ui:true}));
