const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('work/test-tourism.cjs','utf8').split('const results=[]')[0];
const {city}=new Function('require',fixture+'return {city};')(require);
const {game:g}=city(),c=[...g.state.citizens.values()][0];
const office=g.buildBuilding('office_small',75,148-g.CATALOG.office_small.plotHeight,true);assert(office);
c.profile.trait=0;c.workId=office.id;office.workers.add(c.id);
let lunchPlans=0;
for(let id=1;id<=100;id++)for(let day=0;day<7;day++){
 const p=g.planForDay({...c,id,routine:undefined},day);
 if(p.works&&p.style===4){const w=p.steps.find(s=>s.kind==='work');assert.equal(w.until,p.end,'spacing must not erase the afternoon shift');lunchPlans++;}
 for(let i=1;i<p.steps.length;i++)assert(p.steps[i].at-p.steps[i-1].at>=180);
}
assert(lunchPlans>0);
g.state.time=720;
const plan={day:0,token:'expired-work',steps:[{kind:'work',workId:office.id,at:500,deadline:550,until:600}]};
c.lifeRun={day:0,index:0,token:plan.token,plan};
g.runLifestyle(c,'life',{day:0,index:0,token:plan.token});
const detail=g.ensurePerformance().current.outcomeDetails.failed.recent[0];
assert(detail.place.includes('#'+office.id),'retain known work destination');
assert.equal(detail.deadline,550);
assert.equal(g.ensurePerformance().current.total,1);
console.log(JSON.stringify({passed:true,plans:700,lunchPlans,detail}));

