import { TrafficRenderer } from './renderer3d.js?v=db4aad23c43f';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=1b4fb847d9f9');
await import('./member.js?v=f91c3b32dcff');
