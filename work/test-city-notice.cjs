const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const page=fs.readFileSync('index.html','utf8');
const source=page.match(/<script id="smcity-demand-notice-script">([\s\S]*?)<\/script>/)?.[1];
assert(source,'City notice source');
assert(!source.includes('scrollTo(')&&!source.includes('scrollIntoView('),'No demand scrolling');
assert(!source.includes('cityDemand(')&&!source.includes('computeStats('),'No simulation hooks');
let now=100000,start,timer,click;
const classes=new Set(['is-visible']),box={hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},addEventListener:()=>{}},message={textContent:''},close={addEventListener:(t,fn)=>{click=fn;}};
const elements={cityAdvisorTicker:box,cityAdvisorTickerMessage:message,cityAdvisorTickerDismiss:close,
 day:{textContent:'วันจันทร์ · วันที่ 1'},mapLabel:{textContent:'PHUKET ISLAND'},
 flow:{textContent:'100%'},happy:{textContent:'95%'},status:{textContent:'รถเดินทาง 0 คัน · รอคิว 0 คัน'},money:{textContent:'฿500,000'}};
let needs=[{kind:'park',name:'สวน',amount:20},{kind:'shop',name:'ร้านค้า',amount:5}];
const pending=new Map(),acknowledged=new Set();
const game={
 observe(rows){
  for(const row of rows){
   if(!row.amount){acknowledged.delete(row.kind);if(pending.has(row.kind))pending.get(row.kind).latest=0;continue;}
   if(acknowledged.has(row.kind))continue;
   if(!pending.has(row.kind))pending.set(row.kind,{kind:row.kind,name:row.name,peak:row.amount,latest:row.amount});
   else{const item=pending.get(row.kind);item.latest=row.amount;item.peak=Math.max(item.peak,row.amount);}
  }
  return [...pending.values()];
 },
 list(){return[...pending.values()]},
 built(kind){if(pending.delete(kind))acknowledged.add(kind);}
};
const document={hidden:false,getElementById:id=>elements[id]||null,querySelectorAll:()=>needs.map(x=>({getAttribute:()=>x.kind,querySelector:key=>key==='.mini-need-missing'?{textContent:String(-x.amount)}:{textContent:x.name}}))};
const window={SMGameDemandNotices:game,setTimeout:fn=>(start=fn,1),setInterval:fn=>(timer=fn,2),clearTimeout:()=>{},clearInterval:()=>{},addEventListener:()=>{}};
vm.runInNewContext(source,{window,document,Date:{now:()=>now},console});
start();assert(message.textContent.includes('สวน ขาด 20'),message.textContent);
needs=[{kind:'park',name:'สวน',amount:0},{kind:'shop',name:'ร้านค้า',amount:0}];
now+=13001;timer();assert(message.textContent.includes('ร้านค้า เคยขาด 5'),message.textContent);
elements.day.textContent='วันพฤหัสบดี · วันที่ 4';
for(let k=0;k<8;k++){now+=13001;timer();assert(message.textContent.includes('เคยขาด'),'Pending reminders may not expire');}
game.built('park');now+=13001;timer();assert(!message.textContent.includes('สวน'),'Park notice clears on construction');assert(message.textContent.includes('ร้านค้า'),'Other notice remains');
game.built('shop');elements.day.textContent='วันเสาร์ · วันที่ 6';elements.flow.textContent='42%';elements.status.textContent='รถเดินทาง 45 คัน · รอคิว 18 คัน';
const seen=new Set();
for(let k=0;k<24;k++){now+=13001;timer();seen.add(message.textContent);}
assert([...seen].some(s=>s.includes('แยก AI')),'Traffic tip');
assert([...seen].some(s=>s.includes('F1')),'F1 promotion');
assert([...seen].some(s=>s.includes('สุดสัปดาห์')),'Weekend');
click();assert(box.hidden);
now+=3000;timer();assert(box.hidden,'Manual snooze');
now+=94000;timer();assert(!box.hidden,'Resume');
console.log('PASS: persistent notices across days, clear only on matching construction, rotating active notices, tips and snooze without simulation scans');
