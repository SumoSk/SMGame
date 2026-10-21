import { TrafficRenderer } from './renderer3d.js?v=02eb2bdc3321';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=05b29295fb39');
await import('./member.js?v=f91c3b32dcff');
