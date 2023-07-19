import { GroupShapeUtil, useEditor, useValue } from '@tldraw/editor'
import { ArrowShapeUtil } from '../../shapes/arrow/ArrowShapeUtil'
import { DrawShapeUtil } from '../../shapes/draw/DrawShapeUtil'
import { LineShapeUtil } from '../../shapes/line/LineShapeUtil'

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
