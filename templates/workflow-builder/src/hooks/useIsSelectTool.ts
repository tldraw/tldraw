import { useEditor, useValue } from 'tldraw'

export function useIsSelectTool() {
	const editor = useEditor()

	return useValue(
		'isSelectTool',
		() => {
			return editor.isIn('select.idle')
		},
		[editor]
	)
}
