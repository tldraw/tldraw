import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'

/** @public */
export class Group2d extends Geometry2d {
	children: Geometry2d[]

	constructor(config: { children: Geometry2d[]; isFilled: boolean; margin: number }) {
		super()
		const { children, margin } = config

		if (children.length === 0) throw Error('Group2d must have at least one child')

		this.children = children
		this.margin = margin
		this.isClosed = true
	}

	override getVertices(): Vec2d[] {
		return this.children.flatMap((child) => child.vertices)
	}

	override nearestPoint(point: Vec2d): Vec2d {
		let d = Infinity
		let p: Vec2d | undefined

		for (const child of this.children) {
			const nearest = child.nearestPoint(point)
			const dist = nearest.dist(point)
			if (dist < d) {
				d = dist
				p = nearest
			}
		}

		return p!
	}

	override hitTestLineSegment(A: Vec2d, B: Vec2d): boolean {
		return this.children.some((child) => child.hitTestLineSegment(A, B))
	}
}
