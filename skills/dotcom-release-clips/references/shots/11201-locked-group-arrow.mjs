// fix(tldraw): stop arrows binding to shapes in locked groups (#11201)
// A bug fix, so before and after. From the PR's test plan, step 3: draw an arrow from inside a
// shape in a locked group out to empty canvas. Before, the arrow's end stays stuck in the shape.
export function setup(e, label, h) {
	e.createShapes([
		{ id: 'shape:a', type: 'geo', x: 340, y: 230, props: { w: 160, h: 110, color: 'blue', fill: 'semi' } },
		{ id: 'shape:b', type: 'geo', x: 560, y: 230, props: { w: 160, h: 110, color: 'blue', fill: 'semi' } },
	])
	h.label(530, 110)
	e.groupShapes(['shape:a', 'shape:b'])
	e.updateShape({ id: e.getShape('shape:a').parentId, type: 'group', isLocked: true })
	e.selectNone()
	return { inside: h.screen(420, 285), out: h.screen(470, 470) }
}

export const steps = [
	{ idle: 300 },
	{ move: 'inside', ms: 800, arc: 70 },
	{ key: 'a', show: 'A', ms: 300 },
	{ down: true, ms: 150 },
	{ move: 'out', ms: 1000, arc: -30 },
	{ idle: 500 },
	{ up: true, ms: 500 },
	{ move: { x: -60, y: 700 }, ms: 700, arc: 40 },
	{ idle: 500 },
]
