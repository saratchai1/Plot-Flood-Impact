import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import type { PlotRecord } from "./types";

function toCollection(
  plots: PlotRecord[],
  selectedCode: string | null
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: plots.map((plot) => ({
      type: "Feature",
      properties: {
        plotCode: plot.plotCode,
        selected: plot.plotCode === selectedCode ? 1 : 0
      },
      geometry: plot.geometry
    })) as Feature[]
  };
}

export function PlotMap({
  plots,
  selectedCode,
  onSelect
}: {
  plots: PlotRecord[];
  selectedCode: string | null;
  onSelect: (plotCode: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        import.meta.env.VITE_MAP_STYLE_URL ||
        "https://demotiles.maplibre.org/style.json",
      center: [101.72, 12.72],
      zoom: 10.5
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.once("load", () => {
      map.addSource("rayong-plots", {
        type: "geojson",
        data: toCollection(plots, selectedCode)
      });

      map.addLayer({
        id: "plots-fill",
        type: "fill",
        source: "rayong-plots",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "selected"], 1],
            "#f59e0b",
            "#14b8a6"
          ],
          "fill-opacity": [
            "case",
            ["==", ["get", "selected"], 1],
            0.4,
            0.16
          ]
        }
      });

      map.addLayer({
        id: "plots-line",
        type: "line",
        source: "rayong-plots",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "selected"], 1],
            "#FFD400", // Yellowish for plot boundary
            "#2dd4bf"
          ],
          "line-width": [
            "case",
            ["==", ["get", "selected"], 1],
            4,
            1.5
          ]
        }
      });

      map.addLayer({
        id: "plot-label",
        type: "symbol",
        source: "rayong-plots",
        layout: {
          "text-field": ["get", "plotCode"],
          "text-size": 11,
          "text-allow-overlap": false
        },
        paint: {
          "text-color": "#dffcf3",
          "text-halo-color": "#071511",
          "text-halo-width": 1.5
        }
      });

      map.on("click", "plots-fill", (event) => {
        const plotCode = event.features?.[0]?.properties?.plotCode;
        if (typeof plotCode === "string" && plotCode) {
          onSelectRef.current(plotCode);
        }
      });

      map.on("mouseenter", "plots-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "plots-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setReady(true);
    });

    return () => {
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("rayong-plots") as maplibregl.GeoJSONSource;
    source.setData(toCollection(plots, selectedCode));

    const selected = plots.find((plot) => plot.plotCode === selectedCode);
    if (selected?.bounds) {
      const [west, south, east, north] = selected.bounds;
      map.fitBounds(
        [
          [west, south],
          [east, north]
        ],
        { padding: 70, duration: 500, maxZoom: 15 }
      );
    }
  }, [plots, selectedCode, ready]);

  return <div className="plot-map" ref={containerRef} />;
}
