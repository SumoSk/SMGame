/* SMCITY verified private Supabase Storage saves. Loaded after both account adapters.
   Legacy JSON database saves remain readable until their owners overwrite them. */
(()=>{
 const api=window.SMGameAccount;
 if(!api||typeof api.save!=='function'||window.SMGameStorageSavesReady)return;
 const endpoint='https://jeqbyhzbpivscsduwkcj.supabase.co/functions/v1/smgame-save-storage';
 const pub='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
 const old={getSave:api.getSave.bind(api)};
 const bucket='smcity-city-saves',maxBytes=15000000;
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 async function token(){
  const simple=window.SMGameSimpleSessionToken?.();
  if(simple)return simple;
  const legacy=await window.SMGameLegacyAccessToken?.();
  if(!legacy)throw Error('กรุณาเข้าสู่ระบบอีกครั้งค่ะ');
  return legacy;
 }
 async function request(action,values={}){
  const bearer=await token();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:pub,Authorization:'Bearer '+bearer},body:JSON.stringify({action,...values}),signal:controller.signal,cache:'no-store'});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.message||'เซิร์ฟเวอร์เซฟเกมตอบกลับ '+response.status);
   return result;
  }catch(error){
   if(error?.name==='AbortError')throw Error('เซิร์ฟเวอร์ไม่ตอบภายใน 45 วินาที เซฟเดิมยังไม่ถูกเขียนทับค่ะ');
   throw error;
  }finally{clearTimeout(timer);}
 }
 async function sha256(bytes){
  const b=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
  return Array.from(hash,n=>n.toString(16).padStart(2,'0')).join('');
 }
 function toBase64(bytes){
  let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(text);
 }
 function fromBase64(value){
  const binary=atob(value),result=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)result[i]=binary.charCodeAt(i);
  return result;
 }
 function payload(serialized){
  if(typeof serialized!=='string'||serialized.length<4)throw Error('ข้อมูลเซฟไม่ถูกต้อง');
  const parsed=JSON.parse(serialized);
  let blob,encoding;
  if(parsed?.__smcityPacked==='smcity-gzip-json-v1'&&typeof parsed.payload==='string'){
   blob=new Blob([fromBase64(parsed.payload)],{type:'application/gzip'});encoding='gzip';
  }else if(parsed?.format===2){
   blob=new Blob([serialized],{type:'application/json'});encoding='json';
  }else throw Error('รูปแบบเซฟไม่รองรับ');
  if(blob.size<1||blob.size>maxBytes)throw Error('ไฟล์เซฟใหญ่เกิน 15 MB หลังบีบอัด กรุณาดาวน์โหลดเมืองสำรองก่อนค่ะ');
  return{blob,encoding,originalBytes:encoder.encode(serialized).length};
 }
 api.save=async(name,slotId,serialized)=>{
  const ownerId=api.user?.id;
  if(!ownerId)throw Error('กรุณาเข้าสู่ระบบก่อนเซฟค่ะ');
  if(typeof name!=='string'||!name.trim()||typeof slotId!=='string'||!slotId)throw Error('ชื่อเซฟไม่ถูกต้อง');
  const {blob,encoding,originalBytes}=payload(serialized);
  const bytes=blob.size,sha=await sha256(await blob.arrayBuffer());
  const signed=await request('prepare',{slotId,encoding});
  if(ownerId!==api.user?.id)throw Error('บัญชีผู้ใช้เปลี่ยนระหว่างเซฟ');
  if(signed.bucket!==bucket||!signed.path||!signed.token||signed.limit<bytes)throw Error('ระบบเซฟไม่ได้รับสิทธิ์อัปโหลดที่ถูกต้อง');
  if(typeof window.SMGameCloudUploadSigned!=='function')throw Error('ระบบส่งไฟล์ยังไม่พร้อม กรุณาสำรองเมืองก่อนรีเฟรชเกมค่ะ');
  await window.SMGameCloudUploadSigned(signed.path,signed.token,blob);
  if(ownerId!==api.user?.id)throw Error('บัญชีผู้ใช้เปลี่ยนระหว่างเซฟ');
  const receipt=await request('finish',{name:name.trim(),slotId,path:signed.path,encoding,bytes,originalBytes,sha256:sha});
  if(!receipt.verified||receipt.slotId!==slotId)throw Error('เซิร์ฟเวอร์ยังไม่ยืนยันว่าเซฟสมบูรณ์ค่ะ');
  return true;
 };
 api.listSaves=async()=>{
  const result=await request('list');
  if(!Array.isArray(result.saves))throw Error('รายการเซฟไม่ถูกต้อง');
  return result.saves.map(s=>({id:s.id,name:s.name,savedAt:s.savedAt,source:s.source}));
 };
 api.getSave=async slotId=>{
  const ownerId=api.user?.id,result=await request('get',{slotId});
  if(result.legacy)return old.getSave(slotId);
  if(typeof result.url!=='string'||!['gzip','json'].includes(result.encoding)||!Number.isSafeInteger(result.bytes)||result.bytes<1||result.bytes>maxBytes||!/^[a-f0-9]{64}$/.test(result.sha256||''))throw Error('เซิร์ฟเวอร์ส่งข้อมูลไฟล์เซฟไม่ถูกต้อง');
  const response=await fetch(result.url,{cache:'no-store'});
  if(!response.ok)throw Error('ดาวน์โหลดเซฟไม่สำเร็จ ('+response.status+')');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==result.bytes||await sha256(bytes)!==result.sha256)throw Error('ไฟล์เซฟไม่ครบหรือเสียหาย จึงไม่โหลดทับเมืองที่กำลังเล่นค่ะ');
  if(ownerId!==api.user?.id)throw Error('บัญชีผู้ใช้เปลี่ยนระหว่างโหลด');
  if(result.encoding==='gzip')return JSON.stringify({__smcityPacked:'smcity-gzip-json-v1',payload:toBase64(bytes)});
  const raw=decoder.decode(bytes);
  if(JSON.parse(raw)?.format!==2)throw Error('ข้อมูลเมืองไม่ถูกต้อง');
  return raw;
 };
 api.deleteSave=async slotId=>{
  const result=await request('delete',{slotId});
  if(!result.ok)throw Error('ลบเซฟไม่สำเร็จ');
  return true;
 };
 window.SMGameStorageSavesReady=true;
})();
