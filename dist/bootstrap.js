import { TrafficRenderer } from './renderer3d.js?v=8de3ba20352e';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=548b649867da');
await import('./member.js?v=0192e592dd74');
await import('./simple-account.js?v=37e0921a86fa');
