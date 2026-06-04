import { PINK_DARK, PINK_LIGHT } from '@tldraw/dotcom-shared'
import { DEFAULT_THEME, TLTheme, TLThemes } from 'tldraw'

// The full theme used by the dotcom editor: the default palette plus the custom
// "pink" color. We spread DEFAULT_THEME so every built-in color stays present —
// passing themes to `useSync` runs `registerColorsFromThemes`, which removes any
// color that isn't in the theme it's given.
export const themes: Partial<TLThemes> = {
	default: {
		...DEFAULT_THEME,
		colors: {
			light: { ...DEFAULT_THEME.colors.light, pink: PINK_LIGHT } as TLTheme['colors']['light'],
			dark: { ...DEFAULT_THEME.colors.dark, pink: PINK_DARK } as TLTheme['colors']['dark'],
		},
	},
}
