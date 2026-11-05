import { TrafficRenderer } from './renderer3d.js?v=fb0fbca15cf4';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=af880f9ca1b0');
await import('./member.js?v=3dd8897022f8');
await import('./simple-account.js?v=f0e18ac2dc32');
await import('./save-storage.js?v=8069010fdb49');
