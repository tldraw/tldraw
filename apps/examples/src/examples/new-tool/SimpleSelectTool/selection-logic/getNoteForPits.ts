import { Editor, TLHandle, TLNoteShape } from 'tldraw'
import { getNoteAdjacentPositions, getNoteShapeForAdjacentPosition } from './noteHelpers'

export function getNoteForPit(
	editor: Editor,
	shape: TLNoteShape,
	handle: TLHandle,
	forceNew: boolean
) {
	const pageTransform = editor.getShapePageTransform(shape.id)!
	const pagePoint = pageTransform.point()
	const pageRotation = pageTransform.rotation()
	const pits = getNoteAdjacentPositions(pagePoint, pageRotation, shape.props.growY, 0)
	const pit = pits[handle.index]
	if (pit) {
		return getNoteShapeForAdjacentPosition(editor, shape, pit, pageRotation, forceNew)
	}
	return
}
