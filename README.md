# Krishna Cut

Personal food and weight tracker, hosted at https://krishnanandiraju.github.io/krishna-cut/.

Static HTML/CSS/JavaScript; no build step or credentials are required to search the food catalogue. Serve the repository with any static HTTP server for development.

## Food catalogue (30 September 2026)

- 1,014 recipe records from the Indian Nutrient Databank (INDB).
- 826 selected reference ingredients from CoFID 2021 (UK); preparation and food names are retained.
- 48 personal saved foods: 43 from the earlier food workbook plus five earlier app records. Their packet, lookup, estimate or unknown status is visible.
- 42 nutrient fields; coverage differs by source. Missing values remain null; trace is retained as `Tr`. Source recipe portions and measured gram amounts use separate nutrient vectors.
- Search aliases include Indian names such as atukulu, varigalu, bhindi and palak. Search does not certify a recipe as vegetarian.

The nutrient data is in `data/foods.json`. `data/recipes.json` contains ingredient amounts and serving counts for all 1,014 INDB recipes, keyed by the original food code. It is derived from the researchers’ [recipes.xlsx and recipes_servingsize.xlsx](https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-) source files. Ingredient amounts refer to a whole source recipe; nutrient values per 100 g refer to the prepared dish, and source portions are separate. Some ingredient quantities have unspecified units in the source and are marked that way in the UI. CoFID items are single foods, while personal saved foods may lack recipe details. The app does not fabricate ingredient quantities for those.\n\nThe food data is in `data/foods.json`. Every food has a source and original code, reference quantity/unit and evidence note. Nutrient vector positions are defined by `nutrientDefinitions`. Original download URLs, source citations, licences and SHA-256 hashes are in `data/sources.json`. INDB is calculated recipe data, not direct laboratory analysis of the user's meal. CoFID is a UK reference, not an Indian branded-food database. The full IFCT ingredient tables and a bulk packaged-product dataset are not included.

Rebuild with Python and openpyxl: `python3 scripts/build_foods.py /path/to/source-downloads`. The directory must contain the named INDB and CoFID XLSX downloads plus `personal-foods.txt`, the saved workbook's extracted food table. Sources and selection rules are explicit in the script.

## Persistence

Food logs, weight readings, targets and custom foods are saved to browser localStorage. **Cloud/Supabase sync is not implemented.** Settings now displays the earlier `krishna_sb_url` and `krishna_sb_key` connection fields from this browser and can test project reachability. This does not read or write food entries in Supabase. The values stay in browser storage and are never committed to GitHub or included in backups. Settings offers a JSON backup and merge import; exported backups exclude connection credentials. Clearing browser data without a backup loses these records. The public repository contains reference food data and the previously published recovered seed entries, not new browser-entered meals.

Existing history keys and legacy custom foods are read. Page rendering never overwrites a date's log. A one-time migration backs up prior history before excluding the uneaten candy and planned dinner from the September 29 seed; exact copies of that seed on other dates are retained for review and excluded from totals until confirmed. Recovered entries retain their previous estimates. New dates start empty. Dates use Asia/Kolkata.

Verify every INDB code has a matching recipe detail record before publishing. The original recipe workbook quantities are recorded without silently changing unspecified units.\n\nRun the focused checks with `node tests/core.test.cjs` and `python3 scripts/check_data.py`. GitHub Pages deploys the main branch. There is no npm build or server-side database dependency.
