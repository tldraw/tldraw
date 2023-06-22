import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/** @public */
export const DefaultFontStyle = StyleProp.defineEnum('tldraw:font', {
	values: ['draw', 'sans', 'serif', 'mono'],
	defaultValue: 'draw',
	async getSvgExportDefs(fontName) {
		const font = findFont(fontName)
		if (!font) return null

		const url = (font as any).$$_url
		const fontFaceRule = (font as any).$$_fontface
		if (!url || !fontFaceRule) return null

		const fontFile = await (await fetch(url)).blob()
		const base64FontFile = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = reject
			reader.readAsDataURL(fontFile)
		})

		const newFontFaceRule = fontFaceRule.replace(url, base64FontFile)
		const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
		style.textContent = newFontFaceRule
		return style
	},
})

/** @public */
export type TLDefaultFontStyle = T.TypeOf<typeof DefaultFontStyle>

/** @public */
export const DefaultFontFamilies = {
	draw: "'tldraw_draw', sans-serif",
	sans: "'tldraw_sans', sans-serif",
	serif: "'tldraw_serif', serif",
	mono: "'tldraw_mono', monospace",
}

function findFont(name: TLDefaultFontStyle): FontFace | null {
	const fontFamily = DefaultFontFamilies[name]
	for (const font of document.fonts) {
		if (fontFamily.includes(font.family)) {
			return font
		}
	}
	return null
}
