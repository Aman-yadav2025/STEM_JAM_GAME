import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../state/store';

export const Minimap: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(15);

  const zoomIn = () => setZoom((prev) => Math.max(2, prev - 2));
  const zoomOut = () => setZoom((prev) => Math.min(150, prev + 5));

  // Canvas Radar Rendering Loop
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

  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies || []);
  const shipPos = ship?.position || { x: 0, y: 0, z: 0 };

  return (
    <>
      {/* Compact Bottom-Right Radar Widget Wrapper with Framer Motion */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative w-[370px] bg-[#07121d]/90 rounded-2xl border border-cyan-400/40 p-3 shadow-[0_0_25px_rgba(79,180,232,0.25)] backdrop-blur-xl flex flex-col justify-between group font-mono"
        >
          {/* Tactical Grid Background & Radar Sweep */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#07121d]/80 to-[#03070c] pointer-events-none rounded-2xl" />
          
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-mono tracking-[0.2em] text-cyan-400 mb-2 px-1">
            <span>TACTICAL RADAR (X-Z)</span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 text-[9px]">RANGE: {zoom * 10}K KM</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
          </div>

          {/* HTML5 Canvas Viewport */}
          <div className="relative z-10 flex items-center justify-center my-1 overflow-hidden rounded border border-cyan-500/20">
            <canvas ref={canvasRef} width={350} height={220} className="block" />
          </div>

          {/* Controls & Footer */}
          <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-cyan-500/20 px-1">
            <div className="flex gap-2 w-28">
              <button onClick={zoomIn} style={styles.btn} title="Zoom In">+</button>
              <button onClick={zoomOut} style={styles.btn} title="Zoom Out">−</button>
            </div>
            <button 
              onClick={() => setIsExpanded(true)}
              className="text-[9px] font-mono text-cyan-400/80 hover:text-cyan-300 transition cursor-pointer tracking-wider"
            >
              EXPAND STREMAP [M] ▲
            </button>
          </div>
        </motion.div>
      </div>

      {/* Expanded Full-Screen Tactical Starmap Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-12 z-50 bg-[#03070c]/90 rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)] backdrop-blur-2xl flex flex-col overflow-hidden pointer-events-auto font-mono"
          >
            {/* Top Bar */}
            <div className="px-6 py-4 border-b border-cyan-500/30 flex items-center justify-between bg-cyan-950/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-cyan-400 rounded-sm shadow-[0_0_10px_#22d3ee]" />
                <h2 className="text-cyan-300 text-sm tracking-[0.25em] font-bold">LONG-RANGE NAVIGATION & STARMAP MATRIX</h2>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs tracking-widest rounded-xl transition active:scale-95 cursor-pointer"
              >
                CLOSE [ESC]
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-black pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

              <div className="relative w-full h-full max-w-4xl max-h-[600px] border border-cyan-500/20 rounded-2xl flex items-center justify-center bg-[#050b14]/60 p-6">
                <div className="text-center space-y-3">
                  <div className="text-cyan-400 text-xs tracking-[0.3em] uppercase animate-pulse">ACTIVE SECTOR: SOL SYSTEM</div>
                  <div className="text-slate-400 text-[11px] tracking-wider">Tracking {bodies.length} celestial bodies in real-time telemetry grid</div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-left max-h-64 overflow-y-auto p-2">
                    {bodies.map((b, i) => (
                      <div key={b.name || i} className="bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-xl text-[10px] text-cyan-300">
                        <div className="font-bold text-cyan-200">{b.name}</div>
                        <div className="text-cyan-400/70 text-[9px]">X: {Math.round(b.position?.x ?? 0)} | Z: {Math.round(b.position?.z ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Telemetry Bar */}
            <div className="px-6 py-3 border-t border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between text-xs text-cyan-400/80">
              <span>SYSTEM STATUS: ONLINE // SECURE UPLINK</span>
              <span>COORDINATES: X: {Math.round(shipPos.x)} | Y: {Math.round(shipPos.y ?? 0)} | Z: {Math.round(shipPos.z ?? 0)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  btn: {
    flex: 1, backgroundColor: '#1e272e', border: '1px solid #34495e',
    color: '#00ffcc', padding: '2px 0', cursor: 'pointer', borderRadius: '4px',
    fontSize: '12px', fontWeight: 'bold', transition: 'all 0.15s ease',
  },
};