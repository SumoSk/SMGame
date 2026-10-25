import { TrafficRenderer } from './renderer3d.js?v=dba739116dca';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=02cb40078bda');
await import('./member.js?v=6013d475a727');
