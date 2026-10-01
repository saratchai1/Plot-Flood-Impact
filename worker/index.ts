import { Hono } from "hono";
import type { Geometry } from "geojson";
import { getPddBoundary, listPddBoundaries } from "./pddBoundaries";
import satelliteManifest from "../data/satellite/catalog/scenes.json";

type StacLink = {
  rel?: string;
  href?: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type StacAsset = {
  href?: string;
  type?: string;
  title?: string;
  roles?: string[];
};

type StacItem = {
  id?: string;
  collection?: string;
  bbox?: number[];
  geometry?: Geometry;
  properties?: Record<string, unknown>;
  assets?: Record<string, StacAsset>;
  links?: StacLink[];
};

type StacFeatureCollection = {
  features?: StacItem[];
  links?: StacLink[];
  context?: {
    matched?: number;
    returned?: number;
  };
  numberMatched?: number;
  numberReturned?: number;
};

export const app = new Hono();

const FLOOD_EVENT_START = "2026-09-27T00:00:00Z";
const EARTH_SEARCH = "https://earth-search.aws.element84.com/v1/search";
const EARTH_SEARCH_HOST = "earth-search.aws.element84.com";
const DRONE_SOURCE_ORIGIN = "https://mangrove-area-classifier.saratchai.workers.dev";
const COLLECTIONS = ["sentinel-1", "sentinel-2-l2a", "landsat-c2-l2"] as const;
const SATELLITE_ASSET_KEYS = [
  "thumbnail",
  "preview",
  "rendered_preview",
  "overview",
  "visual",
  "red",
  "green",
  "blue",
  "vv",
  "vh"
] as const;

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function safeDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function geometryBounds(geometry: Geometry): [number, number, number, number] | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      west = Math.min(west, value[0]);
      south = Math.min(south, value[1]);
      east = Math.max(east, value[0]);
      north = Math.max(north, value[1]);
      return;
    }
    for (const child of value) visit(child);
  };

  const record = geometry as unknown as {
    coordinates?: unknown;
    geometries?: Geometry[];
  };
  if (record.coordinates) visit(record.coordinates);
  for (const child of record.geometries || []) {
    const childBounds = geometryBounds(child);
    if (!childBounds) continue;
    west = Math.min(west, childBounds[0]);
    south = Math.min(south, childBounds[1]);
    east = Math.max(east, childBounds[2]);
    north = Math.max(north, childBounds[3]);
  }

  return [west, south, east, north].every(Number.isFinite) && west <= east && south <= north
    ? [west, south, east, north]
    : null;
}

function centroidFromBounds(bounds: [number, number, number, number] | null) {
  if (!bounds) return null;
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2] as [number, number];
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sensorLabel(collection: string) {
  if (collection === "sentinel-1") return "Sentinel-1 SAR";
  if (collection === "sentinel-2-l2a") return "Sentinel-2 L2A";
  if (collection === "landsat-c2-l2") return "Landsat C2 L2";
  return collection;
}

