import { TLComponents, Tldraw, TldrawUiButton, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

function DarkModeButton() {
	const editor = useEditor()
	// [1]
	const isDark = useValue('isDark', () => editor.user.getIsDarkMode(), [editor])

	return (
		<div className="tlui-menu">
			<TldrawUiButton
				type="normal"
				// [2]
				onClick={() =>
					editor.user.updateUserPreferences({ colorScheme: isDark ? 'light' : 'dark' })
				}
			>
				{isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: DarkModeButton,
}

export default function DarkModeToggleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
`editor.user.getIsDarkMode()` resolves the user's `colorScheme` preference (including
'system') to a boolean. Reading it inside `useValue` keeps the button label in sync
when the preference changes from anywhere, e.g. the toggle in the main menu.

[2]
`editor.setColorMode('dark')` is a shorthand for the same preference update.
*/
