import { safeParseUrl } from '@tldraw/utils'

export interface ParsedFontFace {
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

export function parseCssImports(css: string) {
	return Array.from(css.matchAll(importsRegex), (m) => ({
		url: m[1] || m[2] || m[3] || m[4] || m[5],
		extras: m[6],
	}))
}

export function parseCssFontFaces(css: string, baseUrl: string) {
	return Array.from(css.matchAll(fontFaceRegex), (m): ParsedFontFace => {
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

export function shouldIncludeCssProperty(property: string) {
	if (property.startsWith('-')) return false
	if (property.startsWith('animation')) return false
	if (property.startsWith('transition')) return false
	if (property === 'cursor') return false
	return true
}

export function parseCss(css: string, baseUrl: string) {
	return {
		imports: parseCssImports(css),
		fontFaces: parseCssFontFaces(css, baseUrl),
	}
}

export function parseCssValueUrls(value: string) {
	return Array.from(value.matchAll(urlsRegex), (m) => ({
		original: m[0],
		url: m[1] || m[2] || m[3],
	}))
}
