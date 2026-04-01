import { useCallback, useMemo } from 'react'
import {
	DEFAULT_THEME,
	Editor,
	TLTheme,
	TLThemeId,
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
declare module 'tldraw' {
	interface TLThemes {
		ocean: TLTheme
		sunset: TLTheme
	}
}

// [2]
const OCEAN_THEME: TLTheme = {
	...DEFAULT_THEME,
	colors: {
		light: {
			...DEFAULT_THEME.colors.light,
			background: '#e8f4f8',
			solid: '#f0f8ff',
		},
		dark: {
			...DEFAULT_THEME.colors.dark,
			background: '#0a1628',
			solid: '#0d1f3c',
		},
	},
}

const SUNSET_THEME: TLTheme = {
	...DEFAULT_THEME,
	colors: {
		light: {
			...DEFAULT_THEME.colors.light,
			background: '#fff5eb',
			solid: '#fff8f0',
		},
		dark: {
			...DEFAULT_THEME.colors.dark,
			background: '#1a0f0a',
			solid: '#2d1a0f',
		},
	},
}

// [3]
const themeDefinitions: Partial<Record<TLThemeId, TLTheme>> = {
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
			props: { color: 'violet', richText: toRichText('Background color changes') },
		},
	])
}

export default function MultipleThemesExample() {
	return (
		<div className="tldraw__editor">
			{/* [4] */}
			<Tldraw
				persistenceKey="multiple-themes-example"
				themeDefinitions={themeDefinitions}
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
				<TldrawUiButton key={id} type={currentThemeId === id ? 'primary' : 'normal'} onClick={() => handleClick(id)}>
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
Pass the custom themes via `themeDefinitions`. The `default` theme is always
available, so you only need to register additional themes here.

[4]
The `<Tldraw>` component accepts `themeDefinitions` to register themes at
mount time. You can also register themes later via `editor.updateTheme()`.

[5]
A simple UI to switch between themes at runtime using `editor.setCurrentTheme()`.
The current theme ID is reactive — `editor.getCurrentThemeId()` updates automatically.

*/
