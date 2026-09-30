const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8').split("document.addEventListener('click'")[0];
const core=require('../core.js');
function session(history,extra={}){const storage=new Map(Object.entries({'krishna_daily_snapshots':JSON.stringify(history),...extra}));const context=vm.createContext({KrishnaCore:core,document:{querySelector:()=>({textContent:''})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},structuredClone,Intl,Date,crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout(){}});vm.runInContext(source,context);return {storage,run:s=>vm.runInContext(s,context)}}
const base=session({});base.run('migrate()');let saved=JSON.parse(base.storage.get('krishna_daily_snapshots'));
assert.equal(saved['2026-09-29'].entries.length,9);assert(!saved[core.dayKey()]);
const seed=base.run('JSON.stringify(recoveredEntries)');const old=JSON.parse(seed);old.push({meal:'Snack',name:'Vietnamese coffee beans candy',qty:'100 g',calories:447,protein:1.8},{meal:'Dinner',name:'Grainease whole-wheat chapati',qty:'2 x 40 g',calories:208,protein:7.9});
const custom={date:'2026-09-27',entries:[{meal:'Lunch',name:'My actual meal',qty:'1 serving',calories:123,protein:null}]};
const migrated=session({'2026-09-29':{entries:old},'2026-09-30':{entries:old},'2026-09-27':custom});migrated.run('migrate()');saved=JSON.parse(migrated.storage.get('krishna_daily_snapshots'));
assert.deepEqual(saved['2026-09-27'].entries,custom.entries);assert.equal(saved['2026-09-29'].entries.length,9);assert.equal(saved['2026-09-30'].entries.length,11);assert.equal(saved['2026-09-30'].needsReview,true);
assert.equal(JSON.parse(migrated.storage.get('krishna_history_before_catalogue'))['2026-09-29'].entries.length,11);
const once=migrated.storage.get('krishna_daily_snapshots');migrated.run('migrate()');assert.equal(migrated.storage.get('krishna_daily_snapshots'),once);
const reload=session(saved,{'krishna_catalogue_migration':'true'});reload.run('migrate()');assert.deepEqual(JSON.parse(reload.storage.get('krishna_daily_snapshots')),saved);
console.log('PASS: prior history backed up, corrected seed, copied dates flagged, edits preserved, migration idempotent, reload preserves logs.');
