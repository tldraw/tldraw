import { TLTextUtil, useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useShowAutoSizeToggle() {
	const app = useApp()
	return useValue(
		'showAutoSizeToggle',
		() => {
			const { selectedShapes } = app
			return (
				selectedShapes.length === 1 &&
				app.isShapeOfType(selectedShapes[0], TLTextUtil) &&
				selectedShapes[0].props.autoSize === false
			)
		},
		[app]
	)
}
