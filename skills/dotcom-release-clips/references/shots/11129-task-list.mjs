// feat(tldraw): add task lists with checkboxes drawn to match the font (#11129)
// A new feature whose "before" is still honest: the same typing leaves a literal "[ ]" behind.
export function setup(e, label, h) {
	h.label(520, 110)
	return { spot: h.screen(420, 260) }
}

export const steps = [
	{ idle: 300 },
	{ move: 'spot', ms: 800, arc: 70 },
	{ key: 't', show: 'T', ms: 250 },
	{ click: true, ms: 300 },
	{ type: '[ ] Sketch the plan', perChar: 65 },
	{ key: 'Enter', show: '↵', ms: 200 },
	{ type: 'Ship it', perChar: 65 },
	{ idle: 500 },
	{ key: 'Escape', show: 'esc', ms: 600 },
	{ move: { x: -60, y: 700 }, ms: 700, arc: 40 },
	{ idle: 500 },
]
