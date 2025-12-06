import { useEditor, useReactor } from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import {
	getLocalSessionStateUnsafe,
	updateLocalSessionState,
} from '../../../utils/local-session-state'

export function SneakyDarkModeSync() {
	const app = useMaybeApp()
	const editor = useEditor()

	useReactor(
		'dark mode sync',
		() => {
			const appIsDark = getLocalSessionStateUnsafe()!.theme === 'dark'
			const editorIsDark = editor.user.getIsDarkMode()

			if (appIsDark && !editorIsDark) {
				updateLocalSessionState(() => ({ theme: 'light' }))
			} else if (!appIsDark && editorIsDark) {
				updateLocalSessionState(() => ({ theme: 'dark' }))
			}
		},
		[app, editor]
	)

	return null
}
