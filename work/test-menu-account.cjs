const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('const angle=')[0];
const {game:g,context:ctx,get,elements}=new Function('require',prefix+'return {game,context,get,elements};')(require);
const events=new Map();
for(const id of ['memberGate','memberForm','memberClose','memberBack','memberRetrySave','memberEmail','memberPassword','memberSubmit','memberTitle','memberIntro','memberNotice','dialog'])get(id);
for(const [id,e]of elements){e.addEventListener=(name,fn)=>events.set(id+':'+name,fn);e.setAttribute=()=>{};e.focus=()=>{};e.value='';e.showModal=function(){for(const [key,other]of elements)if(key!==id&&['dialog','memberGate'].includes(key))assert(!other.open,'only one modal may be open');this.open=true;};e.close=function(){this.open=false;};}
const gate=get('memberGate'),tabs=['login','signup'].map(mode=>({dataset:{memberMode:mode},classList:{toggle(){}},setAttribute(){},addEventListener(name,fn){events.set(mode+':'+name,fn);}}));gate.querySelectorAll=()=>tabs;
let signedIn=null,authChange=()=>{},saved=[],signin=[],hold=null;
const auth={
 auth:{onAuthStateChange(fn){authChange=fn},getSession:async()=>({data:{session:null}}),async signInWithPassword(credentials){signin.push(credentials);if(hold)await hold;const user={id:'test-owner',email:credentials.email,user_metadata:{username:'ซูโม่'}};signedIn=user;authChange('SIGNED_IN',{user});return{data:{session:{user}}};},signOut:async()=>({})},
 from(){return {upsert(row){saved.push(row);return {select(){return {single:async()=>({data:{slot_id:row.slot_id}})};}};}};}
};
const member=fs.readFileSync('work/member-entry.js','utf8').replace(/^import .*\n/,'');
new Function('createClient','document','window','crypto','TextEncoder','fetch',member)(()=>auth,ctx.document,ctx.window,crypto.webcrypto,TextEncoder,async()=>({ok:true,json:async()=>({message:'ok'})}));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await settle();const initial=g.snapshot();
 // The exact reported sequence: Save -> Account -> Return must release both dialogs.
 get('menu').onclick();assert(get('dialog').open);get('saveMenu').onclick();assert(!get('dialog').open&&gate.open);
 get('accountQuick').onclick();assert(gate.open&&!get('dialog').open);
 events.get('memberGate:click')({target:get('memberPassword')});assert(gate.open,'click in login form must not dismiss');
 events.get('memberGate:click')({target:gate});assert(!gate.open&&!ctx.window.SMGameAuthLocked,'click outside login card dismisses');
 get('accountQuick').onclick();assert(gate.open);
 events.get('memberBack:click')();assert(!gate.open&&!ctx.window.SMGameAuthLocked);
 get('menu').onclick();get('menuClose').onclick();assert(!get('dialog').open);
 assert.equal(g.snapshot(),initial,'opening/closing menus preserves the guest city');
 assert(get('dialogContent').innerHTML.includes('class="smcity-report-list"')===false,'main menu must not inline report content');
 get('menu').onclick();assert(get('dialogContent').innerHTML.includes('id="reportMenu"'),'main menu contains Report');
 get('reportMenu').onclick();assert(get('dialogContent').innerHTML.includes('id="bugCaptureToggle"'),'Report opens the current vehicle bug-report controls');
 assert(get('dialogContent').innerHTML.includes('รายงานรถบัค'),'Report is labeled as vehicle-bug reporting');
 assert(get('dialogContent').innerHTML.includes('ส่งรายงานบัค'),'Report preserves the manual bug-report action');
 get('vehicleBugClose').onclick();assert(!get('dialog').open,'Bug-report back returns to the game');
 get('menu').onclick();get('menuClose').onclick();assert(!get('dialog').open);
 assert(g.dockItems('reports').some(x=>x.key==='cityReport'),'all report actions still available programmatically');
 // A guest clicking Save is prompted to sign up; successful signup auto-saves
 // the pending city and opens Save/Load with that save listed.
 ctx.window.SMGameAccount.listSaves=async()=>saved.map(s=>({id:s.slot_id,name:s.name,data:JSON.stringify(s.data),savedAt:Date.now()}));
 ctx.window.SMGameAccount.requestSaveLogin(initial,'เมืองทดสอบ');
 assert(gate.open&&!get('dialog').open);
 assert.equal(get('memberSubmit').textContent,'สมัครและบันทึกเกม');
 get('memberEmail').value='ซูโม่ น่ารัก 💜';get('memberPassword').value='example-password';
 await events.get('memberForm:submit')({preventDefault(){}});await settle();
 assert.equal(saved.length,1);assert.equal(saved[0].data.city,g.state.city);
 assert(!gate.open&&!ctx.window.SMGameAuthLocked);assert(signin[0].email.endsWith('@names.smcity.invalid'));
 assert(get('dialog').open,'after signup, Save/Load must open automatically');
 assert(get('dialogContent').innerHTML.includes('เซป/โหลด'),'post-registration screen is Save/Load');
 assert(get('dialogContent').innerHTML.includes('เมืองทดสอบ'),'just-created save is shown');
 assert.equal(g.snapshot(),initial,'registration and navigating to saved games must not change the city');
 // A delayed save list must not reopen after returning to play.
 let complete;ctx.window.SMGameAccount.listSaves=()=>new Promise(resolve=>complete=resolve);
 get('saveGameQuick').onclick();assert(get('dialog').open);get('saveLoadingClose').onclick();complete([]);await settle();assert(!get('dialog').open);
 console.log('Menu/account regression passed: one dialog, guest cancel, Unicode signup, pending save, stale requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
