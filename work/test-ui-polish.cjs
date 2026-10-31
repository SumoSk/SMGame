'use strict';
/* Source-level layout regression check. Visual viewport testing still requires a browser. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('index.html','utf8');
const built=fs.readFileSync('dist/index.html','utf8');
const standalone=fs.readFileSync('outputs/Traffic-Fixer-Thailand-3D.html','utf8');
const styleId='smcity-ux-audit-20261101';
const style=source.match(new RegExp('<style id="'+styleId+'">([\\s\\S]*?)<\\/style>'))?.[1];
assert(style&&style.length>7000,'UI audit stylesheet is present');
for(const [label,element] of [['built',built],['standalone',standalone]])
  assert(element.includes(styleId),'audit CSS must be included in '+label);
const needs=[
 '#cityCommandBar .dock-head','flex-wrap:nowrap!important',
 'overflow-x:auto!important','body>.city-level-strip .city-level-progress-head b',
 'body>.bottom>.city-advisor-mini','body>.bottom>.control-deck:not(.tools-collapsed)',
 '#dialog[open]:not(.construction-confirm)',
 '#dialog #dialogContent .save-slot-heading h3',
 '#dialog #dialogContent .save-slot-card:not(:has(.save-slot-more[open]))',
 '#cityLevelCelebration .sm-level-celebration-card',
 '#buildVariantPopup:not([hidden])','dialog.member-gate[open]',
 '@media(max-width:520px)','@media(max-width:375px)',
 '@media(max-height:500px) and (orientation:landscape)'
];
for(const needle of needs)assert(style.includes(needle),'missing UI protection: '+needle);
assert(!style.includes('width:min(600px,'),'avoid enlarging existing menu/dialog widths');
// Phone-only compact deck; any wider touch/desktop layout keeps its prior dimensions.
assert(style.includes('Mobile-only dock height: reclaim'),'phone override missing');
const compact=style.slice(style.indexOf('Mobile-only dock height: reclaim'),style.indexOf('@media(max-width:375px) and (orientation:portrait)'));
assert(compact.includes('@media(max-width:520px) and (orientation:portrait)'),'compact CSS must be phone portrait only');
assert(compact.includes('height:178px!important'),'expected reduced 178px phone dock');
assert(compact.includes('grid-template-rows:minmax(0,82fr) minmax(0,96fr)'),'phone KPI/building split must keep room for tools');
assert(compact.includes('.builder-zone #subcategories'),'retain scrollable building categories');

for(const id of ['cityCommandBar','cityLevelButton','cityLevelProgress','cityCrateBadge','cityLevelCelebration','saveGameQuick','dialog','memberGate','citizensDashboard','touristsDashboard','buildVariantPopup','cityAdvisorTickerMessage'])
  assert(source.includes('id="'+id+'"'),'UI anchor removed: '+id);
const start=source.indexOf('id="cityCommandBar"');
const command=source.slice(start,source.indexOf('</section>',start));
for(const id of ['day','clock','pause','skip','toggleBuildingLabels','toggleCarDiamonds','toggleAIPins','toggleEyeComfort','toggleDock'])
  assert(command.includes('id="'+id+'"'),'command control missing: '+id);
assert(source.includes('message.title=value; panel.title=value;'),'long notice should remain readable without failing DOM stubs');
assert(source.includes('id="cityAdvisorTickerMessage" class="city-advisor-text" tabindex="0"'),'notice should be keyboard-scrollable');
assert(source.includes('<div class="build-dock" id="buildDock">'),'original construction frame must remain intact');

const gameMenuId='smcity-game-menus-20261101';
const gameMenu=source.match(new RegExp('<style id="'+gameMenuId+'">([\s\S]*?)</style>'))?.[1];
assert(gameMenu&&gameMenu.length>12000,'game-menu skin missing from source');
for(const [name,html] of [['hosted',built],['standalone',standalone]]){
  assert(html.includes('id="'+gameMenuId+'"'),name+' game-menu theme missing');
}
for(const selector of [
 '#memberGate[open]','#memberGate .member-card','#memberGate #memberTitle',
 '#memberGate .member-tabs button.active','#memberGate .member-form input',
 '#memberGate #memberSubmit','#memberGate #memberRetrySave[hidden]',
 '#dialog:has(.save-workspace)[open]','#dialog #dialogContent .save-slot-card',
 '#dialog #dialogContent .save-slot-more[open] .save-slot-actions>button',
 '#dialog:has(.smcity-menu-list)[open]','#dialog:has(.account-identity)[open]',
 '@media(max-width:520px)','@media(prefers-reduced-motion:reduce)'
]) assert(gameMenu.includes(selector),'missing game themed menu style: '+selector);
for(const id of ['memberGate','memberEmail','memberPassword','memberSubmit','memberRetrySave','memberClose','memberBack','memberDevQuick']){
  assert(source.includes('id="'+id+'"'),'account control lost: '+id);
}
for(const control of ['save-workspace','save-slot-card','save-slot-more','save-backup','save-operation-actions']){
  assert(gameMenu.includes(control),'save presentation scope missing: '+control);
}
assert(!gameMenu.includes('pointer-events:none'),'game menus must remain interactive');

console.log('PASS: SMCITY UX polish source checks, safe edges, small text, scrollable command row, dialogs and reward UI.');
