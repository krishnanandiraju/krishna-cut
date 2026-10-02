'use strict';
const {matches,scale,totals,dayKey}=KrishnaCore;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>typeof v==='number'?v.toLocaleString('en-IN',{maximumFractionDigits:d}):v==='Tr'?'Trace':'—';
const number=v=>v===''?null:Number(v);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{toast('Could not save: browser storage is unavailable or full. Export a backup before clearing anything.');return false}}
function toast(message){$('#toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').textContent='',6000)}
let snapshots=read('krishna_daily_snapshots',{}),weights=read('krishna_weight_log',[{date:'2026-09-12',kg:98.7},{date:'2026-09-19',kg:97.3},{date:'2026-09-24',kg:95.5}]);
let custom=read('krishna_foods_v2',[]),targets=read('krishna_targets',{calories:1650,protein:120});
let catalogue=null,recipeDetails=null,foods=[],view='today',selectedDay=dayKey(),historyMonth=dayKey().slice(0,7),libraryDate=dayKey(),page=0,chosen=null;
const PAGE_SIZE=30;
const recoveredRows=[['Breakfast','Atukulu kobbari unda','31 g (1 piece)',130,2],['Breakfast','Homemade chegodi','7 pieces',175,2.8],['Breakfast','Banana','1 medium',105,1.3],['Snack','Cucumber','175 g',26,1.2],['Snack','Pomegranate seeds','60 g',50,1],['Snack','Beetroot','60 g',26,1],['Snack','Jabsons unsalted roasted peanuts','40 g',227,10.2],['Lunch','India Foods ulavacharu','250 g',648,45],['Lunch','Varigalu / proso millet (raw)','80 g raw',302,8.8]];
const recoveredEntries=recoveredRows.map(([meal,name,qty,calories,protein])=>({meal,name,qty,calories,protein,note:'Recovered earlier estimate; review against your portion/label.'}));
// Never replace an existing log simply because the page rendered. Keep a backup before migration.
function migrate(){
 if(read('krishna_catalogue_migration',false))return;
 const next=structuredClone(snapshots);let changed=false;
 if(!next['2026-09-29']){next['2026-09-29']={date:'2026-09-29',entries:recoveredEntries,note:'Recovered Sep 29 entries. Uneaten candy and planned dinner are excluded; original estimates retained.'};changed=true}
 for(const [date,s] of Object.entries(next)){
  if(!Array.isArray(s.entries))continue;
  const isOldSeed=s.entries.length===11&&recoveredRows.every(r=>s.entries.some(e=>e.name===r[1]&&e.calories===r[3]))&&s.entries.some(e=>e.name==='Vietnamese coffee beans candy'&&e.calories===447)&&s.entries.some(e=>e.name==='Grainease whole-wheat chapati'&&e.calories===208);
  if(date==='2026-09-29'){
   const before=s.entries.length;s.entries=s.entries.filter(e=>!(e.name==='Vietnamese coffee beans candy'&&e.calories===447));
   if(isOldSeed)s.entries=s.entries.filter(e=>e.name!=='Grainease whole-wheat chapati');
   if(s.entries.length!==before){s.note='Corrected recovered log: candy was not eaten; the old planned dinner is excluded.';changed=true}
  }else if(isOldSeed){s.needsReview=true;s.note='The old app copied the Sep 29 sample log onto this date. These entries are retained for review and excluded from totals until you confirm.';changed=true}
  Object.assign(s,totals(s.entries));
 }
 if(changed){if(!write('krishna_history_before_catalogue',snapshots)||!write('krishna_daily_snapshots',next))return;snapshots=next;}
 write('krishna_catalogue_migration',true);
}
function entries(date){return snapshots[date]?.entries||[]}
function saveDay(date,list,extra={}){const next={...snapshots,[date]:{...snapshots[date],date,entries:list,...totals(list),...extra}};if(!write('krishna_daily_snapshots',next))return false;snapshots=next;renderToday();if(view==='history')renderHistory();return true}
function mealHTML(date){
 const list=entries(date);if(!list.length)return '<div class="empty">No food logged for this date yet.<br>Choose a food and the amount you ate.</div>';
 return ['Breakfast','Lunch','Dinner','Snack'].map(meal=>{const rows=list.map((e,i)=>({...e,i})).filter(e=>e.meal===meal);if(!rows.length)return '';const t=totals(rows);return `<div class="meal"><div class="meal-title"><span>${meal}</span><span>${fmt(t.calories,0)}${t.unknownCalories?' + unknown':''} kcal</span></div>${rows.map(e=>`<div class="food"><div class="name"><b>${escapeHTML(e.name)}</b><small>${escapeHTML(e.qty)} · ${fmt(e.protein)} g protein${e.note?' · '+escapeHTML(e.note):''}</small></div><strong>${fmt(e.calories,0)}</strong><button class="remove" data-remove="${e.i}" data-date="${date}" aria-label="Remove ${escapeHTML(e.name)}">×</button></div>`).join('')}</div>`}).join('');
}
function renderToday(){
 const date=dayKey(),list=entries(date),t=totals(list),review=snapshots[date]?.needsReview;
 $('#date-heading').textContent=new Date(date+'T12:00:00+05:30').toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 $('#calories').textContent=review?'—':fmt(t.calories,0);$('#protein').textContent=review?'—':fmt(t.protein);$('#calorie-target').textContent=fmt(targets.calories,0);$('#protein-target').textContent=fmt(targets.protein,0);
 $('#calorie-meter').style.width=review?'0%':Math.min(100,t.calories/targets.calories*100)+'%';$('#protein-meter').style.width=review?'0%':Math.min(100,t.protein/targets.protein*100)+'%';
 $('#energy-note').textContent=review?'Imported entries need review':t.unknownCalories?`${t.unknownCalories} food(s) have unknown calories`:t.calories<=targets.calories?`${fmt(targets.calories-t.calories,0)} kcal to your saved target`:`${fmt(t.calories-targets.calories,0)} kcal above your saved target`;
 $('#protein-note').textContent=review?'Imported entries need review':t.unknownProtein?`${t.unknownProtein} food(s) have unknown protein`:'Known protein from your logged foods';
 const ordered=weights.slice().sort((a,b)=>a.date.localeCompare(b.date)),latest=ordered.at(-1);$('#weight').textContent=latest?fmt(latest.kg):'—';$('#weight-note').textContent=latest?`Last recorded ${latest.date} · ${ordered.length} readings`:'No readings yet';
 $('#today-log').innerHTML=mealHTML(date);$('#today-note').innerHTML=snapshots[date]?.note?`<div class="notice">${escapeHTML(snapshots[date].note)}${review?'<br><button class="link-button" id="review-today">Review this date</button>':''}</div>`:'';
 $('#review-today')?.addEventListener('click',()=>showView('history'));
}
function showView(name){
 if(name==='foods'&&view!=='foods')libraryDate=view==='history'?selectedDay:dayKey();
 view=name;$$('.view').forEach(el=>el.hidden=el.id!=='view-'+name);$$('.nav').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-current',b.dataset.view===name?'page':'false')});
 $('#page-title').textContent={today:'Your daily picture',foods:'Food library',history:'Food log',progress:'Weight & progress',settings:'Settings & backups'}[name];
 if(name==='foods')renderFoods();if(name==='history'){selectedDay=dayKey();historyMonth=selectedDay.slice(0,7);renderHistory()}if(name==='progress')renderProgress();if(name==='settings')renderSettings();window.scrollTo({top:0,behavior:'instant'});
}
async function loadCatalogue(){
 $('#library-status').textContent='Loading food library…';$('#library-retry').hidden=true;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch('./data/foods.json?v=2026-09-30.1',{signal:controller.signal});if(!response.ok)throw new Error(`Download failed (${response.status}).`);
  const data=await response.json();if(!Array.isArray(data.foods)||data.foods.length<1000)throw new Error('Food file is incomplete.');catalogue=data;
  try{const recipes=await fetch('./data/recipes.json?v=2026-10-02.1',{signal:controller.signal});if(!recipes.ok)throw new Error('Recipe file unavailable');recipeDetails=await recipes.json()}catch{recipeDetails=null}
  const oldCustom=read('krishna_custom_foods',[]).filter(Array.isArray).map((f,i)=>({id:'legacy-custom-'+i,name:f[0],category:'Your custom foods',preparation:'As described',source:'custom',evidence:'Earlier custom food',basis:{qty:1,unit:'serving'},nutrients:data.nutrientDefinitions.map((_,j)=>j===0?f[1]:j===1?f[2]:null),note:f[3]+'; values recovered from earlier app.'}));
  foods=[...custom,...oldCustom,...data.foods];$('#library-status').textContent=`${fmt(data.foods.length,0)} foods ready to search`;$('#library-count').textContent=fmt(data.foods.length,0);$('#library-subtitle').textContent='Indian recipes, everyday ingredients and your saved foods.';
  $('#library-summary').innerHTML=Object.entries(data.sources).map(([key,s])=>`<span><b>${fmt(s.count,0)}</b> ${key==='indb'?'Indian recipe records':key==='cofid'?'reference ingredients':'saved foods'}</span>`).join('');
  const categories=[...new Set(foods.map(f=>f.category))].sort();$('#category-filter').innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${escapeHTML(c)}</option>`).join('');renderFoods();
 }catch(e){$('#library-status').textContent='Food library could not load. Your saved logs are still available.';$('#library-count').textContent='—';$('#library-subtitle').textContent='Library download paused. Open Foods to retry.';$('#library-retry').hidden=false;$('#food-results').innerHTML='<div class="notice">Please retry the library download. It stops after 15 seconds if the connection does not respond.</div>'}
 finally{clearTimeout(timer)}
}
function renderFoods(){
 if(!catalogue)return;
 const q=$('#food-search').value,cat=$('#category-filter').value,prep=$('#prep-filter').value;
 const filtered=foods.filter(f=>(!cat||f.category===cat)&&(!prep||f.preparation===prep)&&matches(f,q));
 page=Math.max(0,Math.min(page,Math.ceil(filtered.length/PAGE_SIZE)-1));const chunk=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 $('#result-count').textContent=`${fmt(filtered.length,0)} matching foods${custom.length?` · ${custom.length} custom`:''}`;
 $('#food-results').innerHTML=chunk.length?chunk.map(f=>`<button class="food-card" data-food-id="${escapeHTML(f.id)}"><div><span class="badge ${f.source==='saved'?'saved':''}">${escapeHTML(f.category)}</span><span class="badge">${escapeHTML(f.preparation)}</span></div><h3>${escapeHTML(f.name)}</h3><small>${escapeHTML(f.evidence)} · per ${fmt(f.basis.qty)} ${escapeHTML(f.basis.unit)}</small><div class="card-bottom"><b>${fmt(f.nutrients[0],0)} kcal</b><span>${fmt(f.nutrients[1])} g protein &nbsp; ›</span></div></button>`).join(''):'<div class="empty">No matching food. Try a shorter name or define your own food.</div>';
 $('#page-label').textContent=filtered.length?`${page+1} / ${Math.ceil(filtered.length/PAGE_SIZE)}`:'0 results';$('#previous-page').disabled=page===0;$('#next-page').disabled=(page+1)*PAGE_SIZE>=filtered.length;
}
function openFood(id){
 chosen=foods.find(f=>f.id===id);if(!chosen)return;const f=chosen,source=catalogue.sources[f.source];
 $('#food-title').textContent=f.name;$('#food-evidence').textContent=f.evidence+' · '+f.preparation;
 $('#portion-quantity').value=f.basis.qty;$('#portion-unit').innerHTML=`<option value="${escapeHTML(f.basis.unit)}">${escapeHTML(f.basis.unit)}</option>${f.portion?`<option value="portion">INDB portion: ${escapeHTML(f.portion.name)}</option>`:''}`;
 $('#entry-date').value=libraryDate;$('#entry-meal').value='Snack';$('#portion-error').textContent='';
 renderRecipe(f);
 $('#food-source').innerHTML=`${escapeHTML(f.note||'')}<br>${source?escapeHTML(source.name)+' · '+escapeHTML(f.code||''):''}${source?.url?` · <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">Source</a>`:''}${/^https:\/\//.test(f.url||'')?` · <a href="${escapeHTML(f.url)}" target="_blank" rel="noopener">Saved reference</a>`:''}`;
 updatePortion();$('#food-dialog').showModal();
}
function renderRecipe(f){
 const target=$('#recipe-details'),recipe=recipeDetails?.[f.code];
 let basis=f.source==='indb'?'100 g of the prepared dish, including retained water and cooking fat. It is not 100 g of a dry main ingredient.':f.source==='cofid'?'100 g of the named food in its stated preparation; this is a single-food reference.':'The stated reference amount for this saved or custom food. Verify it against its packet or your recipe.';
 if(f.source==='indb'&&recipe){
  const [count,unit]=recipe.servings||[];
  target.innerHTML='<h3>Recipe & measurement basis</h3><p class="muted">'+escapeHTML(basis)+'</p><p class="source-note">Ingredient amounts are for the <b>whole source recipe</b>'+(count?' ('+escapeHTML(count)+' '+escapeHTML(unit||'servings')+')':'')+', not per 100 g. Your oil, water, ingredients and finished weight may differ.</p><ul class="ingredient-list">'+recipe.ingredients.map(([name,qty,u])=>'<li><span>'+escapeHTML(name)+'</span><b>'+escapeHTML(qty)+(u?' '+escapeHTML(u):' (unit unspecified)')+'</b></li>').join('')+'</ul>'+(f.portion?'<p class="source-note">Source portion: 1 '+escapeHTML(f.portion.name)+' = '+fmt(f.portion.nutrients[0],0)+' kcal. Weigh your finished dish for a closer estimate.</p>':'');
 }else{
  target.innerHTML='<h3>Recipe & measurement basis</h3><p class="muted">'+escapeHTML(basis)+'</p><p class="source-note">'+(f.source==='indb'?'The source ingredient list could not load. Retry the page before relying on this recipe.':f.source==='cofid'?'No combined recipe or added cooking oil is included in this ingredient value.':'A raw-material breakdown was not supplied. Check its packet or define your own recipe before treating it as a cooked-dish estimate.')+'</p>';
 }
}
function updatePortion(){
 if(!chosen)return;try{const n=scale(chosen,Number($('#portion-quantity').value),$('#portion-unit').value);$('#portion-error').textContent='';$('#log-food').disabled=false;
  $('#portion-totals').innerHTML=`<b>${fmt(n[0],0)} kcal</b> &nbsp; · &nbsp; ${fmt(n[1])} g protein &nbsp; · &nbsp; ${fmt(n[2])} g carbs &nbsp; · &nbsp; ${fmt(n[3])} g fat`;
  $('#nutrient-rows').innerHTML=catalogue.nutrientDefinitions.map(([key,label,unit],i)=>`<tr><td>${escapeHTML(label)}</td><td>${fmt(n[i],3)} ${n[i]===null?'':escapeHTML(unit)}</td></tr>`).join('');
 }catch(e){$('#portion-error').textContent=e.message;$('#log-food').disabled=true}
}
function logFood(){
 try{const date=$('#entry-date').value,meal=$('#entry-meal').value,q=Number($('#portion-quantity').value),unit=$('#portion-unit').value;if(!date)throw new Error('Choose a date.');const n=scale(chosen,q,unit);
  const entry={id:crypto.randomUUID(),foodId:chosen.id,meal,name:chosen.name,qty:`${fmt(q)} ${unit==='portion'?chosen.portion.name+' (INDB portion)':unit}`,calories:typeof n[0]==='number'?n[0]:null,protein:typeof n[1]==='number'?n[1]:null,nutrients:n,source:chosen.source};
  if(!saveDay(date,[...entries(date),entry]))return;$('#food-dialog').close();toast(`Added ${chosen.name} to ${meal.toLowerCase()} · ${date}`);
 }catch(e){$('#portion-error').textContent=e.message}
}
function renderHistory(){
 $('#history-date').value=selectedDay;const [y,m]=historyMonth.split('-').map(Number);$('#history-month').textContent=new Date(y,m-1,15).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
 const first=new Date(y,m-1,1).getDay(),count=new Date(y,m,0).getDate();let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<span class="weekday">${d}</span>`).join('')+'<span></span>'.repeat(first);
 for(let day=1;day<=count;day++){const d=`${historyMonth}-${String(day).padStart(2,'0')}`,s=snapshots[d],t=totals(s?.entries||[]);html+=`<button class="day ${s?'logged':''} ${d===selectedDay?'selected':''}" data-day="${d}">${day}${s?`<small>${s.needsReview?'Review':fmt(t.calories,0)+' kcal'}</small>`:''}</button>`}$('#history-calendar').innerHTML=html;
 const s=snapshots[selectedDay],t=totals(entries(selectedDay));$('#history-title').textContent=selectedDay;$('#history-total').textContent=s?.needsReview?'Entries need review':`${fmt(t.calories,0)} kcal${t.unknownCalories?' + unknown':''} · ${fmt(t.protein)} g protein${t.unknownProtein?' + unknown':''}`;$('#history-entries').innerHTML=mealHTML(selectedDay);
 $('#history-note').innerHTML=s?.note?`<div class="notice">${escapeHTML(s.note)}${s.needsReview?'<br><button class="secondary" id="confirm-date">Confirm these foods belong to this date</button>':''}</div>`:'';
 $('#confirm-date')?.addEventListener('click',()=>saveDay(selectedDay,entries(selectedDay),{needsReview:false,note:'Date confirmed by you.'}));
}
function changeMonth(delta){const [y,m]=historyMonth.split('-').map(Number),d=new Date(y,m-1+delta,1);historyMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');renderHistory()}
function renderProgress(){
 const ordered=weights.slice().sort((a,b)=>a.date.localeCompare(b.date));$('#weight-date').value=dayKey();$('#weight-rows').innerHTML=ordered.map(w=>`<tr><td>${escapeHTML(w.date)}</td><td>${fmt(w.kg)} kg</td></tr>`).join('');
 if(!ordered.length){$('#weight-chart').innerHTML='<p class="empty">No weigh-ins yet.</p>';return}
 const min=Math.min(...ordered.map(w=>w.kg))-.5,max=Math.max(...ordered.map(w=>w.kg))+.5,first=Date.parse(ordered[0].date),last=Date.parse(ordered.at(-1).date),x=w=>40+(Date.parse(w.date)-first)/Math.max(86400000,last-first)*540,y=w=>150-(w.kg-min)/(max-min)*115;
 $('#weight-chart').innerHTML=`<svg class="weight-chart" viewBox="0 0 640 190" role="img" aria-label="Recorded weight over time"><polyline points="${ordered.map(w=>x(w)+','+y(w)).join(' ')}"/>${ordered.map(w=>`<circle cx="${x(w)}" cy="${y(w)}" r="4"><title>${escapeHTML(w.date)}: ${w.kg} kg</title></circle>`).join('')}<text x="12" y="20">${fmt(max)} kg</text><text x="12" y="170">${fmt(min)} kg</text><text x="40" y="185">${ordered[0].date}</text><text x="500" y="185">${ordered.at(-1).date}</text></svg>`;
 const valid=Object.values(snapshots).filter(s=>!s.needsReview&&s.entries?.length),values=valid.map(s=>totals(s.entries));$('#progress-note').textContent=valid.length?`${valid.length} logged day(s) · average known calories ${fmt(values.reduce((a,t)=>a+t.calories,0)/valid.length,0)} kcal. Partial days and missing nutrients affect this average.`:'Add meals to see intake history.';
}
function renderSettings(){
 $('#target-calories').value=targets.calories;$('#target-protein').value=targets.protein;
 $('#sburl').value=localStorage.getItem('krishna_sb_url')||'';
 $('#sbkey').value=localStorage.getItem('krishna_sb_key')||'';
 $('#sb-status').textContent=localStorage.getItem('krishna_sb_url')&&localStorage.getItem('krishna_sb_key')?'Connection details found in this browser. Food logs are still local; cloud sync was never implemented.':'No connection details found in this browser. Food logs are stored locally.';
 $('#local-status').textContent=Object.keys(snapshots).length+' dates in this browser · '+weights.length+' weight readings · '+custom.length+' custom foods. Earlier history backup: '+(Object.keys(read('krishna_history_before_catalogue',{})).length?'present':'absent')+'.';
}
function supabaseDetails(){const u=$('#sburl').value.trim().replace(/\/$/,'');const k=$('#sbkey').value.trim();return {u,k,valid:u.startsWith('https://')&&u.endsWith('.supabase.co')&&!u.includes(' ')&&!!k}}
async function testSupabase(){
 const {u,k,valid}=supabaseDetails();
 if(!valid){$('#sb-status').textContent='Enter a valid Supabase project URL and anon/publishable key.';return}
 $('#sb-status').textContent='Testing project response…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(u+'/auth/v1/health',{headers:{apikey:k},signal:controller.signal});
 $('#sb-status').textContent=response.ok?'Supabase project responds. This tests reachability only; your meals are not synced.':'Project replied HTTP '+response.status+'. Check the URL, key and project status. No food logs were changed.';
 }catch(e){$('#sb-status').textContent='Connection failed: '+(e.name==='AbortError'?'timed out':'network or browser access error')+'. No food logs were changed.'}finally{clearTimeout(timer)}
}
function saveSupabaseSettings(e){
 e.preventDefault();const {u,k,valid}=supabaseDetails();if(!valid){$('#sb-status').textContent='Enter a valid project URL and anon/publishable key.';return}
 try{localStorage.setItem('krishna_sb_url',u);localStorage.setItem('krishna_sb_key',k);$('#sb-status').textContent='Connection details saved in this browser. Cloud sync is not active.'}catch{$('#sb-status').textContent='Browser storage could not save connection details.'}
}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportBackup(){download('Krishna-Cut-backup-'+dayKey()+'.json',{version:2,exportedAt:new Date().toISOString(),snapshots,weights,custom,legacyCustom:read('krishna_custom_foods',[]),targets,previousHistory:read('krishna_history_before_catalogue',{})});toast('Backup downloaded.')}
async function importBackup(file){
 if(!file)return;try{const b=JSON.parse(await file.text());if(b.version!==2||!b.snapshots||!Array.isArray(b.weights)||!Array.isArray(b.custom))throw new Error('Choose a Krishna Cut version 2 backup.');
  for(const [d,s] of Object.entries(b.snapshots)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Array.isArray(s.entries)||s.entries.some(e=>typeof e.name!=='string'||!['Breakfast','Lunch','Dinner','Snack'].includes(e.meal)||e.calories!==null&&(!Number.isFinite(e.calories)||e.calories<0)||e.protein!==null&&(!Number.isFinite(e.protein)||e.protein<0)))throw new Error('The backup contains invalid food entries.')}
  if(b.weights.some(w=>typeof w.date!=='string'||!Number.isFinite(w.kg)||w.kg<=0))throw new Error('Invalid weights in backup.');
  if(b.custom.some(f=>typeof f.id!=='string'||typeof f.name!=='string'||!Array.isArray(f.nutrients)||!f.basis||!Number.isFinite(f.basis.qty)||f.basis.qty<=0))throw new Error('Invalid custom foods in backup.');
  const merged={...b.snapshots,...snapshots};for(const [d,s]of Object.entries(b.snapshots)){if(!snapshots[d])continue;const seen=new Set(entries(d).map(e=>JSON.stringify([e.foodId,e.name,e.qty,e.meal,e.calories,e.protein])));merged[d]={...snapshots[d],entries:[...entries(d),...s.entries.filter(e=>!seen.has(JSON.stringify([e.foodId,e.name,e.qty,e.meal,e.calories,e.protein])))]}}
  const mergedWeights=[...new Map([...b.weights,...weights].map(w=>[w.date,w])).values()],mergedCustom=[...new Map([...b.custom,...custom].map(f=>[f.id,f])).values()];
  if(!write('krishna_backup_before_import',{snapshots,weights,custom}))return;
  if(!write('krishna_daily_snapshots',merged)||!write('krishna_weight_log',mergedWeights)||!write('krishna_foods_v2',mergedCustom))return;
  snapshots=merged;weights=mergedWeights;custom=mergedCustom;
  if(b.targets&&Number.isFinite(b.targets.calories)&&b.targets.calories>0&&Number.isFinite(b.targets.protein)&&b.targets.protein>0&&write('krishna_targets',b.targets)){targets=b.targets;renderSettings();}
  if(Array.isArray(b.legacyCustom)){const old=read('krishna_custom_foods',[]),all=[...old];for(const f of b.legacyCustom)if(Array.isArray(f)&&!all.some(x=>JSON.stringify(x)===JSON.stringify(f)))all.push(f);write('krishna_custom_foods',all)}
  renderToday();await loadCatalogue();toast('Backup merged. Existing dates, readings and custom foods were preserved.');
 }catch(e){toast(e.message)}finally{$('#import-backup').value=''}
}
function newFood(){if(!catalogue){toast('Load the food library first.');return}$('#custom-form').reset();$('#custom-error').textContent='';$('#custom-dialog').showModal()}
function saveCustom(event){event.preventDefault();
 const name=$('#custom-name').value.trim(),qty=Number($('#custom-qty').value),unit=$('#custom-unit').value,kcal=number($('#custom-kcal').value),protein=number($('#custom-protein').value);
 if(!name||!Number.isFinite(qty)||qty<=0||kcal===null||kcal<0||protein!==null&&protein<0){$('#custom-error').textContent='Enter a name, a positive reference amount, and calories. Leave unknown protein blank.';return}
 const f={id:'custom-'+crypto.randomUUID(),name,category:'Your custom foods',preparation:'As described',source:'custom',evidence:'Your label / estimate',basis:{qty,unit},nutrients:catalogue.nutrientDefinitions.map((_,i)=>i===0?kcal:i===1?protein:null),note:$('#custom-note').value.trim()||'Entered by you.'};
 if(!write('krishna_foods_v2',[...custom,f]))return;custom.push(f);foods.unshift(f);if(![...$('#category-filter').options].some(o=>o.value==='Your custom foods'))$('#category-filter').add(new Option('Your custom foods'));$('#custom-dialog').close();renderFoods();openFood(f.id);
}
function showSources(){
 if(!catalogue)return;$('#sources-body').innerHTML=Object.values(catalogue.sources).map(s=>`<h3>${escapeHTML(s.name)} · ${s.count} foods</h3><p>${escapeHTML(s.citation)}</p><p class="source-note">${escapeHTML(s.licence)}</p>${s.url?`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">Original source</a>`:''}`).join('')+'<p class="source-note">Reference values vary by recipe and preparation. INDB values are per 100 g or its own recipe portion. CoFID ingredients are per 100 g of the food described. Missing and “N” values stay unknown; “Tr” means trace. Free sugar and total sugar are separate fields. Folate and B9 are retained as separate source fields and must not be added together. The full IFCT ingredient tables and a bulk packaged-food database are not included.</p>';
 $('#sources-dialog').showModal();
}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(nav)showView(nav.dataset.view);const card=e.target.closest('[data-food-id]');if(card)openFood(card.dataset.foodId);const close=e.target.closest('[data-close]');if(close)close.closest('dialog').close();const del=e.target.closest('[data-remove]');if(del){const list=entries(del.dataset.date).filter((_,i)=>i!==Number(del.dataset.remove));if(saveDay(del.dataset.date,list))toast('Food removed.')}const day=e.target.closest('[data-day]');if(day){selectedDay=day.dataset.day;renderHistory()}});
$('#food-search').addEventListener('input',()=>{page=0;renderFoods()});for(const id of ['category-filter','prep-filter'])$('#'+id).addEventListener('change',()=>{page=0;renderFoods()});
$('#previous-page').onclick=()=>{page--;renderFoods()};$('#next-page').onclick=()=>{page++;renderFoods();$('#food-search').scrollIntoView({block:'start'})};
$('#library-retry').onclick=loadCatalogue;$('#open-sources').onclick=showSources;$('#define-food').onclick=newFood;$('#custom-form').onsubmit=saveCustom;
$('#portion-quantity').oninput=updatePortion;$('#portion-unit').onchange=()=>{$('#portion-quantity').value=$('#portion-unit').value==='portion'?1:chosen.basis.qty;updatePortion()};$('#log-food').onclick=logFood;
$('#prev-month').onclick=()=>changeMonth(-1);$('#next-month').onclick=()=>changeMonth(1);$('#history-date').onchange=e=>{if(e.target.value){selectedDay=e.target.value;historyMonth=selectedDay.slice(0,7);renderHistory()}};
$('#weight-form').onsubmit=e=>{e.preventDefault();const date=$('#weight-date').value,kg=Number($('#weight-value').value);if(!date||!Number.isFinite(kg)||kg<=0)return;const next=[...weights.filter(w=>w.date!==date),{date,kg}];if(!write('krishna_weight_log',next))return;weights=next;renderProgress();renderToday();$('#weight-value').value='';toast('Weight saved.')};
$('#targets-form').onsubmit=e=>{e.preventDefault();const next={calories:Number($('#target-calories').value),protein:Number($('#target-protein').value)};if(!Number.isFinite(next.calories)||next.calories<=0||!Number.isFinite(next.protein)||next.protein<=0)return;if(write('krishna_targets',next)){targets=next;renderToday();toast('Targets saved.')}};
$('#sb-form').onsubmit=saveSupabaseSettings;$('#sb-test').onclick=testSupabase;$('#export-backup').onclick=exportBackup;$('#import-backup').onchange=e=>importBackup(e.target.files[0]);$('#download-library').onclick=()=>{if(catalogue)download('Krishna-Cut-food-library.json',catalogue)};
migrate();renderToday();loadCatalogue();
setInterval(()=>{if(dayKey()!==$('#today-date-marker').value){$('#today-date-marker').value=dayKey();renderToday()}},30000);$('#today-date-marker').value=dayKey();
