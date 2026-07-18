export class Vector3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v: Vector3) : Vector3{
        const result = new Vector3(this.x, this.y, this.z);
        result.x += v.x;
        result.y += v.y;
        result.z += v.z;
        return result;
    }
    scale(scalar: number) : Vector3 {
        const result = new Vector3(this.x, this.y, this.z);
        result.x *= scalar;
        result.y *= scalar;
        result.z *= scalar;
        return result;
    }
    magnitude() : number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() : Vector3 {
        const mag = this.magnitude();
        if(mag == 0){
            return new Vector3(0,0,0);
        }
        return this.scale(1 / mag);
    }

    subtract(v: Vector3) : Vector3{
        const result = new Vector3(this.x, this.y, this.z);
        result.x -= v.x;
        result.y -= v.y;
        result.z -= v.z;
        return result; 
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




}