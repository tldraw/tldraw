import { TLPageId, TLShape, TLShapeId, isShapeId } from '@tldraw/tlschema'
import { VecLike } from '../../primitives/Vec'
import type { Editor } from '../Editor'

/**
 * Choose the parent that pasted content lands in: a shape under the paste point, or a container
 * shared by the selection, when it accepts every root shape being pasted. Falls back to the page.
 */
export function getPasteParentId(
	editor: Editor,
	info: {
		currentPageId: TLPageId
		rootShapesFromContent: TLShape[]
		/** Keyed by the source id of each pasted shape. */
		shapeIdMap: ReadonlyMap<string, TLShapeId>
		point: VecLike | undefined
		preservePosition: boolean
	}
): TLPageId | TLShapeId {
	const { currentPageId, rootShapesFromContent, shapeIdMap, point, preservePosition } = info

	let pasteParentId: TLPageId | TLShapeId = currentPageId

	if (point) {
		// PASTE AT CURSOR: find the deepest accepts-children shape under the cursor
		if (rootShapesFromContent.length > 0) {
			const targetParent = editor.getShapeAtPoint(point, {
				hitInside: true,
				hitFrameInside: true,
				hitLocked: true,
				filter: (shape) => {
					const util = editor.getShapeUtil(shape)
					return rootShapesFromContent.every((rootShape) =>
						util.canReceiveNewChildrenOfType?.(shape, rootShape.type)
					)
				},
			})
			pasteParentId = targetParent?.id ?? currentPageId
		}
	} else if (!preservePosition) {
		// STANDARD PASTE: check if a selected shape (or its ancestor) accepts children
		const selectedShapes = editor.getSelectedShapes()
		let selectedParent: TLShape | null = null

		const canAcceptAll = (candidate: TLShape) => {
			const util = editor.getShapeUtil(candidate)
			return rootShapesFromContent.every((rs) =>
				util.canReceiveNewChildrenOfType?.(candidate, rs.type)
			)
		}

		for (const shape of selectedShapes) {
			// Find the nearest container: the shape itself if it can accept,
			// an accepting ancestor, or fall back to the shape's parent
			// (handles groups and other non-frame containers)
			const candidate = canAcceptAll(shape)
				? shape
				: (editor.findShapeAncestor(shape, canAcceptAll) ??
					(isShapeId(shape.parentId) ? editor.getShape(shape.parentId)! : null))

			if (!candidate) {
				selectedParent = null
				break
			}
			if (!selectedParent) {
				selectedParent = candidate
			} else if (selectedParent.id !== candidate.id) {
				// Different candidates — find the deepest common accepting ancestor
				const spAncestors = editor.getShapeAncestors(selectedParent)
				if (canAcceptAll(selectedParent)) spAncestors.push(selectedParent)
				const acceptingAncestors = spAncestors.filter(canAcceptAll)

				const candidateAncestorIds = new Set([
					candidate.id,
					...editor.getShapeAncestors(candidate).map((a) => a.id),
				])

				let common: TLShape | null = null
				for (let i = acceptingAncestors.length - 1; i >= 0; i--) {
					if (candidateAncestorIds.has(acceptingAncestors[i].id)) {
						common = acceptingAncestors[i]
						break
					}
				}

				selectedParent = common
				if (!selectedParent) break
			}
		}

		// Don't paste a shape into itself (the duplicating-a-frame case)
		if (selectedParent && shapeIdMap.has(selectedParent.id)) {
			selectedParent = null
		}

		if (selectedParent) {
			pasteParentId = selectedParent.id
		}
	}

	return pasteParentId
}
