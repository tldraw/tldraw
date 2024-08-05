import { useEditor, useValue } from '@tldraw/editor'

export function useIsCollaborative() {
	const editor = useEditor()
	return editor.store.props.collaboration !== undefined
}

export function useCollaborationStatus() {
	const editor = useEditor()
	return useValue(
		'sync status',
		() => {
			if (!editor.store.props.collaboration?.status) {
				return null
			}
			return editor.store.props.collaboration.status.get()
		},
		[editor]
	)
}
