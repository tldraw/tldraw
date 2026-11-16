import { b64Vecs, VecModel } from '@tldraw/editor'
import { createDrawSegments } from '../../utils/test-helpers'
import { interpolateSegments } from './interpolate-props'

function freeSegment(points: VecModel[]) {
	return [{ type: 'free' as const, path: b64Vecs.encodePoints(points) }]
}

describe('interpolateSegments', () => {
	const pointA = { x: 0, y: 0, z: 0.5 }
	const pointB = { x: 10, y: 10, z: 0.5 }
	const segments = createDrawSegments([[pointA, pointB]])

	it('interpolates between two non-empty sides', () => {
		expect(interpolateSegments(segments, createDrawSegments([[pointB]]), 0.5)).toEqual(
			freeSegment([
				{ x: 5, y: 5, z: 0.5 },
				{ x: 10, y: 10, z: 0.5 },
			])
		)
	})

	it('returns a single empty segment when both sides are empty', () => {
		expect(interpolateSegments([], [], 0.5)).toEqual(freeSegment([]))
	})

	it('grows out of the end side’s first point when the start side is empty', () => {
		// At t=0 the whole stroke sits at the end side's first point
		expect(interpolateSegments([], segments, 0)).toEqual(freeSegment([pointA, pointA]))
		expect(interpolateSegments([], segments, 0.5)).toEqual(
			freeSegment([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 5, y: 5, z: 0.5 },
			])
		)
		// At t=1 the stroke matches the end side exactly
		expect(interpolateSegments([], segments, 1)).toEqual(freeSegment([pointA, pointB]))
	})

	it('shrinks into the start side’s first point when the end side is empty', () => {
		// At t=0 the stroke matches the start side exactly
		expect(interpolateSegments(segments, [], 0)).toEqual(freeSegment([pointA, pointB]))
		expect(interpolateSegments(segments, [], 0.5)).toEqual(
			freeSegment([
				{ x: 0, y: 0, z: 0.5 },
				{ x: 5, y: 5, z: 0.5 },
			])
		)
		// At t=1 the whole stroke has collapsed into the start side's first point
		expect(interpolateSegments(segments, [], 1)).toEqual(freeSegment([pointA, pointA]))
	})
})
