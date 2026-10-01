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
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPreview(null);
  }, [scene]);

  if (!scene) {
    return <div className="preview-empty">เลือก scene จาก timeline เพื่อเปรียบเทียบ</div>;
  }

  const previews = scene.previewUrls || {};
  let defaultPreview = previews.rgb || previews.sar || scene.previewUrl;
  
  if (selectedPreview && previews[selectedPreview]) {
    defaultPreview = previews[selectedPreview];
  }

  const hasPreviews = Object.keys(previews).length > 0;

  return (
    <div className="satellite-preview">
      {defaultPreview ? (
        <img
          className="comparison-image"
          src={defaultPreview}
          alt={"Satellite preview " + scene.id}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div className="preview-empty">
          ไม่มี preview image
        </div>
      )}

      {hasPreviews && (
        <div className="preview-selector" style={{ padding: '8px', display: 'flex', gap: '8px', background: '#f5f5f5' }}>
          {Object.keys(previews).map(key => (
            <button 
              key={key} 
              onClick={() => setSelectedPreview(key)}
              style={{ fontWeight: selectedPreview === key ? 'bold' : 'normal' }}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="asset-links">
        {scene.sourceUrls && scene.sourceUrls.length > 0 ? (
          scene.sourceUrls.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Raw Asset {idx+1}
            </a>
          ))
        ) : (
           <span style={{ fontSize: '12px', color: '#666' }}>Local caching active</span>
        )}
      </div>
    </div>
  );
}
