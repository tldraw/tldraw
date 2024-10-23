import { useValue } from 'tldraw'
import { getLocalSessionState } from '../utils/local-session-state'
import { useApp } from './useAppState'

export function useFlags() {
	const app = useApp()
	const flags = useValue(
		'flags',
		() => {
			const { auth } = getLocalSessionState()
			if (!auth) throw Error('no auth')
			const user = app.getUser(auth.userId)
			if (!user) throw Error('no user')
			return user.flags
		},
		[app]
	)

	return flags
}
