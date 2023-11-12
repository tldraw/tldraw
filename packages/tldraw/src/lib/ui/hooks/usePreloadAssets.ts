import { useEffect, useMemo, useState } from 'react'
import { TLEditorAssetUrls } from '../../utils/static-assets/assetUrls'

export type TLTypeFace = {
	url: string
	display?: any // FontDisplay
	featureSettings?: string
	stretch?: string
	style?: string
	unicodeRange?: string
	variant?: string
	weight?: string
}

export type TLTypeFaces = {
	draw: TLTypeFace
	monospace: TLTypeFace
	serif: TLTypeFace
	sansSerif: TLTypeFace
}

enum PreloadStatus {
	SUCCESS,
	FAILED,
	WAITING,
}

const usePreloadFont = (id: string, font: TLTypeFace): PreloadStatus => {
	const [state, setState] = useState<PreloadStatus>(PreloadStatus.WAITING)

	useEffect(() => {
		const {
			url,
			style = 'normal',
			weight = '500',
			display,
			featureSettings,
			stretch,
			unicodeRange,
			variant,
		} = font

		let cancelled = false
		setState(PreloadStatus.WAITING)

		const descriptors: FontFaceDescriptors = {
			style,
			weight,
			display,
			featureSettings,
			stretch,
			unicodeRange,
			variant,
		}

		const fontInstance = new FontFace(id, `url(${url})`, descriptors)

		fontInstance
			.load()
			.then(() => {
				if (cancelled) return
				document.fonts.add(fontInstance)
				setState(PreloadStatus.SUCCESS)
			})
			.catch((err) => {
				if (cancelled) return
				console.error(err)
				setState(PreloadStatus.FAILED)
			})

		// @ts-expect-error
		fontInstance.$$_url = url

		// @ts-expect-error
		fontInstance.$$_fontface = `
@font-face {
	font-family: ${fontInstance.family};
	font-stretch: ${fontInstance.stretch};
	font-weight: ${fontInstance.weight};
	font-style: ${fontInstance.style};
	src: url("${url}") format("woff2")
}`

		return () => {
			document.fonts.delete(fontInstance)
			cancelled = true
		}
	}, [id, font])

	return state
}

function getTypefaces(assetUrls: TLEditorAssetUrls) {
	return {
		draw: { url: assetUrls.fonts.draw },
		serif: { url: assetUrls.fonts.serif },
		sansSerif: { url: assetUrls.fonts.sansSerif },
		monospace: { url: assetUrls.fonts.monospace },
	}
}

// todo: Expose this via a public API (prop on <Tldraw>).

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
