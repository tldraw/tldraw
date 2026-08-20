import { assert, invLerp, lerp } from '@tldraw/utils'
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

		const addChildren = (children: Geometry2d[]) => {
			for (const child of children) {
				if (child instanceof Group2d) {
					addChildren(child.children)
				} else if (child.ignore) {
					this.ignoredChildren.push(child)
				} else {
					this.children.push(child)
				}
			}
		}

		addChildren(config.children)

		if (this.children.length === 0) throw Error('Group2d must have at least one child')
	}

	override getVertices(filters: Geometry2dFilters): Vec[] {
		if (this.isExcludedByFilter(filters)) return []
		const vertices: Vec[] = []
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const childVertices = child.getVertices(filters)
			for (let i = 0, n = childVertices.length; i < n; i++) {
				vertices.push(childVertices[i])
			}
		}
		return vertices
	}

	override nearestPoint(point: VecLike, filters?: Geometry2dFilters): Vec {
		let dist = Infinity
		let nearest: Vec | undefined
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const p = child.nearestPoint(point, filters)
			const d = Vec.Dist2(p, point)
			if (d < dist) {
				dist = d
				nearest = p
			}
		}
		if (!nearest) throw Error('nearest point not found')
		return nearest
	}

	override distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
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
		point: VecLike,
		margin: number,
		hitInside: boolean,
		filters = Geometry2dFilters.EXCLUDE_LABELS
	): boolean {
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			if (child.hitTestPoint(point, margin, hitInside)) return true
		}
		return false
	}

	override hitTestLineSegment(
		A: VecLike,
		B: VecLike,
		zoom: number,
		filters = Geometry2dFilters.EXCLUDE_LABELS
	): boolean {
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			if (child.hitTestLineSegment(A, B, zoom)) return true
		}
		return false
	}

	private collectFromChildren(
		filters: Geometry2dFilters | undefined,
		getHits: (child: Geometry2d) => VecLike[]
	) {
		const result: VecLike[] = []
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const hits = getHits(child)
			for (let i = 0, n = hits.length; i < n; i++) {
				result.push(hits[i])
			}
		}
		return result
	}

	override intersectLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		return this.collectFromChildren(filters, (child) => child.intersectLineSegment(A, B, filters))
	}

	override intersectCircle(center: VecLike, radius: number, filters?: Geometry2dFilters) {
		return this.collectFromChildren(filters, (child) =>
			child.intersectCircle(center, radius, filters)
		)
	}

	override getBoundsVertices(): Vec[] {
		if (this.excludeFromShapeBounds) return []
		const vertices: Vec[] = []
		for (const child of this.children) {
			const childVertices = child.getBoundsVertices()
			for (let i = 0, n = childVertices.length; i < n; i++) {
				vertices.push(childVertices[i])
			}
		}
		return vertices
	}

	override intersectPolygon(polygon: VecLike[], filters?: Geometry2dFilters) {
		return this.collectFromChildren(filters, (child) => child.intersectPolygon(polygon, filters))
	}

	override intersectPolyline(polyline: VecLike[], filters?: Geometry2dFilters) {
		return this.collectFromChildren(filters, (child) => child.intersectPolyline(polyline, filters))
	}

	override interpolateAlongEdge(t: number, filters?: Geometry2dFilters): Vec {
		const totalLength = this.getLength(filters)

		const distanceToTravel = t * totalLength
		let distanceTraveled = 0
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const childLength = child.length
			const newDistanceTraveled = distanceTraveled + childLength
			if (newDistanceTraveled >= distanceToTravel) {
				return child.interpolateAlongEdge(
					invLerp(distanceTraveled, newDistanceTraveled, distanceToTravel),
					filters
				)
			}
			distanceTraveled = newDistanceTraveled
		}

		return this.children[this.children.length - 1].interpolateAlongEdge(1, filters)
	}

	override uninterpolateAlongEdge(point: VecLike, filters?: Geometry2dFilters): number {
		const totalLength = this.getLength(filters)

		let closestChild: Geometry2d | null = null
		let closestStart = 0
		let closestEnd = 0
		let closestDistance = Infinity
		let distanceTraveled = 0

		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const newDistanceTraveled = distanceTraveled + child.getLength(filters)

			const distance = child.distanceToPoint(point, false, filters)
			if (distance < closestDistance) {
				closestDistance = distance
				closestChild = child
				closestStart = distanceTraveled
				closestEnd = newDistanceTraveled
			}

			distanceTraveled = newDistanceTraveled
		}

		assert(closestChild)

		const normalizedDistanceInChild = closestChild.uninterpolateAlongEdge(point, filters)
		return lerp(closestStart, closestEnd, normalizedDistanceInChild) / totalLength
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

		const corners = Box.FromPoints(this.boundsVertices).corners
		// draw just a few pixels around each corner, e.g. an L shape for the bottom left

		for (let i = 0, n = corners.length; i < n; i++) {
			const corner = corners[i]
			const prevCorner = corners[(i - 1 + n) % n]
			const prevDist = corner.dist(prevCorner)
			const nextCorner = corners[(i + 1) % n]
			const nextDist = corner.dist(nextCorner)

			const A = corner.clone().lrp(prevCorner, 4 / prevDist)
			const C = corner.clone().lrp(nextCorner, 4 / nextDist)

			path += `M${A.x},${A.y} L${corner.x},${corner.y} L${C.x},${C.y} `
		}
		return path
	}

	getLength(filters?: Geometry2dFilters): number {
		let length = 0
		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			length += child.length
		}
		return length
	}

	getSvgPathData(): string {
		return this.children.map((c, i) => (c.isLabel ? '' : c.getSvgPathData(i === 0))).join(' ')
	}

	overlapsPolygon(polygon: VecLike[]): boolean {
		return this.children.some((child) => child.overlapsPolygon(polygon))
	}
}
