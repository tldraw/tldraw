/**
 * The brand themes. Each one is a complete restyle of the commenting UI — pins, thread panels,
 * composer, reactions — done entirely in CSS scoped under `[data-comment-theme='<id>']` (see
 * brand-themes.css). The ids here are the single source of truth: the theme picker, the gallery
 * grid, and the exported file names all derive from this list.
 */
export interface BrandTheme {
	id: string
	name: string
	/** One line of positioning, shown under the theme name in the gallery. */
	tagline: string
	/** Whether the theme reads best over a dark backdrop (used for the gallery tile floor). */
	dark?: boolean
}

export const BRAND_THEMES: BrandTheme[] = [
	{ id: 'tldraw', name: 'tldraw', tagline: 'The default, unthemed experience' },
	{ id: 'midnight', name: 'Midnight', tagline: 'Dark, dense, keyboard-first SaaS', dark: true },
	{ id: 'brutalist', name: 'Brutalist', tagline: 'Thick borders and hard offset shadows' },
	{ id: 'glass', name: 'Glass', tagline: 'Frosted translucent panels' },
	{ id: 'terminal', name: 'Terminal', tagline: 'Phosphor green on black, monospace', dark: true },
	{ id: 'candy', name: 'Candy', tagline: 'Pastel pinks, maximum roundness' },
	{ id: 'enterprise', name: 'Enterprise', tagline: 'Buttoned-up corporate blue' },
	{ id: 'editorial', name: 'Editorial', tagline: 'Newsprint serif with hairline rules' },
	{ id: 'sticky', name: 'Sticky note', tagline: 'Paper yellow with a handwritten voice' },
	{ id: 'neon', name: 'Neon', tagline: 'Cyberpunk magenta and cyan glow', dark: true },
	{ id: 'pixel', name: 'Pixel', tagline: '8-bit arcade chrome, zero curves' },
	{ id: 'luxe', name: 'Luxe', tagline: 'Black and gold, wide letter-spacing', dark: true },
	{ id: 'forest', name: 'Forest', tagline: 'Botanical greens, organic shapes' },
	{
		id: 'blueprint',
		name: 'Blueprint',
		tagline: 'Drafting-table blue with dashed lines',
		dark: true,
	},
	{ id: 'comic', name: 'Comic', tagline: 'Speech bubbles with ink outlines' },
	{ id: 'nordic', name: 'Nordic', tagline: 'Airy, muted, quietly minimal' },
	{ id: 'sunset', name: 'Sunset', tagline: 'Vaporwave gradients', dark: true },
	{ id: 'crayon', name: 'Crayon', tagline: 'Primary colors, playroom energy' },
]
