/* SMCITY: one game account screen (nickname/password).
 * Old Supabase Auth is a verified, server-side migration bridge only;
 * old cities and creator permissions keep their original owner UUIDs. */
(() => {
  const api=window.SMGameAccount, form=document.getElementById('memberForm');
  const gate=document.getElementById('memberGate');
  if(!api||!form||!gate)return;
  const $=id=>document.getElementById(id);
  const endpoint='https://jeqbyhzbpivscsduwkcj.supabase.co/functions/v1/smgame-simple-account';
  const key='sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf',storageKey='smcity-simple-session-v1';
  const legacyUser=Object.getOwnPropertyDescriptor(api,'user').get.bind(api);
  const legacyName=Object.getOwnPropertyDescriptor(api,'displayName').get.bind(api);
  const old={};
  for(const name of ['openSignIn','requestSaveLogin','listSaves','getSave','save','deleteSave','saveIncidentLog','listIncidentLogs','submitVehicleBugReport','listVehicleBugReports','changePassword','signOut','closePanel'])
    old[name]=api[name].bind(api);
  let account=null,token=null,pending=null,working=false,requestRevision=0;
  const active=()=>!!(account&&token);
  window.SMGameSimpleSessionToken=()=>active()?token:null;
  function setAccount(user,session){
    account=user||null;token=session||null;
    try{if(user&&session)localStorage.setItem(storageKey,session);else localStorage.removeItem(storageKey);}catch{}
    window.SMGameOnAuthChanged?.(!!(user||legacyUser()));
    setTimeout(()=>window.SMGameCreatorAuthRefresh?.(),0);
  }
  async function call(action,fields={},session=token){
    const headers={'Content-Type':'application/json',apikey:key};
    if(session)headers.Authorization='Bearer '+session;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({action,...fields}),signal:controller.signal});
      const body=await response.json();
      if(!response.ok){
        const error=new Error(body.message||'ระบบบัญชีไม่พร้อม');
        error.code=body.code||'';
        throw error;
      }
      return body;
    }finally{clearTimeout(timeout);}
  }
  function notice(message,error=false){
    const node=$('memberNotice');node.textContent=message;node.classList.toggle('error',error);
  }
  function labels(){
    const tabs=gate.querySelector('.member-tabs');
    if(tabs){tabs.hidden=true;tabs.style.display='none';}
    $('memberIntro').textContent=pending
      ? 'กรอกชื่อกับรหัสผ่านเพื่อบันทึกเมือง ชื่อใหม่จะสร้างบัญชีให้ทันที'
      : 'กรอกชื่อกับรหัสผ่านได้เลย ไม่ต้องสมัครหรือยืนยันอีเมล';
    $('memberSubmit').textContent=pending?'เข้าเกมและบันทึกเมือง':'เข้าสู่เกม';
    $('memberPassword').placeholder='รหัสผ่านตามต้องการ';
    $('memberPassword').removeAttribute('minlength');
    $('memberEmail').placeholder='ชื่อผู้เล่น หรืออีเมลเดิม';
    $('memberDevQuick')?.setAttribute('hidden','');
    if($('memberDevQuick'))$('memberDevQuick').style.display='none';
    notice('');
  }
  function show(){old.openSignIn();labels();}
  Object.defineProperty(api,'user',{configurable:true,get:()=>account?{id:account.id,user_metadata:{username:account.username},simpleAccount:true}:legacyUser()});
  Object.defineProperty(api,'displayName',{configurable:true,get:()=>account?.username||(legacyUser()?legacyName():'ผู้เล่น')});
  api.openSignIn=()=>{pending=null;show();};
  api.requestSaveLogin=(serialized,name)=>{
    if(api.user||working||typeof serialized!=='string'||!serialized)return false;
    pending={serialized,name:String(name||'เซฟด่วน').slice(0,80),slotId:'quick-save'};
    show();return true;
  };
  api.listSaves=async()=>{
    if(!active())return old.listSaves();
    const result=await call('list-saves');
    return (result.saves||[]).map(s=>({id:s.slot_id,name:s.name,savedAt:Date.parse(s.updated_at)}));
  };
  api.getSave=async slotId=>{
    if(!active()){
      const raw=await old.getSave(slotId);
      return window.SMGameSaveCodec?.decode?window.SMGameSaveCodec.decode(raw):raw;
    }
    const result=await call('get-save',{slotId});
    if(!result.data||typeof result.data!=='object'||Array.isArray(result.data))throw Error('เซฟไม่ถูกต้อง');
    const raw=JSON.stringify(result.data);
    return window.SMGameSaveCodec?.decode?window.SMGameSaveCodec.decode(raw):raw;
  };
  api.save=async(name,slotId,serialized)=>{
    // Covers new accounts, legacy accounts, and quick saves after login.
    const packed=window.SMGameSaveCodec?.encode?await window.SMGameSaveCodec.encode(serialized):serialized;
    if(!active())return old.save(name,slotId,packed);
    const result=await call('put-save',{name,slotId,data:JSON.parse(packed)});
    if(result.slotId!==slotId)throw Error('ตรวจสอบการบันทึกเกมไม่สำเร็จ');
  };
  api.deleteSave=async slotId=>active()?call('delete-save',{slotId}):old.deleteSave(slotId);
  api.saveIncidentLog=async entry=>active()?call('incident-add',{entry}):old.saveIncidentLog(entry);
  api.listIncidentLogs=async()=>active()?(await call('incidents-list')).items||[]:old.listIncidentLogs();
  api.submitVehicleBugReport=async report=>active()?call('bug-report',{report}):old.submitVehicleBugReport(report);
  api.listVehicleBugReports=async()=>{
    if(!active())return old.listVehicleBugReports();
    if(window.SMGameCreatorCanOpen!==true||typeof window.SMGameCreatorRequest!=='function')
      throw Error('เฉพาะบัญชีผู้สร้างที่ยืนยันสิทธิ์แล้วค่ะ');
    const result=await window.SMGameCreatorRequest('list-vehicle-bug-reports');
    return result.reports||[];
  };
  api.changePassword=async(currentPassword,newPassword)=>active()
    ? call('change-password',{oldPassword:currentPassword,newPassword})
    : old.changePassword(currentPassword,newPassword);
  api.signOut=async()=>{
    if(!active())return old.signOut();
    const prior=token;setAccount(null,null);
    try{await call('logout',{},prior);}catch{}
  };
  api.closePanel=()=>{pending=null;return old.closePanel();};
  // Capture prevents the retired Supabase Auth form from running.
  // The server verifies original Auth credentials for linked old accounts.
  form.addEventListener('submit',event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(working)return;
    const username=$('memberEmail').value.trim().normalize('NFC');
    const password=$('memberPassword').value;
    if(!username||!password){notice('กรอกชื่อผู้เล่นและรหัสผ่านให้ครบค่ะ',true);return;}
    working=true;$('memberSubmit').disabled=true;notice('กำลังเข้าสู่เกม…');
    void(async()=>{
      const revision=++requestRevision;
      try{
        // Do not leave an old Auth token preferred by creator statistics.
        if(legacyUser())await old.signOut();
        const result=await call('login',{username,password},null);
        if(revision!==requestRevision)return;
        setAccount(result.user,result.token);
        $('memberPassword').value='';
        if(pending){
          const draft=pending;
          await api.save(draft.name,draft.slotId,draft.serialized);
          if(revision!==requestRevision)return;
          pending=null;old.closePanel();window.SMGameOnCloudSaved?.();
          if(typeof window.SMGameOpenSaveDialog==='function')void window.SMGameOpenSaveDialog();
        }else old.closePanel();
      }catch(error){
        if(revision===requestRevision)notice('เข้าสู่ระบบไม่ได้: '+(error.message||'กรุณาลองใหม่'),true);
      }finally{working=false;$('memberSubmit').disabled=false;}
    })();
  },true);
  $('memberRetrySave')?.addEventListener('click',event=>{
    if(!active()||!pending||working)return;
    event.preventDefault();event.stopImmediatePropagation();working=true;
    void(async()=>{
      try{
        const draft=pending;await api.save(draft.name,draft.slotId,draft.serialized);
        pending=null;old.closePanel();window.SMGameOnCloudSaved?.();window.SMGameOpenSaveDialog?.();
      }catch(error){notice('บันทึกเมืองไม่สำเร็จ: '+error.message,true);}
      finally{working=false;}
    })();
  },true);
  gate.addEventListener('close',()=>{if(!working)pending=null;});
  labels();
  try{
    const saved=localStorage.getItem(storageKey);
    if(saved)void call('me',{},saved).then(async data=>{
      if(legacyUser()){try{await old.signOut();}catch{}}
      if(!account)setAccount(data.user,saved);
    }).catch(()=>{try{localStorage.removeItem(storageKey);}catch{}});
  }catch{}
})();

