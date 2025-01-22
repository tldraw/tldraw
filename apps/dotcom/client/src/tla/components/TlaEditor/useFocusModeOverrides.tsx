import { TLUiOverrides } from 'tldraw'
import { updateLocalSessionState } from '../../utils/local-session-state'

export function useFocusModeOverrides(): TLUiOverrides {
	return {
		actions(editor, actions) {
			const toggleFocusMode = actions['toggle-focus-mode']
			const original = toggleFocusMode.onSelect
			toggleFocusMode.onSelect = (source) => {
				const isFocusMode = editor.getInstanceState().isFocusMode
				// If we will turn on the focus mode we also want to hide the sidebar
				if (!isFocusMode) {
					updateLocalSessionState(() => ({ isSidebarOpen: false }))
				}
				original(source)
			}
			return actions
		},
	}
}
