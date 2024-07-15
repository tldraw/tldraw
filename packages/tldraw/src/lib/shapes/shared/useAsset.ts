import {
	ReferenceCounterWithFixedTimeout,
	TLAssetId,
	TLShapeId,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/** @internal */
export function useAsset(shapeId: TLShapeId, assetId: TLAssetId | null, width: number) {
	const editor = useEditor()
	const [url, setUrl] = useState<string | ReferenceCounterWithFixedTimeout<string> | null>(null)
	const [isPlaceholder, setIsPlaceholder] = useState(false)
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
		if (url) didAlreadyResolve.current = true
	}, [url])

	useEffect(() => {
		if (isCulled) return

		if (assetId && !asset?.props.src) {
			const preview = editor.getTemporaryAssetPreview(assetId)
			if (preview) {
				// Lifecycle notes: `retain` here is to stop the preview from being released
				// on the uploader side of things (which initially kicked off the process). The uploader initially sets the timeout
				// but this interrupts the timeout and keeps the preview alive.
				// Here we set the RC (ReferenceCounterWithFixedTimeout) but below we set the actual url (string).
				// So, below where we do `setUrl(resolvedUrl)` is when this lifecycle is actually settled.
				// Afterwards, the RC will be released after a timeout.
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
export function useReferenceCounter<T>(value: ReferenceCounterWithFixedTimeout<T> | T): T {
	useEffect(() => {
		if (value instanceof ReferenceCounterWithFixedTimeout) {
			value.retain()

			return () => {
				value.release()
			}
		}
	})

	return value instanceof ReferenceCounterWithFixedTimeout ? value.unsafeGetWithoutRetain() : value
}
