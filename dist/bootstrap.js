import { TrafficRenderer } from './renderer3d.js?v=82bf4d2fefb4';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=2a915fce85fe');
await import('./member.js?v=dc553cf1ac1d');
await import('./simple-account.js?v=37e0921a86fa');
