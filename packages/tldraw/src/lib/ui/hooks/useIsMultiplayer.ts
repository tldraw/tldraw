import { useEditor, useValue } from '@tldraw/editor'

export function useIsMultiplayer() {
	const editor = useEditor()
	return !!editor.store.props.multiplayerStatus
}

export function useMultiplayerStatus() {
	const editor = useEditor()
	return useValue(
		'multiplayerStatus',
		() => {
			if (!editor.store.props.multiplayerStatus) {
				return null
			}
			return editor.store.props.multiplayerStatus.get()
		},
		[editor]
	)
}
