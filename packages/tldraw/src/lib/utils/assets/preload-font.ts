/** @public */
export interface TLTypeFace {
	url: string
	display?: any // FontDisplay
	featureSettings?: string
	stretch?: string
	style?: string
	unicodeRange?: string
	variationSettings?: string
	weight?: string
	format?: string
}

/** @public */
export async function preloadFont(id: string, font: TLTypeFace) {
	const {
		url,
		style = 'normal',
		weight = '500',
		display,
		featureSettings,
		stretch,
		unicodeRange,
		variationSettings,
		format,
	} = font

	const descriptors: FontFaceDescriptors = {
		style,
		weight,
		display,
		featureSettings,
		stretch,
		unicodeRange,
		// @ts-expect-error why is this here
		variationSettings,
	}

	const fontInstance = new FontFace(id, `url(${url})`, descriptors)
	await fontInstance.load()
	document.fonts.add(fontInstance)

	// @ts-expect-error
	fontInstance.$$_url = url

	// @ts-expect-error
	fontInstance.$$_fontface = `
@font-face {
	font-family: ${fontInstance.family};
	font-stretch: ${fontInstance.stretch};
	font-weight: ${fontInstance.weight};
	font-style: ${fontInstance.style};
	src: url("${url}") format("${format}")
}`

	return fontInstance
}
