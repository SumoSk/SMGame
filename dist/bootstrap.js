import { TrafficRenderer } from './renderer3d.js?v=signal360-sculpted-20261109d';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=parliament-20261108a');
await import('./member.js?v=4ed815769287');
await import('./simple-account.js?v=18eb5d10b73f');
await import('./save-storage.js?v=ace1633a0f8e');

