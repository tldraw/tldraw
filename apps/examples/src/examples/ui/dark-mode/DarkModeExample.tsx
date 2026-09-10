import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function DarkModeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw colorScheme="dark" />
		</div>
	)
}

/*
The `colorScheme` prop sets the editor's default color scheme: 'light' (the default),
'dark', or 'system' to follow the OS preference. A user preference set via
`editor.user.updateUserPreferences({ colorScheme })` takes priority over this prop,
so a persisted user preference from another example may override it. See the
dark-mode-toggle example for switching at runtime.
*/
