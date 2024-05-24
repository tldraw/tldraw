import { TLAssetId, debounce, useEditor, useValue } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/** @internal */
export function useAsset(assetId: TLAssetId | null) {
	const editor = useEditor()
	const [url, setUrl] = useState('')
	const asset = assetId ? editor.getAsset(assetId) : null

	// We debounce the zoom level to reduce the number of times we fetch a new image and,
	// more importantly, to not cause zooming in and out to feel janky.
	const [debouncedZoom, setDebouncedZoom] = useState(editor.getZoomLevel())
	const zoomUpdater = useRef(debounce((zoom: number) => setDebouncedZoom(zoom), 500))
	useValue('zoom level', () => zoomUpdater.current(editor.getZoomLevel()), [editor])

	useEffect(() => {
		async function resolve() {
			const resolvedUrl = await editor.resolveAssetUrl(assetId, { zoom: debouncedZoom })
			setUrl(resolvedUrl)
		}
		resolve()
	}, [assetId, debouncedZoom, editor])

	return { asset, url }
}
