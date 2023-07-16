import { useEditor } from '@tldraw/editor'
import { useValue } from '@tldraw/state'

export function useHasLinkShapeSelected() {
	const editor = useEditor()
	return useValue(
		'hasLinkShapeSelected',
		() => {
			const { selectedShapes } = editor
			return (
				selectedShapes.length === 1 &&
				'url' in selectedShapes[0].props &&
				selectedShapes[0].type !== 'embed'
			)
		},
		[editor]
	)
}
