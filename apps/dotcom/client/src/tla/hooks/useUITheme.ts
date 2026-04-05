import { useEffect, useRef } from 'react'
import { useValue } from 'tldraw'
import { getUITheme } from '../themes/ui-themes'
import { getLocalSessionState } from '../utils/local-session-state'

function applyThemeToElement(el: HTMLElement, props: Record<string, string>) {
	for (const [key, value] of Object.entries(props)) {
		el.style.setProperty(`--${key}`, value)
	}
}

function clearThemeFromElement(el: HTMLElement, keys: string[]) {
	for (const key of keys) {
		el.style.removeProperty(`--${key}`)
	}
}

/**
 * Applies CSS variable overrides from the selected UI color theme to the
 * `.tla-theme-container` element and any inner `.tl-container` elements.
 * Uses a MutationObserver to catch editor containers that mount later.
 */
export function useUITheme() {
	const colorTheme = useValue('colorTheme', () => getLocalSessionState().colorTheme, [])
	const theme = useValue('theme', () => getLocalSessionState().theme, [])
	const appliedRef = useRef<{ keys: string[]; elements: HTMLElement[] }>({ keys: [], elements: [] })

	useEffect(() => {
		const container = document.querySelector('.tla-theme-container') as HTMLElement | null
		if (!container) return

		// Clear previous overrides from all previously-targeted elements
		const prev = appliedRef.current
		for (const el of prev.elements) {
			clearThemeFromElement(el, prev.keys)
		}
		appliedRef.current = { keys: [], elements: [] }

		if (colorTheme === 'default') return

		const themeData = getUITheme(colorTheme)
		if (!themeData) return

		const variant = theme === 'dark' ? themeData.dark : themeData.light
		const allProps = { ...variant.tl, ...variant.tla }
		const keys = Object.keys(allProps)

		// Apply to the container and any existing inner .tl-container elements
		const targets = [container, ...container.querySelectorAll<HTMLElement>('.tl-container')]
		for (const el of targets) {
			applyThemeToElement(el, allProps)
		}
		appliedRef.current = { keys, elements: [...targets] }

		// Watch for new .tl-container elements mounting inside the container
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue
					const newContainers = node.classList.contains('tl-container')
						? [node]
						: [...node.querySelectorAll<HTMLElement>('.tl-container')]
					for (const el of newContainers) {
						applyThemeToElement(el, allProps)
						appliedRef.current.elements.push(el)
					}
				}
			}
		})
		observer.observe(container, { childList: true, subtree: true })

		return () => {
			observer.disconnect()
			const current = appliedRef.current
			for (const el of current.elements) {
				clearThemeFromElement(el, current.keys)
			}
			appliedRef.current = { keys: [], elements: [] }
		}
	}, [colorTheme, theme])
}
