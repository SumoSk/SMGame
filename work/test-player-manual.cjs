const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
(async()=>{
 const server=spawn(process.execPath,['work/server.cjs'],{stdio:'inherit'});
 let browser;
 try{
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:4173')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__TRAFFIC_TEST_HARNESS__=api=>window.manualTestGame=api;});
  await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.manualTestGame,{timeout:30000});
  await page.evaluate(()=>{window.manualTestGame.state.speed=0;});
  const before=await page.evaluate(()=>window.manualTestGame.snapshot());
  await page.locator('#menu').click();await page.locator('#helpMenu').click();
  assert.equal(await page.locator('#playerManual details').count(),21);
  assert(await page.locator('#playerManual').innerText().then(t=>t.includes('ประชาชน 18 คน')));
  await page.locator('#manualSearch').fill('นักท่องเที่ยว');
  assert(await page.locator('#playerManual details:visible').count()>0);
  assert(await page.locator('#playerManual details:visible').count()<21);
  await page.locator('#manualSearch').fill('zzznomatchzzz');
  assert(await page.locator('#manualEmpty').isVisible());
  assert.equal(await page.locator('#playerManual details:visible').count(),0);
  await page.locator('#manualSearch').fill('<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#playerManual img').count(),0);
  await page.locator('#manualClear').click();
  assert.equal(await page.locator('#playerManual details:visible').count(),21);
  await page.locator('[data-manual-target="catalog"]').click();
  assert(await page.locator('#manual-catalog').evaluate(el=>el.open));
  const cat=await page.locator('#manual-catalog').innerText();
  assert(cat.includes('บ้านเริ่มต้น')&&cat.includes('24,000'));
  await page.locator('#manualTop').click();
  await page.locator('#manualExpand').click();
  assert.equal(await page.locator('#playerManual details[open]').count(),21);
  await page.locator('#manualCollapse').click();
  assert.equal(await page.locator('#playerManual details[open]').count(),0);
  await page.locator('[data-manual-target="signals"]').click();
  assert((await page.locator('#manual-signals').innerText()).includes('ทุกเลน'));
  fs.mkdirSync('work/manual-screenshots',{recursive:true});
  await page.locator('#manualTop').click();
  await page.screenshot({path:'work/manual-screenshots/desktop.png'});
  for(const [name,width,height,dark] of [['tablet',820,1180,false],['mobile',390,844,false],['mobile-dark',390,844,true]]){
   await page.setViewportSize({width,height});
   await page.evaluate(dark=>document.documentElement.classList.toggle('smcity-gray-ui',dark),dark);
   await page.locator('[data-manual-target="catalog"]').click();
   const size=await page.locator('#dialog').evaluate(el=>({w:el.getBoundingClientRect().width,client:el.clientWidth,scroll:el.scrollWidth,x:el.getBoundingClientRect().left}));
   assert(size.w<=width&&size.x>=0,name+' modal fits viewport');
   assert(size.scroll<=size.client+2,name+' table scroll stays inside manual');
   await page.screenshot({path:'work/manual-screenshots/'+name+'.png'});
   await page.locator('#manualTop').click();
  }
  await page.locator('#helpDone').click();
  assert.equal(await page.locator('#dialog').evaluate(el=>el.open),false);
  assert.equal(await page.evaluate(()=>window.manualTestGame.snapshot()),before,'manual must preserve city and save data');
  await page.locator('#menu').click();await page.locator('#helpMenu').click();
  await page.locator('#manualMenu').click();
  assert(await page.locator('#helpMenu').isVisible());
  await page.locator('#menuClose').click();
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Manual verified: 21 chapters, search, no results, safe input, navigation, tables, desktop/tablet/mobile/dark layouts, close/reopen, unchanged city.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
