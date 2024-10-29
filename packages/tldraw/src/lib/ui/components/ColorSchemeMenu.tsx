import { useEditor, useValue } from '@tldraw/editor'
import { useUiEvents } from '../context/events'
import { TldrawUiMenuCheckboxItem } from './primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

const COLOR_SCHEMES = [
	{ colorScheme: 'light' as const, label: 'theme.light' },
	{ colorScheme: 'dark' as const, label: 'theme.dark' },
	{ colorScheme: 'system' as const, label: 'theme.system' },
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
		<TldrawUiMenuSubmenu id="help menu color-scheme" label="menu.theme">
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
