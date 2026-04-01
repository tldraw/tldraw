import {
	Editor,
	SvgExportContext,
	TLAssetId,
	TLMediaAsset,
	TLShapeId,
	react,
	useDelaySvgExport,
	useEditor,
	useSvgExportContext,
} from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

/**
 * Options for {@link useMediaAsset}.
 *
 * @public
 */
export interface UseMediaAssetOptions {
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
export function useMediaAsset({ shapeId, assetId, width }: UseMediaAssetOptions) {
	const editor = useEditor()
	const exportInfo = useSvgExportContext()
	const exportIsReady = useDelaySvgExport()

	const [result, setResult] = useState<{
		asset: TLMediaAsset | null
		url: string | null
	}>(() => ({
		asset: assetId ? (editor.getAsset<TLMediaAsset>(assetId) ?? null) : null,
		url: null as string | null,
	}))

	const didAlreadyResolve = useRef(false)
	const previousAssetId = useRef<TLAssetId | null>(null)
	const shouldRunImmediately = useRef(false)
	const previousUrl = useRef<string | null>(null)

	useEffect(() => {
		const assetIdChanged = previousAssetId.current !== assetId
		previousAssetId.current = assetId

		if (assetIdChanged) {
			shouldRunImmediately.current = true
		}

		if (!assetId) return

		let isCancelled = false
		let cancelDebounceFn: (() => void) | undefined

		const cleanupEffectScheduler = react('update state', () => {
			if (!exportInfo && shapeId && editor.getCulledShapes().has(shapeId)) return

			const asset = editor.getAsset<TLMediaAsset>(assetId)
			if (!asset) {
				setResult((prev) => ({ ...prev, asset: null, url: null }))
				return
			}

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

			const screenScale = exportInfo
				? exportInfo.scale * (width / asset.props.w)
				: editor.getEfficientZoomLevel() * (width / asset.props.w)

			function resolve(asset: TLMediaAsset, url: string | null) {
				if (isCancelled) return
				if (previousUrl.current === url) return
				didAlreadyResolve.current = true
				previousUrl.current = url
				setResult({ asset, url })
				exportIsReady()
			}

			if (didAlreadyResolve.current && !shouldRunImmediately.current) {
				let tick = 0

				const resolveAssetAfterAWhile = () => {
					tick++
					if (tick > 500 / 16) {
						resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) =>
							resolve(asset, url)
						)
						cancelDebounceFn?.()
					}
				}

				cancelDebounceFn?.()
				editor.on('tick', resolveAssetAfterAWhile)
				cancelDebounceFn = () => editor.off('tick', resolveAssetAfterAWhile)
			} else {
				cancelDebounceFn?.()
				resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) =>
					resolve(asset, url)
				)
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
		.then((url) => {
			callback(url)
		})
}
