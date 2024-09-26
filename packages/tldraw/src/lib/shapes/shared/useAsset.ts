import {
	TLAssetId,
	TLShapeId,
	useDelaySvgExport,
	useEditor,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/**
 * This is a handy helper hook that resolves an asset to an optimized URL for a given shape, or its
 * {@link @tldraw/editor#Editor.createTemporaryAssetPreview | placeholder} if the asset is still
 * uploading. This is used in particular for high-resolution images when you want lower and higher
 * resolution depending on the context.
 *
 * For image scaling to work, you need to implement scaled URLs in
 * {@link @tldraw/tlschema#TLAssetStore.resolve}.
 *
 * @public
 */
export function useAsset(options: {
	shapeId: TLShapeId
	assetId: TLAssetId | null
	width: number
}) {
	const { shapeId, assetId, width } = options
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)
	const [isPlaceholder, setIsPlaceholder] = useState(false)
	const isExport = !!useSvgExportContext()
	const asset = assetId ? editor.getAsset(assetId) : null
	const culledShapes = editor.getCulledShapes()
	const isCulled = culledShapes.has(shapeId)
	const didAlreadyResolve = useRef(false)
	const isReady = useDelaySvgExport()

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
		if (url) didAlreadyResolve.current = true
	}, [url])

	useEffect(() => {
		if (!isExport && isCulled) return

		if (assetId && !asset?.props.src) {
			const preview = editor.getTemporaryAssetPreview(assetId)

			if (preview) {
				setUrl(preview)
				setIsPlaceholder(true)
				isReady()
				return
			}
		}

		let isCancelled = false

		async function resolve() {
			const resolvedUrl = await editor.resolveAssetUrl(assetId, {
				screenScale,
				shouldResolveToOriginal: isExport,
			})

			if (!isCancelled) {
				setUrl(resolvedUrl)
				setIsPlaceholder(false)
				isReady()
			}
		}

		// If we already resolved the URL, debounce fetching potentially multiple image variations.
		if (didAlreadyResolve.current) {
			const timer = editor.timers.setTimeout(resolve, 500)
			return () => {
				clearTimeout(timer)
				isCancelled = true
			}
		} else {
			resolve()
			return () => {
				isCancelled = true
			}
		}
	}, [assetId, asset?.props.src, isCulled, screenScale, editor, isExport, isReady])

	return { asset, url, isPlaceholder }
}
