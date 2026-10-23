import { TrafficRenderer } from './renderer3d.js?v=f83f39b0e6f0';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f1302f6f706c');
await import('./member.js?v=75c18fc08142');
