import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const key='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
const hex=(v:Uint8Array)=>Array.from(v,b=>b.toString(16).padStart(2,'0')).join('');
const clean=(v:unknown,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const allowed=origin==='https://sumosk.github.io'||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'https://sumosk.github.io','Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(!allowed||req.method!=='POST'||req.headers.get('apikey')!==key)return reply(403,{message:'ไม่อนุญาต'});
 try{
  const token=req.headers.get('authorization')?.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1];
  if(!token)return reply(401,{message:'กรุณาเข้าสู่ระบบ'});
  const hash=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));
  const session=await db.from('smgame_simple_sessions').select('user_id,expires_at').eq('token_hash',hash).maybeSingle();
  if(session.error||!session.data||Date.parse(session.data.expires_at)<=Date.now())return reply(401,{message:'กรุณาเข้าสู่ระบบอีกครั้ง'});
  const account=await db.from('smgame_simple_accounts').select('id,username,legacy_auth_id,disabled').eq('id',session.data.user_id).maybeSingle();
  if(account.error||!account.data||account.data.disabled)return reply(401,{message:'บัญชีไม่พร้อมใช้งาน'});
  const uid=account.data.id;
  const role=account.data.legacy_auth_id===uid?await db.from('smgame_creator_roles').select('role').eq('user_id',uid).eq('role','developer').maybeSingle():null;
  if(role?.error)return reply(503,{message:'ตรวจสอบสิทธิ์ไม่สำเร็จ'});
  const dev=!!role?.data;
  const raw=await req.text();if(raw.length>310000)return reply(413,{message:'ข้อมูลใหญ่เกินไป'});
  let body;try{body=JSON.parse(raw)}catch{return reply(400,{message:'ข้อมูลไม่ถูกต้อง'})}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{message:'ข้อมูลไม่ถูกต้อง'});
  const action=body.action,admin=body.admin===true;
  if(admin&&!dev)return reply(403,{message:'เฉพาะผู้พัฒนา'});
  const peer=admin?String(body.accountId||''):uid;
  if(action==='unread'){
   const q=db.from('smgame_chat_messages').select('id',{count:'exact',head:true}).is('read_at',null);
   const r=await (dev?q.eq('sender','player'):q.eq('account_id',uid).eq('sender','developer'));
   if(r.error)throw r.error;return reply(200,{unread:r.count||0,developer:dev});
  }
  if(action==='inbox'){
   if(!dev)return reply(403,{message:'เฉพาะผู้พัฒนา'});
   const page=Math.max(0,Math.min(1000,Math.floor(Number(body.page)||0)));
   const r=await db.from('smgame_chat_threads').select('account_id,status,updated_at').order('updated_at',{ascending:false}).order('account_id').range(page*50,page*50+49);
   if(r.error)throw r.error;
   const ids=(r.data||[]).map(x=>x.account_id);
   const names=ids.length?await db.from('smgame_simple_accounts').select('id,username').in('id',ids):{data:[],error:null};
   if(names.error)throw names.error;
   const unread=await Promise.all(ids.map(id=>db.from('smgame_chat_messages').select('id',{count:'exact',head:true}).eq('account_id',id).eq('sender','player').is('read_at',null)));
   if(unread.some(x=>x.error))throw Error('unread');
   return reply(200,{threads:(r.data||[]).map((x,i)=>({...x,username:names.data?.find(a=>a.id===x.account_id)?.username||'ผู้เล่น',unread:unread[i].count||0})),more:ids.length===50});
  }
  if(!uuid.test(peer))return reply(400,{message:'เลือกบัญชีไม่ถูกต้อง'});
  if(action==='read'){
   let q=db.from('smgame_chat_messages').select('id,sender,category,body,image,game_version,game_day,created_at').eq('account_id',peer).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(25);
   if(body.before&&typeof body.before==='object'){
    const at=new Date(String(body.before.at)),id=String(body.before.id);
    if(!Number.isFinite(at.getTime())||!uuid.test(id))return reply(400,{message:'หน้าข้อมูลไม่ถูกต้อง'});
    const date=at.toISOString();q=q.or('created_at.lt.'+date+',and(created_at.eq.'+date+',id.lt.'+id+')');
   }
   const r=await q;if(r.error)throw r.error;
   const messages=r.data||[];
   if(messages.length){
    const ids=messages.filter(m=>m.sender===(admin?'player':'developer')).map(m=>m.id);
    if(ids.length){const mark=await db.from('smgame_chat_messages').update({read_at:new Date().toISOString()}).eq('account_id',peer).in('id',ids).is('read_at',null);if(mark.error)throw mark.error;}
   }
   const thread=await db.from('smgame_chat_threads').select('status').eq('account_id',peer).maybeSingle();
   if(thread.error)throw thread.error;return reply(200,{messages,more:messages.length===25,status:thread.data?.status||'open',developer:dev});
  }
  if(action==='send'){
   if(!uuid.test(String(body.id||'')))return reply(400,{message:'ข้อความไม่ถูกต้อง'});
   const message=clean(body.message,2000),image=typeof body.image==='string'?body.image:null;
   const category=['message','bug','idea'].includes(body.category)?body.category:'message';
   if(!message&&!image)return reply(400,{message:'กรอกข้อความหรือแนบภาพ'});
   if(image&&(image.length>300000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)))return reply(400,{message:'รูปภาพไม่ถูกต้องหรือใหญ่เกินไป'});
   if(admin){const t=await db.from('smgame_chat_threads').select('account_id').eq('account_id',peer).maybeSingle();if(t.error)throw t.error;if(!t.data)return reply(404,{message:'ไม่พบบทสนทนา'});}
   const r=await db.rpc('smgame_chat_send',{p_id:body.id,p_account:peer,p_actor:uid,p_sender:admin?'developer':'player',p_category:admin?'message':category,p_body:message,p_image:image,p_version:clean(body.version,80),p_day:clean(body.day,80)});
   if(r.error)throw r.error;return r.data==='rate'?reply(429,{message:'ส่งข้อความถี่เกินไป กรุณาลองใหม่ภายหลัง'}):reply(200,{ok:true});
  }
  if(action==='status'&&admin){
   if(!['open','resolved'].includes(body.status))return reply(400,{message:'สถานะไม่ถูกต้อง'});
   const r=await db.from('smgame_chat_threads').update({status:body.status}).eq('account_id',peer).select('account_id').maybeSingle();
   if(r.error)throw r.error;return r.data?reply(200,{ok:true}):reply(404,{message:'ไม่พบบทสนทนา'});
  }
  return reply(400,{message:'ไม่รู้จักคำสั่ง'});
 }catch(e){console.error('developer chat request failed',String(e));return reply(503,{message:'ระบบแชทไม่พร้อม กรุณาลองใหม่'});}
});
