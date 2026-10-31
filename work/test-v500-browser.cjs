const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('.'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));const target=file===root?path.join(root,'index.html'):file;if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{window.__qaFrame=fn;return raf(ts=>{if(!window.__qaPause)fn(ts);});};window.__TRAFFIC_TEST_HARNESS__=g=>window.__game=g;let factory;Object.defineProperty(window,'createTrafficRenderer',{configurable:true,get:()=>factory?(canvas=>{const r=window.__renderer=factory(canvas),render=r.render.bind(r);r.render=args=>{window.__renderArgs=args;return render(args);};window.__qaRender=()=>render(window.__renderArgs);return r;}):undefined,set:f=>factory=f});});
 await page.route('**/*.supabase.co/**',r=>r.abort());
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__game&&window.__renderer&&window.__renderArgs);
 // 5.1: level + AI quotas must remain visible inside the compact city HUD.
 for(const [width,height]of [[1440,900],[834,1194],[390,844],[667,375]]){
  await page.setViewportSize({width,height});
  const bounds=await page.evaluate(()=>{
   const box=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect(),style=getComputedStyle(e);return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,display:style.display};};
   return{panel:box('cityLevelButton')?.height?document.querySelector('.city-dashboard')?.getBoundingClientRect().toJSON():null,
    level:box('cityLevelButton'),ai:box('cityAiQuotaButton'),progress:document.getElementById('cityLevelProgress')?.textContent};
  });
  assert(bounds.panel&&bounds.level&&bounds.ai,'level HUD exists at '+width+'px');
  assert(bounds.level.width>45&&bounds.ai.width>24,'level and AI buttons have tap targets at '+width+'px');
  assert(bounds.level.bottom<=bounds.panel.bottom+2&&bounds.ai.bottom<=bounds.panel.bottom+2,'level bar stays inside dashboard at '+width+'px: '+JSON.stringify(bounds));
  assert(bounds.progress?.includes('/'),'level progression must show next population threshold');
 }
 const initial=await page.evaluate(()=>{const g=window.__game;g.state.speed=0;g.closeModal();document.getElementById('smcityWelcomeClose')?.click();const key='shop_starter',t=g.CATALOG[key],b=g.buildBuilding(key,210,148-t.plotHeight,true);if(!b)throw Error('civic placement failed');Object.assign(g.cam,{x:b.x+t.plotWidth/2,y:b.y+t.plotHeight/2,z:1.5});return{version:g.ensurePerformance().version,access:b.access.length,webgl:!!window.__renderer.renderer.getContext()};});assert.equal(initial.version,5);assert(initial.access>=2&&initial.webgl);
 fs.mkdirSync('browser-qa',{recursive:true});
 for(const [name,width,height,time,quality]of [['desktop-day',1440,900,720,'medium'],['ipad-night',834,1194,120,'low']]){await page.setViewportSize({width,height});await page.evaluate(({time,quality})=>{window.__qaPause=false;window.requestAnimationFrame(window.__qaFrame);window.__game.state.time=time;window.__game.applyGraphicQuality(quality);window.__qaRender();},{time,quality});await page.waitForTimeout(1200);await page.evaluate(()=>window.__qaPause=true);await page.waitForTimeout(200);await page.screenshot({path:'browser-qa/'+name+'.png',timeout:90000});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,...initial,screenshots:2,runtimeErrors:errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
