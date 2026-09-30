"""Build the static catalogue from the original INDB/CoFID workbooks and saved foods.
Usage: python3 scripts/build_foods.py /path/to/food-source-downloads
Dependencies: openpyxl. Source URLs and SHA-256 hashes are recorded in sources.json.
"""
import csv, hashlib, json, math, re, sys
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
INPUT = Path(sys.argv[1])
DEFS = [
 ('energy_kcal','Energy','kcal'), ('protein_g','Protein','g'), ('carb_g','Carbohydrate','g'), ('fat_g','Fat','g'), ('fibre_g','Fibre','g'),
 ('freesugar_g','Free sugars','g'), ('sugars_g','Total sugars','g'), ('sfa_mg','Saturated fat','mg'), ('mufa_mg','Monounsaturated fat','mg'), ('pufa_mg','Polyunsaturated fat','mg'),
 ('cholesterol_mg','Cholesterol','mg'), ('calcium_mg','Calcium','mg'), ('phosphorus_mg','Phosphorus','mg'), ('magnesium_mg','Magnesium','mg'), ('sodium_mg','Sodium','mg'), ('potassium_mg','Potassium','mg'),
 ('iron_mg','Iron','mg'), ('copper_mg','Copper','mg'), ('selenium_ug','Selenium','µg'), ('chromium_mg','Chromium','mg'), ('manganese_mg','Manganese','mg'), ('molybdenum_mg','Molybdenum','mg'), ('zinc_mg','Zinc','mg'),
 ('vita_ug','Vitamin A (source definition)','µg'), ('vite_mg','Vitamin E','mg'), ('vitd2_ug','Vitamin D2','µg'), ('vitd3_ug','Vitamin D3','µg'), ('vitk1_ug','Vitamin K1','µg'), ('vitk2_ug','Vitamin K2','µg'),
 ('folate_ug','Folate','µg'), ('vitb1_mg','Thiamin (B1)','mg'), ('vitb2_mg','Riboflavin (B2)','mg'), ('vitb3_mg','Niacin (B3)','mg'), ('vitb5_mg','Pantothenate (B5)','mg'), ('vitb6_mg','Vitamin B6','mg'), ('vitb7_ug','Biotin (B7)','µg'), ('vitb9_ug','Vitamin B9 (source field)','µg'), ('vitc_mg','Vitamin C','mg'), ('carotenoids_ug','Carotenoids','µg'), ('vitb12_ug','Vitamin B12','µg'), ('vitd_ug','Vitamin D (total)','µg'), ('iodine_ug','Iodine','µg')
]
ALIASES = [
 ('poha|rice flakes|chiwda|aval|atukulu','poha atukulu aval flattened rice'), ('proso|varigalu','proso millet varigalu'),
 ('finger millet|ragi','ragi finger millet'), ('pearl millet|bajra','bajra sajjalu pearl millet'), ('foxtail|korra','korralu foxtail millet'), ('sorghum|jowar','jowar jonna jonnapindi sorghum'),
 ('aubergine|brinjal|eggplant','brinjal baingan vankaya eggplant aubergine'), ('okra|bhindi','okra bhindi bendakaya'),
 ('spinach|palak','spinach palak palakura'), ('amaranth','amaranth thotakura'), ('coriander','coriander dhania kothimeera'),
 ('bottle gourd|lauki','bottle gourd lauki sorakaya'), ('bitter gourd|karela','bitter gourd karela kakarakaya'), ('ridge gourd|turai','ridge gourd turai beerakaya'),
 ('capsicum|sweet pepper','capsicum bell pepper shimla mirch'), ('potato|aloo','potato aloo bangaladumpa'),
 ('tomato|tamatar','tomato tamatar'), ('cucumber|kheera','cucumber kheera'), ('carrot|gajar','carrot gajar'),
 ('pomegranate','pomegranate anar dalimma'), ('papaya','papaya boppayi'), ('banana|kele','banana aratipandu kele'), ('apple','apple seb'),
 ('lentil|masoor','lentil masoor'), ('chickpea|chana|bengal gram','chickpea chana bengal gram'), ('pigeon pea|toor|arhar','toor arhar kandi pappu pigeon pea'),
 ('mung|moong|green gram','mung moong pesalu green gram'), ('black gram|urad','urad minumulu black gram'),
 ('horse gram|ulava','horse gram ulavalu ulavacharu'), ('kidney bean|rajma','rajma kidney bean'),
 ('peanut|groundnut|moongfali','peanut groundnut palli verusenaga moongfali'), ('sesame|til','sesame til nuvvulu'),
 ('curd|yogurt|yoghurt|dahi','curd yogurt yoghurt dahi perugu'), ('buttermilk|chaas|lassi','buttermilk chaas majjiga lassi'),
 ('cottage cheese|paneer','paneer cottage cheese'), ('semolina|suji|rava','semolina suji rava'), ('rice|chawal','rice chawal biyyam'),
 ('chapati|chapathi|roti','chapati chapathi roti'), ('idli|idly','idli idly'), ('dosai|dosa','dosa dosai'), ('sambar|sambhar','sambar sambhar'), ('biryani|biriyani','biryani biriyani')
]
def aliases(name): return ' '.join(v for p,v in ALIASES if re.search(r'\b(?:'+p+r')(?:s|es)?\b',name,re.I))
def val(x):
 if x is None or str(x).strip() in ('','NA','N','NaN','nan'): return None
 if str(x).strip().lower()=='tr': return 'Tr'
 try:
  n=float(x)
  return round(n,5) if math.isfinite(n) and n>=0 else None
 except (TypeError,ValueError): return None
