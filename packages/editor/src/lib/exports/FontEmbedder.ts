import { assert, bind, compact } from '@tldraw/utils'
import { fetchCache, resourceToDataUrl } from './fetchCache'
import { ParsedFontFace, parseCss, parseCssFontFaces, parseCssFontFamilyValue } from './parseCss'

export const SVG_EXPORT_CLASSNAME = 'tldraw-svg-export'

/**
 * Because SVGs cannot refer to external CSS/font resources, any web fonts used in the SVG must be
 * embedded as data URLs in inlined @font-face declarations. This class is responsible for
 * collecting used font faces and creating a CSS string with embedded fonts that can be used in the
 * SVG.
 *
 * It works in three steps:
 * 1. `startFindingCurrentDocumentFontFaces` - this traverses the current document, finding all the
 *    stylesheets in use (including those imported via `@import` rules etc) and extracting the
 *    @font-face declarations from them.
 * 2. `onFontFamilyValue` - as `StyleEmbedder` traverses the SVG, it will call this method with the
 *    value of the `font-family` property for each element. We parse out the font names in use, and
 *    mark them as needing to be embedded.
 * 3. `createCss` - once all the font families have been collected, this method will return a CSS
 *    string with embedded fonts.
 */
export class FontEmbedder {
	private fontFacesPromise: Promise<ParsedFontFace[]> | null = null
	private readonly foundFontNames = new Set<string>()
	private readonly fontFacesToEmbed = new Set<ParsedFontFace>()
	private readonly pendingPromises: Promise<void>[] = []

	startFindingCurrentDocumentFontFaces() {
		assert(!this.fontFacesPromise, 'FontEmbedder already started')
		this.fontFacesPromise = getCurrentDocumentFontFaces()
	}

	@bind onFontFamilyValue(fontFamilyValue: string) {
		assert(this.fontFacesPromise, 'FontEmbedder not started')

		const fonts = parseCssFontFamilyValue(fontFamilyValue)
		for (const font of fonts) {
			if (this.foundFontNames.has(font)) return
			this.foundFontNames.add(font)

			this.pendingPromises.push(
				this.fontFacesPromise.then((fontFaces) => {
					const relevantFontFaces = fontFaces.filter((fontFace) => fontFace.fontFamilies.has(font))
					for (const fontFace of relevantFontFaces) {
						if (this.fontFacesToEmbed.has(fontFace)) continue

						this.fontFacesToEmbed.add(fontFace)
						for (const url of fontFace.urls) {
							if (!url.resolved || url.embedded) continue
							// kick off fetching this font
							url.embedded = resourceToDataUrl(url.resolved)
						}
					}
				})
			)
		}
	}

	async createCss() {
		await Promise.all(this.pendingPromises)

		let css = ''

		for (const fontFace of this.fontFacesToEmbed) {
			let fontFaceString = `@font-face {${fontFace.fontFace}}`

			for (const url of fontFace.urls) {
				if (!url.embedded) continue
				const dataUrl = await url.embedded
				if (!dataUrl) continue

				fontFaceString = fontFaceString.replace(url.original, dataUrl)
			}

			css += fontFaceString
		}

		return css
	}
}

async function getCurrentDocumentFontFaces() {
	const fontFaces: (ParsedFontFace[] | Promise<ParsedFontFace[] | null>)[] = []

	// In exportToSvg we add the exported node to the DOM temporarily.
	// Because of this, and because we do a setTimeout to delay removing that node from the
	// DOM, when looking at document.styleSheets the number of nodes and stylesheets
	// can grow unbounded (especially when using "Debug svg" and moving shapes around).
	// To avoid this, we filter out the stylesheets that are part of the SVG export.
	const styleSheetsWithoutSvgExports = Array.from(document.styleSheets).filter(
		(styleSheet) =>
			!(styleSheet.ownerNode as HTMLElement | null)?.closest(`.${SVG_EXPORT_CLASSNAME}`)
	)

	for (const styleSheet of styleSheetsWithoutSvgExports) {
		let cssRules
		try {
			cssRules = styleSheet.cssRules
		} catch {
			// some stylesheets don't allow access through the DOM. We'll try to fetch them instead.
		}

		if (cssRules) {
			for (const rule of styleSheet.cssRules) {
				if (rule instanceof CSSFontFaceRule) {
					fontFaces.push(parseCssFontFaces(rule.cssText, styleSheet.href ?? document.baseURI))
				} else if (rule instanceof CSSImportRule) {
					const absoluteUrl = new URL(rule.href, rule.parentStyleSheet?.href ?? document.baseURI)
					fontFaces.push(fetchCssFontFaces(absoluteUrl.href))
				}
			}
		} else if (styleSheet.href) {
			fontFaces.push(fetchCssFontFaces(styleSheet.href))
		}
	}

	return compact(await Promise.all(fontFaces)).flat()
}

const fetchCssFontFaces = fetchCache(async (response: Response): Promise<ParsedFontFace[]> => {
	const parsed = parseCss(await response.text(), response.url)

	const importedFontFaces = await Promise.all(
		parsed.imports.map(({ url }) => fetchCssFontFaces(new URL(url, response.url).href))
	)

	return [...parsed.fontFaces, ...compact(importedFontFaces).flat()]
})
