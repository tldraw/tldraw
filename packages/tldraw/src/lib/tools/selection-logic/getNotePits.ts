import { Editor, TLNoteShape, Vec, compact } from '@tldraw/editor'

/** @internal */
export const ADJACENT_NOTE_MARGIN = 20
/** @internal */
export const NOTE_SIZE = 200
/** @internal */
export const NOTE_PIT_RADIUS = 10
/** @internal */
export type NotePit = Vec

const DEFAULT_PITS = [
	new Vec(NOTE_SIZE * 0.5, NOTE_SIZE * -0.5 - ADJACENT_NOTE_MARGIN), // t
	new Vec(NOTE_SIZE * 1.5 + ADJACENT_NOTE_MARGIN, NOTE_SIZE * 0.5), // r
	new Vec(NOTE_SIZE * 0.5, NOTE_SIZE * 1.5 + ADJACENT_NOTE_MARGIN), // b
	new Vec(NOTE_SIZE * -0.5 - ADJACENT_NOTE_MARGIN, NOTE_SIZE * 0.5), // l
]

/** @internal */
export function getNotePits(editor: Editor, rotation: number, extraHeight: number) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const allUnselectedNoteShapes = editor
		.getCurrentPageShapes()
		.filter((shape) => shape.type === 'note' && !selectedShapeIds.includes(shape.id))
	return compact(
		allUnselectedNoteShapes.flatMap((shape) => {
			if (!editor.isShapeOfType<TLNoteShape>(shape, 'note')) return

			const transform = editor.getShapePageTransform(shape.id)!
			const pageRotation = transform.rotation()

			// We only want to create pits for notes with the specified rotation
			if (rotation !== pageRotation) return

			// Get the four pits around the note
			const pagePoint = transform.point()

			return DEFAULT_PITS.map((v, i) => {
				const point = v.clone()
				if (i === 0 && extraHeight) {
					// apply top margin (the growY of the moving note shape)
					point.y -= extraHeight
				} else if (i === 2 && shape.props.growY) {
					// apply bottom margin (the growY of this note shape)
					point.y += shape.props.growY
				}
				return point.rot(pageRotation).add(pagePoint)
			})
		})
	).filter((pit) => !allUnselectedNoteShapes.some((shape) => editor.isPointInShape(shape, pit)))
}
