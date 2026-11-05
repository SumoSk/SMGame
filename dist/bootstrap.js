import { TrafficRenderer } from './renderer3d.js?v=e33c6090dff0';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5.4.13');
await import('./member.js?v=4ed815769287');
await import('./simple-account.js?v=f0e18ac2dc32');
await import('./save-storage.js?v=8069010fdb49');
