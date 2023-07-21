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
			margin: number
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
				// for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
				// 	child = children[i]
				// 	const first = children[0]

				// 	const nearest = child.nearestPoint(point)
				// 	const dist = nearest.dist(point)

				// 	if (i === 0) {
				// 		d = dist
				// 		p = nearest
				// 	} else {
				// 		if (dist < d) {
				// 			const distToFirst = first.distanceToPoint(nearest)
				// 			if (distToFirst < d) {
				// 				d = dist
				// 				p = nearest
				// 			}
				// 		}
				// 	}
				// }
				// break
			}
			case 'exclude': {
				throw Error('not implemented')
				// // if odd, and if point is inside of of the even shapes, use the point
				// const tests = this.children.map((c) => {
				// 	const nearest = c.nearestPoint(point)
				// 	return {
				// 		nearest,
				// 		dist: nearest.dist(point),
				// 	}
				// })

				// for (const test of tests) {
				// 	const dist = test.dist
				// 	if (dist < d) {
				// 		d = dist
				// 		p = test.nearest
				// 	}
				// }
				// break
			}
			case 'intersect': {
				throw Error('not implemented')
				// // each closest point needs to be inside of all the shapes
				// const tests = this.children
				// 	.map((c) => {
				// 		const nearest = c.nearestPoint(point)
				// 		return {
				// 			nearest,
				// 			dist: nearest.dist(point),
				// 		}
				// 	})
				// 	.filter((p) => this.children.every((c) => c.distanceToPoint(p.nearest) < 0))

				// for (const test of tests) {
				// 	const dist = test.dist
				// 	if (dist < d) {
				// 		d = dist
				// 		p = test.nearest
				// 	}
				// }
				// break
			}
		}
	}

	override hitTestPoint(point: Vec2d, zoom: number, hitInside: boolean): boolean {
		const { children, operation, margin } = this
		const min = margin / zoom

		if (hitInside) {
			return this.bounds.clone().expandBy(min).containsPoint(point)
		}

		const isCloseEnough = this.distanceToPoint(point) <= this.margin / zoom
		if (!isCloseEnough) return false

		switch (operation) {
			case 'union': {
				return true
			}
			case 'subtract': {
				for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
					child = children[i]

					const nearest = child.nearestPoint(point)
					const dist = nearest.dist(point)

					if (i === 0) {
						if (dist > min) return false
					} else {
						if (dist < -margin) {
							return false
						}
					}
				}
				return true
			}
			case 'exclude': {
				let hits = 0
				for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
					child = children[i]

					const nearest = child.nearestPoint(point)
					const dist = nearest.dist(point)

					if (dist < -margin) {
						hits++
					}
				}
				return hits % 2 === 1
			}
			case 'intersect': {
				return children.every((child) => child.distanceToPoint(point) <= margin / zoom)
			}
		}
	}

	override hitTestLineSegment(A: Vec2d, B: Vec2d, zoom: number): boolean {
		const { children, operation } = this
		switch (operation) {
			case 'union': {
				return children.some((child) => child.hitTestLineSegment(A, B, zoom))
			}
			case 'subtract': {
				for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
					child = children[i]
					if (i === 0) {
						if (child.hitTestLineSegment(A, B, zoom)) {
							continue
						} else {
							break
						}
					} else {
						if (child.hitTestLineSegment(A, B, zoom)) {
							return false
						}
					}
				}
				return true
			}
			case 'exclude': {
				let hits = 0
				for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
					child = children[i]
					if (child.hitTestLineSegment(A, B, zoom)) {
						hits++
					}
				}
				return hits % 2 === 1
			}
			case 'intersect': {
				return children.every((child) => child.hitTestLineSegment(A, B, zoom))
			}
		}
	}

	toSimpleSvgPath() {
		let path = ''
		for (const child of this.children) {
			path += child.toSimpleSvgPath()
		}

		const corners = Box2d.FromPoints(this.vertices).corners

		path += `M${corners[0].x},${corners[0].y} `
		path += `L${corners[1].x},${corners[1].y} `
		path += `L${corners[2].x},${corners[2].y} `
		path += `L${corners[3].x},${corners[3].y} `
		path += 'Z'

		return path
	}
}
