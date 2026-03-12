import { useState } from 'react'
import {
	DEFAULT_DARK_THEME,
	DEFAULT_LIGHT_THEME,
	registerColors,
	TLDefaultColor,
	Tldraw,
	TLThemes,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Extend the type system so TypeScript knows about our custom color
declare module 'tldraw' {
	interface TLThemeColors {
		pink: TLDefaultColor
	}
}

// There's a guide at the bottom of this file!

// [1]
// Register a custom "pink" color so it appears in the style panel and
// passes validation everywhere. Call this before rendering any tldraw
// components.
registerColors(['pink'])

// Helper to create a full color entry from a base solid color
function makeColor(solid: string, semi: string, pattern: string): TLDefaultColor {
	return {
		solid,
		semi,
		pattern,
		fill: solid,
		linedFill: semi,
		frameHeadingStroke: solid,
		frameHeadingFill: semi,
		frameStroke: solid,
		frameFill: semi,
		frameText: solid,
		noteFill: semi,
		noteText: solid,
		highlightSrgb: solid,
		highlightP3: solid,
	}
}

// [2]
const pinkLight = makeColor('#e91e8c', '#fce4f2', '#f06baf')
const pinkDark = makeColor('#f06baf', '#3d1a2e', '#e91e8c')

const myThemes: TLThemes = {
	light: {
		...DEFAULT_LIGHT_THEME,
		colors: { ...DEFAULT_LIGHT_THEME.colors, pink: pinkLight },
	},
	dark: {
		...DEFAULT_DARK_THEME,
		colors: { ...DEFAULT_DARK_THEME.colors, pink: pinkDark },
	},
	'my-brand': {
		id: 'my-brand',
		fontSize: DEFAULT_DARK_THEME.fontSize,
		lineHeight: DEFAULT_DARK_THEME.lineHeight,
		colors: {
			...DEFAULT_DARK_THEME.colors,
			pink: pinkDark,
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
					// [4] Use the custom "pink" color registered above
					editor.createShape({
						type: 'geo',
						x: 600,
						y: 100,
						props: { w: 200, h: 200, color: 'pink', geo: 'diamond' },
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
Register a custom color name ("pink") with `registerColors()`. This extends
the `DefaultColorStyle` and `DefaultLabelColorStyle` validators so the new
color passes validation and appears in the style panel automatically.

[2]
Define color entries for light and dark variants. Each theme that includes
the custom color needs a full `TLDefaultColor` entry for it.

[3]
A simple theme switcher overlay. Clicking a button sets the active theme
by ID. You could also call `editor.setTheme('my-brand')` imperatively.

[4]
Create a shape using the custom "pink" color. Because we called
`registerColors(['pink'])` at module scope, this value passes validation.

*/
