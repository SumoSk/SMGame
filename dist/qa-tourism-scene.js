// Disposable local demo city; never reads or writes any player's saves.
window.__TRAFFIC_TEST_HARNESS__=game=>requestAnimationFrame(()=>{
 game.reset('korat');game.state.money=2000000;game.state.time=720;
 const build=(key,x)=>game.buildBuilding(key,x,148-game.CATALOG[key].plotHeight,true);
 const home=build('home_large',160);build('restaurant_small',190);build('mall_small',210);build('hotel_medium',245);build('pub_small',265);
 for(const[a,b]of [[[270,150],[270,180]],[[270,180],[150,180]]])game.buildRoad(game.lineCells(game.id(...a),game.id(...b)),'small',true);
 for(let i=0;i<20;i++){
  const c=game.newCitizen(home);c.resident=true;c.profile.trait=3;c.happy=85;c.locationId=home.id;c.location='home';c.state='อยู่บ้าน';home.residents.add(c.id);home.parked.add(c.id);
 }
 game.syncParkingSlots();
 for(let i=0;i<30&&game.touristPeople().length<8;i++)game.admitTourist();
 let n=0;for(const c of game.touristPeople()){
  const v=game.state.vehicles.get(c.vehicleId);game.touristEnter(c,v);game.arrive(v,true);
  if(n++===0){c.wantsHotel=true;if(game.touristHotel(c))game.arrive(game.state.vehicles.get(c.vehicleId),true);}
 }
 const saved=JSON.parse(game.snapshot());saved.cam={x:220,y:145,z:1.7,angle:.4};game.loadGame(true,null,JSON.stringify(saved));
 console.log('Tourism demo: 20 residents, '+game.touristPeople().length+' tourists, hotel and blue vans');
});
