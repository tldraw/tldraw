import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

function DarkModeButton() {
	const editor = useEditor()

	const handleClick = () => {
		const isDark = editor.user.getIsDarkMode()
		editor.user.updateUserPreferences({ colorScheme: isDark ? 'light' : 'dark' })
	}

	return (
		<button onClick={handleClick} style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
			Toggle dark mode
		</button>
	)
}

export default function DarkModeToggleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<DarkModeButton />
			</Tldraw>
		</div>
	)
}
