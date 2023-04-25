import { isShapeWithHandles, useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useOnlyFlippableShape() {
	const app = useApp()
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
