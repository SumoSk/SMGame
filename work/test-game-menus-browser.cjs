'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('.'),source=fs.readFileSync('index.html','utf8');
function pick(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,start);return source.slice(a,b+end.length);}
const styles=pick('<style id="smcity-ux-audit-20261101">','</style>')+pick('<style id="smcity-game-menus-20261101">','</style>');
const member=pick('<dialog id="memberGate"','</dialog>');
const documentHtml='<!doctype html><html lang="th" data-ui-version="5.0"><head><meta charset="utf-8">'+
'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/style.css">'+
'<link rel="stylesheet" href="/dist/modal-system.css">'+styles+
'<style>body{background:linear-gradient(125deg,#608d80,#244e5a)}</style></head><body>'+
'<dialog id="dialog"><button id="dialogCloseTop" class="dialog-close-top">×</button><div id="dialogContent"></div></dialog>'+
member+'</body></html>';
const rows=Array.from({length:4},(_,i)=>'<article class="save-slot-card"><div class="save-slot-heading"><div><h3>เมืองทดสอบ '+(i+1)+
' สวนสาธารณะและระบบจราจรเมืองจำลอง</h3><time>01/11/2569 05:30</time></div></div><div class="save-slot-controls">'+
'<button class="primary">โหลด</button><details class="save-slot-more" '+(i===0?'open':'')+'><summary>⋯</summary>'+
'<div class="save-slot-actions"><button>เขียนทับ</button><button class="danger">ลบเซฟ</button></div></details></div></article>').join('');
const save='<div class="save-workspace save-compact"><header class="save-panel-head"><div><h2>เซฟเกม</h2><p>บันทึกและโหลดเมืองของคุณ</p></div></header>'+
'<section class="save-create-compact"><label for="onlineSaveName">บันทึกเมืองปัจจุบัน</label><div class="save-create-row">'+
'<input id="onlineSaveName" value="เมืองของฉัน"><button id="onlineCreate" class="primary">บันทึก</button></div></section>'+
'<section class="save-list-section"><div class="save-list-heading"><h3>เซฟของฉัน</h3><span>4 รายการ</span></div>'+
'<div class="save-slot-list">'+rows+'</div></section>'+
'<details class="save-backup"><summary>ไฟล์สำรอง <span>นำเข้า / ดาวน์โหลด</span></summary>'+
'<div class="save-backup-body"><label>นำเข้าไฟล์เมือง</label><input type="file"><button>ดาวน์โหลดเมือง</button></div></details>'+
'<div class="save-panel-footer"><button>ปิด</button></div></div>';
const menu='<div class="menu-heading"><span class="menu-logo">S</span><div><h2>เมนูหลัก</h2></div></div>'+
'<div class="smcity-menu-list">'+['เริ่มเมืองใหม่','เซฟ/โหลด','บัญชีผู้ใช้','รายงานรถบัค','ตั้งค่ากราฟิก','คู่มือเล่นเกม'].map((x,i)=>
'<button><span class="menu-symbol">'+['＋','▣','♙','▤','◈','?'][i]+'</span><span><b>'+x+'</b>'+
'<small>เลือกเพื่อเปิดเมนู</small></span><span class="menu-chevron">›</span></button>').join('')+'</div><button class="primary menu-resume">กลับไปเล่น</button>';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1/');
 if(url.pathname==='/qa-menu'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'}).end(documentHtml);return;}
 const file=path.resolve(root,'.'+url.pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else res.writeHead(200,{'Content-Type':path.extname(file)==='.css'?'text/css':'text/plain'}).end(data);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
 try{
  const page=await browser.newPage(),summary=[];
  await page.goto('http://127.0.0.1:'+server.address().port+'/qa-menu',{waitUntil:'domcontentloaded'});
  fs.mkdirSync('browser-qa',{recursive:true});
  for(const [width,height] of [[390,844],[320,568],[834,1194],[1440,900]]){
   await page.setViewportSize({width,height});
   for(const kind of ['login','save','menu']){
    await page.evaluate(({kind,save,menu})=>{
     const member=document.getElementById('memberGate'),dialog=document.getElementById('dialog');
     if(member.open)member.close();if(dialog.open)dialog.close();
     if(kind==='login'){member.hidden=false;member.showModal();}
     else{document.getElementById('dialogContent').innerHTML=kind==='save'?save:menu;dialog.showModal();}
    },{kind,save,menu});
    const result=await page.evaluate(kind=>{
     const el=document.getElementById(kind==='login'?'memberGate':'dialog'),rect=el.getBoundingClientRect(),
       content=kind==='login'?el.querySelector('.member-card'):el.querySelector('#dialogContent'),
       label=kind==='login'?el.querySelector('#memberEmail'):el.querySelector(kind==='save'?'.save-slot-heading h3':'.smcity-menu-list b');
     return{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,
       viewWidth:innerWidth,viewHeight:innerHeight,scrollWidth:content.scrollWidth,clientWidth:content.clientWidth,
       fontSize:label?parseFloat(getComputedStyle(label).fontSize):0,
       background:kind==='login'?getComputedStyle(content).backgroundImage:getComputedStyle(el).backgroundImage};
    },kind);
    assert(result.left>=-2&&result.right<=width+2,'horizontal overflow '+JSON.stringify({kind,width,result}));
    assert(result.top>=-2&&result.bottom<=height+2,'vertical overflow '+JSON.stringify({kind,width,result}));
    assert(result.scrollWidth<=result.clientWidth+3,'inner overflow '+JSON.stringify({kind,width,result}));
    assert(result.fontSize>=11,'unreadable font '+JSON.stringify({kind,width,result}));
    assert(result.background.includes('gradient'),'missing game theme '+kind);
    if(width===390||width===834)await page.screenshot({path:'browser-qa/game-menu-'+kind+'-'+width+'.png'});
    summary.push({width,height,kind,modalWidth:Math.round(result.width),fontSize:result.fontSize});
   }
  }
  console.log(JSON.stringify({passed:true,checked:summary.length,summary}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
