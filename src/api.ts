import type {
  DroneRecord,
  PlotRecord,
  SatelliteSearchResult
} from "./types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : "Request failed";
    throw new Error(message);
  }
  return body as T;
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
