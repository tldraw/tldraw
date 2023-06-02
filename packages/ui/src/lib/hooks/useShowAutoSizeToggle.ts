import { TLTextUtil, useEditor } from '@tldraw/editor'
import { useValue } from 'signia-react'

export function useShowAutoSizeToggle() {
	const editor = useEditor()
	return useValue(
		'showAutoSizeToggle',
		() => {
			const { selectedShapes } = editor
			return (
				selectedShapes.length === 1 &&
				editor.isShapeOfType(selectedShapes[0], TLTextUtil) &&
				selectedShapes[0].props.autoSize === false
			)
		},
		[editor]
	)
}
