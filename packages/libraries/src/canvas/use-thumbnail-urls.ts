import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import type { LibrarySource, TLLibraryThumbnailContext } from '../lib/LibrarySource'
import { getThumbnailForColorMode, type TLLibraryItem } from '../lib/schema'
import {
	getNetworkEffectiveType,
	getThumbnailContext,
	stepThumbnailWidth,
} from '../lib/thumbnail-context'

interface ThumbnailRequest {
	source: LibrarySource
	item: TLLibraryItem
	context: TLLibraryThumbnailContext
}

/** Each item's thumbnail URL, from the source's `resolveThumbnail` when it has one. */
export function useThumbnailUrls(
	source: LibrarySource,
	items: TLLibraryItem[],
	container: HTMLElement | null
): Record<string, string | null | undefined> {
	const editor = useEditor()
	const colorMode = useValue('thumbnail colour mode', () => editor.getColorMode(), [editor])
	const dpr = useValue('thumbnail dpr', () => editor.getInstanceState().devicePixelRatio, [editor])
	const tileWidth = useTileWidth(
		container,
		source.resolveThumbnail !== undefined && items.length > 0
	)
	const context = useMemo(
		() =>
			tileWidth === null
				? null
				: getThumbnailContext({
						colorMode,
						tileWidth,
						dpr,
						networkEffectiveType: getNetworkEffectiveType(),
					}),
		[colorMode, tileWidth, dpr]
	)
	const [resolved, setResolved] = useState<Record<string, string | null>>({})
	// The last request per item. An item is asked again only when it, the context or the source
	// changes, and an answer that arrives after a newer request is dropped.
	const requests = useRef(new Map<string, ThumbnailRequest>())

	// A layout effect, so URLs a source answers at once are in the first paint.
	useLayoutEffect(() => {
		const resolve = source.resolveThumbnail?.bind(source)
		if (!resolve || !context) return
		const answered: Record<string, string | null> = {}
		const listed = new Set<string>()
		for (const item of items) {
			listed.add(item.id)
			const last = requests.current.get(item.id)
			if (last?.source === source && last.item === item && last.context === context) continue
			const request = { source, item, context }
			requests.current.set(item.id, request)
			let result: string | null | Promise<string | null>
			try {
				result = resolve(item, context)
			} catch {
				result = null
			}
			if (typeof result === 'string' || result === null) {
				answered[item.id] = result
				continue
			}
			const settle = (url: string | null) => {
				if (requests.current.get(item.id) !== request) return
				setResolved((urls) => ({ ...urls, [item.id]: url }))
			}
			result.then(settle, () => settle(null))
		}
		for (const id of requests.current.keys()) {
			if (!listed.has(id)) requests.current.delete(id)
		}
		// Items still resolving keep their last URL, so a new size doesn't blank the tile.
		setResolved((urls) =>
			Object.fromEntries(
				items.map((item) => [item.id, item.id in answered ? answered[item.id] : urls[item.id]])
			)
		)
	}, [source, items, context])

	if (source.resolveThumbnail) return resolved
	return Object.fromEntries(
		items.map((item) => [
			item.id,
			item.thumbnail && getThumbnailForColorMode(item.thumbnail, colorMode),
		])
	)
}

function useTileWidth(container: HTMLElement | null, enabled: boolean) {
	const [width, setWidth] = useState<number | null>(null)
	useLayoutEffect(() => {
		if (!container || !enabled) return
		// Every tile is as wide as the first. Watching the container catches restyles and new tiles.
		const measure = () => {
			const thumbnail = container.querySelector<HTMLElement>('.tlui-libraries-tile__thumbnail')
			if (thumbnail?.offsetWidth) setWidth(stepThumbnailWidth(thumbnail.offsetWidth))
		}
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(container)
		return () => observer.disconnect()
	}, [container, enabled])
	return width
}
