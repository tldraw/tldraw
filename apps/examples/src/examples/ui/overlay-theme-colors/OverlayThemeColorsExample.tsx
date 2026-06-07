import { DEFAULT_THEME, TLTheme, TLThemes, Tldraw, structuredClone } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const OVERLAY_COLORS_LIGHT = {
	brushFill: 'rgba(236, 72, 153, 0.15)',
	brushStroke: 'rgba(236, 72, 153, 0.6)',
	selectionFill: 'rgba(236, 72, 153, 0.05)',
	selectionStroke: 'rgb(236, 72, 153)',
	selectedContrast: '#ffffff',
	snap: 'rgb(236, 72, 153)',
	laser: 'rgb(236, 72, 153)',
}

const OVERLAY_COLORS_DARK = {
	brushFill: 'rgba(236, 72, 153, 0.2)',
	brushStroke: 'rgba(236, 72, 153, 0.6)',
	selectionFill: 'rgba(236, 72, 153, 0.1)',
	selectionStroke: 'rgb(236, 72, 153)',
	selectedContrast: '#ffffff',
	snap: 'rgb(236, 72, 153)',
	laser: 'rgb(236, 72, 153)',
}

// [2]
const magentaTheme: TLTheme = structuredClone(DEFAULT_THEME)
Object.assign(magentaTheme.colors.light, OVERLAY_COLORS_LIGHT)
Object.assign(magentaTheme.colors.dark, OVERLAY_COLORS_DARK)

const themes: Partial<TLThemes> = { default: magentaTheme }

export default function OverlayThemeColorsExample() {
	return (
		<div className="tldraw__editor">
			{/* [3] */}
			<Tldraw persistenceKey="overlay-theme-colors-example" themes={themes} />
		</div>
	)
}

/*
Canvas overlays read their colors from the active theme. This lets you restyle
the brush, selection outline, snap indicators, laser pointer, and handle
contrast color in one place — no need to subclass every built-in overlay util.

The overlay-related keys on `TLThemeColors` are:

- `brushFill`, `brushStroke` — the drag-select rectangle.
- `selectionFill`, `selectionStroke` — the selection bounding box.
- `selectedContrast` — handle fill color against the selection stroke.
- `snap` — snap indicator lines.
- `laser` — laser pointer trail color.

Try drag-selecting (brush), selecting a shape (selection + handles), drawing
with the laser tool, or moving a shape next to another (snap lines).

[1]
Define the overlay-related color overrides. `TLThemeColors` contains many more
keys — shape palette colors (`red`, `blue`, …), text, background, cursor —
that we want to leave alone.

[2]
Clone `DEFAULT_THEME` and merge only the overlay overrides into the `light` and
`dark` palettes. The shape palette and UI chrome stay as-is.

[3]
Pass the modified theme under the `default` key. `<Tldraw>` registers it at
mount time — no module augmentation needed because we're updating the
already-registered `default` theme rather than adding a new named theme.
*/
