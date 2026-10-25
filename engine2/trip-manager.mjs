// SMCITY Trip Manager 2.0 — lifecycle adapter independent of citizen schedules.
// Existing citizen routine may emit an intention when it is due; the trip manager
// requests exactly one departure and handles arrival/failure/cancellation.
import { TrafficEngine } from './traffic-core.mjs';

export class TripManager {
  constructor(engine, { onCompleted = () => {}, onFailed = () => {},
    onCanceled = () => {}, historyLimit = 500 } = {}) {
    if (!(engine instanceof TrafficEngine)) throw new TypeError('engine required');
    if (!Number.isInteger(historyLimit) || historyLimit < 0)
      throw new RangeError('invalid historyLimit');
    this.engine = engine; this.historyLimit = historyLimit;
    this.trips = new Map(); this.activeByCitizen = new Map();
    this.onCompleted = onCompleted; this.onFailed = onFailed;
    this.onCanceled = onCanceled;
    const oldArrival = engine.onArrival, oldFailure = engine.onFailure;
    engine.onArrival = trip => {
      oldArrival(trip);
      this._finish(trip.id, 'completed', null);
    };
    engine.onFailure = (trip, reason) => {
      oldFailure(trip, reason);
      this._finish(trip.id, 'failed', reason);
    };
  }
  schedule({ tripId, citizenId, originNode, destinationNode,
    departureAt = this.engine.time, purpose = 'outing', speedFactor = 1 }) {
    if (tripId == null || citizenId == null)
      throw new TypeError('tripId and citizenId are required');
    if (this.trips.has(tripId)) throw new Error('trip already exists');
    if (this.activeByCitizen.has(citizenId))
      throw new Error('citizen already has a pending or active trip');
    const record = {
      tripId, citizenId, originNode, destinationNode, departureAt,
      purpose, status: 'scheduled', error: null, endedAt: null
    };
    this.engine.planTrip({
      id: tripId, from: originNode, to: destinationNode,
      at: departureAt, speedFactor
    });
    this.trips.set(tripId, record);
    this.activeByCitizen.set(citizenId, tripId);
    return { ...record };
  }
  get(tripId) {
    const record = this.trips.get(tripId); if (!record) return null;
    if (record.status === 'scheduled' && this.engine.vehicles.has(tripId))
      return { ...record, status: 'driving' };
    return { ...record };
  }
  cancel(tripId, reason = 'canceled') {
    const record = this.trips.get(tripId);
    if (!record || record.endedAt !== null) return false;
    this.engine.cancelTrip(tripId);
    this._finish(tripId, 'canceled', reason);
    return true;
  }
  cancelCitizen(citizenId, reason = 'citizen_removed') {
    const tripId = this.activeByCitizen.get(citizenId);
    return tripId == null ? false : this.cancel(tripId, reason);
  }
  _finish(tripId, status, error) {
    const trip = this.trips.get(tripId);
    if (!trip || trip.endedAt !== null) return;
    trip.status = status; trip.error = error; trip.endedAt = this.engine.time;
    if (this.activeByCitizen.get(trip.citizenId) === tripId)
      this.activeByCitizen.delete(trip.citizenId);
    const snapshot = { ...trip };
    if (status === 'completed') this.onCompleted(snapshot);
    if (status === 'failed') this.onFailed(snapshot);
    if (status === 'canceled') this.onCanceled(snapshot);
    // Bound completed history; never evict active travel records.
    if (this.trips.size > this.historyLimit) {
      for (const [id, old] of this.trips) {
        if (this.trips.size <= this.historyLimit) break;
        if (old.endedAt !== null) this.trips.delete(id);
      }
    }
  }
}
