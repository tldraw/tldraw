import { TLBinding, TLShape, TLShapeId } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { Box } from '../../primitives/Box'
import { HALF_PI } from '../../primitives/utils'
import type { Editor } from '../Editor'
import type { TLShapeUtilCanBeLaidOutOpts } from '../shapes/ShapeUtil'

export interface ShapeCluster {
	shapes: TLShape[]
	pageBounds: Box
}

/**
 * Group shapes into the units a layout operation moves together: each shape that can be laid
 * out, plus whatever is tied to it through arrow bindings.
 */
export function getShapeClusters(
	editor: Editor,
	ids: TLShapeId[],
	type: TLShapeUtilCanBeLaidOutOpts['type'],
	opts?: { filterAxisAligned?: boolean }
): { clusters: ShapeCluster[] } {
	// always fresh shapes
	let freshShapes = compact(ids.map((id) => editor.getShape(id)))

	// optionally filter to axis-aligned shapes (rotation is a multiple of 90 degrees)
	if (opts?.filterAxisAligned) {
		freshShapes = freshShapes.filter((s) => {
			// Page rotations come back through atan2 on a composed matrix, so a 270° shape can land
			// a hair either side of the multiple; an exact === 0 check drops it
			const remainder = Math.abs(editor.getShapePageTransform(s).rotation() % HALF_PI)
			return Math.min(remainder, HALF_PI - remainder) < 1e-9
		})
	}

	const clusters: ShapeCluster[] = []
	const visited = new Set<TLShapeId>()

	for (const shape of freshShapes) {
		if (visited.has(shape.id)) continue
		visited.add(shape.id)

		const shapePageBounds = editor.getShapePageBounds(shape)
		if (!shapePageBounds) continue

		if (
			!editor.getShapeUtil(shape).canBeLaidOut?.(shape, {
				type,
				shapes: freshShapes,
			})
		) {
			continue
		}

		const shapesMovingTogether = [shape]
		const boundsOfShapesMovingTogether: Box[] = [shapePageBounds]

		// Seed with bindings in both directions, otherwise an arrow visited before the shapes it
		// binds ends up in a cluster of its own and the result depends on input order
		collectShapesViaArrowBindings(editor, {
			bindings: editor.getBindingsInvolvingShape(shape.id, 'arrow'),
			initialShapes: freshShapes,
			resultShapes: shapesMovingTogether,
			resultBounds: boundsOfShapesMovingTogether,
			visited,
		})

		const commonPageBounds = Box.Common(boundsOfShapesMovingTogether)
		if (!commonPageBounds) continue

		clusters.push({
			shapes: shapesMovingTogether,
			pageBounds: commonPageBounds,
		})
	}

	return { clusters }
}

function collectShapesViaArrowBindings(
	editor: Editor,
	info: {
		initialShapes: TLShape[]
		resultShapes: TLShape[]
		resultBounds: Box[]
		bindings: TLBinding[]
		visited: Set<TLShapeId>
	}
) {
	const { initialShapes, resultShapes, resultBounds, bindings, visited } = info
	for (const binding of bindings) {
		for (const id of [binding.fromId, binding.toId]) {
			if (!visited.has(id)) {
				const aligningShape = initialShapes.find((s) => s.id === id)
				if (aligningShape && !visited.has(aligningShape.id)) {
					visited.add(aligningShape.id)
					const shapePageBounds = editor.getShapePageBounds(aligningShape)
					if (!shapePageBounds) continue
					resultShapes.push(aligningShape)
					resultBounds.push(shapePageBounds)
					collectShapesViaArrowBindings(editor, {
						...info,
						bindings: editor.getBindingsInvolvingShape(aligningShape, 'arrow'),
					})
				}
			}
		}
	}
}
