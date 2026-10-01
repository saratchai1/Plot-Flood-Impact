import { useEffect, useMemo, useRef, useState } from "react";
import { getDrone, getUploadedFlood, listPlots } from "./api";
import { PlotMap } from "./PlotMap";
import type { DroneRecord, PlotRecord, UploadedFloodEvent } from "./types";

const NO_COVERAGE = new Set(["15-STC", "21-STC", "22(1)-STC", "22-STC"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "long"
  }).format(new Date(value));
}

export function App() {
  const loadVersionRef = useRef(0);
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drone, setDrone] = useState<DroneRecord | null>(null);
  const [event, setEvent] = useState<UploadedFloodEvent | null>(null);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [loadingPlotData, setLoadingPlotData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPlots()
      .then((data) => {
        if (cancelled) return;
        setPlots(data.items);
        setSelectedCode(data.items[0]?.plotCode || null);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoadingPlots(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function refreshSelected(plotCode = selectedCode) {
    if (!plotCode) return;
    const version = ++loadVersionRef.current;
    setLoadingPlotData(true);
    setError("");
    setDrone(null);
    setEvent(null);

    const [droneResult, eventResult] = await Promise.allSettled([
      getDrone(plotCode),
      getUploadedFlood(plotCode)
    ]);
    if (version !== loadVersionRef.current) return;

    const errors: string[] = [];
    if (droneResult.status === "fulfilled") setDrone(droneResult.value);
    else errors.push("Drone: " + String(droneResult.reason));

    if (eventResult.status === "fulfilled") setEvent(eventResult.value);
    else errors.push("Flood image: " + String(eventResult.reason));

    setError(errors.join(" · "));
    setLoadingPlotData(false);
  }

  useEffect(() => {
    if (selectedCode) void refreshSelected(selectedCode);
  }, [selectedCode]);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.plotCode === selectedCode) || null,
    [plots, selectedCode]
  );

  const filteredPlots = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? plots.filter((plot) => plot.plotCode.toLowerCase().includes(value))
      : plots;
  }, [plots, query]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">V2 · Local uploaded imagery</p>
          <h1>Plot Flood Impact</h1>
          <p className="subtitle">
            เทียบภาพโดรนกับภาพน้ำท่วมระยองที่อัปโหลดแล้ว โดยไม่โหลด GeoTIFF จาก satellite provider ตอนเปิดหน้า
          </p>
        </div>
        <div className="topbar-badges">
          <span className="badge critical">29/09/2026</span>
          <span className="badge">15 / 19 plots covered</span>
          <button
            className="refresh-button"
            onClick={() => void refreshSelected()}
            disabled={!selectedCode || loadingPlotData}
          >
            {loadingPlotData ? "กำลังโหลด…" : "รีเฟรช"}
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
                  <small>{NO_COVERAGE.has(plot.plotCode) ? "NO_COVERAGE · 29/09" : "COVERED · 29/09"}</small>
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
                    PDD · {(selectedPlot.declaredAreaRai ?? selectedPlot.geometryAreaRai).toFixed(2)} ไร่
                  </span>
                )}
              </div>
              <PlotMap plots={plots} selectedCode={selectedCode} onSelect={setSelectedCode} />
            </div>

            <div className="summary-card">
              <p className="eyebrow">Uploaded event image</p>
              <div className="metric-grid">
                <div><span>Coverage</span><strong>{event?.coverage || "—"}</strong></div>
                <div><span>Resolution</span><strong>{event ? event.pixelSizeM + " m" : "—"}</strong></div>
                <div><span>Drone baseline</span><strong>{drone?.available ? "มี" : "—"}</strong></div>
                <div><span>Bands</span><strong>{event?.bandInterpretation || "—"}</strong></div>
              </div>
              <p className="summary-note">
                Source: {event?.sourceFileName || "Flood_Rayong_20260929.tif"}<br />
                EPSG:32647 · 3-band RGB · 10 m/pixel<br />
                SHA-256: {event?.sourceSha256?.slice(0, 16) || "a5c575e2cbfe57fa"}…
              </p>
            </div>
          </section>

          <section className="comparison-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Fast local comparison</p>
                <h2>Drone baseline ↔ Flood image 29/09/2026</h2>
              </div>
              {event && <span className="source-pill">{event.coverage}</span>}
            </div>

            <div className="comparison-grid">
              <article className="comparison-card">
                <header><span>DRONE</span><strong>{selectedCode || "—"}</strong></header>
                {drone?.available && drone.previewUrl ? (
                  <img src={drone.previewUrl} className="comparison-image" alt={"Drone " + selectedCode} />
                ) : (
                  <div className="preview-empty">
                    {loadingPlotData ? "กำลังโหลดภาพโดรน…" : drone?.reason || "ยังไม่มีภาพโดรน"}
                  </div>
                )}
                <footer><span>Baseline orthomosaic</span><span>{drone?.mosaicSource || "read-only source"}</span></footer>
              </article>

              <article className="comparison-card">
                <header><span>UPLOADED FLOOD IMAGE</span><strong>29/09/2026</strong></header>
                {event?.coverage === "NO_COVERAGE" ? (
                  <div className="preview-empty">
                    ภาพ Flood_Rayong_20260929.tif ไม่ครอบคลุมแปลง {selectedCode}
                  </div>
                ) : event?.imageAvailable && event.spriteUrl && event.cell ? (
                  <svg
                    className="comparison-image"
                    viewBox={`0 0 ${event.cell[2]} ${event.cell[3]}`}
                    role="img"
                    aria-label={"Flood image " + selectedCode}
                  >
                    <image
                      href={event.spriteUrl}
                      x={-event.cell[0]}
                      y={-event.cell[1]}
                      width={event.spriteWidth}
                      height={event.spriteHeight}
                    />
                  </svg>
                ) : (
                  <div className="preview-empty">
                    {loadingPlotData ? "กำลังโหลด crop…" : "crop ยังไม่ถูกตั้งค่าใน deployment"}
                  </div>
                )}
                <footer>
                  <span>{event ? formatDate(event.acquiredAt) : "29 กันยายน 2569"}</span>
                  <span>250 m context crop</span>
                </footer>
              </article>
            </div>
          </section>

          <section className="timeline-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Event timeline</p>
                <h2>ภาพที่ใส่ไว้ใน V2</h2>
              </div>
              <span className="source-pill">Local deployment asset</span>
            </div>
            <div className="timeline-days">
              <div className="day-block">
                <div className="day-label">
                  <strong>29 ก.ย. 2569</strong>
                  <span>1 uploaded raster</span>
                </div>
                <div className="scene-list">
                  <div className="scene-row active">
                    <span className="sensor-dot sentinel-2-l2a" />
                    <span className="scene-main">
                      <strong>Flood_Rayong_20260929.tif</strong>
                      <small>RGB GeoTIFF · EPSG:32647 · 10 m/pixel · เวลา acquisition ไม่ได้ระบุในไฟล์</small>
                    </span>
                    <span className="scene-meta">{event?.coverage || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
