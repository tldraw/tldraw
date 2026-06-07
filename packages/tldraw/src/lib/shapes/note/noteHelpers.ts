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
export const NOTE_ADJACENT_POSITION_SNAP_RADIUS = 10

const BASE_NOTE_POSITIONS = (editor: Editor, noteWidth: number, noteHeight: number) =>
	[
		[
			['a1' as IndexKey],
			new Vec(noteWidth * 0.5, noteHeight * -0.5 - editor.options.adjacentShapeMargin),
		], // t
		[
			['a2' as IndexKey],
			new Vec(noteWidth * 1.5 + editor.options.adjacentShapeMargin, noteHeight * 0.5),
		], // r
		[
			['a3' as IndexKey],
			new Vec(noteWidth * 0.5, noteHeight * 1.5 + editor.options.adjacentShapeMargin),
		], // b
		[
			['a4' as IndexKey],
			new Vec(noteWidth * -0.5 - editor.options.adjacentShapeMargin, noteHeight * 0.5),
		], // l
	] as const

function getBaseAdjacentNotePositions(
	editor: Editor,
	scale: number,
	noteWidth: number,
	noteHeight: number
) {
	if (scale === 1) return BASE_NOTE_POSITIONS(editor, noteWidth, noteHeight)
	const w = noteWidth * scale
	const h = noteHeight * scale
	const m = editor.options.adjacentShapeMargin * scale
	return [
		[['a1' as IndexKey], new Vec(w * 0.5, h * -0.5 - m)], // t
		[['a2' as IndexKey], new Vec(w * 1.5 + m, h * 0.5)], // r
		[['a3' as IndexKey], new Vec(w * 0.5, h * 1.5 + m)], // b
		[['a4' as IndexKey], new Vec(w * -0.5 - m, h * 0.5)], // l
	] as const
}

/** @internal */
export interface NoteAdjacentPositionsOpts {
	pagePoint: Vec
	pageRotation: number
	growY: number
	extraHeight: number
	scale: number
	noteWidth: number
	noteHeight: number
}

/**
 * Get the adjacent positions for a particular note shape.
 *
 * @internal */
export function getNoteAdjacentPositions(
	editor: Editor,
	opts: NoteAdjacentPositionsOpts
): Record<IndexKey, Vec> {
	const { pagePoint, pageRotation, growY, extraHeight, scale, noteWidth, noteHeight } = opts
	return Object.fromEntries(
		getBaseAdjacentNotePositions(editor, scale, noteWidth, noteHeight).map(([id, v], i) => {
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

/** @internal */
export interface AvailableNoteAdjacentPositionsOpts {
	rotation: number
	scale: number
	extraHeight: number
	noteWidth: number
	noteHeight: number
}

/**
 * Get all of the available note adjacent positions, excluding the selected shapes.
 *
 * @internal */
export function getAvailableNoteAdjacentPositions(
	editor: Editor,
	opts: AvailableNoteAdjacentPositionsOpts
) {
	const { rotation, scale, extraHeight, noteWidth, noteHeight } = opts
	const selectedShapeIds = new Set(editor.getSelectedShapeIds())
	const minSize =
		(Math.max(noteWidth, noteHeight) + editor.options.adjacentShapeMargin + extraHeight) ** 2
	const allCenters = new Map<TLNoteShape, Vec>()
	const positions: (Vec | undefined)[] = []

	// Get all the positions that are adjacent to the selected note shapes
	for (const shape of editor.getCurrentPageShapes()) {
		if (
			!editor.isShapeOfType(shape, 'note') ||
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
				getNoteAdjacentPositions(editor, {
					pagePoint: transform.point(),
					pageRotation: rotation,
					growY: shape.props.growY,
					extraHeight,
					scale,
					noteWidth,
					noteHeight,
				})
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

/** @internal */
export interface NoteShapeForAdjacentPositionOpts {
	shape: TLNoteShape
	center: Vec
	pageRotation: number
	noteWidth: number
	noteHeight: number
	forceNew?: boolean
}

/**
 * For a particular adjacent note position, get the shape in that position or create a new one.
 *
 * @internal */
export function getNoteShapeForAdjacentPosition(
	editor: Editor,
	opts: NoteShapeForAdjacentPositionOpts
) {
	const { shape, center, pageRotation, noteWidth, noteHeight, forceNew = false } = opts
	// There might already be a note in that position! If there is, we'll
	// select the next note and switch focus to it. If there's not, then
	// we'll create a new note in that position.

	let nextNote: TLShape | undefined

	// Check the center of where a new note would be
	// Start from the top of the stack, and work our way down
	const allShapesOnPage = editor.getCurrentPageShapesSorted()

	const minDistance =
		(Math.max(noteWidth, noteHeight) + editor.options.adjacentShapeMargin ** 2) ** shape.props.scale

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
				richText: toRichText(''),
				growY: 0,
				fontSizeAdjustment: 1,
				url: '',
				textFirstEditedBy: null,
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
				Vec.Rot(new Vec(noteWidth / 2, noteHeight / 2).mul(createdShape.props.scale), pageRotation)
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
