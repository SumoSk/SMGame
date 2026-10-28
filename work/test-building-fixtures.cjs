// Traffic/render fixtures predate construction progression and intentionally start
// with enough earned allowances to assemble their subject city directly.
// Progression tests call reset() afterwards and exercise real zero-quota cities.
module.exports=function grantBuildingFixtureQuotas(game){
 game.state.buildingQuota=Object.fromEntries(Object.values(game.CATALOG)
  .filter(t=>!t.starterTier).map(t=>[t.key,1000]));
};
