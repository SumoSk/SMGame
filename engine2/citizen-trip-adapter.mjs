// Converts city lifestyle intentions into a new, legally constrained trip.
// No legacy motion, route, parking or signal algorithms are called.
import { TripManager } from './trip-manager.mjs';

export class CitizenTripAdapter {
  constructor({ trips, city, edgeId = (from,to)=>String(from)+'>'+String(to),
    maxAccessPairs = 24 } = {}) {
    if (!(trips instanceof TripManager)) throw new TypeError('TripManager required');
    if (!city || !(city.buildings instanceof Map)) throw new TypeError('city buildings required');
    this.trips=trips; this.city=city; this.edgeId=edgeId;
    this.maxAccessPairs=maxAccessPairs;
    this.metrics={requests:0,rejected:0,accepted:0};
  }
  _access(buildingId, gate, isOrigin) {
    if (buildingId == null) return gate == null ? [] : [{node:gate}];
    const building=this.city.buildings.get(buildingId);
    if (!building || !Array.isArray(building.access)) return [];
    return building.access.filter(a => isOrigin ? a.exit : a.entry);
  }
  candidates({fromBuildingId=null,toBuildingId=null,fromGate=null,toGate=null}) {
    const origins=this._access(fromBuildingId,fromGate,true);
    const destinations=this._access(toBuildingId,toGate,false);
    const network=this.trips.engine.network, results=[];
    for (const from of origins) for (const to of destinations) {
      if (!network.nodes.has(from.node) || !network.nodes.has(to.node)) continue;
      if (from.node === to.node && fromBuildingId !== toBuildingId) continue;
      const firstEdgeIds=from.next?.length ?
        from.next.map(id=>this.edgeId(from.node,id)).filter(id=>network.edges.has(id)):null;
      const lastEdgeIds=to.prev?.length ?
        to.prev.map(id=>this.edgeId(id,to.node)).filter(id=>network.edges.has(id)):null;
      if (from.next?.length && !firstEdgeIds.length) continue;
      if (to.prev?.length && !lastEdgeIds.length) continue;
      const restrictions={firstEdgeIds,lastEdgeIds};
      const route=network.route(from.node,to.node,null,restrictions);
      if (!route) continue;
      results.push({ fromNode:from.node, toNode:to.node, routeRestrictions:restrictions,
        expectedTime:route.time, path:route.edges });
    }
    return results.sort((a,b)=>a.expectedTime-b.expectedTime).slice(0,this.maxAccessPairs);
  }
  request({tripId,citizenId,fromBuildingId=null,toBuildingId=null,
    fromGate=null,toGate=null,departureAt=this.trips.engine.time,
    purpose='outing',speedFactor=1}) {
    this.metrics.requests++;
    const options=this.candidates({fromBuildingId,toBuildingId,fromGate,toGate});
    if (!options.length) {this.metrics.rejected++;return {accepted:false,reason:'no_legal_access'};}
    const choice=options[0];
    const trip=this.trips.schedule({
      tripId,citizenId,originNode:choice.fromNode,destinationNode:choice.toNode,
      destinationBuildingId:toBuildingId,departureAt,purpose,speedFactor,
      routeRestrictions:choice.routeRestrictions
    });
    this.metrics.accepted++;
    return {accepted:true,trip,expectedTime:choice.expectedTime,
      plannedEdges:choice.path};
  }
}
