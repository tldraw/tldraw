import { VecModel } from './VecModel'
/** @public */
export type VecLike = Vec | VecModel

/** @public */
export class Vec {
	constructor(
		public x = 0,
		public y = 0,
		public z = 1
	) {}

	clone(): Vec {
		const { x, y, z } = this
		return new Vec(x, y, z)
	}

	mul(t: number) {
		this.x *= t
		this.y *= t
		// this.z *= t
		return this
	}

	neg() {
		this.x *= -1
		this.y *= -1
		// this.z *= -1
		return this
	}

	dpr(V: VecLike): number {
		return Vec.Dpr(this, V)
	}

	cpr(V: VecLike) {
		return Vec.Cpr(this, V)
	}

	len(): number {
		return Vec.Len(this)
	}

	per() {
		const { x, y } = this
		this.x = y
		this.y = -x
		return this
	}

	uni() {
		const l = this.len()
		if (l === 0) return this
		this.x /= l
		this.y /= l
		return this
	}

	lrp(B: VecLike, t: number): Vec {
		this.x = this.x + (B.x - this.x) * t
		this.y = this.y + (B.y - this.y) * t
		return this
	}

	equals(B: VecLike) {
		return Vec.Equals(this, B)
	}

	static Add(A: VecLike, B: VecLike): Vec {
		return new Vec(A.x + B.x, A.y + B.y)
	}

	static AddXY(A: VecLike, x: number, y: number): Vec {
		return new Vec(A.x + x, A.y + y)
	}

	static Sub(A: VecLike, B: VecLike): Vec {
		return new Vec(A.x - B.x, A.y - B.y)
	}

	static Mul(A: VecLike, t: number): Vec {
		return new Vec(A.x * t, A.y * t)
	}

	/**
	 * Get the perpendicular vector to A.
	 */
	static Per(A: VecLike): Vec {
		return new Vec(A.y, -A.x)
	}

	// Get the distance between two points.
	static Dist(A: VecLike, B: VecLike): number {
		return ((A.y - B.y) ** 2 + (A.x - B.x) ** 2) ** 0.5
	}

	// Get the squared distance between two points. This is faster to calculate (no square root) so useful for "minimum distance" checks where the actual measurement does not matter.
	static Dist2(A: VecLike, B: VecLike): number {
		return (A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y)
	}

	/**
	 * Dot product of two vectors which is used to calculate the angle between them.
	 */
	static Dpr(A: VecLike, B: VecLike): number {
		return A.x * B.x + A.y * B.y
	}

	/**
	 * Cross product of two vectors which is used to calculate the area of a parallelogram.
	 */
	static Cpr(A: VecLike, B: VecLike) {
		return A.x * B.y - B.x * A.y
	}

	static Len(A: VecLike): number {
		return (A.x * A.x + A.y * A.y) ** 0.5
	}

	static From({ x, y, z = 1 }: VecModel) {
		return new Vec(x, y, z)
	}

	static RotWith(A: VecLike, C: VecLike, r: number): Vec {
		const x = A.x - C.x
		const y = A.y - C.y
		const s = Math.sin(r)
		const c = Math.cos(r)
		return new Vec(C.x + (x * c - y * s), C.y + (x * s + y * c))
	}

	/**
	 * Linearly interpolate between two points.
	 * @param A - The first point.
	 * @param B - The second point.
	 * @param t - The interpolation value between 0 and 1.
	 * @returns The interpolated point.
	 */
	static Lrp(A: VecLike, B: VecLike, t: number): Vec {
		// Inlined: Vec.Sub(B, A).mul(t).add(A) — note: only interpolates x/y, not z.
		return new Vec(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t)
	}

	static Equals(A: VecLike, B: VecLike): boolean {
		return Math.abs(A.x - B.x) < 0.0001 && Math.abs(A.y - B.y) < 0.0001
	}
}
