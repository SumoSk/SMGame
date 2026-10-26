import { TrafficRenderer } from './renderer3d.js?v=4c464d061ea5';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=daf2d157d198');
await import('./member.js?v=4af9e464d840');
