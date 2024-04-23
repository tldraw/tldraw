import { Editor, IndexKey, TLNoteShape, TLShape, Vec, compact, createShapeId } from '@tldraw/editor'
import { zoomToShapeIfOffscreen } from '../../tools/SelectTool/selectHelpers'

/** @internal */
export const ADJACENT_NOTE_MARGIN = 20
/** @internal */
export const CLONE_HANDLE_MARGIN = 0
/** @internal */
export const NOTE_SIZE = 200
/** @internal */
export const NOTE_CENTER_OFFSET = { x: NOTE_SIZE / 2, y: NOTE_SIZE / 2 }
/** @internal */
export const NOTE_PIT_RADIUS = 10

const DEFAULT_PITS = {
	['a1' as IndexKey]: new Vec(NOTE_SIZE * 0.5, NOTE_SIZE * -0.5 - ADJACENT_NOTE_MARGIN), // t
	['a2' as IndexKey]: new Vec(NOTE_SIZE * 1.5 + ADJACENT_NOTE_MARGIN, NOTE_SIZE * 0.5), // r
	['a3' as IndexKey]: new Vec(NOTE_SIZE * 0.5, NOTE_SIZE * 1.5 + ADJACENT_NOTE_MARGIN), // b
	['a4' as IndexKey]: new Vec(NOTE_SIZE * -0.5 - ADJACENT_NOTE_MARGIN, NOTE_SIZE * 0.5), // l
}

/**
 * Get the adjacent positions for a particular note shape.
 *
 * @param pagePoint - The point of the note shape on the page.
 * @param pageRotation - The rotation of the note shape on the page.
 * @param growY - The growY of the note shape.
 * @param extraHeight - The extra height to add to the top position above the note shape (ie the growY of the dragging shape).
 *
 * @internal */
export function getNoteAdjacentPositions(
	pagePoint: Vec,
	pageRotation: number,
	growY: number,
	extraHeight: number
): Record<IndexKey, Vec> {
	return Object.fromEntries(
		Object.entries(DEFAULT_PITS).map(([id, v], i) => {
			const point = v.clone()
			if (i === 0 && extraHeight) {
				// apply top margin (the growY of the moving note shape)
				point.y -= extraHeight
			} else if (i === 2 && growY) {
				// apply bottom margin (the growY of this note shape)
				point.y += growY
			}
			return [id, point.rot(pageRotation).add(pagePoint)]
		})
	)
}

/**
 * Get all of the available note adjacent positions, excluding the selected shapes.
 *
 * @param editor - The editor instance.
 * @param rotation - The rotation of the note shape.
 * @param extraHeight - The extra height to add to the top position above the note shape (ie the growY of the dragging shape).
 *
 * @internal */
export function getAvailableNoteAdjacentPositions(
	editor: Editor,
	rotation: number,
	extraHeight: number
) {
	const selectedShapeIds = new Set(editor.getSelectedShapeIds())
	const minSize = (NOTE_SIZE + ADJACENT_NOTE_MARGIN + extraHeight) ** 2
	const allCenters = new Map<TLNoteShape, Vec>()
	const positions: (Vec | undefined)[] = []

	// Get all the positions that are adjacent to the selected note shapes
	for (const shape of editor.getCurrentPageShapes()) {
		if (!editor.isShapeOfType<TLNoteShape>(shape, 'note') || selectedShapeIds.has(shape.id)) {
			continue
		}

		const transform = editor.getShapePageTransform(shape.id)!

		// If the note has a different rotation, we can't use its adjacent positions
		if (rotation !== transform.rotation()) continue

		// Save the unselected note shape's center
		allCenters.set(shape, editor.getShapePageBounds(shape)!.center)

		// And push its position to the positions array
		positions.push(
			...Object.values(
				getNoteAdjacentPositions(transform.point(), rotation, shape.props.growY, extraHeight)
			)
		)
	}

	// Remove positions that are inside of another note shape
	const len = positions.length
	let position: Vec | undefined
	for (const [shape, center] of allCenters) {
		for (let i = 0; i < len; i++) {
			position = positions[i]
			if (!position) continue
			if (Vec.Dist2(center, position) > minSize) continue
			if (editor.isPointInShape(shape, position)) {
				positions[i] = undefined
			}
		}
	}

	return compact(positions)
}

/**
 * For a particular adjacent note position, get the shape in that position or create a new one.
 *
 * @param editor - The editor instance.
 * @param shape - The note shape to create or select.
 * @param center - The center of the note shape.
 * @param pageRotation - The rotation of the note shape on the page.
 * @param forceNew - Whether to force the creation of a new note shape.
 *
 * @internal */
export function getNoteShapeForAdjacentPosition(
	editor: Editor,
	shape: TLNoteShape,
	center: Vec,
	pageRotation: number,
	forceNew = false
) {
	// There might already be a note in that position! If there is, we'll
	// select the next note and switch focus to it. If there's not, then
	// we'll create a new note in that position.

	let nextNote: TLShape | undefined

	// Check the center of where a new note would be
	// Start from the top of the stack, and work our way down
	const allShapesOnPage = editor.getCurrentPageShapesSorted()

	const minDistance = NOTE_SIZE + ADJACENT_NOTE_MARGIN ** 2

	for (let i = allShapesOnPage.length - 1; i >= 0; i--) {
		const otherNote = allShapesOnPage[i]
		if (otherNote.type === 'note' && otherNote.id !== shape.id) {
			const otherBounds = editor.getShapePageBounds(otherNote)
			if (
				otherBounds &&
				Vec.Dist2(otherBounds.center, center) < minDistance &&
				editor.isPointInShape(otherNote, center)
			) {
				nextNote = otherNote
				break
			}
		}
	}

	editor.complete()

	// If we didn't find any in that position, then create a new one
	if (!nextNote || forceNew) {
		editor.mark('creating note shape')
		const id = createShapeId()

		// We create it at the center first, so that it becomes
		//  the child of whatever parent was at that center
		editor.createShape({
			id,
			type: 'note',
			x: center.x,
			y: center.y,
			rotation: pageRotation,
			opacity: shape.opacity,
			props: {
				// Use the props of the shape we're cloning
				...shape.props,
				// ...except for these values, which should reset to their defaults
				text: '',
				growY: 0,
				fontSizeAdjustment: 0,
				url: '',
			},
		})

		// Now we need to correct its location within its new parent

		const createdShape = editor.getShape(id)!

		// We need to put the page point in the same coordinate
		// space as the newly created shape (i.e its parent's space)
		const topLeft = editor.getPointInParentSpace(
			createdShape,
			Vec.Sub(center, Vec.Rot(NOTE_CENTER_OFFSET, pageRotation))
		)

		editor.updateShape({
			id,
			type: 'note',
			x: topLeft.x,
			y: topLeft.y,
		})

		nextNote = editor.getShape(id)!
	}

	zoomToShapeIfOffscreen(editor)
	return nextNote
}
