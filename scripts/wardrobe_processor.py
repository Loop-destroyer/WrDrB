import os
import json
import asyncio
import base64
import io
import time
from pathlib import Path
from PIL import Image, ImageOps
from google import genai
from google.genai import types
from rembg import remove, new_session
from dotenv import load_dotenv
import cv2
import numpy as np

# Load environment variables from .env if present
load_dotenv()

class WardrobeProcessor:
    def __init__(self, gemini_api_key=None):
        self.gemini_api_key = gemini_api_key or os.getenv("GOOGLE_API_KEY")
        
        if self.gemini_api_key:
            self.client = genai.Client(api_key=self.gemini_api_key)
            self.model_name = 'gemini-3-flash-preview'
        else:
            print("Warning: GOOGLE_API_KEY not found. Tagging engine will be disabled.")
            self.client = None
            
        # Initialize rembg session with birefnet-general as requested
        # Options: "u2net", "u2netp", "u2net_human_seg", "u2net_cloth_seg", "silueta", "isnet-general-use", "birefnet-general"
        try:
            print("Initializing Segmentation Engine (birefnet-general)...")
            self.rembg_session = new_session("birefnet-general")
        except Exception as e:
            print(f"Failed to load birefnet-general, falling back to isnet-general-use: {e}")
            self.rembg_session = new_session("isnet-general-use")

    def segment(self, input_path: Path) -> Image.Image:
        """Step 1: Segmentation (The Clipper)
        Removes background, centers item, and pads by 5% in a 1024x1024 frame.
        """
        img = Image.open(input_path).convert("RGB")
        img = ImageOps.exif_transpose(img)
        
        # Remove background using rembg
        print(f" Clipping {input_path.name}...")
        output = remove(img, session=self.rembg_session)
        
        # Find bounding box of alpha channel to center and pad
        alpha = output.getchannel('A')
        bbox = alpha.getbbox()
        
        canvas_size = 1024
        if bbox:
            cropped = output.crop(bbox)
            padding_pct = 0.05
            usable_size = int(canvas_size * (1 - 2 * padding_pct))
            
            # Scale cropped image to fit usable_size while maintaining aspect ratio
            w, h = cropped.size
            ratio = min(usable_size / w, usable_size / h)
            new_size = (int(w * ratio), int(h * ratio))
            resized = cropped.resize(new_size, Image.LANCZOS)
            
            # Create final transparent 1024x1024 canvas
            final_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
            offset = ((canvas_size - new_size[0]) // 2, (canvas_size - new_size[1]) // 2)
            final_img.paste(resized, offset, mask=resized)
            return final_img
        
        # Fallback if no bbox found (shouldn't happen with rembg usually)
        return output.resize((canvas_size, canvas_size), Image.LANCZOS)

    async def extract_metadata(self, img: Image.Image) -> dict:
        """Step 2: VLM Feature Extraction (The Tagging Engine)
        Uses Gemini 3 Flash to generate structured metadata.
        """
        if not self.client:
            return {
                "category": "Unknown",
                "type": "Item",
                "brand": "Unknown",
                "material": "Unknown",
                "color_palette": ["#808080"],
                "pattern": "Solid",
                "vibe": "Neutral",
                "features": "Metadata extraction skipped (No API Key)",
                "pairing_notes": "None",
                "rarity_score": 50
            }
            
        # Convert PIL to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_bytes = img_byte_arr.getvalue()
        
        prompt = """
        Analyze this apparel image and provide a detailed metadata profile in strictly valid JSON format.
        
        JSON Schema:
        {
          "category": "String (e.g., Topwear, Bottomwear, Footwear, One-Piece, Overlayer, Accessories)",
          "type": "String (e.g., Henley, Chinos, Chelsea Boot, Hoodie)",
          "brand": "String (e.g., Nike, Levi's, or 'Unknown' if not visible)",
          "material": "String (e.g., Denim, Cotton, Leather, Mesh)",
          "color_palette": ["List of Hex codes, primary first"],
          "pattern": "String (e.g., Solid, Checked, Striped, Graphic, Camo)",
          "vibe": "String (Short atmospheric vibe, e.g., 'Retro Tokyo', 'Clean Minimalist')",
          "features": "String (Detailed description of visual traits)",
          "pairing_notes": "String (How to style this item for maximum synergy)",
          "rarity_score": "Integer (1-100 based on design complexity)"
        }
        
        Ensure the 'type' is very specific. 
        If it's not a clothing item, return an error field in the JSON.
        """
        
        print(" Extracting metadata via Gemini (New SDK)...")
        try:
            # The new SDK uses client.models.generate_content
            # contents can be a list of strings and types.Part
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=img_bytes, mime_type='image/png')
                ]
            )
            
            text = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            return data
        except Exception as e:
            print(f" Metadata extraction error: {e}")
            return {"error": str(e), "category": "Unknown"}

    async def stylize(self, img_rgba: Image.Image) -> Image.Image:
        """Step 3: Stylization (The Artification Engine)
        Applies a stable "Flat Look" using bilateral filtering and quantization.
        Replaces vtracer for 100% reliability.
        """
        print(" Applying stable Vector-Look (Flat UI style)...")
        
        try:
            # 1. Convert PIL to CV2
            img_cv = cv2.cvtColor(np.array(img_rgba), cv2.COLOR_RGBA2BGRA)
            bgr = img_cv[:, :, :3]
            alpha = img_cv[:, :, 3]
            
            # 2. Bilateral filter for smoothing while preserving edges
            # (d=9, sigmaColor=75, sigmaSpace=75)
            smoothed = cv2.bilateralFilter(bgr, 7, 60, 60)
            
            # 3. Median blur for further simplification
            smoothed = cv2.medianBlur(smoothed, 5)
            
            # 4. Quantize colors using PIL
            # Convert back to PIL
            res_img = Image.fromarray(cv2.cvtColor(smoothed, cv2.COLOR_BGR2RGB))
            # Quantize to 16 colors for "flat" look
            res_img = res_img.quantize(colors=16, method=Image.MAXCOVERAGE).convert("RGB")
            
            # 5. Restore alpha channel
            res_img.putalpha(Image.fromarray(alpha))
            
            return res_img
            
        except Exception as e:
            print(f" Stable stylize failed: {e}")
            return img_rgba


    async def process_item(self, input_path: Path, output_dir: Path) -> dict:
        """Runs the full pipeline for a single item."""
        start_time = time.time()
        
        # Step 1: Segmentation
        clipped = self.segment(input_path)
        
        # Save raw clipped version
        stem = input_path.stem
        raw_path = output_dir / f"{stem}_clipped.png"
        clipped.save(raw_path, "PNG")
        
        # Step 2: VLM Tagging
        metadata = await self.extract_metadata(clipped)
        
        # Step 3: Stylization
        final_asset = await self.stylize(clipped)
        
        # Save stylized asset
        asset_path = output_dir / f"{stem}_flat.png"
        final_asset.save(asset_path, "PNG")
        
        metadata["asset_path"] = str(asset_path.relative_to(output_dir.parent.parent))
        metadata["clipped_path"] = str(raw_path.relative_to(output_dir.parent.parent))
        metadata["processing_time"] = round(time.time() - start_time, 2)
        
        return metadata

if __name__ == "__main__":
    # Test block
    async def main():
        proc = WardrobeProcessor()
        # Add test logic if needed
    asyncio.run(main())
