import {
	ArrowShapeUtil,
	DrawShapeUtil,
	GroupShapeUtil,
	LineShapeUtil,
	useEditor,
} from '@tldraw/editor'
import { useValue } from '@tldraw/state'

export function useOnlyFlippableShape() {
	const editor = useEditor()
	return useValue(
		'onlyFlippableShape',
		() => {
			const { selectedShapes } = editor
			return (
				selectedShapes.length === 1 &&
				selectedShapes.every(
					(shape) =>
						editor.isShapeOfType(shape, GroupShapeUtil) ||
						editor.isShapeOfType(shape, ArrowShapeUtil) ||
						editor.isShapeOfType(shape, LineShapeUtil) ||
						editor.isShapeOfType(shape, DrawShapeUtil)
				)
			)
		},
		[editor]
	)
}
