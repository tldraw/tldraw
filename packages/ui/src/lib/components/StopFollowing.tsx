import { useApp } from '@tldraw/editor'
import { track } from 'signia-react'
import { useActions } from '../hooks/useActions'
import { Button } from './primitives/Button'

export const StopFollowing = track(function ExitPenMode() {
	const app = useApp()
	const actions = useActions()

	if (!app.instanceState.followingUserId) {
		return null
	}

	const action = actions['stop-following']

	return (
		<Button
			label={action.label}
			iconLeft={action.icon}
			onClick={() => action.onSelect('people-menu')}
		/>
	)
})
