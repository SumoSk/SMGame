import { TrafficRenderer } from './renderer3d.js?v=bd1bdfad7e10';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=6dce785944a8');
await import('./member.js?v=dc553cf1ac1d');
await import('./simple-account.js?v=18eb5d10b73f');
await import('./save-storage.js?v=smcity-storage-v1');
