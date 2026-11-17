'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
process.env.SMCITY_SOURCE??=path.join(__dirname,'../../dist/game.js');
const {boot}=require('./audit-harness.cjs');
function fixture(key='restaurant_starter'){
 const {game:g}=boot('startResidentService,finishResidentService,settleExpiredMissionResults,activityKey');g.reset();
 const home=g.buildBuilding('home_starter',152,132,true,1),venue=g.buildBuilding(key,152,141,true,1);assert(home&&venue);
 let c;do{c=g.newCitizen(home);if(c.profile.trait===3)g.state.citizens.delete(c.id);}while(c.profile.trait===3);
 assert(g.createTrip(c,'moveIn',null,home.id,g.id(150,0),null,1800));g.arrive(g.state.vehicles.get(c.vehicleId),true);g.state.events=[];g.state.time=600;return {g,c,home,venue};
}
function service(){const f=fixture(),{g,c,home,venue}=f;assert(g.createTrip(c,'leisure',home.id,venue.id,null,null,null,{serviceKind:'restaurant',stay:30}));g.state.time=605;g.arrive(g.state.vehicles.get(c.vehicleId),true);assert(c.serviceMission);assert(venue.visitors.has(c.id));return f;}
const results=[];function test(name,f){results.push({case:name,...f()});}
test('S1_load_neutrally_clears_incomplete_service_before_next_actions',()=>{
 const {g,c,venue}=service();g.state.time=610;const cid=c.id,key=g.activityKey(c,c.serviceMission),money=g.state.money,raw=g.snapshot();assert(g.loadGame(true,null,raw));const loaded=g.state.citizens.get(cid);
 assert.equal(loaded.serviceMission,null);assert.equal(loaded.locationId,loaded.homeId);assert.equal(g.state.buildings.get(venue.id).visitors.size,0);assert.equal(g.state.money,money);assert.equal(g.ensurePerformance().current.total,0);
 g.runAction(loaded,'home');assert.equal(g.state.money,money);assert.equal(g.ensurePerformance().current.total,0);g.state.speed=5;g.tick(.05);g.tick(.05);
 assert(!loaded.journeyResults?.some(r=>r.key===key));assert.equal(g.ensurePerformance().current.cancelled,0);return {pendingService:null,newDayCancelled:0,oldServiceResultCreated:false,loadMoneyDelta:0};
});
test('S1_reloading_same_pending_service_save_three_times_cannot_score_or_mint_money',()=>{
 const {g,c}=service();g.state.time=610;const cid=c.id,raw=g.snapshot(),money=g.state.money;for(let k=0;k<3;k++){assert(g.loadGame(true,null,raw));assert.equal(g.state.citizens.get(cid).serviceMission,null);assert.equal(g.ensurePerformance().current.total,0);assert.equal(g.state.money,money);}return {loads:3,moneyDelta:0,newDayResults:0};
});
test('control_service_must_finish_and_rewards_once_even_after_reloads',()=>{
 const {g,c}=service(),money=g.state.money,until=c.serviceMission.serviceUntil;g.state.time=until-1;g.finishResidentService(c);assert(c.serviceMission);assert.equal(g.ensurePerformance().current.total,0);g.state.time=until;g.finishResidentService(c);g.finishResidentService(c);assert.equal(g.state.money,money+500);assert.equal(g.ensurePerformance().current.ontime,1);
 const raw=g.snapshot();for(let k=0;k<3;k++){assert(g.loadGame(true,null,raw));assert.equal(g.state.money,money+500);}return {bonus:500,results:1,reloads:3};
});
function workCase(outcome,{factor=1,forfeit=false,alreadyMovingOut=false,settleFirst=false}={}){
 const {g,c,home,venue}=fixture();assert(g.createTrip(c,'work',home.id,venue.id,null,null,null));const v=g.state.vehicles.get(c.vehicleId);assert.equal(v.workEnd,840);
 if(outcome!=='missed'){g.state.time=outcome==='late'?800:605;assert.equal(g.arrivalOutcome(v,c,venue),outcome);g.arrive(v,true);}
 g.state.time=1800;const p=g.ensurePerformance();p.incomeFactor=factor;c.movingOut=alreadyMovingOut;const opening=g.state.money;
 if(settleFirst){g.settleExpiredMissionResults();g.settleExpiredMissionResults();assert.equal(p.current.total,1);assert.equal(p.current.day,0);assert(!p.closing);assert.equal(c.movingOut,false);}
 const expectedTax=outcome==='missed'?250:outcome==='late'?400:500;
 g.daily({forfeitIncome:forfeit});const report=g.state.missionStats.previous,expectedReported=forfeit||alreadyMovingOut?0:expectedTax*factor,expectedBusiness=forfeit?0:50*factor,expectedPaid=expectedReported+expectedBusiness-120;
 assert.equal(c.lastTax,expectedTax);assert.equal(g.workTax(c,0),expectedTax);assert.equal(report.taxRevenue,expectedReported);assert.equal(report.businessRevenue,expectedBusiness);assert.equal(g.state.money-opening,expectedPaid);assert.equal(report.dailySettlement,expectedPaid);assert.equal(report.maintenanceCost,120);
 assert.equal(g.ensurePerformance().previous.day,0);assert.equal(g.ensurePerformance().previous.total,1);assert.equal(g.ensurePerformance().previous[outcome],1);assert.equal(g.ensurePerformance().current.day,1);assert.equal(g.ensurePerformance().current.total,0);
 assert.equal(g.state.missionStats.current.total,0);assert.equal(report.total,1);if(outcome!=='ontime')assert.equal(c.movingOut,true);
 const after=g.state.money;g.daily();g.closePerformanceDay();assert.equal(g.state.money,after);assert.equal(g.ensurePerformance().previous.total,1);
 return {attendance:outcome,workTax:expectedTax,reportedTax:report.taxRevenue,businessRevenue:report.businessRevenue,maintenance:120,paid:expectedPaid,scoreDay:0,scoreTotal:1,newDayTotal:0,movingOut:c.movingOut,incomeFactorUsed:factor,newIncomeFactor:g.ensurePerformance().incomeFactor};
}
test('S2_expired_work_is_missed_and_tax250_is_paid_before_move_out',()=>workCase('missed'));
test('S2_late_arrival_keeps_tax400_and_one_old_day_result',()=>workCase('late'));
test('S2_success_keeps_tax500_without_duplicate_result_or_bonus',()=>workCase('ontime'));
test('S2_old_income_factor_is_applied_before_next_day_factor_changes',()=>workCase('missed',{factor:.5}));
test('S2_already_moving_out_stays_excluded_from_tax_base',()=>workCase('missed',{alreadyMovingOut:true}));
test('S2_forfeit_income_still_settles_attendance_and_only_charges_maintenance',()=>workCase('missed',{forfeit:true}));
test('S2_settlement_helper_is_idempotent_and_does_not_evict_before_tax',()=>workCase('missed',{settleFirst:true}));
test('control_direct_day_close_uses_same_expired_work_rule_without_paying_tax',()=>{
 const {g,c,home,venue}=fixture();assert(g.createTrip(c,'work',home.id,venue.id,null,null,null));g.state.time=1800;const money=g.state.money;assert(g.closePerformanceDay());assert.equal(g.ensurePerformance().previous.missed,1);assert.equal(g.workTax(c,0),250);assert.equal(g.state.money,money);assert.equal(g.closePerformanceDay(),false);return {missed:1,moneyDelta:0};
});
test('control_unexpired_service_trip_carries_into_new_day_without_false_failure',()=>{
 const {g,c,home,venue}=fixture('casino_starter');g.state.time=1750;assert(g.createTrip(c,'leisure',home.id,venue.id,null,null,null,{serviceKind:'casino',stay:30}));const v=g.state.vehicles.get(c.vehicleId);assert.equal(v.deadline,1930);g.state.time=1800;g.daily();assert(!v.resultDone);assert(g.state.vehicles.has(v.id));assert.equal(g.ensurePerformance().current.total,0);g.state.time=1805;g.arrive(v,true);assert(c.serviceMission);g.state.time=1835;g.finishResidentService(c);assert.equal(g.ensurePerformance().current.ontime,1);return {deadline:1930,closeAt:1800,finishedAt:1835,newDayOntime:1};
});
test('control_service_crosses_midnight_in_same_performance_day',()=>{
 const {g,c,home,venue}=fixture();g.state.time=1420;assert(g.createTrip(c,'leisure',home.id,venue.id,null,null,null,{serviceKind:'restaurant',stay:30}));g.state.time=1425;g.arrive(g.state.vehicles.get(c.vehicleId),true);assert.equal(c.serviceMission.serviceUntil,1455);g.state.time=1455;g.finishResidentService(c);assert.equal(g.ensurePerformance().current.day,0);assert.equal(g.ensurePerformance().current.ontime,1);return {day:0,ontime:1};
});
test('control_live_service_crosses_0600_and_finishes_once',()=>{
 const {g,c,home,venue}=fixture('casino_starter');g.state.time=1760;assert(g.createTrip(c,'leisure',home.id,venue.id,null,null,null,{serviceKind:'casino',stay:30}));g.state.time=1790;g.arrive(g.state.vehicles.get(c.vehicleId),true);assert.equal(c.serviceMission.serviceUntil,1820);g.state.time=1800;g.daily();assert(c.serviceMission);assert(venue.visitors.has(c.id));const money=g.state.money;g.state.time=1820;g.finishResidentService(c);g.finishResidentService(c);assert.equal(g.state.money,money+500);assert.equal(g.ensurePerformance().current.ontime,1);return {day:1,ontime:1,bonus:500};
});
console.log(JSON.stringify({source:process.env.SMCITY_SOURCE,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(process.env.SMCITY_SOURCE)).digest('hex'),passed:results.length,results},null,2));
