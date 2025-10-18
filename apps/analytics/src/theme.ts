import { useEffect, useState } from 'react'

// This hook is used to read the theme of the document. When the theme changes, the hook will update the theme state.
// Since the analytics library is used on many sites, which all may use different themes, we use the most general way
// of detecting light or dark theme by checking the `color-scheme` CSS property on the `html` element.

function readDocumentTheme(): 'light' | 'dark' {
	if (typeof document === 'undefined') {
		return 'light'
	}

	const html = document.documentElement
	return html.getAttribute('style')?.includes('color-scheme: dark') ? 'dark' : 'light'
}

export function useDocumentTheme(): 'light' | 'dark' {
	const [theme, setTheme] = useState<'light' | 'dark'>(() => readDocumentTheme())

	useEffect(() => {
		if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
			return
		}

		const observer = new MutationObserver((mutations) => {
			if (mutations.some((mutation) => mutation.attributeName === 'style')) {
				setTheme(readDocumentTheme())
			}
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['style'],
		})

		return () => observer.disconnect()
	}, [])

	return theme
}
