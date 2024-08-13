import { useLayoutEffect } from 'react'
import { Box, PageRecordType, createDeepLinkString } from 'tldraw'

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

export function useLegacyUrlParams() {
	useLayoutEffect(() => {
		const url = new URL(window.location.href)

		const viewportString = url.searchParams.get(PARAMS.viewport) ?? url.searchParams.get(PARAMS.v)
		const pageString = url.searchParams.get(PARAMS.page) ?? url.searchParams.get(PARAMS.p)
		if (!viewportString || !pageString) {
			return
		}

		url.searchParams.delete(PARAMS.viewport)
		url.searchParams.delete(PARAMS.page)
		url.searchParams.delete(PARAMS.v)
		url.searchParams.delete(PARAMS.p)

		const viewport = Box.From(viewportFromString(viewportString))
		const pageId = PageRecordType.isId(pageString)
			? pageString
			: PageRecordType.createId(pageString)

		url.searchParams.set('d', createDeepLinkString({ type: 'viewport', bounds: viewport, pageId }))

		window.history.replaceState({}, document.title, url.toString())
	}, [])
}
