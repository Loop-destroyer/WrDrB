import json
import os

manifest_path = 'g:/Project/WrDrB/public/apparel/manifest.json'
mock_data_path = 'g:/Project/WrDrB/src/data/mockData.js'

with open(manifest_path, 'r', encoding='utf-8') as f:
    items = json.load(f)

for item in items:
    item.update({
        'size': 'M',
        'brand': 'WrDrB',
        'archetype': 'Streetwear',
        'description': f"A {item['name']} from the new collection.",
        'pairsWith': '',
        'clashesWith': '',
        'conditionDetails': 'Freshly processed via YOLO11-seg.',
        'wornCount': 0,
        'favorite': False,
        'shiny': False
    })

new_sample_items_code = 'export const SAMPLE_ITEMS = ' + json.dumps(items, indent=2) + ';'

with open(mock_data_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start and end of SAMPLE_ITEMS
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.startswith('export const SAMPLE_ITEMS = ['):
        start_idx = i
    if start_idx != -1 and line.startswith('];') and end_idx == -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx] + [new_sample_items_code + '\n'] + lines[end_idx+1:]
    with open(mock_data_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully updated SAMPLE_ITEMS in mockData.js")
else:
    print(f"Error: Could not find SAMPLE_ITEMS block in {mock_data_path}")
