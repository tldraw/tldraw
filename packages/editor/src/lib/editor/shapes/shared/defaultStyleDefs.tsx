import {
	DefaultFontFamilies,
	DefaultFontStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	TLDefaultFontStyle,
} from '@tldraw/tlschema'
import { SvgExportDef } from './SvgExportContext'

/** @public */
export function getFontDefForExport(fontStyle: TLDefaultFontStyle): SvgExportDef {
	return {
		uniqueId: `${DefaultFontStyle.id}:${fontStyle}`,
		getElement: async () => {
			const font = findFont(fontStyle)
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
	}
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

/** @public */
export function getFillDefForExport(
	fill: TLDefaultFillStyle,
	theme: TLDefaultColorTheme
): SvgExportDef {
	return {
		uniqueId: `${DefaultFontStyle.id}:${fill}`,
		getElement: async () => {
			if (fill !== 'pattern') return null

			const t = 8 / 12
			const divEl = document.createElement('div')
			divEl.innerHTML = `
				<svg>
					<defs>
						<mask id="hash_pattern_mask">
							<rect x="0" y="0" width="8" height="8" fill="white" />
							<g
								strokeLinecap="round"
								stroke="black"
							>
								<line x1="${t * 1}" y1="${t * 3}" x2="${t * 3}" y2="${t * 1}" />
								<line x1="${t * 5}" y1="${t * 7}" x2="${t * 7}" y2="${t * 5}" />
								<line x1="${t * 9}" y1="${t * 11}" x2="${t * 11}" y2="${t * 9}" />
							</g>
						</mask>
						<pattern
							id="hash_pattern"
							width="8"
							height="8"
							patternUnits="userSpaceOnUse"
						>
							<rect x="0" y="0" width="8" height="8" fill="${theme.solid}" mask="url(#hash_pattern_mask)" />
						</pattern>
					</defs>
				</svg>
			`
			return Array.from(divEl.querySelectorAll('defs > *'))
		},
	}
}
