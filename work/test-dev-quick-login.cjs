const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('work/member-entry.js', 'utf8');
const anchor = "  $('memberDevQuick')?.addEventListener('click', async () => {";
const start = source.indexOf(anchor);
const end = source.indexOf('  // The login overlay fills', start);
assert(start > 0 && end > start, 'quick Dev action must be bound on the public login icon');
const actionSource = source.slice(start, end);
assert(actionSource.includes('auth.auth.getUser()'), 'server-verified identity, never local-only identity');
assert(actionSource.includes("creatorRequest('access')"), 'server-verified Dev privileges');
assert(!actionSource.includes('signInWithPassword'), 'no hard-coded password or fake password login');

async function attempt({identity = null, permission = false, error = null, save = false, accessError = null} = {}) {
  const events = {}, calls = [], field = {value: ''};
  const quick = {disabled: false, addEventListener(name, fn) {events[name] = fn;}};
  const elements = {memberDevQuick: quick, memberEmail: field};
  const window = {
    SMGameCreatorCanOpen: false,
    async SMGameCreatorAuthRefresh() {calls.push('refresh'); this.SMGameCreatorCanOpen = permission;},
    SMGameCreatorOpen() {calls.push('open');}
  };
  const env = {
    $: id => elements[id],
    auth: {auth: {async getUser() {calls.push('verify'); return {data: {user: identity}, error};}}},
    async creatorRequest(action) {
      assert.equal(action, 'access');
      calls.push('access');
      if (accessError) throw accessError;
      return {developer: permission};
    },
    setMode(mode) {calls.push('mode:' + mode);},
    setNotice(msg, isError) {calls.push('notice:' + (isError ? 'error' : 'info'));},
    setUser(user, refresh) {assert.equal(refresh, false); calls.push('user:' + user.id);},
    setLocked(locked) {calls.push('locked:' + locked);},
    async persistPendingSave() {calls.push('save');},
    window,
    busy: false,
    savingPending: false,
    memberView: 1,
    pendingSave: save ? {serialized:'test'} : null
  };
  // Exercise the actual registered handler from the source file rather than
  // copying its authentication logic into the test.
  const args = Object.keys(env);
  new Function(...args, actionSource)(...Object.values(env));
  assert.equal(typeof events.click, 'function', 'the icon must have a click handler');
  await events.click();
  assert.equal(quick.disabled, false, 'button is usable after all outcomes');
  return {calls,field,window};
}
(async () => {
  let res = await attempt();
  assert.deepEqual(res.calls.filter(x => x === 'access' || x === 'open'), [],
    'guest cannot reach Dev API');
  assert.equal(res.field.value, 'sumoskb@hotmail.com');
  assert(!res.calls.includes('locked:false'), 'guest stays at login');
  res = await attempt({identity: {id:'other',email:'guest@example.com'}, permission: true});
  assert(!res.calls.includes('access') && !res.calls.includes('open'),
    'even a valid unrelated account cannot use this shortcut');
  res = await attempt({identity: {id:'dev',email:'sumoskb@hotmail.com'}, permission: false});
  assert(res.calls.includes('access') && !res.calls.includes('open'),
    'Dev email alone is not enough to grant privileges');
  res = await attempt({identity: {id:'dev',email:'sumoskb@hotmail.com'}, permission: true});
  assert(res.calls.includes('user:dev') && res.calls.includes('locked:false') &&
    res.calls.includes('refresh') && res.calls.includes('open'),
    'existing authenticated Dev opens dashboard without new credentials');
  res = await attempt({identity: {id:'dev',email:'sumoskb@hotmail.com'}, permission: true, save: true});
  assert(res.calls.includes('save') && !res.calls.includes('open'),
    'save flow must not discard the pending save');
  res = await attempt({identity: {id:'dev',email:'sumoskb@hotmail.com'},
    permission: true, accessError: new Error('offline')});
  assert(!res.calls.includes('open') && !res.calls.includes('locked:false'),
    'network errors fail closed rather than bypass verification');
  console.log('Dev ♙ shortcut: six authenticated/guest/permission/save/failure cases passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
