import { TrafficRenderer } from './renderer3d.js?v=44ddd3e47403';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=9a679eb0f218');
await import('./member.js?v=f5d63f7fee00');
await import('./simple-account.js?v=18eb5d10b73f');
await import('./save-storage.js?v=ace1633a0f8e');
