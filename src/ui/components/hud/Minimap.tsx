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
      ctx.fillStyle = 'rgba(6, 9, 19, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const center = canvas.width / 2;

      // 1. Tactical Radar Scan Grid Lines
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, center * 0.35, 0, Math.PI * 2);
      ctx.arc(center, center, center * 0.70, 0, Math.PI * 2);
      ctx.arc(center, center, center * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(52, 152, 219, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, center); ctx.lineTo(canvas.width, center);
      ctx.moveTo(center, 0); ctx.lineTo(center, canvas.height);
      ctx.stroke();

      // 2. Fetch State Snapshots
      const state = useStore.getState();
      const ship = state.ship;
      const bodies = state.bodies;

      if (!ship) {
        animationId = requestAnimationFrame(renderMinimap);
        return;
      }

      const shipX = ship.position.x;
      const shipY = ship.position.y;

      const toPixelSpace = (worldX: number, worldY: number) => {
        const localX = (worldX - shipX) / zoom;
        const localY = (worldY - shipY) / zoom;
        return {
          x: center + localX,
          y: center - localY, 
        };
      };

      // Find the Sun to use as the absolute center point for all orbits
      const sun = bodies.find((b) => b.name === 'Sun') || { position: { x: 0, y: 0 } };
      const sunMapPos = toPixelSpace(sun.position.x, sun.position.y);

      // 3. LAYER 1: Draw Planetary Orbit Lines (Drawn first so they sit underneath the planet dots)
      bodies.forEach((body) => {
        if (body.name === 'Sun' || body.name === 'Moon') return; // Skip sun and moons

        // Calculate actual distance from this planet to the Sun
        const dx = body.position.x - sun.position.x;
        const dy = body.position.y - sun.position.y;
        const orbitRadius = Math.hypot(dx, dy);

        // Convert the world distance down to canvas pixels based on zoom level
        const pixelOrbitRadius = orbitRadius / zoom;

        ctx.beginPath();
        ctx.arc(sunMapPos.x, sunMapPos.y, pixelOrbitRadius, 0, Math.PI * 2);
        
        // Styled as a clean, high-tech faint blue dashed line
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.25)';
        ctx.lineWidth = 0.75;
        ctx.setLineDash([3, 5]); // 3px line, 5px space gap
        ctx.stroke();
      });
      ctx.setLineDash([]); // Reset line dashes back to solid for the rest of the layout

      // 4. LAYER 2: Render Celestial Body Icons & Labels
      bodies.forEach((body) => {
        const pos = toPixelSpace(body.position.x, body.position.y);
        const distFromCenter = Math.hypot(pos.x - center, pos.y - center);
        
        // Render check to clip text/dots precisely inside the radar viewport
        if (distFromCenter < center - 6) {
          ctx.beginPath();
          const dotRadius = Math.max(3, body.radius / (zoom * 0.6));
          ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = body.color || '#ffffff';
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(body.name.toUpperCase(), pos.x, pos.y - dotRadius - 5);
        }
      });

      // 5. LAYER 3: Draw Player Spacecraft Core
      ctx.beginPath();
      ctx.arc(center, center, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffcc';
      ctx.fill();

      // Heading Vector Indicator Arrow (Asserted to bypass TypeScript error)
      const headingAngle = (ship as any).rotation?.z !== undefined ? (ship as any).rotation.z : Math.PI / 2;
      
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(
        center + Math.cos(headingAngle) * 12,
        center - Math.sin(headingAngle) * 12
      );
      ctx.stroke();

      // Radar Boundary Frame Clip Trim Ring
      ctx.strokeStyle = '#1e272e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center, center, center - 1, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(renderMinimap);
    };

    renderMinimap();
    return () => cancelAnimationFrame(animationId);
  }, [zoom]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>TACTICAL RADAR</span>
        <span style={styles.zoomText}>RANGE: {zoom * 10}K KM</span>
      </div>

      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        style={styles.canvas}
      />

      <div style={styles.buttonGroup}>
        <button onClick={zoomIn} style={styles.btn} title="Zoom In">+</button>
        <button onClick={zoomOut} style={styles.btn} title="Zoom Out">−</button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(6, 9, 19, 0.85)',
    border: '1px solid #1e272e',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    color: '#00ffcc',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  zoomText: {
    color: '#7f8c8d',
    fontSize: '9px',
  },
  canvas: {
    borderRadius: '50%', 
    border: '1px solid rgba(0, 255, 204, 0.2)',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
    gap: '8px',
  },
  btn: {
    flex: 1,
    backgroundColor: '#1e272e',
    border: '1px solid #34495e',
    color: '#00ffcc',
    padding: '4px 0',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.15s ease',
  },
};