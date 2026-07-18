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
    heading: number;
};

export function totalMass(ship: Spacecraft) : number{
    return ship.mass + ship.fuel;
}

export const G = 6.67430e-11; // Gravitational constant in m^3 kg^-1 s^-2

export const AU = 1.496e+11; // Astronomical Unit in meters

export const CONSTANT_DT = 1/60; // Time step in seconds (1/60th of a second for 60 FPS)

export const CIRCULAR_ECCENTRICITY_THRESHOLD = 0.02; // Threshold for considering an orbit circular

export type BurnDirection = "prograde" | "retrograde" | "radial-in" | "radial-out" | "normal" | "antinormal";

export const DefaultEngine = {
    specificImpulse: 300, // seconds — roughly in line with real chemical engines
}