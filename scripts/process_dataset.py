#!/usr/bin/env python3
"""
process_dataset.py — WrDrB Intelligent Wardrobe Pipeline
========================================================
Uses rembg for segmentation and Gemini 1.5 Flash for VLM tagging.
Replaces legacy YOLO/SAM2 logic.
"""

import os
import json
import asyncio
from pathlib import Path
from wardrobe_processor import WardrobeProcessor

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).resolve().parent.parent
INPUT_DIR  = ROOT / 'WrDrB Data'
OUTPUT_DIR = ROOT / 'public' / 'apparel'
MANIFEST_PATH = OUTPUT_DIR / 'manifest.json'

EMOJI_MAP = {
    'Tops':      'topwear',
    'Topwear':   'topwear',
    'Bottoms':   'bottomwear',
    'Bottomwear': 'bottomwear',
    'Shoes':     'footwear',
    'Footwear':  'footwear',
    'Overlayer': 'overlayer',
    'One-Piece': 'one-piece',
    'Accessories':'accessories',
}

async def process_all():
    print(f'WrDrB Intelligent Wardrobe Pipeline - Processing items from {INPUT_DIR}')
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    manifest = []
    
    # Gather images
    images = sorted(list(INPUT_DIR.glob('*.jpg')) + list(INPUT_DIR.glob('*.png')))
    
    if not images:
        print(f"No images found in {INPUT_DIR}")
        return

    import subprocess
    import sys
    
    for i, img_path in enumerate(images):
        print(f'[{i+1}/{len(images)}] Launching process for {img_path.name}...')
        
        try:
            # 1. Spawn a fresh process for each image to keep memory overhead clean
            worker_script = Path(__file__).parent / "process_single.py"
            result = subprocess.run(
                [sys.executable, str(worker_script), str(img_path), str(i)],
                capture_output=True,
                text=True,
                timeout=300 # 5 minutes per image
            )
            
            output = result.stdout
            
            # 2. Extract metadata from output
            import re
            match = re.search(r'---METADATA_START---\n(.*?)\n---METADATA_END---', output, re.DOTALL)
            if match:
                item_data = json.loads(match.group(1))
                # Map EMOJI
                cat = item_data.get('category', 'Topwear')
                item_data['emoji'] = EMOJI_MAP.get(cat, '👕')
                manifest.append(item_data)
                print(f' Success: {item_data["name"]} in {item_data["category"]}')
            else:
                print(f' Failed to extract metadata from {img_path.name}')
                if result.stderr: print(f' Error: {result.stderr}')
            
        except subprocess.TimeoutExpired:
            print(f' Process timed out for {img_path.name}')
        except Exception as e:
            print(f' Unexpected error for {img_path.name}: {e}')
            continue

    # Save the manifest for the frontend
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f'\nDone! {len(manifest)} items processed. Manifest saved to {MANIFEST_PATH.name}')
    
    # ── Sync to mockData.js ───────────────────────────────────────────────────
    print(" Syncing manifest to src/data/mockData.js...")
    MOCK_DATA_PATH = ROOT / 'src' / 'data' / 'mockData.js'
    
    if MOCK_DATA_PATH.exists():
        with open(MOCK_DATA_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the start and end of SAMPLE_ITEMS array
        import re
        pattern = r'export const SAMPLE_ITEMS = \[.*?\]'
        replacement = f'export const SAMPLE_ITEMS = {json.dumps(manifest, indent=2)}'
        
        # We use DOTALL to match across lines
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        with open(MOCK_DATA_PATH, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(" Success: mockData.js updated with new sample items.")
    else:
        print(f" Warning: {MOCK_DATA_PATH} not found. Skipping sync.")

if __name__ == "__main__":
    try:
        asyncio.run(process_all())
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
