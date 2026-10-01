import { useEffect, useMemo, useState } from "react";
import { getDrone, getSatellite, listPlots } from "./api";
import { PlotMap } from "./PlotMap";
import { SatellitePreview } from "./SatellitePreview";
import type {
  DroneRecord,
  PlotRecord,
  SatelliteScene,
  SatelliteSearchResult
} from "./types";

const SENSOR_OPTIONS = [
  { id: "sentinel-1", label: "Sentinel-1 SAR" },
  { id: "sentinel-2-l2a", label: "Sentinel-2 L2A" },
  { id: "landsat-c2-l2", label: "Landsat C2 L2" }
] as const;

type SensorId = (typeof SENSOR_OPTIONS)[number]["id"];

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDay(value: string) {
  if (!value) return "ไม่ทราบวันที่";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function localDayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function sceneMeta(scene: SatelliteScene) {
  if (scene.collection === "sentinel-1") {
    const parts = [
      scene.orbitState ? scene.orbitState.toUpperCase() : null,
      scene.polarizations.length ? scene.polarizations.join("/") : null
    ].filter(Boolean);
    return parts.join(" · ") || "SAR";
  }
  return scene.cloudCover == null
    ? "Cloud metadata —"
    : "Cloud " + scene.cloudCover.toFixed(1) + "%";
}

export function App() {
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [floodEventStart, setFloodEventStart] = useState("");
  const [drone, setDrone] = useState<DroneRecord | null>(null);
  const [satellite, setSatellite] = useState<SatelliteSearchResult | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [enabledSensors, setEnabledSensors] = useState<Set<SensorId>>(
    new Set(SENSOR_OPTIONS.map((option) => option.id))
  );
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [loadingPlotData, setLoadingPlotData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPlots()
      .then((data) => {
        if (cancelled) return;
        setPlots(data.items);
        setFloodEventStart(data.floodEventStart);
        setSelectedCode((current) => current || data.items[0]?.plotCode || null);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoadingPlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshSelected(plotCode = selectedCode) {
    if (!plotCode) return;
    setLoadingPlotData(true);
    setError("");
    try {
      const [droneData, satelliteData] = await Promise.all([
        getDrone(plotCode),
        getSatellite(plotCode)
      ]);
      setDrone(droneData);
      setSatellite(satelliteData);
      setSelectedSceneId((current) => {
        if (current && satelliteData.scenes.some((scene) => scene.id === current)) {
          return current;
        }
        return satelliteData.scenes[0]?.id || null;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setDrone(null);
      setSatellite(null);
      setSelectedSceneId(null);
    } finally {
      setLoadingPlotData(false);
    }
  }

  useEffect(() => {
    if (!selectedCode) return;
    void refreshSelected(selectedCode);
  }, [selectedCode]);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.plotCode === selectedCode) || null,
    [plots, selectedCode]
  );

  const filteredPlots = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return plots;
    return plots.filter((plot) => plot.plotCode.toLowerCase().includes(value));
  }, [plots, query]);

  const visibleScenes = useMemo(
    () =>
      (satellite?.scenes || []).filter((scene) =>
        enabledSensors.has(scene.collection as SensorId)
      ),
    [satellite, enabledSensors]
  );

  const groupedScenes = useMemo(() => {
    const groups = new Map<string, SatelliteScene[]>();
    for (const scene of visibleScenes) {
      const key = localDayKey(scene.datetime);
      const rows = groups.get(key) || [];
      rows.push(scene);
      groups.set(key, rows);
    }
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [visibleScenes]);

  const selectedScene = useMemo(
    () =>
      visibleScenes.find((scene) => scene.id === selectedSceneId) ||
      visibleScenes[0] ||
      null,
    [visibleScenes, selectedSceneId]
  );

  const sensorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const scene of satellite?.scenes || []) {
      counts.set(scene.collection, (counts.get(scene.collection) || 0) + 1);
    }
    return counts;
  }, [satellite]);

  const eventLabel = floodEventStart
    ? formatDateTime(floodEventStart)
    : "27 ก.ย. 2569";

  function toggleSensor(id: SensorId) {
    setEnabledSensors((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Rayong · Prasae Flood Event</p>
          <h1>Plot Flood Impact</h1>
          <p className="subtitle">
            เทียบภาพโดรน baseline กับ Sentinel/Landsat ทุก scene หลังเหตุการณ์น้ำท่วม
          </p>
        </div>
        <div className="topbar-badges">
          <span className="badge critical">Cloud filter OFF</span>
          <span className="badge">เริ่ม {eventLabel}</span>
          <button
            className="refresh-button"
            onClick={() => void refreshSelected()}
            disabled={!selectedCode || loadingPlotData}
          >
            {loadingPlotData ? "กำลังอัปเดต…" : "ดึงข้อมูลล่าสุด"}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="plot-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Rayong portfolio</p>
              <h2>แปลงปลูกป่า</h2>
            </div>
            <strong>{plots.length}</strong>
          </div>

          <input
            className="plot-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหารหัสแปลง"
          />

          <div className="plot-list">
            {loadingPlots && <div className="muted-block">กำลังโหลดขอบเขตแปลง…</div>}
            {filteredPlots.map((plot) => (
              <button
                key={plot.plotCode}
                className={"plot-row " + (plot.plotCode === selectedCode ? "active" : "")}
                onClick={() => setSelectedCode(plot.plotCode)}
              >
                <span>
                  <strong>{plot.plotCode}</strong>
                  <small>PDD 21/09/2026</small>
                </span>
                <span className="plot-area">
                  {(plot.declaredAreaRai ?? plot.geometryAreaRai).toFixed(2)} ไร่
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="main-panel">
          {error && <div className="error-banner">{error}</div>}

          <section className="overview-grid">
            <div className="map-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Spatial context</p>
                  <h2>{selectedCode || "เลือกแปลง"}</h2>
                </div>
                {selectedPlot && (
                  <span className="source-pill">
                    PDD boundary · {selectedPlot.declaredAreaRai?.toFixed(2) || selectedPlot.geometryAreaRai.toFixed(2)} ไร่
                  </span>
                )}
              </div>
              <PlotMap plots={plots} selectedCode={selectedCode} onSelect={setSelectedCode} />
            </div>

            <div className="summary-card">
              <p className="eyebrow">Event coverage</p>
              <div className="metric-grid">
                <div>
                  <span>Satellite scenes</span>
                  <strong>{satellite?.count ?? "—"}</strong>
                </div>
                <div>
                  <span>วันที่มีภาพ</span>
                  <strong>{groupedScenes.length || "—"}</strong>
                </div>
                <div>
                  <span>Drone baseline</span>
                  <strong>{drone?.available ? "มี" : "ไม่มี"}</strong>
                </div>
                <div>
                  <span>Cloud filter</span>
                  <strong>OFF</strong>
                </div>
              </div>

              <div className="sensor-filter">
                {SENSOR_OPTIONS.map((sensor) => (
                  <label key={sensor.id}>
                    <input
                      type="checkbox"
                      checked={enabledSensors.has(sensor.id)}
                      onChange={() => toggleSensor(sensor.id)}
                    />
                    <span>{sensor.label}</span>
                    <b>{sensorCounts.get(sensor.id) || 0}</b>
                  </label>
                ))}
              </div>

              <p className="summary-note">
                ระบบเก็บทุก scene ที่ STAC ระบุว่าตัดกับขอบเขตแปลงหลังเหตุการณ์
                ค่าเมฆถูกแสดงเป็น metadata เท่านั้นและไม่ใช้คัดภาพออก
              </p>
            </div>
          </section>

          <section className="comparison-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Side-by-side evidence</p>
                <h2>Drone baseline ↔ Satellite scene</h2>
              </div>
              {selectedScene && (
                <div className="scene-stamp">
                  <strong>{selectedScene.sensor}</strong>
                  <span>{formatDateTime(selectedScene.datetime)}</span>
                  <span>{sceneMeta(selectedScene)}</span>
                </div>
              )}
            </div>

            <div className="comparison-grid">
              <article className="comparison-card">
                <header>
                  <span>DRONE</span>
                  <strong>{selectedCode || "—"}</strong>
                </header>
                {drone?.available && drone.previewUrl ? (
                  <img
                    src={drone.previewUrl}
                    className="comparison-image"
                    alt={"Drone orthomosaic " + selectedCode}
                  />
                ) : (
                  <div className="preview-empty">
                    {loadingPlotData ? "กำลังโหลดภาพโดรน…" : drone?.reason || "ยังไม่มีภาพโดรน"}
                  </div>
                )}
                <footer>
                  <span>Baseline orthomosaic</span>
                  <span>{drone?.mosaicSource || drone?.source || "—"}</span>
                </footer>
              </article>

              <article className="comparison-card">
                <header>
                  <span>SATELLITE</span>
                  <strong>{selectedScene?.sensor || "เลือก scene"}</strong>
                </header>
                <SatellitePreview scene={selectedScene} />
                <footer>
                  <span>{selectedScene ? formatDateTime(selectedScene.datetime) : "—"}</span>
                  <span>{selectedScene ? sceneMeta(selectedScene) : "—"}</span>
                </footer>
              </article>
            </div>
          </section>

          <section className="timeline-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Post-flood acquisition timeline</p>
                <h2>ทุกวันที่มีภาพหลังน้ำท่วม</h2>
              </div>
              <span className="source-pill">
                Earth Search STAC · {visibleScenes.length} scene
              </span>
            </div>

            {loadingPlotData && !satellite && (
              <div className="timeline-empty">กำลังค้นหา Sentinel และ Landsat…</div>
            )}

            {!loadingPlotData && satellite && visibleScenes.length === 0 && (
              <div className="timeline-empty">
                ไม่พบ scene ใน sensor ที่เลือกสำหรับช่วงเหตุการณ์นี้
              </div>
            )}

            <div className="timeline-days">
              {groupedScenes.map(([day, scenes]) => (
                <div className="day-block" key={day}>
                  <div className="day-label">
                    <strong>{formatDay(scenes[0].datetime)}</strong>
                    <span>{scenes.length} scene</span>
                  </div>
                  <div className="scene-list">
                    {scenes.map((scene) => (
                      <button
                        key={scene.collection + ":" + scene.id}
                        className={"scene-row " + (selectedScene?.id === scene.id ? "active" : "")}
                        onClick={() => setSelectedSceneId(scene.id)}
                      >
                        <span className={"sensor-dot " + scene.collection} />
                        <span className="scene-main">
                          <strong>{scene.sensor}</strong>
                          <small>{formatDateTime(scene.datetime)}</small>
                        </span>
                        <span className="scene-meta">{sceneMeta(scene)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
