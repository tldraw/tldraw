import { isShapeWithHandles, useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useOnlyFlippableShape() {
	const app = useEditor()
	return useValue(
		'onlyFlippableShape',
		() => {
			const { selectedShapes } = app
			return (
				selectedShapes.length === 1 &&
				selectedShapes.every((shape) => shape.type === 'group' || isShapeWithHandles(shape))
			)
		},
		[app]
	)
}
