import {
	Editor,
	TLAssetId,
	TLImageShape,
	TLShapeId,
	TLVideoShape,
	debounce,
	react,
	useDelaySvgExport,
	useEditor,
	useSvgExportContext,
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
export function useAsset(options: { shapeId: TLShapeId; assetId: TLAssetId | null }) {
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

	const previousUrl = useRef<string | null>(null)

	useEffect(() => {
		if (!assetId) return

		const asset = editor.getAsset(assetId)

		if (!asset) return

		let isCancelled = false

		let cancel: (() => void) | undefined

		const cleanup = react('update state', () => {
			if (!asset) return

			if (!isExport && editor.getCulledShapes().has(shapeId)) return

			// Set initial preview for the shape if it has no source (if it was pasted into a local project as base64)
			if (!asset.props.src) {
				const preview = editor.getTemporaryAssetPreview(asset.id)
				if (preview) {
					if (previousUrl.current !== preview) {
						previousUrl.current = preview // just for kicks, let's save the url as the previous URL
						setResult((prev) => ({ ...prev, isPlaceholder: true, url: preview })) // set the preview as the URL
						isReady() // let the SVG export know we're ready
					}
					return
				}
			}

			const width = editor.getShape<TLImageShape | TLVideoShape>(shapeId)?.props.w ?? 1
			const shapeScale = asset && 'w' in asset.props ? width / asset.props.w : 1
			const screenScale = editor.getZoomLevel() * shapeScale

			// todo: we could bail here if the only thing that has changed is the shape has changed from culled to not culled

			// If we already resolved the URL, debounce fetching potentially multiple image variations.
			if (didAlreadyResolve.current) {
				resolveAssetUrlDebounced(editor, assetId, screenScale, isExport, (url) => {
					if (isCancelled) return // don't update if the hook has remounted
					if (previousUrl.current === url) return // don't update the state if the url is the same
					previousUrl.current = url // keep the url around to compare with the next one
					setResult((prev) => ({ ...prev, url, isPlaceholder: false }))
				})
				cancel = resolveAssetUrlDebounced.cancel // cancel the debounce when the hook unmounts
			} else {
				resolveAssetUrl(editor, assetId, screenScale, isExport, (url) => {
					if (isCancelled) return
					didAlreadyResolve.current = true // mark that we've resolved our first image
					previousUrl.current = url // keep the url around to compare with the next one
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
		// There's a weird bug with out debounce function that doesn't
		// make it work right with async functions, so we use a callback
		// here instead of returning a promise.
		.then((url) => {
			callback(url)
		})
}

const resolveAssetUrlDebounced = debounce(resolveAssetUrl, 500)
