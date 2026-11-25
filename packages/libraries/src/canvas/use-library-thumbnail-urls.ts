import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEditor, useValue, type TLLibraryItemId } from 'tldraw'
import type { LibrarySource, TLLibraryThumbnailContext } from '../lib/LibrarySource'
import { getThumbnailForColorMode, type TLLibraryItem } from '../lib/schema'
import {
	DEFAULT_THUMBNAIL_WIDTH,
	getNetworkEffectiveType,
	getThumbnailContext,
	stepThumbnailWidth,
} from '../lib/thumbnail-context'

interface ThumbnailRequest {
	source: LibrarySource
	item: TLLibraryItem
	context: TLLibraryThumbnailContext
}

/**
 * How wide the tiles showing thumbnails are, for {@link useLibraryThumbnailUrls}: a `width` in CSS
 * pixels, or a `container` whose first element with the `tlui-libraries-tile__thumbnail` class is
 * measured, and measured again when the container resizes.
 * @public
 */
export type LibraryThumbnailUrlsOptions =
	| { width: number; container?: never }
	| { container: HTMLElement | null; width?: never }

/**
 * Each item's thumbnail URL, or undefined for none or while it resolves. Without a
 * {@link LibrarySource.resolveThumbnail}, the item's own `thumbnail` for the editor's colour mode.
 *
 * With one, the source is asked for a URL sized for the tiles, whose width comes from `options`
 * and is rounded up to a power of two. Without a width, or before the container has a tile to
 * measure, URLs are sized for the libraries panel's tiles.
 * @public
 */
export function useLibraryThumbnailUrls(
	source: LibrarySource,
	items: TLLibraryItem[],
	options?: LibraryThumbnailUrlsOptions
): Record<TLLibraryItemId, string | undefined> {
	const editor = useEditor()
	const colorMode = useValue('thumbnail colour mode', () => editor.getColorMode(), [editor])
	const dpr = useValue('thumbnail dpr', () => editor.getInstanceState().devicePixelRatio, [editor])
	const measuredWidth = useTileWidth(
		options?.container ?? null,
		source.resolveThumbnail !== undefined && items.length > 0
	)
	const tileWidth = options?.width ?? measuredWidth ?? DEFAULT_THUMBNAIL_WIDTH
	const context = useMemo(
		() =>
			getThumbnailContext({
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
		if (!resolve) return
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
		setResolved((urls) => {
			const next = Object.fromEntries(
				items.map((item) => [item.id, item.id in answered ? answered[item.id] : urls[item.id]])
			)
			// A caller may pass a new but equal items array each render; keeping the same object
			// then stops this effect from re-rendering forever.
			const ids = Object.keys(next)
			const same =
				ids.length === Object.keys(urls).length && ids.every((id) => urls[id] === next[id])
			return same ? urls : next
		})
	}, [source, items, context])

	const resolvedUrls = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(resolved).map(([id, url]) => [id, url ?? undefined])
			) as Record<TLLibraryItemId, string | undefined>,
		[resolved]
	)

	if (source.resolveThumbnail) return resolvedUrls
	return Object.fromEntries(
		items.map((item) => [
			item.id,
			item.thumbnail ? getThumbnailForColorMode(item.thumbnail, colorMode) : undefined,
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
