import { asProjectColor, FocusColor } from '@tldraw/fairy-shared'
import { Editor, getColorValue, getDefaultColorTheme, TLDefaultColorStyle } from 'tldraw'

/**
 * Gets the CSS color value for a project color, using the editor's theme.
 * First normalizes the color using asColor, then resolves it using the DefaultColorThemePalette.
 *
 * @param editor - The tldraw editor instance (used to detect dark mode)
 * @param color - The FocusColor value to convert
 * @returns The CSS color string (e.g., '#4465e9')
 */
export function getProjectColor(editor: Editor, color: FocusColor | string): string {
	// First normalize the color using asColor
	const normalizedColor = asProjectColor(color)

	// Get the appropriate theme based on editor's dark mode setting
	const isDarkMode = editor.user.getIsDarkMode()
	const theme = getDefaultColorTheme({ isDarkMode })

	// Get the solid color value from the theme
	// FocusColor values match TLDefaultColorStyle values, so we can cast
	return getColorValue(theme, normalizedColor as TLDefaultColorStyle, 'solid')
}
