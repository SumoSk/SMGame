// SMCITY 2.0 shared intersection admission logic.
// Signal phases are events, not frame-by-frame calculations.
// Until detailed swept-geometry is attached, intersecting approaches cannot
// enter the same junction concurrently. Parallel lanes from one approach can.
export class JunctionController {
  constructor({ crossingSeconds = 0.3, yellowSeconds = 0.35, clearSeconds = 0.25 } = {}) {
    for (const [name, value] of Object.entries({ crossingSeconds, yellowSeconds, clearSeconds }))
      if (!Number.isFinite(value) || value < 0) throw new RangeError(name);
    this.crossingSeconds = crossingSeconds;
    this.yellowSeconds = yellowSeconds;
    this.clearSeconds = clearSeconds;
    this.signals = new Map();
    this.reservations = new Map();
    this.metrics = { entered: 0, deniedSignal: 0, deniedConflict: 0 };
  }
  configure(nodeId, phases, now, schedule) {
    if (!Array.isArray(phases) || phases.length < 2)
      throw new TypeError('at least two phases required');
    for (const phase of phases) {
      if (!Array.isArray(phase.incomingEdges) || !phase.incomingEdges.length ||
          !Number.isFinite(phase.duration) || phase.duration <= 0)
        throw new TypeError('invalid signal phase');
    }
    const token = (this.signals.get(nodeId)?.token ?? 0) + 1;
    const signal = { phases: phases.map(p => ({
      incoming: new Set(p.incomingEdges), duration: p.duration
    })), index: 0, token, state: 'green' };
    this.signals.set(nodeId, signal);
    schedule(now + phases[0].duration, { nodeId, token, state: 'yellow' });
    return signal;
  }
  onTimer(event, at, schedule) {
    const signal = this.signals.get(event.nodeId);
    if (!signal || signal.token !== event.token) return false;
    if (event.state === 'yellow') {
      signal.state = 'yellow';
      schedule(at + this.yellowSeconds, { ...event, state: 'clear' });
    } else if (event.state === 'clear') {
      signal.state = 'clear';
      schedule(at + this.clearSeconds, { ...event, state: 'next' });
    } else if (event.state === 'next') {
      signal.index = (signal.index + 1) % signal.phases.length;
      signal.state = 'green';
      schedule(at + signal.phases[signal.index].duration, {
        nodeId: event.nodeId, token: event.token, state: 'yellow'
      });
    }
    return true;
  }
  canEnter({ nodeId, incomingId, outgoingId, incomingLane, outgoingLane, now }) {
    const signal = this.signals.get(nodeId);
    if (signal && (signal.state !== 'green' ||
      !signal.phases[signal.index].incoming.has(incomingId))) {
      this.metrics.deniedSignal++; return false;
    }
    const reservations = this.reservations.get(nodeId) || [];
    for (const reservation of reservations) {
      if (reservation.until <= now) continue;
      // Different approaches are conservatively conflicting. Same approach
      // may send parallel nonoverlapping lanes simultaneously.
      if (reservation.incomingId !== incomingId ||
          reservation.incomingLane === incomingLane ||
          (reservation.outgoingId === outgoingId && reservation.outgoingLane === outgoingLane)) {
        this.metrics.deniedConflict++; return false;
      }
    }
    return true;
  }
  enter(movement) {
    if (!this.canEnter(movement)) return false;
    const list = this.reservations.get(movement.nodeId) || [];
    const keep = list.filter(r => r.until > movement.now);
    keep.push({ incomingId: movement.incomingId,
      outgoingId: movement.outgoingId, incomingLane: movement.incomingLane,
      outgoingLane: movement.outgoingLane, until: movement.now + this.crossingSeconds });
    this.reservations.set(movement.nodeId, keep);
    this.metrics.entered++;
    return true;
  }
  onTopologyChange(validNodes) {
    for (const nodeId of this.signals.keys())
      if (!validNodes.has(nodeId)) this.signals.delete(nodeId);
    for (const nodeId of this.reservations.keys())
      if (!validNodes.has(nodeId)) this.reservations.delete(nodeId);
  }
  snapshot() {
    return {
      metrics: { ...this.metrics },
      signals: [...this.signals.entries()].map(([nodeId, v]) => ({
        nodeId, phase: v.index, state: v.state
      }))
    };
  }
}
