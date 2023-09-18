import { Box2d } from '../Box2d'
import { Vec2d } from '../Vec2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Group2d extends Geometry2d {
	children: Geometry2d[]

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & {
			children: Geometry2d[]
		}
	) {
		super({ ...config, isClosed: true, isFilled: false })
		const { children } = config

		if (children.length === 0) throw Error('Group2d must have at least one child')

		this.children = children
	}

	override getVertices(): Vec2d[] {
		return this.children.filter((c) => !c.isLabel).flatMap((c) => c.vertices)
	}

	override nearestPoint(point: Vec2d): Vec2d {
		let d = Infinity
		let p: Vec2d | undefined

		const { children } = this

		if (children.length === 0) {
			throw Error('no children')
		}

		for (const child of children) {
			const nearest = child.nearestPoint(point)
			const dist = nearest.dist(point)
			if (dist < d) {
				d = dist
				p = nearest
			}
		}
		if (!p) throw Error('nearest point not found')
		return p
	}

	override distanceToPoint(point: Vec2d, hitInside = false) {
		return Math.min(...this.children.map((c, i) => c.distanceToPoint(point, hitInside || i > 0)))
	}

	override hitTestPoint(point: Vec2d, margin: number, hitInside: boolean): boolean {
		return !!this.children
			.filter((c) => !c.isLabel)
			.find((c) => c.hitTestPoint(point, margin, hitInside))
	}

	override hitTestLineSegment(A: Vec2d, B: Vec2d, zoom: number): boolean {
		return !!this.children.filter((c) => !c.isLabel).find((c) => c.hitTestLineSegment(A, B, zoom))
	}

	getArea() {
		// todo: this is a temporary solution, assuming that the first child defines the group size; we would want to flatten the group and then find the area of the hull polygon
		return this.children[0].area
	}

	toSimpleSvgPath() {
		let path = ''
		for (const child of this.children) {
			path += child.toSimpleSvgPath()
		}

		const corners = Box2d.FromPoints(this.vertices).corners
		// draw just a few pixels around each corner, e.g. an L shape for the bottom left

		for (let i = 0, n = corners.length; i < n; i++) {
			const corner = corners[i]
			const prevCorner = corners[(i - 1 + n) % n]
			const prevDist = corner.dist(prevCorner)
			const nextCorner = corners[(i + 1) % n]
			const nextDist = corner.dist(nextCorner)

			const A = corner.clone().lrp(prevCorner, 4 / prevDist)
			const B = corner
			const C = corner.clone().lrp(nextCorner, 4 / nextDist)

			path += `M${A.x},${A.y} L${B.x},${B.y} L${C.x},${C.y} `
		}
		return path
	}
}
