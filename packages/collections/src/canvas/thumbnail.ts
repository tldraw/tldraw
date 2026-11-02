import {
	Editor,
	TLContent,
	TLTheme,
	TLThemeColors,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	coreShapes,
	createTLStore,
} from 'tldraw'

// SPIKE: thumbnails that follow the viewer's theme.
//
// The item is exported once, in a throwaway editor whose theme gives every palette colour its own
// placeholder colour. Each placeholder is then swapped for a CSS variable, and the tile sets those
// variables from the viewer's theme and colour mode. Placeholders are one-to-one with palette
// entries, so the swap is exact even where two palette entries share a real colour.

const VARIABLE_PREFIX = '--tlc-'

// Colours labels take from tldraw's CSS rather than the theme palette. The viewer's page sets these
// variables, so the thumbnail points at them instead of at a palette entry.
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
			leaves.push({ variable: `${VARIABLE_PREFIX}${key}`, key })
		} else {
			for (const variant of Object.keys(value)) {
				leaves.push({ variable: `${VARIABLE_PREFIX}${key}-${variant}`, key, variant })
			}
		}
	}
	return leaves
}

function readLeaf(colors: TLThemeColors, { key, variant }: ColorLeaf): string | undefined {
	const value = (colors as Record<string, any>)[key]
	return variant ? value?.[variant] : value
}

// #01xxxx: red is always 1, so a placeholder reads back from computed styles as `rgb(1, g, b)`.
function placeholderHex(index: number) {
	return `#01${index.toString(16).padStart(4, '0')}`
}

function buildPlaceholderTheme(base: TLTheme) {
	const colors: Record<string, any> = {}
	const placeholders = new Map<string, string>()
	getColorLeaves(base.colors.light).forEach((leaf, i) => {
		const hex = placeholderHex(i)
		placeholders.set(hex, leaf.variable)
		if (leaf.variant) (colors[leaf.key] ??= {})[leaf.variant] = hex
		else colors[leaf.key] = hex
	})
	let index = placeholders.size
	for (const name of Object.keys(CSS_COLORS)) {
		placeholders.set(placeholderHex(index++), `${VARIABLE_PREFIX}${name}`)
	}
	const palette = colors as TLThemeColors
	const theme: TLTheme = { ...base, colors: { light: palette, dark: palette } }
	return { theme, placeholders }
}

function replacePlaceholders(svg: string, placeholders: Map<string, string>) {
	return svg
		.replace(/#01[0-9a-f]{4}\b/gi, (hex) => {
			const variable = placeholders.get(hex.toLowerCase())
			return variable ? `var(${variable})` : hex
		})
		.replace(/rgb\(1,\s*(\d+),\s*(\d+)\)/g, (match, g, b) => {
			const hex = `#01${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`
			const variable = placeholders.get(hex)
			return variable ? `var(${variable})` : match
		})
}

/**
 * Exports content as an SVG whose colours are CSS variables, set at display time with
 * {@link getThumbnailColorVariables}.
 */
export async function exportThemedThumbnail(
	hostEditor: Editor,
	content: TLContent
): Promise<Blob | undefined> {
	const { theme, placeholders } = buildPlaceholderTheme(hostEditor.getCurrentTheme())

	const container = document.createElement('div')
	container.className = 'tl-container tl-theme__light'
	Object.assign(container.style, {
		position: 'fixed',
		left: '-10000px',
		top: '0',
		width: '1000px',
		height: '1000px',
		overflow: 'hidden',
		pointerEvents: 'none',
	})
	// Label halos, group outlines, links and highlighted text take their colours from CSS, not the
	// palette. The exported <svg> carries its own theme class, which resets these, so the overrides
	// have to out-rank it. Light mode highlights with a literal colour, not a variable.
	const placeholderFor = (name: string) =>
		[...placeholders].find(([, variable]) => variable === `${VARIABLE_PREFIX}${name}`)?.[0]
	const scope = '.tlui-collections-thumbnail-export'
	const style = document.createElement('style')
	style.textContent = `${scope} .tl-container, ${scope} {
		--tl-color-background: ${placeholderFor('background')} !important;
		--tl-color-text: ${placeholderFor('text')} !important;
		--tl-color-primary: ${placeholderFor('primary')} !important;
	}
	${scope} .tl-rich-text mark {
		background-color: ${placeholderFor('text-highlight')} !important;
	}`
	container.classList.add('tlui-collections-thumbnail-export')
	container.appendChild(style)
	document.body.appendChild(container)

	// The editor adds the core shapes itself and refuses them in the list.
	const shapeUtils = Object.values(hostEditor.shapeUtils)
		.map((util) => util!.constructor as TLAnyShapeUtilConstructor)
		.filter((util) => !coreShapes.some((core) => core.type === util.type))
	const bindingUtils = Object.values(hostEditor.bindingUtils).map(
		(util) => util!.constructor as TLAnyBindingUtilConstructor
	)

	const editor = new Editor({
		store: createTLStore({
			shapeUtils,
			bindingUtils,
			assets: hostEditor.store.props.assets,
			themes: { default: theme },
		}),
		shapeUtils,
		bindingUtils,
		tools: [],
		getContainer: () => container,
		themes: { default: theme },
		// Rich text needs the host's text options to measure and render labels.
		options: hostEditor.options,
		// SPIKE: FontManager keeps the host's font URLs private.
		fontAssetUrls: (hostEditor.fonts as any).assetUrls,
	})

	try {
		editor.putContentOntoCurrentPage(content, { select: false })
		const ids = [...editor.getCurrentPageShapeIds()]
		const result = await editor.getSvgString(ids, { background: false, darkMode: false })
		if (!result) return undefined
		// The tile is inline in a page that already has tldraw's fonts.
		const svg = replacePlaceholders(result.svg.replace(/@font-face\s*\{[^}]*\}/g, ''), placeholders)
		return new Blob([svg], { type: 'image/svg+xml' })
	} finally {
		editor.dispose()
		container.remove()
	}
}

/** The CSS variables a themed thumbnail reads, for the viewer's theme and colour mode. */
export function getThumbnailColorVariables(
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
		variables[`${VARIABLE_PREFIX}${name}`] = `var(${cssVariable})`
	}
	return variables
}
