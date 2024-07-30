import { useEditor, useValue } from '@tldraw/editor'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

export function StopFollowing() {
	const editor = useEditor()

	const followingUser = useValue(
		'is following user',
		() => !!editor.getInstanceState().followingUserId,
		[editor]
	)
	if (!followingUser) return null

	return <TldrawUiMenuItem action="stop-following" />
}
