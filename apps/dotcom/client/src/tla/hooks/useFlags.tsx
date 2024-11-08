import { useValue } from 'tldraw'
import { useApp } from './useAppState'

export function useFlags() {
	const app = useApp()
	const flags = useValue(
		'flags',
		() => {
			// TODO: fix dis junk
			return {}
		},
		[app]
	)

	return flags
}
