import { TLAssetId, TLShapeId, useEditor, useValue } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/**
 * This is a handy helper hook that resolves an asset to a URL for a given shape. It takes care of fetching the asset.
 * This is used in particular for high-resolution images when you want lower and higher resolution depending
 * on the context.
 *
 * @public
 */
export function useAsset(shapeId: TLShapeId, assetId: TLAssetId | null, width: number) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)
	const asset = assetId ? editor.getAsset(assetId) : null
	const culledShapes = editor.getCulledShapes()
	const isCulled = culledShapes.has(shapeId)
	const didAlreadyResolve = useRef(false)

	useEffect(() => {
		if (url) didAlreadyResolve.current = true
	}, [url])

	const shapeScale = asset && 'w' in asset.props ? width / asset.props.w : 1
	// We debounce the zoom level to reduce the number of times we fetch a new image and,
	// more importantly, to not cause zooming in and out to feel janky.
	const screenScale = useValue('zoom level', () => editor.getZoomLevel() * shapeScale, [
		editor,
		shapeScale,
	])

	useEffect(() => {
		if (isCulled) return

		let isCancelled = false
		const timer = editor.timers.setTimeout(
			async () => {
				const resolvedUrl = await editor.resolveAssetUrl(assetId, {
					screenScale,
				})
				if (!isCancelled) setUrl(resolvedUrl)
			},
			didAlreadyResolve.current ? 500 : 0
		)

		return () => {
			clearTimeout(timer)
			isCancelled = true
		}
	}, [assetId, asset?.props.src, isCulled, screenScale, editor])

	return { asset, url }
}
