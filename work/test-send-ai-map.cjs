'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=fs.readFileSync('work/test-motion.cjs','utf8').split('const angle=')[0];
const {game:g,context:ctx,get}=new Function('require',prefix+'return {game,context,get};')(require);
(async()=>{
 const before=g.snapshot(),report=g.aiMapReport();
 assert.equal(report.format,'SMCITY-AI-map-diagnostics');
 assert.equal(report.sourceFormat,'SMGame-city-bug-report');
 assert.equal(report.save.roads.length,g.state.roads.size);
 assert.equal(report.save.buildings.length,g.state.buildings.size);
 assert.equal(report.save.vehicles.length,g.state.vehicles.size);
 assert(report.save.signals&&report.save.events,'must contain traffic control and event state');
 assert(report.analysisInstructions.some(line=>line.includes('ห้ามเดา')));
 assert.equal(g.snapshot(),before,'taking a report must never mutate gameplay');
 assert(g.dockItems('reports').some(t=>t.key==='sendAi'&&t.name==='ส่ง AI'),'Send AI must be under City Data');
 g.selectTool('hand');assert(get('tools').innerHTML.includes('data-tool="sendAi"')===false,'Send AI should not appear under Buildings');

 ctx.Blob=Blob;
 let shared=null,downloaded=0,created=0,links=[];
 ctx.File=class{constructor(chunks,name,opts){this.chunks=chunks;this.name=name;this.type=opts.type;}};
 ctx.navigator={canShare:()=>true,async share(payload){shared=payload;}};
 ctx.window.open=()=>({});
 await g.sendCurrentMapToAi();
 assert(shared&&shared.files.length===1,'native share sheet should receive JSON File');
 assert.equal(shared.files[0].type,'application/json');
 assert(shared.files[0].name.startsWith('SMCITY-send-AI-'));
 assert(!get('dialog').open,'native share does not open a redundant modal');

 // Desktop/browser fallback must download the same JSON and explain how to attach it.
 ctx.navigator={};
 ctx.URL={createObjectURL:()=>{created++;return'blob:report';},revokeObjectURL:()=>{}};
 ctx.document.body={appendChild(node){links.push(node);}};
 ctx.document.createElement=tag=>({tag,href:'',download:'',click(){downloaded++;},remove(){}});
 await g.sendCurrentMapToAi();
 assert.equal(downloaded,1,'browser without file sharing downloads immediately');
 assert.equal(created,1);
 assert(links[0].download.startsWith('SMCITY-send-AI-'));
 assert.equal(get('dialog').open,true,'fallback explains how to share');
 assert(get('dialogContent').innerHTML.includes('เปิด ChatGPT'),'fallback links to AI chat');
 assert(get('dialogContent').innerHTML.includes('ไม่ได้ส่งข้อมูลขึ้นเซิร์ฟเวอร์โดยอัตโนมัติ'));
 get('sendAiClose').onclick();
 assert.equal(g.snapshot(),before,'exporting report must not edit road/vehicle state');
 console.log('Send AI passed: City Data button, lossless live snapshot, native file share, desktop JSON fallback, no city mutation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
