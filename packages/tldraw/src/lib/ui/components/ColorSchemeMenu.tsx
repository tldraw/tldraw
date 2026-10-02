import { defineMessages, useEditor, useValue } from '@tldraw/editor'
import { useUiEvents } from '../context/events'
import { TldrawUiMenuCheckboxItem } from './primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	menuTheme: { id: 'menu.theme', defaultMessage: 'Theme' },
	themeDark: { id: 'theme.dark', defaultMessage: 'Dark' },
	themeLight: { id: 'theme.light', defaultMessage: 'Light' },
	themeSystem: { id: 'theme.system', defaultMessage: 'System' },
})

const COLOR_SCHEMES = [
	{ colorScheme: 'light' as const, label: messages.themeLight.id },
	{ colorScheme: 'dark' as const, label: messages.themeDark.id },
	{ colorScheme: 'system' as const, label: messages.themeSystem.id },
]

/** @public @react */
export function ColorSchemeMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const currentColorScheme = useValue(
		'colorScheme',
		() =>
			editor.user.getUserPreferences().colorScheme ??
			(editor.user.getIsDarkMode() ? 'dark' : 'light'),
		[editor]
	)

	return (
		<TldrawUiMenuSubmenu id="help menu color-scheme" label={messages.menuTheme.id}>
			<TldrawUiMenuGroup id="theme">
				{COLOR_SCHEMES.map(({ colorScheme, label }) => (
					<TldrawUiMenuCheckboxItem
						id={`color-scheme-${colorScheme}`}
						key={colorScheme}
						label={label}
						checked={colorScheme === currentColorScheme}
						readonlyOk
						onSelect={() => {
							editor.user.updateUserPreferences({ colorScheme })
							trackEvent('color-scheme', { source: 'menu', value: colorScheme })
						}}
					/>
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
