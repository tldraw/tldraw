import { useEditor, useValue } from '@tldraw/editor'
import { TextShapeUtil } from '../../shapes/text/TextShapeUtil'

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
