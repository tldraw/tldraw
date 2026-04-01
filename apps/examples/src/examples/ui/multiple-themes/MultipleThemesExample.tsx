import { useCallback, useMemo } from 'react'
import {
	DEFAULT_THEME,
	Editor,
	TLTheme,
	TLThemeId,
	TLThemes,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
declare module '@tldraw/tlschema' {
	interface TLThemes {
		ocean: TLTheme
		sunset: TLTheme
	}
}

// [2]
const OCEAN_THEME: TLTheme = {
	...DEFAULT_THEME,
	id: 'ocean',
	colors: {
		light: {
			...DEFAULT_THEME.colors.light,
			blue: {
				...DEFAULT_THEME.colors.light.blue,
				solid: '#2b7ab5',
			},
			violet: {
				...DEFAULT_THEME.colors.light.violet,
				solid: '#6a5acd',
				noteFill: '#b8a9e8',
				noteText: '#000000',
			},
		},
		dark: {
			...DEFAULT_THEME.colors.dark,
			blue: {
				...DEFAULT_THEME.colors.dark.blue,
				solid: '#3a9bd5',
			},
			violet: {
				...DEFAULT_THEME.colors.dark.violet,
				solid: '#7b6bd4',
				noteFill: '#3a2d6e',
				noteText: '#f2f2f2',
			},
		},
	},
}

const SUNSET_THEME: TLTheme = {
	...DEFAULT_THEME,
	id: 'sunset',
	colors: {
		light: {
			...DEFAULT_THEME.colors.light,
			blue: {
				...DEFAULT_THEME.colors.light.blue,
				solid: '#e07038',
			},
			violet: {
				...DEFAULT_THEME.colors.light.violet,
				solid: '#9b4dca',
				noteFill: '#dab0f0',
				noteText: '#000000',
			},
		},
		dark: {
			...DEFAULT_THEME.colors.dark,
			blue: {
				...DEFAULT_THEME.colors.dark.blue,
				solid: '#f0884a',
			},
			violet: {
				...DEFAULT_THEME.colors.dark.violet,
				solid: '#b060d8',
				noteFill: '#5c2870',
				noteText: '#f2f2f2',
			},
		},
	},
}

// [3]
const themes: Partial<TLThemes> = {
	ocean: OCEAN_THEME,
	sunset: SUNSET_THEME,
}

function createInitialShapes(editor: Editor) {
	if (editor.getCurrentPageShapeIds().size > 0) return
	editor.createShapes([
		{
			type: 'geo',
			x: 100,
			y: 100,
			props: { w: 200, h: 200, color: 'blue', richText: toRichText('Try switching themes') },
		},
		{
			type: 'note',
			x: 350,
			y: 100,
			props: { color: 'violet', richText: toRichText('Colors change per theme') },
		},
	])
}

export default function MultipleThemesExample() {
	return (
		<div className="tldraw__editor">
			{/* [4] */}
			<Tldraw
				persistenceKey="multiple-themes-example"
				themes={themes}
				onMount={createInitialShapes}
			>
				<ThemeSwitcher />
			</Tldraw>
		</div>
	)
}

// [5]
const THEME_LABELS: Record<TLThemeId, string> = {
	default: 'Default',
	ocean: 'Ocean',
	sunset: 'Sunset',
}

function ThemeSwitcher() {
	const editor = useEditor()
	const currentThemeId = useValue('themeId', () => editor.getCurrentThemeId(), [editor])

	const handleClick = useCallback(
		(id: TLThemeId) => {
			editor.setCurrentTheme(id)
		},
		[editor]
	)

	return (
		<div style={useMemo(() => styles.container, [])}>
			{(Object.keys(THEME_LABELS) as TLThemeId[]).map((id) => (
				<TldrawUiButton
					key={id}
					type={currentThemeId === id ? 'primary' : 'normal'}
					onClick={() => handleClick(id)}
				>
					<TldrawUiButtonLabel>{THEME_LABELS[id]}</TldrawUiButtonLabel>
				</TldrawUiButton>
			))}
		</div>
	)
}

const styles = {
	container: {
		position: 'absolute' as const,
		top: 60,
		left: 12,
		display: 'flex',
		gap: 4,
		zIndex: 1000,
		pointerEvents: 'all' as const,
	},
}

/*

[1]
Extend the `TLThemes` interface to register custom theme IDs.
This gives you type-safe theme names throughout the API — `editor.setCurrentTheme('ocean')`
will autocomplete, and passing an unregistered name will be a type error.

[2]
Define theme objects by spreading `DEFAULT_THEME` and overriding just the colors
you want to change. Each theme contains both `light` and `dark` color palettes.

[3]
Pass the custom themes via `themes`. The `default` theme is always
available, so you only need to register additional themes here.

[4]
The `<Tldraw>` component accepts `themes` to register themes at
mount time. You can also register themes later via `editor.updateTheme()`.

[5]
A simple UI to switch between themes at runtime using `editor.setCurrentTheme()`.
The current theme ID is reactive — `editor.getCurrentThemeId()` updates automatically.

*/
