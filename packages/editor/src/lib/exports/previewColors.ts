import { TLTheme, TLThemeColors } from '@tldraw/tlschema'
import { uniqueId } from '@tldraw/utils'
import type { Editor } from '../editor/Editor'

const PREFIX = '--tl-preview-'

// Colours labels take from tldraw's CSS rather than from the theme. A preview points at the
// viewer's own values for these.
const CSS_COLORS = {
	primary: '--tl-color-primary', // links
	'text-highlight': '--tl-color-text-highlight', // highlighted text
} as const

interface ColorLeaf {
	variable: string
	key: string
	variant?: string
}

function getColorLeaves(colors: TLThemeColors): ColorLeaf[] {
	const leaves: ColorLeaf[] = []
	for (const [key, value] of Object.entries(colors)) {
		if (typeof value === 'string') {
			leaves.push({ variable: `${PREFIX}${key}`, key })
		} else {
			for (const variant of Object.keys(value)) {
				leaves.push({ variable: `${PREFIX}${key}-${variant}`, key, variant })
			}
		}
	}
	return leaves
}

function readLeaf(colors: TLThemeColors, { key, variant }: ColorLeaf): string | undefined {
	const value = (colors as Record<string, any>)[key]
	return variant ? value?.[variant] : value
}

// Red is always 1, so a placeholder reads back from computed styles as `rgb(1, g, b)`. No palette
// is expected to use these exact colours.
function placeholderHex(index: number) {
	return `#01${index.toString(16).padStart(4, '0')}`
}

/** @internal */
export interface PreviewColors {
	/** The theme to export with: every colour is a unique placeholder. */
	theme: TLTheme
	/** CSS variables for the export's root, so labels' CSS colours become placeholders too. */
	rootStyle: Record<string, string>
	/** A class for the export's root, which `css` is scoped to. */
	className: string
	/** Rules that only apply while the export is rendered, before label styles are inlined. */
	css: string
	/** Swaps every placeholder in the exported SVG for its variable, with the real colour as fallback. */
	replacePlaceholders(svg: Element): void
}

/** @internal */
export function createPreviewColors(editor: Editor, colorMode: 'light' | 'dark'): PreviewColors {
	const base = editor.getCurrentTheme()
	const realColors = base.colors[colorMode]
	const containerStyle = getComputedStyle(editor.getContainer())

	const replacements = new Map<string, string>()
	const palette: Record<string, any> = {}
	const placeholderFor: Record<string, string> = {}
	let index = 0
	for (const leaf of getColorLeaves(realColors)) {
		const hex = placeholderHex(index++)
		const fallback = readLeaf(realColors, leaf)
		replacements.set(hex, fallback ? `var(${leaf.variable}, ${fallback})` : `var(${leaf.variable})`)
		placeholderFor[leaf.variable] = hex
		if (leaf.variant) (palette[leaf.key] ??= {})[leaf.variant] = hex
		else palette[leaf.key] = hex
	}
	for (const [name, cssVariable] of Object.entries(CSS_COLORS)) {
		const hex = placeholderHex(index++)
		const variable = `${PREFIX}${name}`
		const fallback = containerStyle.getPropertyValue(cssVariable).trim()
		replacements.set(hex, fallback ? `var(${variable}, ${fallback})` : `var(${variable})`)
		placeholderFor[variable] = hex
	}

	const colors = palette as TLThemeColors
	const className = `tl-preview-${uniqueId()}`
	const replace = (value: string) =>
		value
			.replace(/#01[0-9a-f]{4}\b/gi, (hex) => replacements.get(hex.toLowerCase()) ?? hex)
			.replace(/rgb\(1,\s*(\d+),\s*(\d+)\)/g, (match, g, b) => {
				const hex = `#01${hex2(g)}${hex2(b)}`
				return replacements.get(hex) ?? match
			})

	return {
		theme: { ...base, colors: { light: colors, dark: colors } },
		rootStyle: {
			'--tl-color-text': placeholderFor[`${PREFIX}text`],
			'--tl-color-background': placeholderFor[`${PREFIX}background`],
			'--tl-color-primary': placeholderFor[`${PREFIX}primary`],
			'--tl-color-text-highlight': placeholderFor[`${PREFIX}text-highlight`],
		},
		className,
		// Light mode highlights text with a literal colour rather than a variable.
		css: `.${className} .tl-rich-text mark { background-color: ${placeholderFor[`${PREFIX}text-highlight`]} !important; }`,
		replacePlaceholders(svg) {
			for (const el of [svg, ...svg.querySelectorAll('*')]) {
				for (const attr of [...el.attributes]) {
					const next = replace(attr.value)
					if (next !== attr.value) el.setAttribute(attr.name, next)
				}
				if (el.localName === 'style' && el.textContent) el.textContent = replace(el.textContent)
			}
		},
	}
}

function hex2(n: string) {
	return Number(n).toString(16).padStart(2, '0')
}

/**
 * The CSS variables a preview export reads, for the viewer's theme and colour mode. Set them on an
 * element that contains the inlined preview.
 *
 * @example
 * ```tsx
 * const style = getPreviewColorVariables(editor.getCurrentTheme(), editor.getColorMode())
 * <div style={style} dangerouslySetInnerHTML={{ __html: sanitizedPreviewSvg }} />
 * ```
 *
 * @public
 */
export function getPreviewColorVariables(
	theme: TLTheme,
	colorMode: 'light' | 'dark'
): Record<string, string> {
	const colors = theme.colors[colorMode]
	const variables: Record<string, string> = {}
	for (const leaf of getColorLeaves(colors)) {
		const value = readLeaf(colors, leaf)
		if (value) variables[leaf.variable] = value
	}
	for (const [name, cssVariable] of Object.entries(CSS_COLORS)) {
		variables[`${PREFIX}${name}`] = `var(${cssVariable})`
	}
	return variables
}
