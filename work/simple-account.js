/* SMCITY simple game accounts: nickname + password, no email confirmation.
 * Legacy email accounts remain accessible to preserve old saves and developer access. */
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
  const active=()=>!!(account&&token&&!legacyUser());
  function setAccount(user,session){
    account=user||null;token=session||null;
    try{if(user&&session)localStorage.setItem(storageKey,session);else localStorage.removeItem(storageKey);}catch{}
    window.SMGameOnAuthChanged?.(!!(user||legacyUser()));
    if(!user)window.SMGameCreatorAuthRefresh?.();
  }
  async function call(action,fields={},session=token){
    const headers={'Content-Type':'application/json',apikey:key};
    if(session)headers.Authorization='Bearer '+session;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({action,...fields}),signal:controller.signal});
      const body=await response.json();
      if(!response.ok)throw Error(body.message||'ระบบบัญชีไม่พร้อม');
      return body;
    }finally{clearTimeout(timeout);}
  }
  function notice(message,error=false){
    const node=$('memberNotice');node.textContent=message;node.classList.toggle('error',error);
  }
  function labels(){
    const tabs=gate.querySelector('.member-tabs');
    if(tabs)tabs.hidden=true;
    $('memberIntro').textContent=pending
      ? 'กรอกชื่อกับรหัสผ่านเพื่อบันทึกเมือง ชื่อใหม่จะสร้างบัญชีให้ทันที'
      : 'กรอกชื่อกับรหัสผ่านได้เลย ไม่ต้องสมัครหรือยืนยันอีเมล';
    $('memberSubmit').textContent=pending?'เข้าเกมและบันทึกเมือง':'เข้าสู่เกม';
    $('memberPassword').placeholder='รหัสผ่านตามต้องการ';
    $('memberPassword').removeAttribute('minlength');
    $('memberEmail').placeholder='ชื่อผู้ใช้ หรืออีเมลเดิม';
    notice('');
  }
  function show(){old.openSignIn();labels();}
  Object.defineProperty(api,'user',{configurable:true,get:()=>legacyUser()||(account?{id:account.id,user_metadata:{username:account.username},simpleAccount:true}:null)});
  Object.defineProperty(api,'displayName',{configurable:true,get:()=>legacyUser()?legacyName():account?.username||'ผู้เล่น'});
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
    if(!active())return old.getSave(slotId);
    const result=await call('get-save',{slotId});
    if(!result.data||typeof result.data!=='object'||Array.isArray(result.data))throw Error('เซฟไม่ถูกต้อง');
    return JSON.stringify(result.data);
  };
  api.save=async(name,slotId,serialized)=>{
    if(!active())return old.save(name,slotId,serialized);
    const result=await call('put-save',{name,slotId,data:JSON.parse(serialized)});
    if(result.slotId!==slotId)throw Error('ตรวจสอบการบันทึกเกมไม่สำเร็จ');
  };
  api.deleteSave=async slotId=>active()?call('delete-save',{slotId}):old.deleteSave(slotId);
  api.saveIncidentLog=async entry=>active()?call('incident-add',{entry}):old.saveIncidentLog(entry);
  api.listIncidentLogs=async()=>active()?(await call('incidents-list')).items||[]:old.listIncidentLogs();
  api.submitVehicleBugReport=async report=>active()?call('bug-report',{report}):old.submitVehicleBugReport(report);
  api.listVehicleBugReports=async()=>{
    if(active())throw Error('รายงานทั้งหมดดูได้เฉพาะบัญชีผู้สร้าง');
    return old.listVehicleBugReports();
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
  form.addEventListener('submit',event=>{
    const username=$('memberEmail').value.trim().normalize('NFC');
    if(username.includes('@')){
      if(account)setAccount(null,null);
      return; // Legacy email accounts still use their original sign-in.
    }
    event.preventDefault();event.stopImmediatePropagation();
    if(working)return;
    const password=$('memberPassword').value;
    if(!username||!password){notice('กรอกชื่อผู้ใช้และรหัสผ่าน (เว้นว่างไม่ได้)',true);return;}
    working=true;$('memberSubmit').disabled=true;notice('กำลังเข้าสู่เกม…');
    void(async()=>{
      const revision=++requestRevision;
      try{
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
    if(saved)void call('me',{},saved).then(data=>{
      if(!legacyUser())setAccount(data.user,saved);
    }).catch(()=>{try{localStorage.removeItem(storageKey);}catch{}});
  }catch{}
})();
