import { TextShapeUtil, useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

export function useShowAutoSizeToggle() {
	const editor = useEditor()
	return useValue(
		'showAutoSizeToggle',
		() => {
			const { selectedShapes } = editor
			return (
				selectedShapes.length === 1 &&
				editor.isShapeOfType(selectedShapes[0], TextShapeUtil) &&
				selectedShapes[0].props.autoSize === false
			)
		},
		[editor]
	)
}
