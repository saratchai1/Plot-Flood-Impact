import math
import urllib.request
import io
import json
import os
from PIL import Image

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def lat_to_my(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def fetch_and_stitch(bounds, zoom=18):
    west, south, east, north = bounds
    x1, y2 = deg2num(south, west, zoom)
    x2, y1 = deg2num(north, east, zoom)
    if x1 > x2: x1, x2 = x2, x1
    if y1 > y2: y1, y2 = y2, y1

    width = (x2 - x1 + 1) * 256
    height = (y2 - y1 + 1) * 256
    mosaic = Image.new('RGB', (width, height))

    for x in range(x1, x2 + 1):
        for y in range(y1, y2 + 1):
            url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{y}/{x}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req) as resp:
                    tile = Image.open(io.BytesIO(resp.read()))
                    mosaic.paste(tile, ((x - x1) * 256, (y - y1) * 256))
            except Exception as e:
                print(f"Tile {zoom}/{y}/{x} failed: {e}")

    top_lat, left_lon = num2deg(x1, y1, zoom)
    bot_lat, right_lon = num2deg(x2 + 1, y2 + 1, zoom)

    px_left = int((west - left_lon) / (right_lon - left_lon) * width)
    px_right = int((east - left_lon) / (right_lon - left_lon) * width)
    my_top = lat_to_my(top_lat)
    my_bot = lat_to_my(bot_lat)
    my_north = lat_to_my(north)
    my_south = lat_to_my(south)
    px_top = int((my_top - my_north) / (my_top - my_bot) * height)
    px_bot = int((my_top - my_south) / (my_top - my_bot) * height)

    px_left = max(0, min(width - 1, px_left))
    px_right = max(px_left + 1, min(width, px_right))
    px_top = max(0, min(height - 1, px_top))
    px_bot = max(px_top + 1, min(height, px_bot))

    return mosaic.crop((px_left, px_top, px_right, px_bot))

def main():
    with open("drone_bounds.json") as f:
        db = json.load(f)

    os.makedirs("public/satellite-previews", exist_ok=True)
    os.makedirs("data/satellite/previews", exist_ok=True)

    for code, bounds in db.items():
        print(f"Generating ESRI basemap for {code}...")
        try:
            img = fetch_and_stitch(bounds, zoom=18)
            # Save to both data/satellite/previews and public/satellite-previews
            for d in ["public/satellite-previews", "data/satellite/previews"]:
                out_dir = os.path.join(d, code)
                os.makedirs(out_dir, exist_ok=True)
                out_path = os.path.join(out_dir, "basemap_esri.webp")
                img.save(out_path, "WEBP", quality=85)
            print(f"  OK: {code} ({img.size[0]}x{img.size[1]})")
        except Exception as e:
            print(f"  FAILED: {code} -> {e}")

if __name__ == "__main__":
    main()
