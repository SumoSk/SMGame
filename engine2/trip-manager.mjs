// Trip Manager 2.0: trip lifecycle with optional destination parking reservation.
import { TrafficEngine } from './traffic-core.mjs';
import { ParkingController } from './parking-controller.mjs';

export class TripManager {
  constructor(engine, { parking = null, onCompleted = () => {}, onFailed = () => {},
    onCanceled = () => {}, historyLimit = 500 } = {}) {
    if (!(engine instanceof TrafficEngine)) throw new TypeError('engine required');
    if (parking !== null && !(parking instanceof ParkingController))
      throw new TypeError('parking must be ParkingController');
    if (!Number.isInteger(historyLimit) || historyLimit < 0)
      throw new RangeError('invalid historyLimit');
    this.engine = engine; this.parking = parking; this.historyLimit = historyLimit;
    this.trips = new Map(); this.activeByCitizen = new Map();
    this.onCompleted = onCompleted; this.onFailed = onFailed;
    this.onCanceled = onCanceled;
    const oldArrival = engine.onArrival, oldFailure = engine.onFailure;
    engine.onArrival = trip => {
      try { oldArrival(trip); } finally { this._finish(trip.id, 'completed', null); }
    };
    engine.onFailure = (trip, reason) => {
      try { oldFailure(trip, reason); } finally { this._finish(trip.id, 'failed', reason); }
    };
    if (parking) {
      const oldAdmitted = parking.onAdmitted, oldRejected = parking.onRejected;
      parking.onAdmitted = event => {
        oldAdmitted(event);
        const record = this.trips.get(event.tripId);
        if (record && record.destinationBuildingId === event.buildingId)
          this._activate(record);
      };
      parking.onRejected = event => {
        oldRejected(event);
        const record = this.trips.get(event.tripId);
        if (!record || record.destinationBuildingId !== event.buildingId ||
            record.endedAt !== null) return;
        this.engine.cancelTrip(event.tripId);
        this._finish(event.tripId, 'failed', event.reason);
      };
    }
  }
  _activate(record) {
    if (record.dispatched || record.endedAt !== null) return;
    this.engine.planTrip({
      id: record.tripId, from: record.originNode, to: record.destinationNode,
      at: Math.max(this.engine.time, record.departureAt),
      speedFactor: record.speedFactor
    });
    record.dispatched = true; record.status = 'scheduled';
  }
  schedule({ tripId, citizenId, originNode, destinationNode, destinationBuildingId = null,
    departureAt = this.engine.time, purpose = 'outing', speedFactor = 1 }) {
    if (tripId == null || citizenId == null)
      throw new TypeError('tripId and citizenId are required');
    if (this.trips.has(tripId)) throw new Error('trip already exists');
    if (this.activeByCitizen.has(citizenId))
      throw new Error('citizen already has a pending or active trip');
    const record = { tripId, citizenId, originNode, destinationNode,
      destinationBuildingId, departureAt, purpose, speedFactor,
      status:'parking_pending', dispatched:false, error:null, endedAt:null };
    this.trips.set(tripId, record);
    this.activeByCitizen.set(citizenId, tripId);
    try {
      if (this.parking && destinationBuildingId !== null) {
        const result = this.parking.request(destinationBuildingId, tripId);
        if (result.status === 'queued') record.status = 'waiting_parking';
        // admitted/rejected callbacks synchronously activate/finalize trip.
      } else this._activate(record);
    } catch (e) {
      this.activeByCitizen.delete(citizenId);
      this.trips.delete(tripId);
      if (this.parking && destinationBuildingId !== null)
        this.parking.release(destinationBuildingId,tripId);
      throw e;
    }
    return this.get(tripId);
  }
  get(tripId) {
    const record = this.trips.get(tripId); if (!record) return null;
    if (record.status === 'scheduled' && this.engine.vehicles.has(tripId))
      return { ...record, status:'driving' };
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
  releaseParking(tripId) {
    const trip = this.trips.get(tripId);
    return !!(trip && this.parking && trip.destinationBuildingId !== null &&
      this.parking.release(trip.destinationBuildingId, tripId));
  }
  _finish(tripId, status, error) {
    const trip = this.trips.get(tripId);
    if (!trip || trip.endedAt !== null) return;
    trip.status = status; trip.error = error; trip.endedAt = this.engine.time;
    if (this.activeByCitizen.get(trip.citizenId) === tripId)
      this.activeByCitizen.delete(trip.citizenId);
    if (status !== 'completed' && this.parking && trip.destinationBuildingId !== null)
      this.parking.release(trip.destinationBuildingId, tripId);
    const snapshot = { ...trip };
    if (status === 'completed') this.onCompleted(snapshot);
    else if (status === 'failed') this.onFailed(snapshot);
    else if (status === 'canceled') this.onCanceled(snapshot);
    this.pruneHistory();
  }
  pruneHistory() {
    if (this.trips.size <= this.historyLimit) return;
    for (const [id, old] of this.trips) {
      if (this.trips.size <= this.historyLimit) break;
      if (old.endedAt !== null &&
        !(this.parking && old.destinationBuildingId !== null &&
          this.parking.isReserved(old.destinationBuildingId, id)))
        this.trips.delete(id);
    }
  }
}
