import {
	debounce,
	Editor,
	TLAssetId,
	TLImageShape,
	TLShapeId,
	TLVideoShape,
	useDelaySvgExport,
	useEditor,
	useSvgExportContext,
} from '@tldraw/editor'
import { react } from '@tldraw/state'
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
export function useImageOrVideoAsset(options: { shapeId: TLShapeId; assetId: TLAssetId | null }) {
	const { shapeId, assetId } = options

	const editor = useEditor()

	const isExport = !!useSvgExportContext()

	const isReady = useDelaySvgExport()

	const didAlreadyResolve = useRef(false)

	const [result, setResult] = useState(() => ({
		asset: assetId ? editor.getAsset(assetId) : null,
		url: null as string | null,
		isPlaceholder: false,
		isCulled: editor.getCulledShapes().has(shapeId),
	}))

	useEffect(() => {
		if (!assetId) return
		const asset = editor.getAsset(assetId)
		if (!asset) return

		let isCancelled = false

		let cancel: (() => void) | undefined

		const cleanup = react('update state', () => {
			const result = {
				asset,
				url: null as string | null,
				isPlaceholder: false,
				isCulled: editor.getCulledShapes().has(shapeId),
			}

			const width = editor.getShape<TLImageShape | TLVideoShape>(shapeId)?.props.w ?? 1
			const shapeScale = asset && 'w' in asset.props ? width / asset.props.w : 1
			const screenScale = editor.getZoomLevel() * shapeScale
			const isCulled = editor.getCulledShapes().has(shapeId)

			if (!isExport && isCulled) {
				return
			}

			if (!asset.props.src) {
				const preview = editor.getTemporaryAssetPreview(asset.id)
				if (preview) {
					result.isPlaceholder = true
					result.url = preview
					setResult(result)
					isReady()
					return
				}
			}

			// If we already resolved the URL, debounce fetching potentially multiple image variations.
			if (didAlreadyResolve.current) {
				resolveAssetUrlDebounced(editor, assetId, screenScale, isExport, (url) => {
					if (isCancelled) return
					setResult((prev) => ({ ...prev, url, isPlaceholder: false }))
				})
				cancel = resolveAssetUrlDebounced.cancel
			} else {
				resolveAssetUrl(editor, assetId, screenScale, isExport, (url) => {
					if (isCancelled) return
					didAlreadyResolve.current = true
					setResult((prev) => ({ ...prev, url, isPlaceholder: false }))
				})
			}
		})

		return () => {
			cleanup()
			cancel?.()
			isCancelled = true
		}
	}, [editor, assetId, isExport, isReady, shapeId])

	return result
}

function resolveAssetUrl(
	editor: Editor,
	assetId: TLAssetId,
	screenScale: number,
	isExport: boolean,
	callback: (url: string | null) => void
) {
	editor
		.resolveAssetUrl(assetId, {
			screenScale,
			shouldResolveToOriginal: isExport,
		})
		.then((url) => {
			callback(url)
		})
}

const resolveAssetUrlDebounced = debounce(resolveAssetUrl, 500)
