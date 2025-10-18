import { useEffect, useState } from 'react'

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
