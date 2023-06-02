import { isShapeWithHandles, useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useOnlyFlippableShape() {
	const editor = useEditor()
	return useValue(
		'onlyFlippableShape',
		() => {
			const { selectedShapes } = editor
			return (
				selectedShapes.length === 1 &&
				selectedShapes.every((shape) => shape.type === 'group' || isShapeWithHandles(shape))
			)
		},
		[editor]
	)
}
