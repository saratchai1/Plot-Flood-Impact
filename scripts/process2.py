import os
import json
import time
import requests
import rasterio
from rasterio.mask import mask
import numpy as np
from PIL import Image
from shapely.geometry import shape, mapping, box
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback
from datetime import datetime

DATA_DIR = "data/satellite"
RAW_DIR = os.path.join(DATA_DIR, "raw")
PLOTS_DIR = os.path.join(DATA_DIR, "plots")
PREVIEWS_DIR = os.path.join(DATA_DIR, "previews")
CATALOG_DIR = os.path.join(DATA_DIR, "catalog")

def get_asset_keys(collection):
    if collection == 'sentinel-1-grd':
        return ['vv', 'vh']
    elif 'sentinel-2' in collection:
        return ['blue', 'green', 'red', 'nir', 'swir16']
    elif collection == 'landsat-c2-l2':
        return ['blue', 'green', 'red', 'nir08', 'swir16']
    return []

def normalize_collection(col):
    if 'sentinel-1' in col: return 'sentinel-1'
    if 'sentinel-2' in col: return 'sentinel-2'
    if 'landsat' in col: return 'landsat'
    return col

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        return True
    
    part_path = dest_path + ".part"
    headers = {}
    if os.path.exists(part_path):
        current_size = os.path.getsize(part_path)
        headers['Range'] = f"bytes={current_size}-"
    else:
        current_size = 0
    try:
        with requests.get(url, headers=headers, stream=True, timeout=60) as r:
            if r.status_code == 416:
                os.rename(part_path, dest_path)
                return True
            r.raise_for_status()
            mode = "ab" if current_size > 0 else "wb"
            with open(part_path, mode) as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    f.write(chunk)
        os.rename(part_path, dest_path)
        return True
    except Exception as e:
        print(f"Download failed for {url}: {e}")
        return False

def normalize_array(arr):
    arr = arr.astype(np.float32)
    arr[arr == 0] = np.nan
    p2, p98 = np.nanpercentile(arr, (2, 98)) if not np.isnan(arr).all() else (0, 1)
    if p98 == p2:
        return np.zeros(arr.shape, dtype=np.uint8)
    arr = np.clip((arr - p2) / (p98 - p2), 0, 1)
    arr[np.isnan(arr)] = 0
    return (arr * 255).astype(np.uint8)

def create_preview(bands, out_path, is_sar=False):
    if not bands:
        return
    stacked = np.stack(bands, axis=-1)
    if stacked.shape[2] == 1:
        stacked = np.repeat(stacked, 3, axis=2)
    elif stacked.shape[2] == 2 and is_sar:
        vv = stacked[:,:,0]
        vh = stacked[:,:,1]
        ratio = np.zeros_like(vv, dtype=np.float32)
        valid = (vh != 0)
        ratio[valid] = vv[valid] / (vh[valid] + 1e-5)
        stacked = np.stack([vv, vh, ratio], axis=-1)
    
    out_arr = np.zeros_like(stacked, dtype=np.uint8)
    for i in range(stacked.shape[2]):
        out_arr[:,:,i] = normalize_array(stacked[:,:,i])
        
    img = Image.fromarray(out_arr)
    img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    img.save(out_path, format="WEBP", quality=85)

def create_index_preview(b1, b2, out_path):
    b1 = b1.astype(np.float32)
    b2 = b2.astype(np.float32)
    denom = (b1 + b2)
    idx = np.zeros_like(b1)
    valid = denom != 0
    idx[valid] = (b1[valid] - b2[valid]) / denom[valid]
    
    idx = np.clip(idx, -1, 1)
    idx = ((idx + 1) / 2 * 255).astype(np.uint8)
    idx[~valid] = 0
    
    img = Image.fromarray(idx)
    img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    img.save(out_path, format="WEBP", quality=85)

def download_asset_task(task_info):
    url, dest = task_info
    success = download_file(url, dest)
    return success, dest

