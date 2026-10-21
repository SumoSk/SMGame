// Deterministic demo city, separate from account saves.
window.__TRAFFIC_TEST_HARNESS__=game=>requestAnimationFrame(()=>{
 game.reset('korat');game.state.money=2000000;
 const home=game.buildBuilding('home_large',160,148-game.CATALOG.home_large.plotHeight,true);
 const office=game.buildBuilding('office_small',174,148-game.CATALOG.office_small.plotHeight,true);
 const shop=game.buildBuilding('shop_small',184,148-game.CATALOG.shop_small.plotHeight,true);
 for(const [building,count] of [[home,10],[office,6],[shop,4]]){
  if(!building)throw Error('Parking demo placement failed');
  for(let i=0;i<count;i++){const c=game.newCitizen(home);c.resident=true;c.locationId=building.id;c.location=game.CATALOG[building.key].kind;c.state='จอดอยู่';home.residents.add(c.id);building.parked.add(c.id);}
 }
 game.syncParkingSlots();const saved=JSON.parse(game.snapshot());saved.cam={x:174,y:145,z:1.7,angle:.4};game.loadGame(true,null,JSON.stringify(saved));
 console.log('Parking demo: home 10 / 30, office 6 / 18, shop 4 / 15');
});
