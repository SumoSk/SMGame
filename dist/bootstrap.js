import { TrafficRenderer } from './renderer3d.js?v=2339cd52c7a5';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5.4.1.01-departuretrace');
await import('./member.js?v=b69077e85804');
await import('./simple-account.js?v=f0e18ac2dc32');
await import('./save-storage.js?v=8069010fdb49');
