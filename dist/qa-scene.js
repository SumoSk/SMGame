window.__TRAFFIC_TEST_HARNESS__=game=>requestAnimationFrame(()=>{
 game.reset('phuket');
 const line=(x,y,u,v,type='small')=>{const cells=[],n=Math.max(Math.abs(u-x),Math.abs(v-y));for(let k=0;k<=n;k++)cells.push(game.id(Math.round(x+(u-x)*k/n),Math.round(y+(v-y)*k/n)));game.buildRoad(cells,type,true);};
 line(150,137,176,137,'medium');line(150,160,176,160,'medium');line(176,137,176,160,'medium');line(162,137,162,160);line(136,150,136,160);line(136,160,150,160);line(138,137,150,137);
 const build=(key,x,y)=>{const b=game.buildBuilding(key,x,y,true);if(!b)console.warn('QA placement',key,x,y,game.checkBuilding(key,x,y));};
 game.state.money=2500000;
 build('home_medium',153,133);build('home_small',157,134);build('restaurant_small',164,133);build('home_medium',168,133);build('home_small',172,134);
 build('home_small',153,138);build('home_small',156,138);build('home_medium',158,140);build('office_medium',164,138);build('shop_small',171,138);build('park_medium',171,141);
 build('mall_medium',164,152);build('home_medium',153,155);build('home_small',157,156);build('pub_small',169,156);build('restaurant_small',172,156);
 build('home_medium',137,156);build('home_small',141,157);build('shop_small',145,157);build('park_small',142,137);
 game.immigration();for(let n=0;n<2200;n++)game.tick(.1);
 game.state.speed=1;
 console.log('QA scene populated',game.state.buildings.size,game.computeStats());
});
