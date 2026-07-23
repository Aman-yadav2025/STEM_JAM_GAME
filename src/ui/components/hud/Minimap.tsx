import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../../state/store';

export const Minimap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(15);

  const zoomIn = () => setZoom((prev) => Math.max(2, prev - 2));
  const zoomOut = () => setZoom((prev) => Math.min(150, prev + 5));

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderMinimap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(6, 9, 19, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Grid
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 20; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 20; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Crosshairs
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY);
      ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
      ctx.stroke();

      // 2. Fetch State
      const state = useStore.getState();
      const ship = state.ship;
      const bodies = state.bodies || [];
      const trajectoryPath = state.trajectoryPath || [];
      const navigationPath = state.navigationPath || [];
      const targetName = state.navigationTargetName;

      if (!ship) {
        animationId = requestAnimationFrame(renderMinimap);
        return;
      }

      // 3. Coordinate Conversion (X-Z Plane)
      const toPixelSpace = (worldX: number, worldZ: number) => {
        const localX = (worldX - ship.position.x) / zoom;
        const localZ = (worldZ - (ship.position.z ?? 0)) / zoom;
        return {
          x: centerX + localX,
          y: centerY - localZ, // Mapping Z to Y axis
        };
      };

      const sun = bodies.find((b) => b.name === 'Sun') || { position: { x: 0, y: 0, z: 0 } };
      const sunMapPos = toPixelSpace(sun.position.x, sun.position.z ?? 0);

      // 4. Orbit Lines
      bodies.forEach((body) => {
        if (body.name === 'Sun' || body.name === 'Moon') return;
        const dx = body.position.x - sun.position.x;
        const dz = (body.position.z ?? 0) - (sun.position.z ?? 0);
        const orbitRadius = Math.hypot(dx, dz);
        const pixelOrbitRadius = orbitRadius / zoom;

        ctx.beginPath();
        ctx.arc(sunMapPos.x, sunMapPos.y, pixelOrbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 5. Trajectory
      if (trajectoryPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        trajectoryPath.forEach((p, index) => {
          const pos = toPixelSpace(p.x, p.z ?? 0);
          if (index === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.stroke();
      }

      // 5b. Navigation Path
      if (navigationPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)'; // Green
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // Dotted line
        navigationPath.forEach((p, index) => {
          const pos = toPixelSpace(p.x, p.z ?? 0);
          if (index === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 6. Bodies
      bodies.forEach((body) => {
        const pos = toPixelSpace(body.position.x, body.position.z ?? 0);
        const padding = 8;
        if (pos.x >= padding && pos.x <= canvas.width - padding && pos.y >= padding && pos.y <= canvas.height - padding) {
          ctx.beginPath();
          const dotRadius = Math.max(3, (body.radius ?? 1000) / (zoom * 0.6));

          // Draw target pointer
          if (body.name === targetName) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dotRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#4ade80'; // Green
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = body.color || '#ffffff';
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(body.name.toUpperCase(), pos.x, pos.y - dotRadius - 5);
        }
      });

      // 7. Ship (Fixed in center)
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffcc';
      ctx.fill();

      // Heading vector
      const rot = (ship as any).rotation?.z ?? Math.PI / 2;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(rot) * 12, centerY - Math.sin(rot) * 12);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 255, 204, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      animationId = requestAnimationFrame(renderMinimap);
    };

    renderMinimap();
    return () => cancelAnimationFrame(animationId);
  }, [zoom]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>TACTICAL RADAR (X-Z)</span>
        <span style={styles.zoomText}>RANGE: {zoom * 10}K KM</span>
      </div>
      <canvas ref={canvasRef} width={350} height={250} style={styles.canvas} />
      <div style={styles.buttonGroup}>
        <button onClick={zoomIn} style={styles.btn} title="Zoom In">+</button>
        <button onClick={zoomOut} style={styles.btn} title="Zoom Out">−</button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute', bottom: '0', right: '0', zIndex: 999,
    display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(6, 9, 19, 0.85)',
    border: '1px solid #1e272e', borderRadius: '4px', padding: '0',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', fontFamily: 'monospace',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px' },
  title: { color: '#00ffcc', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' },
  zoomText: { color: '#7f8c8d', fontSize: '9px' },
  canvas: { borderRadius: '0px', border: '1px solid rgba(0, 255, 204, 0.15)' },
  buttonGroup: { display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '8px', padding: '0 8px 8px 8px' },
  btn: {
    flex: 1, backgroundColor: '#1e272e', border: '1px solid #34495e',
    color: '#00ffcc', padding: '4px 0', cursor: 'pointer', borderRadius: '4px',
    fontSize: '14px', fontWeight: 'bold', transition: 'all 0.15s ease',
  },
};