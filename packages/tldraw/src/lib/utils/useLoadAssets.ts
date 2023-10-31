import { useEffect } from 'react'
import { TLEditorAssetUrls } from './assetUrls'
;(window as any).tldraw_fontFacesAreLoaded = false

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

const preloadFont = (id: string, font: TLTypeFace) => {
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

	fontInstance.load()
}

export function useLoadAssets(assetUrls: TLEditorAssetUrls) {
	useEffect(() => {
		Promise.all([
			preloadFont('tldraw_draw', { url: assetUrls.fonts.draw }),
			preloadFont('tldraw_serif', { url: assetUrls.fonts.serif }),
			preloadFont('tldraw_sans', { url: assetUrls.fonts.sansSerif }),
			preloadFont('tldraw_mono', { url: assetUrls.fonts.monospace }),
		]).then(() => {
			;(window as any).tldraw_fontFacesAreLoaded = true
		})
	}, [assetUrls])
}
