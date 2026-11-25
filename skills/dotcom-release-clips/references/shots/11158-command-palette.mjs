// feat(tldraw): add a Cmd/Ctrl+K command palette (#11158)
// After only. Without a palette, typing "align le" fires single-key tool shortcuts, which would
// make a misleading "before". The shapes sit left of x=335 because the palette opens over the
// middle of the screen, above the toolbar.
export function setup(e, label, h) {
	e.createShapes([
		{ id: 'shape:a', type: 'geo', x: 110, y: 150, props: { w: 120, h: 70, color: 'blue', fill: 'semi' } },
		{ id: 'shape:b', type: 'geo', x: 190, y: 240, props: { w: 120, h: 70, color: 'orange', fill: 'semi' } },
		{ id: 'shape:c', type: 'geo', x: 140, y: 330, props: { w: 120, h: 70, color: 'green', fill: 'semi', geo: 'ellipse' } },
	])
	h.label(205, 60)
	e.select('shape:a', 'shape:b', 'shape:c')
	return { rest: h.screen(700, 300) }
}

export const steps = [
	{ idle: 300 },
	{ move: 'rest', ms: 800, arc: 60 },
	{ idle: 200 },
	{ key: 'Meta+k', show: '⌘ K', ms: 500, showMs: 900 },
	{ type: 'align le', perChar: 90 },
	{ idle: 600 },
	{ key: 'Enter', show: '↵', ms: 900 },
	{ move: { x: 1180, y: 700 }, ms: 700, arc: -40 },
	{ idle: 500 },
]
