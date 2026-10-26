import { createClient } from '@supabase/supabase-js';

// This is a public, browser-safe publishable key. Never use a service-role key here.
const SUPABASE_URL = 'https://jeqbyhzbpivscsduwkcj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
const gate = document.getElementById('memberGate');

// Names are mapped deterministically to a reserved, non-deliverable address.
// Supabase still owns authentication and save authorization; metadata is display-only.
async function loginAddress(value, forceName = false) {
  const name = value.trim().normalize('NFC').toLowerCase();
  if (!forceName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name) && !name.endsWith('@names.smcity.invalid')) return name;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return 'u-' + hex + '@names.smcity.invalid';
}

if (gate) {
  const $ = id => document.getElementById(id);
  const auth = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      storageKey: 'smgame-sumoweb-auth' },
  });
  let user = null;
  let mode = 'login';
  let busy = false;
  let pendingSave = null;
  let savingPending = false;
  let memberView = 0;
  const notice = $('memberNotice');

  function setNotice(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle('error', error);
  }
  function setLocked(locked) {
    window.SMGameAuthLocked = locked;
    gate.hidden = !locked;
    gate.setAttribute('aria-hidden', String(!locked));
    if (locked && !gate.open) gate.showModal();
    else if (!locked && gate.open) gate.close();
  }
  function setMode(next) {
    mode = next;
    for (const tab of gate.querySelectorAll('[data-member-mode]')) {
      const active = tab.dataset.memberMode === next;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    }
    $('memberSubmit').textContent = next === 'signup' ? (pendingSave ? 'สมัครและบันทึกเกม' : 'สมัครสมาชิก') : (pendingSave ? 'เข้าสู่ระบบและบันทึกเกม' : 'เข้าสู่ระบบ');
    $('memberTitle').textContent = pendingSave ? 'เซป/โหลด' : 'บัญชีผู้ใช้';
    $('memberIntro').textContent = pendingSave ? 'เข้าสู่ระบบหรือสมัครสมาชิก แล้วบันทึกเมืองที่กำลังเล่นได้เลยค่ะ' : 'ใช้ชื่อผู้ใช้และรหัสผ่าน บัญชีเดิมยังใช้อีเมลเดิมได้ค่ะ';
    $('memberPassword').setAttribute('autocomplete', next === 'signup' ? 'new-password' : 'current-password');
    setNotice('');
  }

  function setUser(next) {
    user = next || null;
    window.SMGameOnAuthChanged?.(!!user);
    setTimeout(() => window.SMGameCreatorAuthRefresh?.(), 0);
  }
  function closeMember() {
    memberView++;
    pendingSave = null;
    $('memberRetrySave').hidden = true;
    setLocked(false);
    $('memberPassword').value = '';
    return true;
  }
  function showMember(nextMode = 'signup') {
    if (busy || savingPending) return;
    window.SMGameCloseDialog?.();
    memberView++;
    $('memberRetrySave').hidden = true;
    setMode(nextMode);
    setLocked(true);
    $('memberEmail').focus();
  }
  async function persistPendingSave() {
    if (!pendingSave) { setLocked(false); return true; }
    if (!user || savingPending) return false;
    savingPending = true;
    const view = memberView;
    $('memberSubmit').disabled = true;
    $('memberRetrySave').hidden = true;
    setNotice('กำลังบันทึกเมืองที่สร้างไว้…');
    try {
      const draft = pendingSave;
      await window.SMGameAccount.save(draft.name, draft.slotId, draft.serialized);
      if (view !== memberView) { window.SMGameOnCloudSaved?.(); return true; }
      pendingSave = null;
      setNotice('');
      setLocked(false);
      window.SMGameOnCloudSaved?.();
      // Completing guest registration/login must lead to the Save/Load page,
      // not leave a first-time player wondering where their city went.
      // The pending snapshot was saved successfully before opening this page.
      if (typeof window.SMGameOpenSaveDialog === 'function') void window.SMGameOpenSaveDialog();
      return true;
    } catch (error) {
      if (view !== memberView) return false;
      setNotice('เข้าสู่ระบบแล้ว แต่ยังบันทึกเกมไม่สำเร็จ: ' +
        (error?.message || 'กรุณาลองอีกครั้ง') + ' กดลองบันทึกอีกครั้งได้ค่ะ', true);
      $('memberRetrySave').hidden = false;
      return false;
    } finally {
      savingPending = false;
      $('memberSubmit').disabled = false;
    }
  }
  gate.querySelectorAll('[data-member-mode]').forEach(tab =>
    tab.addEventListener('click', () => setMode(tab.dataset.memberMode)));
  $('memberClose').addEventListener('click', closeMember);
  $('memberBack').addEventListener('click', closeMember);
  // The login overlay fills the viewport. Only a direct hit on that overlay,
  // not a click on the form card or its fields, may dismiss it.
  gate.addEventListener('click', event => { if (event.target === gate) closeMember(); });
  gate.addEventListener('cancel', event => { event.preventDefault(); closeMember(); });
  gate.addEventListener('close', () => { window.SMGameAuthLocked = false; gate.hidden = true; });
  $('memberRetrySave').addEventListener('click', persistPendingSave);
  $('memberForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || savingPending) return;
    if (user && pendingSave) { await persistPendingSave(); return; }
    const identity = $('memberEmail').value.trim().normalize('NFC');
    const password = $('memberPassword').value;
    if (!identity || identity.length > 80 || password.length < 6) {
      setNotice('กรอกชื่อผู้ใช้ไม่เกิน 80 ตัวอักษร และรหัสผ่านอย่างน้อย 6 ตัวอักษรค่ะ', true);
      return;
    }
    busy = true;
    const view = memberView;
    $('memberSubmit').disabled = true;
    setNotice('กำลังเชื่อมต่อบัญชี…');
    try {
      const signingUp = mode === 'signup';
      const email = await loginAddress(identity, signingUp);
      if (signingUp) {
        const response = await fetch(SUPABASE_URL + '/functions/v1/smgame-signup', {
          method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identity, password }),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.message || 'สมัครสมาชิกไม่สำเร็จ');
        if (view !== memberView) return;
      }
      let result = await auth.auth.signInWithPassword({ email, password });
      if (!signingUp && result.error?.message === 'Invalid login credentials') {
        const nameAddress = await loginAddress(identity, true);
        if (nameAddress !== email) result = await auth.auth.signInWithPassword({ email: nameAddress, password });
      }
      if (result.error) throw result.error;
      if (view !== memberView) return;
      let session = result.data.session;
      if (!session && signingUp) {
        const signedIn = await auth.auth.signInWithPassword({ email, password });
        if (!signedIn.error) session = signedIn.data.session;
      }
      if (session?.user) {
        setUser(session.user);
        if (view !== memberView) return;
        if (pendingSave) await persistPendingSave();
        else setLocked(false);
      } else if (signingUp) {
        setMode('login');
        setNotice('สมัครบัญชีแล้วแต่ยังเข้าสู่ระบบไม่ได้ อาจเปิดการยืนยันอีเมลอยู่ เมืองนี้ยังไม่ถูกบันทึกค่ะ', true);
      } else {
        setNotice('ยังเข้าสู่ระบบไม่ได้ กรุณาตรวจสอบการยืนยันอีเมลค่ะ', true);
      }
    } catch (error) {
      if (view !== memberView) return;
      setNotice(error?.message === 'Invalid login credentials'
        ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้องค่ะ'
        : 'ดำเนินการไม่สำเร็จ: ' + (error?.message || 'เชื่อมต่อไม่ได้'), true);
    } finally {
      busy = false;
      $('memberSubmit').disabled = false;
    }
  });
  auth.auth.onAuthStateChange((_event, session) => setUser(session?.user));
  auth.auth.getSession().then(({ data, error }) => {
    if (error) setNotice('ตรวจสอบการเข้าสู่ระบบไม่ได้ กรุณาลองใหม่ค่ะ', true);
    else setUser(data.session?.user);
  }).catch(error => setNotice('เชื่อมต่อระบบสมาชิกไม่ได้: ' + error.message, true));

  window.SMGameAccount = {
    get user() { return user; },
    get displayName() { return user?.user_metadata?.username || user?.email || 'ผู้เล่น'; },
    closePanel: closeMember,
    openSignIn() { pendingSave = null; showMember('login'); },
    requestSaveLogin(serialized, name) {
      if (user || busy || savingPending) return false;
      if (typeof serialized !== 'string' || !serialized) throw Error('ไม่มีข้อมูลเมืองสำหรับบันทึก');
      pendingSave = { serialized, name: String(name || 'เซฟด่วน').slice(0, 80), slotId: 'quick-save' };
      showMember('signup');
      return true;
    },
    async saveIncidentLog(entry) {
      if (!user) throw Error('กรุณาเข้าสู่ระบบก่อนค่ะ');
      const type = entry.eventType === 'collision' || entry.eventType === 'breakdown' ? entry.eventType : 'legacy';
      const { error } = await auth.from('smgame_incident_logs').insert({
        id: entry.eventId,
        user_id: user.id,
        occurred_at: entry.at,
        city: String(entry.city || 'unknown').slice(0, 60),
        game_time: Math.max(0, Number(entry.gameTime) || 0),
        event_type: type,
        reason: String(entry.reason || 'เหตุจราจร').slice(0, 500),
        place: String(entry.place || 'ถนน').slice(0, 120),
        vehicle_count: Math.max(1, Math.min(8, entry.vehicles?.length || 1)),
        reward_baht: entry.award === 5000 ? 5000 : 0,
        details: entry,
      });
      if (error && error.code !== '23505') throw error; // Duplicate client ID = already synchronized.
    },
    async listIncidentLogs() {
      if (!user) throw Error('กรุณาเข้าสู่ระบบก่อนค่ะ');
      const { data, error } = await auth.from('smgame_incident_logs')
        .select('id,occurred_at,details').eq('user_id', user.id)
        .order('occurred_at', { ascending: false }).limit(80);
      if (error) throw error;
      return data || [];
    },
    async listSaves() {
      if (!user) throw Error('กรุณาเข้าสู่ระบบก่อนค่ะ');
      const { data, error } = await auth.from('smgame_saves')
        .select('slot_id,name,data,updated_at').eq('user_id',user.id).order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(slot => ({
        id: slot.slot_id, name: slot.name, savedAt: Date.parse(slot.updated_at),
        data: JSON.stringify(slot.data),
      }));
    },
    async save(name, slotId, serialized) {
      if (!user) throw Error('กรุณาเข้าสู่ระบบก่อนค่ะ');
      const { data, error } = await auth.from('smgame_saves').upsert({
        user_id: user.id, slot_id: slotId, name, data: JSON.parse(serialized),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slot_id' }).select('slot_id').single();
      if (error) throw error;
      if (data?.slot_id !== slotId) throw Error('ตรวจสอบเซฟออนไลน์ไม่สำเร็จ');
    },
    async deleteSave(slotId) {
      if (!user) throw Error('กรุณาเข้าสู่ระบบก่อนค่ะ');
      if (typeof slotId !== 'string' || !slotId) throw Error('ระบุเซฟที่ต้องการลบค่ะ');
      const { data, error } = await auth.from('smgame_saves').delete()
        .eq('user_id', user.id).eq('slot_id', slotId).select('slot_id');
      if (error) throw error;
      if (!data?.some(slot => slot.slot_id === slotId)) throw Error('ไม่พบเซฟนี้ในบัญชีค่ะ');
    },
    async changePassword(currentPassword, newPassword) {
      if (!user?.email) throw Error('กรุณาเข้าสู่ระบบก่อนค่ะ');
      if (!currentPassword || newPassword?.length < 8) throw Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษรค่ะ');
      if (currentPassword === newPassword) throw Error('รหัสผ่านใหม่ต้องแตกต่างจากเดิมค่ะ');
      const { error: checkError } = await auth.auth.signInWithPassword({
        email: user.email, password: currentPassword,
      });
      if (checkError) throw Error('รหัสผ่านปัจจุบันไม่ถูกต้องค่ะ');
      const { error } = await auth.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    async signOut() {
      if (!user) return;
      const { error } = await auth.auth.signOut();
      if (error) throw error;
      setUser(null);
    },
  };

  // Per-page visit telemetry is kept separate from saves and the simulation.
  const creatorEndpoint = SUPABASE_URL + '/functions/v1/smgame-creator-presence';
  const creatorSession = crypto.randomUUID();
  let creatorVisitor;
  try {
    creatorVisitor = localStorage.getItem('smcity-visitor-id-v1');
    if (!creatorVisitor || creatorVisitor.length !== 36) {
      creatorVisitor = crypto.randomUUID();
      localStorage.setItem('smcity-visitor-id-v1', creatorVisitor);
    }
  } catch { creatorVisitor = crypto.randomUUID(); }
  const creatorDevice = (() => {
    const ua = navigator.userAgent || '';
    if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ipad';
    if (/iPhone|iPod/i.test(ua)) return 'iphone';
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'android' : 'tablet';
    return /Mobile|Tablet/i.test(ua) ? 'tablet' : 'desktop';
  })();
  let creatorSeconds = 0, creatorLastTick = Date.now();
  let creatorAllowed = false, creatorAccessCounter = 0, creatorLoading = false;
  const creatorTick = () => {
    const now = Date.now();
    if (!document.hidden) creatorSeconds += Math.max(0, Math.min(45, (now - creatorLastTick) / 1000));
    creatorLastTick = now;
  };
  async function creatorRequest(action, values = {}) {
    const { data } = await auth.auth.getSession();
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
    const res = await fetch(creatorEndpoint, { method: 'POST', headers, body: JSON.stringify({ action, ...values }) });
    const payload = await res.json();
    if (!res.ok) throw Error(payload.message || 'ระบบสถิติไม่พร้อม');
    return payload;
  }
  async function creatorHeartbeat() {
    creatorTick();
    const city = window.SMGameCreatorMetrics?.() || {};
    try {
      await creatorRequest('ping', {
        sessionId: creatorSession, visitorId: creatorVisitor, device: creatorDevice,
        activeSeconds: Math.floor(creatorSeconds), isVisible: !document.hidden,
        isPlaying: !document.hidden && city.isPlaying === true,
        city: city.city || 'unknown', population: city.population || 0,
        tourists: city.tourists || 0, vehicles: city.vehicles || 0,
        buildings: city.buildings || 0,
      });
    } catch (error) {
      console.warn('SMCITY telemetry:', error?.message || error);
    }
  }
  const creatorStyles = document.createElement('style');
  creatorStyles.textContent = `
#smcityCreator{width:min(980px,calc(100vw - 24px));max-width:980px;max-height:87dvh;overflow:auto;border:1px solid #bdcdce;border-radius:16px;background:#f7faf9;color:#1a3b3e;padding:0;box-shadow:0 15px 55px #10252a77}
#smcityCreator::backdrop{background:#0a1828b3}
#smcityCreator .cr-wrap{padding:clamp(12px,2.5vw,24px);display:grid;gap:15px}
#smcityCreator .cr-head,#smcityCreator .cr-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}
#smcityCreator h2{margin:0;font-size:23px;color:inherit}#smcityCreator h3{margin:0 0 8px;font-size:15px;color:inherit}
#smcityCreator p{margin:4px 0 0;color:#60767d;font-size:12px}
#smcityCreator button{border-radius:9px;border:1px solid #bdccd0;padding:7px 12px;background:#fff;color:#213e45}
#smcityCreator .cr-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
#smcityCreator .cr-stat{border:1px solid #cfdddd;border-radius:11px;background:#fff;padding:11px}
#smcityCreator .cr-stat small{display:block;color:#6b7b82}#smcityCreator .cr-stat b{display:block;font-size:clamp(18px,3vw,27px)}
#smcityCreator .cr-table-box{overflow:auto;max-height:29dvh;border-radius:10px;border:1px solid #d2dedf;background:#fff}
#smcityCreator table{border-collapse:collapse;width:100%;min-width:650px;font-size:12px}
#smcityCreator th,#smcityCreator td{border-bottom:1px solid #e9eeef;text-align:left;white-space:nowrap;padding:8px 10px}
#smcityCreator th{background:#e6f1f1;position:sticky;top:0;z-index:1}
:root.smcity-gray-ui #smcityCreator{background:#191b20;color:#f2f5f7;border-color:#454c55}
:root.smcity-gray-ui #smcityCreator .cr-stat,:root.smcity-gray-ui #smcityCreator .cr-table-box{background:#23262d;border-color:#404a52}
:root.smcity-gray-ui #smcityCreator th{background:#333a43;color:#e2e7e8}
:root.smcity-gray-ui #smcityCreator td{border-color:#363e45}
:root.smcity-gray-ui #smcityCreator p,:root.smcity-gray-ui #smcityCreator small{color:#bfcbd0}
:root.smcity-gray-ui #smcityCreator button{background:#333942;color:#fff;border-color:#565f69}
`;
  document.head.append(creatorStyles);
  const creatorDialog = document.createElement('dialog');
  creatorDialog.id = 'smcityCreator';
  creatorDialog.setAttribute('aria-label', 'ผู้สร้าง');
  creatorDialog.innerHTML = `<div class="cr-wrap">
  <div class="cr-head"><div><h2>ผู้สร้าง · SMCITY</h2><p>ข้อมูลล่าสุดจาก Supabase</p></div><button id="creatorClose" type="button" aria-label="ปิด">✕</button></div>
  <div class="cr-stats"><div class="cr-stat"><small>เข้าชม 30 วัน</small><b id="crVisits">—</b></div><div class="cr-stat"><small>ออนไลน์</small><b id="crOnline">—</b></div><div class="cr-stat"><small>กำลังเล่น</small><b id="crPlaying">—</b></div></div>
  <div class="cr-toolbar"><span id="crStatus">รอข้อมูล</span><button id="crRefresh" type="button">รีเฟรช</button></div>
  <section><h3>ออนไลน์ (เชื่อมต่อภายใน 90 วินาที)</h3><div class="cr-table-box"><table><thead><tr><th>ผู้เล่น</th><th>อุปกรณ์</th><th>สถานะ</th><th>เวลาเล่น</th><th>ประชากร</th><th>รถ</th><th>เมือง</th><th>ล่าสุด</th></tr></thead><tbody id="crLive"></tbody></table></div></section>
  <section><h3>ประวัติผู้เข้าชมล่าสุด (สูงสุด 150 ครั้ง)</h3><div class="cr-table-box"><table><thead><tr><th>ผู้เล่น</th><th>อุปกรณ์</th><th>เข้าเว็บ</th><th>เวลาเล่น</th><th>ประชากร</th><th>รถ</th><th>เมือง</th><th>ล่าสุด</th></tr></thead><tbody id="crHistory"></tbody></table></div></section>
  <p>เวลาเล่นเป็นนาทีจริงที่หน้าเว็บอยู่ด้านหน้า (ไม่ใช่นาทีในเกม) · ข้อมูลประชากรเป็นค่าที่เครื่องผู้เล่นส่งมา · ผู้เยี่ยมชมที่ไม่ล็อกอินแสดงเป็นรหัสสุ่ม · ไม่เก็บ IP</p>
  </div>`;
  document.body.append(creatorDialog);
  const cr = id => creatorDialog.querySelector('#' + id);
  const nfmt = value => Number(value || 0).toLocaleString('th-TH');
  const dfmt = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  };
  const tfmt = value => {
    const mins = Math.floor(Number(value || 0) / 60);
    return mins < 60 ? nfmt(mins) + ' นาที' : Math.floor(mins / 60) + ' ชม. ' + (mins % 60) + ' นาที';
  };
  const deviceNames = { desktop: 'คอมพิวเตอร์', ipad: 'iPad', iphone: 'iPhone', android: 'Android', tablet: 'แท็บเล็ต', other: 'อื่น ๆ' };
  function populateCreatorTable(target, entries, live) {
    target.replaceChildren();
    if (!entries.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 8; td.textContent = 'ยังไม่มีข้อมูล'; tr.append(td); target.append(tr); return;
    }
    for (const item of entries) {
      const fields = live ? [
        item.display_name, deviceNames[item.device] || 'อื่น ๆ',
        !item.is_visible ? 'เปิดอยู่เบื้องหลัง' : item.is_playing ? 'กำลังเล่น' : 'เปิดหน้าเว็บ',
        tfmt(item.active_seconds), nfmt(item.population), nfmt(item.vehicles), item.city, dfmt(item.last_seen_at)
      ] : [
        item.display_name, deviceNames[item.device] || 'อื่น ๆ', dfmt(item.started_at),
        tfmt(item.active_seconds), nfmt(item.population), nfmt(item.vehicles), item.city, dfmt(item.last_seen_at)
      ];
      const tr = document.createElement('tr');
      for (const field of fields) {
        const td = document.createElement('td');
        td.textContent = String(field ?? '—');
        tr.append(td);
      }
      target.append(tr);
    }
  }
  async function creatorReload() {
    if (creatorLoading || !creatorAllowed || !creatorDialog.open) return;
    creatorLoading = true; cr('crStatus').textContent = 'กำลังโหลดข้อมูล…';
    try {
      const result = await creatorRequest('dashboard');
      if (!creatorAllowed || !creatorDialog.open) return;
      cr('crVisits').textContent = nfmt(result.visits30d);
      cr('crOnline').textContent = nfmt(result.onlineCount);
      cr('crPlaying').textContent = nfmt(result.playingCount);
      populateCreatorTable(cr('crLive'), result.online || [], true);
      populateCreatorTable(cr('crHistory'), result.recent || [], false);
      cr('crStatus').textContent = 'อัปเดต ' + dfmt(result.checkedAt);
    } catch (error) { cr('crStatus').textContent = 'โหลดข้อมูลไม่ได้: ' + (error?.message || 'ไม่ทราบสาเหตุ'); }
    finally { creatorLoading = false; }
  }
  window.SMGameCreatorOpen = () => {
    if (!creatorAllowed || !user) return;
    window.SMGameCloseDialog?.();
    creatorDialog.showModal();
    void creatorReload();
  };
  cr('creatorClose').addEventListener('click', () => creatorDialog.close());
  cr('crRefresh').addEventListener('click', () => void creatorReload());
  creatorDialog.addEventListener('click', event => { if (event.target === creatorDialog) creatorDialog.close(); });
  window.SMGameCreatorAuthRefresh = async () => {
    const ticket = ++creatorAccessCounter, expected = user?.id;
    creatorAllowed = false; window.SMGameCreatorCanOpen = false;
    if (creatorDialog.open) creatorDialog.close();
    if (!expected) return;
    try {
      const result = await creatorRequest('access');
      if (ticket !== creatorAccessCounter || user?.id !== expected) return;
      creatorAllowed = result.developer === true;
      window.SMGameCreatorCanOpen = creatorAllowed;
    } catch { if (ticket === creatorAccessCounter) window.SMGameCreatorCanOpen = false; }
  };
  setTimeout(() => void creatorHeartbeat(), 500);
  setInterval(() => void creatorHeartbeat(), 30000);
  setInterval(() => { if (creatorDialog.open) void creatorReload(); }, 15000);
  document.addEventListener('visibilitychange', () => void creatorHeartbeat());
  window.addEventListener('pagehide', () => {
    void fetch(creatorEndpoint, {
      method: 'POST', keepalive: true,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end', sessionId: creatorSession, visitorId: creatorVisitor }),
    }).catch(() => {});
  });
}
