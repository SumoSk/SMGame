// SMCITY 2.0 lane decisions: explicit and deterministic, no per-car global scans.
// The caller indexes vehicles once by edge/lane; changes check only two local neighbours.
const safe = (n) => Number.isFinite(n) ? n : 0;
const key = (edgeId, lane) => String(edgeId) + ':' + lane;

export function laneForMerge(lane, fromCount, toCount) {
  if (!Number.isInteger(fromCount) || fromCount < 1 ||
      !Number.isInteger(toCount) || toCount < 1) throw new RangeError('invalid lane count');
  if (!Number.isInteger(lane) || lane < 0 || lane >= fromCount)
    throw new RangeError('invalid source lane');
  return Math.max(0, Math.min(toCount - 1,
    Math.floor((lane + 0.5) * toCount / fromCount)));
}

function neighbours(sorted, position) {
  // Positions are descending. Binary search finds ahead and behind in O(log n).
  let low = 0, high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid].distance > position) low = mid + 1;
    else high = mid;
  }
  return { ahead: sorted[low - 1] || null, behind: sorted[low] || null };
}

export class LaneController {
  constructor({ gap = 0.6, cooldown = 1.2 } = {}) {
    if (!Number.isFinite(gap) || gap < 0 || !Number.isFinite(cooldown) || cooldown < 0)
      throw new RangeError('invalid lane rules');
    this.gap = gap;
    this.cooldown = cooldown;
    this.index = new Map();
    this.reserved = new Set();
    this.metrics = { attempted: 0, accepted: 0, rejected: 0 };
  }
  beginStep(vehicles) {
    this.index.clear(); this.reserved.clear();
    for (const vehicle of vehicles) {
      if (vehicle.status !== 'moving') continue;
      const edgeId = vehicle.route[vehicle.edgeIndex];
      const k = key(edgeId, vehicle.lane);
      if (!this.index.has(k)) this.index.set(k, []);
      this.index.get(k).push(vehicle);
    }
    for (const group of this.index.values())
      group.sort((a,b) => b.distance - a.distance);
  }
  nearest(edgeId, lane, position) {
    return neighbours(this.index.get(key(edgeId, lane)) || [], position);
  }
  tryChange(vehicle, targetLane, { now, edgeLength, speed = 0 } = {}) {
    this.metrics.attempted++;
    const edgeId = vehicle.route[vehicle.edgeIndex];
    if (vehicle.status !== 'moving' || !Number.isInteger(targetLane) ||
        Math.abs(targetLane - vehicle.lane) !== 1 ||
        !Number.isFinite(edgeLength) || vehicle.distance >= edgeLength - 1 ||
        safe(now) - (Number.isFinite(vehicle.lastLaneChangeAt) ? vehicle.lastLaneChangeAt : -Infinity) < this.cooldown) {
      this.metrics.rejected++; return false;
    }
    const oldKey = key(edgeId, vehicle.lane), newKey = key(edgeId, targetLane);
    if (this.reserved.has(String(vehicle.id)) || this.reserved.has(newKey + ':' + Math.round(vehicle.distance))) {
      this.metrics.rejected++; return false;
    }
    const near = this.nearest(edgeId, targetLane, vehicle.distance);
    const requiredAhead = vehicle.length + this.gap + Math.max(0, speed) * 0.2;
    const requiredBehind = this.gap + (near.behind?.length || 0) + Math.max(0, speed) * 0.2;
    if ((near.ahead && near.ahead.distance - vehicle.distance < requiredAhead) ||
        (near.behind && vehicle.distance - near.behind.distance < requiredBehind)) {
      this.metrics.rejected++; return false;
    }
    const source = this.index.get(oldKey), target = this.index.get(newKey) || [];
    const sourceIndex = source?.indexOf(vehicle) ?? -1;
    if (sourceIndex < 0) { this.metrics.rejected++; return false; }
    source.splice(sourceIndex, 1);
    vehicle.previousLane = vehicle.lane;
    vehicle.lane = targetLane; vehicle.lastLaneChangeAt = now;
    target.push(vehicle); target.sort((a,b)=>b.distance-a.distance);
    this.index.set(newKey, target);
    this.reserved.add(String(vehicle.id));
    this.reserved.add(newKey + ':' + Math.round(vehicle.distance));
    this.metrics.accepted++;
    return true;
  }
  chooseDownstreamLane(nextEdge, fromLane, fromCount, entryStarts, vehicleLength, gap = this.gap) {
    const preferred = laneForMerge(fromLane, fromCount, nextEdge.lanes);
    const options = Array.from({ length: nextEdge.lanes }, (_, i) => i)
      .sort((a,b) => Math.abs(a-preferred)-Math.abs(b-preferred) || a-b);
    for (const lane of options) {
      const nearest = entryStarts.get(key(nextEdge.id, lane)) ?? Infinity;
      if (nearest - vehicleLength - gap >= 0) return lane;
    }
    return null;
  }
}
