import { Editor, useValue } from 'tldraw'

/**
 * A light/dark switch for the whole app. It flips the editor's colour scheme
 * (which tldraw persists), and the panels follow via usePanelTheme.
 */
export function ThemeToggle({ editor }: { editor: Editor }) {
	const isDark = useValue('is dark', () => editor.user.getIsDarkMode(), [editor])

	return (
		<button
			className="ThemeToggle"
			onClick={() => editor.setColorMode(isDark ? 'light' : 'dark')}
			aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
		>
			{isDark ? <MoonIcon /> : <SunIcon />}
		</button>
	)
}

function SunIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width={16}
			height={16}
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
		>
			<circle cx="12" cy="12" r="4" />
			<path
				strokeLinecap="round"
				d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
			/>
		</svg>
	)
}

function MoonIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width={16}
			height={16}
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
			/>
		</svg>
	)
}
