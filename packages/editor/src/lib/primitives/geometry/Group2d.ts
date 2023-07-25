import { Box2d } from '../Box2d'
import { Vec2d } from '../Vec2d'
import { Geometry2d, Geometry2dOptions } from './Geometry2d'

/** @public */
export class Group2d extends Geometry2d {
	children: Geometry2d[]
	operation: 'union' | 'subtract' | 'exclude' | 'intersect'

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed' | 'isFilled'> & {
			children: Geometry2d[]
			operation: 'union' | 'subtract' | 'exclude' | 'intersect'
		}
	) {
		super({ ...config, isClosed: true, isFilled: false })
		const { children, operation } = config

		if (children.length === 0) throw Error('Group2d must have at least one child')

		this.operation = operation
		this.children = children
	}

	override getVertices(): Vec2d[] {
		return this.children.flatMap((child) => child.vertices)
	}

	override nearestPoint(point: Vec2d): Vec2d {
		let d = Infinity
		let p: Vec2d | undefined

		const { children, operation } = this

		if (children.length === 0) {
			throw Error('no children')
		}

		switch (operation) {
			case 'union': {
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
			case 'subtract': {
				throw Error('not implemented')
			}
			case 'exclude': {
				throw Error('not implemented')
			}
			case 'intersect': {
				throw Error('not implemented')
			}
		}
	}

	override distanceToPoint(point: Vec2d, hitInside = false) {
		return Math.min(...this.children.map((c, i) => c.distanceToPoint(point, hitInside || i > 0)))
	}

	override hitTestPoint(point: Vec2d, margin: number, hitInside: boolean): boolean {
		const { operation } = this
		if (hitInside) {
			return this.bounds.containsPoint(point, margin)
		}

		const dist = this.distanceToPoint(point, hitInside)
		const isCloseEnough = dist <= margin
		if (!isCloseEnough) return false

		switch (operation) {
			case 'union': {
				return true
			}
			case 'subtract': {
				throw Error(`not implemented`)
				// for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
				// 	child = children[i]

				// 	const nearest = child.nearestPoint(point)
				// 	const dist = nearest.dist(point)

				// 	if (i === 0) {
				// 		if (dist > margin) return false
				// 	} else {
				// 		if (dist < -margin) {
				// 			return false
				// 		}
				// 	}
				// }
				// return true
			}
			case 'exclude': {
				throw Error(`not implemented`)
				// let hits = 0
				// for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
				// 	child = children[i]

				// 	const nearest = child.nearestPoint(point)
				// 	const dist = nearest.dist(point)

				// 	if (dist < -margin) {
				// 		hits++
				// 	}
				// }
				// return hits % 2 === 1
			}
			case 'intersect': {
				throw Error(`not implemented`)
				// return children.every((child) => child.distanceToPoint(point) <= margin / zoom)
			}
		}
	}

	override hitTestLineSegment(A: Vec2d, B: Vec2d, zoom: number): boolean {
		const { children } = this
		// todo: this is a temporary solution, assuming that the first child defines the group size
		return children[0].hitTestLineSegment(A, B, zoom)
	}

	get outerVertices() {
		// todo: this is a temporary solution for arrow hit testing to prevent arrows from snapping to the label of a shape
		return this.children[0].vertices
	}

	getArea() {
		// todo: this is a temporary solution, assuming that the first child defines the group size
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