def vec(d): return [val(d.get(k)) for k,_,_ in DEFS]
def prep(n):
 if re.search(r'\b(raw|dry|dried|uncooked)\b',n,re.I): return 'Raw / dry'
 if re.search(r'\b(cooked|boiled|baked|fried|steamed|grilled)\b',n,re.I): return 'Cooked'
 return 'As described'
foods=[]
s=openpyxl.load_workbook(INPUT/'Anuvaad_INDB_2024.11.xlsx',read_only=True,data_only=True).active
records=list(s.values); header=records[0]
for r in records[1:]:
 d=dict(zip(header,r)); n=str(d['food_name']).strip(); nutrients=vec(d)
 f=dict(id='indb-'+d['food_code'],name=n,aliases=aliases(n),category='INDB recipes',preparation='Prepared recipe',source='indb',code=d['food_code'],basis={'qty':100,'unit':'g'},nutrients=nutrients,evidence='Calculated recipe',note='Recipe estimates; oil, ingredients and water content vary. Source portions are recipe-specific, not standard household measures.')
 if d.get('servings_unit') and val(d.get('unit_serving_energy_kcal')) is not None:
  f['portion']={'name':str(d['servings_unit']),'nutrients':vec({k:d.get('unit_serving_'+k) for k,_,_ in DEFS})}
 foods.append(f)

# Keep reference ingredient groups; omit the UK meat/fish/egg groups and mixed meal groups.
w=openpyxl.load_workbook(INPUT/'CoFID_2021.xlsx',read_only=True,data_only=True)
maps=[('1.3 Proximates',{'PROT':'protein_g','FAT':'fat_g','CHO':'carb_g','KCALS':'energy_kcal','AOACFIB':'fibre_g','TOTSUG':'sugars_g','SATFOD':'sfa_mg','MONOFOD':'mufa_mg','POLYFOD':'pufa_mg','CHOL':'cholesterol_mg'}),('1.4 Inorganics',{'NA':'sodium_mg','K':'potassium_mg','CA':'calcium_mg','MG':'magnesium_mg','P':'phosphorus_mg','FE':'iron_mg','CU':'copper_mg','ZN':'zinc_mg','MN':'manganese_mg','SE':'selenium_ug','I':'iodine_ug'}),('1.5 Vitamins',{'RETEQU':'vita_ug','VITD':'vitd_ug','VITE':'vite_mg','VITK1':'vitk1_ug','THIA':'vitb1_mg','RIBO':'vitb2_mg','NIAC':'vitb3_mg','VITB6':'vitb6_mg','VITB12':'vitb12_ug','FOLT':'folate_ug','PANTO':'vitb5_mg','BIOT':'vitb7_ug','VITC':'vitc_mg'})]
cofid={}; selected={}
for sheet,mapping in maps:
 rr=list(w[sheet].values); cols=rr[1]
 for row in rr[3:]:
  code,name,desc,group=row[:4]
  if not code: continue
  group=str(group); name=str(name)
  eligible=(group.startswith(('D','F','G','H','BA','BN')) and group!='DR') or group in ('AA','AC','AI','OC','OA','BC')
  if not eligible or re.search(r'\b(beef|chicken|fish|cod|liver|lard|dripping|egg|eggs|bacon|human|meat|pork|ham|prawn|salmon|tuna)\b',name,re.I): continue
  selected[code]=(name,desc,group,row[6])
  d=cofid.setdefault(code,{})
  for i,c in enumerate(cols):
   if c in mapping:
    x=val(row[i]); key=mapping[c]
    # CoFID fatty acids are g/100g food; INDB uses mg/100g food.
    d[key]=round(x*1000,5) if c in ('SATFOD','MONOFOD','POLYFOD') and isinstance(x,(int,float)) else x
