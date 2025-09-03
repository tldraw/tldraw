import {
	Editor,
	SvgExportContext,
	TLAssetId,
	TLImageAsset,
	TLShapeId,
	TLVideoAsset,
	react,
	useDelaySvgExport,
	useEditor,
	useSvgExportContext,
} from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/**
 * Options for {@link useImageOrVideoAsset}.
 *
 * @public
 */
export interface UseImageOrVideoAssetOptions {
	/** The asset ID you want a URL for. */
	assetId: TLAssetId | null
	/**
	 * The shape the asset is being used for. We won't update the resolved URL while the shape is
	 * off-screen.
	 */
	shapeId?: TLShapeId
	/**
	 * The width at which the asset will be displayed, in shape-space pixels.
	 */
	width: number
}

/**
 * This is a handy helper hook that resolves an asset to an optimized URL for a given shape, or its
 * {@link @tldraw/editor#Editor.createTemporaryAssetPreview | placeholder} if the asset is still
 * uploading. This is used in particular for high-resolution images when you want lower and higher
 * resolution depending on the size of the image on the canvas and the zoom level.
 *
 * For image scaling to work, you need to implement scaled URLs in
 * {@link @tldraw/tlschema#TLAssetStore.resolve}.
 *
 * @public
 */
export function useImageOrVideoAsset({ shapeId, assetId, width }: UseImageOrVideoAssetOptions) {
	const editor = useEditor()
	const exportInfo = useSvgExportContext()
	const exportIsReady = useDelaySvgExport()

	// We use a state to store the result of the asset resolution, and we're going to avoid updating this whenever we can
	const [result, setResult] = useState<{
		asset: (TLImageAsset | TLVideoAsset) | null
		url: string | null
	}>(() => ({
		asset: assetId ? (editor.getAsset<TLImageAsset | TLVideoAsset>(assetId) ?? null) : null,
		url: null as string | null,
	}))

	// A flag for whether we've resolved the asset URL at least once, after which we can debounce
	const didAlreadyResolve = useRef(false)

	// The last URL that we've seen for the shape
	const previousUrl = useRef<string | null>(null)

	useEffect(() => {
		if (!assetId) return

		let isCancelled = false
		let cancelDebounceFn: (() => void) | undefined

		const cleanupEffectScheduler = react('update state', () => {
			if (!exportInfo && shapeId && editor.getCulledShapes().has(shapeId)) return

			// Get the fresh asset
			const asset = editor.getAsset<TLImageAsset | TLVideoAsset>(assetId)
			if (!asset) {
				// If the asset is deleted, such as when an upload fails, set the URL to null
				setResult((prev) => ({ ...prev, asset: null, url: null }))
				return
			}

			// Set initial preview for the shape if it has no source (if it was pasted into a local project as base64)
			if (!asset.props.src) {
				const preview = editor.getTemporaryAssetPreview(asset.id)
				if (preview) {
					if (previousUrl.current !== preview) {
						previousUrl.current = preview // just for kicks, let's save the url as the previous URL
						setResult((prev) => ({ ...prev, isPlaceholder: true, url: preview })) // set the preview as the URL
						exportIsReady() // let the SVG export know we're ready for export
					}
					return
				}
			}

			// aside ...we could bail here if the only thing that has changed is the shape has changed from culled to not culled

			const screenScale = exportInfo
				? exportInfo.scale * (width / asset.props.w)
				: editor.getZoomLevel() * (width / asset.props.w)

			function resolve(asset: TLImageAsset | TLVideoAsset, url: string | null) {
				if (isCancelled) return // don't update if the hook has remounted
				if (previousUrl.current === url) return // don't update the state if the url is the same
				didAlreadyResolve.current = true // mark that we've resolved our first image
				previousUrl.current = url // keep the url around to compare with the next one
				setResult({ asset, url })
				exportIsReady() // let the SVG export know we're ready for export
			}

			// If we already resolved the URL, debounce fetching potentially multiple image variations.
			if (didAlreadyResolve.current) {
				let tick = 0

				const resolveAssetAfterAWhile = () => {
					tick++
					if (tick > 500 / 16) {
						// debounce for 500ms
						resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
						cancelDebounceFn?.()
					}
				}

				cancelDebounceFn?.()
				editor.on('tick', resolveAssetAfterAWhile)
				cancelDebounceFn = () => editor.off('tick', resolveAssetAfterAWhile)
			} else {
				resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
			}
		})

		return () => {
			cleanupEffectScheduler()
			cancelDebounceFn?.()
			isCancelled = true
		}
	}, [editor, assetId, exportInfo, exportIsReady, shapeId, width])

	return result
}

function resolveAssetUrl(
	editor: Editor,
	assetId: TLAssetId,
	screenScale: number,
	exportInfo: SvgExportContext | null,
	callback: (url: string | null) => void
) {
	editor
		.resolveAssetUrl(assetId, {
			screenScale,
			shouldResolveToOriginal: exportInfo ? exportInfo.pixelRatio === null : false,
			dpr: exportInfo?.pixelRatio ?? undefined,
		})
		// There's a weird bug with out debounce function that doesn't
		// make it work right with async functions, so we use a callback
		// here instead of returning a promise.
		.then((url) => {
			callback(url)
		})
}
