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
	console.log(assetUrls.fonts)
	return {
		draw: {
			url: assetUrls.fonts.draw,
			format: assetUrls.fonts.draw.split('.').pop(),
			weight: '611',
			variationSettings: '"ital" 0.26, "INFM" 62, "BNCE" 0, "SPAC" 0',
		},
		drawItalic: {
			url: assetUrls.fonts.draw,
			format: assetUrls.fonts.draw.split('.').pop(),
			weight: '611',
			variationSettings: '"ital" 0.77, "INFM" 62, "BNCE" 0, "SPAC" 0',
		},
		drawBold: {
			url: assetUrls.fonts.draw,
			format: assetUrls.fonts.draw.split('.').pop(),
			weight: '780',
			variationSettings: '"ital" 0.26, "INFM" 62, "BNCE" 0, "SPAC" 0',
		},
		drawBoldItalic: {
			url: assetUrls.fonts.draw,
			format: assetUrls.fonts.draw.split('.').pop(),
			weight: '780',
			variationSettings: '"ital" 0.77, "INFM" 62, "BNCE" 0, "SPAC" 0',
		},
		serif: {
			url: assetUrls.fonts.serif,
			format: assetUrls.fonts.serif.split('.').pop(),
			weight: '600',
		},
		serifItalic: {
			url: assetUrls.fonts.serifItalic,
			format: assetUrls.fonts.serifItalic.split('.').pop(),
			style: 'italic',
			weight: '600',
		},
		serifBold: {
			url: assetUrls.fonts.serifBold,
			format: assetUrls.fonts.serifBold.split('.').pop(),
			weight: '800',
		},
		serifBoldItalic: {
			url: assetUrls.fonts.serifBoldItalic,
			format: assetUrls.fonts.serifBoldItalic.split('.').pop(),
			style: 'italic',
			weight: '800',
		},
		sansSerif: {
			url: assetUrls.fonts.sansSerif,
			format: assetUrls.fonts.sansSerif.split('.').pop(),
			weight: '600',
		},
		sansSerifItalic: {
			url: assetUrls.fonts.sansSerifItalic,
			format: assetUrls.fonts.sansSerifItalic.split('.').pop(),
			style: 'italic',
			weight: '600',
		},
		sansSerifBold: {
			url: assetUrls.fonts.sansSerifBold,
			format: assetUrls.fonts.sansSerifBold.split('.').pop(),
			weight: '800',
		},
		sansSerifBoldItalic: {
			url: assetUrls.fonts.sansSerifBoldItalic,
			format: assetUrls.fonts.sansSerifBoldItalic.split('.').pop(),
			style: 'italic',
			weight: '800',
		},
		monospace: {
			url: assetUrls.fonts.monospace,
			format: assetUrls.fonts.monospace.split('.').pop(),
			weight: '600',
		},
		monospaceItalic: {
			url: assetUrls.fonts.monospaceItalic,
			format: assetUrls.fonts.monospaceItalic.split('.').pop(),
			style: 'italic',
			weight: '600',
		},
		monospaceBold: {
			url: assetUrls.fonts.monospaceBold,
			format: assetUrls.fonts.monospaceBold.split('.').pop(),
			weight: '800',
		},
		monospaceBoldItalic: {
			url: assetUrls.fonts.monospaceBoldItalic,
			format: assetUrls.fonts.monospaceBoldItalic.split('.').pop(),
			style: 'italic',
			weight: '800',
		},
	}
}

/** @public */
export function usePreloadAssets(assetUrls: TLEditorAssetUrls) {
	const typefaces = useMemo(() => getTypefaces(assetUrls), [assetUrls])

	const results = [
		usePreloadFont('tldraw_draw', typefaces.draw),
		usePreloadFont('tldraw_draw', typefaces.drawItalic),
		usePreloadFont('tldraw_draw', typefaces.drawBold),
		usePreloadFont('tldraw_draw', typefaces.drawBoldItalic),
		usePreloadFont('tldraw_serif', typefaces.serif),
		usePreloadFont('tldraw_serif', typefaces.serifItalic),
		usePreloadFont('tldraw_serif', typefaces.serifBold),
		usePreloadFont('tldraw_serif', typefaces.serifBoldItalic),
		usePreloadFont('tldraw_sans', typefaces.sansSerif),
		usePreloadFont('tldraw_sans', typefaces.sansSerifItalic),
		usePreloadFont('tldraw_sans', typefaces.sansSerifBold),
		usePreloadFont('tldraw_sans', typefaces.sansSerifBoldItalic),
		usePreloadFont('tldraw_mono', typefaces.monospace),
		usePreloadFont('tldraw_mono', typefaces.monospaceItalic),
		usePreloadFont('tldraw_mono', typefaces.monospaceBold),
		usePreloadFont('tldraw_mono', typefaces.monospaceBoldItalic),
	]

	return {
		// If any of the results have errored, then preloading has failed
		error: results.some((result) => result === PreloadStatus.FAILED),
		// If any of the results are waiting, then we're not done yet
		done: !results.some((result) => result === PreloadStatus.WAITING),
	}
}
