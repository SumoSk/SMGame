// Compact developer chat; never runs inside the simulation or render loop.
(()=>{
 const bar=document.getElementById('cityAdvisorTicker'),button=document.getElementById('developerChatOpen'),badge=document.getElementById('developerChatBadge');
 if(!bar||!button||!badge)return;
 const endpoint='https://jeqbyhzbpivscsduwkcj.supabase.co/functions/v1/smgame-developer-chat';
 const key='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
 const dialog=document.createElement('dialog');dialog.id='developerChatDialog';dialog.setAttribute('aria-label','แชทกับผู้พัฒนา');
 dialog.innerHTML='<header><strong id="dcTitle">แชทกับผู้พัฒนา</strong><button id="dcClose" type="button" aria-label="ปิดแชท">×</button></header><div id="dcNav"><button id="dcBack" type="button" hidden>‹ กล่องข้อความ</button><button id="dcAdmin" type="button" hidden>กล่องข้อความผู้พัฒนา</button><button id="dcRefresh" type="button">รีเฟรช</button><button id="dcResolve" type="button" hidden></button></div><p id="dcStatus" role="status" aria-live="polite"></p><div id="dcInbox" hidden></div><button id="dcMore" type="button" hidden>ดูข้อความก่อนหน้า</button><div id="dcMessages" aria-live="off"></div><form id="dcForm"><select id="dcCategory" aria-label="ประเภทข้อความ"><option value="message">ข้อความทั่วไป</option><option value="bug">แจ้งบัค</option><option value="idea">เสนอไอเดีย</option></select><textarea id="dcText" maxlength="2000" rows="3" placeholder="ฝากข้อความถึงผู้พัฒนา…" aria-label="ข้อความ"></textarea><div class="dc-actions"><label>แนบภาพ<input id="dcImage" type="file" accept="image/jpeg,image/png,image/webp"></label><span id="dcAttachment"></span><button id="dcSend" type="submit">ส่งข้อความ</button></div></form><small>ข้อความเป็นส่วนตัว ผู้พัฒนาจะตอบกลับเมื่อสะดวก</small>';
 document.body.appendChild(dialog);
 const css=document.createElement('style');css.textContent=`
 body>.bottom>#cityAdvisorTicker{width:296px;max-width:calc(100vw - 24px)}
 #developerChatOpen{border:0;justify-content:flex-start;width:100%;margin:0}
 #developerChatBadge{margin-left:auto;min-width:17px;text-align:center;border-radius:8px;font-size:9px;background:#1679b7;color:#fff;padding:0 3px}
 #developerChatBadge[hidden],#developerChatDialog [hidden]{display:none!important}
 #developerChatDialog{box-sizing:border-box;position:fixed;inset:auto 12px 42px auto;margin:0;width:min(400px,calc(100vw - 24px));max-width:calc(100vw - 24px);max-height:min(650px,calc(100dvh - 60px));padding:12px;background:#f6fbff;color:#194761;border:1px solid #91c7e3;border-radius:13px;box-shadow:0 8px 35px #15364944;font:12px/1.5 "Noto Sans Thai",Tahoma,sans-serif;overflow:auto}
 #developerChatDialog[open]{display:flex;flex-direction:column;gap:7px}
 #developerChatDialog::backdrop{background:#0003}
 #developerChatDialog header,#dcNav,.dc-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
 #developerChatDialog header strong{flex:1;font-size:14px}
 #developerChatDialog header button{margin-left:auto}
 #developerChatDialog button,#developerChatDialog select,#developerChatDialog textarea{font:inherit;color:inherit;border:1px solid #bad5e6;border-radius:7px;background:#fff;padding:5px 8px}
 #developerChatDialog button{cursor:pointer;touch-action:manipulation}
 #developerChatDialog button:disabled{opacity:.5;cursor:default}
 #dcStatus{margin:0;min-height:16px;color:#5c6f7d;font-size:11px}
 #dcMessages,#dcInbox{min-height:60px;max-height:35dvh;overflow:auto;overscroll-behavior:contain}
 #dcMessages{display:flex;flex-direction:column;gap:8px}
 #dcMessages article{padding:7px 9px;max-width:88%;border-radius:10px;background:#e6eff5;align-self:flex-start;overflow-wrap:anywhere}
 #dcMessages article.mine{align-self:flex-end;background:#d9f0ff}
 #dcMessages article p{white-space:pre-wrap;margin:2px 0}
 #dcMessages article small{display:block;font-size:10px;color:#5c6f7d}
 #dcMessages img{display:block;width:auto;max-width:100%;max-height:180px;object-fit:contain;border-radius:7px;margin-top:5px}
 #dcInbox button{display:block;width:100%;text-align:left;margin:0 0 4px}
 #dcForm{display:grid;gap:6px}
 #dcText{width:100%;box-sizing:border-box;resize:vertical;min-height:54px}
 .dc-actions label{display:inline-flex;cursor:pointer;border:1px solid #bad5e6;padding:5px 7px;border-radius:6px;position:relative;overflow:hidden}
 #dcImage{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
 #dcAttachment{flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #dcSend{background:#1978b5!important;color:#fff!important}
 :root.smcity-gray-ui #developerChatDialog{background:#171d23;color:#eff7ff;border-color:#566c7b}
 :root.smcity-gray-ui #developerChatDialog button,:root.smcity-gray-ui #developerChatDialog select,:root.smcity-gray-ui #developerChatDialog textarea{background:#29333d;color:#eff7ff;border-color:#566c7b}
 :root.smcity-gray-ui #dcMessages article{background:#283746}
 :root.smcity-gray-ui #dcMessages article.mine{background:#244a65}
 :root.smcity-gray-ui #dcStatus,:root.smcity-gray-ui #dcMessages article small{color:#b7cbd8}
 `;document.head.appendChild(css);
 const $=id=>dialog.querySelector('#'+id),token=()=>window.SMGameSimpleSessionToken?.()||null;
 let mode='player',peer=null,threadStatus='open',cursor=null,inboxPage=0,revision=0,working=false,dev=false,attachment=null,sendId=null,lastToken=null;
 const status=t=>{$('dcStatus').textContent=t||'';};
 const updateBadge=n=>{const x=Math.max(0,Number(n)||0);badge.hidden=!x;badge.textContent=x>99?'99+':String(x);};
 async function request(action,fields={}){
  const session=token();if(!session)throw Error('กรุณาเข้าสู่ระบบ');
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+session},body:JSON.stringify({action,...fields}),signal:ac.signal});
   const data=await r.json();if(session!==token())throw Error('บัญชีเปลี่ยน กรุณาเปิดแชทใหม่');
   if(!r.ok)throw Error(data.message||'เชื่อมต่อไม่สำเร็จ');return data;
  }finally{clearTimeout(timer);}
 }
 let polling=false;
 async function unread(){
  if(document.hidden||polling)return;
  const session=token();
  if(!session){updateBadge(0);dev=false;return;}
  polling=true;try{const d=await request('unread');dev=d.developer===true;updateBadge(d.unread);if(dialog.open)$('dcAdmin').hidden=!dev||mode!=='player';}catch{}finally{polling=false;}
 }
 function switchMode(next,id=null){mode=next;peer=id;cursor=null;revision++;$('dcMessages').replaceChildren();$('dcInbox').replaceChildren();$('dcMore').hidden=true;$('dcInbox').hidden=next!=='inbox';$('dcMessages').hidden=next==='inbox';$('dcForm').hidden=next==='inbox';$('dcCategory').hidden=next==='admin';$('dcBack').hidden=next!=='admin'&&next!=='inbox';$('dcBack').textContent=next==='inbox'?'‹ แชทของฉัน':'‹ กล่องข้อความ';$('dcAdmin').hidden=!(dev&&next==='player');$('dcResolve').hidden=next!=='admin';$('dcTitle').textContent=next==='inbox'?'กล่องข้อความผู้พัฒนา':'แชทกับผู้พัฒนา';$('dcText').value='';$('dcImage').value='';$('dcAttachment').textContent='';attachment=null;sendId=null;}
 function scope(){return mode==='admin'?{admin:true,accountId:peer}:{};}
 const names={message:'ข้อความ',bug:'แจ้งบัค',idea:'เสนอไอเดีย'};
 function message(m){
  const item=document.createElement('article'),mine=(mode==='admin'?m.sender==='developer':m.sender==='player');
  if(mine)item.className='mine';
  const meta=document.createElement('small');meta.textContent=(m.sender==='developer'?'ผู้พัฒนา':'ผู้เล่น')+' · '+(names[m.category]||'ข้อความ')+' · '+new Date(m.created_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'});item.append(meta);
  if(m.body){const p=document.createElement('p');p.textContent=m.body;item.append(p);}
  if(typeof m.image==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(m.image)){const img=document.createElement('img');img.src=m.image;img.alt='ภาพแนบ';img.loading='lazy';item.append(img);}
  if(m.category==='bug'&&(m.game_version||m.game_day)){const info=document.createElement('small');info.textContent=[m.game_version,m.game_day].filter(Boolean).join(' · ');item.append(info);}
  return item;
 }
 async function read(older=false){
  if(working||mode==='inbox')return;
  const rev=revision,session=token();working=true;status('กำลังโหลดข้อความ…');
  try{
   const d=await request('read',{...scope(),...(older&&cursor?{before:cursor}:{})});
   if(rev!==revision||session!==token()||!dialog.open)return;
   dev=d.developer===true;threadStatus=d.status;$('dcAdmin').hidden=!(dev&&mode==='player');
   $('dcResolve').textContent=threadStatus==='resolved'?'เปิดเรื่องอีกครั้ง':'ทำเครื่องหมายว่าแก้ไขแล้ว';
   const rows=d.messages||[],box=$('dcMessages'),oldHeight=box.scrollHeight;
   const frag=document.createDocumentFragment();for(const m of [...rows].reverse())frag.append(message(m));
   if(older)box.prepend(frag);else box.replaceChildren(frag);
   if(rows.length){const m=rows[rows.length-1];cursor={at:m.created_at,id:m.id};}
   $('dcMore').hidden=!d.more;
   if(older)box.scrollTop+=box.scrollHeight-oldHeight;else box.scrollTop=box.scrollHeight;
   status(rows.length?(threadStatus==='resolved'?'ดำเนินการเรียบร้อยแล้ว':''):'ยังไม่มีข้อความ เริ่มสนทนาได้เลย');
   void unread();
  }catch(e){if(rev===revision)status(e.message||'โหลดข้อความไม่สำเร็จ');}
  finally{working=false;}
 }
 async function inbox(page=0){
  if(working)return;
  const rev=revision;working=true;status('กำลังโหลดกล่องข้อความ…');
  try{
   const d=await request('inbox',{page});if(rev!==revision||!dialog.open)return;
   inboxPage=page;const box=$('dcInbox');box.replaceChildren();
   for(const t of d.threads||[]){const b=document.createElement('button');b.type='button';b.textContent=t.username+' · '+(t.status==='resolved'?'แก้ไขแล้ว':'เปิดอยู่')+(t.unread?' · ใหม่ '+t.unread:'');b.onclick=()=>{if(working)return;switchMode('admin',t.account_id);$('dcTitle').textContent=t.username;void read();};box.append(b);}
   for(const [show,label,p] of [[page>0,'‹ ก่อนหน้า',page-1],[d.more,'ถัดไป ›',page+1]])if(show){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>void inbox(p);box.append(b);}
   status(d.threads?.length?'':'ยังไม่มีข้อความจากผู้เล่น');
  }catch(e){if(rev===revision)status(e.message||'โหลดไม่สำเร็จ');}finally{working=false;}
 }
 async function open(){
  if(!token()){window.SMGameAccount?.openSignIn?.();return;}
  if(working)return;
  lastToken=token();switchMode('player');if(!dialog.open)dialog.showModal();await read();
 }
 button.onclick=()=>void open();
 $('dcClose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{revision++;$('dcMessages').replaceChildren();$('dcInbox').replaceChildren();$('dcText').value='';attachment=null;sendId=null;});
 for(const event of ['keydown','keyup','pointerdown','pointerup','wheel'])dialog.addEventListener(event,e=>e.stopPropagation());
 $('dcAdmin').onclick=()=>{if(!working){switchMode('inbox');void inbox();}};
 $('dcBack').onclick=()=>{if(working)return;if(mode==='admin'){switchMode('inbox');void inbox(inboxPage);}else{switchMode('player');void read();}};
 $('dcMore').onclick=()=>void read(true);
 $('dcRefresh').onclick=()=>mode==='inbox'?void inbox(inboxPage):void read();
 $('dcResolve').onclick=async()=>{if(working||mode!=='admin')return;working=true;try{await request('status',{...scope(),status:threadStatus==='resolved'?'open':'resolved'});}catch(e){status(e.message);working=false;return;}working=false;void read();};
 $('dcText').addEventListener('input',()=>{sendId=null;});
 $('dcCategory').addEventListener('change',()=>{sendId=null;});
 $('dcImage').addEventListener('change',async e=>{
  attachment=null;sendId=null;const file=e.target.files?.[0];if(!file)return;
  const rev=revision;
  if(file.size>15*1024*1024){status('ไฟล์ภาพเกิน 15 MB');e.target.value='';return;}
  const u=URL.createObjectURL(file);$('dcSend').disabled=true;
  try{
   const im=new Image();im.src=u;await im.decode();
   const canvas=document.createElement('canvas'),ratio=Math.min(1,1400/Math.max(im.width,im.height));
   canvas.width=Math.max(1,Math.floor(im.width*ratio));canvas.height=Math.max(1,Math.floor(im.height*ratio));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);
   let data='';for(let q=.8;q>=.25;q-=.1){data=canvas.toDataURL('image/jpeg',q);if(data.length<=300000)break;}
   if(data.length>300000)throw Error('รูปภาพยังใหญ่เกินไป กรุณาเลือกภาพอื่น');
   if(rev!==revision)return;attachment=data;$('dcAttachment').textContent='แนบภาพแล้ว';status('');
  }catch(e){if(rev===revision){e.target.value='';$('dcAttachment').textContent='';status(e.message||'เปิดรูปไม่ได้');}}finally{URL.revokeObjectURL(u);$('dcSend').disabled=false;}
 });
 $('dcForm').addEventListener('submit',async e=>{
  e.preventDefault();if(working||$('dcSend').disabled||mode==='inbox')return;
  const message=$('dcText').value.trim();if(!message&&!attachment){status('กรอกข้อความหรือแนบภาพก่อนค่ะ');return;}
  const rev=revision;working=true;$('dcSend').disabled=true;status('กำลังส่ง…');sendId??=crypto.randomUUID();
  try{
   await request('send',{...scope(),id:sendId,message,image:attachment,category:$('dcCategory').value,version:document.documentElement.dataset.uiVersion||'',day:document.getElementById('day')?.textContent||''});
   if(rev!==revision)return;$('dcText').value='';$('dcImage').value='';$('dcAttachment').textContent='';attachment=null;sendId=null;
  }catch(e){if(rev===revision)status(e.message||'ส่งข้อความไม่สำเร็จ');return;}
  finally{working=false;$('dcSend').disabled=false;}
  if(rev===revision)void read();
 });
 const timer=setInterval(()=>{
  if(token()!==lastToken){if(dialog.open)dialog.close();lastToken=token();updateBadge(0);dev=false;}
  void unread();
 },60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void unread();});
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 void unread();
})();
