import { TrafficRenderer } from './renderer3d.js?v=9402be74a9ce';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=8012056aad52');
await import('./member.js?v=4ed815769287');
await import('./simple-account.js?v=18eb5d10b73f');
await import('./save-storage.js?v=ace1633a0f8e');

