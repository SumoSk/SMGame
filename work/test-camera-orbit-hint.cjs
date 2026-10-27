const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const boot=fs.readFileSync('dist/bootstrap.js','utf8');
assert(html.includes('#cameraRotateHint[hidden]{display:none!important}'),'Hidden must override desktop display');
assert(html.includes('@media (min-width:1001px) and (pointer:fine)'),'Hint must stay desktop-only');
assert(boot.includes('game.js?v=orbit3-20261027'),'Game module cache must update');
const start=source.indexOf('let mouseOrbit=null,mouseChordHeld=false,mouseRightPending=false;');
const end=source.indexOf('function beginTouchOrbit()',start);
assert(start>=0&&end>start,'Mouse rotation implementation missing');
const segment=source.slice(start,end);
assert(source.includes("if(mouseChordHeld){if((e.buttons&3)!==3)finishMouseOrbitHint();drag=null;"),'Mouseup must count');
assert(source.includes("if(e.pointerType!=='touch'&&mouseChordHeld){if((e.buttons&3)!==3)finishMouseOrbitHint();"),'Pointerup must count as fallback');
const data=new Map(),hint={hidden:false},camera={angle:Math.PI/4,elevation:Math.PI/3},view={moves:0,updateCamera(){this.moves++}};
const canvas={setPointerCapture(){}};
const localStorage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};
const document={getElementById:id=>id==='cameraRotateHint'?hint:null};
const get=Function('localStorage','document','canvas','renderer3d','cam',
 'cameraDefaultAngle','cameraDefaultElevation','clearPendingTap',
 "const $=id=>document.getElementById(id);let drag=null,hover=null,follow=null,pointers=new Map();"+segment+
 'return {beginMouseOrbit,moveMouseOrbit,finishMouseOrbitHint,getCount:()=>orbitHintCount};');
let instance=get(localStorage,document,canvas,view,camera,Math.PI/4,Math.PI/3,()=>{});
assert.equal(instance.getCount(),0);assert.equal(hint.hidden,false);
function gesture(distance){
 instance.beginMouseOrbit({clientX:10,clientY:10,buttons:3,preventDefault(){}});
 if(distance>0)instance.moveMouseOrbit({clientX:10+distance,clientY:10,buttons:3});
 instance.finishMouseOrbitHint();
 // Browser delivers both pointerup and mouseup; second completion must not count.
 instance.finishMouseOrbitHint();
}
gesture(0);gesture(8);assert.equal(instance.getCount(),0,'Click/no movement cannot count');
gesture(30);assert.equal(instance.getCount(),1);assert.equal(hint.hidden,false);
gesture(25);assert.equal(instance.getCount(),2);assert.equal(hint.hidden,false);
gesture(18);assert.equal(instance.getCount(),3);assert.equal(hint.hidden,true);
assert.equal(data.get('smcity-camera-mouse-rotations-v1'),'3');
gesture(100);assert.equal(instance.getCount(),3,'Count must cap at three');
// Refresh persists the mastered hint state.
instance=get(localStorage,document,canvas,view,camera,Math.PI/4,Math.PI/3,()=>{});
assert.equal(instance.getCount(),3);assert.equal(hint.hidden,true,'Hint should stay hidden after reload');
console.log('PASS PC mouse hint: movement threshold, exactly three gestures, no double count, persistent hide and CSS precedence');
