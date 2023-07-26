import { useValue } from '@tldraw/state'
import { TLTextShape } from '@tldraw/tlschema'
import { useEditor } from '../../editor'

export function useShowAutoSizeToggle() {
	const editor = useEditor()
	return useValue(
		'showAutoSizeToggle',
		() => {
			const { selectedShapes } = editor
			return (
				selectedShapes.length === 1 &&
				editor.isShapeOfType<TLTextShape>(selectedShapes[0], 'text') &&
				selectedShapes[0].props.autoSize === false
			)
		},
		[editor]
	)
}
