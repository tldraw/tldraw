/**
 * v4 → v5 CSS/SCSS/LESS flags. v5 stops sourcing overlay colors from CSS
 * variables — they now come from `TLTheme`. The selectors themselves are
 * unused because overlays render to `CanvasRenderingContext2D`.
 */

import type { Flag } from '../../lib/types'

export const v4ToV5CssFlags: Flag[] = [
	{
		kind: 'flag',
		id: 'css-var-color-snap',
		name: 'CSS variable --tl-color-snap removed',
		pattern: /--tl-color-snap\b/g,
		scope: 'css',
		note:
			'CSS variable removed. Snap colors now come from `TLTheme.colors[mode].snap`. Customize via `SnapIndicatorOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-var-color-brush-fill',
		name: 'CSS variable --tl-color-brush-fill removed',
		pattern: /--tl-color-brush-fill\b/g,
		scope: 'css',
		note:
			'CSS variable removed. Brush fill comes from `TLTheme.colors[mode].brushFill`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-var-color-brush-stroke',
		name: 'CSS variable --tl-color-brush-stroke removed',
		pattern: /--tl-color-brush-stroke\b/g,
		scope: 'css',
		note:
			'CSS variable removed. Brush stroke comes from `TLTheme.colors[mode].brushStroke`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-var-color-laser',
		name: 'CSS variable --tl-color-laser removed',
		pattern: /--tl-color-laser\b/g,
		scope: 'css',
		note: 'CSS variable removed. Laser color comes from `TLTheme.colors[mode].laser`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-var-overlays-custom',
		name: 'CSS variable --tl-layer-overlays-custom removed',
		pattern: /--tl-layer-overlays-custom\b/g,
		scope: 'css',
		note: 'CSS variable removed. Use `TLTheme` entries or `OverlayUtil.render()` for overlay colors.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-brush',
		name: 'CSS selector .tl-brush removed',
		pattern: /\.tl-brush\b/g,
		scope: 'css',
		note: 'Selector removed. Brush is now drawn by `BrushOverlayUtil` on a canvas context.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-scribble',
		name: 'CSS selector .tl-scribble removed',
		pattern: /\.tl-scribble\b/g,
		scope: 'css',
		note: 'Selector removed. Scribble is now drawn by `ScribbleOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-snap-indicator',
		name: 'CSS selector .tl-snap-indicator removed',
		pattern: /\.tl-snap-indicator\b/g,
		scope: 'css',
		note: 'Selector removed. Snap indicator is now drawn by `SnapIndicatorOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-handle',
		name: 'CSS selector .tl-handle removed',
		pattern: /\.tl-handle\b/g,
		scope: 'css',
		note: 'Selector removed. Handles are now drawn by `ShapeHandleOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-selection-fg-outline',
		name: 'CSS selector .tl-selection__fg__outline removed',
		pattern: /\.tl-selection__fg__outline\b/g,
		scope: 'css',
		note: 'Selector removed. Selection foreground is drawn by `SelectionForegroundOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-corner-handle',
		name: 'CSS selector .tl-corner-handle removed',
		pattern: /\.tl-corner-handle\b/g,
		scope: 'css',
		note: 'Selector removed. Corner handles drawn by `ShapeHandleOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-text-handle',
		name: 'CSS selector .tl-text-handle removed',
		pattern: /\.tl-text-handle\b/g,
		scope: 'css',
		note: 'Selector removed. Text handles drawn by `ShapeHandleOverlayUtil`.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-corner-crop-handle',
		name: 'CSS selector .tl-corner-crop-handle removed',
		pattern: /\.tl-corner-crop-handle\b/g,
		scope: 'css',
		note: 'Selector removed.',
		sectionRef: '05-css',
	},
	{
		kind: 'flag',
		id: 'css-selector-mobile-rotate',
		name: 'CSS selector .tl-mobile-rotate__* removed',
		pattern: /\.tl-mobile-rotate__/g,
		scope: 'css',
		note: 'Selectors removed. Mobile rotate handle drawn by `ShapeHandleOverlayUtil`.',
		sectionRef: '05-css',
	},
]
