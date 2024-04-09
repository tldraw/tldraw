import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

export function StopFollowing() {
	const editor = useEditor()
	const actions = useActions()

	const followingUser = useValue(
		'is following user',
		() => !!editor.getInstanceState().followingUserId,
		[editor]
	)
	if (!followingUser) return null

	return <TldrawUiMenuItem {...actions['stop-following']} />
}
