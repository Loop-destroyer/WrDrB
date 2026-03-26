import os
import shutil
import random

# Use absolute paths or relative to script
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(ROOT, "clothing-dataset-small", "train")
TARGET_DIR = os.path.join(ROOT, "WrDrB Data")

# 6 images per category for a better sample
CATEGORIES = [
    "dress", "hat", "longsleeve", "outwear", "pants", 
    "shirt", "shoes", "shorts", "skirt", "t-shirt"
]

def prepare_dataset():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
    
    # Clean TARGET_DIR
    print(f"Cleaning {TARGET_DIR}...")
    for f in os.listdir(TARGET_DIR):
        file_path = os.path.join(TARGET_DIR, f)
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"  Error deleting {file_path}: {e}")
    
    print(f"Selecting 6 images from each category in {SOURCE_DIR}...")
    
    total_copied = 0
    for category in CATEGORIES:
        cat_path = os.path.join(SOURCE_DIR, category)
        if not os.path.exists(cat_path):
            print(f"  Warning: Category {category} not found at {cat_path}")
            continue
            
        files = [f for f in os.listdir(cat_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if len(files) < 6:
            selected = files
        else:
            # Pick first 6 for deterministic results
            selected = files[:6]
            
        print(f"  Copying {len(selected)} images for {category}")
        for filename in selected:
            src_file = os.path.join(cat_path, filename)
            dst_file = os.path.join(TARGET_DIR, f"{category}_{filename}")
            shutil.copy2(src_file, dst_file)
            total_copied += 1

    print(f"Dataset preparation complete. Total images: {total_copied}")

if __name__ == "__main__":
    prepare_dataset()
