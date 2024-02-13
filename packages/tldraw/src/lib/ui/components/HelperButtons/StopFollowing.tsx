import { track, useEditor } from '@tldraw/editor'
import { useActions } from '../../hooks/useActions'
import { TldrawUiMenuItem } from '../menus/TldrawUiMenuItem'

export const StopFollowing = track(function StopFollowing() {
	const editor = useEditor()
	const actions = useActions()

	if (!editor.getInstanceState().followingUserId) {
		return null
	}

	return <TldrawUiMenuItem {...actions['stop-following']} />
})
