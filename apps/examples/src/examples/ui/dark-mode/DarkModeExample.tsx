import { atom, TLUserPreferences, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const userPreferences = atom<TLUserPreferences>('dark-mode-example-prefs', {
	id: 'dark-mode-example',
	colorScheme: 'dark',
})

const user = {
	userPreferences,
	setUserPreferences: (prefs: TLUserPreferences) => userPreferences.set(prefs),
}

export default function DarkModeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw user={user} />
		</div>
	)
}
