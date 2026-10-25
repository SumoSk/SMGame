// SMCITY Traffic Engine 2.0 — original implementation (not derived from legacy traffic code).
import { LaneController } from './lane-controller.mjs';
import { JunctionController } from './junction-controller.mjs';
import { TrafficEstimator } from './traffic-estimator.mjs';
import { DeadlockMonitor } from './deadlock-monitor.mjs';
// This module has no DOM, canvas, persistence, or game-global dependencies.
const positive = (value, name) => {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(name + ' must be positive');
  return value;
};

export class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(item) {
    const a = this.items; let n = a.length; a.push(item);
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (a[p].priority <= item.priority) break;
      a[n] = a[p]; n = p;
    }
    a[n] = item;
  }
  pop() {
    const a = this.items; if (!a.length) return null;
    const first = a[0], last = a.pop();
    if (!a.length) return first;
    let n = 0;
    while (true) {
      const l = n * 2 + 1, r = l + 1; if (l >= a.length) break;
      const child = r < a.length && a[r].priority < a[l].priority ? r : l;
      if (a[child].priority >= last.priority) break;
      a[n] = a[child]; n = child;
    }
    a[n] = last; return first;
  }
}

export class RoadNetwork {
  constructor({ routeCacheLimit = 2048 } = {}) {
    this.nodes = new Set(); this.edges = new Map(); this.outgoing = new Map();
    this.positions = new Map();
    this.forbiddenTurns = new Set(); this.version = 0; this.costVersion = 0;
    this.routeCacheLimit = positive(routeCacheLimit, 'routeCacheLimit');
    this.routeCache = new Map();
    this.metrics = { searches: 0, cacheHits: 0 };
  }
  addNode(id, position = null) {
    if (id == null) throw new TypeError('node id required');
    if (!this.nodes.has(id)) {
      this.nodes.add(id); this.outgoing.set(id, []); this._invalidate(true);
    }
    if (position !== null) {
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y))
        throw new TypeError('invalid node position');
      this.positions.set(id,{x:position.x,y:position.y});
    }
  }
  removeNode(id) {
    if (!this.nodes.has(id)) return false;
    for (const edge of [...this.edges.values()])
      if (edge.from === id || edge.to === id) this.removeEdge(edge.id);
    this.nodes.delete(id); this.positions.delete(id); this.outgoing.delete(id);
    this._invalidate(true); return true;
  }
  addEdge({ id, from, to, length, speed = 1, lanes = 1, delay = 0 }) {
    if (this.edges.has(id)) throw new Error('duplicate edge ' + id);
    if (!this.nodes.has(from) || !this.nodes.has(to) || from === to)
      throw new Error('edge needs two distinct existing nodes');
    positive(length, 'length'); positive(speed, 'speed');
    if (!Number.isInteger(lanes) || lanes < 1) throw new RangeError('invalid lane count');
    if (!Number.isFinite(delay) || delay < 0) throw new RangeError('invalid delay');
    const edge = { id, from, to, length, speed, lanes, delay, congestion: 0 };
    this.edges.set(id, edge); this.outgoing.get(from).push(id); this._invalidate(true);
    return edge;
  }
  removeEdge(id) {
    const edge = this.edges.get(id); if (!edge) return false;
    this.edges.delete(id);
    const list = this.outgoing.get(edge.from);
    list.splice(list.indexOf(id), 1);
    this._invalidate(true); return true;
  }
  forbidTurn(incomingId, outgoingId) {
    if (!this.edges.has(incomingId) || !this.edges.has(outgoingId))
      throw new Error('unknown turn edge');
    this.forbiddenTurns.add(String(incomingId) + '>' + String(outgoingId));
    this._invalidate(true);
  }
  setCongestion(id, fraction) {
    if (!this.edges.has(id)) throw new Error('unknown edge');
    return this.setCongestionBatch([[id, fraction]]);
  }
  setCongestionBatch(changes) {
    let changed=0;
    for (const [id, fraction] of changes) {
      const edge=this.edges.get(id);
      if (!edge) continue;
      if (!Number.isFinite(fraction) || fraction < 0)
        throw new RangeError('invalid congestion');
      const next=Math.round(fraction*4)/4;
      if (next === edge.congestion) continue;
      edge.congestion=next; changed++;
    }
    if (changed) this._invalidate(false);
    return changed;
  }
  setDelayBatch(changes) {
    let changed=0;
    for (const [id, value] of changes) {
      const edge=this.edges.get(id);
      if (!edge) continue;
      if (!Number.isFinite(value) || value < 0) throw new RangeError('invalid delay');
      const next=Math.round(value*100)/100;
      if (next === edge.delay) continue;
      edge.delay=next; changed++;
    }
    if (changed) this._invalidate(false);
    return changed;
  }
  _invalidate(topology) {
    if (topology) this.version++;
    this.costVersion++;
    this.routeCache.clear();
  }
  travelTime(edge) {
    return edge.length / edge.speed * (1 + edge.congestion) + edge.delay;
  }
  route(from, to, incomingId = null) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return null;
    if (from === to) return { nodes: [from], edges: [], time: 0 };
    const key = JSON.stringify([from, to, incomingId, this.version, this.costVersion]);
    if (this.routeCache.has(key)) {
      this.metrics.cacheHits++;
      const cached = this.routeCache.get(key);
      return cached && { nodes: [...cached.nodes], edges: [...cached.edges], time: cached.time };
    }
    this.metrics.searches++;
    // Search states include incoming edges, so turn bans and U-turn bans are correct.
    const frontier = new MinHeap(), best = new Map(), previous = new Map();
    const stateKey = (node, incoming) => JSON.stringify([node, incoming]);
    const initial = stateKey(from, incomingId);
    best.set(initial, 0);
    frontier.push({ priority: 0, node: from, incoming: incomingId, key: initial });
    let finish = null;
    while (frontier.size) {
      const current = frontier.pop();
      if (current.priority !== best.get(current.key)) continue;
      if (current.node === to) { finish = current; break; }
      for (const id of this.outgoing.get(current.node) ?? []) {
        const edge = this.edges.get(id);
        const incomingEdge = current.incoming == null ? null : this.edges.get(current.incoming);
        if (incomingEdge && (
          incomingEdge.from === edge.to ||
          this.forbiddenTurns.has(String(current.incoming) + '>' + String(id))
        )) continue;
        const nextKey = stateKey(edge.to, id), nextCost = current.priority + this.travelTime(edge);
        if (nextCost >= (best.get(nextKey) ?? Infinity)) continue;
        best.set(nextKey, nextCost);
        previous.set(nextKey, { prior: current.key, edgeId: id, node: edge.to });
        frontier.push({ priority: nextCost, node: edge.to, incoming: id, key: nextKey });
      }
    }
    let result = null;
    if (finish) {
      const edges = [], nodes = [to]; let keyAt = finish.key;
      while (keyAt !== initial) {
        const p = previous.get(keyAt);
        if (!p) throw new Error('corrupt route predecessor');
        edges.push(p.edgeId);
        keyAt = p.prior;
        const prior = JSON.parse(keyAt); nodes.push(prior[0]);
      }
      edges.reverse(); nodes.reverse();
      result = { nodes, edges, time: finish.priority };
    }
    if (this.routeCache.size >= this.routeCacheLimit) this.routeCache.clear();
    this.routeCache.set(key, result);
    return result && { nodes: [...result.nodes], edges: [...result.edges], time: result.time };
  }
}

