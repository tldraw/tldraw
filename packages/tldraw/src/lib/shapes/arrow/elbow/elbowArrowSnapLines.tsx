import {
	computed,
	Computed,
	Editor,
	TLArrowShape,
	TLShapeId,
	Vec,
	VecLike,
	WeakCache,
} from '@tldraw/editor'
import { getArrowBindings } from '../shared'

/**
 * A snap line for an elbow arrow segment.
 *
 * This should already belong to ElbowArrowSnapLines establishing an angle of the line.
 */
interface ElbowArrowSnapLine {
	/** The id of the shape that the snap line starts from. */
	startBoundShapeId: TLShapeId | undefined
	/** The id of the shape that the snap line ends at. */
	endBoundShapeId: TLShapeId | undefined
	/** The perpendicular distance from the snap line to the origin. */
	perpDistance: number
}

/**
 * A map from an angle (0-π) to a set of snap lines. Snap lines are stored in page space. They're
 * modelled as an angle (the angle of the line itself) and a perpendicular signed distance from the
 * page origin. Each line is effectively infinite in length, but modelling them in this way makes it
 * pretty efficient for us to query for relevant snap lines.
 */
type ElbowArrowSnapLines = Map<number, Set<ElbowArrowSnapLine>>

const snapLinesStore = new WeakCache<Editor, Computed<ElbowArrowSnapLines>>()

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
				// the result is a map from angle (0-π), to a set of single-axis co-ordinates. For
				// example, if a line from (0, 1) to (1, 1) is found (ie a horizontal line at y-coord 1),
				// we'll add an entry to the map with the key 0 (horizontal), and the set containing 1.
				const result = new Map<number, Set<ElbowArrowSnapLine>>()

				const currentPageShapeIds = editor.getCurrentPageShapeIds()
				const viewportBounds = editor.getViewportPageBounds()

				for (const id of unselectedArrowShapeIds.get()) {
					if (!currentPageShapeIds.has(id)) continue

					const shape = editor.getShape<TLArrowShape>(id)
					if (shape?.type !== 'arrow') continue

					const shapeBounds = editor.getShapePageBounds(id)
					if (!shapeBounds || !viewportBounds.includes(shapeBounds)) continue

					const bindings = getArrowBindings(editor, shape)
					const pageTransform = editor.getShapePageTransform(id)
					if (!pageTransform) continue

					const geometry = editor.getShapeGeometry(id)

					const pageVertices = pageTransform.applyToPoints(geometry.vertices)

					for (let i = 1; i < pageVertices.length; i++) {
						const prev = pageVertices[i - 1]
						const curr = pageVertices[i]

						let angle = Vec.Angle(prev, curr)

						// we don't care if the angle is going "up" or "down" - so we only care
						// about the 0-π range
						if (angle < 0) angle += Math.PI

						let set = result.get(angle)
						if (!set) {
							set = new Set()
							result.set(angle, set)
						}

						const perpDistance = perpDistanceToLineAngle(prev, angle)

						set.add({
							perpDistance,
							startBoundShapeId: bindings.start?.toId,
							endBoundShapeId: bindings.end?.toId,
						})
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
