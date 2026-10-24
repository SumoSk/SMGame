const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync('dist/game.js','utf8');
const logging=source.slice(source.indexOf('let incidentLogMemory='),source.indexOf('function resolveIncident('));
function boot({blocked=false,guest=false}={}){
 const disk=new Map(),sent=[],messages=[];
 let fail=false,release=null;
 const account={user:guest?null:{id:'owner'},async saveIncidentLog(entry){
  if(release)await new Promise(resolve=>release.push(resolve));
  if(fail)throw Error('offline');sent.push(entry);
 }};
 const api=new Function('localStorage','window','crypto','toast','console',
  "const INCIDENT_LOG_KEY='logs';"+logging+';return {writeManualIncidentLog,syncManualIncidentLogs,manualIncidentLogs};')(
  {getItem:k=>disk.get(k)||null,setItem:(k,v)=>{if(blocked)throw Error('quota');disk.set(k,v);}},
  {SMGameAccount:account},crypto,m=>messages.push(m),{warn(){}});
 return {...api,account,sent,messages,disk,setFail:value=>fail=value,hold:()=>release=[],release:()=>{const pending=release;release=null;pending.forEach(r=>r());}};
}
(async()=>{
 // A full/blocked browser cache must not prevent an authenticated upload.
 const blocked=boot({blocked:true});
 assert.equal(blocked.writeManualIncidentLog({at:'2026-10-24'}),false);
 await blocked.syncManualIncidentLogs();
 assert.equal(blocked.sent.length,1);assert.equal(blocked.manualIncidentLogs()[0].cloudSyncedFor,'owner');
 assert(blocked.messages.some(m=>m.includes('Supabase แล้ว')));
 await blocked.syncManualIncidentLogs();assert.equal(blocked.sent.length,1,'no repeated uploads without persistent storage');
 // Failed uploads remain retryable in memory and never report cloud success.
 const retry=boot({blocked:true});retry.setFail(true);retry.writeManualIncidentLog({});
 await retry.syncManualIncidentLogs();assert.equal(retry.sent.length,0);
 assert(retry.messages.some(m=>m.includes('ไม่สำเร็จ')));
 assert(!retry.manualIncidentLogs()[0].cloudSyncedFor);
 retry.setFail(false);await retry.syncManualIncidentLogs();assert.equal(retry.sent.length,1);
 // Empty syncs must release the lock; new events join an active upload queue.
 const concurrent=boot();await concurrent.syncManualIncidentLogs();concurrent.hold();
 concurrent.writeManualIncidentLog({});await Promise.resolve();
 const shared=concurrent.syncManualIncidentLogs();concurrent.writeManualIncidentLog({});
 assert.equal(concurrent.syncManualIncidentLogs(),shared);
 concurrent.release();await shared;assert.equal(concurrent.sent.length,2);
 // Guests retain their event for sign-in, and another account cannot send it.
 const guest=boot({blocked:true,guest:true});guest.writeManualIncidentLog({});
 await guest.syncManualIncidentLogs();assert.equal(guest.sent.length,0);
 guest.account.user={id:'owner'};await guest.syncManualIncidentLogs();assert.equal(guest.sent.length,1);
 const isolated=boot();isolated.setFail(true);isolated.writeManualIncidentLog({});await isolated.syncManualIncidentLogs();
 isolated.setFail(false);isolated.account.user={id:'different'};await isolated.syncManualIncidentLogs();assert.equal(isolated.sent.length,0);
 console.log('Incident Log sync passed: blocked storage, retry, concurrency, guest sign-in, account isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
