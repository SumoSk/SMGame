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
      showMember('login');
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
}
