import { TrafficRenderer } from './renderer3d.js?v=medium-two-zones-3d-20261023';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=road-lane-unfreeze-20261023');
await import('./member.js?v=toolbar-v2-20261022');
