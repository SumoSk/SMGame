import { TrafficRenderer } from './renderer3d.js?v=a66e0c225e47';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=43412bc99dd7');
await import('./member.js?v=4ed815769287');
await import('./simple-account.js?v=18eb5d10b73f');
await import('./save-storage.js?v=ace1633a0f8e');

