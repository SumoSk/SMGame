import { TrafficRenderer } from './renderer3d.js?v=91c2f3dbf4c8';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=dynamic-citizens-v21');
await import('./member.js?v=cloud-menu-v1');
