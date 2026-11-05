// Creator-only analytics. Server authorization is still enforced on every request.
export const dayTH = value => value ? new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)) : '';
export const statusOf = (row, now=Date.now()) => !row.closed_at && now-new Date(row.last_seen_at).getTime()<=90000 ? (!row.is_visible?'background':row.is_playing?'playing':'online') : 'offline';
export function selectRows(rows, filter, sort, now=Date.now()) {
  const query=(filter.query||'').trim().toLocaleLowerCase();
  const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  return rows.filter(row=>{
    const day=dayTH(row.started_at), level=row.metrics?.level;
    return (!query || [row.display_name,row.city,row.visitor_id,row.session_id,row.user_id].some(v=>String(v||'').toLocaleLowerCase().includes(query))) &&
      (!filter.device||row.device===filter.device)&&(!filter.city||row.city===filter.city)&&
      (!filter.status||statusOf(row,now)===filter.status)&&
      (!filter.account||(filter.account==='member'?!!row.user_id:!row.user_id))&&
      (!filter.from||day>=filter.from)&&(!filter.to||day<=filter.to)&&
      (!filter.levelMin||(number(level)&&level>=Number(filter.levelMin)))&&
      (!filter.levelMax||(number(level)&&level<=Number(filter.levelMax)))&&
      (!filter.missing||!number(level));
  }).sort((a,b)=>{
    const value=row=>sort.key.startsWith('metrics.')?row.metrics?.[sort.key.slice(8)]:sort.key==='status'?statusOf(row,now):row[sort.key];
    const x=value(a),y=value(b),missing=v=>v===null||v===undefined||v==='';
    if(missing(x)||missing(y))return missing(x)===missing(y)?0:missing(x)?1:-1;
    const result=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'th',{numeric:true});
    return result*sort.direction||String(a.session_id).localeCompare(String(b.session_id));
  });
}
export function summarize(rows, now=Date.now()) {
  const known=rows.filter(r=>Number.isFinite(r.metrics?.level));
  return {visits:rows.length,visitors:new Set(rows.map(r=>r.user_id||r.visitor_id)).size,
    online:rows.filter(r=>statusOf(r,now)!=='offline').length,
    playing:rows.filter(r=>statusOf(r,now)==='playing').length,
    seconds:rows.reduce((n,r)=>n+Math.max(0,Number(r.active_seconds)||0),0),
    averageLevel:known.length?known.reduce((n,r)=>n+r.metrics.level,0)/known.length:null,
    maxLevel:known.length?known.reduce((n,r)=>Math.max(n,r.metrics.level),0):null,missing:rows.length-known.length};
}
const columns=[['display_name','ผู้เล่น'],['device','อุปกรณ์'],['status','สถานะ'],['city','เมือง'],
 ['metrics.level','เลเวล'],['active_seconds','เวลาเล่น (นาที)'],['population','ประชากร'],['tourists','นักท่องเที่ยว'],
 ['vehicles','รถ'],['buildings','อาคาร'],['metrics.money','งบประมาณ'],['metrics.performance','คะแนนภารกิจ (%)'],
 ['metrics.flow','จราจรคล่องตัว (%)'],['metrics.unemployed','ว่างงาน'],['metrics.net','รายรับสุทธิต่อวัน'],
 ['metrics.gameDay','วันที่ในเกม'],['started_at','เข้าเว็บ'],['last_seen_at','ล่าสุด'],['closed_at','ออกจากเว็บ'],
 ['visitor_id','รหัสผู้เยี่ยมชม'],['session_id','รหัสการเข้าเว็บ'],['user_id','รหัสบัญชี']];
