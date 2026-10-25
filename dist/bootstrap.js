import { TrafficRenderer } from './renderer3d.js?v=277ed9dd6103';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=6b467e256ffc');
await import('./member.js?v=6013d475a727');
