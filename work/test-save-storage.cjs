const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const code=fs.readFileSync('dist/save-storage.js','utf8');
(async()=>{
 let stored=null, failUpload=false, legacy='{"format":2,"city":"phuket"}';
 const account={user:{id:'test-player'},async save(){throw Error('Do not write JSON to SQL')},
  async listSaves(){return[]},async getSave(){return legacy},async deleteSave(){throw Error('Do not use legacy delete')}};
 const fetch=async(url,request)=>{
  if(url==='https://signed-object')return{ok:true,arrayBuffer:async()=>stored.arrayBuffer()};
  const args=JSON.parse(request.body);
  const ok=obj=>({ok:true,json:async()=>obj});
  if(args.action==='prepare')return ok({bucket:'smcity-city-saves',path:'simple/test/one.json',token:'signed',limit:15000000});
  if(args.action==='finish'){assert.equal(args.bytes,stored.size);assert.equal(args.name,'เมือง');return ok({slotId:args.slotId,verified:true});}
  if(args.action==='get'){
   if(args.slotId==='old')return ok({legacy:true});
   const bytes=new Uint8Array(await stored.arrayBuffer());
   const sha=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
   return ok({url:'https://signed-object',bytes:stored.size,encoding:'json',sha256:sha});
  }
  if(args.action==='list')return ok({saves:[{id:'modern',name:'เมือง',savedAt:1,source:'storage'}]});
  if(args.action==='delete')return ok({ok:true});
  throw Error('Unexpected action '+args.action);
 };
 const sandbox={window:{SMGameAccount:account,SMGameSimpleSessionToken:()=>('a'.repeat(64)),SMGameCloudUploadSigned:async(_path,_token,blob)=>{if(failUpload)throw Error('upload failed');stored=blob;}},TextEncoder,TextDecoder,Blob,crypto:webcrypto,fetch,atob,btoa,console,AbortController,setTimeout,clearTimeout};
 vm.runInNewContext(code,sandbox);
 assert.equal(sandbox.window.SMGameStorageSavesReady,true);
 const raw='{"format":2,"city":"london","money":123}';
 await account.save('เมือง','modern',raw);
 assert.equal(await account.getSave('modern'),raw);
 assert.equal(await account.getSave('old'),legacy);
 assert.equal((await account.listSaves())[0].id,'modern');
 failUpload=true;await assert.rejects(()=>account.save('เมือง','modern',raw),/upload failed/);
 failUpload=false;await account.deleteSave('modern');
 console.log('PASS: owner-authenticated file upload, hash-checked load, legacy read-through and failed-upload protection');
})().catch(err=>{console.error(err);process.exitCode=1});
