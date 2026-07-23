import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../../state/store';

export const Minimap: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(15);
  const [largeZoom, setLargeZoom] = useState<number>(35);
  const [selectedBodyName, setSelectedBodyName] = useState<string | null>(null);

  const setNavigationTarget = useStore(s => s.setNavigationTarget);
  const fastTravelToTarget = useStore(s => s.fastTravelToTarget);
  const setAutopilotTarget = useStore(s => s.setAutopilotTarget);
  const setAutopilotEnabled = useStore(s => s.setAutopilotEnabled);

  const zoomIn = () => setZoom((prev) => Math.max(2, prev - 2));
  const zoomOut = () => setZoom((prev) => Math.min(150, prev + 5));

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key.toLowerCase() === 'm') {
        setIsExpanded(prev => !prev);
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

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

  // Large Canvas Radar Rendering Loop
  useEffect(() => {
    let animationId: number;
    const canvas = largeCanvasRef.current;
    if (!canvas || !isExpanded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLargeMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(4, 9, 15, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      const state = useStore.getState();
      const ship = state.ship;
      const bodies = state.bodies || [];
      const navigationPath = state.navigationPath || [];
      const navTargetName = state.navigationTargetName;
      const sun = bodies.find((b) => b.name === 'Sun') || { position: { x: 0, y: 0, z: 0 } };

      if (!ship) {
        animationId = requestAnimationFrame(renderLargeMap);
        return;
      }

      const toPixelSpace = (worldX: number, worldZ: number) => {
        const localX = (worldX - sun.position.x) / largeZoom;
        const localZ = (worldZ - (sun.position.z ?? 0)) / largeZoom;
        return {
          x: centerX + localX,
          y: centerY - localZ,
        };
      };

      const sunMapPos = toPixelSpace(sun.position.x, sun.position.z ?? 0);

      // Orbits
      bodies.forEach((body) => {
        if (body.name === 'Sun' || body.name === 'Moon') return;
        const dx = body.position.x - sun.position.x;
        const dz = (body.position.z ?? 0) - (sun.position.z ?? 0);
        const orbitRadius = Math.hypot(dx, dz);
        const pixelOrbitRadius = orbitRadius / largeZoom;

        ctx.beginPath();
        ctx.arc(sunMapPos.x, sunMapPos.y, pixelOrbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Nav path
      if (navigationPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 5]);
        navigationPath.forEach((p, index) => {
          const pos = toPixelSpace(p.x, p.z ?? 0);
          if (index === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Bodies
      bodies.forEach((body) => {
        const pos = toPixelSpace(body.position.x, body.position.z ?? 0);
        
        const isSelected = body.name === selectedBodyName;
        const isNavTarget = body.name === navTargetName;
        
        const dotRadius = Math.max(isSelected ? 6 : 4, (body.radius ?? 1000) / (largeZoom * 0.8));

        if (isNavTarget) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, dotRadius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, dotRadius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = body.color || '#ffffff';
        ctx.fill();
        
        ctx.fillStyle = isSelected ? '#22d3ee' : 'rgba(255, 255, 255, 0.8)';
        ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(body.name.toUpperCase(), pos.x, pos.y - dotRadius - 6);
      });

      // Ship
      const shipPos = toPixelSpace(ship.position.x, ship.position.z ?? 0);
      ctx.beginPath();
      ctx.arc(shipPos.x, shipPos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#4ade80'; // Ship is green in macro
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('SHIP', shipPos.x, shipPos.y - 8);

      animationId = requestAnimationFrame(renderLargeMap);
    };

    renderLargeMap();
    return () => cancelAnimationFrame(animationId);
  }, [isExpanded, largeZoom, selectedBodyName]);

  const ship = useStore((state) => state.ship);
  const bodies = useStore((state) => state.bodies || []);
  const shipPos = ship?.position || { x: 0, y: 0, z: 0 };
  const navTargetName = useStore(s => s.navigationTargetName);
  
  const selectedBodyDetails = bodies.find(b => b.name === selectedBodyName);

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
                CLOSE 
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative flex overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-black pointer-events-none" />
              
              {/* Left Sidebar */}
              <div className="w-80 border-r border-cyan-500/30 bg-[#02050A]/80 p-4 flex flex-col h-full z-10 relative">
                <h3 className="text-cyan-400 text-[10px] tracking-[0.2em] font-bold mb-3 border-b border-cyan-500/30 pb-2">CELESTIAL DIRECTORY</h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                  {bodies.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => setSelectedBodyName(b.name)}
                      className={`w-full text-left px-3 py-2 rounded border transition text-xs font-bold tracking-widest uppercase flex items-center justify-between ${
                        selectedBodyName === b.name 
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || '#fff' }} />
                        {b.name}
                      </div>
                      {navTargetName === b.name && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">NAV</span>}
                    </button>
                  ))}
                </div>

                {/* Details Panel */}
                {selectedBodyDetails ? (
                  <div className="mt-4 p-3 border border-cyan-500/30 bg-cyan-950/30 rounded-xl">
                    <h4 className="text-cyan-300 font-bold tracking-widest uppercase mb-2 border-b border-cyan-500/20 pb-1">{selectedBodyDetails.name}</h4>
                    <div className="space-y-1 text-[10px] text-cyan-100/70 mb-4">
                      <div className="flex justify-between"><span>RADIUS:</span> <span>{selectedBodyDetails.radius} km</span></div>
                      <div className="flex justify-between"><span>MASS:</span> <span>{(selectedBodyDetails.mass ?? 0).toExponential(2)} kg</span></div>
                      {shipPos && (
                        <div className="flex justify-between"><span>DISTANCE:</span> <span>{Math.round(
                          Math.hypot(selectedBodyDetails.position.x - shipPos.x, (selectedBodyDetails.position.z ?? 0) - (shipPos.z ?? 0))
                        ).toLocaleString()} km</span></div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => setNavigationTarget(selectedBodyDetails.name)}
                        className="w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-300 text-[10px] uppercase font-bold tracking-widest rounded"
                      >
                        Set Nav Target
                      </button>
                      <button 
                        onClick={() => { setAutopilotTarget(selectedBodyDetails.name); setAutopilotEnabled(true); setIsExpanded(false); }}
                        className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-amber-300 text-[10px] uppercase font-bold tracking-widest rounded"
                      >
                        Engage Autopilot
                      </button>
                      <button 
                        onClick={() => { fastTravelToTarget(selectedBodyDetails.name); setIsExpanded(false); }}
                        className="w-full py-1.5 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/50 text-purple-300 text-[10px] uppercase font-bold tracking-widest rounded"
                        title="Debug: Instantly warp to orbit"
                      >
                        Fast Travel (Debug)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 border border-dashed border-cyan-500/30 text-cyan-500/50 text-xs text-center rounded-xl">
                    Select a celestial body to view telemetry and plot courses.
                  </div>
                )}
              </div>

              {/* Large Map Area */}
              <div className="flex-1 relative bg-[#02050A]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
                <canvas ref={largeCanvasRef} width={800} height={600} className="w-full h-full object-cover" />
                
                {/* Map Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                  <button onClick={() => setLargeZoom(z => Math.max(2, z - 5))} className="w-8 h-8 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded hover:bg-cyan-500/30 flex items-center justify-center font-bold text-lg">+</button>
                  <button onClick={() => setLargeZoom(z => z + 5)} className="w-8 h-8 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded hover:bg-cyan-500/30 flex items-center justify-center font-bold text-lg">−</button>
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