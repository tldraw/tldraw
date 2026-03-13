import type { Point } from '../fill-path/types'
import { easeInOutCubic } from './easing'
import { generatePressure } from './pressure'
import {
	AnimationOptions,
	DEFAULT_ANIMATION_OPTIONS,
	DEFAULT_PRESSURE_OPTIONS,
	PressureOptions,
} from './types'

export { EASING_FUNCTIONS } from './easing'
export { generatePressure, generatePressureArray } from './pressure'
export { DEFAULT_ANIMATION_OPTIONS, DEFAULT_PRESSURE_OPTIONS } from './types'
export type { AnimationOptions, EasingFn, PressureOptions } from './types'

/** A point with pressure information for draw shapes */
export interface PressuredPoint {
	x: number
	y: number
	z: number // pressure 0–1
}

/**
 * Convert a path of points into pressured points with simulated pressure.
 *
 * @param path - Array of 2D points
 * @param pressureOptions - Pressure simulation options
 * @returns Array of points with pressure (z) values
 */
export function applyPressure(
	path: Point[],
	pressureOptions?: Partial<PressureOptions>
): PressuredPoint[] {
	const opts = { ...DEFAULT_PRESSURE_OPTIONS, ...pressureOptions }

	// Calculate cumulative distances
	let cumDist = 0
	const result: PressuredPoint[] = []

	for (let i = 0; i < path.length; i++) {
		if (i > 0) {
			const dx = path[i].x - path[i - 1].x
			const dy = path[i].y - path[i - 1].y
			cumDist += Math.sqrt(dx * dx + dy * dy)
		}
		result.push({
			x: path[i].x,
			y: path[i].y,
			z: generatePressure(cumDist, opts),
		})
	}

	return result
}

/**
 * Animate drawing a path on a tldraw canvas.
 *
 * Creates a draw shape and progressively reveals it over time.
 * Requires a tldraw Editor instance and uses its createShape/updateShape APIs.
 *
 * @param editor - tldraw Editor instance
 * @param path - Array of 2D points defining the path
 * @param options - Animation and pressure options
 * @returns Object with stop() method to cancel the animation
 */
export function animatePath(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	editor: any,
	path: Point[],
	options?: Partial<AnimationOptions>,
	// These are injected so we don't import tldraw directly in this module
	helpers?: {
		createShapeId: () => string
		encodePoints: (points: { x: number; y: number; z: number }[]) => string
	}
): { stop: () => void; promise: Promise<void> } {
	const opts: AnimationOptions = {
		...DEFAULT_ANIMATION_OPTIONS,
		easing: easeInOutCubic,
		...options,
	}

	const encode = helpers!.encodePoints
	const makeId = helpers!.createShapeId

	const pressuredPoints = applyPressure(path, opts.pressure)

	// Find bounding box for shape positioning
	let minX = Infinity,
		minY = Infinity
	for (const p of path) {
		if (p.x < minX) minX = p.x
		if (p.y < minY) minY = p.y
	}

	// Make points relative to shape origin
	const relativePoints = pressuredPoints.map((p) => ({
		x: p.x - minX,
		y: p.y - minY,
		z: p.z,
	}))

	const shapeId = makeId()
	let animFrameId: number | null = null
	let stopped = false

	const promise = new Promise<void>((resolve) => {
		// Create initial shape with first point
		editor.createShape({
			id: shapeId,
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				segments: [
					{
						type: opts.segmentType,
						path: encode([relativePoints[0]]),
					},
				],
				color: opts.color,
				size: 'm',
				isComplete: false,
				isClosed: false,
				isPen: true,
				scale: 1,
			},
		})

		const startTime = performance.now()
		let lastPointIndex = 0

		function tick() {
			if (stopped) {
				resolve()
				return
			}

			const elapsed = performance.now() - startTime
			const rawProgress = Math.min(elapsed / opts.duration, 1)
			const progress = opts.easing(rawProgress)

			opts.onProgress?.(progress)

			// Calculate how many points to show
			const targetIndex = Math.floor(progress * (relativePoints.length - 1))

			if (targetIndex > lastPointIndex) {
				// Update shape with points up to current progress
				const visiblePoints = relativePoints.slice(0, targetIndex + 1)
				editor.updateShape({
					id: shapeId,
					type: 'draw',
					props: {
						segments: [
							{
								type: opts.segmentType,
								path: encode(visiblePoints),
							},
						],
						isComplete: rawProgress >= 1,
					},
				})
				lastPointIndex = targetIndex
			}

			if (rawProgress < 1) {
				animFrameId = requestAnimationFrame(tick)
			} else {
				// Ensure final state
				editor.updateShape({
					id: shapeId,
					type: 'draw',
					props: {
						segments: [
							{
								type: opts.segmentType,
								path: encode(relativePoints),
							},
						],
						isComplete: true,
					},
				})
				opts.onComplete?.()
				resolve()
			}
		}

		animFrameId = requestAnimationFrame(tick)
	})

	return {
		stop() {
			stopped = true
			if (animFrameId !== null) {
				cancelAnimationFrame(animFrameId)
			}
		},
		promise,
	}
}
