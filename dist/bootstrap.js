import { TrafficRenderer } from './renderer3d.js?v=a278c50a5a8f';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=d4a5d28795ae');
await import('./member.js?v=6013d475a727');
