// Pure pose adapter: maps logical road progress to world-space drawing data.
// Renderer is independent from the simulation; this math never mutates cars.
export function edgePose(network, edgeId, distance, lane = 0, laneWidth = 0.32) {
  const edge = network.edges.get(edgeId);
  if (!edge) return null;
  const a=network.positions.get(edge.from),b=network.positions.get(edge.to);
  if (!a || !b) return null;
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
  if(!length) return null;
  const t=Math.max(0,Math.min(1,distance/edge.length));
  const offset=(lane+0.5)*laneWidth;
  return {
    x:a.x+dx*t-dy/length*offset,
    y:a.y+dy*t+dx/length*offset,
    angle:Math.atan2(dy,dx),
    edgeId,lane
  };
}

export function vehiclePose(network, vehicle, now, { laneWidth = 0.32,
  turnVisualSeconds = 0.6 } = {}) {
  const edgeId=vehicle.route?.[vehicle.edgeIndex] ?? vehicle.edgeId;
  if(edgeId == null)return null;
  const to=edgePose(network,edgeId,vehicle.distance,vehicle.lane,laneWidth);
  if(!to)return null;
  const turn=vehicle.turnTransition;
  if(!turn || turn.fromEdgeId==null || !Number.isFinite(now))
    return to;
  const age=now-turn.at;
  if(age<0 || age>=turnVisualSeconds)return to;
  const fromEdge=network.edges.get(turn.fromEdgeId);
  const from=fromEdge && edgePose(network,turn.fromEdgeId,
    fromEdge.length,turn.fromLane,laneWidth);
  if(!from)return to;
  const raw=Math.max(0,Math.min(1,age/turnVisualSeconds));
  const k=raw*raw*(3-2*raw);
  const angleDiff=Math.atan2(Math.sin(to.angle-from.angle),
    Math.cos(to.angle-from.angle));
  return {
    x:from.x+(to.x-from.x)*k,
    y:from.y+(to.y-from.y)*k,
    angle:from.angle+angleDiff*k,
    edgeId,lane:to.lane
  };
}
