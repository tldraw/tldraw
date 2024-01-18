import { VecModel } from '@tldraw/tlschema'
import { EASINGS } from './easings'

/** @public */
export type VecLike = Vec | VecModel

/** @public */
export class Vec {
	constructor(
		public x = 0,
		public y = 0,
		public z = 1
	) {}

	// eslint-disable-next-line no-restricted-syntax
	get pressure() {
		return this.z
	}

	set(x = this.x, y = this.y, z = this.z) {
		this.x = x
		this.y = y
		this.z = z
		return this
	}

	setTo({ x = 0, y = 0, z = 1 }: VecLike) {
		this.x = x
		this.y = y
		this.z = z
		return this
	}

	rot(r: number) {
		if (r === 0) return this
		const { x, y } = this
		const s = Math.sin(r)
		const c = Math.cos(r)
		this.x = x * c - y * s
		this.y = x * s + y * c
		return this
	}

	rotWith(C: VecLike, r: number) {
		if (r === 0) return this
		const x = this.x - C.x
		const y = this.y - C.y
		const s = Math.sin(r)
		const c = Math.cos(r)
		this.x = C.x + (x * c - y * s)
		this.y = C.y + (x * s + y * c)
		return this
	}

	clone(): Vec {
		const { x, y, z } = this
		return new Vec(x, y, z)
	}

	sub(V: VecLike) {
		this.x -= V.x
		this.y -= V.y
		return this
	}

	subXY(x: number, y: number) {
		this.x -= x
		this.y -= y
		return this
	}

	subScalar(n: number) {
		this.x -= n
		this.y -= n
		// this.z -= n

		return this
	}

	add(V: VecLike) {
		this.x += V.x
		this.y += V.y
		return this
	}

	addXY(x: number, y: number) {
		this.x += x
		this.y += y
		return this
	}

	addScalar(n: number) {
		this.x += n
		this.y += n
		// this.z += n

		return this
	}

	clamp(min: number, max?: number) {
		this.x = Math.max(this.x, min)
		this.y = Math.max(this.y, min)
		if (max !== undefined) {
			this.x = Math.min(this.x, max)
			this.y = Math.min(this.y, max)
		}
		return this
	}

	div(t: number) {
		this.x /= t
		this.y /= t
		// this.z /= t
		return this
	}

	divV(V: VecLike) {
		this.x /= V.x
		this.y /= V.y
		// this.z /= V.z
		return this
	}

	mul(t: number) {
		this.x *= t
		this.y *= t
		// this.z *= t
		return this
	}

	mulV(V: VecLike) {
		this.x *= V.x
		this.y *= V.y
		// this.z *= V.z
		return this
	}

	abs() {
		this.x = Math.abs(this.x)
		this.y = Math.abs(this.y)
		return this
	}

	nudge(B: VecLike, distance: number) {
		const tan = Vec.Tan(B, this)
		return this.add(tan.mul(distance))
	}

	neg() {
		this.x *= -1
		this.y *= -1
		// this.z *= -1
		return this
	}

	cross(V: VecLike) {
		this.x = this.y * V.z! - this.z * V.y
		this.y = this.z * V.x - this.x * V.z!
		// this.z = this.x * V.y - this.y * V.x
		return this
	}

	dpr(V: VecLike): number {
		return Vec.Dpr(this, V)
	}

	cpr(V: VecLike) {
		return Vec.Cpr(this, V)
	}

	len2(): number {
		return Vec.Len2(this)
	}

	len(): number {
		return Vec.Len(this)
	}

	pry(V: VecLike): number {
		return Vec.Pry(this, V)
	}

	per() {
		const { x, y } = this
		this.x = y
		this.y = -x
		return this
	}

	uni() {
		return Vec.Uni(this)
	}

	tan(V: VecLike): Vec {
		return Vec.Tan(this, V)
	}

	dist(V: VecLike): number {
		return Vec.Dist(this, V)
	}

	distanceToLineSegment(A: VecLike, B: VecLike): number {
		return Vec.DistanceToLineSegment(A, B, this)
	}

	slope(B: VecLike): number {
		return Vec.Slope(this, B)
	}

	snapToGrid(gridSize: number) {
		this.x = Math.round(this.x / gridSize) * gridSize
		this.y = Math.round(this.y / gridSize) * gridSize
		return this
	}

	angle(B: VecLike): number {
		return Vec.Angle(this, B)
	}

	toAngle() {
		return Vec.ToAngle(this)
	}

	lrp(B: VecLike, t: number): Vec {
		this.x = this.x + (B.x - this.x) * t
		this.y = this.y + (B.y - this.y) * t
		return this
	}

	equals(B: VecLike) {
		return Vec.Equals(this, B)
	}

	equalsXY(x: number, y: number) {
		return Vec.EqualsXY(this, x, y)
	}

