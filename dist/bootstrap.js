import { TrafficRenderer } from './renderer3d.js?v=all-road-sunlight-20261110';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=smcity-5.6-traffic-fix-20261111');
await import('./member.js?v=4ed815769287');
await import('./simple-account.js?v=legacy-save-off-20261110');
await import('./save-storage.js?v=legacy-save-off-20261110');

