// On-demand traffic cost snapshots. Counts change on edge entry/exit, but
// routing weights are recalculated at most once per refresh interval.
// This avoids invalidating thousands of route caches during rush-hour bursts.
export class TrafficEstimator {
  constructor(network, { refreshSeconds = 10, carSpace = 1.05,
    saturationPenalty = 3, maxCongestion = 8 } = {}) {
    for (const value of [refreshSeconds,carSpace,saturationPenalty,maxCongestion])
      if (!Number.isFinite(value) || value <= 0) throw new RangeError('invalid estimator parameter');
    this.network = network;
    this.refreshSeconds = refreshSeconds; this.carSpace = carSpace;
    this.saturationPenalty = saturationPenalty; this.maxCongestion = maxCongestion;
    this.nextRefresh = refreshSeconds;
    this.counts = new Map(); this.dirty = new Set();
    this.metrics = { refreshes: 0, updatedEdges: 0, countUpdates: 0 };
  }
  edgeEntered(edgeId) {
    if (!this.network.edges.has(edgeId)) return;
    this.counts.set(edgeId, (this.counts.get(edgeId) || 0) + 1);
    this.dirty.add(edgeId); this.metrics.countUpdates++;
  }
  edgeLeft(edgeId) {
    const count = this.counts.get(edgeId) || 0;
    if (count > 0) {
      this.counts.set(edgeId, count - 1);
      this.dirty.add(edgeId); this.metrics.countUpdates++;
    }
  }
  forgetRemovedEdges() {
    for (const id of this.counts.keys()) {
      if (!this.network.edges.has(id)) {
        this.counts.delete(id); this.dirty.delete(id);
      }
    }
  }
  refreshIfDue(now) {
    if (!Number.isFinite(now) || now < this.nextRefresh) return 0;
    this.nextRefresh = now + this.refreshSeconds;
    if (!this.dirty.size) return 0;
    const changes = [];
    for (const id of this.dirty) {
      const edge = this.network.edges.get(id);
      if (!edge) continue;
      const capacity = Math.max(1, edge.length * edge.lanes / this.carSpace);
      const usage = (this.counts.get(id) || 0) / capacity;
      // Zero penalty on uncongested roads; growing delay near saturation.
      const penalty = Math.min(this.maxCongestion,
        Math.max(0, usage - 0.2) * this.saturationPenalty);
      changes.push([id, penalty]);
    }
    this.dirty.clear(); this.metrics.refreshes++;
    const updated = this.network.setCongestionBatch(changes);
    this.metrics.updatedEdges += updated;
    return updated;
  }
}
