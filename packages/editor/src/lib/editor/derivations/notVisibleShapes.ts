import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { debugFlags, perfTracker } from '../../utils/debug-flags'
import { Editor } from '../Editor'

/**
 * Non visible shapes are shapes outside of the viewport page bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export function notVisibleShapes(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
		const perfStart = performance.now()
		const useSpatialIndex = debugFlags.useSpatialIndex.get()

		if (useSpatialIndex) {
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

			if (isUninitialized(prevValue)) {
				if (debugFlags.perfLogCulling.get()) {
					const totalTime = performance.now() - perfStart
					const info = `${nextValue.size} non-visible`
					console.warn(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
					perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
				}
				return nextValue
			}

			// If there are more or less shapes, we know there's a change
			if (prevValue.size !== nextValue.size) {
				if (debugFlags.perfLogCulling.get()) {
					const totalTime = performance.now() - perfStart
					const info = `${nextValue.size} non-visible`
					console.warn(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
					perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
				}
				return nextValue
			}

			// If any of the old shapes are not in the new set, we know there's a change
			for (const prev of prevValue) {
				if (!nextValue.has(prev)) {
					if (debugFlags.perfLogCulling.get()) {
						const totalTime = performance.now() - perfStart
						const info = `${nextValue.size} non-visible`
						console.warn(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
						perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
					}
					return nextValue
				}
			}

			// If we've made it here, we know that the set is the same
			if (debugFlags.perfLogCulling.get()) {
				const totalTime = performance.now() - perfStart
				const info = `unchanged`
				console.warn(`[Perf] notVisibleShapes (spatial): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (spatial)`, totalTime, info)
			}
			return prevValue
		}

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

		if (isUninitialized(prevValue)) {
			if (debugFlags.perfLogCulling.get()) {
				const totalTime = performance.now() - perfStart
				const info = `${nextValue.size} non-visible`
				console.warn(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
			}
			return nextValue
		}

		// If there are more or less shapes, we know there's a change
		if (prevValue.size !== nextValue.size) {
			if (debugFlags.perfLogCulling.get()) {
				const totalTime = performance.now() - perfStart
				const info = `${nextValue.size} non-visible`
				console.warn(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
				perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
			}
			return nextValue
		}

		// If any of the old shapes are not in the new set, we know there's a change
		for (const prev of prevValue) {
			if (!nextValue.has(prev)) {
				if (debugFlags.perfLogCulling.get()) {
					const totalTime = performance.now() - perfStart
					const info = `${nextValue.size} non-visible`
					console.warn(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
					perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
				}
				return nextValue
			}
		}

		// If we've made it here, we know that the set is the same
		if (debugFlags.perfLogCulling.get()) {
			const totalTime = performance.now() - perfStart
			const info = `unchanged`
			console.warn(`[Perf] notVisibleShapes (old): ${totalTime.toFixed(2)}ms (${info})`)
			perfTracker.track(`notVisibleShapes (old)`, totalTime, info)
		}
		return prevValue
	})
}
