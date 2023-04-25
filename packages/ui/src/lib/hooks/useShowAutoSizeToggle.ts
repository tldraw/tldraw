import { useApp } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useShowAutoSizeToggle() {
	const app = useApp()
	return useValue(
		'showAutoSizeToggle',
		() => {
			const { selectedShapes } = app
			return (
				selectedShapes.length === 1 &&
				selectedShapes[0].type === 'text' &&
				selectedShapes[0].props.autoSize === false
			)
		},
		[app]
	)
}
