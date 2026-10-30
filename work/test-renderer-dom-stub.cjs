'use strict';
// Node-only browser canvas stub for renderer regression fixtures.
// This file is never imported by SMCITY and does not affect browser behavior.
global.document??={
 createElement:tag=>({
  width:512,height:512,
  getContext:()=>({
   fillRect(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
   fill(){},fillText(){},save(){},restore(){},stroke(){},
   createRadialGradient:()=>({addColorStop(){}})
  })
 })
};
