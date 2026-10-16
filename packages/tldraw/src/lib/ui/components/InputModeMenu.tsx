import { defineMessages, useEditor, useValue } from '@tldraw/editor'
import { useUiEvents } from '../context/events'
import { ToggleInvertZoomItem } from './menu-items'
import { TldrawUiMenuCheckboxItem } from './primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

const messages = defineMessages({
	actionToggleAutoNone: { id: 'action.toggle-auto-none', defaultMessage: 'Auto' },
	actionToggleAutoPan: { id: 'action.toggle-auto-pan', defaultMessage: 'Auto (trackpad)' },
	actionToggleAutoZoom: { id: 'action.toggle-auto-zoom', defaultMessage: 'Auto (mouse)' },
	actionToggleMouse: { id: 'action.toggle-mouse', defaultMessage: 'Mouse' },
	actionToggleTrackpad: { id: 'action.toggle-trackpad', defaultMessage: 'Trackpad' },
	menuInputDevice: { id: 'menu.input-device', defaultMessage: 'Input device' },
})

const MODES = ['auto', 'trackpad', 'mouse'] as const

const AUTO_LABELS = {
	none: messages.actionToggleAutoNone,
	pan: messages.actionToggleAutoPan,
	zoom: messages.actionToggleAutoZoom,
}

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
			return AUTO_LABELS[wheelBehavior].id
		}

		return mode === 'trackpad' ? messages.actionToggleTrackpad.id : messages.actionToggleMouse.id
	}

	return (
		<TldrawUiMenuSubmenu id="help menu input-mode" label={messages.menuInputDevice.id}>
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
