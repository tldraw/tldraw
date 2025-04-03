import {
	Editor,
	IndexKey,
	TLNoteShape,
	TLShape,
	Vec,
	compact,
	createShapeId,
	toRichText,
} from '@tldraw/editor'

/** @internal */
export const CLONE_HANDLE_MARGIN = 0
/** @internal */
export const NOTE_SIZE = 200
/** @internal */
export const NOTE_CENTER_OFFSET = new Vec(NOTE_SIZE / 2, NOTE_SIZE / 2)
/** @internal */
export const NOTE_ADJACENT_POSITION_SNAP_RADIUS = 10

const BASE_NOTE_POSITIONS = (editor: Editor) =>
	[
		[
			['a1' as IndexKey],
			new Vec(NOTE_SIZE * 0.5, NOTE_SIZE * -0.5 - editor.options.adjacentShapeMargin),
		], // t
		[
			['a2' as IndexKey],
			new Vec(NOTE_SIZE * 1.5 + editor.options.adjacentShapeMargin, NOTE_SIZE * 0.5),
		], // r
		[
			['a3' as IndexKey],
			new Vec(NOTE_SIZE * 0.5, NOTE_SIZE * 1.5 + editor.options.adjacentShapeMargin),
		], // b
		[
			['a4' as IndexKey],
			new Vec(NOTE_SIZE * -0.5 - editor.options.adjacentShapeMargin, NOTE_SIZE * 0.5),
		], // l
	] as const

function getBaseAdjacentNotePositions(editor: Editor, scale: number) {
	if (scale === 1) return BASE_NOTE_POSITIONS(editor)
	const s = NOTE_SIZE * scale
	const m = editor.options.adjacentShapeMargin * scale
	return [
		[['a1' as IndexKey], new Vec(s * 0.5, s * -0.5 - m)], // t
		[['a2' as IndexKey], new Vec(s * 1.5 + m, s * 0.5)], // r
		[['a3' as IndexKey], new Vec(s * 0.5, s * 1.5 + m)], // b
		[['a4' as IndexKey], new Vec(s * -0.5 - m, s * 0.5)], // l
	] as const
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
	editor: Editor,
	pagePoint: Vec,
	pageRotation: number,
	growY: number,
	extraHeight: number,
	scale: number
): Record<IndexKey, Vec> {
	return Object.fromEntries(
		getBaseAdjacentNotePositions(editor, scale).map(([id, v], i) => {
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
	scale: number,
	extraHeight: number
) {
	const selectedShapeIds = new Set(editor.getSelectedShapeIds())
	const minSize = (NOTE_SIZE + editor.options.adjacentShapeMargin + extraHeight) ** 2
	const allCenters = new Map<TLNoteShape, Vec>()
	const positions: (Vec | undefined)[] = []

	// Get all the positions that are adjacent to the selected note shapes
	for (const shape of editor.getCurrentPageShapes()) {
		if (
			!editor.isShapeOfType<TLNoteShape>(shape, 'note') ||
			scale !== shape.props.scale ||
			selectedShapeIds.has(shape.id)
		) {
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
				getNoteAdjacentPositions(
					editor,
					transform.point(),
					rotation,
					shape.props.growY,
					extraHeight,
					scale
				)
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

	const minDistance = (NOTE_SIZE + editor.options.adjacentShapeMargin ** 2) ** shape.props.scale

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
		editor.markHistoryStoppingPoint('creating note shape')
		const id = createShapeId()

		// We create it at the center first, so that it becomes
		// the child of whatever parent was at that center
		editor.createShape<TLNoteShape>({
			id,
			type: 'note',
			x: center.x,
			y: center.y,
			rotation: pageRotation,
			opacity: shape.opacity,
			props: {
				// Use the props of the shape we're cloning
				...shape.props,
				richText: toRichText(''),
				growY: 0,
				fontSizeAdjustment: 0,
				url: '',
			},
		})

		// Now we need to correct its location within its new parent

		const createdShape = editor.getShape<TLNoteShape>(id)!
		if (!createdShape) return // may have hit max shapes

		// We need to put the page point in the same coordinate space as the newly created shape (i.e its parent's space)
		const topLeft = editor.getPointInParentSpace(
			createdShape,
			Vec.Sub(
				center,
				Vec.Rot(NOTE_CENTER_OFFSET.clone().mul(createdShape.props.scale), pageRotation)
			)
		)

		editor.updateShape({
			id,
			type: 'note',
			x: topLeft.x,
			y: topLeft.y,
		})

		nextNote = editor.getShape(id)!
	}

	editor.zoomToSelectionIfOffscreen(16, {
		animation: {
			duration: editor.options.animationMediumMs,
		},
		inset: 0,
	})
	return nextNote
}
