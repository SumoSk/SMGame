const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync('dist/game.js','utf8'),begin=game.indexOf("const SM_CITY_COMPRESSION="),end=game.indexOf("const SAVE_KEY=",begin);
assert(begin>0&&end>begin,'codec must exist in game.js');
const context={window:{},CompressionStream,DecompressionStream,Blob,Response,Uint8Array,btoa,atob,console};
vm.createContext(context);vm.runInContext(game.slice(begin,end),context);
(async()=>{
 const codec=context.window.SMGameSaveCodec;
 const city={format:2,city:'london',roads:[],buildings:[],citizens:Array.from({length:10000},(_,i)=>[i,{id:i,homeId:123,profile:{trait:i%4},history:['เดินทาง','ไปทำงาน'],events:['กลับบ้าน']}])};
 const original=JSON.stringify(city),packed=await codec.encode(original);
 assert(packed.length<original.length*.3,'large repetitive city must compress well');
 assert.equal(await codec.decode(packed),original,'lossless compression');
 assert.equal(await codec.decode(original),original,'plain old save remains supported');
 assert.equal(await codec.encode(packed),packed,'already packed save must not double encode');
 await assert.rejects(codec.decode('{"__smcityPacked":"unsupported","payload":"AA=="}'),/ไม่ถูกต้อง/);
 console.log('PASS compressed save roundtrip',JSON.stringify({rawBytes:original.length,packedBytes:packed.length,ratio:packed.length/original.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
