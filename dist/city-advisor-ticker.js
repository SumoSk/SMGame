/* SMCITY compact City Advisor: reads the same DOM figures as the existing city dashboard.
   No new traffic scans, route searches, WebGL passes or changes to game saves. */
(() => {
  'use strict';
  const bar = document.getElementById('cityAdvisorTicker');
  const action = document.getElementById('cityAdvisorTickerAction');
  const message = document.getElementById('cityAdvisorTickerMessage');
  const dismiss = document.getElementById('cityAdvisorTickerDismiss');
  if (!bar || !action || !message || !dismiss) return;

  const categoryFor = {home:'home',work:'work',shop:'food',restaurant:'food',mall:'food',park:'leisure',pub:'leisure',casino:'casino',hotel:'hotel'};
  const cooldown = {need:38000, happiness:85000, traffic:300000, ai:190000, car:190000, growth:300000};
  const seen = new Map();
  let active = null, shownUntil = 0, lastHidden = 0, lastRead = 0;
  const number = value => {
    const match = String(value || '').replace(/,/g,'').replace(/[−–]/g,'-').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  };

  function observations() {
    const demand = document.getElementById('demand');
    const happinessNode = document.getElementById('happy');
    const flowNode = document.getElementById('flow');
    const populationNode = document.getElementById('population');
    if (!demand?.querySelector('.mini-need') || !happinessNode || !flowNode || !populationNode) return null;
    const happy = number(happinessNode.textContent);
    const flow = number(flowNode.textContent);
    const population = number(populationNode.textContent);
    const money = number(document.getElementById('money')?.textContent);
    if (![happy,flow,population].every(Number.isFinite)) return null;
    const result = [];
    const add = (key,text,level,interval,go=null) => result.push({key,text,level,interval,go});

    // These are genuine, already-calculated unmet requests. No capacity calculation is duplicated here.
    for (const node of demand.querySelectorAll('.mini-need[data-need-kind]')) {
      const missing = number(node.querySelector('.mini-need-missing')?.textContent);
      if (!(missing < 0)) continue;
      const kind = node.dataset.needKind;
      const label = node.querySelector('span')?.textContent?.trim();
      if (!label) continue;
      add('need:'+kind,'ตรวจพบ'+label+'ขาดแคลน',70 + Math.min(20,Math.abs(missing)/10),cooldown.need,categoryFor[kind] ? 'category:'+categoryFor[kind] : null);
    }
    if (population > 0 && happy < 70) {
      add('happiness:70','ความสุขต่ำกว่า 70% ประชาชนใหม่หยุดย้ายเข้า',100,cooldown.happiness,'happiness');
    } else if (population > 0 && happy < 80) {
      add('happiness:80','ความสุขต่ำกว่า 80% นักท่องเที่ยวหยุดเข้าเมือง',95,cooldown.happiness,'happiness');
    }
    // Traffic is deliberately infrequent; the existing flow KPI owns its calculations.
    if (population >= 15 && flow < 65) {
      add('traffic','ตรวจพบการจราจรติดขัด',42,cooldown.traffic,'traffic');
    }
    // Promotions appear only after the city has developed and the player has enough money.
    if (population >= 15 && flow < 85 && money >= 1000000) {
      add('ai','อัปเกรดแยก AI เพื่อช่วยจัดการจราจร',35,cooldown.ai,'ai');
    }
    if (population >= 10 && money >= 50000) {
      add('car','อัปเกรดรถเพื่อการเดินทางที่รวดเร็วขึ้น',27,cooldown.car,'car');
    }
    if (population > 0 && happy >= 80 && result.every(item=>!item.key.startsWith('need:')) && flow >= 80) {
      add('growth','เมืองพร้อมเติบโต ขยายเมืองกันเลย',13,cooldown.growth,'category:home');
    }
    return result;
  }

  function hide(now=Date.now()) {
    bar.hidden = true;
    active = null;
    lastHidden = now;
  }
  function show(item,now) {
    active = item;
    shownUntil = now + 5400;
    seen.set(item.key,now);
    message.textContent = item.text;
    action.title = item.go ? 'แตะเพื่อเปิดเครื่องมือที่เกี่ยวข้อง' : item.text;
    action.setAttribute('aria-label',item.text);
    action.dataset.level = item.key.startsWith('happiness') ? 'danger' : item.key.startsWith('need:') ? 'warning' : item.key==='traffic' ? 'warning' : 'info';
    bar.hidden = false;
  }
  function refresh() {
    if (document.hidden) return;
    const now = Date.now();
    if (active) {
      if (now < shownUntil) return;
      hide(now);
      return;
    }
    if (now - lastHidden < 1600 || now - lastRead < 1900) return;
    lastRead = now;
    const items = observations();
    if (!items) return;
    // Dismissed/resolved alerts stop occupying the queue; a new shortage is eligible immediately.
    const keys = new Set(items.map(item=>item.key));
    for (const key of seen.keys()) if (!keys.has(key)) seen.delete(key);
    const ready = items.filter(item => now - (seen.get(item.key) ?? -Infinity) >= item.interval);
    if (!ready.length) return;
    ready.sort((a,b) => b.level-a.level || (seen.get(a.key) ?? 0)-(seen.get(b.key) ?? 0));
    show(ready[0],now);
  }
  function visit(go) {
    if (!go) return;
    if (go.startsWith('category:')) {
      const category = go.slice(9);
      document.querySelector('#subcategories [data-category="'+category+'"]')?.click();
    } else if (go==='ai') {
      document.querySelector('#cityQuickModes [data-city-shortcut="signalManage"]')?.click();
    } else if (go==='car') {
      document.querySelector('#cityQuickModes [data-city-shortcut="vehicleUpgrade"]')?.click();
    } else if (go==='happiness') {
      document.querySelector('.city-dashboard [data-inspect="happiness"]')?.click();
    } else if (go==='traffic') {
      document.querySelector('.city-dashboard [data-inspect="traffic"]')?.click();
    }
  }
  action.addEventListener('click',() => {
    if (!active) return;
    const go = active.go;
    hide();
    visit(go);
  });
  dismiss.addEventListener('click',event => {
    event.stopPropagation();
    hide();
  });
  document.documentElement.classList.add('city-advisor-ticker-ready');
  setInterval(refresh,2500);
  refresh();
})();