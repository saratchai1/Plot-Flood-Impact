import { useState } from "react";
import type { DroneRecord, UploadedFloodEvent } from "./types";

function SatelliteCrop({ event, plotCode }: { event: UploadedFloodEvent; plotCode: string }) {
  if (!event.spriteUrl || !event.cell) return null;
  return (
    <svg
      className="compare-media"
      viewBox={`0 0 ${event.cell[2]} ${event.cell[3]}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={"ภาพดาวเทียม " + plotCode}
    >
      <image
        href={event.spriteUrl}
        x={-event.cell[0]}
        y={-event.cell[1]}
        width={event.spriteWidth}
        height={event.spriteHeight}
      />
    </svg>
  );
}

export function CompareSlider({
  plotCode,
  drone,
  event
}: {
  plotCode: string;
  drone: DroneRecord;
  event: UploadedFloodEvent;
}) {
  const [position, setPosition] = useState(50);

  return (
    <div className="compare-shell">
      <div className="compare-stage">
        <div className="compare-layer compare-drone">
          <img
            className="compare-media"
            src={drone.previewUrl}
            alt={"ภาพโดรน " + plotCode}
          />
          <span className="compare-label compare-label-left">DRONE</span>
        </div>

        <div
          className="compare-layer compare-satellite"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <SatelliteCrop event={event} plotCode={plotCode} />
          <span className="compare-label compare-label-right">SATELLITE · 29/09/2026</span>
        </div>

        <div className="compare-divider" style={{ left: position + "%" }}>
          <span className="compare-handle" aria-hidden="true">↔</span>
        </div>

        <input
          className="compare-range"
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label="เลื่อนเพื่อเปรียบเทียบภาพโดรนกับภาพดาวเทียม"
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>

      <div className="compare-footer">
        <span>ลากซ้าย–ขวาเพื่อเทียบภาพ</span>
        <span>Satellite source window: {event.sourceWindow?.join(", ") || "—"}</span>
      </div>
    </div>
  );
}
