import { useValue } from 'tldraw'
import { getLocalSessionState } from '../utils/local-session-state'
import { useApp } from './useAppState'

export function useSessionState() {
	const app = useApp()
	return useValue(
		'session state',
		() => {
			return getLocalSessionState()
		},
		[app]
	)
}
