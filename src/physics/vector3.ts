// physics/vector3.ts
//
// The project's actual vector type — used by every other physics file.
// z is carried through for API consistency (e.g. orbit normals from cross
// products need it), even though gameplay is 2D and z generally stays 0.

export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  scale(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthsq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vector3 {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3(0, 0, 0);
    return this.scale(1 / mag);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  distanceTo(v: Vector3): number {
    return this.subtract(v).magnitude();
  }

  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  // Rotates around the Z axis — used for 2D-plane rotations (e.g. radial
  // burn direction, perifocal basis construction).
  Rotation(angle: number): Vector3 {
    return new Vector3(
      this.x * Math.cos(angle) - this.y * Math.sin(angle),
      this.x * Math.sin(angle) + this.y * Math.cos(angle),
      this.z
    );
  }
}
