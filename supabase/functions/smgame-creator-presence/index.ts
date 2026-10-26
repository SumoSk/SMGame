import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const devices = new Set(['desktop', 'ipad', 'iphone', 'android', 'tablet', 'other']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, length: number) => String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, length);
const nonnegative = (value: unknown, max: number) => {
 const number = Number(value);
 return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : 0;
};
const originAllowed = (origin: string | null) =>
 origin === 'https://sumosk.github.io' ||
 (origin !== null && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
Deno.serve(async (req: Request) => {
 const origin = req.headers.get('origin');
 const headers = {
  'Access-Control-Allow-Origin': originAllowed(origin) ? origin! : 'https://sumosk.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Vary': 'Origin',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
 };
 const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
 if (req.method === 'OPTIONS') return new Response(null, { headers });
 if (req.method !== 'POST') return reply(405, { message: 'Method not allowed' });
 if (!originAllowed(origin)) return reply(403, { message: 'Origin not allowed' });
 // This key is public and not sufficient for authorization; creator role is
 // always checked against a verified Auth identity on the server.
 if (![anonKey, 'sb_publishable_yEaGo1wDqb4qehdi702eMQ_ZqyVcHuf'].includes(req.headers.get('apikey') ?? ''))
  return reply(401, { message: 'Missing application key' });
 let body: Record<string, unknown>;
 try {
  const raw = await req.text();
  if (raw.length > 3000000) return reply(413, { message: 'Snapshot too large (3 MB limit)' });
  body = JSON.parse(raw);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('body');
 } catch { return reply(400, { message: 'Invalid request body' }); }
 const action = body.action;
 if (JSON.stringify(body).length > 2400 && action !== 'submit-live-snapshot') return reply(413, { message: 'Payload too large' });
 const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
 let authenticated: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
 if (bearer) {
  const { data, error } = await admin.auth.getUser(bearer);
  if (error || !data.user) return reply(401, { message: 'Session expired; please sign in again' });
  authenticated = data.user;
 }
 if (action === 'access' || action === 'dashboard' || action === 'list-saves' || action === 'get-save' || action === 'request-live-snapshot' || action === 'get-live-snapshot') {
  if (!authenticated) return reply(401, { message: 'Sign in required' });
  const role = await admin.from('smgame_creator_roles')
    .select('role').eq('user_id', authenticated.id).eq('role', 'developer').maybeSingle();
  if (role.error) return reply(503, { message: 'Creator access unavailable' });
  if (!role.data) return reply(403, { message: 'Developer only' });

  if (action === 'list-saves') {
    // Metadata only. Full saves are returned individually after a developer selects one.
    const { data: saves, error } = await admin.from('smgame_saves')
      .select('user_id,slot_id,name,updated_at')
      .order('updated_at', { ascending: false }).limit(200);
    if (error) return reply(503, { message: 'Cannot load player saves' });
    const ownerIds = [...new Set((saves || []).map(row => row.user_id))];
    const ownerNames = new Map<string, string>();
    for (let offset = 0; offset < ownerIds.length; offset += 8) {
      await Promise.all(ownerIds.slice(offset, offset + 8).map(async (id: string) => {
        const { data } = await admin.auth.admin.getUserById(id);
        const account = data?.user;
        const label = account?.user_metadata?.username || account?.user_metadata?.display_name ||
          account?.email || ('ผู้เล่น #' + id.slice(0, 8));
        ownerNames.set(id, clean(label, 90) || ('ผู้เล่น #' + id.slice(0, 8)));
      }));
    }
    return reply(200, {
      saves: (saves || []).map(row => ({
        ownerId: row.user_id, ownerName: ownerNames.get(row.user_id) || 'ผู้เล่น',
        slotId: row.slot_id, name: row.name, updatedAt: row.updated_at,
        isOwn: row.user_id === authenticated.id
      })),
      limit: 200
    });
  }
  if (action === 'get-save') {
    const ownerId = clean(body.ownerId, 40), slotId = clean(body.slotId, 120);
    if (!uuid.test(ownerId) || !slotId || slotId.length > 120) return reply(400, { message: 'Invalid save selection' });
    const { data: save, error } = await admin.from('smgame_saves')
      .select('user_id,slot_id,name,updated_at,data')
      .eq('user_id', ownerId).eq('slot_id', slotId).maybeSingle();
    if (error) return reply(503, { message: 'Cannot load selected save' });
    if (!save) return reply(404, { message: 'Save not found' });
    return reply(200, { ownerId: save.user_id, slotId: save.slot_id,
      name: save.name, updatedAt: save.updated_at, data: save.data });
  }

  if (action === 'request-live-snapshot') {
    const sessionId = clean(body.sessionId, 40);
    if (!uuid.test(sessionId)) return reply(400, { message: 'Invalid player session' });
    const onlineSince = new Date(Date.now() - 90000).toISOString();
    const { data: target, error: findError } = await admin.from('smgame_visitor_sessions')
      .select('session_id,visitor_id,display_name')
      .eq('session_id', sessionId).is('closed_at', null).eq('is_visible', true)
      .gte('last_seen_at', onlineSince).maybeSingle();
    if (findError) return reply(503, { message: 'Cannot check player presence' });
    if (!target) return reply(409, { message: 'ผู้เล่นออกจากเกมหรือไม่ได้ออนไลน์แล้วค่ะ' });
    // One pending request per player, plus bounded developer requests.
    const { count, error: countError } = await admin.from('smgame_live_snapshot_requests')
      .select('id', { head: true, count: 'exact' }).eq('requester_id', authenticated.id)
      .gte('requested_at', new Date(Date.now() - 60000).toISOString());
    if (countError) return reply(503, { message: 'Live request unavailable' });
    if ((count || 0) >= 10) return reply(429, { message: 'ขอข้อมูลบ่อยเกินไป กรุณาลองใหม่ค่ะ' });
    const now = new Date().toISOString();
    const pending = await admin.from('smgame_live_snapshot_requests')
      .select('id').eq('target_session_id', sessionId).eq('status', 'pending')
      .gt('expires_at', now).limit(1);
    if (pending.error) return reply(503, { message: 'Live request unavailable' });
    if (pending.data?.length) return reply(409, { message: 'มีคำขอเมืองสดของผู้เล่นนี้อยู่แล้วค่ะ' });
    const { data: request, error } = await admin.from('smgame_live_snapshot_requests')
      .insert({ target_session_id: sessionId, target_visitor_id: target.visitor_id,
        requester_id: authenticated.id })
      .select('id,requested_at,expires_at').single();
    if (error) return reply(503, { message: 'Cannot create live request' });
    // Remove previously expired snapshots opportunistically; never include expired data in responses.
    await admin.from('smgame_live_snapshot_requests').delete()
      .lt('expires_at', new Date(Date.now() - 10 * 60000).toISOString());
    return reply(200, { requestId: request.id, expiresAt: request.expires_at,
      playerName: target.display_name });
  }
  if (action === 'get-live-snapshot') {
    const requestId = clean(body.requestId, 40);
    if (!uuid.test(requestId)) return reply(400, { message: 'Invalid request' });
    const { data: request, error } = await admin.from('smgame_live_snapshot_requests')
      .select('status,snapshot,captured_at,error_message,expires_at,target_session_id')
      .eq('id', requestId).eq('requester_id', authenticated.id).maybeSingle();
    if (error) return reply(503, { message: 'Cannot check live request' });
    if (!request) return reply(404, { message: 'Live request not found' });
    if (new Date(request.expires_at).getTime() <= Date.now())
      return reply(200, { status: 'expired' });
    if (request.status === 'error')
      return reply(200, { status: 'error', message: request.error_message || 'จับภาพเมืองไม่สำเร็จ' });
    if (request.status === 'ready')
      return reply(200, { status: 'ready', data: request.snapshot, capturedAt: request.captured_at });
    const { data: target } = await admin.from('smgame_visitor_sessions')
      .select('closed_at,last_seen_at').eq('session_id', request.target_session_id).maybeSingle();
    if (!target || target.closed_at ||
        new Date(target.last_seen_at).getTime() < Date.now() - 90000)
      return reply(200, { status: 'offline' });
    return reply(200, { status: 'pending' });
  }
  if (action === 'access') return reply(200, { developer: true });
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const onlineSince = new Date(Date.now() - 90000).toISOString();
  const [recent, online, total] = await Promise.all([
   admin.from('smgame_visitor_sessions')
    .select('session_id,visitor_id,display_name,device,city,started_at,last_seen_at,closed_at,active_seconds,is_visible,is_playing,population,tourists,vehicles,buildings')
    .gte('started_at', since).order('started_at', { ascending: false }).limit(150),
   admin.from('smgame_visitor_sessions')
    .select('session_id,visitor_id,display_name,device,city,started_at,last_seen_at,active_seconds,is_visible,is_playing,population,tourists,vehicles,buildings')
    .is('closed_at', null).gte('last_seen_at', onlineSince)
    .order('last_seen_at', { ascending: false }).limit(150),
   admin.from('smgame_visitor_sessions')
    .select('session_id', { count: 'exact', head: true }).gte('started_at', since)
  ]);
  if (recent.error || online.error || total.error) return reply(503, { message: 'Cannot load creator analytics' });
  return reply(200, {
   online: online.data || [],
   recent: recent.data || [],
   visits30d: total.count ?? 0,
   onlineCount: (online.data || []).length,
   playingCount: (online.data || []).filter(row => row.is_visible && row.is_playing).length,
   checkedAt: new Date().toISOString(),
   windowSeconds: 90
  });
 }

 if (action === 'submit-live-snapshot' || action === 'fail-live-snapshot') {
   const sessionId = clean(body.sessionId, 40), visitorId = clean(body.visitorId, 40);
   const requestId = clean(body.requestId, 40);
   if (!uuid.test(sessionId) || !uuid.test(visitorId) || !uuid.test(requestId))
     return reply(400, { message: 'Invalid live snapshot identifiers' });
   const now = new Date().toISOString();
   const { data: pending, error: pendingError } = await admin.from('smgame_live_snapshot_requests')
     .select('id').eq('id', requestId).eq('target_session_id', sessionId)
     .eq('target_visitor_id', visitorId).eq('status', 'pending')
     .gt('expires_at', now).maybeSingle();
   if (pendingError) return reply(503, { message: 'Live request unavailable' });
   if (!pending) return reply(404, { message: 'No active live request' });
   if (action === 'fail-live-snapshot') {
     const reason = clean(body.reason, 120) || 'ไม่สามารถจับภาพเมืองได้';
     const { error } = await admin.from('smgame_live_snapshot_requests')
       .update({ status: 'error', error_message: reason }).eq('id', requestId).eq('status', 'pending');
     return error ? reply(503, { message: 'Cannot report snapshot failure' }) : reply(200, { ok: true });
   }
   const snapshot = body.snapshot;
   if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) ||
       snapshot.format !== 2 || !Array.isArray(snapshot.roads) ||
       !Array.isArray(snapshot.buildings) || !Array.isArray(snapshot.citizens) ||
       !Array.isArray(snapshot.vehicles))
     return reply(400, { message: 'Invalid city snapshot' });
   const { error } = await admin.from('smgame_live_snapshot_requests')
     .update({ status: 'ready', snapshot, captured_at: now })
     .eq('id', requestId).eq('status', 'pending');
   return error ? reply(503, { message: 'Cannot store live snapshot' }) : reply(200, { ok: true });
 }
 if (action !== 'ping' && action !== 'end') return reply(400, { message: 'Unknown action' });
 const sessionId = clean(body.sessionId, 40), visitorId = clean(body.visitorId, 40);
 if (!uuid.test(sessionId) || !uuid.test(visitorId)) return reply(400, { message: 'Invalid visitor session' });
 if (action === 'end') {
  // Guests cannot query other sessions. A random per-tab UUID makes blind
  // mutation impractical; no authentication-sensitive data is updated here.
  const { error } = await admin.from('smgame_visitor_sessions')
   .update({ closed_at: new Date().toISOString(), is_visible: false, is_playing: false })
   .eq('session_id', sessionId).eq('visitor_id', visitorId);
  if (error) return reply(503, { message: 'Visit status unavailable' });
  return reply(200, { ok: true });
 }
 const device = clean(body.device, 12);
 const name = authenticated
  ? clean(authenticated.user_metadata?.username || authenticated.email || 'สมาชิก', 90) || 'สมาชิก'
  : 'ผู้เยี่ยมชม #' + visitorId.slice(0, 8).toUpperCase();
 const row = {
  session_id: sessionId,
  visitor_id: visitorId,
  user_id: authenticated?.id ?? null,
  display_name: name,
  device: devices.has(device) ? device : 'other',
  city: clean(body.city, 36) || 'unknown',
  last_seen_at: new Date().toISOString(),
  closed_at: null,
  active_seconds: nonnegative(body.activeSeconds, 864000),
  is_visible: body.isVisible === true,
  is_playing: body.isVisible === true && body.isPlaying === true,
  population: nonnegative(body.population, 1000000),
  tourists: nonnegative(body.tourists, 1000000),
  vehicles: nonnegative(body.vehicles, 1000000),
  buildings: nonnegative(body.buildings, 1000000)
 };
 const { error } = await admin.from('smgame_visitor_sessions').upsert(row, { onConflict: 'session_id' });
 if (error) return reply(503, { message: 'Visit status unavailable' });
 if (row.is_visible) {
   const pending = await admin.from('smgame_live_snapshot_requests')
     .select('id').eq('target_session_id', sessionId).eq('target_visitor_id', visitorId)
     .eq('status', 'pending').gt('expires_at', new Date().toISOString())
     .order('requested_at', { ascending: true }).limit(1);
   if (!pending.error && pending.data?.length) return reply(200, {
     ok: true, liveRequestId: pending.data[0].id
   });
 }
 return reply(200, { ok: true });
});
