import { createClient } from '@supabase/supabase-js';

// This is a public, browser-safe publishable key. Never use a service-role key here.
const SUPABASE_URL = 'https://jeqbyhzbpivscsduwkcj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf';
const gate = document.getElementById('memberGate');

if (gate) {
  const $ = id => document.getElementById(id);
  const auth = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      storageKey: 'smgame-sumoweb-auth' },
  });
  let user = null;
  let mode = 'login';
  let busy = false;
  const notice = $('memberNotice');

  function setNotice(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle('error', error);
  }
  function setLocked(locked) {
    window.SMGameAuthLocked = locked;
    gate.hidden = !locked;
    document.querySelectorAll('body > *').forEach(element => {
      if (element !== gate && element.tagName !== 'SCRIPT') element.inert = locked;
    });
  }
  function setMode(next) {
    mode = next;
    for (const tab of gate.querySelectorAll('[data-member-mode]')) {
      const active = tab.dataset.memberMode === next;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    }
    $('memberSubmit').textContent = next === 'signup' ? 'สมัครสมาชิกและเริ่มเล่น' : 'เข้าสู่เกม';
    $('memberPassword').setAttribute('autocomplete', next === 'signup' ? 'new-password' : 'current-password');
    setNotice('');
  }
  function setUser(next) {
    const previousId = user?.id;
    const nextId = next?.id;
    if (previousId && previousId !== nextId) window.SMGameAuthReset?.();
    user = next || null;
    setLocked(!user);
    if (user) setNotice('');
  }
  gate.querySelectorAll('[data-member-mode]').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.memberMode)));
  $('memberForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const email = $('memberEmail').value.trim().toLowerCase();
    const password = $('memberPassword').value;
    if (!email || password.length < 6) { setNotice('กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษรค่ะ', true); return; }
    busy = true;
    $('memberSubmit').disabled = true;
    setNotice('กำลังเชื่อมต่อบัญชี…');
    try {
      const result = mode === 'signup'
        ? await auth.auth.signUp({ email, password })
        : await auth.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session?.user) {
        setUser(result.data.session.user);
      } else if (mode === 'signup') {
        setMode('login');
        setNotice('บัญชีถูกสร้างแล้ว แต่ SUMOWEB ยังเปิดการยืนยันอีเมลอยู่ กรุณาติดต่อผู้ดูแลเกมเพื่อเปิดใช้งาน', true);
      } else {
        setNotice('กรุณายืนยันอีเมลก่อนเข้าสู่เกมค่ะ', true);
      }
    } catch (error) {
      setNotice(error?.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้องค่ะ'
        : `ดำเนินการไม่สำเร็จ: ${error?.message || 'เชื่อมต่อไม่ได้'}`, true);
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
