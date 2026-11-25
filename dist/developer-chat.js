// Compact developer chat; never runs inside the simulation or render loop.
(()=>{
 const button=document.getElementById('developerChatOpen'),badge=document.getElementById('developerChatBadge');
 if(!button||!badge)return;
 const endpoint='https://jeqbyhzbpivscsduwkcj.supabase.co/functions/v1/smgame-developer-chat';
 const key='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
 const dialog=document.createElement('dialog');dialog.id='developerChatDialog';dialog.setAttribute('aria-label','แชทกับผู้พัฒนา');
 dialog.innerHTML="<header><span class=\"dc-avatar\" aria-hidden=\"true\">💬</span><div class=\"dc-heading\"><strong id=\"dcTitle\">แชทกับผู้พัฒนา</strong><small>SMCITY · ข้อความส่วนตัว</small></div><button id=\"dcClose\" type=\"button\" aria-label=\"หุบแชท\" title=\"หุบแชท\">⌄</button></header><div id=\"dcNav\"><button id=\"dcBack\" type=\"button\" hidden>‹ กล่องข้อความ</button><button id=\"dcAdmin\" type=\"button\" hidden>กล่องข้อความผู้พัฒนา</button><button id=\"dcRefresh\" type=\"button\" aria-label=\"รีเฟรชข้อความ\" title=\"รีเฟรชข้อความ\">↻</button><button id=\"dcResolve\" type=\"button\" hidden></button></div><p id=\"dcStatus\" role=\"status\" aria-live=\"polite\"></p><div id=\"dcInbox\" hidden></div><button id=\"dcMore\" type=\"button\" hidden>ดูข้อความก่อนหน้า</button><div id=\"dcMessages\" aria-live=\"off\"></div><form id=\"dcForm\"><div class=\"dc-options\"><select id=\"dcCategory\" aria-label=\"ประเภทข้อความ\"><option value=\"message\">ข้อความทั่วไป</option><option value=\"bug\">แจ้งบัค</option><option value=\"idea\">เสนอไอเดีย</option></select><span id=\"dcAttachment\"></span><button id=\"dcRemoveImage\" type=\"button\" hidden aria-label=\"เอาภาพแนบออก\">×</button></div><div class=\"dc-compose\"><label class=\"dc-photo\" title=\"แนบภาพ\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"4\"/><circle cx=\"8\" cy=\"9\" r=\"1.5\"/><path d=\"m3 17 5-4 4 3 4-6 5 7\"/></svg><input id=\"dcImage\" type=\"file\" accept=\"image/jpeg,image/png,image/webp\" aria-label=\"แนบภาพ\"></label><textarea id=\"dcText\" maxlength=\"2000\" rows=\"1\" placeholder=\"พิมพ์ข้อความ…\" aria-label=\"ข้อความ\"></textarea><button id=\"dcSend\" type=\"submit\" aria-label=\"ส่งข้อความ\" title=\"ส่งข้อความ\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M3.3 3.7a1 1 0 0 0-1.2 1.2l2.5 6.2 9.8.9-9.8.9-2.5 6.2a1 1 0 0 0 1.2 1.2l18-7.4a1 1 0 0 0 0-1.8z\"/></svg></button></div></form>";
 document.body.appendChild(dialog);
 const css=document.createElement('style');css.textContent=`
 #developerChatBadge{margin-left:auto;min-width:17px;text-align:center;border-radius:8px;font-size:9px;background:#1679b7;color:#fff;padding:0 3px}
 #developerChatBadge[hidden],#developerChatDialog [hidden]{display:none!important}
 #developerChatDialog{
 --dc-bg:#fff;--dc-ink:#101114;--dc-muted:#686b72;--dc-line:#e8e9ed;--dc-soft:#f0f2f5;--dc-incoming:#f0f1f3;--dc-blue:#0878f9;--dc-mine:#e5e7eb;
 box-sizing:border-box;position:fixed;inset:auto auto var(--dc-bottom,20px) 50%;transform:translateX(-50%);margin:0;width:min(380px,calc(100vw - 20px));height:min(460px,var(--dc-room,60dvh));max-width:calc(100vw - 20px);max-height:var(--dc-room,60dvh);padding:0;background:var(--dc-bg);color:var(--dc-ink);border:1px solid var(--dc-line);border-radius:14px;box-shadow:0 12px 38px #0004;font:400 13px/1.5 "Noto Sans Thai",Tahoma,sans-serif;overflow:hidden;overscroll-behavior:contain
 }
 #developerChatDialog[open]{display:flex;flex-direction:column;animation:dc-pop .16s ease-out}
 @keyframes dc-pop{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
 @media(prefers-reduced-motion:reduce){#developerChatDialog[open]{animation:none}}
 #developerChatDialog::backdrop{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 #developerChatDialog header{display:flex;align-items:center;gap:9px;padding:8px 12px;border-bottom:1px solid var(--dc-line);flex:none;min-width:0}
 #developerChatDialog .dc-avatar{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:50%;background:var(--dc-blue);color:#fff;font-size:16px}
 #developerChatDialog .dc-heading{display:flex;flex-direction:column;flex:1;min-width:0}
 #developerChatDialog .dc-heading strong{font-size:13px;font-weight:700;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
 #developerChatDialog .dc-heading small{font-size:10px;color:var(--dc-muted)}
 #developerChatDialog button,#developerChatDialog select,#developerChatDialog textarea{box-sizing:border-box;font:inherit;color:inherit;border:0;border-radius:9px;background:var(--dc-soft);padding:5px 8px}
 #developerChatDialog button{cursor:pointer;touch-action:manipulation}
 #developerChatDialog button:disabled{opacity:.45;cursor:default}
 #developerChatDialog button:focus-visible,#developerChatDialog select:focus-visible,#developerChatDialog textarea:focus-visible,#developerChatDialog .dc-photo:focus-within{outline:2px solid var(--dc-blue);outline-offset:1px}
 #developerChatDialog #dcClose,#developerChatDialog #dcRefresh,#developerChatDialog #dcSend{background:transparent;color:var(--dc-blue);display:grid;place-items:center;flex:none;padding:3px;width:34px;height:34px;border-radius:50%;font-size:23px}
 #developerChatDialog #dcClose:hover,#developerChatDialog #dcRefresh:hover,#developerChatDialog #dcSend:hover{background:var(--dc-soft)}
 #dcNav{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:2px 10px 0;flex:none}
 #dcNav button{font-size:10px;font-weight:600}
 #developerChatDialog #dcRefresh{margin-left:auto;width:28px;height:26px}
 #dcStatus{margin:0 12px 2px;color:var(--dc-muted);font-size:11px;flex:none;overflow-wrap:anywhere}
 #dcStatus:empty{display:none}
 #dcMessages,#dcInbox{flex:1 1 0;min-height:0;max-height:none;overflow:auto;overscroll-behavior:contain;padding:9px 12px;scrollbar-width:thin}
 #dcMessages{display:flex;flex-direction:column;gap:8px}
 #dcMessages article{display:flex;flex-direction:column;max-width:82%;align-self:flex-start;overflow-wrap:anywhere;flex-shrink:0}
 #dcMessages article.mine{align-self:flex-end}
 #dcMessages .dc-bubble{padding:7px 11px;border-radius:16px 16px 16px 4px;background:var(--dc-incoming);color:#000!important;width:fit-content;max-width:100%;box-sizing:border-box}
 #dcMessages article.mine .dc-bubble{background:var(--dc-mine);color:#000!important;border-radius:16px 16px 4px 16px;align-self:flex-end}
 #dcMessages article p{white-space:pre-wrap;margin:0;font-size:13px;line-height:1.5;color:#000!important}
 #dcMessages article small{display:block;font-size:9px;color:var(--dc-muted);padding:0 3px;margin-top:2px}
 #dcMessages article.mine>small{text-align:right}
 #dcMessages .dc-bubble small{color:#000!important;opacity:.9;padding:0;margin-top:3px}
 #dcMessages img{display:block;width:auto;max-width:100%;max-height:180px;object-fit:contain;border-radius:10px;margin:3px 0}
 #dcInbox button{display:block;width:100%;text-align:left;margin:0 0 5px;padding:10px;border-radius:10px;font-size:12px}
 #dcInbox button.dc-unread{font-weight:700;border-left:3px solid var(--dc-blue)}
 #developerChatDialog #dcMore{align-self:center;color:var(--dc-blue);background:transparent;font-size:10px;padding:2px 8px;flex:none}
 #dcForm{display:flex;flex-direction:column;gap:4px;padding:5px 9px 7px;border-top:1px solid var(--dc-line);flex:none}
 .dc-options,.dc-compose{display:flex;align-items:center;gap:5px;min-width:0}
 #developerChatDialog #dcCategory{font-size:10px;max-width:150px;padding:3px 7px;border-radius:12px}
 #developerChatDialog #dcText{flex:1;min-width:0;width:100%;min-height:34px;max-height:76px;resize:none;border-radius:20px;padding:7px 11px;background:#f4f4f5;color:#000!important;line-height:20px;font-size:13px}
 #dcText::placeholder{color:#666!important}
 #developerChatDialog .dc-photo{display:grid;place-items:center;flex:none;width:32px;height:34px;color:var(--dc-blue);cursor:pointer;position:relative;overflow:hidden;border-radius:50%}
 #developerChatDialog .dc-photo:hover{background:var(--dc-soft)}
 #dcImage{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
 #dcAttachment{flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dc-muted)}
 #dcRemoveImage{padding:1px 6px!important}
 :root.smcity-gray-ui #developerChatDialog{--dc-bg:#1c1e21;--dc-ink:#f5f6f7;--dc-muted:#b8bcc4;--dc-line:#373a40;--dc-soft:#303237;--dc-incoming:#f0f1f3;--dc-blue:#6aabff;--dc-mine:#e5e7eb}
 @media(max-width:520px){#developerChatDialog #dcText{font-size:16px}}
`;document.head.appendChild(css);
 const $=id=>dialog.querySelector('#'+id),token=()=>window.SMGameSimpleSessionToken?.()||null;
 let mode='player',peer=null,threadStatus='open',cursor=null,inboxPage=0,revision=0,working=false,dev=false,attachment=null,sendId=null,lastToken=null;
 const drafts=new Map();
 const draftKey=()=>mode==='admin'?'admin:'+peer:mode==='player'?'player':null;
 function saveDraft(){const k=draftKey();if(k&&lastToken&&token()===lastToken)drafts.set(k,{text:$('dcText').value,category:$('dcCategory').value,attachment,sendId});}
 function restoreDraft(){const d=drafts.get(draftKey());if(!d)return;$('dcText').value=d.text;$('dcCategory').value=d.category;attachment=d.attachment;sendId=d.sendId;$('dcAttachment').textContent=attachment?'แนบภาพแล้ว':'';$('dcRemoveImage').hidden=!attachment;}
 function positionChat(){if(!dialog.open)return;const rect=document.querySelector(".bottom").getBoundingClientRect(),vv=window.visualViewport,top=vv?.offsetTop||0,bottom=Math.min(rect.top-6,top+(vv?.height||innerHeight)-8);const available=bottom-top-8;const end=available>=210?bottom:top+(vv?.height||innerHeight)-8;dialog.style.setProperty('--dc-bottom',Math.max(0,innerHeight-end)+'px');dialog.style.setProperty('--dc-room',Math.max(80,end-top-8)+'px');}
 function resizeText(){const t=$('dcText');t.style.height='auto';t.style.height=Math.min(76,Math.max(34,t.scrollHeight))+'px';}
 const status=t=>{$('dcStatus').textContent=t||'';};
 function updateRole(isDeveloper){
  dev=isDeveloper===true;
  const label=dev?'กล่องข้อความผู้พัฒนา':'พิมพ์ข้อความถึงผู้พัฒนา…';
  button.setAttribute('aria-label',dev?'เปิดกล่องข้อความผู้พัฒนา':'เปิดแชทกับผู้พัฒนา');
  button.title=label;
 }
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
  if(!session){updateBadge(0);updateRole(false);return;}
  polling=true;try{const d=await request('unread');updateRole(d.developer===true);updateBadge(d.unread);if(dialog.open)$('dcAdmin').hidden=!dev||mode!=='player';}catch{}finally{polling=false;}
 }
 function switchMode(next,id=null){if(dialog.open)saveDraft();mode=next;peer=id;cursor=null;revision++;$('dcMessages').replaceChildren();$('dcInbox').replaceChildren();$('dcMore').hidden=true;$('dcInbox').hidden=next!=='inbox';$('dcMessages').hidden=next==='inbox';$('dcForm').hidden=next==='inbox';$('dcCategory').hidden=next==='admin';$('dcBack').hidden=next!=='admin'&&next!=='inbox';$('dcBack').textContent=next==='inbox'?'‹ แชทของฉัน':'‹ กล่องข้อความ';$('dcAdmin').hidden=!(dev&&next==='player');$('dcResolve').hidden=next!=='admin';$('dcTitle').textContent=next==='inbox'?'กล่องข้อความผู้พัฒนา':'แชทกับผู้พัฒนา';$('dcText').value='';$('dcImage').value='';$('dcAttachment').textContent='';$('dcRemoveImage').hidden=true;attachment=null;sendId=null;restoreDraft();resizeText();}
 function scope(){return mode==='admin'?{admin:true,accountId:peer}:{};}
 const names={message:'ข้อความ',bug:'แจ้งบัค',idea:'เสนอไอเดีย'};
 function message(m){
  const item=document.createElement('article'),mine=(mode==='admin'?m.sender==='developer':m.sender==='player');
  if(mine)item.className='mine';
  const bubble=document.createElement('div');bubble.className='dc-bubble';item.append(bubble);
  const meta=document.createElement('small');meta.textContent=(m.sender==='developer'?'ผู้พัฒนา':'ผู้เล่น')+' · '+(names[m.category]||'ข้อความ')+' · '+new Date(m.created_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'});
  if(m.body){const p=document.createElement('p');p.textContent=m.body;bubble.append(p);}
  if(typeof m.image==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(m.image)){const img=document.createElement('img');img.src=m.image;img.alt='ภาพแนบ';img.loading='lazy';bubble.append(img);}
  if(m.category==='bug'&&(m.game_version||m.game_day)){const info=document.createElement('small');info.textContent=[m.game_version,m.game_day].filter(Boolean).join(' · ');bubble.append(info);}
  item.append(meta);return item;
 }
 async function read(older=false){
  if(working||mode==='inbox')return;
  const rev=revision,session=token();working=true;status('กำลังโหลดข้อความ…');
  try{
   const d=await request('read',{...scope(),...(older&&cursor?{before:cursor}:{})});
   if(rev!==revision||session!==token()||!dialog.open)return;
   updateRole(d.developer===true);threadStatus=d.status;$('dcAdmin').hidden=!(dev&&mode==='player');
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
   for(const t of d.threads||[]){const b=document.createElement('button');b.type='button';if(t.unread)b.className='dc-unread';b.textContent=t.username+' · '+(t.status==='resolved'?'แก้ไขแล้ว':'เปิดอยู่')+(t.unread?' · ใหม่ '+t.unread:'');b.onclick=()=>{if(working)return;switchMode('admin',t.account_id);$('dcTitle').textContent=t.username;void read();};box.append(b);}
   for(const [show,label,p] of [[page>0,'‹ ก่อนหน้า',page-1],[d.more,'ถัดไป ›',page+1]])if(show){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>void inbox(p);box.append(b);}
   status(d.threads?.length?'':'ยังไม่มีข้อความจากผู้เล่น');
  }catch(e){if(rev===revision)status(e.message||'โหลดไม่สำเร็จ');}finally{working=false;}
 }
 async function open(){
  if(!token()){window.SMGameAccount?.openSignIn?.();return;}
  if(working)return;
  const session=token();
  if(lastToken!==session){drafts.clear();updateRole(false);}lastToken=session;
  working=true;button.setAttribute('aria-busy','true');
  try{
   const result=await request('unread');if(token()!==session)return;
   updateRole(result.developer===true);updateBadge(result.unread);
  }catch(e){if(token()!==session)return;}
  finally{working=false;button.removeAttribute('aria-busy');}
  if(token()!==session)return;
  switchMode(dev?'inbox':'player');if(!dialog.open)dialog.showModal();positionChat();resizeText();button.setAttribute('aria-expanded','true');
  if(dev){$('dcRefresh').focus({preventScroll:true});await inbox(0);}
  else{$('dcText').focus({preventScroll:true});await read();}
 }
 button.onclick=()=>void open();
 function collapse(){if(!dialog.open)return;saveDraft();dialog.close();}
 $('dcClose').onclick=collapse;
 dialog.addEventListener('cancel',e=>{e.preventDefault();collapse();});
 dialog.addEventListener('pointerdown',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){e.preventDefault();collapse();}});
 dialog.addEventListener('close',()=>{revision++;button.setAttribute('aria-expanded','false');$('dcMessages').replaceChildren();$('dcInbox').replaceChildren();$('dcText').value='';$('dcImage').value='';$('dcAttachment').textContent='';$('dcRemoveImage').hidden=true;attachment=null;sendId=null;});
 window.addEventListener('resize',positionChat,{passive:true});window.visualViewport?.addEventListener('resize',positionChat,{passive:true});window.visualViewport?.addEventListener('scroll',positionChat,{passive:true});
 button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','dialog');
 for(const event of ['keydown','keyup','pointerdown','pointerup','wheel'])dialog.addEventListener(event,e=>e.stopPropagation());
 $('dcAdmin').onclick=()=>{if(!working){switchMode('inbox');void inbox();}};
 $('dcBack').onclick=()=>{if(working)return;if(mode==='admin'){switchMode('inbox');void inbox(inboxPage);}else{switchMode('player');void read();}};
 $('dcMore').onclick=()=>void read(true);
 $('dcRefresh').onclick=()=>mode==='inbox'?void inbox(inboxPage):void read();
 $('dcResolve').onclick=async()=>{if(working||mode!=='admin')return;working=true;try{await request('status',{...scope(),status:threadStatus==='resolved'?'open':'resolved'});}catch(e){status(e.message);working=false;return;}working=false;void read();};
 $('dcText').addEventListener('input',()=>{sendId=null;resizeText();});
 $('dcText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229&&matchMedia('(pointer:fine)').matches){e.preventDefault();$('dcForm').requestSubmit();}});
 $('dcRemoveImage').onclick=()=>{attachment=null;sendId=null;$('dcImage').value='';$('dcAttachment').textContent='';$('dcRemoveImage').hidden=true;};
 $('dcCategory').addEventListener('change',()=>{sendId=null;});
 $('dcImage').addEventListener('change',async e=>{
  attachment=null;sendId=null;$('dcAttachment').textContent='';$('dcRemoveImage').hidden=true;const file=e.target.files?.[0];if(!file)return;
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
   if(rev!==revision)return;attachment=data;$('dcAttachment').textContent='แนบภาพแล้ว';$('dcRemoveImage').hidden=false;status('');
  }catch(e){if(rev===revision){e.target.value='';$('dcAttachment').textContent='';status(e.message||'เปิดรูปไม่ได้');}}finally{URL.revokeObjectURL(u);$('dcSend').disabled=false;}
 });
 $('dcForm').addEventListener('submit',async e=>{
  e.preventDefault();if(working||$('dcSend').disabled||mode==='inbox')return;
  const message=$('dcText').value.trim();if(!message&&!attachment){status('กรอกข้อความหรือแนบภาพก่อนค่ะ');return;}
  const rev=revision,k=draftKey(),session=token();working=true;$('dcSend').disabled=true;status('กำลังส่ง…');sendId??=crypto.randomUUID();
  try{
   await request('send',{...scope(),id:sendId,message,image:attachment,category:$('dcCategory').value,version:document.documentElement.dataset.uiVersion||'',day:document.getElementById('day')?.textContent||''});
   if(session===token())drafts.delete(k);if(rev!==revision)return;$('dcText').value='';$('dcImage').value='';$('dcAttachment').textContent='';$('dcRemoveImage').hidden=true;attachment=null;sendId=null;resizeText();
  }catch(e){if(rev===revision)status(e.message||'ส่งข้อความไม่สำเร็จ');return;}
  finally{working=false;$('dcSend').disabled=false;}
  if(rev===revision)void read();
 });
 // Refresh the launcher immediately when the existing game login changes.
 const previousAuthChanged=window.SMGameOnAuthChanged;
 window.SMGameOnAuthChanged=function(...args){
  try{return previousAuthChanged?.apply(this,args);}
  finally{
   if(token()!==lastToken){if(dialog.open)dialog.close();drafts.clear();lastToken=token();updateBadge(0);updateRole(false);}
   void unread();
  }
 };
 const timer=setInterval(()=>{
  if(token()!==lastToken){if(dialog.open)dialog.close();drafts.clear();lastToken=token();updateBadge(0);updateRole(false);}
  void unread();
 },60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void unread();});
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 void unread();
})();
