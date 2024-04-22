import { useEffect, useMemo, useState } from 'react'
import { TLTypeFace, preloadFont } from '../../utils/assets/preload-font'
import { TLEditorAssetUrls } from '../../utils/static-assets/assetUrls'

enum PreloadStatus {
	SUCCESS,
	FAILED,
	WAITING,
}

const usePreloadFont = (id: string, font: TLTypeFace): PreloadStatus => {
	const [state, setState] = useState<PreloadStatus>(PreloadStatus.WAITING)

	useEffect(() => {
		let cancelled = false

		setState(PreloadStatus.WAITING)

		preloadFont(id, font)
			.then(() => {
				if (cancelled) return
				setState(PreloadStatus.SUCCESS)
			})
			.catch((err: any) => {
				if (cancelled) return
				console.error(err)
				setState(PreloadStatus.FAILED)
			})

		return () => {
			cancelled = true
		}
	}, [id, font])

	return state
}

function getTypefaces(assetUrls: TLEditorAssetUrls) {
	return {
		draw: {
			url: assetUrls.fonts.draw,
			format: assetUrls.fonts.draw.split('.').pop(),
		},
		serif: {
			url: assetUrls.fonts.serif,
			format: assetUrls.fonts.serif.split('.').pop(),
		},
		sansSerif: {
			url: assetUrls.fonts.sansSerif,
			format: assetUrls.fonts.sansSerif.split('.').pop(),
		},
		monospace: {
			url: assetUrls.fonts.monospace,
			format: assetUrls.fonts.monospace.split('.').pop(),
		},
	}
}

/** @public */
export function usePreloadAssets(assetUrls: TLEditorAssetUrls) {
	const typefaces = useMemo(() => getTypefaces(assetUrls), [assetUrls])

	const results = [
		usePreloadFont('tldraw_draw', typefaces.draw),
		usePreloadFont('tldraw_serif', typefaces.serif),
		usePreloadFont('tldraw_sans', typefaces.sansSerif),
		usePreloadFont('tldraw_mono', typefaces.monospace),
	]

	return {
		// If any of the results have errored, then preloading has failed
		error: results.some((result) => result === PreloadStatus.FAILED),
		// If any of the results are waiting, then we're not done yet
		done: !results.some((result) => result === PreloadStatus.WAITING),
	}
}
