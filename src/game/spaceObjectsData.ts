
export const ASTEROID_BELT_COUNT = 600;
export const ROAMING_COUNT = 100;
export const COMET_COUNT = 50;

// 1. Static Asteroid Belt Configuration
export const asteroidBeltData = Array.from({ length: ASTEROID_BELT_COUNT }, () => ({
  radius: 1450 + Math.random() * 250,
  speed: 0.1 + Math.random() * 0.15,
  angle: Math.random() * Math.PI * 2,
  size: 1.0 + Math.random() * 1.8,
}));

// 2. Roaming Asteroids Configuration
export const roamingAsteroidsData = Array.from({ length: ROAMING_COUNT }, () => ({
  radiusX: 200 + Math.random() * 4000,
  radiusY: 150 + Math.random() * 3500,
  speed: 0.05 + Math.random() * 0.15,
  angle: Math.random() * Math.PI * 2,
  tilt: Math.random() * Math.PI * 2,
  size: 1.5 + Math.random() * 3.0,
}));

// 3. Comet Configuration
export const cometsData = Array.from({ length: COMET_COUNT }, () => {
  const a = 800 + Math.random() * 3000;
  const b = 200 + Math.random() * 600;
  const c = Math.sqrt(a * a - b * b);
  return {
    a, b, c,
    speed: 0.03 + Math.random() * 0.07,
    phase: Math.random() * Math.PI * 2,
    orbitRotation: Math.random() * Math.PI * 2,
    size: 2.0 + Math.random() * 3.5,
  };
});