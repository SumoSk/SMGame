// Event-level itinerary integration. Travel takes a fixed 10 game minutes; real routes, reservations and arrivals are used.
const fs=require('fs'),assert=require('node:assert/strict');const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];const {city}=new Function('require',fixture+'return {city};')(require);const {game:g,home}=city();
g.state.money=1e8;for(const [key,x]of[['casino_medium',225],['office_small',75],['factory_small',95]])assert(g.buildBuilding(key,x,148-g.CATALOG[key].plotHeight,true));
for(const[a,b]of [[[270,150],[270,180]],[[270,180],[150,180]]])assert(g.buildRoad(g.lineCells(g.id(...a),g.id(...b)),'small',true));
let arrivals=0,after20=0,afterMidnight=0,steps=0;const ratios=[];
for(let minute=360;minute<=3240;minute+=5){g.state.time=minute;if(minute%1440===0)g.daily();let e;
 while(g.state.events.length&&g.state.events[0].at<=minute){e=g.eventPop();g.runAction(g.state.citizens.get(e.citizenId),e.action,e);assert(++steps<30000,'bounded event scheduler');}
 g.updateCityActivity();
 for(const v of [...g.state.vehicles.values()]){if(v.qaAt==null){v.qaAt=minute+10;const from=g.state.buildings.get(v.fromId);from?.parked.delete(v.citizenId);from?.visitors.delete(v.citizenId);if(from)from.parkingSlots=from.parkingSlots.map(cid=>cid===v.citizenId?null:cid);}if(v.qaAt<=minute){g.arrive(v,true);arrivals++;if(minute%1440>=1200)after20++;if(minute%1440<180)afterMidnight++;}}
 for(const c of g.state.citizens.values()){assert(Number.isFinite(c.happy)&&c.happy>=0&&c.happy<=100);assert(!c.vehicleId||g.state.vehicles.has(c.vehicleId),'no stranded citizen vehicle references');}
 if(minute%60===0&&minute<1440)ratios.push([minute/60,+g.activitySnapshot().ratio.toFixed(2)]);
}
g.validateSave(JSON.parse(g.snapshot()));assert(arrivals>100);assert(after20>10);assert(afterMidnight>0);console.log(JSON.stringify({arrivals,after20,afterMidnight,events:steps,homeRatios:ratios}));

