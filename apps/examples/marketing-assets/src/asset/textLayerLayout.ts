import { TextLayer } from '../api/marketingApi'

/**
 * Resolving a TextLayer into concrete pixels. A TextLayer stores normalized,
 * brand-relative data (ADR-0004): position and size as 0..1 fractions, the font as a
 * role, the scrim as a flag. Everything a renderer needs — pixel positions, the
 * brand-resolved font, wrapped lines, the contrast scrim colour — is computed here
 * once, so the live HTML view and the SVG export are two thin adapters over one
 * layout and cannot drift apart.
 */

/** The brand fields the layout needs: how each font role resolves to a typeface. */
export interface BrandFonts {
	headingFont: string
	bodyFont: string
}

/** A TextLayer resolved against a frame and brand, in pixels. */
export interface TextLayerLayout {
	x: number
	y: number
	width: number
	fontFamily: string
	fontSize: number
	fontWeight: 400 | 700
	color: string
	align: 'left' | 'center' | 'right'
	/** Line height in pixels. */
	lineHeight: number
	/** Greedy-wrapped lines, for renderers without native wrapping (the SVG export). */
	lines: string[]
	/** Where the text anchor sits horizontally, given the alignment. */
	anchorX: number
	anchor: 'start' | 'middle' | 'end'
	/** The contrast panel behind the text, or null when the layer has none. */
	scrim: { color: string; height: number } | null
}

const LINE_HEIGHT = 1.15

/** Resolve a text layer against the asset frame's pixel size and the brand's fonts. */
export function layoutTextLayer(
	layer: TextLayer,
	frame: { w: number; h: number },
	fonts: BrandFonts
): TextLayerLayout {
	const font = layer.fontRole === 'heading' ? fonts.headingFont : fonts.bodyFont
	const fontSize = layer.fontSize * frame.h
	const lineHeight = fontSize * LINE_HEIGHT
	const x = layer.x * frame.w
	const width = layer.width * frame.w
	const lines = wrapText(layer.text, width, fontSize)
	const anchor = layer.align === 'left' ? 'start' : layer.align === 'right' ? 'end' : 'middle'
	const anchorX = layer.align === 'left' ? x : layer.align === 'right' ? x + width : x + width / 2

	return {
		x,
		y: layer.y * frame.h,
		width,
		fontFamily: `'${font}', sans-serif`,
		fontSize,
		fontWeight: layer.weight === 'bold' ? 700 : 400,
		color: layer.color,
		align: layer.align,
		lineHeight,
		lines,
		anchorX,
		anchor,
		scrim: layer.scrim
			? {
					color: scrimColor(layer.color),
					height: lines.length * lineHeight + fontSize * 0.3,
				}
			: null,
	}
}

/** A contrast panel colour chosen from the text's brightness. */
function scrimColor(hex: string): string {
	return luminance(hex) > 0.6 ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.65)'
}

function luminance(hex: string): number {
	const c = hex.replace('#', '')
	if (c.length < 6) return 1
	const r = parseInt(c.slice(0, 2), 16) / 255
	const g = parseInt(c.slice(2, 4), 16) / 255
	const b = parseInt(c.slice(4, 6), 16) / 255
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Greedy word-wrap by estimated character width (the live HTML wraps natively). */
function wrapText(text: string, boxWidth: number, fontSize: number): string[] {
	const maxChars = Math.max(1, Math.floor(boxWidth / (fontSize * 0.5)))
	const out: string[] = []
	for (const para of text.split('\n')) {
		const words = para.split(/\s+/).filter(Boolean)
		if (!words.length) {
			out.push('')
			continue
		}
		let line = ''
		for (const word of words) {
			const candidate = line ? `${line} ${word}` : word
			if (candidate.length > maxChars && line) {
				out.push(line)
				line = word
			} else {
				line = candidate
			}
		}
		if (line) out.push(line)
	}
	return out
}
