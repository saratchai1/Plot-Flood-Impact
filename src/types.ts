import type { Geometry } from "geojson";

export interface PlotRecord {
  plotCode: string;
  province: string;
  geometry: Geometry;
  bounds: [number, number, number, number] | null;
  centroid: [number, number] | null;
  geometryAreaRai: number;
  declaredAreaRai: number | null;
  boundarySource: string;
  boundarySourceDate: string;
  boundarySourceSha256: string;
}

export interface DroneRecord {
  available: boolean;
  reason?: string;
  key?: string;
  plotName?: string;
  locationName?: string | null;
  plotAreaSqm?: number | null;
  boundarySource?: string | null;
  mosaicSource?: string | null;
  capturedAt?: string | null;
  source?: string;
  previewUrl?: string;
  detailUrl?: string;
  meta?: Record<string, unknown> | null;
}

export interface SceneAsset {
  href?: string;
  type?: string;
  title?: string;
  roles?: string[];
}

export interface SatelliteScene {
  id: string;
  collection: string;
  sensor: string;
  datetime: string;
  cloudCover: number | null;
  orbitState: string | null;
  polarizations: string[];
  bbox: number[] | null;
  geometry: Geometry | null;
  assets: Record<string, SceneAsset>;
  previewUrl: string | null;
  selfUrl: string | null;
}

export interface SatelliteSearchResult {
  plotCode: string;
  from: string;
  to: string;
  cloudFilterApplied: boolean;
  queryGeometrySource: string;
  queryGeometrySourceDate: string;
  count: number;
  providerMatched: number | null;
  collections: string[];
  scenes: SatelliteScene[];
}

export interface UploadedFloodEvent {
  id: string;
  label: string;
  acquiredAt: string;
  acquiredTimeKnown: boolean;
  sourceFileName: string;
  sourceSha256: string;
  sourceCrs: string;
  wgs84Bounds: [number, number, number, number];
  pixelSizeM: number;
  sourceWidth: number;
  sourceHeight: number;
  bandCount: number;
  bandInterpretation: string;
  coverage: "FULL" | "PARTIAL" | "NO_COVERAGE";
  imageAvailable: boolean;
  spriteWidth: number;
  spriteHeight: number;
  cell: [number, number, number, number] | null;
  sourceWindow: [number, number, number, number] | null;
  sourceValidFraction: number;
  spriteUrl: string | null;
}
