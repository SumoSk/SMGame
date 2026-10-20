import { TrafficRenderer } from './renderer3d.js?v=2589b9112fb6';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=8dec43fe5c74');
