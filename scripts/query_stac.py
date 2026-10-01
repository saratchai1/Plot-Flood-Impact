import json
from pystac_client import Client
import shapely.geometry
from datetime import datetime
import os

def load_plots(json_path):
    with open(json_path, 'r') as f:
        return json.load(f)

def run_query():
    plots = load_plots("rayong_plots.json")
    print(f"Loaded {len(plots)} plots.")

    client = Client.open("https://earth-search.aws.element84.com/v1")
    
    start_date = "2026-09-27T00:00:00+07:00"
    end_date = "2026-10-02T00:00:00+07:00"
    time_range = f"2026-09-26T17:00:00Z/.."

    collections = ['sentinel-1-grd', 'sentinel-2-l2a', 'sentinel-2-c1-l2a', 'landsat-c2-l2']

    unique_scenes = {}
    
    s1 = 0
    s2 = 0
    ls = 0

    plot_scene_pairs = 0

    for plot in plots:
        geom = plot['geometry']
        plot_code = plot['plotCode']
        
        shape = shapely.geometry.shape(geom)
        if not shape.is_valid:
            shape = shape.buffer(0)
            geom = shapely.geometry.mapping(shape)

        search = client.search(
            collections=collections,
            intersects=geom,
            datetime=time_range
        )
        
        try:
            items = list(search.items())
        except Exception as e:
            # Fallback to bbox if exact geometry fails on STAC side
            bbox = shape.bounds
            search = client.search(
                collections=collections,
                bbox=bbox,
                datetime=time_range
            )
            items = []
            for item in search.items():
                item_geom = shapely.geometry.shape(item.geometry)
                if shape.intersects(item_geom):
                    items.append(item)
        
        for item in items:
            scene_id = item.id
            if scene_id not in unique_scenes:
                unique_scenes[scene_id] = {
                    "item": item.to_dict(),
                    "covered_plots": []
                }
                col = item.collection_id
                if col.startswith('sentinel-1'): s1 += 1
                elif col.startswith('sentinel-2'): s2 += 1
                elif col.startswith('landsat'): ls += 1

            if plot_code not in unique_scenes[scene_id]["covered_plots"]:
                unique_scenes[scene_id]["covered_plots"].append(plot_code)
                plot_scene_pairs += 1

    print(f"TOTAL_UNIQUE_SCENES={len(unique_scenes)}")
    print(f"S1_SCENES={s1}")
    print(f"S2_SCENES={s2}")
    print(f"LANDSAT_SCENES={ls}")
    print(f"PLOT_SCENE_PAIRS={plot_scene_pairs}")
    print(f"CLOUD_FILTER_USED=NO")

    with open("data/satellite/catalog/stac_dump.json", "w") as f:
        json.dump(unique_scenes, f, indent=2)

if __name__ == "__main__":
    run_query()

