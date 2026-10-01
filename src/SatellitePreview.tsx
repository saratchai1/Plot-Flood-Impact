import { useEffect, useMemo, useRef, useState } from "react";
import { fromUrl } from "geotiff";
import type { SatelliteScene } from "./types";

type NumericRaster = ArrayLike<number>;

function finiteValues(data: NumericRaster, transform = (value: number) => value) {
  const values: number[] = [];
  const step = Math.max(1, Math.floor(data.length / 20000));
  for (let index = 0; index < data.length; index += step) {
    const value = transform(Number(data[index]));
    if (Number.isFinite(value)) values.push(value);
  }
  values.sort((a, b) => a - b);
  return values;
}

function stretch(
  data: NumericRaster,
  transform = (value: number) => value
): [number, number] {
  const values = finiteValues(data, transform);
  if (!values.length) return [0, 1];
  const low = values[Math.floor(values.length * 0.02)] ?? values[0];
  const high =
    values[Math.min(values.length - 1, Math.floor(values.length * 0.98))] ??
    values[values.length - 1];
  return low < high ? [low, high] : [low, low + 1];
}

function byte(value: number, low: number, high: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(((value - low) / (high - low)) * 255)));
}

async function readBand(url: string, size: number) {
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  const rasters = await image.readRasters({
    width: size,
    height: size,
    resampleMethod: "bilinear"
  });
  return rasters[0] as NumericRaster;
}

async function readVisual(url: string, size: number) {
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  const samples = Math.min(3, image.getSamplesPerPixel());
  const selected = Array.from({ length: samples }, (_, index) => index);
  const rasters = await image.readRasters({
    samples: selected,
    width: size,
    height: size,
    resampleMethod: "bilinear"
  });
  return Array.from(rasters).slice(0, samples) as NumericRaster[];
}

function drawChannels(
  canvas: HTMLCanvasElement,
  channels: NumericRaster[],
  transforms?: Array<(value: number) => number>
) {
  const size = Math.round(Math.sqrt(channels[0]?.length || 0));
  if (!size) throw new Error("EMPTY_RASTER");

  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");

  const image = context.createImageData(size, size);
  const ranges = channels.map((channel, index) =>
    stretch(channel, transforms?.[index])
  );

  for (let i = 0; i < size * size; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const channel = channels[Math.min(c, channels.length - 1)];
      const transform = transforms?.[Math.min(c, (transforms?.length || 1) - 1)];
      const raw = Number(channel?.[i] ?? 0);
      const value = transform ? transform(raw) : raw;
      const [low, high] = ranges[Math.min(c, ranges.length - 1)];
      image.data[i * 4 + c] = byte(value, low, high);
    }
    image.data[i * 4 + 3] = 255;
  }

  context.putImageData(image, 0, 0);
}

function sarTransform(value: number) {
  return 10 * Math.log10(Math.max(value, 1e-8));
}

export function SatellitePreview({ scene }: { scene: SatelliteScene | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  const rawLinks = useMemo(() => {
    if (!scene) return [];
    return Object.entries(scene.assets)
      .filter(([, asset]) => Boolean(asset.href))
      .slice(0, 8);
  }, [scene]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!scene || !canvasRef.current) {
        setState("idle");
        return;
      }
      setState("loading");
      setMessage("");

      try {
        const size = 640;
        const assets = scene.assets;

        if (scene.collection === "sentinel-1") {
          if (!assets.vv?.href && !assets.vh?.href) {
            throw new Error("ไม่พบ VV/VH COG ใน scene นี้");
          }

          const vv = assets.vv?.href ? await readBand(assets.vv.href, size) : null;
          const vh = assets.vh?.href ? await readBand(assets.vh.href, size) : null;
          if (cancelled) return;

          if (vv && vh) {
            drawChannels(
              canvasRef.current,
              [vv, vh, vv],
              [sarTransform, sarTransform, sarTransform]
            );
          } else {
            const band = vv || vh;
            if (!band) throw new Error("SAR band unavailable");
            drawChannels(
              canvasRef.current,
              [band, band, band],
              [sarTransform, sarTransform, sarTransform]
            );
          }
        } else if (assets.visual?.href) {
          const channels = await readVisual(assets.visual.href, size);
          if (cancelled) return;
          if (channels.length >= 3) {
            drawChannels(canvasRef.current, channels.slice(0, 3));
          } else {
            drawChannels(canvasRef.current, [channels[0], channels[0], channels[0]]);
          }
        } else if (
          assets.red?.href &&
          assets.green?.href &&
          assets.blue?.href
        ) {
          const [red, green, blue] = await Promise.all([
            readBand(assets.red.href, size),
            readBand(assets.green.href, size),
            readBand(assets.blue.href, size)
          ]);
          if (cancelled) return;
          drawChannels(canvasRef.current, [red, green, blue]);
        } else {
          throw new Error("scene นี้ไม่มี RGB COG ที่รองรับ browser renderer");
        }

        if (!cancelled) setState("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(
          error instanceof Error ? error.message : "render satellite scene ไม่สำเร็จ"
        );
        setState("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [scene]);

  if (!scene) {
    return <div className="preview-empty">เลือก scene จาก timeline เพื่อเปรียบเทียบ</div>;
  }

  return (
    <div className="satellite-preview">
      {scene.previewUrl && state === "error" ? (
        <img
          className="comparison-image"
          src={scene.previewUrl}
          alt={"Satellite quicklook " + scene.id}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className={"comparison-canvas " + (state === "ready" ? "is-ready" : "")}
        />
      )}

      {state === "loading" && (
        <div className="preview-status">กำลังอ่าน Cloud Optimized GeoTIFF…</div>
      )}

      {state === "error" && (
        <div className="preview-error">
          <strong>COG preview ยังเปิดไม่ได้</strong>
          <span>{message}</span>
          {scene.previewUrl && <span>แสดง provider quicklook แทน</span>}
        </div>
      )}

      <div className="asset-links">
        {rawLinks.map(([key, asset]) => (
          <a
            key={key}
            href={asset.href}
            target="_blank"
            rel="noreferrer"
          >
            {key}
          </a>
        ))}
      </div>
    </div>
  );
}
