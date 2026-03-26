import os
import sys
import json
import asyncio
from pathlib import Path
from wardrobe_processor import WardrobeProcessor

# Define Paths manually to ensure consistency
ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = ROOT / 'WrDrB Data'
OUTPUT_DIR = ROOT / 'public' / 'apparel'

async def main():
    if len(sys.argv) < 3:
        print("Usage: python process_single.py <image_path> <index>")
        sys.exit(1)
    
    img_path = Path(sys.argv[1])
    i = int(sys.argv[2])
    
    processor = WardrobeProcessor()
    
    try:
        # Run the full pipeline for one item
        metadata = await processor.process_item(img_path, OUTPUT_DIR)
        
        # Structure the final item data
        item_id = f'item_{i+1:03d}'
        out_name = f'item_{i+1:03d}.png'
        out_clipped = f'item_{i+1:03d}_clipped.png'
        
        # Rename output assets to final names
        # stylized
        temp_asset_path = ROOT / metadata["asset_path"]
        final_path = OUTPUT_DIR / out_name
        if final_path.exists(): final_path.unlink()
        temp_asset_path.rename(final_path)
        
        # clipped
        temp_clipped_path = ROOT / metadata["clipped_path"]
        final_clipped_path = OUTPUT_DIR / out_clipped
        if final_clipped_path.exists(): final_clipped_path.unlink()
        temp_clipped_path.rename(final_clipped_path)
        
        # Final simplified metadata for the manifest
        # We also add some UI logic fields
        final_data = {
            'id': item_id,
            'name': metadata.get('type', 'Apparel'),
            'category': metadata.get('category', 'Topwear'),
            'subtype': metadata.get('type', 'Item'),
            'color': metadata.get('color_palette', ['#808080'])[0],
            'tags': [
                f"#{metadata.get('category', 'Topwear').lower()}", 
                f"#{metadata.get('pattern', 'solid').lower()}"
            ],
            'image': f'/apparel/{out_name}',
            'emoji': '👕', # Simplified for now, will map later
            'features': metadata.get('features', ''),
            'brand': metadata.get('brand', 'Unknown'),
            'material': metadata.get('material', 'Unknown'),
            'vibe': metadata.get('vibe', 'Neutral'),
            'pairing_notes': metadata.get('pairing_notes', ''),
            'rarity': metadata.get('rarity_score', 50),
            'stylePoints': metadata.get('rarity_score', 70) + (i % 20),
        }
        
        # Print a marker so the parent process can extract the JSON
        print("---METADATA_START---")
        print(json.dumps(final_data))
        print("---METADATA_END---")
        print(f"Success: {img_path.name}")
        
    except Exception as e:
        print(f"Error processing {img_path.name}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
