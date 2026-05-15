import { DEFAULT_THEME, TLDefaultColor, TLTheme, TLThemes, TLUiOverrides, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1] Declare the custom color slots on the theme's default-colors interface so
// `<Tldraw themes={...}>` accepts them in the palette type.
declare module '@tldraw/tlschema' {
	interface TLThemeDefaultColors {
		'custom-1': TLDefaultColor
		'custom-2': TLDefaultColor
		'custom-3': TLDefaultColor
		'custom-4': TLDefaultColor
		'custom-5': TLDefaultColor
		'custom-6': TLDefaultColor
		'custom-7': TLDefaultColor
		'custom-8': TLDefaultColor
		'custom-9': TLDefaultColor
		'custom-10': TLDefaultColor
		'custom-11': TLDefaultColor
		'custom-12': TLDefaultColor
	}
}

// [2] Fan a hex onto every role in TLDefaultColor. The theme renderer reads
// different roles for different contexts (outline vs fill vs note background);
// we use the picked hex for all of them plus a translucent variant for the
// semi fills.
function makeColor(solid: string): TLDefaultColor {
	const translucent = solid + '33'
	return {
		solid,
		semi: translucent,
		pattern: solid,
		fill: solid,
		linedFill: translucent,
		frameHeadingStroke: solid,
		frameHeadingFill: translucent,
		frameStroke: solid,
		frameFill: translucent,
		frameText: solid,
		noteFill: translucent,
		noteText: solid,
		highlightSrgb: solid,
		highlightP3: solid,
	}
}

const CUSTOM_HEXES = [
	'#332233',
	'#554466',
	'#996688',
	'#cc9988',
	'#cc9966',
	'#aa6677',
	'#776677',
	'#aa9988',
	'#ddcc99',
	'#88aa77',
	'#667788',
	'#88aa99',
] as const

const customColors = Object.fromEntries(
	CUSTOM_HEXES.map((hex, i) => [`custom-${i + 1}`, makeColor(hex)])
) as Record<`custom-${number}`, TLDefaultColor>

// [3] Build a theme with the default palette plus the extra slots.
const theme: TLTheme = {
	...DEFAULT_THEME,
	id: 'default',
	colors: {
		light: { ...DEFAULT_THEME.colors.light, ...customColors },
		dark: { ...DEFAULT_THEME.colors.dark, ...customColors },
	},
}

const themes: Partial<TLThemes> = { default: theme }

// [4] Human-readable names in the style-panel tooltip.
const uiOverrides: TLUiOverrides = {
	translations: {
		en: Object.fromEntries(
			CUSTOM_HEXES.map((_, i) => [`color-style.custom-${i + 1}`, `Custom ${i + 1}`])
		),
	},
}

export default function ColorPaletteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="color-palette-example" themes={themes} overrides={uiOverrides} />
		</div>
	)
}

/*

[1]
Module augmentation extends `TLThemeDefaultColors` with the extra slot names so
TypeScript will accept them inside the `themes` prop and as values on shape
`color` props.

[2]
A `TLDefaultColor` is more than a single hex — it has separate fields for
solid strokes, semi-transparent fills, note backgrounds, frame chrome, and
highlights. The helper here uses one hex for every solid role and a
translucent variant for the semi/fill roles. For brand colors you'd typically
hand-tune each role.

[3]
We extend the default palette rather than replacing it, so the built-in
colors still appear above the custom ones in the style panel.

[4]
Without translation overrides the style-panel tooltip would show the raw key
(`color-style.custom-1`). The overrides give each slot a label.

With more than 12 colors in the palette, the style panel's color grid
becomes scrollable and the divider below the opacity slider becomes a resize
handle — drag it to grow the grid, double-click to reset.

*/
