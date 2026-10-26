import { TrafficRenderer } from './renderer3d.js?v=4c464d061ea5';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=a2985cddee0b');
await import('./member.js?v=6013d475a727');
