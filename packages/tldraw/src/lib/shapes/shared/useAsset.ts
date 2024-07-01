import { RC, TLAssetId, TLShapeId, useEditor, useValue } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/** @internal */
export function useAsset(shapeId: TLShapeId, assetId: TLAssetId | null, width: number) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | RC<string> | null>(null)
	const [isPlaceholder, setIsPlaceholder] = useState(false)
	const asset = assetId ? editor.getAsset(assetId) : null
	const culledShapes = editor.getCulledShapes()
	const isCulled = culledShapes.has(shapeId)

	const shapeScale = asset && 'w' in asset.props ? width / asset.props.w : 1
	// We debounce the zoom level to reduce the number of times we fetch a new image and,
	// more importantly, to not cause zooming in and out to feel janky.
	const screenScale = useValue('zoom level', () => editor.getZoomLevel() * shapeScale, [
		editor,
		shapeScale,
	])

	const didAlreadyResolve = useRef(false)

	useEffect(() => {
		if (url) didAlreadyResolve.current = true
	}, [url])

	useEffect(() => {
		if (isCulled) return

		if (assetId && !asset?.props.src) {
			const preview = editor.getTemporaryAssetPreview(assetId)
			if (preview) {
				setUrl(preview.retain())
				setIsPlaceholder(true)
				return () => {
					preview.release()
				}
			}
		}

		let isCancelled = false

		async function resolve() {
			const resolvedUrl = await editor.resolveAssetUrl(assetId, {
				screenScale,
			})
			if (!isCancelled) {
				setUrl(resolvedUrl)
				setIsPlaceholder(false)
			}
		}

		// if we already resolved the URL, debounce resolution:
		if (didAlreadyResolve.current) {
			const timer = editor.timers.setTimeout(resolve, 500)

			return () => {
				clearTimeout(timer)
				isCancelled = true
			}
		} else {
			// if not, resolve immediately:
			resolve()
			return () => {
				isCancelled = true
			}
		}
	}, [assetId, asset?.props.src, isCulled, screenScale, editor])

	return { asset, url, isPlaceholder }
}

/** @internal */
export function useRC<T>(value: RC<T> | T): T {
	useEffect(() => {
		if (value instanceof RC) {
			value.retain()
			return () => {
				value.release()
			}
		}
	})

	return value instanceof RC ? value.unsafeGetWithoutRetain() : value
}
