import json, math
from pathlib import Path
p=json.loads((Path(__file__).resolve().parents[1]/'data/foods.json').read_text())
foods=p['foods']; fields=p['nutrientDefinitions']
assert len(foods)==1888
assert len({f['id'] for f in foods})==len(foods)
for f in foods:
 assert f['source'] in p['sources']
 assert f['basis']['qty']>0
 for v in [f['nutrients']]+([f['portion']['nutrients']] if 'portion' in f else []):
  assert len(v)==len(fields)
  assert all(x is None or x=='Tr' or isinstance(x,(int,float)) and math.isfinite(x) and x>=0 for x in v)
assert next(f for f in foods if f['name']=='Chutney unspecified')['nutrients'][0] is None
assert next(f for f in foods if f['name']=='Grainease chapati')['nutrients'][1] is None
print('PASS: 1,888 unique sourced foods; all units/vectors valid; unknown nutrients retained.')
