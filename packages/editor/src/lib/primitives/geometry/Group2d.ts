import { Geometry2d } from '../Geometry2d'
import { Vec2d } from '../Vec2d'

/** @public */
export class Group2d extends Geometry2d {
	children: Geometry2d[]
	operation: 'union' | 'subtract' | 'exclude' | 'intersect'

	constructor(config: {
		children: Geometry2d[]
		isFilled: boolean
		margin: number
		operation: 'union' | 'subtract' | 'exclude' | 'intersect'
	}) {
		super()
		const { children, margin, operation } = config

		if (children.length === 0) throw Error('Group2d must have at least one child')

		this.operation = operation
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
		const { children, operation } = this
		switch (operation) {
			case 'union': {
				return children.some((child) => child.hitTestLineSegment(A, B))
			}
			case 'subtract': {
				for (let i = 0, child: Geometry2d, n = children.length; i < n; i++) {
					child = children[i]
					if (i === 0) {
						if (child.hitTestLineSegment(A, B)) {
							continue
						} else {
							break
						}
					} else {
						if (child.hitTestLineSegment(A, B)) {
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
					if (child.hitTestLineSegment(A, B)) {
						hits++
					}
				}
				return hits % 2 === 1
			}
			case 'intersect': {
				return children.every((child) => child.hitTestLineSegment(A, B))
			}
		}
	}
}
