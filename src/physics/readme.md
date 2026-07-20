# physics/ — reference

Everything here runs on a **scaled unit system**, not real-world SI. See
`constants.ts` for the details — the short version: don't plug in real G,
kg, or meters, or you'll get orbital speeds in the thousands and distances
in the millions.

Files, in the order you'd read them if you were new to the codebase:

1. [`vector3.ts`](#vector3ts) — the vector type everything else uses
2. [`constants.ts`](#constantsts) — shared types, tuning constants, small helpers
3. [`gravity.ts`](#gravityts) — Newtonian gravity + dominant-body switching
4. [`orbitPath.ts`](#orbitpaths) — circular orbits for moving bodies (moons, planets)
5. [`rocketEquation.ts`](#rocketequationts) — Tsiolkovsky rocket equation / fuel math
6. [`burn.ts`](#burnts) — instant delta-v burns (secondary mechanism)
7. [`rocketMotion.ts`](#rocketmotionts) — **primary** per-frame ship integrator (continuous thrust)
8. [`trajectoryPredictor.ts`](#trajectorypredictorts) — coast-path forecasting for the UI's trajectory line
9. [`lagrange.ts`](#lagrangets) — L1–L5 points for a two-body system

---

## `vector3.ts`

The `Vector3` class used by every other file. Gameplay is 2D, but `z` is
carried through for API consistency (e.g. cross products for orbit normals),
and generally stays `0`.

```ts
new Vector3(x, y, z)
```

| Method | Returns | Notes |
|---|---|---|
| `.add(v)` | `Vector3` | |
| `.subtract(v)` | `Vector3` | |
| `.scale(s)` | `Vector3` | |
| `.magnitude()` | `number` | `√(x²+y²+z²)` |
| `.lengthsq()` | `number` | Skips the `sqrt` — use when you only need to *compare* magnitudes |
| `.normalize()` | `Vector3` | Returns `(0,0,0)` if magnitude is 0, rather than throwing/NaN |
| `.dot(v)` | `number` | |
| `.cross(v)` | `Vector3` | |
| `.distanceTo(v)` | `number` | `this.subtract(v).magnitude()` |
| `.clone()` | `Vector3` | |
| `.Rotation(angle)` | `Vector3` | Rotates around Z — used for radial burn directions, perifocal bases |
| `Vector3.zero()` | `Vector3` | static |

All methods are non-mutating — they return new instances. Keep that pattern
if you extend this class.

---

## `constants.ts`

Shared types and the small set of tuning knobs for the whole simulation.

**Tuning constants**
- `G = 6000` — gravitational constant, tuned for gameplay feel, not physical accuracy. First thing to touch when you're calibrating a new level.
- `CONSTANT_DT = 1/120` — fixed physics timestep in seconds. All integrators use this, independent of render framerate.
- `CIRCULAR_ECCENTRICITY_THRESHOLD = 0.02` — below this, an orbit counts as "circular" for win-condition checks.

**Types**
- `CelestialBody` — `{ name, mass, radius, position, soiRadius, color }`. `soiRadius` is the sphere-of-influence radius used by `gravity.ts` for patched-conic switching.
- `Spacecraft` — `{ position, velocity, mass, fuel, maxFuel, heading }`. `mass` is **dry mass only**; add `fuel` yourself when you need total mass (or call `totalMass()`).
- `BurnDirection` — `'prograde' | 'retrograde' | 'radialIn' | 'radialOut'`.

**Functions**

```ts
totalMass(ship: Spacecraft): number
```
Dry mass + current fuel. Use this everywhere gravity/thrust acceleration needs the ship's real mass.

```ts
fuelFraction(ship: Spacecraft): number
```
`0..1`. Feed straight to a HUD gauge. Returns `0` if `maxFuel <= 0` instead of dividing by zero.

```ts
addFuel(ship: Spacecraft, amount: number): Spacecraft
```
Non-mutating; clamps to `maxFuel`. Use this for every refuel mechanic (pickup, docking) instead of setting `ship.fuel` directly, so the cap lives in exactly one place.

```ts
computeSOIRadius(d: number, mBody: number, mPrimary: number): number
```
Hill-sphere-style approximation. `d` = distance between the two bodies, `mPrimary` = the body being orbited (e.g. a planet), `mBody` = the smaller one (e.g. a moon). Call this once per orbiting body when you set up a level — see `levels/starSystem.ts` for an example.

---

## `gravity.ts`

Pure Newtonian gravity (`a = G·M/r²`), no relativistic correction — not
needed at this scale. Multi-body levels use **patched-conic**: the ship is
under exactly one body's influence at a time (whichever SOI it's currently
inside), which is simpler and more predictable than full n-body simulation.

```ts
accelFromBody(position: Vector3, body: CelestialBody): Vector3
```
Acceleration on a point due to one body. Direction points toward the body. Returns zero at `r = 0` instead of dividing by zero.

```ts
getDominantBody(position: Vector3, bodies: CelestialBody[]): CelestialBody
```
Walks `bodies` in order and returns the first one whose SOI contains `position`. **Array ordering matters**: put bodies smallest-SOI-first (e.g. moon before planet before star) so a ship deep inside a moon's SOI doesn't get matched to the planet instead. Falls back to `bodies[0]` if the ship is outside every SOI — that's why the root/primary body should carry `soiRadius: Infinity` and sit last in the array.

```ts
DominantAccel(position: Vector3, bodies: CelestialBody[]): Vector3
```
`accelFromBody` using whichever body `getDominantBody` picks. **This is the gravity function every integrator should call** — both `rocketMotion.ts` and `trajectoryPredictor.ts` use it.

```ts
totalAccelNBody(position: Vector3, bodies: CelestialBody[]): Vector3
```
Full n-body sum, ignoring SOI switching entirely. Not used by default anywhere in this project — it's here in case you build a "three-body chaos" bonus level.

---

## `orbitPath.ts`

Circular-orbit motion for moons/planets — deliberately not full Keplerian
ellipses, so levels are easier to design and easier for players to predict.

```ts
type MovingBody = CelestialBody & { orbit?: OrbitPath }
```
`orbit` is `undefined` for a fixed/root body (a sun, or any body that doesn't move).

```ts
interface OrbitPath {
  parentBody: CelestialBody | null; // null = fixed at world origin
  orbitalRadius: number;
  orbitalPeriod: number; // seconds per revolution
  initialAngle: number;  // radians, at t = 0
}
```

```ts
bodyPositionAtTime(orbit: OrbitPath, time: number): Vector3
```
Computes a body's world position at simulation time `time`. Reads `orbit.parentBody.position` **live**, not a cached copy.

```ts
updateBodyPositions(bodies: MovingBody[], time: number): void
```
Mutates `body.position` in place for every body with an `.orbit`. **Ordering requirement**: `bodies` must be parent-before-child (e.g. `[sun, planet, moon]`) so a moon reads its parent's *already-updated* position this frame — because `orbit.parentBody` is a live object reference, this only actually matters when the parent *itself* has an `.orbit` (i.e. more than one level of nesting). If your root body is fixed (no `.orbit`), ordering here is a non-issue, which is why both bundled levels (`level1.ts`, `starSystem.ts`) keep a single static root.

> ⚠️ This ordering requirement is the *opposite* of what `getDominantBody`
> wants (smallest-SOI-first). If you build a 3-level hierarchy where a moon
> orbits a planet that itself orbits a sun, no single array order satisfies
> both functions — you'll need to split bodies into two differently-sorted
> views, or hand `rocketMotion.ts` a pre-sorted copy for the gravity/thrust
> calls. Both bundled levels avoid this by keeping the root static.

---

## `rocketEquation.ts`

Fuel accounting via Tsiolkovsky's rocket equation: `Δv = v_e · ln(m0/m1)`.
The **same Δv costs more propellant mass early** (ship full of fuel) than
late (ship nearly empty) — fuel cost is mass-dependent and nonlinear.

```ts
STANDARD_g = 9.80665 // m/s² — fixed conversion constant (Isp <-> exhaust velocity),
                      // NOT any in-game body's local gravity
```

```ts
interface EngineSpec { specificImpulse: number; maxThrust: number }
DEFAULT_ENGINE: EngineSpec // Isp 300s, 5000N — tune per ship/level
```

```ts
exhaustVelocity(engine: EngineSpec): number
```
`Isp × STANDARD_g`, in game distance units/sec.

```ts
propellantForDeltaV(deltaV: number, currentMass: number, engine: EngineSpec): number
```
Propellant **mass** consumed for a single instantaneous burn of the given Δv. Used by `burn.ts`, not by the per-frame continuous integrator.

```ts
maxDeltaVForPropellant(propellantAvailable: number, currentMass: number, engine: EngineSpec): number
```
Inverse of the above — max Δv achievable for a given propellant spend. Returns `Infinity` if you'd spend more than the ship's current mass (i.e. burn the whole ship).

```ts
deltaVBudget(dryMass: number, fuelMass: number, engine: EngineSpec): number
```
Total Δv remaining given the current fuel load — **this is the HUD number**. Correct whether that Δv is ultimately spent continuously (via `rocketMotion.ts`) or in discrete burns (via `burn.ts`), since it only depends on wet/dry mass ratio and Isp.

---

## `burn.ts`

Two independent things:

**1. Direction resolution** (shared by both burn styles):
```ts
getBurnDirectionVector(ship: Spacecraft, bodies: CelestialBody[], direction: BurnDirection): Vector3
```
Unit vector for a burn direction. Prograde/retrograde come from the ship's own velocity. Radial in/out come from the line to the **current dominant body** (via `getDominantBody`) — the physically correct definition, which only matches "perpendicular to velocity" for a perfectly circular orbit. Needs `bodies` for this reason. Throws nothing — for prograde/retrograde at zero velocity, callers should check first (see `applyBurn`).

**2. Instant delta-v burns** — not the primary mechanism (see `rocketMotion.ts`), kept for scripted/NPC burns or a future one-click "auto-circularize":

```ts
applyBurn(ship, bodies, direction, deltaV, engine?): BurnResult & { ship: Spacecraft }
```
Returns `{ success, reason?, propellantUsed?, ship }` — **non-mutating**, always returns a new `Spacecraft` (even on failure, where it echoes back the original). Fails with a `reason` if:
- `direction` is prograde/retrograde and the ship's speed is exactly 0 (no defined prograde), or
- the burn needs more propellant than `ship.fuel` has.

```ts
previewBurn(ship, bodies, direction, deltaV, engine?): { velocity, propellantUsed, affordable }
```
Same math as `applyBurn`, doesn't spend fuel — use this to show a burn's effect before committing.

```ts
maxAvailableDeltaV(ship: Spacecraft, engine?: EngineSpec): number
```
Max Δv the ship could achieve right now with its remaining fuel, via `maxDeltaVForPropellant`.

---

## `rocketMotion.ts`

**The primary movement function** — called every fixed timestep regardless
of whether the player is thrusting. Replaces `applyBurn` as the main
player-facing mechanism because the UI gives (direction, throttle, held
duration), not a pre-known Δv — that's a rate control, needing frame-by-frame
integration rather than a one-shot rocket-equation calculation.

```ts
updateShipPhysics(
  ship: Spacecraft,
  bodies: MovingBody[],
  engine: EngineSpec,
  activeBurnDirection: BurnDirection | null, // null = player isn't holding a thrust button
  throttle: number = 1.0,                     // 0..1, ignored if activeBurnDirection is null
  t: number                                    // current sim time BEFORE this step
): { ship: Spacecraft; t: number }
```

What one call does, in order:
1. `updateBodyPositions(bodies, t)` — moves planets/moons to time `t` **first**, so gravity this frame uses where they *are*, not last frame's stale position.
2. If thrusting: computes thrust acceleration from `maxThrust × throttle / totalShipMass`, direction via `getBurnDirectionVector`, and drains fuel by mass flow rate (`Thrust / exhaustVelocity`), clamped to not go negative.
3. Gravity via `DominantAccel` — always active.
4. Superposes gravity + thrust accelerations.
5. Integrates with **semi-implicit Euler** (not Verlet — thrust direction can change mid-burn from live player input, so a second acceleration sample at frame's end isn't reliably knowable; semi-implicit Euler is the standard choice for player-controlled thrust).

Non-mutating — returns a new `{ ship, t }`; call it once per `CONSTANT_DT` tick (see `store/simulationStore.ts` / `hooks/useGameLoop.ts` in this project for the accumulator pattern that keeps this decoupled from render framerate).

`applyBurn` and `rocketEquation.ts`'s `deltaVBudget`/`maxAvailableDeltaV` are still used elsewhere — just for HUD readouts now, not for computing a frame's motion.

---

## `trajectoryPredictor.ts`

Forward-simulates the ship's future **coasting** path (gravity only, no
thrust) — this draws the live trajectory line, and doubles as a burn
preview by re-running each frame off the ship's current (possibly mid-burn)
velocity.

```ts
predictPath(
  startPosition: Vector3,
  startVelocity: Vector3,
  bodies: MovingBody[],
  steps: number,
  startTime: number
): Vector3[]
```
Returns an array of positions, starting with `startPosition`. Stops early (before `steps` is reached) if the predicted path hits any body's radius.

Uses **velocity Verlet**, not the semi-implicit Euler `rocketMotion.ts` uses — deliberately different: this is pure coast with no mid-prediction player input, so there's no reason to accept Euler's worse energy conservation, and the lookahead can run hundreds of steps where Euler's error compounds visibly. Internally it clones `bodies` so the prediction doesn't mutate the live simulation's body positions.

Cheap enough to call once or twice a second, but 200–300 steps × N bodies every single frame is wasted work — see `simulationStore.ts` for an example of throttling recomputation to every few physics ticks.

---

## `lagrange.ts`

Computes the five Lagrange points for a two-body system (e.g. star +
planet, or planet + moon) — points where gravity and centrifugal force
balance in the rotating two-body reference frame.

```ts
type LagrangePointId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
interface LagrangePoint { id: LagrangePointId; position: Vector3; stable: boolean }
```

```ts
computeLagrangePoints(primary: CelestialBody, secondary: CelestialBody): LagrangePoint[]
```
Returns all five points. `primary` should be the more massive body.

- **L4, L5** — `stable: true`. Closed-form: equilateral triangle with the two bodies, no solver needed.
- **L1, L2, L3** — `stable: false`. On the line through both bodies; no closed form, so each is solved with 50 fixed iterations of Newton's method (`solveL1`/`solveL2`/`solveL3`, not exported — internal to this file).

Call this once per level setup (it's not cheap enough, or necessary, to call every frame) — see `levels/starSystem.ts` for an example of picking a `{ primary, secondary }` pair to feed it.

---

## Quick reference: which function does what, per frame

| Every physics tick (`CONSTANT_DT`) | Occasionally (UI/HUD/prediction) | Once, at level setup |
|---|---|---|
| `updateShipPhysics` (→ `updateBodyPositions`, `DominantAccel`, `getBurnDirectionVector`) | `predictPath` (trajectory line) | `computeSOIRadius` per orbiting body |
| | `deltaVBudget` / `maxAvailableDeltaV` (HUD) | `computeLagrangePoints` |
| | `applyBurn`/`previewBurn` (scripted/NPC burns, burn preview UI) | |
