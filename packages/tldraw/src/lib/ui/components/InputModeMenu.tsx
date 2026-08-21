import { useEditor, useValue } from '@tldraw/editor'
import { useUiEvents } from '../context/events'
import { ToggleInvertZoomItem } from './menu-items'
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

	const getLabel = (mode: (typeof MODES)[number]) => {
		if (mode === 'auto') {
			return `action.toggle-auto-${wheelBehavior}`
		}

		return mode === 'trackpad' ? 'action.toggle-trackpad' : 'action.toggle-mouse'
	}

	return (
		<TldrawUiMenuSubmenu id="help menu input-mode" label="menu.input-device">
			<TldrawUiMenuGroup id="peripheral-mode">
				{MODES.map((mode) => {
					const preference = mode === 'auto' ? null : mode
					return (
						<TldrawUiMenuCheckboxItem
							id={`peripheral-mode-${mode}`}
							key={mode}
							label={getLabel(mode)}
							checked={inputMode === preference}
							readonlyOk
							onSelect={() => {
								trackEvent('input-mode', { source: 'menu', value: mode })
								editor.user.updateUserPreferences({ inputMode: preference })
							}}
						/>
					)
				})}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="invert-zoom-group">
				<ToggleInvertZoomItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
