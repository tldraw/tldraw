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

	// Avoid updating this state whenever we can: every update re-renders the shape.
	const [result, setResult] = useState<{
		asset: (TLImageAsset | TLVideoAsset) | null
		url: string | null
	}>(() => ({
		asset: assetId ? (editor.getAsset<TLImageAsset | TLVideoAsset>(assetId) ?? null) : null,
		url: null,
	}))

	// After the first resolution we can debounce subsequent ones
	const didAlreadyResolve = useRef(false)
	const previousAssetId = useRef<TLAssetId | null>(null)
	// Skip debouncing for the next resolution (set when the asset itself changes)
	const shouldRunImmediately = useRef(false)
	const previousUrl = useRef<string | null>(null)

	useEffect(() => {
		if (previousAssetId.current !== assetId) {
			shouldRunImmediately.current = true
		}
		previousAssetId.current = assetId

		if (!assetId) return

		let isCancelled = false
		let cancelDebounceFn: (() => void) | undefined

		const cleanupEffectScheduler = react('update state', () => {
			if (!exportInfo && shapeId && editor.getCulledShapes().has(shapeId)) return

			const asset = editor.getAsset<TLImageAsset | TLVideoAsset>(assetId)
			if (!asset) {
				// The asset was deleted, such as when an upload fails
				setResult((prev) => ({ ...prev, asset: null, url: null }))
				return
			}

			// Use the temporary preview while the asset has no source yet (e.g. still uploading)
			if (!asset.props.src) {
				const preview = editor.getTemporaryAssetPreview(asset.id)
				if (preview) {
					if (previousUrl.current !== preview) {
						previousUrl.current = preview
						setResult((prev) => ({ ...prev, isPlaceholder: true, url: preview }))
						exportIsReady()
					}
					return
				}
			}

			const screenScale =
				(exportInfo ? exportInfo.scale : editor.getEfficientZoomLevel()) * (width / asset.props.w)

			function resolve(asset: TLImageAsset | TLVideoAsset, url: string | null) {
				if (isCancelled) return // the hook has remounted
				if (previousUrl.current === url) return
				didAlreadyResolve.current = true
				previousUrl.current = url
				setResult({ asset, url })
				exportIsReady() // let the SVG export know we're ready for export
			}

			// Debounce fetching potentially multiple image variations (e.g. during zoom or resize).
			// Don't debounce when the asset itself changes - resolve immediately.
			if (didAlreadyResolve.current && !shouldRunImmediately.current) {
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
				// Resolve immediately when: first resolution, or the asset itself changed.
				// Cancel any pending debounce to prevent stale updates.
				cancelDebounceFn?.()
				resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
				// Reset the flag after immediate resolution so subsequent updates are debounced
				shouldRunImmediately.current = false
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
