import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Group2d } from '../../primitives/geometry/Group2d'
import { VecLike } from '../../primitives/Vec'

// Pure hit-test distance and ranking math. Editor keeps the z-order loop and every editor read
// (masks, shape utils, page bounds, hit test margin) at its original point, then calls in here, so
// nothing in this file may read editor state.
//
// Shapes are opaque to this file: the ranking is generic over whatever the caller is ranking.

/** How close a point must be to count as a hit, and whether the shape's interior counts. */
export interface HitTestMargins {
	innerMargin: number
	outerMargin: number
	hitInside: boolean
}

/**
 * The distance from a point (in the shape's own space) to a shape's geometry. Returns Infinity
 * when the point is nowhere near the geometry.
 */
export function getDistanceToGeometry(
	geometry: Geometry2d,
	pointInShapeSpace: VecLike,
	opts: { isGroup: boolean; hitLabels: boolean; hitInside: boolean; outerMargin: number }
): number {
	const { isGroup, hitLabels, hitInside, outerMargin } = opts

	if (isGroup) {
		let minDistance = Infinity
		for (const childGeometry of (geometry as Group2d).children) {
			if (childGeometry.isLabel && !hitLabels) continue

			// hit test the all of the child geometries that aren't labels
			const tDistance = childGeometry.distanceToPoint(pointInShapeSpace, hitInside)
			if (tDistance < minDistance) {
				minDistance = tDistance
			}
		}

		return minDistance
	}

	// If the margin is zero and the geometry has a very small width or height,
	// then check the actual distance. This is to prevent a bug where straight
	// lines would never pass the broad phase (point-in-bounds) check.
	if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
		return geometry.distanceToPoint(pointInShapeSpace, hitInside)
	}

	// Broad phase
	if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
		// Narrow phase (actual distance)
		return geometry.distanceToPoint(pointInShapeSpace, hitInside)
	}

	// Failed the broad phase, geddafugaotta'ere!
	return Infinity
}

/**
 * Where a point falls relative to a frame-like shape: within its outer margin, inside its body, or
 * clear of it entirely.
 */
export type FrameLikeHit = 'in-margin' | 'body' | 'behind'

/** Classify a point against a frame-like shape's geometry. */
export function classifyFrameLikeHit(
	geometry: Geometry2d,
	pointInShapeSpace: VecLike,
	opts: { innerMargin: number; outerMargin: number; hitFrameInside: boolean }
): FrameLikeHit {
	const { innerMargin, outerMargin, hitFrameInside } = opts

	// If the hit is within the frame's outer margin, then select the frame
	const distance = geometry.distanceToPoint(pointInShapeSpace, hitFrameInside)
	if (
		hitFrameInside
			? (distance > 0 && distance <= outerMargin) || (distance <= 0 && distance > -innerMargin)
			: distance > 0 && distance <= outerMargin
	) {
		return 'in-margin'
	}

	if (geometry.hitTestPoint(pointInShapeSpace, 0, true)) {
		return 'body'
	}

	return 'behind'
}

/**
 * The outcome of testing a point against a closed shape. `filled` is an immediate hit; `ignored`
 * means the geometry rejected the hit (e.g. a transparent image pixel) and shapes behind it should
 * be checked; `in-margin` and `hollow` are candidates that only win if nothing better turns up.
 */
export type ClosedShapeHit =
	| { type: 'filled' }
	| { type: 'ignored' }
	| { type: 'in-margin'; distance: number }
	| { type: 'hollow' }
	| { type: 'miss' }

/**
 * Classify a point against a closed shape, given its distance from
 * {@link getDistanceToGeometry}. `hasMarginHit` is whether a closer-to-the-edge candidate has
 * already been found above this shape.
 */
