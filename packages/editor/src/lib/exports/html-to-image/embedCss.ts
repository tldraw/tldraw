import { bind, compact, safeParseUrl } from '@tldraw/utils'
import { fetchCache, resourceToDataUrl } from './fetchCache'

interface FontFace {
	fontFace: string
	urls: { original: string; resolved: string | null; embedded?: Promise<string | null> }[]
	fontFamilies: Set<string>
}

const importsRegex =
	/@import\s+(?:"([^"]+)"|'([^']+)'|url\s*\(\s*(?:"([^"]+)"|'([^']+)'|([^'")]+))\s*\))([^;]+);/gi
const fontFaceRegex = /@font-face\s*{([^}]+)}/gi
const urlsRegex = /url\s*\(\s*(?:"([^"]+)"|'([^']+)'|([^'")]+))\s*\)/gi
const fontFamilyRegex =
	/(?:^|;)\s*font-family:\s*(?:([^'"][^;\n]+)|"([^"]+)"|'([^']+)')\s*(?:;|$)/gi

function parseCssImports(css: string) {
	return Array.from(css.matchAll(importsRegex), (m) => ({
		url: m[1] || m[2] || m[3] || m[4] || m[5],
		extras: m[6],
	}))
}

function parseCssFontFaces(css: string, baseUrl: string) {
	return Array.from(css.matchAll(fontFaceRegex), (m): FontFace => {
		const fontFace = m[1]
		const urls = Array.from(fontFace.matchAll(urlsRegex), (m) => {
			const original = m[1] || m[2] || m[3]
			return {
				original,
				resolved: safeParseUrl(original, baseUrl)?.href ?? null,
			}
		})
		const fontFamilies = new Set(
			Array.from(fontFace.matchAll(fontFamilyRegex), (m) => (m[1] || m[2] || m[3]).toLowerCase())
		)

		return { fontFace, urls, fontFamilies }
	})
}

export function parseCssFontFamilyValue(value: string) {
	const valueRegex = /\s*(?:([^'"][^;\n\s,]+)|"([^"]+)"|'([^']+)')\s*/gi
	const separatorRegex = /\s*,\s*/gi

	const fontFamilies = new Set<string>()

	for (;;) {
		const valueMatch = valueRegex.exec(value)
		if (!valueMatch) {
			break
		}

		const fontFamily = valueMatch[1] || valueMatch[2] || valueMatch[3]
		fontFamilies.add(fontFamily.toLowerCase())

		separatorRegex.lastIndex = valueRegex.lastIndex
		const separatorMatch = separatorRegex.exec(value)
		if (!separatorMatch) {
			break
		}

		valueRegex.lastIndex = separatorRegex.lastIndex
	}

	return fontFamilies
}

export function parseCss(css: string, baseUrl: string) {
	return {
		imports: parseCssImports(css),
		fontFaces: parseCssFontFaces(css, baseUrl),
	}
}

export function embedCssValueUrlsIfNeeded(cssValue: string): undefined | Promise<string> {
	const urlMatches = Array.from(cssValue.matchAll(urlsRegex), (m) => ({
		original: m[0],
		url: m[1] || m[2] || m[3],
	}))
	if (urlMatches.length === 0) return

	return (async () => {
		await Promise.all(
			urlMatches.map(async ({ url, original }) => {
				const dataUrl = (await resourceToDataUrl(url)) ?? 'data:'
				cssValue = cssValue.replace(original, `url("${dataUrl}")`)
			})
		)

		return cssValue
	})()
}

const fetchCssFontFaces = fetchCache(async (response: Response): Promise<FontFace[]> => {
	const parsed = parseCss(await response.text(), response.url)

	const importedFontFaces = await Promise.all(
		parsed.imports.map(({ url }) => fetchCssFontFaces(new URL(url, response.url).href))
	)

	return [...parsed.fontFaces, ...compact(importedFontFaces).flat()]
})

export async function getCurrentDocumentFontFaces() {
	const fontFaces: (FontFace[] | Promise<FontFace[] | null>)[] = []

	for (const styleSheet of document.styleSheets) {
		let cssRules
		try {
			cssRules = styleSheet.cssRules
		} catch (err) {
			// some stylesheets don't allow access through the DOM. We'll try to fetch them instead.
		}

		if (cssRules) {
			for (const rule of styleSheet.cssRules) {
				if (rule instanceof CSSFontFaceRule) {
					fontFaces.push(parseCssFontFaces(rule.cssText, styleSheet.href ?? document.baseURI))
				} else if (rule instanceof CSSImportRule) {
					fontFaces.push(fetchCssFontFaces(rule.href))
				}
			}
		} else if (styleSheet.href) {
			fontFaces.push(fetchCssFontFaces(styleSheet.href))
		}
	}

	return compact(await Promise.all(fontFaces)).flat()
}

export class FontEmbedder {
	fontFacesPromise = getCurrentDocumentFontFaces()
	foundFontNames = new Set<string>()
	fontFacesToEmbed = new Set<FontFace>()

	@bind onFoundUsedFont(font: string) {
		if (this.foundFontNames.has(font)) return
		this.foundFontNames.add(font)

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
	}

	async createCss() {
		await this.fontFacesPromise

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
