import { useEffect, useMemo } from 'react'
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

const useLoadFont = (id: string, font: TLTypeFace) => {
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
			})
			.catch((err) => {
				if (cancelled) return
				console.error(err)
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

export function useLoadAssets(assetUrls: TLEditorAssetUrls) {
	const typefaces = useMemo(() => getTypefaces(assetUrls), [assetUrls])

	useLoadFont('tldraw_draw', typefaces.draw)
	useLoadFont('tldraw_serif', typefaces.serif)
	useLoadFont('tldraw_sans', typefaces.sansSerif)
	useLoadFont('tldraw_mono', typefaces.monospace)
}
