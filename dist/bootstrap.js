import { TrafficRenderer } from './renderer3d.js?v=terrain-mask-20261109b';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=wide-bend-lane-20261110a');
await import('./member.js?v=4ed815769287');
await import('./simple-account.js?v=legacy-save-off-20261110');
await import('./save-storage.js?v=legacy-save-off-20261110');

