import { FocusColor } from '@tldraw/fairy-shared'

/**
 * Gets the CSS color value for a project color, using the editor's theme.
 * First normalizes the color using asColor, then resolves it using the DefaultColorThemePalette.
 *
 * @param editor - The tldraw editor instance (used to detect dark mode)
 * @param color - The FocusColor value to convert
 * @returns The CSS color string (e.g., '#4465e9')
 */
export function getProjectColor(color: FocusColor | string): string {
	switch (color) {
		case 'red': {
			return 'var(--tl-color-fairy-rose)'
		}
		case 'light-red': {
			return 'var(--tl-color-fairy-coral)'
		}
		case 'green': {
			return 'var(--tl-color-fairy-green)'
		}
		case 'light-green': {
			return 'var(--tl-color-fairy-teal)'
		}
		case 'blue': {
			return 'var(--tl-color-fairy-pink)'
		}
		case 'light-blue': {
			return 'var(--tl-color-fairy-purple)'
		}
		case 'orange': {
			return 'var(--tl-color-fairy-gold)'
		}
		case 'yellow': {
			return 'var(--tl-color-fairy-peach)'
		}
		case 'black': {
			return 'var(--tl-color-fairy-green)'
		}
		case 'violet': {
			return 'var(--tl-color-fairy-purple)'
		}
		case 'light-violet': {
			return 'var(--tl-color-fairy-purple)'
		}
		case 'grey': {
			return 'var(--tl-color-fairy-gold)'
		}
		case 'white': {
			return 'var(--tl-color-fairy-white)'
		}
	}
	return color
}
