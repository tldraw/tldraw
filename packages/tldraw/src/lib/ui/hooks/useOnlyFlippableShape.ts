import {
	TLArrowShape,
	TLDrawShape,
	TLGroupShape,
	TLLineShape,
	useEditor,
	useValue,
} from '@tldraw/editor'

export function useOnlyFlippableShape() {
	const editor = useEditor()
	return useValue(
		'onlyFlippableShape',
		() => {
			const selectedShapes = editor.getSelectedShapes()
			return (
				selectedShapes.length === 1 &&
				selectedShapes.every(
					(shape) =>
						editor.isShapeOfType<TLGroupShape>(shape, 'group') ||
						editor.isShapeOfType<TLArrowShape>(shape, 'arrow') ||
						editor.isShapeOfType<TLLineShape>(shape, 'line') ||
						editor.isShapeOfType<TLDrawShape>(shape, 'draw')
				)
			)
		},
		[editor]
	)
}
