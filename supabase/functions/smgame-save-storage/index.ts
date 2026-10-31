import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

// Private, owner-checked save-file gateway; browser never receives a service key.
const url=Deno.env.get('SUPABASE_URL')!;
const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket='smcity-city-saves', index='smgame_save_objects', intents='smgame_save_upload_intents';
const publishable='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
const MAX_BYTES=15_000_000, MAX_ORIGINAL_BYTES=64_000_000;
const textEncoder=new TextEncoder();
const validOrigin=(origin:string|null)=>origin==='https://sumosk.github.io'||!!origin&&/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
const hex=(buf:ArrayBuffer)=>Array.from(new Uint8Array(buf),n=>n.toString(16).padStart(2,'0')).join('');
const sha=async(bytes:Uint8Array|string)=>hex(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?textEncoder.encode(bytes):bytes));
type Owner={kind:'simple'|'legacy';id:string};
const errorMessage=(e:unknown)=>e instanceof Error?e.message:String(e);

async function authenticate(token:string):Promise<Owner|null>{
 if(/^[a-f0-9]{64}$/i.test(token)){
  const digest=await sha(token);
  const {data:session,error}=await db.from('smgame_simple_sessions').select('user_id,expires_at').eq('token_hash',digest).maybeSingle();
  if(error||!session||new Date(session.expires_at).getTime()<=Date.now())return null;
  const {data:account,error:accountError}=await db.from('smgame_simple_accounts').select('disabled').eq('id',session.user_id).maybeSingle();
  if(accountError||!account||account.disabled)return null;
  return{kind:'simple',id:session.user_id};
 }
 if(token.length<80||token.length>5000)return null;
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user?.id)return null;
 return{kind:'legacy',id:data.user.id};
}
function validSlot(id:unknown):id is string{return typeof id==='string'&&id.length>0&&id.length<=120&&/^[a-zA-Z0-9_.:-]+$/.test(id);}
function validName(name:unknown):name is string{return typeof name==='string'&&name.trim().length>0&&name.trim().length<=80;}
function ownQuery(owner:Owner){return db.from(index).select('*').eq('owner_kind',owner.kind).eq('owner_id',owner.id);}
function previousVersion(row:Record<string,unknown>|null){return row?{
 path:row.object_path,bytes:row.stored_bytes,sha256:row.sha256,encoding:row.encoding
}:null;}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const cors={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':validOrigin(origin)?origin!:'https://sumosk.github.io','Access-Control-Allow-Headers':'apikey, authorization, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(code:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status:code,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(!validOrigin(origin))return reply(403,{message:'Invalid origin'});
 if(req.method!=='POST')return reply(405,{message:'Method not allowed'});
 if(req.headers.get('apikey')!==publishable)return reply(401,{message:'Application key required'});
 const bearer=req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]||'';
 let owner:Owner|null=null;
 try{owner=await authenticate(bearer);}catch(e){console.warn('Save authentication unavailable',errorMessage(e));return reply(503,{message:'ตรวจสอบบัญชีไม่ได้ กรุณาลองใหม่ค่ะ'});}
 if(!owner)return reply(401,{message:'กรุณาเข้าสู่ระบบอีกครั้งค่ะ'});
 let body:Record<string,unknown>;
 try{
  const raw=await req.text();
  if(raw.length>4096)return reply(413,{message:'คำขอใหญ่เกินไป'});
  body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('body');
 }catch{return reply(400,{message:'ข้อมูลคำขอไม่ถูกต้อง'});}
 const action=String(body.action||'');
 const legacyTable=owner.kind==='simple'?'smgame_simple_saves':'smgame_saves';
 try{
  if(action==='list'){
   const [{data:modern,error:modernError},{data:old,error:oldError}]=await Promise.all([
    db.from(index).select('slot_id,name,updated_at').eq('owner_kind',owner.kind).eq('owner_id',owner.id).order('updated_at',{ascending:false}).limit(200),
    db.from(legacyTable).select('slot_id,name,updated_at').eq('user_id',owner.id).order('updated_at',{ascending:false}).limit(200)
   ]);
   if(modernError||oldError)throw Error('อ่านรายการเซฟไม่ได้');
   const combined=new Map<string,{id:string;name:string;savedAt:number;source:string}>();
   for(const row of modern||[])combined.set(row.slot_id,{id:row.slot_id,name:row.name,savedAt:Date.parse(row.updated_at),source:'storage'});
   for(const row of old||[])if(!combined.has(row.slot_id))combined.set(row.slot_id,{id:row.slot_id,name:row.name,savedAt:Date.parse(row.updated_at),source:'legacy'});
   return reply(200,{saves:[...combined.values()].sort((a,b)=>b.savedAt-a.savedAt).slice(0,200)});
  }
  if(action==='prepare'){
   const slotId=body.slotId,encoding=body.encoding;
   if(!validSlot(slotId)||!['gzip','json'].includes(String(encoding)))return reply(400,{message:'รูปแบบเซฟไม่ถูกต้อง'});
   const since=new Date(Date.now()-60*60*1000).toISOString();
   const {count,error:countError}=await db.from(intents).select('path',{count:'exact',head:true})
     .eq('owner_kind',owner.kind).eq('owner_id',owner.id).is('completed_at',null).gte('created_at',since);
   if(countError)throw Error('ตรวจสอบจำนวนคำขอเซฟไม่ได้');
   if((count||0)>=12)return reply(429,{message:'มีคำขอเซฟที่ยังไม่เสร็จมากเกินไป กรุณาลองใหม่ภายหลังค่ะ'});
   const filename=crypto.randomUUID()+(encoding==='gzip'?'.json.gz':'.json');
   const path=owner.kind+'/'+owner.id+'/'+filename;
   const {data:signed,error:signError}=await db.storage.from(bucket).createSignedUploadUrl(path);
   if(signError||!signed?.token)throw Error('เตรียมพื้นที่เซฟไม่สำเร็จ');
   const {error:intentError}=await db.from(intents).insert({path,owner_kind:owner.kind,owner_id:owner.id,slot_id:slotId,encoding});
   if(intentError)throw Error('เตรียมสิทธิ์บันทึกไม่ได้');
   return reply(200,{path,token:signed.token,bucket,limit:MAX_BYTES});
  }
  if(action==='finish'){
   const slotId=body.slotId,name=body.name,path=body.path,encoding=body.encoding,bytes=Number(body.bytes),originalBytes=Number(body.originalBytes),checksum=body.sha256;
   if(!validSlot(slotId)||!validName(name)||typeof path!=='string'||!path.startsWith(owner.kind+'/'+owner.id+'/')||
      !['gzip','json'].includes(String(encoding))||!Number.isSafeInteger(bytes)||bytes<1||bytes>MAX_BYTES||
      !Number.isSafeInteger(originalBytes)||originalBytes<1||originalBytes>MAX_ORIGINAL_BYTES||
      typeof checksum!=='string'||!/^[a-f0-9]{64}$/.test(checksum))
    return reply(400,{message:'ข้อมูลเซฟไม่ถูกต้องหรือเกินขนาดที่รองรับ'});
   const {data:intent,error:intentError}=await db.from(intents).select('path,slot_id,encoding,completed_at')
      .eq('path',path).eq('owner_kind',owner.kind).eq('owner_id',owner.id).maybeSingle();
   if(intentError||!intent||intent.slot_id!==slotId||intent.encoding!==encoding||intent.completed_at)return reply(403,{message:'สิทธิ์อัปโหลดไม่ถูกต้อง'});
   const {data:file,error:downloadError}=await db.storage.from(bucket).download(path);
   if(downloadError||!file)throw Error('ยังไม่พบไฟล์เมืองที่อัปโหลด');
   const buffer=new Uint8Array(await file.arrayBuffer());
   if(buffer.byteLength!==bytes||buffer.byteLength>MAX_BYTES||await sha(buffer)!==checksum)return reply(422,{message:'ไฟล์เซฟไม่สมบูรณ์ กรุณาลองอีกครั้งค่ะ'});
   // Keep the previous committed version until the next successful replacement.
   const {data:prior,error:priorError}=await ownQuery(owner).eq('slot_id',slotId).maybeSingle();
   if(priorError)throw Error('ตรวจสอบเซฟเดิมไม่ได้');
   const prev=previousVersion(prior);
   const record={owner_kind:owner.kind,owner_id:owner.id,slot_id:slotId,name:name.trim(),object_path:path,
     stored_bytes:bytes,sha256:checksum,encoding,previous_path:prev?.path||null,
     previous_bytes:prev?.bytes||null,previous_sha256:prev?.sha256||null,previous_encoding:prev?.encoding||null,
     updated_at:new Date().toISOString()};
   const {error:writeError}=await db.from(index).upsert(record,{onConflict:'owner_kind,owner_id,slot_id'});
   if(writeError)throw Error('บันทึกดัชนีเซฟไม่สำเร็จ');
   await db.from(intents).update({completed_at:new Date().toISOString()}).eq('path',path);
   // Garbage-collect the *older* backup; the active and immediate prior versions survive.
   if(prior?.previous_path&&prior.previous_path!==path&&prior.previous_path!==prior.object_path)
     void db.storage.from(bucket).remove([prior.previous_path]).catch(()=>{});
   return reply(200,{slotId,verified:true,bytes});
  }
  if(action==='get'){
   const slotId=body.slotId;
   if(!validSlot(slotId))return reply(400,{message:'ระบุเซฟไม่ถูกต้อง'});
   const {data:entry,error:lookupError}=await ownQuery(owner).eq('slot_id',slotId).maybeSingle();
   if(lookupError)throw Error('อ่านข้อมูลเซฟไม่ได้');
   if(!entry){
    const {data:legacy,error:legacyError}=await db.from(legacyTable).select('slot_id').eq('user_id',owner.id).eq('slot_id',slotId).maybeSingle();
    if(legacyError)throw Error('ตรวจสอบเซฟเก่าไม่ได้');
    return legacy?reply(200,{legacy:true}):reply(404,{message:'ไม่พบเซฟนี้'});
   }
   const {data:signed,error:signError}=await db.storage.from(bucket).createSignedUrl(entry.object_path,120);
   if(signError||!signed?.signedUrl)throw Error('เตรียมดาวน์โหลดเซฟไม่ได้');
   return reply(200,{url:signed.signedUrl,encoding:entry.encoding,bytes:entry.stored_bytes,sha256:entry.sha256});
  }
  if(action==='delete'){
   const slotId=body.slotId;
   if(!validSlot(slotId))return reply(400,{message:'ระบุเซฟไม่ถูกต้อง'});
   const {data:current,error:findError}=await ownQuery(owner).eq('slot_id',slotId).maybeSingle();
   if(findError)throw Error('ตรวจสอบเซฟไม่ได้');
   const {data:old,error:oldError}=await db.from(legacyTable).select('slot_id').eq('user_id',owner.id).eq('slot_id',slotId).maybeSingle();
   if(oldError)throw Error('ตรวจสอบเซฟเก่าไม่ได้');
   if(!current&&!old)return reply(404,{message:'ไม่พบเซฟนี้'});
   if(current){
    const paths=[current.object_path,current.previous_path].filter((x):x is string=>typeof x==='string'&&x.length>0);
    const {error:removeError}=await db.storage.from(bucket).remove(paths);
    if(removeError)throw Error('ลบไฟล์เซฟไม่สำเร็จ');
    const {error:deleteError}=await db.from(index).delete().eq('owner_kind',owner.kind).eq('owner_id',owner.id).eq('slot_id',slotId);
    if(deleteError)throw Error('ลบดัชนีเซฟไม่สำเร็จ');
   }
   if(old){
    const {error:legacyError}=await db.from(legacyTable).delete().eq('user_id',owner.id).eq('slot_id',slotId);
    if(legacyError)throw Error('ลบเซฟเก่าไม่สำเร็จ');
   }
   return reply(200,{ok:true});
  }
  return reply(400,{message:'ไม่รู้จักคำสั่งเซฟ'});
 }catch(e){console.error('SMCITY Storage save error',action,errorMessage(e));return reply(503,{message:errorMessage(e)});}
});