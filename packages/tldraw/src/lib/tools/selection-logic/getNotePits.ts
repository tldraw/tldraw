import { Editor, TLNoteShape, Vec, compact } from '@tldraw/editor'

/** @internal */
export const ADJACENT_NOTE_MARGIN = 20
/** @internal */
export const NOTE_SIZE = 200
/** @internal */
export const NOTE_PIT_RADIUS = 10
/** @internal */
export type NotePit = { rotation: number; point: Vec }

/** @internal */
export function getNotePits(editor: Editor, extraHeight: number) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const allUnselectedNoteShapes = editor
		.getCurrentPageShapes()
		.filter((shape) => shape.type === 'note' && !selectedShapeIds.includes(shape.id))
	return compact(
		allUnselectedNoteShapes.flatMap((shape) => {
			if (!editor.isShapeOfType<TLNoteShape>(shape, 'note')) return

			const transform = editor.getShapePageTransform(shape.id)!
			const pagePoint = transform.point()
			const pageRotation = transform.rotation()
			const center = Vec.Add(pagePoint, new Vec(NOTE_SIZE / 2, NOTE_SIZE / 2))

			return [
				Vec.AddXY(center, 0, -(NOTE_SIZE + ADJACENT_NOTE_MARGIN + extraHeight)),
				Vec.AddXY(center, NOTE_SIZE + ADJACENT_NOTE_MARGIN, 0),
				Vec.AddXY(center, 0, NOTE_SIZE + (shape.props.growY ?? 0) + ADJACENT_NOTE_MARGIN),
				Vec.AddXY(center, -(NOTE_SIZE + ADJACENT_NOTE_MARGIN), 0),
			].map((v) => ({ rotation: pageRotation, point: v.rotWith(pagePoint, pageRotation) }))
		})
	).filter(
		(pit) => !allUnselectedNoteShapes.some((shape) => editor.isPointInShape(shape, pit.point))
	)
}
