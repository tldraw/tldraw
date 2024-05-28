import { TLAssetId, TLShapeId, useEditor, useValueDebounced } from '@tldraw/editor'
import { useEffect, useState } from 'react'

/** @internal */
export function useAsset(shapeId: TLShapeId, assetId: TLAssetId | null) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)
	const asset = assetId ? editor.getAsset(assetId) : null
	const shape = editor.getShape(shapeId)

	const shapeScale =
		asset && shape && 'w' in shape.props && 'w' in asset.props ? shape.props.w / asset.props.w : 1
	// We debounce the zoom level to reduce the number of times we fetch a new image and,
	// more importantly, to not cause zooming in and out to feel janky.
	const debouncedZoom = useValueDebounced(
		'zoom level',
		() => editor.getZoomLevel() * shapeScale,
		[editor, shapeScale],
		500
	)

	// We only look at the zoom level at powers of 2.
	const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
	const steppedZoom = Math.max(0.25, zoomStepFunction(debouncedZoom))

	useEffect(() => {
		async function resolve() {
			const resolvedUrl = await editor.resolveAssetUrl(assetId, {
				rawZoom: debouncedZoom,
				steppedZoom,
			})
			setUrl(resolvedUrl)
		}
		resolve()
	}, [assetId, debouncedZoom, steppedZoom, editor])

	return { asset, url }
}
