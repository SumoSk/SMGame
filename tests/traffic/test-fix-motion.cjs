'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE||=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
function cleared(){const {game:g}=boot('occupy,roadCellKey,laneCapacity,roadEditAnchors,routeGraphBounds');g.reset();g.state.roads.clear();g.state.vehicles.clear();g.state.occ.clear();g.state.reservations.clear();g.state.buildings.clear();g.state.citizens.clear();g.state.gates=[];g.state.time=360;g.state.speed=1;return g;}
function graph(g,points,type='small'){
 const p=points.map(([x,y])=>g.id(x,y));for(const n of p)if(!g.state.roads.has(n))g.state.roads.set(n,{type,main:false,links:new Set(),load:0,wait:0});
 for(let i=1;i<p.length;i++){g.state.roads.get(p[i-1]).links.add(p[i]);g.state.roads.get(p[i]).links.add(p[i-1]);}return p;
}
function car(g,p,id=900,pos=0,progress=0,laneSeed=3){const v={id,path:p,pathSet:new Set(p),pos,progress,laneSeed,phase:'driving',trafficModel:2,noUTurnPolicy:1,routeCheckedVersion:g.state.version,kind:'pass',speed:2.7,wait:0,lastMovedAt:g.state.time,turnLanes:{},junctionPasses:[],junctionQueueSince:{}};g.state.vehicles.set(v.id,v);g.occupy(v,v.pos);return v;}
function locate(g,v,s){const plan=g.motionPlan(v);let pos=0;while(pos+1<plan.nodes.length&&plan.nodes[pos+1]<=s)pos++;v.pos=pos;v.progress=(s-plan.nodes[pos])/Math.max(1e-10,(plan.nodes[pos+1]??plan.nodes[pos])-plan.nodes[pos]);g.occupy(v,pos);}
const near=(a,b,eps=1e-8)=>assert(Math.abs(a-b)<=eps,`${a} != ${b}`);
function samePose(a,b){near(a.x,b.x);near(a.y,b.y);near(Math.atan2(Math.sin(a.angle-b.angle),Math.cos(a.angle-b.angle)),0,1e-6);}
const results=[];
{
 const g=cleared(),p=graph(g,Array.from({length:120},(_,i)=>[40+i,100])),v=car(g,p,900,10,.5),before=g.vehiclePosition(v);
 for(const r of g.state.roads.values())r.type='large';g.roadChanged(p);samePose(before,g.vehiclePosition(v));assert.equal(v.occKey,g.roadCellKey(v,v.pos));assert.equal(g.state.occ.get(v.occKey),v.id);
 let previous=g.vehiclePosition(v);for(let i=0;i<50;i++){g.state.time+=.016;g.advanceVehicles(.01,.016);const now=g.vehiclePosition(v);assert(Math.hypot(now.x-previous.x,now.y-previous.y)<.1);assert(now.x>=previous.x-1e-8);previous=now;}
 const second=g.vehiclePosition(v);g.roadChanged([]);samePose(second,g.vehiclePosition(v));assert.equal(v.occKey,g.roadCellKey(v,v.pos));
 results.push({test:'upgrade_preserves_pose_and_occupancy_then_continues',passed:true,after:g.vehiclePosition(v)});
}
for(const fraction of [.1,.5,.9]){
 const g=cleared();graph(g,Array.from({length:31},(_,i)=>[135+i,150]));graph(g,Array.from({length:31},(_,i)=>[150,135+i]));
 const p=[...Array.from({length:16},(_,i)=>g.id(135+i,150)),...Array.from({length:15},(_,i)=>g.id(150,151+i))],v=car(g,p,900,0,0,0),oldPlan=g.motionPlan(v),guard=oldPlan.junctions[0];
 locate(g,v,guard.entry+(Math.min(oldPlan.total,guard.clear)-guard.entry)*fraction);assert(g.reserveIntersection(v,guard.pos));
 const before=g.vehiclePosition(v),pos=v.pos;for(const r of g.state.roads.values())r.type='large';g.roadChanged(p);
 samePose(before,g.vehiclePosition(v));assert.equal(v.pos,pos);assert(v.junctionPasses.some(a=>a.node===guard.node&&a.pos===guard.pos));assert.equal(g.state.reservations.get('junction:'+guard.node)?.passes.find(p=>p.id===v.id)?.id,v.id);
 assert.equal(v.occKey,g.roadCellKey(v,v.pos));let ticks=0;for(;ticks<3000&&g.state.vehicles.has(v.id);ticks++){g.state.time+=.016;g.advanceVehicles(.01,.016);}assert(!g.state.vehicles.has(v.id),'edited turn must reach destination');assert(!g.state.reservations.get('junction:'+guard.node)?.passes.some(p=>p.id===v.id));
 results.push({test:'upgrade_inside_junction_retains_pass_and_finishes',fraction,pos,ticks,passed:true});
}
{
 const g=cleared(),p=graph(g,Array.from({length:20},(_,i)=>[40+i,100])),v=car(g,p,900,p.length-2,.99,0),before=g.vehiclePosition(v);
 for(const r of g.state.roads.values())r.type='large';g.roadChanged(p);samePose(before,g.vehiclePosition(v));for(let k=0;k<20&&g.state.vehicles.has(v.id);k++){g.state.time+=.016;g.advanceVehicles(.01,.016);}assert(!g.state.vehicles.has(v.id));results.push({test:'upgrade_near_path_end_arrives_without_rewind',passed:true});
}
{
 const g=cleared(),p=graph(g,Array.from({length:20},(_,i)=>[40+i,100])),v=car(g,p,900,5,.5,3);g.state.reservations.set(`${p[5]}:0:0`,{id:999,until:500});
 for(const r of g.state.roads.values())r.type='large';g.roadChanged(p);assert.equal(g.state.reservations.get(`${p[5]}:0:0`).id,999);assert.notEqual(g.state.occ.get(`${p[5]}:0:0`),900);assert.equal(v.occKey,null);results.push({test:'road_edit_does_not_steal_foreign_claim',passed:true});
}
for(const size of [160,200,240,260]){
 const g=cleared();for(let y=20;y<20+size;y++)for(let x=20;x<20+size;x++)if((x-20)%4===0||(y-20)%4===0)g.state.roads.set(g.id(x,y),{type:'small',main:false,links:new Set(),load:0,wait:0});
 for(const [n,r]of g.state.roads)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const [x,y]=g.xy(n),q=g.id(x+dx,y+dy);if(g.state.roads.has(q))r.links.add(q);}
 const start=g.id(20,20),end=g.id(20+size-4,20+size-4),at=performance.now(),route=g.route(start,end),elapsedMs=performance.now()-at;assert(route);assert.equal(route[0],start);assert.equal(route.at(-1),end);assert.equal(route.length,2*(size-4)+1);assert.equal(g.route(start,end),route);
 for(let i=1;i<route.length;i++){assert(g.state.roads.get(route[i-1]).links.has(route[i]));if(i>1)assert.notEqual(route[i],route[i-2]);}
 results.push({test:'complete_spaced4_lattice_route',size,roads:g.state.roads.size,pathLength:route.length,elapsedMs});
}
{
 const g=cleared();for(let y=20;y<220;y++)for(let x=20;x<220;x++)if((x-20)%4===0||(y-20)%4===0)g.state.roads.set(g.id(x,y),{type:'small',main:false,links:new Set(),load:0,wait:0});
 for(const [n,r]of g.state.roads)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const [x,y]=g.xy(n),q=g.id(x+dx,y+dy);if(g.state.roads.has(q))r.links.add(q);}
 const detached=g.id(280,280);g.state.roads.set(detached,{type:'small',main:false,links:new Set(),load:0,wait:0});const at=performance.now();assert.equal(g.route(g.id(20,20),detached),null);const firstMs=performance.now()-at,at2=performance.now();assert.equal(g.route(g.id(20,20),detached),null);results.push({test:'unreachable_component_is_proved_and_cached',roads:g.state.roads.size,firstMs,cachedMs:performance.now()-at2});
}
{
 const g=cleared(),direct=graph(g,Array.from({length:21},(_,i)=>[40+i,100]));const detour=graph(g,[...[...Array(6)].map((_,i)=>[40,100+i]),...[...Array(20)].map((_,i)=>[41+i,105]),...[...Array(5)].map((_,i)=>[60,104-i])],'large');
 const route=g.route(direct[0],direct.at(-1));assert(route.some(n=>Math.floor(n/300)===105));assert(!route.some((n,i)=>i>1&&n===route[i-2]));
 const first=direct[1],last=direct.at(-2),constrained=g.route(direct[0],direct.at(-1),[first],[last]);assert.equal(constrained[1],first);assert.equal(constrained.at(-2),last);
 assert.equal(g.route(direct[0],direct.at(-1),[first],[last],first),null);results.push({test:'road_class_preference_and_entry_exit_heading_constraints',passed:true});
}
console.log(JSON.stringify({passed:true,results},null,2));
