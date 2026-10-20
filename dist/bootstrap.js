import { TrafficRenderer } from './renderer3d.js?v=db4aad23c43f';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=12b89501804a');
await import('./member.js?v=3b3bd0af6ae1');
