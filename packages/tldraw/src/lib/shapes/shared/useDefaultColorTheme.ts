import { getDefaultColorTheme, useIsDarkMode } from '@tldraw/editor'

/** @public */
export function useDefaultColorTheme() {
	return getDefaultColorTheme({ isDarkMode: useIsDarkMode() })
}
