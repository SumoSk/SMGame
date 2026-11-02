import { TrafficRenderer } from './renderer3d.js?v=1f7ab7ecd949';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5.3.2-parking-lock-cleanup-2');
await import('./member.js?v=f5d63f7fee00');
await import('./simple-account.js?v=18eb5d10b73f');
await import('./save-storage.js?v=ace1633a0f8e');
