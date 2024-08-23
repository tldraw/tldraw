import { useActions } from '../../context/actions'
import { useIsFollowingUser } from '../../hooks/menu-hooks'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

export function StopFollowing() {
	const actions = useActions()

	const followingUser = useIsFollowingUser()
	if (!followingUser) return null

	return <TldrawUiMenuItem {...actions['stop-following']} />
}
