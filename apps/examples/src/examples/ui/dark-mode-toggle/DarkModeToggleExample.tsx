import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function DarkModeButton() {
	const editor = useEditor()

	const handleClick = () => {
		const isDark = editor.user.getIsDarkMode()
		editor.user.updateUserPreferences({ colorScheme: isDark ? 'light' : 'dark' })
	}

	return (
		<button style={{ pointerEvents: 'all' }} onClick={handleClick}>
			Toggle dark mode
		</button>
	)
}

export default function DarkModeToggleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={{ TopPanel: DarkModeButton }} />
		</div>
	)
}
