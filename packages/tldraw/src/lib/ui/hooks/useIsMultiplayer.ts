import { useEditor, useValue } from '@tldraw/editor'

/** @public */
export function useIsMultiplayer() {
	const editor = useEditor()
	return !!editor.store.props.multiplayerStatus
}

/** @public */
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