for code,d in cofid.items():
 name,desc,group,foot=selected[code]
 if d.get('energy_kcal') is None: continue
 cat='Vegetables & pulses' if group.startswith('D') else 'Fruit' if group.startswith('F') else 'Nuts & seeds' if group.startswith('G') else 'Oils & spices' if group.startswith(('H','O')) else 'Dairy & alternatives' if group.startswith('B') else 'Grains & cereals'
 foods.append(dict(id='cofid-'+code,name=name,aliases=aliases(name),category=cat,preparation=prep(name),source='cofid',code=code,basis={'qty':100,'unit':'g'},nutrients=vec(d),evidence='Reference composition',note='UK reference food; choose the matching preparation and edible-weight basis. '+str(foot or '')))

text=(INPUT/'personal-foods.txt').read_text(); part=text.split('TAB NAME: Food database>')[1]
for row in list(csv.reader(part.strip().splitlines()))[1:]:
 if len(row)<12 or not row[0].isdigit() or int(row[0])<4: continue
 _,name,qty,unit,kcal,protein,evidence,*rest=row
 note=row[11]; nutrients={'energy_kcal':val(kcal),'protein_g':val(protein)}
 if name=='Indiraa ulavacharu': nutrients.update(carb_g=40,fat_g=3,sodium_mg=1340)
 foods.append(dict(id='saved-'+row[0],name=name,aliases=aliases(name),category='Saved foods',preparation=prep(name),source='saved',code=row[0],basis={'qty':float(qty),'unit':unit},nutrients=vec(nutrients),evidence=evidence,note=note,url=note if note.startswith('https://') else None))

extra=[('Jabsons unsalted roasted peanuts',40,'g',227,10.2),('Vietnamese coffee beans candy',100,'g',447,1.8),('Flax, groundnut & sesame chikki',15.6,'g',85,3),('Fit.Diet mixed sprouts',120,'g',265,15.1),('Cucumber',175,'g',26,1.2)]
for i,(name,qty,unit,kcal,protein) in enumerate(extra):
 foods.append(dict(id='previous-'+str(i),name=name,aliases=aliases(name),category='Saved foods',preparation='As described',source='saved',code='app-'+str(i),basis={'qty':qty,'unit':unit},nutrients=vec({'energy_kcal':kcal,'protein_g':protein}),evidence='Earlier app estimate',note='Recovered from the previous app. Check the packet or recipe before reusing. A library entry does not mean this food was eaten.'))

sources={
 'indb':{'name':'Indian Nutrient Databank (INDB)','version':'November 2024 download','url':'https://www.anuvaad.org.in/indian-nutrient-databank/','download':'https://www.anuvaad.org.in/wp-content/uploads/2020/07/Anuvaad_INDB_2024.11.xlsx','citation':'Vijayakumar A, Dubasi HB, Awasthi A, Jaacks LM. Development of an Indian Food Composition Database. Current Developments in Nutrition (2024), 103790. doi:10.1016/j.cdnut.2024.103790','licence':'Publicly downloadable research dataset. No separate data licence is stated on the download. Authors and source retained.','file':'Anuvaad_INDB_2024.11.xlsx'},
 'cofid':{'name':'CoFID ingredient reference (UK)','version':'2021','url':'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid','download':'https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx','citation':'Public Health England. McCance and Widdowson’s Composition of Foods Integrated Dataset (2021). Contains public sector information licensed under the Open Government Licence v3.0.','licence':'Open Government Licence v3.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/','file':'CoFID_2021.xlsx'},
 'saved':{'name':'Krishna’s saved foods','version':'Recovered September 2026','url':None,'citation':'43 entries from the saved food workbook and 5 entries from the earlier app. Evidence and unknown values are preserved.','licence':'Personal labels, prior lookups and estimates; not independently re-verified.'}
}
for k,v in sources.items():
 v['count']=sum(f['source']==k for f in foods)
 if 'file' in v: v['sha256']=hashlib.sha256((INPUT/v['file']).read_bytes()).hexdigest()
payload={'version':'2026-09-30.1','nutrientDefinitions':DEFS,'sources':sources,'foods':foods}
assert len({f['id'] for f in foods})==len(foods)
assert sources['indb']['count']==1014
assert sources['saved']['count']==48
for f in foods:
 assert f['basis']['qty']>0
 assert len(f['nutrients'])==len(DEFS)
 assert all(x is None or x=='Tr' or isinstance(x,(int,float)) and math.isfinite(x) and x>=0 for x in f['nutrients'])
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/foods.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
(ROOT/'data/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
print(json.dumps({'total':len(foods),'sources':{k:v['count'] for k,v in sources.items()},'nutrient_fields':len(DEFS),'bytes':(ROOT/'data/foods.json').stat().st_size}))
