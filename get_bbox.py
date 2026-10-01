import json
from shapely.geometry import shape, box

with open("rayong_plots.json") as f:
    plots = json.load(f)

minx, miny, maxx, maxy = 180, 90, -180, -90
for p in plots:
    geom = shape(p['geometry'])
    b = geom.bounds
    minx, miny, maxx, maxy = min(minx, b[0]), min(miny, b[1]), max(maxx, b[2]), max(maxy, b[3])

print(f"BBOX: {minx},{miny},{maxx},{maxy}")
