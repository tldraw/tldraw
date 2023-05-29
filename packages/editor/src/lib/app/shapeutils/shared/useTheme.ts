import { useValue } from 'signia-react'
import { useApp } from '../../../hooks/useApp'

/** @public */
export function useTheme() {
	const app = useApp()
	const isDarkMode = useValue('isDarkMode', () => app.isDarkMode, [app])
	return isDarkMode ? 'dark' : 'default'
}
