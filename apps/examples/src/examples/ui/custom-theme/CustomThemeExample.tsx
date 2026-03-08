import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, TLThemes } from '@tldraw/editor'
import { useState } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const myThemes: TLThemes = {
	light: DEFAULT_LIGHT_THEME,
	dark: DEFAULT_DARK_THEME,
	'my-brand': {
		id: 'my-brand',
		colors: {
			...DEFAULT_DARK_THEME.colors,
			background: '#1a1a2e',
			solid: '#16213e',
			text: '#e0e0e0',
			cursor: '#e94560',
			noteBorder: '#e94560',
			black: {
				...DEFAULT_DARK_THEME.colors.black,
				solid: '#e0e0e0',
				semi: '#2a2a4a',
				pattern: '#b0b0cc',
				noteFill: '#e94560',
				noteText: '#ffffff',
			},
			blue: {
				...DEFAULT_DARK_THEME.colors.blue,
				solid: '#0f3460',
				semi: '#1a1a3e',
				pattern: '#1a5276',
			},
			red: {
				...DEFAULT_DARK_THEME.colors.red,
				solid: '#e94560',
				semi: '#2e1a2e',
				pattern: '#c0392b',
			},
		},
	},
}

export default function CustomThemeExample() {
	// [2]
	const [themeId, setThemeId] = useState<string>('light')

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-theme-example"
				themes={myThemes}
				theme={themeId}
				onMount={(editor) => {
					editor.createShape({
						type: 'geo',
						x: 100,
						y: 100,
						props: { w: 200, h: 200, color: 'red' },
					})
					editor.createShape({
						type: 'geo',
						x: 350,
						y: 100,
						props: { w: 200, h: 200, color: 'blue', geo: 'ellipse' },
					})
					editor.createShape({
						type: 'note',
						x: 150,
						y: 350,
						props: { color: 'black' },
					})
				}}
			>
				{/* [3] */}
				<div
					style={{
						position: 'absolute',
						top: 8,
						right: 8,
						zIndex: 1000,
						display: 'flex',
						gap: 4,
					}}
				>
					{['light', 'dark', 'my-brand'].map((id) => (
						<button
							key={id}
							onClick={() => setThemeId(id)}
							style={{
								padding: '4px 12px',
								border: '1px solid #ccc',
								borderRadius: 4,
								cursor: 'pointer',
								fontWeight: themeId === id ? 'bold' : 'normal',
								background: themeId === id ? '#333' : '#fff',
								color: themeId === id ? '#fff' : '#333',
							}}
						>
							{id}
						</button>
					))}
				</div>
			</Tldraw>
		</div>
	)
}

/*

[1]
Define a custom theme map. Here we keep the built-in light and dark themes
and add a third "my-brand" theme with custom colors. The theme is based on
DEFAULT_DARK_THEME with key colors overridden.

[2]
The `theme` prop controls which theme is active. It's reactive — changing
it updates the editor immediately. Use `null` (or omit the prop) to let
the editor choose based on user preferences.

[3]
A simple theme switcher overlay. Clicking a button sets the active theme
by ID. You could also call `editor.setTheme('my-brand')` imperatively.

*/
