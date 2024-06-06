import { TLAssetId, useEditor, useValueDebounced } from '@tldraw/editor'
import { useEffect, useState } from 'react'

/** @internal */
export function useAsset(assetId: TLAssetId | null, width: number) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)
	const asset = assetId ? editor.getAsset(assetId) : null

	const shapeScale = asset && 'w' in asset.props ? width / asset.props.w : 1
	// We debounce the zoom level to reduce the number of times we fetch a new image and,
	// more importantly, to not cause zooming in and out to feel janky.
	const debouncedScreenScale = useValueDebounced(
		'zoom level',
		() => editor.getZoomLevel() * shapeScale,
		[editor, shapeScale],
		500
	)

	useEffect(() => {
		async function resolve() {
			const resolvedUrl = await editor.resolveAssetUrl(assetId, {
				screenScale: debouncedScreenScale,
			})
			setUrl(resolvedUrl)
		}
		resolve()
	}, [assetId, debouncedScreenScale, editor])

	return { asset, url }
}
