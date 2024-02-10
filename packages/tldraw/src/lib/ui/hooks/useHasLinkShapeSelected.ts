import { useEditor, useValue } from '@tldraw/editor'

export function useHasLinkShapeSelected() {
	const editor = useEditor()
	return useValue(
		'hasLinkShapeSelected',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			return !!(
				onlySelectedShape &&
				onlySelectedShape.type !== 'embed' &&
				'url' in onlySelectedShape.props
			)
		},
		[editor]
	)
}
