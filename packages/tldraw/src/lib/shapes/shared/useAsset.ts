import {
	MediaHelpers,
	TLAssetId,
	TLImageShape,
	TLShapeId,
	TLVideoShape,
	useEditor,
	useReactor,
} from '@tldraw/editor'
import { useRef, useState } from 'react'

function useScalableAsset(shapeId: TLShapeId, assetId: TLAssetId | null) {
	const editor = useEditor()
	const asset = assetId ? editor.getAsset(assetId) : null

	// The resolved url of the asset that should be used by the shape (duplicated as a ref)
	const [state, setState] = useState<{ url: string | null; isAnimated: boolean }>({
		url: null,
		isAnimated: false,
	})

	const rPrevUrl = useRef(state.url)
	// The previous screen scale at which we requested a new url
	const rPrevScreenScale = useRef(0)
	// A timeout we can clear if we need to request a new url
	const rTimeout = useRef<any>(-1)

	useReactor(
		'update url',
		() => {
			const shape = editor.getShape<TLImageShape | TLVideoShape>(shapeId)
			if (!shape) return

			const asset = assetId ? editor.getAsset(assetId) : null
			if (!asset) return

			if (editor.getCulledShapes().has(shapeId)) return

			const screenScale =
				editor.getZoomLevel() * ('w' in asset.props ? shape.props.w / asset.props.w : 1)

			// If the prev scale is zero (which is impossible), set it to the current
			// screen scale and immediately request a new resolved url.
			if (!rPrevScreenScale.current) {
				rPrevScreenScale.current = screenScale
				editor
					.resolveAssetUrl(assetId, {
						screenScale,
					})
					.then((resolvedUrl) => {
						rPrevUrl.current = resolvedUrl
						setState({
							url: resolvedUrl,
							isAnimated:
								('mimeType' in asset.props &&
									MediaHelpers.isAnimatedImageType(asset?.props.mimeType)) ||
								('isAnimated' in asset.props && asset.props.isAnimated),
						})
					})
				return
			}
			// If the camera is still moving, don't get a new url
			if (editor.getCameraState() !== 'idle') return

			// If the editor is not in the idle state (ie if it is resizing) don't get a new url
			if (!editor.isIn('select.idle')) return

			// If the current screen scale is the same as it was last time we got a new url,
			// then we don't need to ask for a new one.
			if (rPrevScreenScale.current === screenScale) return
			rPrevScreenScale.current = screenScale

			// Clear any previous timers and set a new one. If we make it here again before the
			// request is completed, we will clear this timer and set a new one. There's a chance
			// that the timeout is cancelled after the timeout runs but before the promise resolves,
			// but we'll just ignore that case (maybe a cancellable promise would be the solution).
			clearTimeout(rTimeout.current)
			rTimeout.current = editor.timers.setTimeout(() => {
				editor
					.resolveAssetUrl(assetId, {
						screenScale,
					})
					.then((resolvedUrl) => {
						console.log(resolvedUrl)
						// If the new url is the same as the old one, don't update
						if (rPrevUrl.current === resolvedUrl) {
							return
						}
						// Update the url for the asset
						rPrevUrl.current = resolvedUrl
						setState((s) => ({ ...s, url: resolvedUrl }))
					})
			}, 500)
		},
		[editor, assetId]
	)

	return { asset, ...state }
}

/** @internal */
export const useImageAsset = useScalableAsset

/** @internal */
export const useVideoAsset = useScalableAsset