const labels={playing:'กำลังเล่น',online:'เปิดหน้าเว็บ',background:'เบื้องหลัง',offline:'ออฟไลน์'};
const devices={desktop:'คอมพิวเตอร์',ipad:'iPad',iphone:'iPhone',android:'Android',tablet:'แท็บเล็ต',other:'อื่น ๆ'};
const fmt=n=>n==null?'ยังไม่ได้เก็บ':Number(n).toLocaleString('th-TH',{maximumFractionDigits:1});
const date=v=>v?new Date(v).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'short'}):'—';
export function installCreatorDashboard({dialog,request,allowed,loadLive,loadCity}) {
  const style=document.createElement('style');
  style.textContent=`
  #smcityCreator.cr-full{position:fixed;inset:0;margin:0;width:100vw!important;max-width:100vw!important;height:100dvh;max-height:100dvh!important;border:0;border-radius:0;box-sizing:border-box;overscroll-behavior:contain}
  #smcityCreator.cr-full>.cr-wrap{max-width:1800px;margin:auto;padding:clamp(14px,2vw,32px)}
  #smcityCreator .cr-full-panel[hidden]{display:none}
  #smcityCreator.cr-full .cr-compact{display:none}
  #smcityCreator .cr-full-panel{display:grid;gap:18px;min-width:0}
  #smcityCreator .cr-full-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  #smcityCreator .cr-full-kpis article,#smcityCreator .cr-chart{padding:16px;border:1px solid #71878b55;border-radius:12px;background:#71878b0c}
  #smcityCreator .cr-full-kpis small{display:block;font-size:12px}#smcityCreator .cr-full-kpis b{display:block;font-size:clamp(20px,2.6vw,32px);margin-top:5px}
  #smcityCreator .cr-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:16px;border:1px solid #71878b55;border-radius:12px}
  #smcityCreator .cr-filters label{display:grid;gap:5px;font-size:12px;min-width:0}
  #smcityCreator .cr-filters input,#smcityCreator .cr-filters select{min-width:0;width:100%;box-sizing:border-box;padding:9px;border:1px solid #85969c;border-radius:7px;background:Canvas;color:CanvasText;font:inherit}
  #smcityCreator .cr-full-charts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  #smcityCreator .cr-bar-row{display:grid;grid-template-columns:minmax(55px,1fr) 3fr 45px;gap:8px;align-items:center;font-size:12px;margin-top:7px}
  #smcityCreator .cr-bar-row span{overflow-wrap:anywhere}#smcityCreator .cr-bar-row meter{width:100%;accent-color:#30b8a1}
  #smcityCreator .cr-full-panel .cr-table-box{max-height:58dvh;min-height:180px}
  #smcityCreator .cr-full-panel table{min-width:2300px}#smcityCreator .cr-full-panel th button{border:0;background:transparent;color:inherit;padding:5px 0;font-weight:bold}
  #smcityCreator .cr-full-panel td:first-child,#smcityCreator .cr-full-panel th:first-child{position:sticky;left:0;background:Canvas;color:CanvasText;z-index:1}
  #smcityCreator .cr-full-panel th:first-child{z-index:3}
  #smcityCreator .cr-pager,#smcityCreator .cr-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #smcityCreator .cr-full-note{border-left:3px solid #31a591;padding-left:10px;line-height:1.7}
  @media(max-width:800px){#smcityCreator .cr-full-kpis,#smcityCreator .cr-filters{grid-template-columns:repeat(2,minmax(0,1fr))}#smcityCreator .cr-full-charts{grid-template-columns:1fr}#smcityCreator .cr-head{align-items:flex-start;flex-wrap:wrap}}
  `;
  document.head.append(style);
  const wrap=dialog.querySelector('.cr-wrap');
  for(const section of wrap.querySelectorAll(':scope>section'))section.classList.add('cr-compact');
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent='ดูแบบเต็มจอ';toggle.setAttribute('aria-expanded','false');
  dialog.querySelector('#creatorClose').before(toggle);
  const panel=document.createElement('section');panel.className='cr-full-panel';panel.hidden=true;
  panel.innerHTML=`<div><h2>แดชบอร์ดผู้สร้าง</h2><p>ภาพรวมการเข้าเล่น · ข้อมูลเมือง · ประวัติทั้งหมดที่ระบบเก็บไว้</p></div>
  <div class="cr-actions"><button type="button" data-reload>โหลดข้อมูลใหม่</button><span data-progress role="status" aria-live="polite">ยังไม่ได้โหลด</span></div>
  <div class="cr-full-kpis" data-kpis></div>
  <div class="cr-filters">
  <label>ค้นหาชื่อ เมือง หรือรหัส<input data-filter="query" type="search" placeholder="ค้นหาผู้เล่น…"></label>
  <label>อุปกรณ์<select data-filter="device"><option value="">ทุกอุปกรณ์</option>${Object.entries(devices).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
  <label>เมือง<select data-filter="city"><option value="">ทุกเมือง</option></select></label>
  <label>สถานะ<select data-filter="status"><option value="">ทุกสถานะ</option>${Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
  <label>เข้าเว็บตั้งแต่ (เวลาไทย)<input data-filter="from" type="date"></label><label>ถึงวันที่ (เวลาไทย)<input data-filter="to" type="date"></label>
  <label>เลเวลตั้งแต่<input data-filter="levelMin" type="number" min="1" step="1"></label><label>ถึงเลเวล<input data-filter="levelMax" type="number" min="1" step="1"></label>
  <label>ประเภทบัญชี<select data-filter="account"><option value="">ทั้งหมด</option><option value="member">สมาชิก</option><option value="guest">ผู้เยี่ยมชม</option></select></label>
  <label>ข้อมูลเลเวล<select data-filter="missing"><option value="">ทั้งหมด</option><option value="1">ยังไม่ได้เก็บ</option></select></label>
  <label>จำนวนแถวต่อหน้า<select data-size><option>50</option><option>100</option><option>200</option></select></label>
  <button type="button" data-reset>ล้างตัวกรอง</button></div>
  <p class="cr-full-note">สถิติและกราฟคำนวณจากรายการที่ตรงตัวกรอง · เวลาเล่นนับเมื่อหน้าเว็บอยู่ด้านหน้า · ค่าเมืองเป็นข้อมูลล่าสุดของแต่ละครั้งที่เข้าเว็บ ไม่ใช่ยอดรวมเมืองที่ไม่ซ้ำ · เลเวลและสถิติใหม่เริ่มเก็บเมื่อผู้เล่นเปิดเกมรุ่นนี้ ข้อมูลเก่าที่ไม่มีแสดง “ยังไม่ได้เก็บ”</p>
  <div class="cr-full-charts" data-charts></div><h3>ตารางประวัติการเข้าเล่นทั้งหมด</h3><p>กดหัวคอลัมน์เพื่อเรียงขึ้นหรือลง · เลื่อนแนวนอนเพื่อดูทุกคอลัมน์ · สถานะออนไลน์อ้างอิงการเชื่อมต่อภายใน 90 วินาที</p>
  <div class="cr-table-box" tabindex="0" role="region" aria-label="ประวัติการเข้าเล่น"><table><thead><tr></tr></thead><tbody></tbody></table></div>
  <div class="cr-pager"><button type="button" data-prev>ก่อนหน้า</button><span data-page></span><button type="button" data-next>ถัดไป</button></div>`;
  // Insert ahead of the existing save/account sections; keep their controls intact.
  wrap.querySelector('.cr-toolbar').after(panel);
  let rows=[],page=0,size=50,sort={key:'started_at',direction:-1},filter={},revision=0,busy=false;
  const $=s=>panel.querySelector(s),progress=$('[data-progress]');
  const headers=$('thead tr');
  for(const [key,label] of columns){const th=document.createElement('th'),b=document.createElement('button');b.type='button';b.textContent=label+' ↕';b.onclick=()=>{sort={key,direction:sort.key===key?-sort.direction:1};page=0;render();};th.append(b);headers.append(th);}
  const actionHead=document.createElement('th');actionHead.textContent='ตรวจเมืองสด';headers.append(actionHead);
  function render(){
    const now=Date.now(),selected=selectRows(rows,filter,sort,now),stats=summarize(selected,now);
    $('[data-kpis]').replaceChildren(...[
      ['เข้าเว็บ (ครั้ง)',stats.visits],['ผู้เล่นไม่ซ้ำ (บัญชี / เบราว์เซอร์)',stats.visitors],['ออนไลน์ (ครั้งที่เข้าเว็บ)',stats.online],['กำลังเล่น (ครั้งที่เข้าเว็บ)',stats.playing],
      ['เวลาเล่นรวม (ชั่วโมง)',stats.seconds/3600],['เลเวลเฉลี่ยต่อครั้งที่มีข้อมูล',stats.averageLevel],['เลเวลสูงสุด',stats.maxLevel],['ยังไม่มีเลเวล (ครั้ง)',stats.missing]
    ].map(([label,value])=>{const article=document.createElement('article'),small=document.createElement('small'),b=document.createElement('b');small.textContent=label;b.textContent=fmt(value);article.append(small,b);return article;}));
    $('[data-charts]').replaceChildren(...[
      ['การเข้าเว็บรายวัน',r=>dayTH(r.started_at)],['อุปกรณ์',r=>devices[r.device]||r.device],['เลเวล',r=>r.metrics?.level==null?'ยังไม่ได้เก็บ':'Lv. '+r.metrics.level]
    ].map(([title,get])=>{const box=document.createElement('article'),h=document.createElement('h3');box.className='cr-chart';h.textContent=title;box.append(h);const counts=new Map();for(const r of selected){const key=get(r);counts.set(key,(counts.get(key)||0)+1);}const entries=[...counts].sort((a,b)=>title==='การเข้าเว็บรายวัน'?b[0].localeCompare(a[0]):b[1]-a[1]);for(const [label,n] of entries.slice(0,10)){const row=document.createElement('div'),name=document.createElement('span'),bar=document.createElement('meter'),value=document.createElement('span');row.className='cr-bar-row';name.textContent=label;bar.max=Math.max(1,...entries.map(e=>e[1]));bar.value=n;bar.setAttribute('aria-label',label+' '+n+' ครั้ง');value.textContent=fmt(n);row.append(name,bar,value);box.append(row);}if(!entries.length)box.append(document.createTextNode('ไม่มีข้อมูล'));if(entries.length>10)box.append(document.createTextNode('แสดง 10 อันดับจาก '+entries.length+' กลุ่ม'));return box;}));
    page=Math.max(0,Math.min(page,Math.ceil(selected.length/size)-1));
    $('tbody').replaceChildren();
    for(const row of selected.slice(page*size,(page+1)*size)){const tr=document.createElement('tr');for(const [key] of columns){const td=document.createElement('td');let v=key.startsWith('metrics.')?row.metrics?.[key.slice(8)]:row[key];if(key==='status')v=labels[statusOf(row,now)];else if(key==='device')v=devices[v]||v;else if(key.endsWith('_at'))v=date(v);else if(key==='active_seconds')v=fmt(v/60);else if(key.startsWith('metrics.')||['population','tourists','vehicles','buildings'].includes(key))v=fmt(v);td.textContent=String(v??'—');tr.append(td);}const td=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent='โหลดเมืองสด';button.disabled=['offline','background'].includes(statusOf(row,now));button.onclick=()=>loadCity(row,button);td.append(button);tr.append(td);$('tbody').append(tr);}
    if(!selected.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=columns.length+1;td.textContent='ไม่พบข้อมูลที่ตรงกับตัวกรอง';tr.append(td);$('tbody').append(tr);}
    for(const [i,[key]] of columns.entries())headers.children[i].setAttribute('aria-sort',key===sort.key?(sort.direction===1?'ascending':'descending'):'none');
    $('[data-page]').textContent=`หน้า ${page+1} / ${Math.max(1,Math.ceil(selected.length/size))} · ${fmt(selected.length)} จาก ${fmt(rows.length)} ครั้งที่โหลด${busy?' (กำลังโหลด)':''}`;
    $('[data-prev]').disabled=page===0;$('[data-next]').disabled=(page+1)*size>=selected.length;
  }
  async function reload(){
    if(!allowed()||!dialog.open||panel.hidden)return;
    const ticket=++revision;busy=true;rows=[];page=0;render();progress.textContent='กำลังโหลดประวัติทั้งหมด…';
    let cutoff=null,cursor=null,total=null;
    try{do{const data=await request('dashboard-history',{before:cutoff,cursor});if(ticket!==revision||!allowed()||!dialog.open)return;
      cutoff=data.before;cursor=data.nextCursor;total??=data.total;rows.push(...data.rows);progress.textContent='โหลดแล้ว '+fmt(rows.length)+' / '+fmt(total)+' ครั้ง';render();
    }while(cursor);
    const city=$('[data-filter="city"]'),old=city.value;city.replaceChildren(new Option('ทุกเมือง',''));for(const name of [...new Set(rows.map(r=>r.city))].sort())city.add(new Option(name,name));city.value=old;
    progress.textContent='โหลดครบ '+fmt(rows.length)+' ครั้ง · อัปเดต '+date(new Date().toISOString());
    }catch(e){if(ticket===revision)progress.textContent='โหลดไม่ครบ: '+(e.message||'ไม่ทราบสาเหตุ')+' · สถิติแสดงเฉพาะ '+fmt(rows.length)+' ครั้งที่โหลดสำเร็จ กรุณากดโหลดใหม่';}
    finally{if(ticket===revision){busy=false;render();}}
  }
  toggle.onclick=()=>{const full=!dialog.classList.contains('cr-full');dialog.classList.toggle('cr-full',full);panel.hidden=!full;toggle.textContent=full?'ย่อหน้าจอ':'ดูแบบเต็มจอ';toggle.setAttribute('aria-expanded',String(full));if(full){void reload();loadLive();}else{revision++;busy=false;} };
  for(const input of panel.querySelectorAll('[data-filter]'))input.addEventListener('input',()=>{filter[input.dataset.filter]=input.value;page=0;render();});
  $('[data-reset]').onclick=()=>{filter={};for(const el of panel.querySelectorAll('[data-filter]'))el.value='';page=0;render();};
  $('[data-size]').onchange=e=>{size=Number(e.target.value);page=0;render();};
  $('[data-prev]').onclick=()=>{page--;render();};$('[data-next]').onclick=()=>{page++;render();};$('[data-reload]').onclick=()=>void reload();
  dialog.addEventListener('close',()=>{revision++;busy=false;rows=[];$('tbody').replaceChildren();$('[data-kpis]').replaceChildren();$('[data-charts]').replaceChildren();dialog.classList.remove('cr-full');panel.hidden=true;toggle.textContent='ดูแบบเต็มจอ';toggle.setAttribute('aria-expanded','false');});
}