	norm() {
		const l = this.len()
		this.x = l === 0 ? 0 : this.x / l
		this.y = l === 0 ? 0 : this.y / l
		return this
	}

	toFixed() {
		return Vec.ToFixed(this)
	}

	toString() {
		return Vec.ToString(Vec.ToFixed(this))
	}

	toJson(): VecModel {
		return Vec.ToJson(this)
	}

	toArray(): number[] {
		return Vec.ToArray(this)
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

	static SubXY(A: VecLike, x: number, y: number): Vec {
		return new Vec(A.x - x, A.y - y)
	}

	static AddScalar(A: VecLike, n: number): Vec {
		return new Vec(A.x + n, A.y + n)
	}

	static SubScalar(A: VecLike, n: number): Vec {
		return new Vec(A.x - n, A.y - n)
	}

	static Div(A: VecLike, t: number): Vec {
		return new Vec(A.x / t, A.y / t)
	}

	static Mul(A: VecLike, t: number): Vec {
		return new Vec(A.x * t, A.y * t)
	}

	static DivV(A: VecLike, B: VecLike): Vec {
		return new Vec(A.x / B.x, A.y / B.y)
	}

	static MulV(A: VecLike, B: VecLike): Vec {
		return new Vec(A.x * B.x, A.y * B.y)
	}

	static Neg(A: VecLike): Vec {
		return new Vec(-A.x, -A.y)
	}

	static Per(A: VecLike): Vec {
		return new Vec(A.y, -A.x)
	}

	static Dist2(A: VecLike, B: VecLike): number {
		return Vec.Sub(A, B).len2()
	}

	static Abs(A: VecLike): Vec {
		return new Vec(Math.abs(A.x), Math.abs(A.y))
	}

	static Dist(A: VecLike, B: VecLike): number {
		return Math.hypot(A.y - B.y, A.x - B.x)
	}

	static Dpr(A: VecLike, B: VecLike): number {
		return A.x * B.x + A.y * B.y
	}

	static Cross(A: VecLike, V: VecLike) {
		return new Vec(
			A.y * V.z! - A.z! * V.y,
			A.z! * V.x - A.x * V.z!
			// A.z = A.x * V.y - A.y * V.x
		)
	}

	static Cpr(A: VecLike, B: VecLike) {
		return A.x * B.y - B.x * A.y
	}

	static Len2(A: VecLike): number {
		return A.x * A.x + A.y * A.y
	}

	static Len(A: VecLike): number {
		return Math.hypot(A.x, A.y)
	}

	static Pry(A: VecLike, B: VecLike): number {
		return Vec.Dpr(A, B) / Vec.Len(B)
	}

	static Uni(A: VecLike) {
		return Vec.Div(A, Vec.Len(A))
	}

	static Tan(A: VecLike, B: VecLike): Vec {
		return Vec.Uni(Vec.Sub(A, B))
	}

	static Min(A: VecLike, B: VecLike): Vec {
		return new Vec(Math.min(A.x, B.x), Math.min(A.y, B.y))
	}

	static Max(A: VecLike, B: VecLike): Vec {
		return new Vec(Math.max(A.x, B.x), Math.max(A.y, B.y))
	}

	static From({ x, y, z = 1 }: VecModel) {
		return new Vec(x, y, z)
	}

	static FromArray(v: number[]): Vec {
		return new Vec(v[0], v[1])
	}

	static Rot(A: VecLike, r = 0): Vec {
		const s = Math.sin(r)
		const c = Math.cos(r)
		return new Vec(A.x * c - A.y * s, A.x * s + A.y * c)
	}

	static RotWith(A: VecLike, C: VecLike, r: number): Vec {
		const x = A.x - C.x
		const y = A.y - C.y
		const s = Math.sin(r)
		const c = Math.cos(r)
		return new Vec(C.x + (x * c - y * s), C.y + (x * s + y * c))
	}

	/**
	 * Get the nearest point on a line with a known unit vector that passes through point A
	 *
	 * ```ts
	 * Vec.nearestPointOnLineThroughPoint(A, u, Point)
	 * ```
	 *
	 * @param A - Any point on the line
	 * @param u - The unit vector for the line.
	 * @param P - A point not on the line to test.
	 */
	static NearestPointOnLineThroughPoint(A: VecLike, u: VecLike, P: VecLike): Vec {
		return Vec.Mul(u, Vec.Sub(P, A).pry(u)).add(A)
	}

	static NearestPointOnLineSegment(A: VecLike, B: VecLike, P: VecLike, clamp = true): Vec {
		const u = Vec.Tan(B, A)
		const C = Vec.Add(A, Vec.Mul(u, Vec.Sub(P, A).pry(u)))

		// todo: fix error P is B or A, which leads to a NaN value

		if (clamp) {
			if (C.x < Math.min(A.x, B.x)) return Vec.Cast(A.x < B.x ? A : B)
			if (C.x > Math.max(A.x, B.x)) return Vec.Cast(A.x > B.x ? A : B)
			if (C.y < Math.min(A.y, B.y)) return Vec.Cast(A.y < B.y ? A : B)
			if (C.y > Math.max(A.y, B.y)) return Vec.Cast(A.y > B.y ? A : B)
		}

		return C
	}

	static DistanceToLineThroughPoint(A: VecLike, u: VecLike, P: VecLike): number {
		return Vec.Dist(P, Vec.NearestPointOnLineThroughPoint(A, u, P))
	}

	static DistanceToLineSegment(A: VecLike, B: VecLike, P: VecLike, clamp = true): number {
		return Vec.Dist(P, Vec.NearestPointOnLineSegment(A, B, P, clamp))
	}

	static Snap(A: VecLike, step = 1) {
		return new Vec(Math.round(A.x / step) * step, Math.round(A.y / step) * step)
	}

	static Cast(A: VecLike): Vec {
		if (A instanceof Vec) return A
		return Vec.From(A)
	}

	static Slope(A: VecLike, B: VecLike): number {
		if (A.x === B.y) return NaN
		return (A.y - B.y) / (A.x - B.x)
	}

	static Angle(A: VecLike, B: VecLike): number {
		return Math.atan2(B.y - A.y, B.x - A.x)
	}

	static Lrp(A: VecLike, B: VecLike, t: number): Vec {
		return Vec.Sub(B, A).mul(t).add(A)
	}

	static Med(A: VecLike, B: VecLike): Vec {
		return new Vec((A.x + B.x) / 2, (A.y + B.y) / 2)
	}

	static Equals(A: VecLike, B: VecLike): boolean {
		return Math.abs(A.x - B.x) < 0.0001 && Math.abs(A.y - B.y) < 0.0001
	}

	static EqualsXY(A: VecLike, x: number, y: number): boolean {
		return A.x === x && A.y === y
	}

	static Clockwise(A: VecLike, B: VecLike, C: VecLike): boolean {
		return (C.x - A.x) * (B.y - A.y) - (B.x - A.x) * (C.y - A.y) < 0
	}

	static Rescale(A: VecLike, n: number) {
		const l = Vec.Len(A)
		return new Vec((n * A.x) / l, (n * A.y) / l)
	}

	static ScaleWithOrigin(A: VecLike, scale: number, origin: VecLike) {
		return Vec.Sub(A, origin).mul(scale).add(origin)
	}

	static ToFixed(A: VecLike, n = 2) {
		return new Vec(+A.x.toFixed(n), +A.y.toFixed(n), +A.z!.toFixed(n))
	}

	static Nudge(A: VecLike, B: VecLike, distance: number) {
		return Vec.Add(A, Vec.Tan(B, A).mul(distance))
	}

	static ToString(A: VecLike) {
		return `${A.x}, ${A.y}`
	}

	static ToAngle(A: VecLike) {
		let r = Math.atan2(A.y, A.x)
		if (r < 0) r += Math.PI * 2

		return r
	}

	static FromAngle(r: number, length = 1) {
		return new Vec(Math.cos(r) * length, Math.sin(r) * length)
	}

	static ToArray(A: VecLike) {
		return [A.x, A.y, A.z!]
	}

	static ToJson(A: VecLike) {
		const { x, y, z } = A
		return { x, y, z }
	}

	static Average(arr: VecLike[]) {
		const len = arr.length
		const avg = new Vec(0, 0)
		for (let i = 0; i < len; i++) {
			avg.add(arr[i])
		}
		return avg.div(len)
	}

	static Clamp(A: Vec, min: number, max?: number) {
		if (max === undefined) {
			return new Vec(Math.min(Math.max(A.x, min)), Math.min(Math.max(A.y, min)))
		}

		return new Vec(Math.min(Math.max(A.x, min), max), Math.min(Math.max(A.y, min), max))
	}

	/**
	 * Get an array of points (with simulated pressure) between two points.
	 *
	 * @param A - The first point.
	 * @param B - The second point.
	 * @param steps - The number of points to return.
	 */
	static PointsBetween(A: VecModel, B: VecModel, steps = 6): Vec[] {
		const results: Vec[] = []

		for (let i = 0; i < steps; i++) {
			const t = EASINGS.easeInQuad(i / (steps - 1))
			const point = Vec.Lrp(A, B, t)
			point.z = Math.min(1, 0.5 + Math.abs(0.5 - ease(t)) * 0.65)
			results.push(point)
		}

		return results
	}

	static SnapToGrid(A: VecLike, gridSize = 8) {
		return new Vec(Math.round(A.x / gridSize) * gridSize, Math.round(A.y / gridSize) * gridSize)
	}
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
