import { useState, useRef, useEffect } from "react";

interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function ImageCompare({
  droneUrl,
  droneBounds,
  satelliteUrl,
  satelliteBounds,
}: {
  droneUrl: string | null;
  droneBounds: number[] | null;
  satelliteUrl: string | null;
  satelliteBounds: number[] | null;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  
  if (!droneUrl && !satelliteUrl) return <div className="preview-empty">ไม่มีภาพสำหรับเปรียบเทียบ</div>;

  let uW = 0, uS = 0, uE = 1, uN = 1;
  const hasBoth = droneUrl && droneBounds && satelliteUrl && satelliteBounds;
  
  if (hasBoth) {
    const [dw, ds, de, dn] = droneBounds;
    const [sw, ss, se, sn] = satelliteBounds;
    uW = Math.min(dw, sw);
    uS = Math.min(ds, ss);
    uE = Math.max(de, se);
    uN = Math.max(dn, sn);
  } else if (droneUrl && droneBounds) {
    [uW, uS, uE, uN] = droneBounds;
  } else if (satelliteUrl && satelliteBounds) {
    [uW, uS, uE, uN] = satelliteBounds;
  }

  const uWidth = uE - uW;
  const uHeight = uN - uS;

  const getStyle = (bounds: number[] | null) => {
    if (!bounds || uWidth === 0 || uHeight === 0) return { display: 'none' };
    const [w, s, e, n] = bounds;
    return {
      left: `${((w - uW) / uWidth) * 100}%`,
      top: `${((uN - n) / uHeight) * 100}%`,
      width: `${((e - w) / uWidth) * 100}%`,
      height: `${((n - s) / uHeight) * 100}%`,
      position: 'absolute' as const,
      objectFit: 'fill' as const,
    };
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setSliderPos(x * 100);
  };

  return (
    <div 
      className="image-compare-container"
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        overflow: 'hidden',
        background: '#f1f5f9',
        cursor: 'crosshair',
        borderRadius: '8px'
      }}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      {/* Background (Satellite) */}
      {satelliteUrl && (
         <img 
            src={satelliteUrl} 
            style={getStyle(satelliteBounds)} 
            alt="Satellite" 
            draggable={false}
         />
      )}
      
      {/* Foreground (Drone) clipped */}
      {droneUrl && (
         <div 
           style={{
             position: 'absolute',
             top: 0,
             left: 0,
             right: 0,
             bottom: 0,
             clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
           }}
         >
           <img 
              src={droneUrl} 
              style={getStyle(droneBounds)} 
              alt="Drone" 
              draggable={false}
           />
         </div>
      )}
      
      {/* Slider Handle */}
      {hasBoth && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${sliderPos}%`,
          width: '2px',
          background: '#3b82f6',
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            background: 'white',
            borderRadius: '50%',
            border: '2px solid #3b82f6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} />
        </div>
      )}
      
      {/* Labels */}
      {droneUrl && <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>DRONE</div>}
      {satelliteUrl && <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>SATELLITE</div>}
    </div>
  );
}