export class EventScheduler {
  constructor() { this.queue = new MinHeap(); this.sequence = 0; }
  schedule(at, type, data) {
    if (!Number.isFinite(at) || at < 0) throw new RangeError('invalid event time');
    const event = { at, type, data, serial: ++this.sequence, priority: at + this.sequence * 1e-12 };
    this.queue.push(event); return event.serial;
  }
  drain(until, handler) {
    let processed = 0;
    // Event actions may schedule another event, but cap guards accidental infinite loops.
    while (this.queue.size && this.queue.items[0].at <= until + 1e-9) {
      if (++processed > 100000) throw new Error('event scheduling loop');
      handler(this.queue.pop());
    }
    return processed;
  }
}

export class TrafficEngine {
  constructor(network, { stepSeconds = 0.2, maxVehicles = 1000, gap = 0.6,
    onArrival = () => {}, onFailure = () => {}, onRecovery = () => {},
    onGridlock = () => {}, gateNodes = [] } = {}) {
    if (!(network instanceof RoadNetwork)) throw new TypeError('network required');
    positive(stepSeconds, 'stepSeconds'); positive(gap, 'gap');
    this.network = network; this.stepSeconds = stepSeconds;
    this.maxVehicles = positive(maxVehicles, 'maxVehicles'); this.gap = gap;
    this.onArrival = onArrival; this.onFailure = onFailure;
    this.onRecovery = onRecovery; this.onGridlock = onGridlock;
    this.gateNodes = [...gateNodes];
    this.deadlocks = new DeadlockMonitor();
    this.time = 0; this.accumulator = 0; this.vehicles = new Map();
    this.events = new EventScheduler(); this.signals = new Map();
    this.pending = new Set(); this.pendingToken = new Map(); this.nextTripToken = 0;
    this.nextDeadlockCheck = 5;
    this.deferred = []; this.laneIntents = new Map();
    this.lanes = new LaneController({gap});
    this.estimator = new TrafficEstimator(network);
    this.junctions = new JunctionController({yellowSeconds:0.2, clearSeconds:0.2});
    this.signals = this.junctions.signals;
    this.metrics = { steps: 0, completed: 0, failed: 0, moved: 0, routePlans: 0 };
  }
  planTrip({ id, from, to, at = this.time, speedFactor = 1, length = 0.45 }) {
    if (id == null || this.vehicles.has(id) || this.pending.has(id))
      throw new Error('vehicle id must be unique');
    if (!Number.isFinite(at) || at < this.time) throw new RangeError('trip is in the past');
    positive(speedFactor, 'speedFactor'); positive(length, 'length');
    this.pending.add(id);
    const token = ++this.nextTripToken;
    this.pendingToken.set(id,token);
    this.events.schedule(at, 'departure', { id, from, to, speedFactor, length, token });
  }
  configureSignal(nodeId, phases) {
    if (!this.network.nodes.has(nodeId)) throw new Error('signal node missing');
    for (const phase of phases)
      for (const id of phase.incomingEdges || [])
        if (this.network.edges.get(id)?.to !== nodeId)
          throw new Error('incoming edge does not lead to junction');
    const signal = this.junctions.configure(nodeId, phases, this.time,
      (at, data) => this.events.schedule(at, 'signal', data));
    const cycle = phases.reduce((sum,p) =>
      sum+p.duration+this.junctions.yellowSeconds+this.junctions.clearSeconds,0);
    const weights = [];
    for (const phase of phases) for (const edgeId of phase.incomingEdges) {
      const red = cycle-phase.duration;
      weights.push([edgeId,red*red/(2*cycle)]);
    }
    this.network.setDelayBatch(weights);
    return signal;
  }
  requestLaneChange(id, lane) {
    const v = this.vehicles.get(id);
    if (!v || v.status !== 'moving' || !Number.isInteger(lane) ||
        lane < 0 || lane >= this.network.edges.get(v.route[v.edgeIndex]).lanes)
      return false;
    if (lane === v.lane) return true;
    this.laneIntents.set(id, lane);
    return true;
  }
  cancelTrip(id) {
    const waiting = this.pending.delete(id), active = this.vehicles.get(id);
    this.pendingToken.delete(id);
    if (active) {
      this.estimator.edgeLeft(active.route[active.edgeIndex]);
      this.vehicles.delete(id);
    }
    this.laneIntents.delete(id); this.deadlocks.forget(id);
    if (active) this._wakeCapacity();
    return waiting || active;
  }
  _wakeCapacity() {
    while (this.vehicles.size < this.maxVehicles && this.deferred.length) {
      const request = this.deferred.shift();
      if (this.pending.has(request.id) &&
          this.pendingToken.get(request.id) === request.token) this._admit(request);
    }
  }
  _admit(info) {
    this.pending.delete(info.id); this.pendingToken.delete(info.id);
    this.estimator.refreshIfDue(this.time);
    const route = this.network.route(info.from, info.to); this.metrics.routePlans++;
    if (!route) {
      this.metrics.failed++; this.onFailure(info, 'unreachable'); return;
    }
    if (!route.edges.length) {
      this.metrics.completed++; this.onArrival(info); return;
    }
    this.vehicles.set(info.id, {
      ...info, route: route.edges, edgeIndex: 0, distance: 0, lane: 0,
      status: 'queued', topologyVersion: this.network.version,
      costVersion: this.network.costVersion, currentNode: info.from
    });
    this.estimator.edgeEntered(route.edges[0]);
  }
  _dispatch(event) {
    if (event.type === 'departure') {
      const info = event.data;
      if (!this.pending.has(info.id) ||
          this.pendingToken.get(info.id) !== info.token) return;
      if (this.vehicles.size >= this.maxVehicles) {
        this.deferred.push(info); return; // wake on capacity release, no time-based polling
      }
      this._admit(info);
    } else if (event.type === 'signal') {
      this.junctions.onTimer(event.data, event.at,
        (at,data) => this.events.schedule(at, 'signal', data));
    }
  }
  setGateNodes(gates) {
    if (!Array.isArray(gates) || gates.some(id => !this.network.nodes.has(id)))
      throw new TypeError('gate node not found');
    this.gateNodes = [...new Set(gates)];
  }
  _recoverAtGate(v, reason) {
    let result = null;
    const lastPosition = this.network.positions.get(v.currentNode);
    for (const gate of this.gateNodes) {
      const path = this.network.route(gate, v.to);
      if (!path || !path.edges.length) continue;
      const gatePosition = this.network.positions.get(gate);
      const offset = lastPosition && gatePosition ?
        Math.hypot(lastPosition.x-gatePosition.x,lastPosition.y-gatePosition.y) : 0;
      const cost = path.time + offset;
      if (!result || cost < result.cost) result = { gate, path, cost };
    }
    if (!result) return false;
    v.route = result.path.edges; v.edgeIndex = 0; v.distance = 0;
    v.currentNode = result.gate; v.lane = 0; v.status = 'queued';
    v.costVersion = this.network.costVersion;
    v.topologyVersion = this.network.version;
    this.estimator.edgeEntered(v.route[0]);
    this.deadlocks.cleared(v.id);
    this.onRecovery(v,reason,result.gate);
    return true;
  }
  _replanAtNode(v, incomingEdge) {
    if (v.costVersion === this.network.costVersion &&
      v.topologyVersion === this.network.version) return;
    const node = incomingEdge.to;
    const remainingEdges = v.route.slice(v.edgeIndex + 1);
    let valid = true, oldCost = 0, previous = incomingEdge, current = node;
    for (const id of remainingEdges) {
      const edge = this.network.edges.get(id);
      if (!edge || edge.from !== current || previous.from === edge.to ||
          this.network.forbiddenTurns.has(String(previous.id) + '>' + String(edge.id))) {
        valid = false; break;
      }
      oldCost += this.network.travelTime(edge);
      current = edge.to; previous = edge;
    }
    const candidate = this.network.route(node, v.to, incomingEdge.id);
    this.metrics.routePlans++;
    if (candidate && (!valid || candidate.time < oldCost * 0.8)) {
      v.route = v.route.slice(0,v.edgeIndex+1).concat(candidate.edges);
    }
    v.costVersion = this.network.costVersion;
    v.topologyVersion = this.network.version;
  }
  _clearCar(v) {
    this.vehicles.delete(v.id); this.laneIntents.delete(v.id);
    this.deadlocks.forget(v.id);
  }
  _advanceOne() {
    this.time += this.stepSeconds;
    this.events.drain(this.time, e => this._dispatch(e));
    const active = [...this.vehicles.values()];
    this.lanes.beginStep(active);
    for (const [id, target] of this.laneIntents) {
      const v = this.vehicles.get(id);
      if (!v || v.status !== 'moving') {this.laneIntents.delete(id); continue;}
      const edge = this.network.edges.get(v.route[v.edgeIndex]);
      if (!edge || v.lane === target || this.lanes.tryChange(v,target,
        {now:this.time,edgeLength:edge.length,speed:edge.speed}))
        this.laneIntents.delete(id);
    }
    // Reuse the already sorted lane groups; no second vehicle scan or pairwise collision scan.
    const groups = this.lanes.index;
    const entryStarts = new Map(), entryOwners = new Map();
    for (const [key,group] of groups) {
      const tail=group[group.length-1];
      entryStarts.set(key,tail.distance); entryOwners.set(key,tail.id);
    }
    const move = (v, leaderDistance = Infinity, leaderLength = 0, leaderId = null) => {
      if (v.status !== 'moving') return;
      const edge = this.network.edges.get(v.route[v.edgeIndex]);
      if (!edge) { this.estimator.edgeLeft(v.route[v.edgeIndex]);
        if (this._recoverAtGate(v,'edge_removed')) return;
        this._clearCar(v); this.metrics.failed++;
        this.onFailure(v, 'edge_removed'); this._wakeCapacity(); return; }
      const allowed = Math.max(0, leaderDistance - leaderLength - this.gap);
      const wanted = Math.min(edge.length, v.distance + edge.speed * v.speedFactor * this.stepSeconds);
      v.distance = Math.min(wanted, allowed);
      if (v.distance < edge.length - 1e-9) {
        if (leaderId != null && wanted > allowed + 1e-9)
          this.deadlocks.waiting(v.id,leaderId,this.time);
        else this.deadlocks.cleared(v.id);
        this.metrics.moved++; return;
      }
      this._replanAtNode(v,edge);
      const nextId = v.route[v.edgeIndex + 1];
      if (nextId == null) {
        this.estimator.edgeLeft(edge.id);
        this._clearCar(v);
        v.status = 'arrived'; this.metrics.completed++; this.onArrival(v);
        this._wakeCapacity(); return;
      }
      const next = this.network.edges.get(nextId);
      if (!next || next.from !== edge.to) {
        // Replan only after graph change or route invalidation, not every frame.
        const destination = v.to, remaining = this.network.route(edge.to, destination, edge.id);
        this.metrics.routePlans++;
        if (!remaining || !remaining.edges.length) {
          this.estimator.edgeLeft(edge.id);
          this._clearCar(v);
          this.metrics.failed++; this.onFailure(v, 'route_lost');
          this._wakeCapacity(); return;
        }
        v.route = v.route.slice(0, v.edgeIndex + 1).concat(remaining.edges);
        v.topologyVersion = this.network.version;
        v.costVersion = this.network.costVersion;
        v.distance = Math.max(0, edge.length - 0.001);
        return;
      }
      const lane = this.lanes.chooseDownstreamLane(next, v.lane, edge.lanes,
        entryStarts, v.length, this.gap);
      if (lane === null) {
        const candidates=[];
        for (let l=0;l<next.lanes;l++) {
          const key=String(next.id)+':'+l, owner=entryOwners.get(key);
          if(owner != null && owner !== v.id) candidates.push({
            id:owner, distance:entryStarts.get(key) ?? Infinity
          });
        }
        candidates.sort((a,b)=>b.distance-a.distance);
        if(candidates.length) this.deadlocks.waiting(v.id,candidates[0].id,this.time);
        v.distance = Math.max(0, edge.length - 0.001); return;
      }
      if (!this.junctions.enter({nodeId:edge.to,
        incomingId:edge.id,outgoingId:next.id,incomingLane:v.lane,
        outgoingLane:lane,now:this.time})) {
        this.deadlocks.cleared(v.id);
        v.distance = Math.max(0, edge.length - 0.001); return;
      }
      this.estimator.edgeLeft(edge.id); this.estimator.edgeEntered(next.id);
      v.currentNode = edge.to;
      this.deadlocks.cleared(v.id);
      v.edgeIndex++; v.lane = lane; v.distance = 0;
      entryStarts.set(String(next.id) + ':' + lane, 0);
      entryOwners.set(String(next.id) + ':' + lane, v.id);
      this.metrics.moved++;
    };
    // Activate queued trips once a safe entry slot is available.
    for (const v of active) if (v.status === 'queued') {
      const edge = this.network.edges.get(v.route[0]);
      if (!edge) { this.estimator.edgeLeft(v.route[v.edgeIndex]);
        if (this._recoverAtGate(v,'edge_removed')) continue;
        this._clearCar(v); this.metrics.failed++;
        this.onFailure(v, 'edge_removed'); this._wakeCapacity(); continue; }
      const lane = this.lanes.chooseDownstreamLane(edge, 0, 1,
        entryStarts, v.length, this.gap);
      if (lane !== null) { v.status = 'moving'; v.lane = lane; v.distance = 0;
        entryStarts.set(String(edge.id) + ':' + lane, 0);
        entryOwners.set(String(edge.id) + ':' + lane, v.id); }
    }
    for (const group of groups.values()) {
      const initialEdgeId = group[0]?.route[group[0].edgeIndex];
      let leadPosition = Infinity, leadLength = 0, leadId = null;
      for (const v of group) {
        move(v, leadPosition, leadLength, leadId);
        if (v.status === 'moving' && v.route[v.edgeIndex] === initialEdgeId) {
          leadPosition = v.distance; leadLength = v.length; leadId = v.id;
        } else { leadPosition = Infinity; leadLength = 0; leadId = null; }
      }
    }
    if (this.time >= this.nextDeadlockCheck) {
      this.nextDeadlockCheck = this.time + 5;
      for (const report of this.deadlocks.inspect(this.time)) {
        this.onGridlock(report);
        // Recover only a proven wait-cycle participant, never a regular queue.
        if (this.gateNodes.length) {
          const victim = report.vehicles.map(id=>this.vehicles.get(id)).find(Boolean);
          if(victim) {
            const oldEdge=victim.route[victim.edgeIndex];
            if(this._recoverAtGate(victim,'wait_cycle')) {
              this.estimator.edgeLeft(oldEdge);
              this.deadlocks.forget(victim.id);
              this.metrics.gridlockRecoveries=(this.metrics.gridlockRecoveries||0)+1;
            }
          }
        }
      }
    }
    this.metrics.steps++;
  }
  advance(seconds, maxSteps = 12) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('bad elapsed time');
    this.accumulator += seconds;
    let count = 0;
    while (this.accumulator + 1e-12 >= this.stepSeconds && count < maxSteps) {
      this._advanceOne(); this.accumulator -= this.stepSeconds; count++;
    }
    return count;
  }
  runSteps(steps) {
    if (!Number.isInteger(steps) || steps < 0) throw new RangeError('invalid steps');
    for (let i = 0; i < steps; i++) this._advanceOne();
  }
  snapshot() {
    return { time: this.time, activeVehicles: this.vehicles.size,
      metrics: { ...this.metrics }, routes: { ...this.network.metrics },
      junctions: this.junctions.snapshot(), lanes: {...this.lanes.metrics},
      trafficEstimator:{...this.estimator.metrics},
      reportedDeadlocks:this.deadlocks.reports.length,
      vehicles: [...this.vehicles.values()].map(v => ({
        id: v.id, status: v.status, edgeId: v.route[v.edgeIndex],
        lane: v.lane, distance: v.distance, destination: v.to
      })) };
  }
}
