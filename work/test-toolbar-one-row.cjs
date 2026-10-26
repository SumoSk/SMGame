const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('dist/style.css','utf8');
const page=fs.readFileSync('index.html','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
const marker='/* SMGame: calendar, time, playback, label visibility and tool collapse';
const i=css.lastIndexOf(marker);
assert(i>=0,'new single-row toolbar CSS must exist');
const rules=css.slice(i);
for(const needle of [
 '.build-dock .dock-head{',
 'flex-wrap:nowrap!important',
 '.dock-timebar{',
 '.dock-clock{',
 '.dock-speed{',
 '.playback button{',
 '.dock-head>button{',
 '.toggle-building-labels{',
 '@media(min-width:721px) and (max-width:1100px)',
 '@media(max-width:720px)',
 '@media(max-width:375px)',
 '#skip .skip-day-label{display:none!important}',
 '#toggleBuildingLabelsText,',
 '#toggleDockText{'
])assert(rules.includes(needle),'missing one-row responsive behavior: '+needle);
for(const selector of ['id="day"','id="clock"','id="pause"','data-speed="1"','data-speed="2"','data-speed="5"','data-speed="10"','data-speed="20"','id="skip"','id="toggleBuildingLabels"','id="toggleDock"'])
 assert(page.includes(selector),'toolbar control lost: '+selector);
const segment=page.slice(page.indexOf('<div class="dock-head">'),page.indexOf('<div id="dockBody"'));
assert(segment.includes('class="dock-timebar"'),'time and playback remain grouped');
assert(segment.includes('class="skip-day-label"'),'skip-day text can collapse on small screens');
assert(segment.includes('aria-label="ข้ามไปเช้าวันใหม่"'),'icon-only skip retains accessibility');
assert(segment.indexOf('id="day"')<segment.indexOf('id="clock"')&&segment.indexOf('id="clock"')<segment.indexOf('id="pause"'),'calendar, time and speed must appear in order');
assert(segment.indexOf('id="pause"')<segment.indexOf('id="toggleBuildingLabels"')&&segment.indexOf('id="toggleBuildingLabels"')<segment.indexOf('id="toggleDock"'),'toggle buttons follow speed in the same header');
assert(game.includes("innerWidth<=500?['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.']"),'day label must abbreviate on narrow phones');
for(const selector of ['data-dock-group','id="categories"','id="subcategories"','id="tools"'])assert(page.includes(selector)||game.includes(selector),'retain new category dock: '+selector);
console.log(JSON.stringify({passed:true,oneHeaderRow:true,ipad:true,phone:true,controlsPreserved:true}));
