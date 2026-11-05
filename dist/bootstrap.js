import { TrafficRenderer } from './renderer3d.js?v=e33c6090dff0';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=bb39d397cae9');
await import('./member.js?v=d7a8baf4780f');
await import('./simple-account.js?v=f0e18ac2dc32');
await import('./save-storage.js?v=8069010fdb49');
