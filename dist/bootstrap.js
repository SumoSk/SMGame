import { TrafficRenderer } from './renderer3d.js?v=a0808b938541';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=f23e4a210ac8');
await import('./member.js?v=a7bafe96bd65');
