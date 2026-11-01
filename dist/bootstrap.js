import { TrafficRenderer } from './renderer3d.js?v=c18cd7dcfe62';
window.createTrafficRenderer=canvas=>new TrafficRenderer(canvas);
await import('./game.js?v=fd773eba9be8');
await import('./member.js?v=da06a61d5ef5');
await import('./simple-account.js?v=1ba9c2a61924');
await import('./save-storage.js?v=dcfaeda33f9b');

