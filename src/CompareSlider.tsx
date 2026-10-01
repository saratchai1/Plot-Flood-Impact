import { useMemo, useState } from "react";
import type { DroneRecord, UploadedFloodEvent } from "./types";

type Bounds = [number, number, number, number];

function readBounds(value: unknown): Bounds | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const numbers = value.map(Number);
  if (!numbers.every(Number.isFinite)) return null;
  const [west, south, east, north] = numbers;
  if (!(west < east && south < north)) return null;
  return numbers as Bounds;
}

function readPositive(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function droneGeo(drone: DroneRecord) {
  const meta = drone.meta;
  if (!meta || typeof meta !== "object") return null;
  const bounds = readBounds(meta.bounds);
  const sourceWidth = readPositive(meta.sourceWidth);
  const sourceHeight = readPositive(meta.sourceHeight);
  if (!bounds || !sourceWidth || !sourceHeight) return null;
  if (meta.georeferenced === false || meta.isNorthUp === false) return null;
  return { bounds, sourceWidth, sourceHeight };
}

function intersects(a: Bounds, b: Bounds) {
  return !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3]);
}

function droneCropWindow(
  droneBounds: Bounds,
  targetBounds: Bounds,
  sourceWidth: number,
  sourceHeight: number
) {
  const [dw, ds, de, dn] = droneBounds;
  const [tw, ts, te, tn] = targetBounds;
  const fullWidth = de - dw;
  const fullHeight = dn - ds;

  return {
    x: ((tw - dw) / fullWidth) * sourceWidth,
    y: ((dn - tn) / fullHeight) * sourceHeight,
    width: ((te - tw) / fullWidth) * sourceWidth,
    height: ((tn - ts) / fullHeight) * sourceHeight
  };
}

function SatelliteCrop({
  event,
  plotCode
}: {
  event: UploadedFloodEvent;
  plotCode: string;
}) {
  if (!event.spriteUrl || !event.cell) return null;
  return (
    <svg
      className="compare-media"
      viewBox={`0 0 ${event.cell[2]} ${event.cell[3]}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={"ภาพดาวเทียม " + plotCode}
    >
      <image
        href={event.spriteUrl}
        x={-event.cell[0]}
        y={-event.cell[1]}
        width={event.spriteWidth}
        height={event.spriteHeight}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

function DroneCrop({
  drone,
  plotCode,
  targetBounds
}: {
  drone: DroneRecord;
  plotCode: string;
  targetBounds: Bounds;
}) {
  const geo = droneGeo(drone);
  if (!geo || !drone.previewUrl) return null;
  const crop = droneCropWindow(
    geo.bounds,
    targetBounds,
    geo.sourceWidth,
    geo.sourceHeight
  );

  return (
    <svg
      className="compare-media"
      viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={"ภาพโดรนที่จัดพิกัดแล้ว " + plotCode}
    >
      <image
        href={drone.previewUrl}
        x="0"
        y="0"
        width={geo.sourceWidth}
        height={geo.sourceHeight}
        preserveAspectRatio="none"
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
  const geo = useMemo(() => droneGeo(drone), [drone]);
  const targetBounds = event.targetBoundsWgs84;

  if (!targetBounds || !event.sourceWindow) {
    return (
      <div className="preview-empty no-satellite">
        <strong>ไม่สามารถยืนยันกรอบพิกัดภาพดาวเทียมได้</strong>
        <span>จึงไม่แสดง slider เพื่อป้องกันการเทียบภาพผิดตำแหน่ง</span>
      </div>
    );
  }

  if (!geo) {
    return (
      <div className="alignment-unavailable">
        {drone.previewUrl && (
          <img
            className="alignment-preview"
            src={drone.previewUrl}
            alt={"ภาพโดรน " + plotCode}
          />
        )}
        <div className="preview-empty">
          <strong>ภาพโดรนแปลง {plotCode} ไม่มี georeference ที่ใช้จัดแนวได้</strong>
          <span>จึงไม่แสดง slider เพื่อไม่ให้ภาพคนละ extent ถูกซ้อนกัน</span>
        </div>
      </div>
    );
  }

  if (!intersects(geo.bounds, targetBounds)) {
    return (
      <div className="preview-empty no-satellite">
        <strong>ภาพโดรนและภาพดาวเทียมไม่มีพื้นที่ซ้อนทับกัน</strong>
        <span>จึงไม่แสดง slider สำหรับแปลง {plotCode}</span>
      </div>
    );
  }

  const aspectRatio = event.sourceWindow[2] / event.sourceWindow[3];

  return (
    <div className="compare-shell">
      <div
        className="compare-stage"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <div className="compare-layer compare-drone">
          <DroneCrop
            drone={drone}
            plotCode={plotCode}
            targetBounds={targetBounds}
          />
          <span className="compare-label compare-label-left">DRONE · ALIGNED</span>
        </div>

        <div
          className="compare-layer compare-satellite"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <SatelliteCrop event={event} plotCode={plotCode} />
          <span className="compare-label compare-label-right">
            SATELLITE · 29/09/2026
          </span>
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
          aria-label="เลื่อนเพื่อเปรียบเทียบภาพโดรนกับภาพดาวเทียมที่จัดพิกัดแล้ว"
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>

      <div className="compare-footer">
        <span>จัดสองภาพให้อยู่ใน geographic extent เดียวกันแล้ว</span>
        <span>
          WGS84: {targetBounds.map((value) => value.toFixed(5)).join(", ")}
        </span>
      </div>
    </div>
  );
}
