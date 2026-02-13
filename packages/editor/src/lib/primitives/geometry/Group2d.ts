import { EMPTY_ARRAY } from '@tldraw/state'
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
		return this.children
			.filter((c) => !c.isExcludedByFilter(filters))
			.flatMap((c) => c.getVertices(filters))
	}

	override nearestPoint(point: VecLike, filters?: Geometry2dFilters): Vec {
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
		return !!this.children
			.filter((c) => !c.isExcludedByFilter(filters))
			.find((c) => c.hitTestPoint(point, margin, hitInside))
	}

	override hitTestLineSegment(
		A: VecLike,
		B: VecLike,
		zoom: number,
		filters = Geometry2dFilters.EXCLUDE_LABELS
	): boolean {
		return !!this.children
			.filter((c) => !c.isExcludedByFilter(filters))
			.find((c) => c.hitTestLineSegment(A, B, zoom))
	}

	override intersectLineSegment(A: VecLike, B: VecLike, filters?: Geometry2dFilters) {
		return this.children.flatMap((child) => {
			if (child.isExcludedByFilter(filters)) return EMPTY_ARRAY
			return child.intersectLineSegment(A, B, filters)
		})
	}

	override intersectCircle(center: VecLike, radius: number, filters?: Geometry2dFilters) {
		return this.children.flatMap((child) => {
			if (child.isExcludedByFilter(filters)) return EMPTY_ARRAY
			return child.intersectCircle(center, radius, filters)
		})
	}

	override getBoundsVertices(): Vec[] {
		if (this.excludeFromShapeBounds) return []
		return this.children.flatMap((child) => child.getBoundsVertices())
	}

	override intersectPolygon(polygon: VecLike[], filters?: Geometry2dFilters) {
		return this.children.flatMap((child) => {
			if (child.isExcludedByFilter(filters)) return EMPTY_ARRAY
			return child.intersectPolygon(polygon, filters)
		})
	}

	override intersectPolyline(polyline: VecLike[], filters?: Geometry2dFilters) {
		return this.children.flatMap((child) => {
			if (child.isExcludedByFilter(filters)) return EMPTY_ARRAY
			return child.intersectPolyline(polyline, filters)
		})
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

		let closestChild = null
		let closestDistance = Infinity
		let distanceTraveled = 0

		for (const child of this.children) {
			if (child.isExcludedByFilter(filters)) continue
			const childLength = child.getLength(filters)
			const newDistanceTraveled = distanceTraveled + childLength

			const distance = child.distanceToPoint(point, false, filters)
			if (distance < closestDistance) {
				closestDistance = distance
				closestChild = {
					startLength: distanceTraveled,
					endLength: newDistanceTraveled,
					child,
				}
			}

			distanceTraveled = newDistanceTraveled
		}

		assert(closestChild)

		const normalizedDistanceInChild = closestChild.child.uninterpolateAlongEdge(point, filters)
		const childTLength = lerp(
			closestChild.startLength,
			closestChild.endLength,
			normalizedDistanceInChild
		)
		return childTLength / totalLength
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
			const B = corner
			const C = corner.clone().lrp(nextCorner, 4 / nextDist)

			path += `M${A.x},${A.y} L${B.x},${B.y} L${C.x},${C.y} `
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
