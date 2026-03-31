import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function DarkModeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.user.updateUserPreferences({ colorScheme: 'dark' })
				}}
			/>
		</div>
	)
}
