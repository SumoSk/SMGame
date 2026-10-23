import { TrafficRenderer } from './renderer3d.js?v=a0808b938541';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=5e92f878908d');
await import('./member.js?v=75c18fc08142');
