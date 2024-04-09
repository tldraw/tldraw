import { Box } from '../Box'
import { Vec } from '../Vec'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Group2d extends Geometry2d {
	children: Geometry2d[] = []
	ignoredChildren: Geometry2d[] = []

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & {
			children: Geometry2d[]
		}
	) {
		super({ ...config, isClosed: true, isFilled: false })

		for (const child of config.children) {
			if (child.ignore) {
				this.ignoredChildren.push(child)
			} else {
				this.children.push(child)
			}
		}

		if (this.children.length === 0) throw Error('Group2d must have at least one child')
	}

	override getVertices(): Vec[] {
		return this.children.filter((c) => !c.isLabel).flatMap((c) => c.vertices)
	}

	override nearestPoint(point: Vec): Vec {
		let dist = Infinity
		let nearest: Vec | undefined

		const { children } = this

		if (children.length === 0) {
			throw Error('no children')
		}

		let p: Vec
		let d: number
		for (const child of children) {
			p = child.nearestPoint(point)
			d = Vec.Dist2(p, point)
			if (d < dist) {
				dist = d
				nearest = p
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	override distanceToPoint(point: Vec, hitInside = false) {
		return Math.min(...this.children.map((c, i) => c.distanceToPoint(point, hitInside || i > 0)))
	}

	override hitTestPoint(point: Vec, margin: number, hitInside: boolean): boolean {
		return !!this.children
			.filter((c) => !c.isLabel)
			.find((c) => c.hitTestPoint(point, margin, hitInside))
	}

	override hitTestLineSegment(A: Vec, B: Vec, zoom: number): boolean {
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

		const corners = Box.FromPoints(this.vertices).corners
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