function sanitizeAssets(assets: Record<string, StacAsset> | undefined) {
  const output: Record<string, StacAsset> = {};
  if (!assets) return output;

  for (const key of SATELLITE_ASSET_KEYS) {
    const asset = assets[key];
    if (!asset?.href || !/^https:\/\//i.test(asset.href)) continue;
    output[key] = {
      href: asset.href,
      type: asset.type || null || undefined,
      title: asset.title || null || undefined,
      roles: Array.isArray(asset.roles) ? asset.roles : undefined
    };
  }
  return output;
}

function sceneFromItem(item: StacItem) {
  const properties = item.properties || {};
  const collection = String(item.collection || "unknown");
  const datetime = String(
    properties.datetime ||
      properties.start_datetime ||
      properties.created ||
      ""
  );
  const cloudCover = toNumber(properties["eo:cloud_cover"]);
  const orbitState =
    typeof properties["sat:orbit_state"] === "string"
      ? String(properties["sat:orbit_state"])
      : null;
  const polarizations = Array.isArray(properties["sar:polarizations"])
    ? properties["sar:polarizations"].map(String)
    : [];

  const assets = sanitizeAssets(item.assets);
  const previewAsset =
    assets.thumbnail ||
    assets.preview ||
    assets.rendered_preview ||
    assets.overview ||
    null;

  return {
    id: String(item.id || ""),
    collection,
    sensor: sensorLabel(collection),
    datetime,
    cloudCover,
    orbitState,
    polarizations,
    bbox: Array.isArray(item.bbox) ? item.bbox : null,
    geometry: item.geometry || null,
    assets,
    previewUrl: previewAsset?.href || null,
    selfUrl:
      item.links?.find((link) => link.rel === "self" && link.href)?.href || null
  };
}

function safeNextLink(link: StacLink | undefined) {
  if (!link?.href) return null;
  try {
    const url = new URL(link.href);
    if (url.protocol !== "https:" || url.hostname !== EARTH_SEARCH_HOST) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchStacScenes(geometry: Geometry, from: string, to: string) {
  const query = {
    collections: [...COLLECTIONS],
    intersects: geometry,
    datetime: `${from}/${to}`,
    limit: 200
  };

  let url = EARTH_SEARCH;
  let method = "POST";
  let body: unknown = query;
  let headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/geo+json, application/json"
  };

  const items: StacItem[] = [];
  const seen = new Set<string>();
  let providerMatched: number | null = null;

  for (let page = 0; page < 20 && url; page += 1) {
    const response = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`EARTH_SEARCH_${response.status}: ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as StacFeatureCollection;
    const features = Array.isArray(payload.features) ? payload.features : [];
    for (const item of features) {
      const key = `${item.collection || ""}:${item.id || ""}`;
      if (!item.id || seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }

    const matched = toNumber(payload.context?.matched ?? payload.numberMatched);
    if (matched != null) providerMatched = matched;

    const next = payload.links?.find((link) => link.rel === "next");
    const nextUrl = safeNextLink(next);
    if (!nextUrl) break;

    url = nextUrl;
    method = String(next?.method || "GET").toUpperCase();
    body = next?.body ?? null;
    headers = {
      accept: "application/geo+json, application/json",
      ...(next?.headers || {})
    };
    if (method !== "GET" && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
  }

  const scenes = items
    .map(sceneFromItem)
    .filter((scene) => scene.id && scene.datetime)
    .sort((a, b) => Date.parse(b.datetime) - Date.parse(a.datetime));

  return {
    scenes,
    providerMatched,
    collections: [...COLLECTIONS]
  };
}

async function fetchDroneRecord(plotCode: string) {
  const listUrl =
    DRONE_SOURCE_ORIGIN +
    "/api/imagery?province=RAYONG&q=" +
    encodeURIComponent(plotCode);

  const listResponse = await fetch(listUrl, {
    headers: { accept: "application/json" }
  });
  if (!listResponse.ok) {
    return {
      available: false,
      reason: `DRONE_LIST_${listResponse.status}`
    };
  }

  const list = (await listResponse.json()) as {
    items?: Array<{
      key?: string;
      plotCode?: string;
      plotName?: string;
      locationName?: string | null;
      plotAreaSqm?: number | null;
      boundarySource?: string;
      mosaicSource?: string;
    }>;
  };

  const item = (list.items || []).find(
    (row) => String(row.plotCode || "").trim().toUpperCase() === plotCode
  );
  if (!item?.key) {
    return {
      available: false,
      reason: "DRONE_MOSAIC_NOT_FOUND"
    };
  }

  const metaUrl =
    DRONE_SOURCE_ORIGIN +
    "/api/imagery/meta?key=" +
    encodeURIComponent(item.key) +
    "&plotCode=" +
    encodeURIComponent(plotCode);
  const metaResponse = await fetch(metaUrl, {
    headers: { accept: "application/json" }
  });
  const meta = metaResponse.ok
    ? ((await metaResponse.json()) as Record<string, unknown>)
    : null;

  return {
    available: true,
    key: item.key,
    plotName: item.plotName || plotCode,
    locationName: item.locationName || null,
    plotAreaSqm: item.plotAreaSqm ?? null,
    boundarySource: item.boundarySource || null,
    mosaicSource: item.mosaicSource || null,
    capturedAt: null,
    source: "mangrove-area-classifier",
    previewUrl:
      "/api/drone-image?key=" +
      encodeURIComponent(item.key) +
      "&width=2048",
    detailUrl:
      "/api/drone-image?key=" +
      encodeURIComponent(item.key) +
      "&width=4096",
    meta
  };
}

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "plot-flood-impact",
    floodEventStart: FLOOD_EVENT_START,
    satelliteProvider: "Element84 Earth Search v1",
    droneProvider: "mangrove-area-classifier"
  })
);

app.get("/api/plots", (c) => {
  const items = listPddBoundaries("RAYONG").map((row) => {
    if (!row.geometry) return null;
    const bounds = geometryBounds(row.geometry);
    return {
      plotCode: row.plotCode,
      province: "ระยอง",
      geometry: row.geometry,
      bounds,
      centroid: centroidFromBounds(bounds),
      geometryAreaRai: row.geometryAreaRai,
      declaredAreaRai: row.declaredAreaRai,
      boundarySource: "pdd_kmz_2026_09_21",
      boundarySourceDate: row.sourceDate,
      boundarySourceSha256: row.sourceSha256
    };
  }).filter(Boolean);

  return c.json({
    province: "ระยอง",
    count: items.length,
    floodEventStart: FLOOD_EVENT_START,
    items
  });
});

app.get("/api/plots/:plotCode", (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const boundary = getPddBoundary(plotCode);
  if (!boundary || boundary.provinceCode !== "RAYONG") {
    return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  }
  const bounds = geometryBounds(boundary.geometry);
  return c.json({
    plotCode,
    province: "ระยอง",
    geometry: boundary.geometry,
    bounds,
    centroid: centroidFromBounds(bounds),
    geometryAreaRai: boundary.geometryAreaRai,
    declaredAreaRai: boundary.declaredAreaRai,
    boundarySource: boundary.source,
    boundarySourceDate: boundary.sourceDate,
    boundarySourceSha256: boundary.sourceSha256
  });
});

app.get("/api/drone/:plotCode", async (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const boundary = getPddBoundary(plotCode);
  if (!boundary || boundary.provinceCode !== "RAYONG") {
    return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  }

  try {
    return c.json(await fetchDroneRecord(plotCode));
  } catch (error) {
    return c.json({
      available: false,
      reason: error instanceof Error ? error.message : "DRONE_LOOKUP_FAILED"
    });
  }
});

app.get("/api/drone-image", async (c) => {
  const key = String(c.req.query("key") || "").trim();
  const widthRaw = Number(c.req.query("width") || 2048);
  const width = [1024, 2048, 4096].includes(widthRaw) ? widthRaw : 2048;

  if (!key.startsWith("mangrove-drone-dashboard/") || key.includes("..")) {
    return c.json({ error: "OUT_OF_SCOPE_DRONE_KEY" }, 403);
  }

  const upstream =
    DRONE_SOURCE_ORIGIN +
    "/api/imagery/preview?key=" +
    encodeURIComponent(key) +
    "&width=" +
    width;
  const response = await fetch(upstream);
  if (!response.ok) {
    return c.json(
      {
        error: "DRONE_PREVIEW_FAILED",
        status: response.status
      },
      502
    );
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    response.headers.get("content-type") || "image/webp"
  );
  headers.set(
    "cache-control",
    response.headers.get("cache-control") ||
      "public, max-age=3600, stale-while-revalidate=86400"
  );
  headers.set("x-source", "mangrove-area-classifier");
  return new Response(response.body, {
    status: 200,
    headers
  });
});

app.get("/api/satellite/:plotCode", async (c) => {
  const plotCode = decodeURIComponent(c.req.param("plotCode")).trim().toUpperCase();
  const boundary = getPddBoundary(plotCode);
  if (!boundary || boundary.provinceCode !== "RAYONG") {
    return c.json({ error: "RAYONG_PLOT_NOT_FOUND" }, 404);
  }

  const nowIso = new Date().toISOString();
  const from = safeDate(c.req.query("from") || null, FLOOD_EVENT_START);
  const to = safeDate(c.req.query("to") || null, nowIso);

  if (Date.parse(from) > Date.parse(to)) {
    return c.json({ error: "INVALID_DATE_RANGE" }, 400);
  }

  try {
    const plotScenes = satelliteManifest.filter((s: any) => s.plotCode === plotCode);
    
    // Map to SatelliteScene format
    const scenes = plotScenes.map((s: any) => {
      const dt = s.acquiredAt;
      const dt_safe = dt.replace(/:/g, '').replace(/-/g, '').substring(0, 15);
      const prefix = `${dt_safe}_${s.sensor}`;
      const previewUrlBase = `/satellite-previews/${plotCode}/${prefix}`;
      
      const res = {
        id: s.sceneId,
        collection: s.collection,
        sensor: s.sensor,
        datetime: dt,
        cloudCover: s.cloudCover,
        orbitState: s.orbitState,
        polarizations: s.polarizations,
        sourceUrls: s.sourceUrls || [],
        previewUrls: {} as Record<string, string>,
        bbox: s.bounds || null
      };
      
      if (s.sensor === "sentinel-1") {
        res.previewUrls.sar = `${previewUrlBase}_sar.webp`;
      } else {
        res.previewUrls.rgb = `${previewUrlBase}_rgb.webp`;
        res.previewUrls.water = `${previewUrlBase}_water.webp`;
        res.previewUrls.ndvi = `${previewUrlBase}_ndvi.webp`;
      }
      return res;
    });

    return c.json({
      plotCode,
      from,
      to,
      cloudFilterApplied: false,
      queryGeometrySource: boundary.source,
      queryGeometrySourceDate: boundary.sourceDate,
      count: scenes.length,
      providerMatched: scenes.length,
      collections: [...COLLECTIONS],
      scenes
    });
  } catch (error) {
    return c.json(
      {
        error: "SATELLITE_SEARCH_FAILED",
        message: error instanceof Error ? error.message : String(error)
      },
      502
    );
  }
});



type WorkerEnv = {
  ASSETS: Fetcher;
};

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const response = await app.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(request);
  }
};
