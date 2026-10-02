import { useState, useRef, useCallback, useMemo } from "react";

/** Build a static ESRI World Imagery URL for given bounds. */
function esriBasemapUrl(bounds: [number, number, number, number], width = 800, height = 600) {
  const [west, south, east, north] = bounds;
  // Add ~20% padding around the bounds for context
  const dLon = (east - west) * 0.2;
  const dLat = (north - south) * 0.2;
  const bbox = [west - dLon, south - dLat, east + dLon, north + dLat].join(",");
  return (
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`
  );
}

export function ImageCompare({
  droneUrl,
  satelliteUrl,
  satelliteLabel,
  plotBounds,
  floodMode = false,
}: {
  droneUrl: string | null;
  satelliteUrl: string | null;
  satelliteLabel: string;
  plotBounds: [number, number, number, number] | null;
  floodMode?: boolean;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const basemapSrc = useMemo(() => {
    if (!plotBounds) return null;
    return esriBasemapUrl(plotBounds, 1200, 900);
  }, [plotBounds]);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setSliderPos(x * 100);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSlider(e.clientX);
  }, [updateSlider]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateSlider(e.clientX);
  }, [updateSlider]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!droneUrl && !satelliteUrl) {
    return <div className="preview-empty">ไม่มีภาพสำหรับเปรียบเทียบ</div>;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 3",
        overflow: "hidden",
        background: "#1e293b",
        borderRadius: "8px",
        cursor: "col-resize",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Layer 0 — Basemap (aerial context behind everything) */}
      {basemapSrc && (
        <img
          src={basemapSrc}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: 0.6,
          }}
        />
      )}

      {/* Layer 1 — Satellite (right side, fully visible) */}
      {satelliteUrl && (
        <img
          src={satelliteUrl}
          alt="Satellite"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            ...(floodMode ? {
              // Mock visual: tint the grayscale water index to blue
              filter: "sepia(1) hue-rotate(180deg) saturate(400%) brightness(1.2) contrast(1.5)"
            } : {})
          }}
        />
      )}

      {/* Layer 2 — Drone side: basemap + drone, clipped together */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
        }}
      >
        {/* Basemap behind the drone on the left side too */}
        {basemapSrc && (
          <img
            src={basemapSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        )}
        {droneUrl && (
          <img
            src={droneUrl}
            alt="Drone"
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        )}
      </div>

      {/* Slider line + handle */}
      {droneUrl && satelliteUrl && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sliderPos}%`,
            width: "3px",
            background: "white",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            boxShadow: "0 0 6px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "32px",
              height: "32px",
              background: "white",
              borderRadius: "50%",
              border: "3px solid #3b82f6",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: "#3b82f6",
              fontWeight: "bold",
            }}
          >
            ⇔
          </div>
        </div>
      )}

      {/* Labels */}
      {droneUrl && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: "bold",
            pointerEvents: "none",
          }}
        >
          🛩 DRONE baseline
        </div>
      )}
      {satelliteUrl && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: "bold",
            pointerEvents: "none",
          }}
        >
          🛰 {satelliteLabel}
        </div>
      )}

      {/* No-image fallbacks */}
      {!droneUrl && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "25%",
            transform: "translate(-50%, -50%)",
            color: "#94a3b8",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          ยังไม่มีภาพโดรน
        </div>
      )}
      {!satelliteUrl && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "75%",
            transform: "translate(-50%, -50%)",
            color: "#94a3b8",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          เลือก scene จาก timeline
        </div>
      )}

      {/* Flood Analysis Legend */}
      {floodMode && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "12px 16px",
            color: "white",
            fontSize: 13,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backdropFilter: "blur(4px)",
            pointerEvents: "none",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 4, color: "#cbd5e1" }}>การแสดงผล (ตรวจน้ำ)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, background: "#00C8FF", borderRadius: 2 }}></div>
            <span>น้ำท่วมใหม่</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, background: "#0047AB", borderRadius: 2 }}></div>
            <span>ร่องน้ำ/น้ำเดิม</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, border: "2px solid #FFD400", borderRadius: 2 }}></div>
            <span>ขอบแปลงอ้างอิง</span>
          </div>
        </div>
      )}

      {/* Basemap attribution */}
      {basemapSrc && (
        <div
          style={{
            position: "absolute",
            bottom: 2,
            right: 4,
            fontSize: 9,
            color: "rgba(255,255,255,0.5)",
            pointerEvents: "none",
          }}
        >
          Basemap © Esri
        </div>
      )}
    </div>
  );
}
