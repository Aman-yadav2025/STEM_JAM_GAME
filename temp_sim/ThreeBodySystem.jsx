import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/* ============================================================================
 * PHYSICS LAYER
 *
 * Same foundation as the two-body version: each planet is a Spacecraft-
 * shaped object { position, velocity, mass, fuel: 0, maxFuel: 0, heading },
 * because CelestialBody (constants.ts) has no velocity field and can't
 * mutually orbit anything on its own.
 *
 * Gravity is still exactly gravity.ts's accelFromBody/totalAccelNBody,
 * unmodified — it already sums over an arbitrary bodies[] array, so going
 * from two planets to three needed zero changes there. `stepNBody` (the
 * live mutual integrator, velocity-Verlet, same reasoning as
 * trajectoryPredictor.ts) is also unchanged — it was already written for N
 * bodies, not hardcoded to two.
 *
 * The one new piece is the *initial condition*: three comparable masses
 * don't have a generic stable starting configuration the way a two-body
 * circular orbit does — most three-body setups are chaotic from t=0. So
 * this uses Lagrange's own exact equilateral-triangle solution: three
 * masses (any masses) at the corners of an equilateral triangle, each
 * moving in a circle around the common barycenter at the same angular
 * rate ω = sqrt(G * M_total / s^3), stay in that rigid rotating triangle
 * forever — in principle. It's the same "equilateral triangle" geometry
 * as the L4/L5 points in lagrange.ts, just generalized from "two heavy
 * bodies + one massless test point" to "three bodies that are all
 * dynamically real." One honest caveat: unlike L4/L5 in a restricted
 * (test-mass) system, this three-comparable-mass equilateral solution is
 * dynamically UNSTABLE — it's an exact solution, but tiny numerical drift
 * compounds over time, so don't be surprised if the triangle slowly
 * deforms after a bunch of orbits. That's real physics, not a bug.
 * ==========================================================================*/

// ---- vector3.ts -----------------------------------------------------------
class Vector3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  add(v) { return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z); }
  scale(s) { return new Vector3(this.x * s, this.y * s, this.z * s); }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3(0, 0, 0);
    return this.scale(1 / mag);
  }
  subtract(v) { return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z); }
  distanceTo(v) { return this.subtract(v).magnitude(); }
  static zero() { return new Vector3(0, 0, 0); }
  clone() { return new Vector3(this.x, this.y, this.z); }
}

// ---- constants.ts -----------------------------------------------------------
const G = 6000;
const CONSTANT_DT = 1 / 120;

// ---- gravity.ts ---------------------------------------------------------------
function accelFromBody(position, body) {
  const delta = body.position.subtract(position);
  const r = delta.magnitude();
  if (r === 0) return Vector3.zero();
  const aMag = (G * body.mass) / (r * r);
  return delta.normalize().scale(aMag);
}
function totalAccelNBody(position, bodies) {
  let total = Vector3.zero();
  for (const body of bodies) total = total.add(accelFromBody(position, body));
  return total;
}

// ---- live mutual n-body integrator (velocity Verlet — unchanged from the
// two-body version; it was already written generically for N bodies) ----
function stepNBody(bodies, dt) {
  const a0 = bodies.map((b) => totalAccelNBody(b.position, bodies));
  const newPositions = bodies.map((b, i) =>
    b.position.add(b.velocity.scale(dt)).add(a0[i].scale(0.5 * dt * dt))
  );
  const atNewPositions = bodies.map((b, i) => ({ ...b, position: newPositions[i] }));
  const a1 = atNewPositions.map((b, i) => totalAccelNBody(newPositions[i], atNewPositions));
  return bodies.map((b, i) => ({
    ...b,
    position: newPositions[i],
    velocity: b.velocity.add(a0[i].add(a1[i]).scale(0.5 * dt)),
  }));
}

function forecastOrbits(bodies, steps, dt) {
  let state = bodies.map((b) => ({ ...b, position: b.position.clone(), velocity: b.velocity.clone() }));
  const paths = bodies.map((b) => [b.position.clone()]);
  for (let i = 0; i < steps; i++) {
    state = stepNBody(state, dt);
    state.forEach((b, idx) => paths[idx].push(b.position.clone()));
  }
  return paths;
}

/* ============================================================================
 * LEVEL SETUP — three planets in Lagrange's exact equilateral-triangle
 * three-body configuration.
 * ==========================================================================*/

