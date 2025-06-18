import { safeParseUrl } from '@tldraw/utils'

export interface ParsedFontFace {
	fontFace: string
	urls: { original: string; resolved: string | null; embedded?: Promise<string | null> }[]
	fontFamilies: Set<string>
}

// parsing CSS with regular expressions doesn't really work. There are almost certainly edge cases
// in the regular expressions we're using here. They're based formal grammars of CSS, but aren't
// perfect. These were written with https://regexper.com/ - give it a go if you're editing these.

// The regexes themselves would be nicer to work with if we were using named capturing groups
// (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group).
// We use a lot of disjunctions (the `|`) to cover different syntaxes though, and at the time of
// writing, browser support for using named capturing groups across disjunctions is rough.

// Parse @import declarations:
// https://developer.mozilla.org/en-US/docs/Web/CSS/@import#formal_syntax
const importsRegex =
	/@import\s+(?:"([^"]+)"|'([^']+)'|url\s*\(\s*(?:"([^"]+)"|'([^']+)'|([^'")]+))\s*\))([^;]+);/gi

// Locate @font-face declarations:
const fontFaceRegex = /@font-face\s*{([^}]+)}/gi

// Parse url() calls within a CSS value:
// https://developer.mozilla.org/en-US/docs/Web/CSS/url#syntax
const urlsRegex = /url\s*\(\s*(?:"([^"]+)"|'([^']+)'|([^'")]+))\s*\)/gi

// Locate and parse the value of `font-family` within a @font-face declaration:
// https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-family#formal_syntax
const fontFamilyRegex =
	/(?:^|;)\s*font-family\s*:\s*(?:([^'"][^;\n]+)|"([^"]+)"|'([^']+)')\s*(?:;|$)/gi

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
	// https://developer.mozilla.org/en-US/docs/Web/CSS/font-family#formal_syntax
	// we use two regexes here to parse each value in a comma separated list of font families
	const valueRegex = /\s*(?:([^'"][^;\n\s,]+)|"([^"]+)"|'([^']+)')\s*/gi
	const separatorRegex = /\s*,\s*/gi

	const fontFamilies = new Set<string>()

	while (true) {
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
	if (property === 'pointer-events') return false
	if (property === 'user-select') return false
	if (property === 'touch-action') return false
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
