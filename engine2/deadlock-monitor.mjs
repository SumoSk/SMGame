// SMCITY 2.0 incident sampling, independent of rendering.
// Only cars known to be waiting on OTHER CARS form a wait-for graph.
// A car stopped at a red light, in a legal queue, or at a parking gate is not a deadlock.
export class DeadlockMonitor {
  constructor({ thresholdSeconds = 12, maxReports = 200 } = {}) {
    if (!Number.isFinite(thresholdSeconds) || thresholdSeconds <= 0 ||
      !Number.isInteger(maxReports) || maxReports < 1) throw new RangeError('invalid incident settings');
    this.thresholdSeconds = thresholdSeconds; this.maxReports = maxReports;
    this.waiters = new Map(); this.reports = [];
    this.reported = new Set();
  }
  waiting(vehicleId, blockerId, now) {
    if (vehicleId == null || blockerId == null || vehicleId === blockerId) return;
    const old = this.waiters.get(vehicleId);
    if (old && old.blockerId === blockerId) return;
    this.waiters.set(vehicleId,{ blockerId, since:now });
  }
  cleared(vehicleId) {
    this.waiters.delete(vehicleId);
  }
  inspect(now) {
    const active = new Map([...this.waiters].filter(([id,w]) =>
      now-w.since >= this.thresholdSeconds && this.waiters.has(w.blockerId)));
    const reportedNow=[];
    for (const id of active.keys()) {
      const position=new Map(), chain=[]; let current=id;
      while (active.has(current) && !position.has(current)) {
        position.set(current,chain.length); chain.push(current);
        current=active.get(current).blockerId;
      }
      if (!position.has(current)) continue;
      const members=chain.slice(position.get(current)).sort((a,b)=>
        String(a).localeCompare(String(b)));
      const key=members.map(String).join('|');
      if(this.reported.has(key))continue;
      this.reported.add(key);
      const report={at:now,type:'wait_cycle',vehicles:members};
      this.reports.push(report); reportedNow.push(report);
    }
    if (this.reports.length>this.maxReports) this.reports.splice(0,this.reports.length-this.maxReports);
    return reportedNow;
  }
  forget(vehicleId) {
    this.waiters.delete(vehicleId);
    for (const [id,w] of this.waiters)
      if(w.blockerId===vehicleId)this.waiters.delete(id);
    this.reported.clear();
  }
}
