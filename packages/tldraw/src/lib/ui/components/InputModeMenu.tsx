import { useEditor, useValue } from '@tldraw/editor'
import { useUiEvents } from '../context/events'
import { TldrawUiMenuCheckboxItem } from './primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

const MODES = ['auto', 'trackpad', 'mouse'] as const

/** @public @react */
export function InputModeMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()

	const inputMode = useValue('inputMode', () => editor.user.getUserPreferences().inputMode, [
		editor,
	])
	const wheelBehavior = useValue('wheelBehavior', () => editor.getCameraOptions().wheelBehavior, [
		editor,
	])

	const isModeChecked = (mode: string) => {
		if (mode === 'auto') {
			return inputMode === null
		}
		return inputMode === mode
	}

	const getLabel = (mode: string, wheelBehavior: 'zoom' | 'pan' | 'none') => {
		if (mode === 'auto') {
			return `action.toggle-auto-${wheelBehavior}`
		}

		return mode === 'trackpad' ? 'action.toggle-trackpad' : 'action.toggle-mouse'
	}

	return (
		<TldrawUiMenuSubmenu id="help menu input-mode" label="menu.input-mode">
			<TldrawUiMenuGroup id="peripheral-mode">
				{MODES.map((mode) => (
					<TldrawUiMenuCheckboxItem
						id={`peripheral-mode-${mode}`}
						key={mode}
						label={getLabel(mode, wheelBehavior)}
						checked={isModeChecked(mode)}
						readonlyOk
						onSelect={() => {
							trackEvent('input-mode', { source: 'menu', value: mode })
							switch (mode) {
								case 'auto':
									editor.user.updateUserPreferences({ inputMode: null })
									break
								case 'trackpad':
									editor.user.updateUserPreferences({ inputMode: 'trackpad' })
									break
								case 'mouse':
									editor.user.updateUserPreferences({ inputMode: 'mouse' })
									break
							}
						}}
					/>
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
