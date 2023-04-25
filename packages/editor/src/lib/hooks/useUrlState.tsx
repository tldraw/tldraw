import { clamp } from '@tldraw/primitives'
import { Box2dModel, TLPageId } from '@tldraw/tlschema'
import { debounce } from '@tldraw/utils'
import { useEffect } from 'react'
import { react } from 'signia'
import { MAX_ZOOM, MIN_ZOOM } from '../constants'
import { useApp } from './useApp'
import { useEvent } from './useEvent'

const PARAMS = {
	viewport: 'viewport',
	page: 'page',
} as const
type Params = Record<keyof typeof PARAMS, string>

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

/** @public */
export function useUrlState(changeUrl: (params: Params) => void) {
	const app = useApp()

	const onChangeUrl = useEvent(changeUrl)

	// Load initial data
	useEffect(() => {
		if (!app) return

		const url = new URL(location.href)

		if (url.searchParams.has(PARAMS.viewport)) {
			const newViewportRaw = url.searchParams.get(PARAMS.viewport)
			if (newViewportRaw) {
				try {
					const viewport = viewportFromString(newViewportRaw)
					const { x, y, w, h } = viewport
					const { w: sw, h: sh } = app.viewportScreenBounds

					const zoom = clamp(Math.min(sw / w, sh / h), MIN_ZOOM, MAX_ZOOM)

					app.setCamera(-x + (sw - w * zoom) / 2 / zoom, -y + (sh - h * zoom) / 2 / zoom, zoom)
				} catch (err) {
					console.error(err)
				}
			}
		}
		if (url.searchParams.has(PARAMS.page)) {
			const newPageId = url.searchParams.get(PARAMS.page)
			if (newPageId) {
				if (app.store.has(newPageId as TLPageId)) {
					app.setCurrentPageId(newPageId as TLPageId)
				}
			}
		}

		const handleChange = debounce((viewport: Box2dModel, pageId: TLPageId) => {
			if (!viewport) return
			if (!pageId) return
			onChangeUrl({ [PARAMS.viewport]: viewportToString(viewport), [PARAMS.page]: pageId })
		}, 500)

		const unsubscribe = react('urlState', () => {
			handleChange(app.viewportPageBounds, app.currentPageId)
		})

		return () => {
			handleChange.cancel()
			unsubscribe()
		}
	}, [app, onChangeUrl])
}
