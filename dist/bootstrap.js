import { TrafficRenderer } from './renderer3d.js?v=civic-two-tiers-20261031b';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=civic-two-tiers-20261031b');
await import('./member.js?v=dc553cf1ac1d');
await import('./simple-account.js?v=37e0921a86fa');
