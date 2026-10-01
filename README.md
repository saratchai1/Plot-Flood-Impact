# Plot Flood Impact

Rayong flood-impact review workspace for comparing mangrove planting plots against every available post-flood satellite acquisition and the existing drone orthomosaic baseline.

## Event scope

- Province: Rayong / ระยอง
- Flood-event start: **2026-09-27 00:00 UTC**
- Plot portfolio: **19 PDD plots**
- Plot geometry source: `EVR_PDD_Boundaries_ALL_136plots_2026-09-21.kmz`
- Boundary source date: 2026-09-21
- Satellite search: every STAC item intersecting the exact plot geometry after the event start
- **No cloud-cover filter is applied**

## Satellite sources

The Worker queries Element 84 Earth Search v1:

- `sentinel-1` — Sentinel-1 GRD SAR
- `sentinel-2-l2a` — Sentinel-2 L2A
- `landsat-c2-l2` — Landsat Collection 2 Level-2

Cloud cover is retained as metadata only. It is never used to reject a Sentinel-2 or Landsat scene.

The UI renders the selected Cloud Optimized GeoTIFF in the browser with `geotiff.js`:

- Sentinel-1: VV/VH SAR visualization
- Sentinel-2: visual COG or RGB bands
- Landsat: visual COG or RGB bands when the provider permits direct browser reads

If a provider COG cannot be rendered in-browser, the scene remains in the timeline and the UI falls back to provider quicklook/raw asset links. A rendering failure does **not** remove the acquisition from the event record.

## Drone baseline

Drone imagery is reused from the existing Mangrove Area Classifier:

`https://mangrove-area-classifier.saratchai.workers.dev/`

The new Worker reads its API server-side and proxies browser-ready orthomosaic previews. It does not copy drone binaries into GitHub and does not add a new write path to the old D1/R2 sources.

## Rayong plots

The PDD registry contains:

`13-STC`,
`14(1)-STC`,
`14-STC`,
`14-VSD`,
`15-STC`,
`15-VSD`,
`16-STC`,
`16-VSD`,
`17-STC`,
`17-VSD`,
`18(1)-STC`,
`18-STC`,
`19-STC`,
`20-STC`,
`21-STC`,
`22(1)-STC`,
`22-STC`,
`23(1)-STC`,
`23-STC`.

Subplots are preserved as independent plot identities.

## Architecture

```text
PDD Rayong plot geometry
        |
        +----------------------------+
        |                            |
        v                            v
Element 84 Earth Search       Mangrove Area Classifier
Sentinel-1 / S2 / Landsat     drone orthomosaic API
        |                            |
        v                            v
Cloudflare Worker API / proxy
        |
        v
React + MapLibre
- 19-plot map
- post-flood acquisition timeline
- sensor filters (display only)
- drone vs satellite comparison
- browser COG renderer
```

## API

```text
GET /api/health
GET /api/plots
GET /api/plots/:plotCode
GET /api/drone/:plotCode
GET /api/drone-image?key=<source-key>&width=2048
GET /api/satellite/:plotCode
GET /api/satellite/:plotCode?from=<ISO>&to=<ISO>
```

`/api/satellite/:plotCode` searches the exact PDD geometry and reports:

- acquisition time
- sensor/collection
- cloud cover when available
- Sentinel-1 orbit state / polarizations
- footprint/bbox
- browser-renderable COG assets
- provider quicklook/raw assets

## Local development

```bash
npm install
npm run worker:dev
```

In another terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` to the Worker on port 8787.

## Build

```bash
npm run build
```

## Deploy

The repository contains a Cloudflare Workers static-assets configuration in `wrangler.toml`:

```bash
npm run deploy
```

No satellite or drone credential is required for the current public-read sources.

## Current analytical boundary

This first implementation is an **evidence comparison workspace**, not yet a hydraulic damage model.

It does not label a plot damaged merely because water is visible. A later analysis layer should calculate flood-water anomaly against normal tidal inundation, persistence/duration, and tide/rain context before assigning an impact classification.
