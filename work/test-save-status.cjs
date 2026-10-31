require('./test-dom-compat.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-saves.cjs','utf8').split('(async()=>{')[0];
const {game:g,get,clientWindow:w}=new Function('require',prefix+'return boot();')(require);
let resolve,reject,requests=[];
w.SMGameAccount={user:{id:'player'},async listSaves(){return[{id:'old',name:'เมืองเดิม',savedAt:Date.now()}];},
 save(name,id,data){requests.push({name,id,data});return new Promise((yes,no)=>{resolve=yes;reject=no;});}};
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
async function panel(){get('menu').onclick();await get('saveMenu').onclick();}
(async()=>{
 await panel();get('onlineSaveName').value='เมืองใหม่';
 const first=get('onlineCreate').onclick();
 assert(get('dialogContent').innerHTML.includes('กำลังบันทึก'));
 await flush();assert.equal(requests.length,1);
 const duplicate=get('onlineCreate').onclick();await duplicate;
 assert.equal(requests.length,1,'never send duplicate writes while saving');
 resolve();await first;
 assert(get('dialogContent').innerHTML.includes('บันทึกสำเร็จ'));
 assert(get('dialogContent').innerHTML.includes('เซิร์ฟเวอร์ยืนยัน'));
 await panel();get('onlineOverwrite0').onclick();get('confirmDialog').onclick();
 assert(get('dialogContent').innerHTML.includes('กำลังบันทึก'));
 await flush();assert.equal(requests[1].id,'old');
 reject(new Error('connection lost'));await flush();
 assert(get('dialogContent').innerHTML.includes('บันทึกไม่สำเร็จ'));
 assert(get('dialogContent').innerHTML.includes('connection lost'));
 const original=requests[1];g.state.money=12;
 const retry=get('cloudSaveRetry').onclick();
 await flush();assert.equal(requests[2].id,original.id);assert.equal(requests[2].data,original.data,'retry exactly the failed snapshot');
 get('cloudSaveBack').onclick();await panel();
 assert(get('dialogContent').innerHTML.includes('กำลังบันทึก'),'reopening shows the running write');
 resolve();await retry;
 assert(get('dialogContent').innerHTML.includes('บันทึกสำเร็จ'));
 console.log('PASS: visible pending/success/error, overwrite progress, duplicate prevention, exact retry and reopening during save');
})().catch(e=>{console.error(e);process.exitCode=1;});
