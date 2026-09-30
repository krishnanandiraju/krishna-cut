(function(root){
  'use strict';
  const normalise=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function matches(food,query){const text=normalise([food.name,food.aliases,food.category,food.preparation].join(' '));return normalise(query).split(/\s+/).filter(Boolean).every(t=>text.includes(t))}
  function scale(food,quantity,unit){
    if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Enter a quantity greater than zero.');
    const portion=unit==='portion';
    if(portion&&!food.portion)throw new Error('This food has no source portion.');
    if(!portion&&unit!==food.basis.unit)throw new Error('Use the food’s stated unit.');
    const factor=portion?quantity:quantity/food.basis.qty;
    return (portion?food.portion.nutrients:food.nutrients).map(v=>typeof v==='number'?v*factor:v);
  }
  function totals(entries){let calories=0,protein=0,unknownCalories=0,unknownProtein=0;for(const e of entries){if(Number.isFinite(e.calories))calories+=e.calories;else unknownCalories++;if(Number.isFinite(e.protein))protein+=e.protein;else unknownProtein++}return {calories,protein,unknownCalories,unknownProtein}}
  function dayKey(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
  const api={normalise,matches,scale,totals,dayKey};root.KrishnaCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
