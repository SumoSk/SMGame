import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const publicKey='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply(405,'ไม่รองรับคำขอนี้');
 // This public signup route accepts only the game's publishable API key.
 if(req.headers.get('apikey')!==publicKey)return reply(401,'ไม่อนุญาตคำขอนี้');
 try{
  const text=await req.text();if(text.length>4096)return reply(400,'ข้อมูลยาวเกินไป');
  const body=JSON.parse(text),username=typeof body.username==='string'?body.username.trim().normalize('NFC'):'';
  const password=typeof body.password==='string'?body.password:'';
  if(!username||username.length>80||password.length<6||password.length>256)return reply(400,'กรอกชื่อผู้ใช้ไม่เกิน 80 ตัวอักษร และรหัสผ่าน 6–256 ตัวอักษร');
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const ip=req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
  for(const [key,limit]of [['global',60],['ip:'+await hash(ip),5]] as const){
   const {data,error}=await admin.rpc('smgame_allow_signup',{bucket_key:key,bucket_limit:limit});
   if(error)return reply(503,'ระบบสมัครสมาชิกไม่พร้อม กรุณาลองอีกครั้ง');
   if(!data)return reply(429,'สมัครสมาชิกถี่เกินไป กรุณาลองใหม่ภายหลัง');
  }
  const email='u-'+await hash(username.toLowerCase())+'@names.smcity.invalid';
  // Only synthetic game identities are auto-confirmed. Existing email accounts
  // and the shared project's email-confirmation setting are untouched.
  const {error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,app:'smcity'}});
  if(error)return reply(error.status===422?409:400,'สมัครไม่สำเร็จ ชื่อนี้อาจถูกใช้แล้ว กรุณาเปลี่ยนชื่อหรือลองเข้าสู่ระบบ');
  return reply(200,'สมัครสมาชิกแล้ว');
 }catch{return reply(400,'ข้อมูลสมัครสมาชิกไม่ถูกต้อง');}
});
