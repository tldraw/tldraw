import {
	computed,
	Editor,
	TLArrowShape,
	Vec,
	VecLike,
	WeakCache,
	whyAmIRunning,
} from '@tldraw/editor'
import { Computed } from '@tldraw/state'

const snapLinesStore = new WeakCache<Editor, Computed<Map<number, Set<number>>>>()
const origin = { x: 0, y: 0 }

export function getElbowArrowSnapLines(editor: Editor) {
	return snapLinesStore
		.get(editor, (editor) => {
			const currentSelectedArrowShape = computed('current selected arrow shape', () => {
				const shape = editor.getOnlySelectedShape()
				if (!shape || !editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) return null
				return shape.id
			})

			const unselectedArrowShapeIds = editor.store.query.ids('shape', () => {
				const activeArrowShapeId = currentSelectedArrowShape.get()
				if (!activeArrowShapeId) return { type: { eq: 'arrow' } }
				return {
					type: { eq: 'arrow' },
					id: { neq: activeArrowShapeId },
				}
			})

			return computed('elbow arrow snap lines', () => {
				console.log('compute elbow arrow snap lines', unselectedArrowShapeIds.get())
				whyAmIRunning()

				// the result is a map from angle (0-π), to a set of single-axis co-ordinates. For
				// example, if a line from (0, 1) to (1, 1) is found (ie a horizontal line at y-coord 1),
				// we'll add an entry to the map with the key 0 (horizontal), and the set containing 1.
				const result = new Map()

				const currentPageShapeIds = editor.getCurrentPageShapeIds()
				const viewportBounds = editor.getViewportPageBounds()

				for (const id of unselectedArrowShapeIds.get()) {
					if (!currentPageShapeIds.has(id)) continue

					const shape = editor.getShape<TLArrowShape>(id)
					if (shape?.type !== 'arrow') continue

					const shapeBounds = editor.getShapePageBounds(id)
					if (!shapeBounds || !viewportBounds.includes(shapeBounds)) continue

					const geometry = editor.getShapePageGeometry(id)
					const vertices = geometry.getVertices({ includeInternal: false, includeLabels: false })

					for (let i = 1; i < vertices.length; i++) {
						const prev = vertices[i - 1]
						const curr = vertices[i]

						let angle = Vec.Angle(prev, curr)

						// we don't care if the angle is going "up" or "down" - so we only care
						// about the 0-π range
						if (angle < 0) angle += Math.PI

						let set = result.get(angle)
						if (!set) {
							set = new Set()
							result.set(angle, set)
						}

						const distance = perpDistanceToLineAngle(prev, angle)
						set.add(distance)
					}
				}

				return result
			})
		})
		.get()
}

/**
 * Return the signed distance from the origin to a point on a line of angle `lineAngle` that passes
 * through the point `pointOnLine`.
 */
export function perpDistanceToLineAngle(pointOnLine: VecLike, lineAngle: number): number {
	// The perpendicular unit vector to the line direction
	const perpDir = Vec.FromAngle(lineAngle).per()
	// Project the point onto the perpendicular vector
	return Vec.Dpr(pointOnLine, perpDir)
}

/**
 * Return the signed distance from the origin to the line segment defined by `A` and `B`.
 */
export function perpDistanceToLine(A: VecLike, B: VecLike): number {
	return perpDistanceToLineAngle(A, Vec.Angle(A, B))
}
