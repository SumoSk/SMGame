// One-way data adapter from SMCITY city-road records to new RoadNetwork.
// Reading legacy *data* is intentional; legacy traffic algorithms are never reused.
// Reconcile is called only after construction/demolition, not every render tick.
import { RoadNetwork } from './traffic-core.mjs';

export class CityRoadAdapter {
  constructor({ gridWidth = 300, types = null, network = new RoadNetwork() } = {}) {
    if (!Number.isInteger(gridWidth) || gridWidth <= 0) throw new RangeError('gridWidth');
    this.gridWidth = gridWidth;
    this.types = types || {
      small:{lanes:2,speed:3},
      medium:{lanes:4,speed:4.5},
      large:{lanes:8,speed:6}
    };
    this.network = network;
    this.edgeSignatures = new Map();
    this.metrics = { syncs:0, changedEdges:0 };
  }
  coords(nodeId) {
    if (!Number.isInteger(nodeId) || nodeId < 0)
      throw new TypeError('numeric road node required');
    return { x:nodeId % this.gridWidth, y:Math.floor(nodeId / this.gridWidth) };
  }
  edgeId(from,to) { return String(from) + '>' + String(to); }
  sync(roadMap) {
    if (!(roadMap instanceof Map)) throw new TypeError('roads Map required');
    this.metrics.syncs++;
    for (const nodeId of roadMap.keys()) if (!this.network.nodes.has(nodeId))
      this.network.addNode(nodeId,this.coords(nodeId));
    const wanted=new Map();
    for (const [from,record] of roadMap) {
      const type=this.types[record.type];
      if (!type || !record.links || !(Symbol.iterator in Object(record.links)))
        throw new TypeError('malformed road record');
      for (const to of record.links) {
        if (!roadMap.has(to) || from === to) continue;
        const a=this.coords(from),b=this.coords(to);
        const length=Math.hypot(b.x-a.x,b.y-a.y);
        if (length <= 0) continue;
        const id=this.edgeId(from,to), target=this.types[roadMap.get(to).type]||type;
        // Source carriageway defines outbound count, narrowing clamps the next link.
        const lanes=Math.max(1,Math.floor(type.lanes / 2));
        const speed=Math.min(type.speed,target.speed);
        wanted.set(id,{id,from,to,length,speed,lanes});
      }
    }
    let changes=0;
    for(const [id,oldSignature] of this.edgeSignatures) {
      const entry=wanted.get(id);
      const signature=entry && JSON.stringify(entry);
      if (!entry || signature !== oldSignature) {
        this.network.removeEdge(id);
        this.edgeSignatures.delete(id);
        changes++;
      }
    }
    for (const [id,entry] of wanted) {
      if (this.edgeSignatures.has(id)) continue;
      this.network.addEdge(entry);
      this.edgeSignatures.set(id,JSON.stringify(entry));
      changes++;
    }
    this.metrics.changedEdges += changes;
    // Isolated non-road nodes are harmless, but drop them to avoid stale routing.
    for (const id of [...this.network.nodes]) if (!roadMap.has(id))
      this.network.removeNode(id);
    return { changedEdges:changes, nodes:this.network.nodes.size,
      directedLinks:this.network.edges.size };
  }
}
