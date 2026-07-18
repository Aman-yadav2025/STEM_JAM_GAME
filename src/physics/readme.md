# Astrodynamics & Orbital Mechanics Simulator

> **Note:** The exact contents of the provided TypeScript files could not be extracted directly. The documentation below provides an extrapolated explanation of the classes, types, interfaces, and methods that are typically found in an astrodynamics physics engine structured with these exact file names. 

## Overview
This repository contains a TypeScript-based physics engine designed for simulating orbital mechanics, trajectory prediction, and spacecraft maneuvers. It utilizes numerical integration to calculate orbital paths and provides tools for coordinate transformations, delta-v calculations, and N-body/2-body gravitational interactions.

---

## File Documentation

### 1. `vector3.ts`
This file implements standard 3-dimensional vector mathematics, which is the foundational building block for positioning, velocities, and forces in 3D space.
* **Types / Interfaces:** 
  * `Vector3Like` or `IVector3`: Interface defining `{ x: number, y: number, z: number }`.
* **Classes:**
  * `Vector3`: The main class wrapping the x, y, and z coordinates.
* **Expected Methods:**
  * `add(v: Vector3)`, `sub(v: Vector3)`: Addition and subtraction.
  * `multiply(scalar: number)`: Scalar multiplication.
  * `dot(v: Vector3)`, `cross(v: Vector3)`: Dot and cross products (essential for finding orbital momentum vectors).
  * `magnitude()`: Returns the length of the vector.
  * `normalize()`: Returns a unit vector.

### 2. `constants.ts`
A static collection of universal and planetary constants used throughout the physics calculations.
* **Expected Exports:**
  * `G`: Universal gravitational constant.
  * `mu_earth`, `mu_sun`: Standard gravitational parameters ($GM$) for celestial bodies.
  * `r_earth`: Equatorial radius of the Earth.
  * `g0`: Standard gravity (used in the rocket equation).

### 3. `gravity.ts`
Handles the calculation of gravitational forces and accelerations between masses.
* **Types / Interfaces:**
  * `CelestialBody`: Defines mass, position, and radius.
* **Expected Methods:**
  * `getAcceleration(position: Vector3, centralBody: CelestialBody)`: Uses Newton's law of universal gravitation to calculate the acceleration vector acting on a point mass.
  * `getNBodyAcceleration(position: Vector3, bodies: CelestialBody[])`: Sums the gravitational influence of multiple bodies.

### 4. `integrator.ts`
Solves the ordinary differential equations (ODEs) of motion. Since orbits are non-linear, numerical integration is required to propagate the state vectors forward in time.
* **Types / Interfaces:**
  * `StateVector`: Contains `position: Vector3` and `velocity: Vector3`.
  * `DerivativeMap`: Interface mapping velocities and accelerations for the ODE solver.
* **Expected Methods:**
  * `stepRK4(state: StateVector, dt: number)`: Standard 4th-Order Runge-Kutta integrator for high accuracy.
  * `stepEuler(state: StateVector, dt: number)`: Faster but less accurate Euler integrator.
  * `stepVerlet()`: Symplectic integrator good for preserving energy in orbital systems.

### 5. `orbitalElements.ts`
Provides bidirectional conversion between Cartesian state vectors (position and velocity) and Keplerian orbital elements.
* **Types / Interfaces:**
  * `KeplerianElements`: Interface containing:
    * `a`: Semi-major axis
    * `e`: Eccentricity
    * `i`: Inclination
    * `omega`: Argument of periapsis
    * `raan`: Right ascension of the ascending node
    * `nu`: True anomaly
* **Expected Methods:**
  * `stateToElements(position: Vector3, velocity: Vector3, mu: number): KeplerianElements`
  * `elementsToState(elements: KeplerianElements, mu: number): StateVector`

### 6. `orbitPath.ts`
Generates geometric arrays of points representing the physical path of an orbit, primarily for rendering to a UI, Canvas, or WebGL context.
* **Expected Methods:**
  * `generateOrbitPath(elements: KeplerianElements, resolution: number): Vector3[]`: Calculates points along the ellipse/hyperbola.
  * `getApoapsis()`, `getPeriapsis()`: Helper methods to find the highest and lowest points of the orbit.

### 7. `trajectoryPredictor.ts`
Orchestrates the `integrator` and `gravity` modules to simulate future paths, taking into account potential intersections (crashes) or sphere-of-influence changes.
* **Types / Interfaces:**
  * `PredictionResult`: Interface detailing the predicted path, duration, and any collision events.
* **Expected Methods:**
  * `predict(initialState: StateVector, time: number, dt: number): StateVector[]`
  * `detectCollisions(path: StateVector[], bodies: CelestialBody[])`

### 8. `burn.ts`
Models impulsive or continuous orbital maneuvers (delta-v application).
* **Types / Interfaces:**
  * `ManeuverNode`: Represents a planned burn with properties like `time`, `progradeDv`, `normalDv`, `radialDv`.
* **Expected Methods:**
  * `applyImpulsiveBurn(state: StateVector, dv: Vector3): StateVector`: Instantly adds velocity.
  * `getBurnVector(node: ManeuverNode, state: StateVector)`: Converts prograde/normal/radial inputs into a Cartesian `Vector3`.

### 9. `Rocketequation.ts`
Implements the Tsiolkovsky rocket equation for calculating mass fraction, delta-v, and specific impulse.
* **Expected Methods:**
  * `calculateDeltaV(isp: number, initialMass: number, finalMass: number): number`
  * `calculatePropellantMass(dv: number, isp: number, initialMass: number): number`

### 10. `lagrange.ts`
Calculates the Lagrange points (L1 through L5) for a two-body orbital system (e.g., Earth-Moon or Sun-Earth).
* **Types / Interfaces:**
  * `LagrangeSystem`: Interface requiring primary and secondary masses and their distance.
* **Expected Methods:**
  * `calculateL1(system: LagrangeSystem)`, `calculateL2()`, etc.
  * Returns `Vector3` coordinates relative to the barycenter of the two bodies.
