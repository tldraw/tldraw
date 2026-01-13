import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { debugFlags, perfTracker } from '../../utils/debug-flags'
import { Editor } from '../Editor'

function notVisibleShapesSpatial(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapesSpatial', function (prevValue) {
		const perfStart = performance.now()

		// New implementation using spatial index
		const allShapeIds = editor.getCurrentPageShapeIds()
		const viewportPageBounds = editor.getViewportPageBounds()
		const visibleIds = new Set(editor.getShapeIdsInsideBounds(viewportPageBounds))

		const nextValue = new Set<TLShapeId>()

		// Non-visible shapes are all shapes minus visible shapes
		for (const id of allShapeIds) {
			if (!visibleIds.has(id)) {
				const shape = editor.getShape(id)
				if (!shape) continue

				const canCull = editor.getShapeUtil(shape.type).canCull(shape)
				if (!canCull) continue

				nextValue.add(id)
			}
		}

		const notVisibleCount = nextValue.size
		const visibleCount = allShapeIds.size - notVisibleCount

		if (isUninitialized(prevValue)) {
			if (debugFlags.perfLogCulling.get()) {
				const totalTime = performance.now() - perfStart
				const info = `visible ${visibleCount}, not-visible ${notVisibleCount}`
				// eslint-disable-next-line no-console
				console.log(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
			}
			return nextValue
		}

		// Calculate change
		const prevSize = prevValue.size
		const notVisibleAdded = nextValue.size - prevSize
		const visibleAdded = -notVisibleAdded // Opposite: if 5 shapes became not-visible, then -5 became visible
		let hasChanges = prevValue.size !== nextValue.size

		// If any of the old shapes are not in the new set, we know there's a change
		if (!hasChanges) {
			for (const prev of prevValue) {
				if (!nextValue.has(prev)) {
					hasChanges = true
					break
				}
			}
		}

		if (debugFlags.perfLogCulling.get()) {
			const totalTime = performance.now() - perfStart
			if (hasChanges) {
				let visibleChange = ''
				let notVisibleChange = ''

				if (visibleAdded !== 0) {
					const change = visibleAdded > 0 ? `+${visibleAdded}` : `${visibleAdded}`
					visibleChange = ` (${change})`
				}
				if (notVisibleAdded !== 0) {
					const change = notVisibleAdded > 0 ? `+${notVisibleAdded}` : `${notVisibleAdded}`
					notVisibleChange = ` (${change})`
				}

				const info = `\x1b[1mvisible ${visibleCount}${visibleChange}, not-visible ${notVisibleCount}${notVisibleChange}\x1b[0m`
				// eslint-disable-next-line no-console
				console.log(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
			} else {
				const info = `visible ${visibleCount}, not-visible ${notVisibleCount}`
				// eslint-disable-next-line no-console
				console.log(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
			}
		}

		if (hasChanges) {
			return nextValue
		}

		return prevValue
	})
}

function notVisibleShapesOld(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapesOld', function (prevValue) {
		const perfStart = performance.now()
		const shapeIds = editor.getCurrentPageShapeIds()

		const nextValue = new Set<TLShapeId>()

		// Extract viewport bounds once to avoid repeated property access
		const viewportPageBounds = editor.getViewportPageBounds()
		const viewMinX = viewportPageBounds.minX
		const viewMinY = viewportPageBounds.minY
		const viewMaxX = viewportPageBounds.maxX
		const viewMaxY = viewportPageBounds.maxY

		for (const id of shapeIds) {
			const pageBounds = editor.getShapePageBounds(id)

			// Hybrid check: if bounds exist and shape overlaps viewport, it's visible.
			// This inlines Box.Collides to avoid function call overhead and the
			// redundant Contains check that Box.Includes was doing.
			if (
				pageBounds !== undefined &&
				pageBounds.maxX >= viewMinX &&
				pageBounds.minX <= viewMaxX &&
				pageBounds.maxY >= viewMinY &&
				pageBounds.minY <= viewMaxY
			) {
				continue
			}

			// Shape is outside viewport or has no bounds - check if it can be culled.
			// We defer getShape and canCull checks until here since most shapes are
			// typically visible and we can skip these calls for them.
			const shape = editor.getShape(id)
			if (!shape) continue

			const canCull = editor.getShapeUtil(shape.type).canCull(shape)
			if (!canCull) continue

			nextValue.add(id)
		}

		const notVisibleCount = nextValue.size
		const visibleCount = shapeIds.size - notVisibleCount

		if (isUninitialized(prevValue)) {
			if (debugFlags.perfLogCulling.get()) {
				const totalTime = performance.now() - perfStart
				const info = `visible ${visibleCount}, not-visible ${notVisibleCount}`
				// eslint-disable-next-line no-console
				console.log(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
			}
			return nextValue
		}

		// Calculate change
		const prevSize = prevValue.size
		const notVisibleAdded = nextValue.size - prevSize
		const visibleAdded = -notVisibleAdded // Opposite: if 5 shapes became not-visible, then -5 became visible
		let hasChanges = prevValue.size !== nextValue.size

		// If any of the old shapes are not in the new set, we know there's a change
		if (!hasChanges) {
			for (const prev of prevValue) {
				if (!nextValue.has(prev)) {
					hasChanges = true
					break
				}
			}
		}

		if (debugFlags.perfLogCulling.get()) {
			const totalTime = performance.now() - perfStart
			if (hasChanges) {
				let visibleChange = ''
				let notVisibleChange = ''

				if (visibleAdded !== 0) {
					const change = visibleAdded > 0 ? `+${visibleAdded}` : `${visibleAdded}`
					visibleChange = ` (${change})`
				}
				if (notVisibleAdded !== 0) {
					const change = notVisibleAdded > 0 ? `+${notVisibleAdded}` : `${notVisibleAdded}`
					notVisibleChange = ` (${change})`
				}

				const info = `\x1b[1mvisible ${visibleCount}${visibleChange}, not-visible ${notVisibleCount}${notVisibleChange}\x1b[0m`
				// eslint-disable-next-line no-console
				console.log(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
			} else {
				const info = `visible ${visibleCount}, not-visible ${notVisibleCount}`
				// eslint-disable-next-line no-console
				console.log(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
			}
		}

		if (hasChanges) {
			return nextValue
		}

		return prevValue
	})
}

/**
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	let spatialComputed: ReturnType<typeof notVisibleShapesSpatial> | null = null
	let oldComputed: ReturnType<typeof notVisibleShapesOld> | null = null

	return computed<Set<TLShapeId>>('notVisibleShapes', () => {
		const useSpatialIndex = debugFlags.useSpatialIndex.get()

		if (useSpatialIndex) {
			if (!spatialComputed) {
				spatialComputed = notVisibleShapesSpatial(editor)
			}
			return spatialComputed.get()
		}

		if (!oldComputed) {
			oldComputed = notVisibleShapesOld(editor)
		}
		return oldComputed.get()
	})
}