def run():
    with open("rayong_plots.json", "r") as f:
        plots = json.load(f)
        
    with open("data/satellite/catalog/stac_dump.json", "r") as f:
        stac_dump = json.load(f)

    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)
    os.makedirs(PREVIEWS_DIR, exist_ok=True)
    os.makedirs(CATALOG_DIR, exist_ok=True)
    for col in ['sentinel-1', 'sentinel-2', 'landsat']:
        os.makedirs(os.path.join(RAW_DIR, col), exist_ok=True)

    download_tasks = []
    local_assets_map = {} # scene_id -> {k: dest}
    
    for scene_id, data in stac_dump.items():
        item = data['item']
        col_raw = item['collection']
        col = normalize_collection(col_raw)
        
        scene_dir = os.path.join(RAW_DIR, col, scene_id)
        os.makedirs(scene_dir, exist_ok=True)
        
        with open(os.path.join(scene_dir, 'metadata.json'), 'w') as f:
            json.dump(item, f, indent=2)
            
        assets = item.get('assets', {})
        keys = get_asset_keys(col_raw)
        
        local_assets_map[scene_id] = {}
        for k in keys:
            if k in assets:
                url = assets[k]['href']
                if url.startswith('s3://'):
                    url = url.replace('s3://earth-search-data/', 'https://earth-search-data.s3.us-west-2.amazonaws.com/')
                    url = url.replace('s3://sentinel-s1-rtc-indigo/', 'https://sentinel-s1-rtc-indigo.s3.us-west-2.amazonaws.com/')
                
                dest = os.path.join(scene_dir, f"{k}.tif")
                local_assets_map[scene_id][k] = dest
                download_tasks.append((url, dest))

    success_downloads = 0
    failed_downloads = 0
    
    print(f"Starting {len(download_tasks)} downloads concurrently...")
    with ThreadPoolExecutor(max_workers=32) as executor:
        futures = {executor.submit(download_asset_task, t): t for t in download_tasks}
        for future in as_completed(futures):
            success, dest = future.result()
            if success:
                success_downloads += 1
            else:
                failed_downloads += 1
    
    total_size = sum(os.path.getsize(dest) for dest in [t[1] for t in download_tasks] if os.path.exists(dest))

    plot_crops_success = 0
    plot_crops_failed = 0
    rgb_previews = 0
    sar_previews = 0
    water_previews = 0

    manifest = []
    
    # 2. Crop and Preview
    print("Starting crop and preview generation...")
    for scene_id, data in stac_dump.items():
        item = data['item']
        col_raw = item['collection']
        col = normalize_collection(col_raw)
        
        local_assets = {k: path for k, path in local_assets_map[scene_id].items() if os.path.exists(path)}
        
        dt_str = item['properties'].get('datetime', '1970-01-01T00:00:00Z')
        dt_safe = dt_str.replace(':', '').replace('-', '')[:15]
        
        for p_code in data['covered_plots']:
            plot_geom = next((p['geometry'] for p in plots if p['plotCode'] == p_code), None)
            if not plot_geom: continue
            
            p_shape = shape(plot_geom)
            if not p_shape.is_valid:
                p_shape = p_shape.buffer(0)
            
            buffer_shape = p_shape.buffer(0.0025) 
            
            out_plot_dir = os.path.join(PLOTS_DIR, p_code, dt_safe, col)
            os.makedirs(out_plot_dir, exist_ok=True)
            
            out_preview_dir = os.path.join(PREVIEWS_DIR, p_code)
            os.makedirs(out_preview_dir, exist_ok=True)
            
            try:
                cropped_data = {}
                for k, path in local_assets.items():
                    with rasterio.open(path) as src:
                        out_image, out_transform = mask(src, [mapping(buffer_shape)], crop=True)
                        cropped_data[k] = out_image[0]
                        
                prefix = f"{dt_safe}_{col}"
                
                if col == 'sentinel-1':
                    if 'vv' in cropped_data and 'vh' in cropped_data:
                        create_preview([cropped_data['vv'], cropped_data['vh']], os.path.join(out_preview_dir, f"{prefix}_sar.webp"), is_sar=True)
                        sar_previews += 1
                        
                elif col == 'sentinel-2' or col == 'landsat':
                    if 'red' in cropped_data and 'green' in cropped_data and 'blue' in cropped_data:
                        create_preview([cropped_data['red'], cropped_data['green'], cropped_data['blue']], os.path.join(out_preview_dir, f"{prefix}_rgb.webp"))
                        rgb_previews += 1
                    
                    nir_key = 'nir08' if col == 'landsat' else 'nir'
                    if nir_key in cropped_data and 'red' in cropped_data:
                        create_index_preview(cropped_data[nir_key], cropped_data['red'], os.path.join(out_preview_dir, f"{prefix}_ndvi.webp"))
                    
                    if 'green' in cropped_data and nir_key in cropped_data:
                        create_index_preview(cropped_data['green'], cropped_data[nir_key], os.path.join(out_preview_dir, f"{prefix}_water.webp")) 
                        water_previews += 1

                plot_crops_success += 1
                
                manifest.append({
                    "plotCode": p_code,
                    "sensor": col,
                    "collection": col_raw,
                    "sceneId": scene_id,
                    "acquiredAt": dt_str,
                    "sourceAssets": list(local_assets.keys()),
                    "cloudCover": item['properties'].get('eo:cloud_cover'),
                    "orbitState": item['properties'].get('sat:orbit_state'),
                    "polarizations": item['properties'].get('sar:polarizations', []),
                    "plotBoundarySource": "pdd_kmz_2026_09_21",
                    "processingVersion": "1.0",
                    "generatedAt": datetime.utcnow().isoformat() + "Z"
                })

            except Exception as e:
                plot_crops_failed += 1
                print(f"Crop failed for {scene_id} on plot {p_code}: {e}")
                
    with open(os.path.join(CATALOG_DIR, "scenes.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"RAW_DOWNLOAD_SUCCESS={success_downloads}")
    print(f"RAW_DOWNLOAD_FAILED={failed_downloads}")
    print(f"TOTAL_SIZE_GB={total_size / (1024**3):.2f}")
    print(f"PLOT_SCENE_PAIRS={len(manifest)}")
    print(f"CROPS_SUCCESS={plot_crops_success}")
    print(f"CROPS_FAILED={plot_crops_failed}")
    print(f"RGB_PREVIEWS={rgb_previews}")
    print(f"SAR_PREVIEWS={sar_previews}")
    print(f"WATER_INDEX_PREVIEWS={water_previews}")

if __name__ == "__main__":
    run()
