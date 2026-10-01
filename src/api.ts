import type {
  DroneRecord,
  PlotRecord,
  SatelliteSearchResult,
  UploadedFloodEvent
} from "./types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" }
  });
  const rawBody: unknown = await response.json().catch(() => ({}));
  const body =
    rawBody && typeof rawBody === "object"
      ? (rawBody as Record<string, unknown>)
      : {};

  if (!response.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : "Request failed";
    throw new Error(message);
  }
  return rawBody as T;
}

export async function listPlots() {
  return request<{
    province: string;
    count: number;
    floodEventStart: string;
    items: PlotRecord[];
  }>("/api/plots");
}

export async function getDrone(plotCode: string) {
  return request<DroneRecord>(
    "/api/drone/" + encodeURIComponent(plotCode)
  );
}

export async function getSatellite(
  plotCode: string,
  from?: string,
  to?: string
) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const suffix = params.toString() ? "?" + params.toString() : "";
  return request<SatelliteSearchResult>(
    "/api/satellite/" + encodeURIComponent(plotCode) + suffix
  );
}

export async function getUploadedFlood(plotCode: string) {
  return request<UploadedFloodEvent>(
    "/api/uploaded-flood/" + encodeURIComponent(plotCode)
  );
}