export function classifyClosedShapeHit(
	geometry: Geometry2d,
	pointInShapeSpace: VecLike,
	distance: number,
	opts: HitTestMargins & { isGroup: boolean; hasMarginHit: boolean }
): ClosedShapeHit {
	const { innerMargin, outerMargin, hitInside, isGroup, hasMarginHit } = opts

	// For closed shapes, the distance will be positive if outside of
	// the shape or negative if inside of the shape. If the distance
	// is greater than the margin, then it's a miss. Otherwise...

	// Are we close to the shape's edge?
	if (distance <= outerMargin || (hitInside && distance <= 0 && distance > -innerMargin)) {
		if (geometry.isFilled || (isGroup && (geometry as Group2d).children[0].isFilled)) {
			// If the geometry rejects this hit (e.g. transparent image pixel),
			// skip this shape and check shapes behind it.
			if (geometry.ignoreHit(pointInShapeSpace)) {
				return { type: 'ignored' }
			}
			// If the shape is filled, then it's a hit. Remember, we're
			// starting from the TOP-MOST shape in z-index order, so any
			// other hits would be occluded by the shape.
			return { type: 'filled' }
		} else {
			// If we're close to the edge of the shape, and if it's the closest edge among
			// all the edges that we've gotten close to so far, then we will want to hit the
			// shape unless we hit something else or closer in later iterations.
			if (
				hitInside
					? // On hitInside, the distance will be negative for hits inside
						// If the distance is positive, check against the outer margin
						(distance > 0 && distance <= outerMargin) ||
						// If the distance is negative, check against the inner margin
						(distance <= 0 && distance > -innerMargin)
					: // If hitInside is false, then sadly _we do not know_ whether the
						// point is inside or outside of the shape, so we check against
						// the max of the two margins
						Math.abs(distance) <= Math.max(innerMargin, outerMargin)
			) {
				return { type: 'in-margin', distance: Math.abs(distance) }
			} else if (!hasMarginHit) {
				// If we're not within margin distance to any edge, and if the
				// shape is hollow, then we want to hit the shape with the
				// smallest area. (There's a bug here with self-intersecting
				// shapes, like a closed drawing of an "8", but that's a bigger
				// problem to solve.)
				return { type: 'hollow' }
			}
		}
	}

	return { type: 'miss' }
}

/**
 * The best candidates seen so far while walking shapes from the top of the z-order down: the shape
 * whose edge the point came closest to, and the smallest hollow shape the point landed in.
 */
export interface HitRanking<T> {
	marginDistance: number
	marginHit: T | null
	hollowArea: number
	hollowHit: T | null
}

/** Start ranking hit candidates. */
export function createHitRanking<T>(): HitRanking<T> {
	return {
		marginDistance: Infinity,
		marginHit: null,
		hollowArea: Infinity,
		hollowHit: null,
	}
}

/** Offer a shape whose edge the point came within margin distance of. */
export function offerMarginHit<T>(ranking: HitRanking<T>, shape: T, distance: number): void {
	if (distance < ranking.marginDistance) {
		ranking.marginDistance = distance
		ranking.marginHit = shape
	}
}

/** Offer a hollow shape that the point landed inside of. */
export function offerHollowHit<T>(ranking: HitRanking<T>, shape: T, area: number): void {
	if (area < ranking.hollowArea) {
		ranking.hollowArea = area
		ranking.hollowHit = shape
	}
}

/**
 * The winner for an open shape (e.g. a line or draw shape) the point is within margin distance of.
 * An edge already hit above this shape that is at least as close still wins, matching the
 * closest-edge rule used for hollow shapes.
 */
export function getBestOpenShapeHit<T>(ranking: HitRanking<T>, shape: T, distance: number): T {
	if (ranking.marginHit && ranking.marginDistance <= distance) {
		return ranking.marginHit
	}
	return shape
}

/**
 * The winner once every shape has been checked: the shape whose edge was closest to the point, or
 * else the smallest hollow shape it landed in.
 */
export function getBestHit<T>(ranking: HitRanking<T>): T | undefined {
	// If we haven't hit any filled shapes or frames, then return either
	// the shape who we hit within the margin (and of those, the one that
	// had the shortest distance between the point and the shape edge),
	// or else the hollow shape with the smallest area—or if we didn't hit
	// any margins or any hollow shapes, then null.
	return ranking.marginHit || ranking.hollowHit || undefined
}
