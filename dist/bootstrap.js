import { TrafficRenderer } from './renderer3d.js?v=9c8a1067397b';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=4168cb738075');
await import('./member.js?v=4ab9b2d0361e');
