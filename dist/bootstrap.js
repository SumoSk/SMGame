import { TrafficRenderer } from './renderer3d.js?v=18f78d7631b0';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=a533e133d912');
await import('./member.js?v=dc553cf1ac1d');
await import('./simple-account.js?v=37e0921a86fa');
