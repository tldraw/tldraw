import { Editor, MAX_ZOOM, MIN_ZOOM, TLPageId, debounce, react, useEditor } from '@tldraw/tldraw'
import { default as React, useEffect } from 'react'

const PARAMS = {
	viewport: 'viewport',
	page: 'page',
} as const
export type UrlStateParams = Record<keyof typeof PARAMS, string>

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

/**
 * @param app - The app instance.
 * @public
 */
export const getViewportUrlQuery = (editor: Editor): UrlStateParams | null => {
	if (!editor.getViewportPageBounds()) return null
	return {
		[PARAMS.viewport]: viewportToString(editor.getViewportPageBounds()),
		[PARAMS.page]: editor.getCurrentPageId(),
	}
}

/** @public */
export function useUrlState(onChangeUrl: (params: UrlStateParams) => void) {
	const editor = useEditor()
	const onChangeUrlRef = React.useRef(onChangeUrl)
	onChangeUrlRef.current = onChangeUrl

	// Load initial data
	useEffect(() => {
		if (!editor) return

		const url = new URL(location.href)

		if (url.searchParams.has(PARAMS.viewport)) {
			const newViewportRaw = url.searchParams.get(PARAMS.viewport)
			if (newViewportRaw) {
				try {
					const viewport = viewportFromString(newViewportRaw)
					const { x, y, w, h } = viewport
					const { w: sw, h: sh } = editor.getViewportScreenBounds()

					const zoom = Math.min(Math.max(Math.min(sw / w, sh / h), MIN_ZOOM), MAX_ZOOM)

					editor.setCamera({
						x: -x + (sw - w * zoom) / 2 / zoom,
						y: -y + (sh - h * zoom) / 2 / zoom,
						z: zoom,
					})
				} catch (err) {
					console.error(err)
				}
			}
		}
		if (url.searchParams.has(PARAMS.page)) {
			const newPageId = url.searchParams.get(PARAMS.page)
			if (newPageId) {
				if (editor.store.has(newPageId as TLPageId)) {
					editor.setCurrentPage(newPageId as TLPageId)
				}
			}
		}

		const handleChange = debounce((params: UrlStateParams | null) => {
			if (params) onChangeUrlRef.current(params)
		}, 500)

		const unsubscribe = react('urlState', () => {
			handleChange(getViewportUrlQuery(editor))
		})

		return () => {
			handleChange.cancel()
			unsubscribe()
		}
	}, [editor])
}
