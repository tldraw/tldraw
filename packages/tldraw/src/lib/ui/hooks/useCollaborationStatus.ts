import { useMaybeEditor, useValue } from '@tldraw/editor'

/** @public */
export function useShowCollaborationUi() {
	const editor = useMaybeEditor()
	return editor?.store.props.collaboration !== undefined
}

/** @public */
export function useCollaborationStatus() {
	const editor = useMaybeEditor()
	return useValue(
		'sync status',
		() => {
			if (!editor?.store.props.collaboration?.status) {
				return null
			}
			return editor.store.props.collaboration.status.get()
		},
		[editor]
	)
}
