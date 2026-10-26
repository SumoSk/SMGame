const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const noop = () => {};
const handlers = new Map(), timers = new Map(), elements = new Map();
let nextTimer = 1, game;
function element() {
  return {
    textContent: '', innerHTML: '', style: {}, open: false,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, showModal() { this.open = true; }, close() { this.open = false; },
    getContext: () => new Proxy({}, { get: () => noop }),
    setPointerCapture: noop, hasPointerCapture: () => false, releasePointerCapture: noop,
  };
}
const get = id => {
  if (!elements.has(id)) elements.set(id, element());
  return elements.get(id);
};
get('world').addEventListener = (name, handler) => handlers.set(name, handler);
const document = { getElementById: get, querySelector: () => element(), querySelectorAll: () => [] };
const sandbox = {
  document, window: { addEventListener: noop, __TRAFFIC_TEST_HARNESS__: value => { game = value; } },
  innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1,
  requestAnimationFrame: noop,
  setTimeout: (callback, delay) => { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
  clearTimeout: id => timers.delete(id),
  localStorage: { setItem: noop, getItem: () => null }, console,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js', 'utf8'), sandbox);

function event(kind, id, x, y, pointerType = 'touch') {
  const handler = handlers.get(kind);
  assert.ok(handler, `Missing ${kind} handler`);
  handler({ pointerId: id, clientX: x, clientY: y, pointerType, button: 0, shiftKey: false, preventDefault: noop });
}
function tap(id, x, y, type = 'touch') {
  event('pointerdown', id, x, y, type);
  event('pointerup', id, x, y, type);
}
function pendingTaps() {
  return [...timers.values()].filter(task => task.delay === 320).length;
}
function flushTap() {
  const tasks = [...timers.entries()].filter(([, task]) => task.delay === 320);
  tasks.forEach(([id, task]) => { timers.delete(id); task.callback(); });
}

game.selectTool('small');
const roadsBefore = game.state.roads.size;
tap(1, 450, 400);
assert.equal(pendingTaps(), 1, 'First touch waits before placing a road');
assert.equal(game.state.roads.size, roadsBefore, 'First tap has not changed the map yet');
tap(2, 457, 405);
assert.equal(pendingTaps(), 0, 'Second nearby tap cancels pending construction');
assert.equal(game.state.roads.size, roadsBefore, 'Double-tap must not build any road');
assert.match(get('hint').textContent, /ลากแผนที่เพื่อเลื่อน/, 'Double-tap selects empty hand');
assert.equal(get('dialog').open, false, 'Double-tap does not open a confirmation dialog');

game.selectTool('eraseRoad');
get('toast').textContent = '';
tap(3, 500, 400);
assert.equal(get('toast').textContent, '', 'Single touch has not demolished or warned yet');
assert.equal(pendingTaps(), 1);
flushTap();
assert.ok(get('toast').textContent, 'A single touch still executes after the double-tap window');

get('toast').textContent = '';
tap(4, 500, 400);
event('pointerdown', 5, 800, 400);
assert.equal(pendingTaps(), 0, 'A distant second tap commits the first touch');
assert.match(get('hint').textContent, /รื้อ/, 'Separate taps do not cancel the selected tool');
event('pointerup', 5, 800, 400);
flushTap();

game.selectTool('small');
event('pointerdown', 6, 450, 400);
event('pointermove', 6, 510, 400);
event('pointerup', 6, 510, 400);
assert.equal(pendingTaps(), 0, 'Dragging a road still acts immediately');

game.selectTool('small');
event('pointerdown', 7, 450, 400);
event('pointerdown', 8, 480, 400);
event('pointerup', 7, 450, 400);
event('pointerup', 8, 480, 400);
assert.equal(pendingTaps(), 0, 'Two simultaneous fingers remain a pinch gesture');
assert.match(get('hint').textContent, /ลากจากถนนเดิม/, 'Pinch does not cancel construction mode');

console.log(JSON.stringify({ passed: true, coverage: [
  'double tap cancels before build dialog', 'single touch still performs action',
  'separate taps do not cancel', 'road drag is immediate', 'pinch remains a gesture',
] }));
