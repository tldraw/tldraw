import { useLayoutEffect } from 'react'

const PARAMS = {
	// deprecated
	viewport: 'viewport',
	page: 'page',
	// current
	v: 'v',
	p: 'p',
} as const

const viewportFromString = (str: string) => {
	const [x, y, w, h] = str.split(',').map((n) => parseInt(n, 10))
	return { x, y, w, h }
}

const viewportToString = (
	{ x, y, w, h }: { x: number; y: number; w: number; h: number },
	precision = 0
) => {
	return `${x.toFixed(precision)},${y.toFixed(precision)},${w.toFixed(precision)},${h.toFixed(
		precision
	)}`
}

export function useLegacyUrlParams() {
	useLayoutEffect(() => {
		const url = new URL(window.location.href)
		const viewport = url.searchParams.get(PARAMS.viewport)
		if (viewport) {
			url.searchParams.set(PARAMS.v, viewportToString(viewportFromString(viewport)))
			url.searchParams.delete(PARAMS.viewport)
		}
		const page = url.searchParams.get(PARAMS.page)
		if (page) {
			url.searchParams.set(PARAMS.p, page.slice('page:'.length))
			url.searchParams.delete(PARAMS.page)
		}
		window.history.replaceState({}, document.title, url.toString())
	}, [])
}
