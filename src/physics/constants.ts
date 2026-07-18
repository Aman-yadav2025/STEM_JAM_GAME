import { Vector3 } from './vector3.ts';

export interface CelestialBody {
    name: string;
    mass: number;
    radius: number;
    position: Vector3;
    soiRadius: number; // Sphere of Influence radius
    color: string; // Color for rendering
    velocity: Vector3; // Velocity vector for orbital calculations
};

export interface Spacecraft {
    id: number;
    position: Vector3;
    velocity: Vector3;
    mass: number;
    fuel: number; // Fuel mass in kilograms
};

export const G = 6.67430e-11; // Gravitational constant in m^3 kg^-1 s^-2