function buildLevel() {
  const masses = [
    { name: 'Aurun', mass: 70, radius: 16, color: '#ffb454', emissive: '#5a3410' },
    { name: 'Vesper', mass: 40, radius: 12, color: '#6fb3ff', emissive: '#152a45' },
    { name: 'Nyxara', mass: 55, radius: 14, color: '#c98bff', emissive: '#3a1b52' },
  ];

  const s = 220; // equilateral triangle side length
  const R = s / Math.sqrt(3); // circumradius for that side length

  // Vertices of an equilateral triangle, geometric centroid at origin.
  const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
  const verts = angles.map((a) => new Vector3(R * Math.cos(a), R * Math.sin(a), 0));

  const totalMass = masses.reduce((sum, m) => sum + m.mass, 0);
  const baryX = verts.reduce((sum, v, i) => sum + v.x * masses[i].mass, 0) / totalMass;
  const baryY = verts.reduce((sum, v, i) => sum + v.y * masses[i].mass, 0) / totalMass;

  // Shift so the mass-weighted barycenter sits at world origin.
  const positions = verts.map((v) => new Vector3(v.x - baryX, v.y - baryY, 0));

  const omega = Math.sqrt((G * totalMass) / (s * s * s));
  const period = (2 * Math.PI) / omega;

  const bodies = masses.map((m, i) => {
    const r = positions[i]; // vector from barycenter (origin) to this body
    const velocity = new Vector3(-omega * r.y, omega * r.x, 0); // ω × r, counterclockwise
    return {
      name: m.name,
      mass: m.mass,
      radius: m.radius,
      color: m.color,
      emissive: m.emissive,
      position: r,
      velocity,
      fuel: 0,
      maxFuel: 0,
      heading: 0,
    };
  });

  return { bodies, period, s };
}

/* ============================================================================
 * REACT + THREE.JS COMPONENT
 * ==========================================================================*/

const FOCUS_OPTIONS = [['barycenter', 'barycenter'], ['body0', 'aurun'], ['body1', 'vesper'], ['body2', 'nyxara']];

