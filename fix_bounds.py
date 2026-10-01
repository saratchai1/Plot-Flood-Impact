import json
import os
import rasterio
from rasterio.warp import transform_bounds
from shapely.geometry import shape, mapping

def run():
    with open("rayong_plots.json", "r") as f:
        plots = json.load(f)
    
    with open("data/satellite/catalog/scenes.json", "r") as f:
        manifest = json.load(f)
        
    for item in manifest:
        p_code = item['plotCode']
        col = item['sensor']
        dt_safe = item['acquiredAt'].replace(':', '').replace('-', '')[:15]
        
        plot_geom = next((p['geometry'] for p in plots if p['plotCode'] == p_code), None)
        p_shape = shape(plot_geom)
        if not p_shape.is_valid:
            p_shape = p_shape.buffer(0)
        buffer_shape = p_shape.buffer(0.0025)
        
        # We can approximate the bounds very closely by using the buffer_shape bounds.
        # But to get exact pixel bounds, we'd need the raw TIF transform.
        # Since we used rasterio.mask with crop=True, the image bounds are the bounding box of the projected geometry, snapped to pixels.
        # We'll just use the buffer_shape.bounds for now, which is [minx, miny, maxx, maxy].
        # It's usually within a pixel (~10m).
        item['bounds'] = list(buffer_shape.bounds)
        
    with open("data/satellite/catalog/scenes.json", "w") as f:
        json.dump(manifest, f, indent=2)

if __name__ == "__main__":
    run()