;(() => {
  // Creator-only account management, using an independently verified server role.
  const dialog=document.getElementById('smcityCreator');
  const wrap=dialog?.querySelector('.cr-wrap');
  if(!wrap||typeof window.SMGameCreatorOpen!=='function')return;
  const panel=document.createElement('section');
  panel.className='cr-account-admin';
  panel.innerHTML='<div class="cr-toolbar"><div><h3>จัดการบัญชีผู้เล่น</h3><p>ผู้สร้างดูรายชื่อและตั้งรหัสใหม่ได้ ไม่ต้องรู้รหัสเดิม</p></div><button type="button" id="crAccountRefresh">รีเฟรช</button></div>'+
    '<div class="cr-account-filters"><span class="cr-account-type">บัญชีเกมทั้งหมด</span>'+
    '<label>ค้นหาผู้เล่น <input id="crAccountSearch" type="search" autocomplete="off" placeholder="ชื่อผู้เล่น / อีเมล"></label></div>'+
    '<p id="crAccountStatus" role="status" aria-live="polite">เปิดหน้าผู้สร้างเพื่อดูข้อมูลบัญชี</p>'+
    '<div class="cr-table-box"><table><thead><tr><th>ผู้เล่น</th><th>สร้างบัญชี</th><th>จัดการ</th></tr></thead><tbody id="crAccountRows"></tbody></table></div>';
  wrap.insertBefore(panel,wrap.lastElementChild);
  const css=document.createElement('style');
  css.textContent='#smcityCreator .cr-account-admin{display:grid;gap:9px}'+
    '#smcityCreator .cr-account-filters{display:flex;flex-wrap:wrap;gap:8px}'+
    '#smcityCreator .cr-account-filters label{display:grid;gap:4px;flex:1;min-width:150px;font-size:12px}'+
    '#smcityCreator .cr-account-filters input,#smcityCreator .cr-account-filters select,#smcityCreator .cr-account-admin input[type=password]{width:100%;box-sizing:border-box;padding:8px;border:1px solid #aebbc3;border-radius:8px;background:#fff;color:#1d2e35}'+
    '#smcityCreator .cr-account-admin .cr-table-box{max-height:30dvh}'+
    '#smcityCreator .cr-account-admin td:last-child{min-width:140px}'+
    '#smcityCreator .cr-account-admin td button{margin:2px;white-space:nowrap}'+
    ':root.smcity-gray-ui #smcityCreator .cr-account-filters input,:root.smcity-gray-ui #smcityCreator .cr-account-filters select,:root.smcity-gray-ui #smcityCreator .cr-account-admin input[type=password]{background:#292e35;color:#fff;border-color:#59616b}';
  document.head.appendChild(css);
  const $=id=>panel.querySelector('#'+id);
  const rows=$('crAccountRows'),search=$('crAccountSearch'),status=$('crAccountStatus');
  let accounts=[],busy=false,revision=0;
  const dateText=value=>{
    const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('th-TH',{dateStyle:'short'});
  };
  function authorized(){
    return dialog.open&&window.SMGameCreatorCanOpen===true&&
      !!window.SMGameAccount?.user&&typeof window.SMGameCreatorRequest==='function';
  }
  function render(){
    rows.replaceChildren();
    const q=search.value.trim().toLocaleLowerCase('th');
    const matched=accounts.filter(a=>String(a.username||'').toLocaleLowerCase('th').includes(q)||
      String(a.email||'').toLocaleLowerCase('th').includes(q));
    if(!matched.length){
      const tr=document.createElement('tr'),td=document.createElement('td');
      td.colSpan=3;td.textContent=accounts.length?'ไม่พบผู้เล่นที่ค้นหา':'ยังไม่มีบัญชี';
      tr.appendChild(td);rows.appendChild(tr);return;
    }
    for(const item of matched){
      const tr=document.createElement('tr');
      const label=document.createElement('td');
      const name=document.createElement('strong');name.textContent=item.username||item.email||'ผู้เล่น';
      label.append(name);
      if(item.email&&item.username){
        const email=document.createElement('small');email.textContent=' '+item.email;
        label.append(email);
      }
      const created=document.createElement('td');created.textContent=dateText(item.created_at||item.createdAt);
      const actions=document.createElement('td');
      const change=document.createElement('button');change.type='button';change.textContent='ตั้งรหัสใหม่';
      change.addEventListener('click',()=>{
        actions.replaceChildren();
        const field=document.createElement('input');field.type='password';field.autocomplete='new-password';
        field.placeholder='รหัสผ่านใหม่';field.setAttribute('aria-label','รหัสผ่านใหม่สำหรับ '+(item.username||item.email||'บัญชี'));
        const save=document.createElement('button');save.type='button';save.textContent='บันทึก';
        const cancel=document.createElement('button');cancel.type='button';cancel.textContent='ยกเลิก';
        cancel.addEventListener('click',()=>{field.value='';render();});
        save.addEventListener('click',async()=>{
          if(!authorized())return;
          const password=field.value;
          if(!password){status.textContent='กรอกรหัสผ่านใหม่ก่อนค่ะ';return;}
          const token=revision;
          field.value='';save.disabled=true;
          status.textContent='กำลังตั้งรหัสผ่านให้ '+(item.username||item.email)+'…';
          try{
            await window.SMGameCreatorRequest('reset-simple-password',{accountId:item.id,password});
            if(token!==revision||!authorized())return;
            status.textContent='ตั้งรหัสผ่านใหม่สำเร็จสำหรับ '+(item.username||item.email)+' ค่ะ';
            render();
          }catch(error){
            if(token===revision&&authorized())status.textContent='เปลี่ยนรหัสผ่านไม่สำเร็จ: '+(error.message||'ไม่ทราบสาเหตุ');
            save.disabled=false;
          }
        });
        actions.append(field,save,cancel);field.focus();
      });
      actions.append(change);tr.append(label,created,actions);rows.append(tr);
    }
  }
  async function refresh(){
    if(busy||!authorized())return;
    const ticket=++revision;
    busy=true;status.textContent='กำลังโหลดบัญชี…';
    try{
      const result=await window.SMGameCreatorRequest('list-simple-accounts');
      if(ticket!==revision||!authorized())return;
      accounts=Array.isArray(result.accounts)?result.accounts:[];
      render();status.textContent='พบ '+accounts.length+' บัญชี (แสดงสูงสุด 200 รายการ)';
    }catch(error){
      if(ticket!==revision||!dialog.open)return;
      accounts=[];rows.replaceChildren();status.textContent='โหลดบัญชีไม่สำเร็จ: '+(error.message||'ไม่ทราบสาเหตุ');
    }finally{busy=false;}
  }
  search.addEventListener('input',render);
   $('crAccountRefresh').addEventListener('click',()=>void refresh());
  dialog.addEventListener('close',()=>{revision++;accounts=[];rows.replaceChildren();search.value='';});
  const original=window.SMGameCreatorOpen;
  window.SMGameCreatorOpen=function(...args){
    const result=original.apply(this,args);
    if(authorized())void refresh();
    return result;
  };
})();
