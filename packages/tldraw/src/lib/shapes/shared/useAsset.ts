import { TLAssetId, debounce, useEditor } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/** @internal */
export function useAsset(assetId: TLAssetId | null, width: number) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | null>(null)
	const asset = assetId ? editor.getAsset(assetId) : null
	const debouncedResolver = useRef(
		debounce(async (screenScale: number) => {
			const resolvedUrl = await editor.resolveAssetUrl(assetId, {
				screenScale,
			})
			setUrl(resolvedUrl)
		}, 500)
	)

	const shapeScale = asset && 'w' in asset.props ? width / asset.props.w : 1
	// We debounce the zoom level to reduce the number of times we fetch a new image and,
	// more importantly, to not cause zooming in and out to feel janky.
	const screenScale = editor.getZoomLevel() * shapeScale

	useEffect(() => {
		const debouncedFn = debouncedResolver.current
		debouncedFn(screenScale)
		return () => debouncedFn.cancel()
	}, [assetId, screenScale, editor])

	return { asset, url }
}
