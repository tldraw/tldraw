import { Box } from '../Box'
import { Mat } from '../Mat'
import { Vec, VecLike } from '../Vec'
import { Geometry2d, Geometry2dFilters, Geometry2dOptions } from './Geometry2d'

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

	override getVertices(filters: Geometry2dFilters): Vec[] {
		if (this.isExcludedByFilter(filters)) return []
		return this.children
			.filter((c) => !c.isExcludedByFilter(filters))
			.flatMap((c) => c.getVertices(filters))
	}

	override nearestPoint(point: Vec, filters?: Geometry2dFilters): Vec {
		let dist = Infinity
		let nearest: Vec | undefined

		const { children } = this

		if (children.length === 0) {
			throw Error('no children')
		}

		let p: Vec
		let d: number
		for (const child of children) {
			if (child.isExcludedByFilter(filters)) continue
			p = child.nearestPoint(point, filters)
			d = Vec.Dist2(p, point)
			if (d < dist) {
				dist = d
				nearest = p
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	override distanceToPoint(point: Vec, hitInside = false, filters?: Geometry2dFilters) {
		let smallestDistance = Infinity
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const distance = child.distanceToPoint(point, hitInside, filters)
			if (distance < smallestDistance) {
				smallestDistance = distance
			}
		}
		return smallestDistance
	}

	override hitTestPoint(
		point: Vec,
		margin: number,
		hitInside: boolean,
		filters = Geometry2dFilters.EXCLUDE_LABELS
	): boolean {
		return !!this.children
			.filter((c) => !c.isExcludedByFilter(filters))
			.find((c) => c.hitTestPoint(point, margin, hitInside))
	}

	override hitTestLineSegment(
		A: Vec,
		B: Vec,
		zoom: number,
		filters = Geometry2dFilters.EXCLUDE_LABELS
	): boolean {
		return !!this.children
			.filter((c) => !c.isExcludedByFilter(filters))
			.find((c) => c.hitTestLineSegment(A, B, zoom))
	}

	override *intersectLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			yield* child.intersectLineSegment(A, B, filters)
		}
	}

	override transform(transform: Mat): Geometry2d {
		return new Group2d({
			children: this.children.map((c) => c.transform(transform)),
			isLabel: this.isLabel,
			debugColor: this.debugColor,
			ignore: this.ignore,
		})
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

	getLength(): number {
		return this.children.reduce((a, c) => (c.isLabel ? a : a + c.length), 0)
	}

	getSvgPathData(): string {
		return this.children.map((c, i) => (c.isLabel ? '' : c.getSvgPathData(i === 0))).join(' ')
	}
}
