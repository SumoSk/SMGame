// SMCITY 2.0 independent parking-slot and building-gate allocator.
// It makes no simulation-timer callbacks. Waiting requests wake only on release.
export class ParkingController {
  constructor({ onAdmitted = () => {}, onRejected = () => {} } = {}) {
    this.buildings = new Map();
    this.onAdmitted = onAdmitted; this.onRejected = onRejected;
    this.metrics = { reservations: 0, queued: 0, released: 0, rejected: 0 };
  }
  register(buildingId, capacity, { maxEntranceQueue = Infinity } = {}) {
    if (buildingId == null || this.buildings.has(buildingId) ||
      !Number.isInteger(capacity) || capacity < 0 ||
      !Number.isFinite(maxEntranceQueue) && maxEntranceQueue !== Infinity)
      throw new TypeError('invalid parking building');
    const entry = { id: buildingId, capacity, spots: new Map(),
      waiting: [], maxEntranceQueue, status: 'open' };
    this.buildings.set(buildingId, entry);
    return entry;
  }
  request(buildingId, tripId) {
    const building = this.buildings.get(buildingId);
    if (!building || building.status !== 'open' || tripId == null) {
      this.metrics.rejected++; this.onRejected({ buildingId, tripId, reason: 'closed' });
      return { status: 'rejected', reason: 'closed' };
    }
    if (building.spots.has(tripId)) return { status: 'reserved', slot: building.spots.get(tripId) };
    if (building.waiting.includes(tripId)) return { status: 'queued' };
    if (building.spots.size < building.capacity) {
      const slot = this._freeSpot(building);
      building.spots.set(tripId, slot);
      this.metrics.reservations++; this.onAdmitted({ buildingId, tripId, slot });
      return { status: 'reserved', slot };
    }
    if (building.waiting.length >= building.maxEntranceQueue) {
      this.metrics.rejected++;
      this.onRejected({ buildingId, tripId, reason: 'queue_full' });
      return { status: 'rejected', reason: 'queue_full' };
    }
    building.waiting.push(tripId); this.metrics.queued++;
    return { status: 'queued' };
  }
  _freeSpot(building) {
    const taken = new Set(building.spots.values());
    for (let i = 0; i < building.capacity; i++)
      if (!taken.has(i)) return i;
    throw new Error('parking capacity invariant violated');
  }
  release(buildingId, tripId) {
    const building = this.buildings.get(buildingId);
    if (!building) return false;
    const waitingIndex = building.waiting.indexOf(tripId);
    if (waitingIndex >= 0) {
      building.waiting.splice(waitingIndex, 1); return true;
    }
    if (!building.spots.delete(tripId)) return false;
    this.metrics.released++;
    while (building.waiting.length && building.spots.size < building.capacity) {
      const nextTripId = building.waiting.shift();
      const slot = this._freeSpot(building);
      building.spots.set(nextTripId, slot);
      this.metrics.reservations++;
      this.onAdmitted({ buildingId, tripId: nextTripId, slot });
    }
    return true;
  }
  isReserved(buildingId, tripId) {
    return this.buildings.get(buildingId)?.spots.has(tripId) ?? false;
  }
  remove(buildingId) {
    const building = this.buildings.get(buildingId);
    if (!building) return false;
    building.status = 'closed';
    for (const tripId of [...building.waiting, ...building.spots.keys()]) {
      this.metrics.rejected++;
      this.onRejected({ buildingId, tripId, reason: 'demolished' });
    }
    building.waiting.length = 0; building.spots.clear();
    return this.buildings.delete(buildingId);
  }
  snapshot() {
    return [...this.buildings.values()].map(building => ({
      id: building.id, capacity: building.capacity,
      occupied: building.spots.size, waiting: building.waiting.length
    }));
  }
}
