'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs'),results=[];
function fixture(extra=''){const s=boot(extra);const g=s.game;g.reset();const b=g.buildBuilding('home_starter',152,140,true,1);assert(b);g.immigration();return {...s,b};}
function test(name,fn){fn();results.push({name,passed:true});}
test('loaded move-in citizens retain real trips and home reservations',()=>{
 const {game:g,b}=fixture(),ids=[...g.state.citizens.keys()],money=g.state.money,raw=g.snapshot();
 assert.equal(ids.length,6);assert(g.loadGame(true,null,raw));
 assert.equal(g.state.citizens.size,6);assert.equal(g.state.vehicles.size,6);assert.equal(g.state.money,money);
 const home=g.state.buildings.get(b.id);assert.equal(home.residents.size,0);assert.equal(home.reservedResidents,6);
 for(const id of ids){const c=g.state.citizens.get(id),v=g.state.vehicles.get(c.vehicleId);assert(v&&v.citizenId===id&&v.kind==='moveIn');assert.equal(c.resident,false);}
 assert(g.loadGame(true,null,g.snapshot()));assert.equal(g.state.citizens.size,6);assert.equal(g.state.vehicles.size,6);assert.equal(g.state.buildings.get(b.id).reservedResidents,6);
});
test('disconnected loaded move-ins wait with real bounded no-route trips',()=>{
 const {game:g,b}=fixture(),save=JSON.parse(g.snapshot()),a=g.id(150,135),z=g.id(150,136);
 save.roads.find(([n])=>n===a)[1].links=save.roads.find(([n])=>n===a)[1].links.filter(n=>n!==z);
 save.roads.find(([n])=>n===z)[1].links=save.roads.find(([n])=>n===z)[1].links.filter(n=>n!==a);
 assert(g.loadGame(true,null,JSON.stringify(save)));assert.equal(g.state.citizens.size,6);assert.equal(g.state.vehicles.size,6);
 for(const c of g.state.citizens.values()){const v=g.state.vehicles.get(c.vehicleId);assert(v);assert.equal(v.phase,'gate_waiting');assert(g.missingRoute(v));}
 assert.equal(g.state.buildings.get(b.id).reservedResidents,6);
 g.state.time+=151;g.advanceVehicles(.05,1);assert.equal(g.state.vehicles.size,0);assert.equal(g.state.citizens.size,0);assert.equal(g.state.buildings.get(b.id).reservedResidents,0);
});
test('towed move-out citizen retries once and leaves through a real new trip',()=>{
 const {game:g}=fixture(),incoming=[...g.state.vehicles.values()][0],c=g.state.citizens.get(incoming.citizenId);g.arrive(incoming,true);
 c.lifeRun=null;g.state.events=g.state.events.filter(e=>e.citizenId!==c.id);g.eventHeapify();g.runAction(c,'moveOut');const oldId=c.vehicleId;assert(oldId);
 assert(g.towVehicle(oldId,false,true));assert(c.movingOut&&!c.vehicleId);const retry=g.state.events.filter(e=>e.citizenId===c.id&&e.action==='moveOut');assert.equal(retry.length,1);assert.equal(retry[0].at,g.state.time+5);
 g.state.time=retry[0].at;g.runAction(c,'moveOut',retry[0]);assert(c.vehicleId&&c.vehicleId!==oldId);assert.equal(g.state.vehicles.get(c.vehicleId).kind,'moveOut');
});
test('moving destination cannot recover through exit-only access',()=>{
 const {game:g}=boot('occupy');g.reset();const b=g.buildBuilding('home_starter',152,140,true,1);g.immigration();const current=g.id(150,139),v=[...g.state.vehicles.values()].find(x=>x.path.includes(current));assert(v);
 v.phase='driving';v.pos=v.path.indexOf(current);v.progress=.1;v.speed=0;g.occupy(v,v.pos);const before=g.vehiclePosition(v);assert(g.moveBuilding(b.id,152,138,true,1));
 assert.equal(v.phase,'stuck');assert(g.missingRoute(v));const after=g.vehiclePosition(v);assert(Math.hypot(before.x-after.x,before.y-after.y)<1e-8);
});
test('delivery return and departure recheck preserve legal curb direction',()=>{
 const {game:g}=boot();g.reset();const b=g.buildBuilding('home_starter',152,140,true,1),exit=b.access.find(a=>a.exit);
 const truck={id:900,kind:'delivery',phase:'delivery_unload',toId:b.id,path:[exit.node],pathSet:new Set([exit.node]),pos:0,progress:0,lane:0,laneSeed:0,delivery:{stage:'unloading'},wait:0,junctionPasses:[],junctionQueueSince:{}};
 g.state.vehicles.set(truck.id,truck);g.startDeliveryReturn(truck);assert(exit.next.includes(truck.path[1]));assert.equal(truck.delivery.exitNode,exit.node);
 assert(g.checkDepartureRoute(truck));assert(exit.next.includes(truck.path[1]));
 for(const next of exit.next){g.state.roads.get(exit.node).links.delete(next);g.state.roads.get(next).links.delete(exit.node);}g.state.version++;g.state.routeCache.clear();assert.equal(g.checkDepartureRoute(truck),false);assert(g.missingRoute(truck));
});
function analytics(){const {game:g}=boot('trafficPair,trafficPairCollect,trafficPairSnapshot,trafficPairFinalize');g.reset();const make=id=>({id,key:'home_starter',x:160,y:140,rotation:0,residents:new Set(),workers:new Set(),visitors:new Set(),parked:new Set(),guests:new Set(),parkingSlots:Array(6).fill(null),queue:[],access:[],reservedResidents:0,reservedService:0});g.state.buildings.set(100,make(100));g.state.buildings.set(101,make(101));const p=[g.id(150,138),g.id(150,139)],v={id:900,kind:'pass',fromId:100,toId:101,citizenId:null,phase:'driving',path:p,pathSet:new Set(p),pos:0,progress:0,congestionMinutes:0,junctionPasses:[],junctionQueueSince:{},turnLanes:{},trafficModel:2};g.state.vehicles.set(v.id,v);g.trafficPairCollect();return {g,v};}
for(const finish of ['arrive','cancel'])test('final traffic delay retained on '+finish,()=>{const {g,v}=analytics();g.state.time+=4;v.congestionMinutes=4;if(finish==='arrive')g.arrive(v,true);else g.cancelVehicle(v);g.state.time+=2;g.trafficPairCollect();const data=g.trafficPairSnapshot();assert.equal(data.today.length,1);assert.equal(data.today[0].minutes,4);assert.equal(data.today[0].cars,1);g.trafficPairFinalize(v);assert.equal(g.trafficPairSnapshot().today[0].minutes,4);});
test('day rollover flushes final old-day delta without counting it twice',()=>{const {g,v}=analytics();v.congestionMinutes=4;g.state.time=1800;g.trafficPairCollect();let data=g.trafficPairSnapshot();assert.equal(data.previous.rows[0].minutes,4);v.congestionMinutes=7;g.state.time+=4;g.cancelVehicle(v);data=g.trafficPairSnapshot();assert.equal(data.today[0].minutes,3);assert.equal(data.previous.rows[0].minutes,4);});
console.log(JSON.stringify({source:process.env.SMCITY_SOURCE,tests:results},null,2));
