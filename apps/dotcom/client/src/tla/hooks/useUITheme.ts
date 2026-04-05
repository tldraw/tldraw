import { useEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { getUITheme } from '../themes/ui-themes'
import { getLocalSessionState } from '../utils/local-session-state'

/**
 * Applies CSS variable overrides from the selected UI color theme to the
 * closest `.tla-theme-container` element. When the theme is 'default',
 * any previously-applied overrides are removed so the base CSS classes
 * (`.tl-theme__light` / `.tl-theme__dark`) take effect.
 */
export function useUITheme() {
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])
	const theme = useValue('theme', () => getLocalSessionState().theme, [])
	const containerRef = useRef<HTMLElement | null>(null)
	const appliedKeysRef = useRef<string[]>([])

	useEffect(() => {
		const container = document.querySelector('.tla-theme-container') as HTMLElement | null
		if (!container) return
		containerRef.current = container

		// Clear previous overrides
		for (const key of appliedKeysRef.current) {
			container.style.removeProperty(key)
		}
		appliedKeysRef.current = []

		if (colorTheme === 'default') return

		const themeData = getUITheme(colorTheme)
		if (!themeData) return

		const variant = theme === 'dark' ? themeData.dark : themeData.light
		const keys: string[] = []

		for (const [key, value] of Object.entries(variant.tl)) {
			const prop = `--${key}`
			container.style.setProperty(prop, value)
			keys.push(prop)
		}
		for (const [key, value] of Object.entries(variant.tla)) {
			const prop = `--${key}`
			container.style.setProperty(prop, value)
			keys.push(prop)
		}

		appliedKeysRef.current = keys

		return () => {
			for (const key of keys) {
				container.style.removeProperty(key)
			}
			appliedKeysRef.current = []
		}
	}, [colorTheme, theme])
}
