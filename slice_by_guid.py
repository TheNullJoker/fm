
import os
import json
from PIL import Image

JSON_DIR = "temp_hold/Sprite"
ATLAS_DIR = "public/icons/game"
OUTPUT_DIR = "public/icons/single"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# GUID -> Atlas Filename
GUID_MAP = {
    "3c9190c4fc4be5a42a8d0a75e09af576": "Icons.png",             # Keys, Tickets
    "313dbef3c2360f44ebf439d9aea4460b": "SkillIcons.png",
    "8bf523dd9d318b4498f71eaf95325c6e": "Pets.png",
    "d313f50b59a9a7a45bdbe8dde2bd9b36": "MountIcons.png",
    "3580e08bf93c38b4b8c916ab5e42d0b6": "LeagueIcons.png",
    "e8a789fd5fd6fd14d9f9751c5375dc3b": "AgeIcons.png",
    "615c511daa587884096d16784404bc99": "TechTreeIcons.png",
    "b0f28726ffaa4944f81255060368d6a9": "Eggs.png",
    "2f61441e251b74c8d831cd44c86f8180": "InventoryTextures.png", # Props assumed here
}

# Special Inversions
INVERT_MAPPING = {
    "LeagueIcons": 6
}

def process_file(json_path):
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
            
        m_name = data.get("m_Name", "")
        if not m_name: return

        # Get GUID
        tex = data.get("m_AtlasRD", {}).get("m_Texture", {})
        guid = tex.get("m_Collection")

        atlas_file = GUID_MAP.get(guid)
        
        # Fallback: exact match name
        if not atlas_file:
            # Try finding file with same name as base of JSON
            # e.g. GemPack_0.json -> GemPack_0.png
            if os.path.exists(os.path.join(ATLAS_DIR, m_name + ".png")):
                atlas_file = m_name + ".png"
            # Or base name: GemPack_0 -> GemPack.png ? (Unlikely if GemPack_0.png exists)

        if not atlas_file:
            return

        atlas_path = os.path.join(ATLAS_DIR, atlas_file)
        if not os.path.exists(atlas_path):
            return

        img = Image.open(atlas_path)
        img_h = img.height
        
        rect = data.get("m_Rect")
        if not rect: return
        
        x = rect["m_X"]
        y = rect["m_Y"]
        w = rect["m_Width"]
        h = rect["m_Height"]
        
        top_y = img_h - (y + h)
        
        box = (int(x), int(top_y), int(x + w), int(top_y + h))
        crop = img.crop(box)
        
        output_name = m_name + ".png"
        
        # Invert logic for Leagues
        if "LeagueIcons" in m_name:
             try:
                idx = int(m_name.split("_")[-1])
                limit = INVERT_MAPPING["LeagueIcons"]
                new_idx = (limit - 1) - idx
                output_name = f"LeagueIcons_{new_idx}.png"
             except:
                pass
                
        crop.save(os.path.join(OUTPUT_DIR, output_name))
        # print(f"Extracted {output_name} from {atlas_file}")

    except Exception as e:
        print(f"Error {json_path}: {e}")

files = [f for f in os.listdir(JSON_DIR) if f.endswith(".json")]
print(f"Processing {len(files)} files...")
for f in files:
    process_file(os.path.join(JSON_DIR, f))
print("Done.")
