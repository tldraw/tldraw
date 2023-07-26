import { useValue } from '@tldraw/state'
import { useEditor } from '../../editor'

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
