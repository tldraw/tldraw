import { useCurrentThemeId } from './useCurrentThemeId'

/**
 * @deprecated Use `useCurrentThemeId()` instead and compare against the theme ID.
 * @public
 */
export function useIsDarkMode() {
	return useCurrentThemeId() === 'dark'
}
