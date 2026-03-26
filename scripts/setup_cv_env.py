#!/usr/bin/env python3
"""
setup_cv_env.py — WrDrB CV Environment Setup
=============================================
Installs all Python deps for the deep-learning CV pipeline and
pre-downloads model weights so the first inference run is instant.

Run once:
    python scripts/setup_cv_env.py
"""

import subprocess, sys, os
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent / 'models'
MODELS_DIR.mkdir(exist_ok=True)


# ── 1. Core deps ─────────────────────────────────────────────────────────────
PACKAGES = [
    # PyTorch CPU (rembg dependency)
    'torch', 'torchvision',
    # Intelligent Wardrobe Processing
    'rembg',
    'google-genai',
    'python-dotenv',
    # Vectorization & Rendering
    'vtracer',
    'svglib',
    'reportlab',
    # Image processing & Math
    'Pillow', 'numpy', 'scipy', 'opencv-python-headless',
    # Misc
    'tqdm', 'requests',
]

def pip_install(pkg):
    print(f'  → pip install {pkg}')
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet', pkg])

def install_deps():
    print('\n📦 Installing Python dependencies…')
    for pkg in PACKAGES:
        try:
            pip_install(pkg)
        except subprocess.CalledProcessError as e:
            print(f'  ⚠️  Failed to install {pkg}: {e}')

# ── 2. Pre-download model weights ────────────────────────────────────────────
def download_models():
    print('\n🤖 Pre-downloading model weights (first-time, may take a few minutes)…')

    # Rembg - birefnet-general
    print('  → rembg birefnet-general (auto-download on first use)')
    try:
        from rembg import new_session
        new_session("birefnet-general")
        print('     ✅ birefnet-general ready')
    except Exception as e:
        print(f'     ⚠️  birefnet-general download issue: {e}')

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    install_deps()
    download_models()
    print('\n✅ CV environment ready! Run: python scripts/process_dataset.py')