export default function ThreeBodySystem() {
  const mountRef = useRef(null);
  const levelRef = useRef(buildLevel());
  const stateRef = useRef({ bodies: levelRef.current.bodies, t: 0 });
  const camRef = useRef({ zoom: 1.4, panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0 });
  const focusRef = useRef('barycenter');
  const pausedRef = useRef(false);
  const speedRef = useRef(1);

  const [focus, setFocus] = useState('barycenter');
  const [paused, setPaused] = useState(false);
  const [speedPct, setSpeedPct] = useState(100);
  const [showTrails, setShowTrails] = useState(true);
  const [telemetry, setTelemetry] = useState({ speeds: [0, 0, 0], simTime: 0, period: 0 });

  useEffect(() => { focusRef.current = focus; }, [focus]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speedPct / 100; }, [speedPct]);

  const resetSystem = useCallback(() => {
    const level = buildLevel();
    levelRef.current = level;
    stateRef.current = { bodies: level.bodies, t: 0 };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#04060b');

    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 5000);
    camera.position.set(0, 0, 500);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1200 + Math.random() * 2200;
      const a = Math.random() * Math.PI * 2;
      starPos[i * 3] = Math.cos(a) * r;
      starPos[i * 3 + 1] = Math.sin(a) * r;
      starPos[i * 3 + 2] = -800 - Math.random() * 400;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#9fb3d9', size: 1.6, sizeAttenuation: false })));
    scene.add(new THREE.AmbientLight('#1a2338', 1.3));

    const level = levelRef.current;

    // Per-body meshes, lights, trails
    const bodyVisuals = level.bodies.map((b) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(b.radius, 32, 32),
        new THREE.MeshStandardMaterial({ color: b.color, emissive: b.emissive, emissiveIntensity: 0.4, roughness: 0.6 })
      );
      scene.add(mesh);
      const light = new THREE.PointLight(b.color, 1.4, 3000, 1.6);
      scene.add(light);

      const TRAIL_LEN = 900;
      const positions = new Float32Array(TRAIL_LEN * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: b.color, transparent: true, opacity: 0.5 }));
      scene.add(line);

      return { mesh, light, trail: { geo, line, points: [], max: TRAIL_LEN } };
    });

    // Forecast orbit rings (dashed) — one period of the ideal triangle solution
    const forecastSteps = Math.min(4500, Math.ceil(level.period / CONSTANT_DT));
    const forecast = forecastOrbits(level.bodies, forecastSteps, CONSTANT_DT);
    const orbitLines = level.bodies.map((b, i) => {
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(forecast[i].map((v) => new THREE.Vector3(v.x, v.y, 0))),
        new THREE.LineDashedMaterial({ color: b.color, dashSize: 5, gapSize: 4, transparent: true, opacity: 0.3 })
      );
      line.computeLineDistances();
      scene.add(line);
      return line;
    });

    // Triangle outline connecting the three bodies live
    const triGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
    const triLine = new THREE.LineLoop(triGeo, new THREE.LineBasicMaterial({ color: '#3a4a68', transparent: true, opacity: 0.55 }));
    scene.add(triLine);

    // Barycenter marker
    const baryGeo = new THREE.BufferGeometry();
    baryGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-6, 0, 0, 6, 0, 0, 0, -6, 0, 0, 6, 0]), 3));
    const baryMarker = new THREE.LineSegments(baryGeo, new THREE.LineBasicMaterial({ color: '#8fe3ff' }));
    scene.add(baryMarker);

    // ---- input: pan / zoom only ----
    const onWheel = (e) => {
      e.preventDefault();
      const cam = camRef.current;
      cam.zoom = Math.min(6, Math.max(0.1, cam.zoom * Math.exp(-e.deltaY * 0.001)));
    };
    const onPointerDown = (e) => {
      const cam = camRef.current;
      cam.dragging = true; cam.lastX = e.clientX; cam.lastY = e.clientY;
    };
    const onPointerMove = (e) => {
      const cam = camRef.current;
      if (!cam.dragging) return;
      const dx = e.clientX - cam.lastX, dy = e.clientY - cam.lastY;
      cam.lastX = e.clientX; cam.lastY = e.clientY;
      cam.panX -= dx / cam.zoom; cam.panY += dy / cam.zoom;
    };
    const onPointerUp = () => { camRef.current.dragging = false; };
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onKeyDown = (e) => { if (e.code === 'Space') setPaused((p) => !p); if (e.code === 'KeyR') resetSystem(); };
    window.addEventListener('keydown', onKeyDown);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.left = -w / 2; camera.right = w / 2; camera.top = h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---- fixed-timestep loop ----
    let raf = null;
    let lastFrameMs = performance.now();
    let accumulator = 0;
    let hudCounter = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      let frameDelta = (now - lastFrameMs) / 1000;
      lastFrameMs = now;
      frameDelta = Math.min(frameDelta, 0.1);

      if (!pausedRef.current) {
        accumulator += frameDelta * (0.05 + speedRef.current * 3);
        while (accumulator >= CONSTANT_DT) {
          const { bodies, t } = stateRef.current;
          const nextBodies = stepNBody(bodies, CONSTANT_DT);
          stateRef.current = { bodies: nextBodies, t: t + CONSTANT_DT };
          accumulator -= CONSTANT_DT;

          nextBodies.forEach((b, i) => {
            const trail = bodyVisuals[i].trail;
            trail.points.push(b.position.clone());
            if (trail.points.length > trail.max) trail.points.shift();
          });
        }
      }

      const { bodies, t } = stateRef.current;

      let totalMass = 0, baryX = 0, baryY = 0;
      bodies.forEach((b) => { totalMass += b.mass; baryX += b.position.x * b.mass; baryY += b.position.y * b.mass; });
      baryX /= totalMass; baryY /= totalMass;

      bodies.forEach((b, i) => {
        const vis = bodyVisuals[i];
        vis.mesh.position.set(b.position.x, b.position.y, 0);
        vis.light.position.copy(vis.mesh.position);

        if (showTrails) {
          const posAttr = vis.trail.geo.attributes.position;
          for (let j = 0; j < vis.trail.points.length; j++) {
            posAttr.setXYZ(j, vis.trail.points[j].x, vis.trail.points[j].y, 0);
          }
          posAttr.needsUpdate = true;
          vis.trail.geo.setDrawRange(0, vis.trail.points.length);
          vis.trail.line.visible = true;
        } else {
          vis.trail.line.visible = false;
        }
      });

      triGeo.setFromPoints(bodies.map((b) => new THREE.Vector3(b.position.x, b.position.y, 0)));
      baryMarker.position.set(baryX, baryY, 0);

      // Camera
      const cam = camRef.current;
      let targetX = baryX, targetY = baryY;
      const f = focusRef.current;
      if (f === 'body0') { targetX = bodies[0].position.x; targetY = bodies[0].position.y; }
      else if (f === 'body1') { targetX = bodies[1].position.x; targetY = bodies[1].position.y; }
      else if (f === 'body2') { targetX = bodies[2].position.x; targetY = bodies[2].position.y; }
      targetX += cam.panX; targetY += cam.panY;
      camera.position.x += (targetX - camera.position.x) * 0.1;
      camera.position.y += (targetY - camera.position.y) * 0.1;
      camera.zoom = cam.zoom;
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);

      hudCounter++;
      if (hudCounter >= 6) {
        hudCounter = 0;
        setTelemetry({
          speeds: bodies.map((b) => b.velocity.magnitude()),
          simTime: t,
          period: levelRef.current.period,
        });
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSystem, showTrails]);

  const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '\u221e');
  const names = ['Aurun', 'Vesper', 'Nyxara'];
  const colors = ['#ffcf8a', '#9fd2ff', '#e0b3ff'];

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100vh', background: '#04060b',
      fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
      overflow: 'hidden', userSelect: 'none',
    }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />

      <div style={panelStyle('top', 'left')}>
        <div style={eyebrow}>THREE-BODY SYSTEM</div>
        {names.map((n, i) => (
          <Row key={n} label={`${n.toUpperCase()} SPEED`} value={`${fmt(telemetry.speeds[i], 2)} u/s`} accent={colors[i]} />
        ))}
        <Row label="PERIOD (IDEAL)" value={`${fmt(telemetry.period, 1)} s`} />
        <Row label="SIM T" value={`${fmt(telemetry.simTime, 1)} s`} />
      </div>

      <div style={panelStyle('top', 'right')}>
        <div style={eyebrow}>VIEW</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', maxWidth: 200 }}>
          {FOCUS_OPTIONS.map(([f, label]) => (
            <button key={f} onClick={() => setFocus(f)} style={pillBtn(focus === f)}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={() => setPaused((p) => !p)} style={pillBtn(paused)}>{paused ? 'resume' : 'pause'}</button>
          <button onClick={resetSystem} style={pillBtn(false)}>reset</button>
          <button onClick={() => setShowTrails((s) => !s)} style={pillBtn(showTrails)}>trails</button>
        </div>
      </div>

      <div style={panelStyle('bottom', 'center')}>
        <div style={eyebrow}>SIM SPEED</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <input
            type="range" min={0} max={200} value={speedPct}
            onChange={(e) => setSpeedPct(Number(e.target.value))}
            style={{ width: 220, accentColor: '#8fe3ff' }}
          />
          <span style={{ fontSize: 11, width: 44 }}>{speedPct}%</span>
        </div>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8 }}>
          drag to pan &middot; scroll to zoom &middot; space to pause &middot; R to reset &middot; Lagrange equilateral-triangle initial condition — watch it slowly wobble, that's real instability, not drift error
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, marginTop: 4 }}>
      <span style={{ opacity: 0.55, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ color: accent || '#eef2ff', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
function panelStyle(v, h) {
  const pos = { position: 'absolute', padding: '12px 16px', minWidth: 190 };
  if (v === 'top') pos.top = 16; else pos.bottom = 16;
  if (h === 'left') pos.left = 16;
  else if (h === 'right') pos.right = 16;
  else { pos.left = '50%'; pos.transform = 'translateX(-50%)'; pos.minWidth = 300; }
  return {
    ...pos,
    background: 'rgba(9,14,24,0.82)',
    border: '1px solid #1c2b3f',
    borderRadius: 10,
    color: '#eef2ff',
    backdropFilter: 'blur(6px)',
    boxShadow: '0 0 0 1px rgba(95,208,200,0.05), 0 8px 24px rgba(0,0,0,0.4)',
  };
}
const eyebrow = { fontSize: 10, letterSpacing: 1.5, opacity: 0.5 };
function pillBtn(active) {
  return {
    fontFamily: 'inherit', fontSize: 11, padding: '4px 10px', borderRadius: 999,
    border: `1px solid ${active ? '#5fd0c8' : '#243248'}`,
    background: active ? 'rgba(95,208,200,0.15)' : 'transparent',
    color: active ? '#8fe9e0' : '#aab4c9',
    cursor: 'pointer',
  };
}
